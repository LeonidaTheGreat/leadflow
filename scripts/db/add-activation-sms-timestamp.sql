-- Migration: add last_activation_sms_at to real_estate_agents
-- UC: uc-sms-activation-nudge
-- Tracks when an admin last sent an SMS activation nudge to an agent.
-- Used to prevent duplicate bulk blasts (bulk nudge only targets agents where this IS NULL).
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS last_activation_sms_at TIMESTAMPTZ;
