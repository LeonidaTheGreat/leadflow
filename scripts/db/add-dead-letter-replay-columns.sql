-- Migration: add replay tracking columns to webhook_dead_letters
-- Adds: status, retry_count, last_retry_at
-- Safe to run multiple times (uses IF NOT EXISTS / ALTER TABLE IF NOT EXISTS pattern)

ALTER TABLE webhook_dead_letters
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;
