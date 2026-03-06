-- SMS Messages Table Migration
-- Stores all SMS messages sent/received via Twilio
-- Enables delivery tracking, analytics, and compliance auditing

-- ==================== SMS MESSAGES TABLE ====================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Twilio identifiers
  twilio_sid VARCHAR(100) UNIQUE,
  
  -- Lead/Agent references
  lead_id VARCHAR(100),
  agent_id UUID REFERENCES agents(id),
  
  -- Phone numbers
  to_number VARCHAR(20) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  
  -- Message content
  message_body TEXT NOT NULL,
  direction VARCHAR(20) DEFAULT 'outbound-api', -- inbound, outbound-api, outbound-call
  
  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'queued', -- queued, sending, sent, delivered, failed, undelivered, received
  trigger VARCHAR(100), -- What triggered this SMS (e.g., 'lead.created', 'appointment_confirmation')
  market VARCHAR(50), -- Market code (us-national, ca-ontario, etc.)
  
  -- Delivery details
  num_segments INT DEFAULT 1,
  price NUMERIC(10, 6),
  price_unit VARCHAR(10),
  
  -- Error tracking
  error_code VARCHAR(50),
  error_message TEXT,
  error_category VARCHAR(50), -- INVALID_NUMBER, CONTENT_ERROR, ACCOUNT_ERROR, RATE_LIMIT, UNKNOWN
  
  -- Timestamps
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_sent TIMESTAMP,
  date_delivered TIMESTAMP,
  date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- API metadata
  api_version VARCHAR(20),
  uri TEXT,
  
  -- Additional metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',
  
  -- Performance tracking
  duration_ms INT,
  
  -- Created/updated tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INDEXES ====================
-- For looking up messages by Twilio SID
CREATE INDEX IF NOT EXISTS idx_sms_messages_twilio_sid ON sms_messages(twilio_sid);

-- For fetching messages by lead
CREATE INDEX IF NOT EXISTS idx_sms_messages_lead_id ON sms_messages(lead_id);

-- For fetching messages by agent
CREATE INDEX IF NOT EXISTS idx_sms_messages_agent_id ON sms_messages(agent_id);

-- For status-based queries (e.g., pending delivery checks)
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);

-- For date-range queries (analytics, reporting)
CREATE INDEX IF NOT EXISTS idx_sms_messages_date_created ON sms_messages(date_created);

-- For trigger-based analysis
CREATE INDEX IF NOT EXISTS idx_sms_messages_trigger ON sms_messages(trigger);

-- For market-based analysis
CREATE INDEX IF NOT EXISTS idx_sms_messages_market ON sms_messages(market);

-- For error analysis
CREATE INDEX IF NOT EXISTS idx_sms_messages_error_category ON sms_messages(error_category);

-- Composite index for common query: agent + date range
CREATE INDEX IF NOT EXISTS idx_sms_messages_agent_date ON sms_messages(agent_id, date_created);

-- ==================== VIEWS ====================
-- SMS delivery summary by agent
CREATE OR REPLACE VIEW sms_delivery_summary AS
SELECT 
  agent_id,
  COUNT(*) as total_messages,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
  COUNT(CASE WHEN status IN ('failed', 'undelivered') THEN 1 END) as failed_count,
  COUNT(CASE WHEN status IN ('queued', 'sending', 'sent') THEN 1 END) as pending_count,
  ROUND(
    COUNT(CASE WHEN status = 'delivered' THEN 1 END)::NUMERIC / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as delivery_rate_percent,
  SUM(price) as total_cost,
  AVG(duration_ms) as avg_duration_ms
FROM sms_messages
GROUP BY agent_id;

-- SMS daily stats for analytics
CREATE OR REPLACE VIEW sms_daily_stats AS
SELECT 
  DATE(date_created) as date,
  market,
  trigger,
  COUNT(*) as message_count,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
  COUNT(CASE WHEN status IN ('failed', 'undelivered') THEN 1 END) as failed_count,
  SUM(price) as total_cost
FROM sms_messages
GROUP BY DATE(date_created), market, trigger
ORDER BY DATE(date_created) DESC;

-- Recent failed messages for monitoring
CREATE OR REPLACE VIEW sms_recent_failures AS
SELECT 
  id,
  twilio_sid,
  lead_id,
  agent_id,
  to_number,
  status,
  error_code,
  error_message,
  error_category,
  date_created,
  trigger
FROM sms_messages
WHERE status IN ('failed', 'undelivered')
  AND date_created > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY date_created DESC;

-- ==================== FUNCTIONS ====================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sms_messages_updated_at ON sms_messages;

-- Create trigger
CREATE TRIGGER trigger_sms_messages_updated_at
  BEFORE UPDATE ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_sms_messages_updated_at();

-- ==================== ROW LEVEL SECURITY ====================
-- Enable RLS
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Agents can only see their own SMS messages
CREATE POLICY sms_messages_agent_isolation ON sms_messages
  FOR ALL
  USING (agent_id = auth.uid());

-- Policy: Service role can access all SMS messages
CREATE POLICY sms_messages_service_role ON sms_messages
  FOR ALL
  TO service_role
  USING (true);

-- ==================== COMMENTS ====================
COMMENT ON TABLE sms_messages IS 'Stores all SMS messages sent and received via Twilio integration';
COMMENT ON COLUMN sms_messages.twilio_sid IS 'Twilio Message SID (unique identifier from Twilio)';
COMMENT ON COLUMN sms_messages.lead_id IS 'Reference to the lead/contact this message was sent to';
COMMENT ON COLUMN sms_messages.agent_id IS 'Reference to the real estate agent who owns this lead';
COMMENT ON COLUMN sms_messages.trigger IS 'Event that triggered this SMS (e.g., lead.created, appointment_confirmation)';
COMMENT ON COLUMN sms_messages.error_category IS 'Categorized error type for analytics: INVALID_NUMBER, CONTENT_ERROR, ACCOUNT_ERROR, RATE_LIMIT, UNKNOWN';
COMMENT ON COLUMN sms_messages.metadata IS 'Flexible JSONB field for additional metadata';
