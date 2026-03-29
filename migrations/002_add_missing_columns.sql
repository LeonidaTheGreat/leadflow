-- Migration 002: Add missing columns
-- Created: 2026-03-29
-- Adds columns that code references but don't exist in the DB.
-- These caused 80% of the bugs in the March 27-28 session.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS retry_with_model TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- DOWN
ALTER TABLE tasks DROP COLUMN IF EXISTS failure_count;
ALTER TABLE tasks DROP COLUMN IF EXISTS retry_with_model;
ALTER TABLE tasks DROP COLUMN IF EXISTS completed_at;
