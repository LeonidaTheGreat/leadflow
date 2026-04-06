-- Migration 019: Fix pilot_invites.token column type
-- The token column was defined as uuid, but the invite and accept-invite routes
-- store and look up SHA-256 hex hashes (64-char hex strings, not valid UUIDs).
-- This caused all invite creation attempts to fail with:
--   "invalid input syntax for type uuid: <sha256hex>"
-- Fix: convert token to text so it can hold SHA-256 hex tokens.

ALTER TABLE pilot_invites
  DROP CONSTRAINT IF EXISTS pilot_invites_token_key;

ALTER TABLE pilot_invites
  ALTER COLUMN token TYPE text USING token::text;

ALTER TABLE pilot_invites
  ADD CONSTRAINT pilot_invites_token_key UNIQUE (token);
