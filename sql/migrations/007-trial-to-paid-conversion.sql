-- Migration 007: Trial-to-Paid Conversion Path
-- Purpose: Add trial email tracking and banner dismissal columns for trial-to-paid conversion

BEGIN;

-- Add trial tracking columns to real_estate_agents table
-- Check if columns exist before adding to support idempotent runs
ALTER TABLE real_estate_agents
ADD COLUMN IF NOT EXISTS trial_banner_dismissed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_email_day6_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_email_day3_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_email_day1_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_email_expired_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;

-- Create trial_email_logs table for detailed email tracking
CREATE TABLE IF NOT EXISTS trial_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL, -- 'trial_day6', 'trial_day3', 'trial_day1', 'trial_expired'
  email_address VARCHAR(255) NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'opened', 'clicked'
  stripe_link_clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Index for fast lookups by agent and email type
  UNIQUE(agent_id, email_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_trial_email_logs_agent_id ON trial_email_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_trial_email_logs_email_type ON trial_email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_trial_email_logs_sent_at ON trial_email_logs(sent_at DESC);

-- Create view for trial conversion eligibility
CREATE OR REPLACE VIEW v_trial_eligible_agents AS
SELECT 
  a.id,
  a.email,
  a.first_name,
  a.last_name,
  a.trial_ends_at,
  a.created_at,
  EXTRACT(DAY FROM a.trial_ends_at - NOW())::INT as days_remaining,
  EXTRACT(DAY FROM NOW() - a.created_at)::INT as days_since_start,
  a.trial_email_day6_sent,
  a.trial_email_day3_sent,
  a.trial_email_day1_sent,
  a.trial_email_expired_sent,
  CASE 
    WHEN NOT a.trial_email_day6_sent 
      AND EXTRACT(DAY FROM a.trial_ends_at - NOW())::INT = 6
    THEN 'day6'
    WHEN NOT a.trial_email_day3_sent 
      AND EXTRACT(DAY FROM a.trial_ends_at - NOW())::INT = 3
    THEN 'day3'
    WHEN NOT a.trial_email_day1_sent 
      AND EXTRACT(DAY FROM a.trial_ends_at - NOW())::INT = 1
    THEN 'day1'
    WHEN NOT a.trial_email_expired_sent 
      AND NOW() >= a.trial_ends_at
    THEN 'expired'
  END as next_email_type
FROM real_estate_agents a
WHERE a.subscription_status = 'trial'
  AND a.trial_ends_at IS NOT NULL
ORDER BY a.trial_ends_at ASC;

COMMIT;
