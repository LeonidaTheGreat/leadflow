# PRD: Signup-to-Activated Rate — Metric Collection

**PRD ID:** prd-signup-activated-rate-metric-collection  
**Status:** ready  
**Priority:** P1  
**Use Case:** uc-signup-activated-rate-metric  
**Owner:** Product Manager  
**Last Updated:** 2026-04-22  
**Revenue Impact:** Unblocks genome metric tracking; required to measure activation improvement

---

## Problem

`PROJECT_GRAPH.json` node `metric-signup-to-activated-rate` has `current: null` and `lastCollected: null`. The genome flags this as a high-severity gap (gap: 60.0 against a 60% target).

The null is not because activation is zero — it's because **no code collects this metric**. The diagnostic infrastructure exists (`GET /api/admin/funnel/trial-activation`, `onboarding_step` column, `onboarding_events` table) but nothing writes the aggregate rate to the `metrics` table.

Without a collected value, the genome cannot track improvement, and the project graph cannot surface progress. Every activation improvement we ship is invisible.

---

## Root Cause of Low Actual Rate (Context for Dev)

Even once the metric is collected, the rate will be near 0% because of three compounding blockers:

| Blocker | Status | Fix |
|---------|--------|-----|
| Trial email delivery: zero emails sent to 344 trial agents | In-flight PRD | `b417a48f` commit on PM branch |
| A2P compliance blocks SMS for all agents | Blocked external | Dashboard banner needed |
| FUB connection step (step 2) has no nudge for stuck agents | Not implemented | Follow-up UC |

This PRD only covers metric collection. Activation rate improvement requires the above fixes.

---

## Definition: "Activated"

**Activated = FUB API key connected** (`onboarding_step >= 2` on `real_estate_agents`).

Rationale: FUB connection is the prerequisite for AI lead response to function. An agent without FUB cannot receive the core product value regardless of email verification or phone setup. This is the single most meaningful activation gate.

**Trial agent = `real_estate_agents` where:**
- `trial_ends_at IS NOT NULL`
- `subscription_status NOT IN ('active', 'canceled')` or is null
- Email is not a smoke-test account (`smoke-test@*` or `*@leadflow-test.com`)

---

## Metric Calculation

```sql
WITH trial_agents AS (
  SELECT COUNT(*) AS total
  FROM real_estate_agents
  WHERE trial_ends_at IS NOT NULL
    AND (subscription_status IS NULL OR subscription_status NOT IN ('active', 'canceled'))
    AND email NOT ILIKE 'smoke-test@%'
    AND email NOT ILIKE '%@leadflow-test.com'
),
activated_agents AS (
  SELECT COUNT(*) AS activated
  FROM real_estate_agents
  WHERE trial_ends_at IS NOT NULL
    AND (subscription_status IS NULL OR subscription_status NOT IN ('active', 'canceled'))
    AND email NOT ILIKE 'smoke-test@%'
    AND email NOT ILIKE '%@leadflow-test.com'
    AND onboarding_step >= 2
)
SELECT
  activated_agents.activated,
  trial_agents.total,
  CASE WHEN trial_agents.total = 0 THEN 0
       ELSE ROUND((activated_agents.activated::numeric / trial_agents.total) * 100, 1)
  END AS signup_activated_rate_pct
FROM trial_agents, activated_agents;
```

---

## Implementation Spec

### What to Build

A script at `scripts/collect-activation-metric.js` that:
1. Runs the SQL above against local PostgreSQL (`LOCAL_PG_URL`)
2. Writes the result to the `metrics` table
3. Is called by the genome heartbeat as a new step (or as a standalone script in the cron)

### metrics Table Insert

```javascript
await pool.query(`
  INSERT INTO metrics (project_id, domain, metric_type, metric_name, current_value, metadata, created_at)
  VALUES ($1, $2, $3, $4, $5, $6, NOW())
`, [
  'leadflow',
  'activation',
  'signup_activated_rate',
  'Signup to Activated Rate',
  signupActivatedRatePct,          // numeric, e.g. 4.3
  JSON.stringify({ activated, total, as_of: new Date().toISOString() })
]);
```

### Heartbeat Integration

Add to `~/.openclaw/genome/core/heartbeat-executor.js` as step **6j** (after step 6i code review):

```javascript
// Step 6j: Collect activation metric
await collectActivationMetric(projectConfig, pool);
```

The function calls `scripts/collect-activation-metric.js` logic (extracted as a module), runs the SQL, inserts into `metrics`, and logs the result.

**Frequency:** Every heartbeat (every 5 minutes). The metric is idempotent — each run appends a new row with current snapshot. Reporting queries use `ORDER BY created_at DESC LIMIT 1`.

### Project Graph Update

After inserting, update `PROJECT_GRAPH.json` node `metric-signup-to-activated-rate`:
```json
{
  "current": 4.3,
  "lastCollected": "2026-04-22T10:00:00.000Z"
}
```

This is done by reading and updating `PROJECT_GRAPH.json` in the leadflow project dir — same pattern used by the project graph generator.

---

## Files to Change

| File | Change |
|------|--------|
| `scripts/collect-activation-metric.js` | **Create** — metric collection module |
| `~/.openclaw/genome/core/heartbeat-executor.js` | **Edit** — add step 6j call |
| `PROJECT_GRAPH.json` | **Updated at runtime** by the script on each run |

**Do NOT touch:**
- `product/lead-response/dashboard/lib/onboarding-telemetry.js`
- Any route files
- `project.config.json`
- `migrations/` (no schema changes needed — `metrics` table already exists)

---

## Acceptance Criteria

### AC-1: Script runs without error
```bash
node scripts/collect-activation-metric.js
# Exit code 0
# stdout: "Activation metric collected: X% (N/M agents activated)"
```

### AC-2: Metric written to DB
```sql
SELECT current_value, metadata, created_at
FROM metrics
WHERE project_id = 'leadflow' AND metric_type = 'signup_activated_rate'
ORDER BY created_at DESC LIMIT 1;
-- Must return 1 row with non-null current_value
```

### AC-3: PROJECT_GRAPH.json updated
```bash
node -e "const g = require('./PROJECT_GRAPH.json'); const m = g.nodes.find(n => n.id === 'metric-signup-to-activated-rate'); console.log(m.data.current, m.data.lastCollected);"
# Must print a numeric value (e.g. 4.3) and an ISO timestamp (not null)
```

### AC-4: Smoke-test accounts excluded
```sql
-- Smoke-test accounts must not appear in the denominator
SELECT COUNT(*) FROM real_estate_agents
WHERE (email ILIKE 'smoke-test@%' OR email ILIKE '%@leadflow-test.com')
  AND trial_ends_at IS NOT NULL;
-- Any rows returned here should NOT change the metric value
```

---

## E2E Test

Create `tests/e2e/collect-activation-metric.test.js`:

1. Insert a test trial agent with `onboarding_step = 0` and a smoke-test agent
2. Insert a test trial agent with `onboarding_step = 2`
3. Run the collection script
4. Assert `metrics` table has a row with `metric_type = 'signup_activated_rate'`
5. Assert smoke-test agent is excluded from total count
6. Assert activated agent (step >= 2) counted in numerator
7. Assert non-activated agent (step < 2) not in numerator
8. Cleanup test rows

---

## Out of Scope

- Changing what "activated" means (locked to FUB connected / `onboarding_step >= 2`)
- Building a UI to display this metric (already in project graph dashboard)
- Collecting step-by-step funnel conversion rates (separate concern)
- Fixing actual activation rate (separate PRDs: trial email delivery fix, activation nudge)
