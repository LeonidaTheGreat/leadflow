-- Migration: Milestone reset — Day 79 of 90
-- Date: 2026-04-08
-- Reason: $20K MRR target mathematically unreachable (0 subscriptions at Day 79).
--         New interim goal: first paying customer by Day 90 (2026-05-15).
--         Extended goal: $20K MRR by Day 180 (2026-08-13).
--
-- Source: Product review d8fa9180-a002-4cb5-a07f-4382911d32d6

UPDATE project_metadata
SET
  goal         = 'First paying customer by Day 90; $20K MRR by Day 180',
  goal_value_usd = 149,
  last_updated = NOW()
WHERE project_id = 'leadflow';
