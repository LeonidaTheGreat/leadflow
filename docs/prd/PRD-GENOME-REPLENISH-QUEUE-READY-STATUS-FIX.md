# PRD: Fix Genome replenishQueue — Add `ready` to startStep Status Check

**ID:** prd-genome-replenish-queue-ready-fix  
**Status:** active  
**Priority:** P1 (Blocker — causes infinite task loops, wastes agent budget)  
**Affected UC:** uc-genome-replenish-queue-ready-fix  
**Reported:** 2026-04-05  

---

## Problem

`replenishQueue()` in `~/projects/genome/core/heartbeat-executor.js` contains a startStep calculation to determine which workflow step to spawn next for a UC. This check only runs for UCs with `implementation_status IN ('stuck', 'in_progress', 'not_started')`.

UCs with `implementation_status = 'ready'` are excluded from this check, causing `startStep` to default to `0` (the first step). If step 0 is already done (e.g., PM task completed), a new step-0 task is created anyway — every heartbeat.

**Observed impact:** UC `uc-revenue-pricing-clarity` had 3 duplicate PM tasks created within 2 hours. Each wasted ~$0.05–0.10 of agent budget and polluted the task queue.

---

## Root Cause

In `replenishQueue()` (~line 7514), the startStep detection block is gated:

```javascript
if (['stuck', 'in_progress', 'not_started'].includes(uc.implementation_status)) {
  // find done tasks, advance startStep
}
```

`'ready'` is missing from this array. A UC transitions to `ready` after PM approval/triage but before dev work begins. At this point, the PM step is done but dev step is not yet started. Without `'ready'` in the filter, `startStep = 0` always, causing PM re-spawn.

---

## Fix Specification

**File:** `~/projects/genome/core/heartbeat-executor.js`  
**Change:** Add `'ready'` to the status array in the startStep block.

**Before:**
```javascript
if (['stuck', 'in_progress', 'not_started'].includes(uc.implementation_status)) {
```

**After:**
```javascript
if (['stuck', 'in_progress', 'not_started', 'ready'].includes(uc.implementation_status)) {
```

This is a one-line change. No schema changes, no migrations needed.

---

## Acceptance Criteria

1. The string `'ready'` appears in the startStep status check in `heartbeat-executor.js`
2. After the fix, a UC with `status='ready'` and a completed PM task does NOT get a new PM task spawned by `replenishQueue`
3. The next correct step (e.g., dev) IS spawned for ready UCs with done PM steps

### Machine-Verifiable Checks

```bash
# Check 1: 'ready' is present in the status filter
grep -n "ready" ~/projects/genome/core/heartbeat-executor.js | grep "startStep\|includes\|not_started" | wc -l
# Expected: >= 1

# Check 2: No duplicate PM tasks for uc-revenue-pricing-clarity
psql $LOCAL_PG_URL -c "SELECT COUNT(*) FROM tasks WHERE use_case_id='uc-revenue-pricing-clarity' AND agent_id='product' AND status NOT IN ('done','failed') GROUP BY use_case_id"
# Expected: 0 or 1
```

---

## E2E Test Spec

**Test:** `replenishQueue does not recreate done tasks for ready UCs`

**Setup:**
1. Insert a UC with `implementation_status='ready'`, `workflow=['product','dev']`
2. Insert a done task for that UC with `agent_id='product'`

**Action:**
- Trigger or simulate `replenishQueue()`

**Expected:**
- No new `product` task is created
- A new `dev` task IS created (or already exists)
- `startStep` is `1`, not `0`

---

## Implementation Notes

- The fix is in `~/projects/genome/` (the genome repo), not in `leadflow/`
- Dev agent should check out `~/projects/genome/` and apply the one-line fix
- After fix, restart the heartbeat or wait for the next cycle to verify no duplicate PM tasks are created for `uc-revenue-pricing-clarity`

---

## Related

- **Affected UC:** `uc-revenue-pricing-clarity` (had 3 duplicate PM tasks)
- **Similar past fix (2026-03-12):** `replenishQueue activeUCs` bug — `done` tasks were counted as active, fixed by filtering status
- **Similar past fix (2026-03-12):** `sweepUCCompletions scope` bug — `not_started` UCs missed from completion sweep
