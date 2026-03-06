-- Migration: Add Twilio cost tracking and enhanced SMS delivery fields
-- Created: 2026-03-06
-- Purpose: Track SMS costs and improve delivery status tracking for real Twilio integration

-- ============================================
-- ADD COST TRACKING TO MESSAGES TABLE
-- ============================================

-- Add cost tracking fields
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS twilio_price DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS twilio_price_unit VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS twilio_num_segments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS retry_attempts JSONB DEFAULT '[]'::jsonb;

-- Add index for cost analysis queries
CREATE INDEX IF NOT EXISTS idx_messages_twilio_price ON messages(twilio_price) 
WHERE twilio_price IS NOT NULL;

-- Add index for retry analysis
CREATE INDEX IF NOT EXISTS idx_messages_retry_count ON messages(retry_count) 
WHERE retry_count > 0;

-- ============================================
-- CREATE SMS COST ANALYSIS VIEW
-- ============================================

CREATE OR REPLACE VIEW sms_cost_analysis AS
SELECT 
    DATE_TRUNC('day', sent_at) as date,
    agent_id,
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    SUM(twilio_price) as total_cost,
    AVG(twilio_price) as avg_cost_per_message,
    SUM(twilio_num_segments) as total_segments
FROM messages m
JOIN leads l ON m.lead_id = l.id
WHERE direction = 'outbound'
  AND sent_at IS NOT NULL
GROUP BY DATE_TRUNC('day', sent_at), agent_id
ORDER BY date DESC;

-- ============================================
-- CREATE SMS DELIVERY STATS VIEW
-- ============================================

CREATE OR REPLACE VIEW sms_delivery_stats AS
SELECT 
    agent_id,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    COUNT(*) FILTER (WHERE status = 'sent') as pending,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered') * 100.0 / NULLIF(COUNT(*), 0), 
        2
    ) as delivery_rate_pct,
    AVG(retry_count) as avg_retries,
    SUM(twilio_price) as total_cost
FROM messages m
JOIN leads l ON m.lead_id = l.id
WHERE direction = 'outbound'
GROUP BY agent_id;

-- ============================================
-- CREATE FUNCTION TO UPDATE MESSAGE WITH TWILIO DETAILS
-- ============================================

CREATE OR REPLACE FUNCTION update_message_twilio_details(
    p_twilio_sid TEXT,
    p_status TEXT,
    p_price DECIMAL(10,4) DEFAULT NULL,
    p_price_unit VARCHAR(3) DEFAULT 'USD',
    p_num_segments INTEGER DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE messages SET
        twilio_status = p_status,
        status = p_status::message_status,
        twilio_price = COALESCE(p_price, twilio_price),
        twilio_price_unit = COALESCE(p_price_unit, twilio_price_unit),
        twilio_num_segments = COALESCE(p_num_segments, twilio_num_segments),
        twilio_error_code = COALESCE(p_error_code, twilio_error_code),
        twilio_error_message = COALESCE(p_error_message, twilio_error_message),
        delivered_at = CASE 
            WHEN p_status = 'delivered' THEN NOW()
            ELSE delivered_at
        END,
        updated_at = NOW()
    WHERE twilio_sid = p_twilio_sid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE FUNCTION TO LOG RETRY ATTEMPT
-- ============================================

CREATE OR REPLACE FUNCTION log_sms_retry(
    p_twilio_sid TEXT,
    p_attempt_number INTEGER,
    p_error_code TEXT,
    p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE messages SET
        retry_count = p_attempt_number,
        retry_attempts = retry_attempts || jsonb_build_object(
            'attempt', p_attempt_number,
            'error_code', p_error_code,
            'error_message', p_error_message,
            'timestamp', NOW()
        ),
        updated_at = NOW()
    WHERE twilio_sid = p_twilio_sid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ADD COMMENTS
-- ============================================

COMMENT ON COLUMN messages.twilio_price IS 'Cost of SMS in twilio_price_unit (typically USD)';
COMMENT ON COLUMN messages.twilio_price_unit IS 'Currency unit for price (e.g., USD)';
COMMENT ON COLUMN messages.twilio_num_segments IS 'Number of SMS segments (1 for single SMS, >1 for concatenated)';
COMMENT ON COLUMN messages.retry_count IS 'Number of retry attempts made for this message';
COMMENT ON COLUMN messages.retry_attempts IS 'JSON array of retry attempt details with error info';
COMMENT ON VIEW sms_cost_analysis IS 'Daily SMS cost breakdown by agent';
COMMENT ON VIEW sms_delivery_stats IS 'SMS delivery statistics by agent';
