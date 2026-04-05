-- Migration 006: Add missing columns to pilot_signups
-- Adds brokerage_name, team_name, monthly_leads, current_crm, utm_campaign columns
-- that the pilot signup form captures but the table was missing

-- Up
ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS brokerage_name TEXT,
  ADD COLUMN IF NOT EXISTS team_name TEXT,
  ADD COLUMN IF NOT EXISTS monthly_leads TEXT,
  ADD COLUMN IF NOT EXISTS current_crm TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Unique index on email so duplicates return 23505
CREATE UNIQUE INDEX IF NOT EXISTS pilot_signups_email_unique ON pilot_signups(email);

-- Down
-- ALTER TABLE pilot_signups
--   DROP COLUMN IF EXISTS brokerage_name,
--   DROP COLUMN IF EXISTS team_name,
--   DROP COLUMN IF EXISTS monthly_leads,
--   DROP COLUMN IF EXISTS current_crm,
--   DROP COLUMN IF EXISTS utm_campaign;
-- DROP INDEX IF EXISTS pilot_signups_email_unique;
