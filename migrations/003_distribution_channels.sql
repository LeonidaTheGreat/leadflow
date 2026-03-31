-- Migration 003: Distribution Channels Table
-- Adds the distribution_channels table for tracking marketing channels and their health

CREATE TABLE IF NOT EXISTS distribution_channels (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT NOT NULL,
  channel_type  TEXT NOT NULL,                       -- landing_page, content, outbound, referral, paid
  name          TEXT NOT NULL,                       -- e.g. "Main landing page", "Blog", "Cold email"
  url           TEXT,
  status        TEXT NOT NULL DEFAULT 'planned',     -- planned, active, paused, deprecated
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_distribution_channels_project
  ON distribution_channels(project_id, status);
