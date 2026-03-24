-- Migration 015: Session Analytics — Pilot Usage Tracking
-- Tables: agent_sessions, agent_page_views, inactivity_alerts

-- ─── agent_sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  session_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end    TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address     TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id     ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_last_active  ON agent_sessions(last_active_at);

-- RLS: only service_role can access
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_agent_sessions" ON agent_sessions;
CREATE POLICY "service_role_full_access_agent_sessions" ON agent_sessions
  USING (auth.role() = 'service_role');

-- ─── agent_page_views ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_page_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  session_id  UUID NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  page        TEXT NOT NULL,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_agent_session ON agent_page_views(agent_id, session_id);

ALTER TABLE agent_page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_page_views" ON agent_page_views;
CREATE POLICY "service_role_full_access_page_views" ON agent_page_views
  USING (auth.role() = 'service_role');

-- ─── inactivity_alerts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inactivity_alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel    TEXT NOT NULL DEFAULT 'telegram'
);

CREATE INDEX IF NOT EXISTS idx_inactivity_alerts_agent ON inactivity_alerts(agent_id, alerted_at);

ALTER TABLE inactivity_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_full_access_inactivity_alerts" ON inactivity_alerts;
CREATE POLICY "service_role_full_access_inactivity_alerts" ON inactivity_alerts
  USING (auth.role() = 'service_role');
