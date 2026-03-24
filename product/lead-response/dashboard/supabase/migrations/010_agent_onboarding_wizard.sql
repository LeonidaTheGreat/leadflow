-- Migration 010: Post-Login Onboarding Wizard state table
-- Tracks per-agent setup wizard progress for the 3-step post-login wizard.
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS agent_onboarding_wizard (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID NOT NULL UNIQUE,
  fub_connected   BOOLEAN DEFAULT FALSE,
  fub_api_key     TEXT,
  twilio_connected BOOLEAN DEFAULT FALSE,
  twilio_phone    TEXT,
  sms_verified    BOOLEAN DEFAULT FALSE,
  current_step    TEXT DEFAULT 'fub',
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by agent
CREATE INDEX IF NOT EXISTS idx_agent_onboarding_wizard_agent_id
  ON agent_onboarding_wizard (agent_id);

-- Add onboarding_completed + onboarding_completed_at to real_estate_agents (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'real_estate_agents'
      AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE real_estate_agents
      ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
      ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;
END $$;

COMMENT ON TABLE agent_onboarding_wizard IS
  'Persists per-agent setup wizard state for the 3-step post-login onboarding flow.';
