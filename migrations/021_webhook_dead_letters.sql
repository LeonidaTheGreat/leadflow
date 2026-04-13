-- Migration: Webhook dead letters
-- Stores failed webhook processing attempts for debugging and reprocessing.
-- Written by both fub-webhook-listener and calcom-webhook routes when processing fails.
-- Date: 2026-04-12

CREATE TABLE IF NOT EXISTS webhook_dead_letters (
  id            SERIAL PRIMARY KEY,
  source        TEXT NOT NULL,
  event_type    TEXT,
  payload       JSONB,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_dead_letters_source ON webhook_dead_letters(source);
CREATE INDEX IF NOT EXISTS idx_webhook_dead_letters_created_at ON webhook_dead_letters(created_at);

-- DOWN
-- DROP INDEX IF EXISTS idx_webhook_dead_letters_created_at;
-- DROP INDEX IF EXISTS idx_webhook_dead_letters_source;
-- DROP TABLE IF EXISTS webhook_dead_letters;
