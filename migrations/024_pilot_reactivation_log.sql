-- Allow tracking pilot reactivation emails for registered real_estate_agents
-- who may not have a corresponding pilot_signups row.
--
-- pilot_email_log was originally designed for pilot signup leads (pre-registration).
-- Pilot reactivation targets registered agents (real_estate_agents) directly,
-- so we add an agent_id FK and make pilot_signup_id nullable.

ALTER TABLE pilot_email_log
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES real_estate_agents(id) ON DELETE CASCADE;

ALTER TABLE pilot_email_log
  ALTER COLUMN pilot_signup_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pilot_email_log_agent_id ON pilot_email_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_pilot_email_log_agent_type ON pilot_email_log(agent_id, email_type);

-- DOWN
ALTER TABLE pilot_email_log DROP COLUMN IF EXISTS agent_id;
ALTER TABLE pilot_email_log ALTER COLUMN pilot_signup_id SET NOT NULL;
DROP INDEX IF EXISTS idx_pilot_email_log_agent_id;
DROP INDEX IF EXISTS idx_pilot_email_log_agent_type;
