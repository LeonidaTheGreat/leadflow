-- Weekly AI Performance Report Email Schema
-- Tracks email sends for weekly performance reports to active agents

-- ============================================
-- WEEKLY_PERFORMANCE_EMAIL_LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_performance_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
    week_starting DATE NOT NULL,
    week_ending DATE NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
    provider VARCHAR(20) DEFAULT 'resend',
    provider_message_id TEXT,
    error_message TEXT,
    
    -- Performance stats included in the email
    stats_leads_responded INTEGER DEFAULT 0,
    stats_avg_response_time_seconds INTEGER DEFAULT 0,
    stats_appointments_booked INTEGER DEFAULT 0,
    stats_estimated_revenue_impact DECIMAL(10,2) DEFAULT 0,
    
    -- Personalized data and CTA
    personalized_data JSONB DEFAULT '{}',
    cta_clicked BOOLEAN DEFAULT FALSE,
    cta_clicked_at TIMESTAMPTZ,
    
    -- Skip tracking
    skipped_reason VARCHAR(50),
    
    -- Timestamps
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Idempotency: ensure one send per agent per week
    UNIQUE(agent_id, week_starting)
);

COMMENT ON TABLE weekly_performance_email_logs IS 'Audit log for weekly AI performance report emails sent to agents';
COMMENT ON COLUMN weekly_performance_email_logs.week_starting IS 'Monday date of the week this report covers';
COMMENT ON COLUMN weekly_performance_email_logs.week_ending IS 'Sunday date of the week this report covers';
COMMENT ON COLUMN weekly_performance_email_logs.stats_leads_responded IS 'Number of leads AI responded to this week';
COMMENT ON COLUMN weekly_performance_email_logs.stats_avg_response_time_seconds IS 'Average AI response time in seconds';
COMMENT ON COLUMN weekly_performance_email_logs.stats_appointments_booked IS 'Number of appointments booked via AI this week';
COMMENT ON COLUMN weekly_performance_email_logs.stats_estimated_revenue_impact IS 'Estimated revenue impact based on appointments booked';
COMMENT ON COLUMN weekly_performance_email_logs.cta_clicked IS 'Whether the agent clicked the upgrade CTA in the email';

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_weekly_perf_logs_agent_id ON weekly_performance_email_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_weekly_perf_logs_week_starting ON weekly_performance_email_logs(week_starting);
CREATE INDEX IF NOT EXISTS idx_weekly_perf_logs_status ON weekly_performance_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_weekly_perf_logs_created_at ON weekly_performance_email_logs(created_at DESC);

-- ============================================
-- VIEW: Weekly Performance Email Status
-- ============================================
CREATE OR REPLACE VIEW weekly_performance_email_status AS
SELECT 
    a.id as agent_id,
    a.email as agent_email,
    a.first_name,
    a.last_name,
    a.plan_tier,
    a.status as agent_status,
    a.created_at as agent_created_at,
    wpel.week_starting,
    wpel.week_ending,
    wpel.status as email_status,
    wpel.sent_at,
    wpel.stats_leads_responded,
    wpel.stats_avg_response_time_seconds,
    wpel.stats_appointments_booked,
    wpel.stats_estimated_revenue_impact,
    wpel.cta_clicked,
    wpel.cta_clicked_at
FROM real_estate_agents a
LEFT JOIN weekly_performance_email_logs wpel ON wpel.agent_id = a.id
WHERE a.status = 'active' 
   OR a.plan_tier IN ('starter', 'pro', 'team')
   OR wpel.agent_id IS NOT NULL
ORDER BY wpel.week_starting DESC NULLS LAST, a.created_at DESC;

COMMENT ON VIEW weekly_performance_email_status IS 'Current status of weekly performance emails for all agents';

-- ============================================
-- FUNCTION: Get agents eligible for weekly report
-- ============================================
CREATE OR REPLACE FUNCTION get_agents_for_weekly_report(p_week_starting DATE)
RETURNS TABLE (
    agent_id UUID,
    agent_email TEXT,
    first_name TEXT,
    last_name TEXT,
    plan_tier TEXT,
    agent_created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id as agent_id,
        a.email as agent_email,
        a.first_name,
        a.last_name,
        a.plan_tier,
        a.created_at as agent_created_at
    FROM real_estate_agents a
    WHERE a.status = 'active'
      AND a.email_verified = true
      AND a.plan_tier IN ('starter', 'pro', 'team', 'pilot', 'trial')
      AND a.created_at <= p_week_starting + INTERVAL '7 days'
      AND NOT EXISTS (
          SELECT 1 FROM weekly_performance_email_logs wpel
          WHERE wpel.agent_id = a.id 
            AND wpel.week_starting = p_week_starting
            AND wpel.status IN ('sent', 'skipped')
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_agents_for_weekly_report IS 'Get active agents eligible for weekly performance report for a specific week';

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE weekly_performance_email_logs ENABLE ROW LEVEL SECURITY;

-- Service role can manage all records
CREATE POLICY "Service role can manage weekly performance logs" ON weekly_performance_email_logs
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- TRIGGER: Auto-update updated_at
-- ============================================
DROP TRIGGER IF EXISTS update_weekly_perf_logs_updated_at ON weekly_performance_email_logs;
CREATE TRIGGER update_weekly_perf_logs_updated_at
    BEFORE UPDATE ON weekly_performance_email_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- DOWN
-- DROP TABLE IF EXISTS weekly_performance_email_logs CASCADE;
-- DROP VIEW IF EXISTS weekly_performance_email_status CASCADE;
-- DROP FUNCTION IF EXISTS get_agents_for_weekly_report(DATE) CASCADE;
