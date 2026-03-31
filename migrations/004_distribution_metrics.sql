-- Migration 004: Distribution Metrics Table
-- Adds the distribution_metrics table for daily traffic and conversion tracking per channel

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
