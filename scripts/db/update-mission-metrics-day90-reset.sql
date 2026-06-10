-- Migration: Reset expired Day 90 mission metrics
-- Task: 6c2c69c7 — PM Triage: metric cleanup post Day 90 miss
-- Date: 2026-06-09

-- 1. 'First Paying Customer' already updated to 2026-07-01 deadline (id=43, created 2026-06-07).
--    No action needed — description already records Day 90 miss.

-- 2. Reduce 'Signup to Activated Rate' target from 60% to 15%.
--    60% was a 5-year retention benchmark; 15% is the industry norm for 6-month activation.
UPDATE mission_metrics
SET
  target = 15,
  description = 'Day 180 (2026-08-13) realistic target: 15% (industry benchmark for 6-month activation is 15-25%). Previous 60% target was a 5-year retention benchmark — not applicable at this stage.',
  updated_at = NOW()
WHERE project_id = 'leadflow' AND name = 'Signup to Activated Rate';

-- 3. Add 'Auth Flow Completion Rate' — visibility into the #1 current conversion blocker.
--    Currently unmeasurable due to auth schema gaps; target 80% by Day 180.
INSERT INTO mission_metrics (project_id, name, description, baseline, current_value, target, unit, direction, weight, collection_method, status)
VALUES (
  'leadflow',
  'Auth Flow Completion Rate',
  '% of users who sign up and successfully complete login. Currently unmeasurable due to auth schema gaps — adding visibility into the #1 conversion blocker before Day 180.',
  NULL,
  NULL,
  80,
  '%',
  'higher_is_better',
  10,
  'manual',
  'active'
)
ON CONFLICT (project_id, name) DO NOTHING;
