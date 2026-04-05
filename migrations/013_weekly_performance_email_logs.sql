-- Migration: Weekly Performance Email Logs
-- UC: feat-weekly-performance-email

-- Create table for weekly performance email tracking
CREATE TABLE IF NOT EXISTS weekly_performance_email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
    week_starting DATE NOT NULL,
    week_ending DATE NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
    provider TEXT DEFAULT 'resend',
    provider_message_id TEXT,
    error_message TEXT,
    stats_leads_responded INTEGER DEFAULT 0,
    stats_avg_response_time_seconds INTEGER DEFAULT 0,
    stats_appointments_booked INTEGER DEFAULT 0,
    stats_estimated_revenue_impact INTEGER DEFAULT 0,
    personalized_data JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate sends per agent per week
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_email_logs_agent_week 
    ON weekly_performance_email_logs(agent_id, week_starting);

-- Create index for efficient querying by week
CREATE INDEX IF NOT EXISTS idx_weekly_email_logs_week_starting 
    ON weekly_performance_email_logs(week_starting);

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_weekly_email_logs_status 
    ON weekly_performance_email_logs(status);

-- Create index for agent lookups
CREATE INDEX IF NOT EXISTS idx_weekly_email_logs_agent_id 
    ON weekly_performance_email_logs(agent_id);

-- Add comment for documentation
COMMENT ON TABLE weekly_performance_email_logs IS 'Tracks weekly AI performance email sends to agents';
COMMENT ON COLUMN weekly_performance_email_logs.week_starting IS 'Monday of the week this report covers';
COMMENT ON COLUMN weekly_performance_email_logs.status IS 'sent, failed, or skipped';
COMMENT ON COLUMN weekly_performance_email_logs.personalized_data IS 'JSON containing plan_tier, first_name, and other personalized fields';

-- Verify migration
SELECT 'Weekly performance email logs table created successfully' as result;

-- DOWN
-- DROP TABLE IF EXISTS weekly_performance_email_logs;
