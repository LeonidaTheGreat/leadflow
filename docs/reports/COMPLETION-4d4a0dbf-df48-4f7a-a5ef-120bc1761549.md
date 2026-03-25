# Completion Report — 4d4a0dbf-df48-4f7a-a5ef-120bc1761549

**Task:** fix-api-api-lead-capture-returns-500-db-schema-migrati  
**Type:** Bug Fix — API /api/lead-capture returns 500 — DB schema migration not run  
**Date:** 2026-03-25  
**Status:** ✅ COMPLETE

## Summary

Fixed the critical 500 error on `POST /api/lead-capture` caused by missing DB columns and no unique index on `pilot_signups.email`.

## Root Cause

The `pilot_signups` table was missing columns required by the lead-capture route:
- `first_name`, `status`, `utm_source`, `utm_medium`, `utm_campaign`

Additionally, there was no unique index on `pilot_signups(email)`, causing the `ON CONFLICT (email)` upsert clause to fail silently or error.

## Fix Applied

### DB Migration (already applied to production)

```sql
ALTER TABLE pilot_signups
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'nurture',
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS pilot_signups_email_unique ON pilot_signups(email);
```

Migration verified manually via Supabase service role — all columns exist and upsert with deduplication works correctly.

### Migration Script Added

`scripts/db/migrate-pilot-signups-schema.js` — idempotent, re-runnable script for future environments.

## Verification

- **Live upsert test:** Inserted a test row with all new columns → succeeded ✅
- **Dedup test:** Upserted same email twice → only 1 row in DB, UTM updated ✅
- **Unit tests:** All 20 tests pass ✅

## Files Changed

- `scripts/db/migrate-pilot-signups-schema.js` — CREATED
- `docs/reports/COMPLETION-4d4a0dbf-df48-4f7a-a5ef-120bc1761549.md` — CREATED

## Test Results

| Suite | Passed | Total | Pass Rate |
|-------|--------|-------|-----------|
| lead-capture.test.ts | 20 | 20 | 100% |
