-- Migration: Add new trial email sequence columns
-- UC: uc-revenue-email-sequence
-- Replaces countdown sequence (day6, day3, day1, expired) with forward sequence (day0-15)

ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS trial_email_welcome_sent     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day1_aha_sent    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day3_upgrade_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day7_warning_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day14_expired_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_email_day15_final_sent  BOOLEAN NOT NULL DEFAULT false;

-- DOWN
-- ALTER TABLE real_estate_agents
--   DROP COLUMN IF EXISTS trial_email_welcome_sent,
--   DROP COLUMN IF EXISTS trial_email_day1_aha_sent,
--   DROP COLUMN IF EXISTS trial_email_day3_upgrade_sent,
--   DROP COLUMN IF EXISTS trial_email_day7_warning_sent,
--   DROP COLUMN IF EXISTS trial_email_day14_expired_sent,
--   DROP COLUMN IF EXISTS trial_email_day15_final_sent;
