-- Migration: Redefine goals — Day 79 reality check
-- Context: Day 79 of 90, $0 MRR. $20K MRR in 11 days is mathematically unreachable.
-- Action: Add "first paying customer" milestone for Day 90; push MRR goal to Day 180.
-- Date: 2026-04-08

BEGIN;

-- 1. Push the unreachable $20K MRR goal to Day 180 (2026-08-13)
UPDATE project_goals
SET
  target_date = '2026-08-13',
  trajectory  = 'behind',
  metadata    = metadata || '{"deferred_at":"2026-04-08","deferred_reason":"Day 79 reality check — $0 MRR, 11 days remain. Target moved to Day 180 (2026-08-13)."}',
  updated_at  = NOW()
WHERE project_id = 'leadflow'
  AND goal_type  = 'mrr'
  AND status     = 'active';

-- 2. Add "first paying customer" milestone — target: 1 subscriber by Day 90 (2026-05-15)
INSERT INTO project_goals (project_id, goal_type, target_value, current_value, target_date, status, trajectory, metadata)
VALUES (
  'leadflow',
  'first_paying_customer',
  1,
  0,
  '2026-05-15',
  'active',
  'behind',
  '{"description":"First paying customer before Day 90","priority":"critical","created_reason":"Day 79 reality check — $20K MRR unreachable, near-term milestone redefined"}'
)
;

COMMIT;
