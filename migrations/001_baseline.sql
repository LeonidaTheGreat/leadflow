-- Migration 001: Baseline
-- Created: 2026-03-29
-- Marks the current schema state. No changes applied.
-- All existing tables are considered the baseline.

SELECT 1; -- no-op, just marks baseline as applied

-- DOWN
SELECT 1; -- baseline cannot be rolled back
