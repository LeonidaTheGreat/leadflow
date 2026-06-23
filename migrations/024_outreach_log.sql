-- Migration 024: Admin Sales Cockpit — outreach_log table
-- Tracks manual outreach attempts per agent for the first-customer close sprint.
-- UC: uc-admin-sales-cockpit

CREATE TABLE IF NOT EXISTS outreach_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  contacted_at timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'contacted',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT outreach_log_channel_check CHECK (channel IN ('email', 'call', 'sms', 'linkedin')),
  CONSTRAINT outreach_log_status_check CHECK (status IN ('contacted', 'interested', 'declined', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_outreach_log_agent_id ON outreach_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_outreach_log_created_at ON outreach_log(created_at DESC);
