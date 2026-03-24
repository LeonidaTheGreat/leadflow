-- Migration 014: Post-Login Onboarding Wizard columns
-- Adds columns to real_estate_agents table for tracking wizard state
-- Also adds fub_api_key and twilio_phone_number to agent_integrations if missing

-- Add onboarding tracking columns to real_estate_agents
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fub_connected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_configured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_verified BOOLEAN DEFAULT FALSE;

-- Add integration columns to agent_integrations if not present
ALTER TABLE agent_integrations
  ADD COLUMN IF NOT EXISTS fub_api_key TEXT,
  ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT,
  ADD COLUMN IF NOT EXISTS agent_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Mark existing agents as having completed onboarding (they pre-exist the wizard)
UPDATE real_estate_agents
SET onboarding_completed = TRUE, onboarding_step = 3
WHERE onboarding_completed_at IS NOT NULL AND onboarding_completed IS DISTINCT FROM TRUE;

-- Index for fast lookup on onboarding status
CREATE INDEX IF NOT EXISTS idx_rea_onboarding_completed
  ON real_estate_agents (onboarding_completed);
