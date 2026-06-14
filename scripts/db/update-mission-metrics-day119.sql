-- Migration: Update mission_metrics to reflect $0 MRR reality (Day 119)
-- Date: 2026-06-13
-- Context: $20K MRR by Day 180 requires ~133 paying Pro customers.
--          61 days remain. Concrete unit metrics beat abstract % rates
--          for genome evaluation against Stripe events.

-- 1. Set Trial to Paid Conversion current_value to 0 (was NULL)
--    0 paying customers out of 35 pilot signups = 0% conversion
UPDATE mission_metrics
SET
    current_value = 0,
    updated_at = now()
WHERE project_id = 'leadflow'
  AND name = 'Trial to Paid Conversion';

-- 2. Add Weekly New Customers metric
--    Target: 3 new paying customers/week to reach ~133 in 61 days (8.7 weeks × 3 = ~26 minimum ramp)
--    Genome evaluates this from Stripe events (new subscription created in last 7 days)
INSERT INTO mission_metrics
    (project_id, name, description, baseline, current_value, target, unit, direction, weight, collection_method, status)
VALUES
    (
        'leadflow',
        'Weekly New Customers',
        'New paying customers acquired per week. Concrete conversion ramp metric evaluable from Stripe subscription events. Target: 3/week to reach 133 paying customers by Day 180.',
        0,
        0,
        3,
        'customers/week',
        'higher_is_better',
        15,
        'stripe_events',
        'active'
    )
ON CONFLICT (project_id, name) DO UPDATE
SET
    current_value = EXCLUDED.current_value,
    target        = EXCLUDED.target,
    description   = EXCLUDED.description,
    updated_at    = now();
