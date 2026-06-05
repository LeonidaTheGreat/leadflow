# Root Cause Analysis: Circuit Breaker Loop — uc-leadflow-maintenance

**Date:** 2026-06-05  
**Task:** 5ad59489 | **Severity:** P1 genome bug  
**Fix task:** 0a6616ad (dev, ready)

## Symptom

`PM: Investigate circuit breaker — uc-leadflow-maintenance` created 3× in 2h, auto-cancelled each time, triggering the loop detector.

## Root Cause

`genome/core/food/spawn-preparer.js` has two separate maintenance UC exemption points:

| Line | Check | Maintenance exempt? |
|------|-------|-------------------|
| 175 | "UC complete" skip | ✅ Yes (MAINTENANCE_UC_SET) |
| 407 | Circuit breaker | ❌ **No** |

`uc-leadflow-maintenance` currently has **1098 tasks / $3,579 total cost** — it will always exceed the 15-task circuit breaker threshold. Every maintenance task spawn trips the breaker.

## Loop Sequence

1. Maintenance task queued with `use_case_id = 'uc-leadflow-maintenance'`
2. Circuit breaker fires → cancels task, marks UC `stuck`, creates PM investigation task
3. Loop detector runs every ~30s — sees PM task created 3× → cancels all three, creates this investigation task
4. `findTaskByTitle` dedup excludes `cancelled` tasks → next breaker trip finds no active PM task → creates another

## Fix (genome code, not leadflow)

**File:** `~/projects/genome/core/food/spawn-preparer.js`  
**Change line 407:**

```js
// Before
if (task.use_case_id && store.db) {

// After
if (task.use_case_id && store.db && !MAINTENANCE_UC_SET.has(task.use_case_id)) {
```

`MAINTENANCE_UC_SET` is already in scope (defined at line 174, same function). This aligns the circuit breaker with the existing UC-complete exemption.

**Secondary hardening:** `findTaskByTitle` dedup at line 427 should also exclude tasks cancelled within the last 2h to prevent rapid re-creation if the primary fix ever misses.

## Scope Boundaries

- Touch only: `genome/core/food/spawn-preparer.js` line 407 (condition) and line 427 (dedup)
- Do NOT modify: MAINTENANCE_UC_SET definition, uc-lifecycle.js, retryStuckUCs

## Verification

After fix: spawn a maintenance task for `uc-leadflow-maintenance` → confirm no circuit breaker fires in genome logs.
