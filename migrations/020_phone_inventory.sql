-- Migration: Phone inventory pool
-- Pre-purchased Twilio numbers available for instant assignment during onboarding.
-- Agents are assigned from this pool instead of triggering on-demand Twilio purchases,
-- eliminating "no numbers available" errors during onboarding.
-- Date: 2026-04-12

CREATE TABLE IF NOT EXISTS phone_inventory (
  id           SERIAL PRIMARY KEY,
  sid          TEXT UNIQUE NOT NULL,
  e164         TEXT UNIQUE NOT NULL,
  area_code    TEXT,
  country      TEXT DEFAULT 'US',
  status       TEXT DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'reserved')),
  assigned_to  UUID REFERENCES real_estate_agents(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  assigned_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_phone_inventory_status ON phone_inventory(status);

-- DOWN
-- DROP INDEX IF EXISTS idx_phone_inventory_status;
-- DROP TABLE IF EXISTS phone_inventory;
