-- Migration 016: Add lead-capture columns to pilot_signups
-- The /api/lead-capture route requires: first_name, status, utm_source, utm_medium, utm_campaign
-- This migration ensures all columns exist and proper indexing for deduplication.

-- Add missing columns (IF NOT EXISTS guards make this idempotent)
ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nurture',
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Clean up duplicate unique constraints on email
-- Drop any unique constraints that aren't the primary key
ALTER TABLE pilot_signups DROP CONSTRAINT IF EXISTS pilot_signups_email_unique CASCADE;

-- Ensure we have ONE unique constraint on email for PostgREST ON CONFLICT
-- The constraint name 'pilot_signups_email_key' is used by the upsert deduplication
CREATE UNIQUE INDEX IF NOT EXISTS pilot_signups_email_key ON pilot_signups(email);

-- Add status index for quick filtering by nurture state
CREATE INDEX IF NOT EXISTS idx_pilot_signups_status ON pilot_signups(status);
