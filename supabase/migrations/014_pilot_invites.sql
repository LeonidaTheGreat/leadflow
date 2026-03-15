-- Migration 014: Admin Pilot Invite Flow
-- Creates pilot_invites table for direct agent recruitment

CREATE TABLE IF NOT EXISTS pilot_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  message TEXT,
  invited_by TEXT NOT NULL DEFAULT 'stojan',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired')),
  agent_id UUID REFERENCES real_estate_agents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pilot_invites_token ON pilot_invites(token);
CREATE INDEX IF NOT EXISTS idx_pilot_invites_email ON pilot_invites(email);
CREATE INDEX IF NOT EXISTS idx_pilot_invites_status ON pilot_invites(status);
CREATE INDEX IF NOT EXISTS idx_pilot_invites_agent_id ON pilot_invites(agent_id);

-- Enable RLS
ALTER TABLE pilot_invites ENABLE ROW LEVEL SECURITY;

-- Policies
-- Service role can manage all invites
CREATE POLICY "Service role can manage pilot_invites" ON pilot_invites
  FOR ALL USING (auth.role() = 'service_role');

-- Anyone can read their own accepted invite (for tracking purposes if needed)
CREATE POLICY "Users can read their own accepted invite" ON pilot_invites
  FOR SELECT USING (agent_id = auth.uid() AND status = 'accepted');

-- Comment for documentation
COMMENT ON TABLE pilot_invites IS 'Direct recruitment invites for pilot agents - magic link flow';
COMMENT ON COLUMN pilot_invites.token IS 'UUID token for magic link (auth/accept-invite?token=...)';
COMMENT ON COLUMN pilot_invites.token_expires_at IS 'Token expiration (7 days from creation)';
