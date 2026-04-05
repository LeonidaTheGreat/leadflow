-- Migration 007: Add activation_email_sent column to real_estate_agents
-- Tracks whether the post-verification activation email has been sent
-- Needed for: auto-trigger onboarding after email verification (f2c98aa9)

ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS activation_email_sent boolean DEFAULT false;

COMMENT ON COLUMN real_estate_agents.activation_email_sent IS
  'True when the post-verification activation email (CTA to /onboarding) has been sent';
