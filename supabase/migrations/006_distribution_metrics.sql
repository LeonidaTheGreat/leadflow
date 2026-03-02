-- Migration 006: Distribution Loop (Loop 6)
-- Adds tables for tracking distribution channels and traffic/conversion metrics.
-- Powers the autonomous distribution health system.

-- ── Distribution Channels ─────────────────────────────────────────────────

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

-- ── Distribution Metrics (daily per channel) ──────────────────────────────

CREATE TABLE IF NOT EXISTS distribution_metrics (
  id            BIGSERIAL PRIMARY KEY,
  project_id    TEXT NOT NULL,
  channel_id    BIGINT REFERENCES distribution_channels(id),
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  visitors      INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  signups       INTEGER NOT NULL DEFAULT 0,
  trials        INTEGER NOT NULL DEFAULT 0,
  conversions   INTEGER NOT NULL DEFAULT 0,          -- Paid conversions
  cost_cents    INTEGER NOT NULL DEFAULT 0,          -- Spend on this channel
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, channel_id, date)
);

CREATE INDEX IF NOT EXISTS idx_distribution_metrics_project_date
  ON distribution_metrics(project_id, date DESC);
