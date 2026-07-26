-- Migration 027: trial_sms_nudge_tracking
-- Adds idempotent tracking columns for the SMS trial nudge sequence.
-- Follows the same boolean column pattern as trial_email_day3_sent etc.

ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS trial_sms_day3_sent  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_sms_day7_sent  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_sms_day12_sent BOOLEAN NOT NULL DEFAULT false;
