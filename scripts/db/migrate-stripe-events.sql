-- Migration: stripe_events table
-- UC: uc-leadflow-checkout-failure-diagnostics
-- Purpose: Store raw Stripe webhook payloads for admin diagnostic visibility
-- Run: psql $LOCAL_PG_URL -f scripts/db/migrate-stripe-events.sql

CREATE TABLE IF NOT EXISTS stripe_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL,
  payload     JSONB       NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_type        ON stripe_events(type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_received_at ON stripe_events(received_at DESC);
