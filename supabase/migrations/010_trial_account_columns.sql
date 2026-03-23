-- Migration 010: Add trial account columns to real_estate_agents
-- Adds trial_ends_at and source columns needed for frictionless trial CTA

ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text;

-- Index for finding trial accounts expiring soon
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_trial_ends_at
  ON real_estate_agents (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- Index for source attribution analytics
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_source
  ON real_estate_agents (source)
  WHERE source IS NOT NULL;
