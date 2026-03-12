-- Migration 006: Create pilot conversion email logs table
-- Purpose: Track conversion email sends to pilot agents for idempotency and analytics

BEGIN;

-- Create agent_email_logs table
CREATE TABLE IF NOT EXISTS agent_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL, -- 'day_30', 'day_45', 'day_55'
  subject TEXT NOT NULL,
  recipient TEXT NOT NULL,
  stats JSONB, -- { leads_responded, avg_response_time_minutes, appointments_booked }
  stripe_link TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'bounced'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to ensure idempotency: one email per milestone per agent
  UNIQUE(agent_id, email_type)
);

-- Create index for fast lookups
CREATE INDEX idx_agent_email_logs_agent_id ON agent_email_logs(agent_id);
CREATE INDEX idx_agent_email_logs_email_type ON agent_email_logs(email_type);
CREATE INDEX idx_agent_email_logs_sent_at ON agent_email_logs(sent_at DESC);

-- Create view for conversion sequence status per agent
CREATE OR REPLACE VIEW v_agent_conversion_status AS
SELECT 
  a.id as agent_id,
  a.first_name,
  a.email,
  a.plan_tier,
  a.pilot_started_at,
  a.pilot_expires_at,
  EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INT as days_into_pilot,
  (EXTRACT(DAY FROM a.pilot_expires_at - NOW()))::INT as days_remaining,
  COUNT(CASE WHEN l.email_type = 'day_30' THEN 1 END) as day_30_sent,
  COUNT(CASE WHEN l.email_type = 'day_45' THEN 1 END) as day_45_sent,
  COUNT(CASE WHEN l.email_type = 'day_55' THEN 1 END) as day_55_sent,
  MAX(l.sent_at) as last_email_sent_at
FROM real_estate_agents a
LEFT JOIN agent_email_logs l ON a.id = l.agent_id
WHERE a.plan_tier IN ('pilot', 'pro') -- Include converted agents to see full history
GROUP BY a.id, a.first_name, a.email, a.plan_tier, a.pilot_started_at, a.pilot_expires_at;

-- Create view for eligible agents by milestone
CREATE OR REPLACE VIEW v_conversion_eligible_agents AS
SELECT 
  a.id,
  a.email,
  a.first_name,
  a.last_name,
  a.pilot_started_at,
  EXTRACT(DAY FROM NOW() - a.pilot_started_at)::INT as days_since_start,
  CASE 
    WHEN EXTRACT(DAY FROM NOW() - a.pilot_started_at) >= 30 
      AND EXTRACT(DAY FROM NOW() - a.pilot_started_at) < 31
      AND NOT EXISTS (SELECT 1 FROM agent_email_logs WHERE agent_id = a.id AND email_type = 'day_30')
    THEN 'day_30'
    WHEN EXTRACT(DAY FROM NOW() - a.pilot_started_at) >= 45
      AND EXTRACT(DAY FROM NOW() - a.pilot_started_at) < 46
      AND NOT EXISTS (SELECT 1 FROM agent_email_logs WHERE agent_id = a.id AND email_type = 'day_45')
    THEN 'day_45'
    WHEN EXTRACT(DAY FROM NOW() - a.pilot_started_at) >= 55
      AND EXTRACT(DAY FROM NOW() - a.pilot_started_at) < 56
      AND NOT EXISTS (SELECT 1 FROM agent_email_logs WHERE agent_id = a.id AND email_type = 'day_55')
    THEN 'day_55'
  END as next_milestone
FROM real_estate_agents a
WHERE a.plan_tier = 'pilot'
  AND a.pilot_started_at IS NOT NULL;

COMMIT;
