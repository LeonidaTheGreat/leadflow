-- mission-metrics-weekly-customers-seed.sql
-- Idempotent seed: ensures mission_metrics reflect $0 MRR reality as of 2026-06-13.
--
-- Changes captured here (originally applied by PM triage task 7b59e802):
--   1. Add 'Weekly New Customers' metric (target=3/week) — concrete ramp toward $20K MRR
--   2. Ensure 'Trial to Paid Conversion' current_value=0 (reflects 0 paying customers)

INSERT INTO mission_metrics (
  project_id,
  name,
  description,
  baseline,
  current_value,
  target,
  unit,
  direction,
  weight,
  collection_method,
  status,
  target_date
)
VALUES (
  'leadflow',
  'Weekly New Customers',
  'New paying customers per week — concrete ramp metric toward $20K MRR by Day 180 (2026-08-13)',
  0,
  0,
  3,
  'customers/week',
  'higher_is_better',
  10,
  'stripe_events',
  'active',
  '2026-08-13'
)
ON CONFLICT (project_id, name) DO UPDATE
  SET target             = EXCLUDED.target,
      unit               = EXCLUDED.unit,
      description        = EXCLUDED.description,
      collection_method  = EXCLUDED.collection_method,
      updated_at         = NOW();

UPDATE mission_metrics
SET    current_value = 0,
       updated_at    = NOW()
WHERE  project_id = 'leadflow'
  AND  name       = 'Trial to Paid Conversion'
  AND  (current_value IS NULL OR current_value != 0);
