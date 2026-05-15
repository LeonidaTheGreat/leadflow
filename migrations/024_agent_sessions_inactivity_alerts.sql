-- Migration 024: agent_sessions and inactivity_alerts tables
-- Tables may already exist (created via Supabase dashboard); using IF NOT EXISTS for idempotency.

-- FR-1 / FR-2: Session tracking — records login events and heartbeat updates
CREATE TABLE IF NOT EXISTS agent_sessions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID        NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  session_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id      ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_active_at ON agent_sessions(last_active_at);

-- FR-5: Inactivity alerting deduplication — prevents duplicate alerts within 24h per agent
CREATE TABLE IF NOT EXISTS inactivity_alerts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID        NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel    TEXT        NOT NULL DEFAULT 'telegram',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inactivity_alerts_agent_id   ON inactivity_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_inactivity_alerts_alerted_at ON inactivity_alerts(alerted_at);
