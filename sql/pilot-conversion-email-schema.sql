-- Pilot-to-Paid Conversion Email Sequence Schema
-- Tracks email sends for pilot conversion sequence at day 30, 45, 55

-- ============================================
-- PILOT_CONVERSION_EMAIL_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS pilot_conversion_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    milestone VARCHAR(20) NOT NULL CHECK (milestone IN ('day_30', 'day_45', 'day_55')),
    template_key VARCHAR(50) NOT NULL,
    template_version VARCHAR(10) DEFAULT '1.0',
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
    provider VARCHAR(20) DEFAULT 'resend',
    provider_message_id TEXT,
    error_message TEXT,
    personalized_data JSONB DEFAULT '{}',
    -- Stats included in the email
    stats_leads_responded INTEGER,
    stats_avg_response_time_seconds INTEGER,
    stats_appointments_booked INTEGER,
    -- Stop condition tracking
    skipped_reason VARCHAR(50),
    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Idempotency: ensure one send per agent per milestone per pilot cycle
    UNIQUE(agent_id, milestone)
);

COMMENT ON TABLE pilot_conversion_email_logs IS 'Audit log for pilot-to-paid conversion email sequence';
COMMENT ON COLUMN pilot_conversion_email_logs.milestone IS 'Conversion sequence milestone: day_30, day_45, or day_55';
COMMENT ON COLUMN pilot_conversion_email_logs.status IS 'Email delivery status: queued, sent, failed, or skipped';
COMMENT ON COLUMN pilot_conversion_email_logs.skipped_reason IS 'Reason for skipping (e.g., already_upgraded, not_pilot)';
COMMENT ON COLUMN pilot_conversion_email_logs.personalized_data IS 'JSON containing personalized stats and checkout URL';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_agent_id ON pilot_conversion_email_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_milestone ON pilot_conversion_email_logs(milestone);
CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_status ON pilot_conversion_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_pilot_conversion_logs_created_at ON pilot_conversion_email_logs(created_at DESC);

-- ============================================
-- VIEW: Pilot Conversion Sequence Status
-- ============================================
CREATE OR REPLACE VIEW pilot_conversion_sequence_status AS
SELECT 
    a.id as agent_id,
    a.email as agent_email,
    a.name as agent_name,
    a.plan_tier,
    a.pilot_started_at,
    CASE 
        WHEN a.pilot_started_at IS NULL THEN NULL
        ELSE EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INTEGER
    END as days_since_pilot_start,
    -- Day 30 status
    COALESCE(d30.status, 'pending') as day_30_status,
    d30.sent_at as day_30_sent_at,
    -- Day 45 status
    COALESCE(d45.status, 'pending') as day_45_status,
    d45.sent_at as day_45_sent_at,
    -- Day 55 status
    COALESCE(d55.status, 'pending') as day_55_status,
    d55.sent_at as day_55_sent_at,
    -- Overall sequence progress
    COUNT(CASE WHEN pcl.status = 'sent' THEN 1 END) as emails_sent_count,
    MAX(pcl.sent_at) as last_email_sent_at
FROM agents a
LEFT JOIN pilot_conversion_email_logs d30 ON d30.agent_id = a.id AND d30.milestone = 'day_30'
LEFT JOIN pilot_conversion_email_logs d45 ON d45.agent_id = a.id AND d45.milestone = 'day_45'
LEFT JOIN pilot_conversion_email_logs d55 ON d55.agent_id = a.id AND d55.milestone = 'day_55'
LEFT JOIN pilot_conversion_email_logs pcl ON pcl.agent_id = a.id
WHERE a.plan_tier = 'pilot' OR pcl.agent_id IS NOT NULL
GROUP BY a.id, a.email, a.name, a.plan_tier, a.pilot_started_at,
         d30.status, d30.sent_at, d45.status, d45.sent_at, d55.status, d55.sent_at;

COMMENT ON VIEW pilot_conversion_sequence_status IS 'Current status of conversion sequence for all pilot agents';

-- ============================================
-- FUNCTION: Get agents eligible for milestone
-- ============================================
CREATE OR REPLACE FUNCTION get_pilot_agents_for_milestone(p_milestone VARCHAR(20))
RETURNS TABLE (
    agent_id UUID,
    agent_email TEXT,
    agent_name TEXT,
    pilot_started_at TIMESTAMPTZ,
    days_since_start INTEGER
) AS $$
DECLARE
    v_target_days INTEGER;
BEGIN
    -- Determine target days based on milestone
    v_target_days := CASE p_milestone
        WHEN 'day_30' THEN 30
        WHEN 'day_45' THEN 45
        WHEN 'day_55' THEN 55
        ELSE NULL
    END;
    
    IF v_target_days IS NULL THEN
        RAISE EXCEPTION 'Invalid milestone: %', p_milestone;
    END IF;
    
    RETURN QUERY
    SELECT 
        a.id as agent_id,
        a.email as agent_email,
        a.name as agent_name,
        a.pilot_started_at,
        EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INTEGER as days_since_start
    FROM agents a
    WHERE a.plan_tier = 'pilot'
      AND a.pilot_started_at IS NOT NULL
      AND EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INTEGER >= v_target_days
      AND NOT EXISTS (
          SELECT 1 FROM pilot_conversion_email_logs pcl
          WHERE pcl.agent_id = a.id 
            AND pcl.milestone = p_milestone
            AND pcl.status IN ('sent', 'skipped')
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pilot_agents_for_milestone IS 'Get pilot agents eligible for a specific conversion milestone';

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE pilot_conversion_email_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records
CREATE POLICY "Service role can manage pilot conversion logs" ON pilot_conversion_email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_pilot_conversion_logs_updated_at ON pilot_conversion_email_logs;
CREATE TRIGGER update_pilot_conversion_logs_updated_at
    BEFORE UPDATE ON pilot_conversion_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
