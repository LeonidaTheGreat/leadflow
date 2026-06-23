-- Migration 024: outreach_log table
-- Tracks admin sales outreach to pilot agents for the admin pilots cockpit.

CREATE TABLE IF NOT EXISTS outreach_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     uuid        NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  channel      text        NOT NULL,
  notes        text,
  status       text        NOT NULL DEFAULT 'contacted',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outreach_log_agent_id_idx ON outreach_log (agent_id);
CREATE INDEX IF NOT EXISTS outreach_log_status_idx   ON outreach_log (status);
