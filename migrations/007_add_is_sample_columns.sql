-- Migration 005: Add is_sample columns to leads and messages tables
-- Created: 2026-04-05
-- Fixes: trial-signup sample lead DB insert failing silently due to missing columns

-- Add is_sample and sample_type to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sample_type TEXT,
  ADD COLUMN IF NOT EXISTS property_interest TEXT,
  ADD COLUMN IF NOT EXISTS budget TEXT;

-- Add is_sample to messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;

-- DOWN
ALTER TABLE leads
  DROP COLUMN IF EXISTS is_sample,
  DROP COLUMN IF EXISTS sample_type,
  DROP COLUMN IF EXISTS property_interest,
  DROP COLUMN IF EXISTS budget;

ALTER TABLE messages
  DROP COLUMN IF EXISTS is_sample;
