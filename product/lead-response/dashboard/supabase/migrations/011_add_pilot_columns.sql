-- Migration: Add pilot columns to real_estate_agents table
-- Enables free pilot onboarding (no credit card required)

-- Add pilot tracking columns
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS pilot_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS pilot_expires_at timestamptz;

-- Index for finding pilots expiring soon (for renewal notifications)
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_pilot_expires_at
  ON real_estate_agents (pilot_expires_at)
  WHERE pilot_expires_at IS NOT NULL;

-- Index for finding active pilots
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_pilot_started_at
  ON real_estate_agents (pilot_started_at)
  WHERE pilot_started_at IS NOT NULL;

COMMENT ON COLUMN real_estate_agents.pilot_started_at IS 'When the free pilot period started';
COMMENT ON COLUMN real_estate_agents.pilot_expires_at IS 'When the free pilot period expires (typically 60 days from start)';
