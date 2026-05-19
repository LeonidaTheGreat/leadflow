-- Migration 024: inactivity_alerts — add alerted_at + channel columns
-- Required by /api/cron/inactivity-alerts for dedup (alerted_at) and
-- notification source tracking (channel). Idempotent via IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS inactivity_alerts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID        NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  alert_type TEXT,
  message    TEXT,
  resolved   BOOLEAN     NOT NULL DEFAULT FALSE,
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add alerted_at if table pre-exists without it
ALTER TABLE inactivity_alerts
  ADD COLUMN IF NOT EXISTS alerted_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add channel if table pre-exists without it
ALTER TABLE inactivity_alerts
  ADD COLUMN IF NOT EXISTS channel TEXT;

-- Index alerted_at for efficient 24h dedup window queries
CREATE INDEX IF NOT EXISTS idx_inactivity_alerts_agent_alerted
  ON inactivity_alerts(agent_id, alerted_at);
