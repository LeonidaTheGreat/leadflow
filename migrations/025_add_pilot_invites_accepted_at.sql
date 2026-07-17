-- Migration 025: Add accepted_at column to pilot_invites
-- Needed for the two-step invite flow: accept-invite validates the token,
-- set-password marks the invite as completed by setting accepted_at + status='accepted'.
-- Without this column, the set-password update fails and invites can never be marked complete.

ALTER TABLE pilot_invites
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ DEFAULT NULL;
