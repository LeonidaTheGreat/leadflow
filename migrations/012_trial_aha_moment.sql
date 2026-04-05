-- Migration: Trial Aha Moment — AI Response by Day 3
-- UC: uc-revenue-aha-moment

-- Add columns to track aha moment email status (separate from trial sequence)
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS aha_moment_day1_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aha_moment_day1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS aha_moment_day3_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS aha_moment_day3_sent_at TIMESTAMPTZ;

-- Add trial_start_date for day-3 cohort calculation
-- (may already exist from pilot columns, but ensure it's here)
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ;

-- Create index for efficient day-3 cohort queries
CREATE INDEX IF NOT EXISTS idx_agents_trial_start_date 
  ON real_estate_agents(trial_start_date) 
  WHERE plan_tier = 'trial' AND email_verified = true;

-- Create index for aha moment tracking
CREATE INDEX IF NOT EXISTS idx_agents_aha_moment_status 
  ON real_estate_agents(aha_moment_day1_sent, aha_moment_day3_sent) 
  WHERE plan_tier = 'trial';

-- Add comment for documentation
COMMENT ON COLUMN real_estate_agents.aha_moment_day1_sent IS 'Day 1 aha moment email sent (after verification)';
COMMENT ON COLUMN real_estate_agents.aha_moment_day3_sent IS 'Day 3 re-engagement email sent (if simulator not completed)';
COMMENT ON COLUMN real_estate_agents.trial_start_date IS 'When the trial period started (for day-3 cohort calculation)';

-- Verify migration
SELECT 'Trial Aha Moment columns added successfully' as result;

-- DOWN
-- ALTER TABLE real_estate_agents
--   DROP COLUMN IF EXISTS aha_moment_day1_sent,
--   DROP COLUMN IF EXISTS aha_moment_day1_sent_at,
--   DROP COLUMN IF EXISTS aha_moment_day3_sent,
--   DROP COLUMN IF EXISTS aha_moment_day3_sent_at;
-- DROP INDEX IF EXISTS idx_agents_trial_start_date;
-- DROP INDEX IF EXISTS idx_agents_aha_moment_status;
