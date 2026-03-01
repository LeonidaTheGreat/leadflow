-- ============================================
-- Cal.com Webhook Management Schema
-- Tables for webhook registration and delivery tracking
-- ============================================

-- Table: webhook_configs
-- Stores registered webhook configurations
CREATE TABLE IF NOT EXISTS webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Webhook identification
    webhook_id VARCHAR(255) UNIQUE NOT NULL,
    source VARCHAR(100) DEFAULT 'cal.com', -- 'cal.com', 'stripe', 'custom', etc.
    
    -- Configuration
    subscriber_url TEXT NOT NULL,
    event_triggers TEXT[] DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    secret TEXT, -- For signature verification
    
    -- Status tracking
    last_fired_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook_configs
CREATE INDEX IF NOT EXISTS idx_webhook_configs_webhook_id ON webhook_configs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_source ON webhook_configs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(active);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_created_at ON webhook_configs(created_at);

-- Table: webhook_delivery_logs
-- Tracks all webhook delivery attempts
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    webhook_id VARCHAR(255) REFERENCES webhook_configs(webhook_id) ON DELETE CASCADE,
    
    -- Delivery details
    event_type VARCHAR(100) NOT NULL,
    payload JSONB,
    status VARCHAR(50) NOT NULL, -- 'success', 'failed', 'retrying', 'pending'
    
    -- HTTP details
    http_status INTEGER,
    response_body TEXT,
    
    -- Error tracking
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    
    -- Performance
    duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for webhook_delivery_logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_delivery_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON webhook_delivery_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status ON webhook_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_delivery_logs(created_at);

-- Function to increment webhook failure count
CREATE OR REPLACE FUNCTION increment_webhook_failure(p_webhook_id VARCHAR)
RETURNS void AS $$
BEGIN
    UPDATE webhook_configs
    SET failure_count = failure_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE webhook_id = p_webhook_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on webhook_configs
DROP TRIGGER IF EXISTS update_webhook_configs_updated_at ON webhook_configs;
CREATE TRIGGER update_webhook_configs_updated_at
    BEFORE UPDATE ON webhook_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- View: webhook_health_summary
-- Shows health status of all webhooks
CREATE OR REPLACE VIEW webhook_health_summary AS
SELECT 
    wc.id,
    wc.webhook_id,
    wc.source,
    wc.subscriber_url,
    wc.active,
    wc.event_triggers,
    wc.failure_count,
    wc.last_fired_at,
    wc.created_at,
    
    -- Delivery stats (last 24 hours)
    (SELECT COUNT(*) FROM webhook_delivery_logs 
     WHERE webhook_id = wc.webhook_id 
     AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as deliveries_24h,
    
    (SELECT COUNT(*) FROM webhook_delivery_logs 
     WHERE webhook_id = wc.webhook_id 
     AND status = 'success'
     AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as successful_24h,
    
    (SELECT COUNT(*) FROM webhook_delivery_logs 
     WHERE webhook_id = wc.webhook_id 
     AND status = 'failed'
     AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as failed_24h,
    
    -- Last delivery info
    (SELECT status FROM webhook_delivery_logs 
     WHERE webhook_id = wc.webhook_id 
     ORDER BY created_at DESC LIMIT 1) as last_status,
    
    (SELECT http_status FROM webhook_delivery_logs 
     WHERE webhook_id = wc.webhook_id 
     ORDER BY created_at DESC LIMIT 1) as last_http_status

FROM webhook_configs wc
ORDER BY wc.created_at DESC;

-- View: recent_webhook_failures
-- Shows recent failed deliveries for monitoring
CREATE OR REPLACE VIEW recent_webhook_failures AS
SELECT 
    wdl.id,
    wdl.webhook_id,
    wc.subscriber_url,
    wdl.event_type,
    wdl.status,
    wdl.http_status,
    wdl.error_message,
    wdl.attempt_number,
    wdl.duration_ms,
    wdl.created_at
FROM webhook_delivery_logs wdl
JOIN webhook_configs wc ON wdl.webhook_id = wc.webhook_id
WHERE wdl.status = 'failed'
  AND wdl.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY wdl.created_at DESC;

-- Row Level Security Policies
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage all webhooks
CREATE POLICY service_manage_webhook_configs ON webhook_configs
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY service_manage_webhook_logs ON webhook_delivery_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE webhook_configs IS 'Stores registered webhook configurations for external integrations';
COMMENT ON TABLE webhook_delivery_logs IS 'Audit log of all webhook delivery attempts';
COMMENT ON VIEW webhook_health_summary IS 'Health overview of all registered webhooks';
COMMENT ON VIEW recent_webhook_failures IS 'Recent webhook delivery failures for monitoring';