# PRD-LEADFLOW-METRICS-REALIGN-001
## Mission Metrics Realignment — $0 MRR Reality Sync

**Status:** Draft  
**Date:** 2026-06-14  
**Author:** PM Agent  
**Task ID:** ed8cae05-9bc4-4949-a640-9b0f05b8c374

---

## Problem

`mission_metrics` contains aspirational values that no longer reflect reality or the ramp math for Day 180. With $0 MRR and 61 days remaining to the Day 180 deadline ($20K MRR target), the metrics must:

1. Accurately reflect the current state (0 paying customers, 0% conversion)
2. Set targets grounded in the weekly acquisition math — not generic aspirational percentages

---

## Context

- **Day 180 deadline:** 2026-08-13
- **Days remaining:** 61
- **Weeks remaining:** ~8.7
- **MRR target:** $20,000
- **Revenue model:** Pro tier $149/mo ≈ 134 paying customers needed
- **Current paying customers:** 0
- **Pilot signups in funnel:** 35

To reach 134 paying customers in 61 days requires **~15 new paying customers/week** at full ramp. An initial ramp target of **3 new customers/week** reflects a conservative, achievable near-term milestone to establish momentum.

---

## Required Changes

### 1. Trial to Paid Conversion (metric id=15)

| Field | Current Value | Required Value | Reason |
|-------|--------------|----------------|--------|
| `current_value` | 0 | **0** | Correct — 0 paying customers, no change needed |
| `target` | 15 | **20** | 15% was arbitrary; 20% aligns with "1 in 5 pilots converts" which at 35 pilots = 7 customers — a concrete, achievable milestone tied to the pilot funnel |

**Rationale:** With 35 pilot signups and 0 conversions, a 20% target = 7 paying customers from current cohort. This is the minimum to validate the business model before scaling outreach.

### 2. Weekly New Customers (metric id=45)

| Field | Current Value | Required Value | Reason |
|-------|--------------|----------------|--------|
| `current_value` | 0 | **0** | Correct — no changes |
| `target` | 3 | **3** | Correct — initial ramp milestone |
| `unit` | customers/week | **customers/week** | Correct |

This metric already exists and reflects the near-term acquisition target. No change needed.

---

## SQL Implementation (for dev agent)

```sql
-- Update Trial to Paid Conversion target to 20%
UPDATE mission_metrics
SET target = 20,
    description = 'Percentage of pilot signups that convert to a paid plan. 20% = 7 paying customers from 35 pilot cohort — minimum viable conversion to validate the business model.',
    updated_at = NOW()
WHERE project_id = 'leadflow'
  AND name = 'Trial to Paid Conversion';

-- Verify Weekly New Customers is correctly set (no change required, confirm existence)
-- Expected: id=45, current_value=0, target=3, unit='customers/week'
SELECT id, name, current_value, target, unit FROM mission_metrics
WHERE project_id = 'leadflow'
  AND name IN ('Trial to Paid Conversion', 'Weekly New Customers');
```

---

## Acceptance Criteria

All must pass before task is marked done:

1. `Trial to Paid Conversion` has `target = 20` in `mission_metrics`
2. `Trial to Paid Conversion` has `current_value = 0`
3. `Weekly New Customers` exists with `current_value = 0`, `target = 3`, `unit = 'customers/week'`
4. SQL verification query returns exactly 2 rows matching the above values
5. No other `mission_metrics` rows for `leadflow` are modified

**Verification query:**
```sql
SELECT name, current_value, target, unit
FROM mission_metrics
WHERE project_id = 'leadflow'
  AND name IN ('Trial to Paid Conversion', 'Weekly New Customers')
ORDER BY name;
```

Expected output:
```
         name          | current_value | target |      unit      
-----------------------+---------------+--------+----------------
 Trial to Paid Conversion |           0 |     20 | %
 Weekly New Customers     |           0 |      3 | customers/week
```

---

## Out of Scope

- Any other mission_metrics rows
- MRR or Paying Customers targets (separately tracked)
- Dashboard display changes (auto-reflect DB values)
