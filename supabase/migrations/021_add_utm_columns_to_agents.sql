-- Migration 021: Add UTM columns to real_estate_agents table
-- Implements FR-3: Database Column Addition for UTM parameter capture
-- Supports marketing attribution tracking per PRD-UTM-CAPTURE-ATTRIBUTION

-- Add UTM tracking columns for marketing attribution
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text;

-- Add index on utm_source for quick filtering by channel
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_utm_source ON real_estate_agents(utm_source);

-- Add composite index for common queries (source + medium + campaign)
CREATE INDEX IF NOT EXISTS idx_real_estate_agents_utm_composite ON real_estate_agents(utm_source, utm_medium, utm_campaign);

-- DOWN
-- Remove indices first
DROP INDEX IF EXISTS idx_real_estate_agents_utm_composite;
DROP INDEX IF EXISTS idx_real_estate_agents_utm_source;

-- Remove columns
ALTER TABLE real_estate_agents
  DROP COLUMN IF EXISTS utm_term,
  DROP COLUMN IF EXISTS utm_content,
  DROP COLUMN IF EXISTS utm_campaign,
  DROP COLUMN IF EXISTS utm_medium,
  DROP COLUMN IF EXISTS utm_source;
