-- Migration 014: Pilot Invites Table
-- Tokens stored as SHA-256 hex hashes (see migration 019 for token column type fix).
CREATE TABLE IF NOT EXISTS pilot_invites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT NOT NULL,
  name             TEXT,
  message          TEXT,
  token            TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  agent_id         UUID REFERENCES real_estate_agents(id),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pilot_invites_email_idx  ON pilot_invites (email);
CREATE INDEX IF NOT EXISTS pilot_invites_status_idx ON pilot_invites (status);
CREATE INDEX IF NOT EXISTS pilot_invites_agent_idx  ON pilot_invites (agent_id);
