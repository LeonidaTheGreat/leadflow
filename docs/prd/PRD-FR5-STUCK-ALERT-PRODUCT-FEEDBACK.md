# PRD-FR5-STUCK-ALERT-PRODUCT-FEEDBACK
## FR-5: Stuck-Agent Alerts Must Insert Into product_feedback

**Status:** approved  
**Version:** 1.0  
**Created:** 2026-03-15  
**Parent UC:** feat-onboarding-completion-telemetry  
**Severity:** medium  
**Root Cause Confirmed:** `lib/onboarding-telemetry.js` does not exist in the codebase — all 5 previous fix attempts were false positives.

---

## Problem

The orchestrator detects work items by reading `product_feedback` rows where `processed=false`. When real agents are stuck at an onboarding step for >24 hours, this is a UX crisis — but **nothing enters the action pipeline** because no `product_feedback` row is inserted.

AC-5 of the parent use case (`feat-onboarding-completion-telemetry`) explicitly requires:
> "Alert inserts into product_feedback if any real agent is stuck at same step for >24 hours"

The implementation was never created. Five prior task executions returned DONE without creating `lib/onboarding-telemetry.js`.

---

## Scope

This PRD covers **one specific gap**: the `createStuckAlerts()` function must insert a `product_feedback` row in addition to the deduplication `onboarding_stuck_alerts` row.

---

## Functional Requirements

### FR-5.1 — File Must Exist at the Canonical Path

**File:** `lib/onboarding-telemetry.js`  
**Location:** `/Users/clawdbot/projects/leadflow/lib/onboarding-telemetry.js`

This file must be created. Dev agent MUST verify with `ls -la lib/onboarding-telemetry.js` before marking DONE.

### FR-5.2 — createStuckAlerts() Function Contract

```
createStuckAlerts() → Promise<{ inserted: number, skipped: number }>
```

**Algorithm:**
1. Query `real_estate_agents` table for real agents (exclude emails matching `smoke-test@*` or `*@leadflow-test.com`)
2. For each agent with `onboarding_completed = false`:
   a. Compute time at current `onboarding_step` using `onboarding_events` table (most recent event for that step)
   b. If time > 24 hours AND no existing `onboarding_stuck_alerts` row for `(agent_id, onboarding_step)` within past 24h:
      - Insert deduplication row to `onboarding_stuck_alerts`
      - **INSERT product_feedback row** (see FR-5.3)
      - Increment `inserted` counter
   c. Else: increment `skipped` counter
3. Return `{ inserted, skipped }`

### FR-5.3 — product_feedback Row Format (REQUIRED)

When a stuck agent is detected, insert EXACTLY this row structure:

```javascript
await supabase.from('product_feedback').insert({
  project_id: 'leadflow',
  feedback_type: 'ux_issue',
  source: 'telemetry_alert',
  data: {
    summary: `FR-5: Agent ${agent.email} stuck at step ${agent.onboarding_step} for ${hoursStuck}h`,
    severity: 'medium',
    agent_id: agent.id,
    agent_email: agent.email,
    stuck_step: agent.onboarding_step,           // numeric step index
    stuck_step_name: STEP_NAMES[agent.onboarding_step], // e.g. 'fub_connected'
    hours_stuck: hoursStuck,
    details: `Agent has been at onboarding step ${agent.onboarding_step} (${STEP_NAMES[agent.onboarding_step]}) for ${hoursStuck} hours without progression. The orchestrator should create a task to investigate or reach out to the agent.`
  },
  processed: false
});
```

**Step name mapping:**
```
0 → 'email_verified'
1 → 'fub_connected'
2 → 'phone_configured'
3 → 'sms_verified'
4 → 'aha_completed'
```

### FR-5.4 — Module Export

The file must export `createStuckAlerts` so it can be called from scheduled jobs:

```javascript
module.exports = { createStuckAlerts };
```

### FR-5.5 — Scheduled Invocation

`createStuckAlerts()` must be invocable via an API endpoint or cron-compatible mechanism. If a route already exists at `/api/internal/telemetry` or similar, wire `createStuckAlerts()` there. If no route exists, create a minimal internal endpoint at `/api/internal/stuck-alerts` (POST, no auth for internal use; add `x-internal-key` header check if one exists in the codebase).

### FR-5.6 — Deduplication Schema for onboarding_stuck_alerts

If the `onboarding_stuck_alerts` table does not have the expected schema, it must have at minimum:
```sql
agent_id UUID
onboarding_step INTEGER  
alerted_at TIMESTAMP WITH TIME ZONE
```

Query to check for recent duplicate: look for `agent_id = $1 AND onboarding_step = $2 AND alerted_at > NOW() - INTERVAL '24 hours'`

---

## Acceptance Criteria

| # | Criterion | Testable By |
|---|-----------|-------------|
| AC-1 | `lib/onboarding-telemetry.js` exists at the exact path | `ls -la lib/onboarding-telemetry.js` |
| AC-2 | `createStuckAlerts()` is exported from the module | `require('./lib/onboarding-telemetry').createStuckAlerts` is a function |
| AC-3 | When an agent has been at the same step >24h, a `product_feedback` row is inserted with `feedback_type='ux_issue'` and `source='telemetry_alert'` | Query `product_feedback` after test run |
| AC-4 | Duplicate alert not inserted for same agent+step within 24h window | Run twice within 24h — `product_feedback` count increments by 1, not 2 |
| AC-5 | Smoke-test emails excluded (`smoke-test@*`, `*@leadflow-test.com`) | No product_feedback rows for test emails |
| AC-6 | `createStuckAlerts()` returns `{ inserted: N, skipped: M }` | Check return value |
| AC-7 | The function can be invoked via HTTP (cron or API route) | HTTP POST to the relevant endpoint returns 200 |

---

## What Dev Agent MUST Do Before Marking DONE

1. `ls -la /Users/clawdbot/projects/leadflow/lib/onboarding-telemetry.js` — file must exist
2. `node -e "const {createStuckAlerts} = require('./lib/onboarding-telemetry'); console.log(typeof createStuckAlerts);"` — must print "function"
3. Run `createStuckAlerts()` against the dev Supabase instance and show the return value
4. Query `product_feedback` and show at least the count of rows
5. Include all of the above as verifications in the completion report

**If any of these verifications fail, the task is NOT done.**

---

## What PM Will Verify

On next heartbeat, PM will:
- Check that `lib/onboarding-telemetry.js` exists in the Git repo
- Check that `product_feedback` table has at least one row with `source='telemetry_alert'` from a test run
- Update `e2e_tests_passing = true` on the use case when E2E-ONBOARD-TELEMETRY-004 passes

---

## Out of Scope

- Changing the onboarding_events schema
- Modifying existing funnel tracking or admin views
- Implementing anything beyond `createStuckAlerts()` and its invocation route
