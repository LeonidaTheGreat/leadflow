-- Migration 014: Create pilot_signups table
-- The /api/pilot-signup route inserts into pilot_signups, but this table was missing.
-- Fixes PGRST205 error — primary conversion mechanism on the landing page was broken.

CREATE TABLE IF NOT EXISTS pilot_signups (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text          NOT NULL,
  email         text          NOT NULL,
  phone         text,
  brokerage_name text,
  team_name     text,
  monthly_leads text,
  current_crm   text,
  source        text,
  utm_campaign  text,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- Unique constraint on email — prevent duplicate signups
ALTER TABLE pilot_signups
  DROP CONSTRAINT IF EXISTS pilot_signups_email_key;

ALTER TABLE pilot_signups
  ADD CONSTRAINT pilot_signups_email_key UNIQUE (email);

-- Index for quick lookups by email
CREATE INDEX IF NOT EXISTS pilot_signups_email_idx ON pilot_signups (email);

-- Index for reporting / ordering by creation date
CREATE INDEX IF NOT EXISTS pilot_signups_created_at_idx ON pilot_signups (created_at DESC);
