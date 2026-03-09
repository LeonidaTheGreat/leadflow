# PRD: Fix Smoke Test Loop — Vercel Dashboard Health

**ID:** prd-fix-smoke-loop-vercel-dashboard  
**Status:** approved  
**Author:** Product Manager  
**Date:** 2026-03-24  

---

## Problem

The orchestrator's smoke test handler creates "Smoke: Vercel dashboard health failing" tasks in an **infinite loop** — 23 tasks created in 2 hours. This wastes budget, floods Telegram, and blocks real work from being visible.

---

## Root Cause (Confirmed)

Two compounding bugs in `heartbeat-executor.js` smoke handler (around line 2310):

### Bug 1: `findTaskByTitle` filters out completed tasks

```javascript
// task-store.js findTaskByTitle() — only returns OPEN tasks
.not('status', 'in', '("done","failed","cancelled")')
```

The smoke handler logic:

```javascript
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
if (existingSmoke && !['done', 'failed'].includes(existingSmoke.status)) {
  continue  // skip if open
}
// ... escalation paths check existingSmoke.status === 'done' → NEVER REACHED
// ... falls through to create ANOTHER QC task
```

Because `findTaskByTitle` only returns non-done/non-failed tasks, `existingSmoke` is always `null` after a QC task completes. The dedup check (`existingSmoke && ...`) never fires. The escalation check (`existingSmoke.status === 'done'`) is unreachable. The handler falls through and creates a fresh "Smoke:" QC task every single heartbeat cycle.

### Bug 2: `testState.lastTaskCompleted` is never written

The 2-hour cooldown relies on `testState.lastTaskCompleted` in `.smoke-test-state.json`:

```javascript
const lastCompleted = testState.lastTaskCompleted
if (lastCompleted) {
  const hoursSince = ...
  if (hoursSince < 2) continue  // ← never fires
}
```

There is no code anywhere in the heartbeat that writes `lastTaskCompleted` to the state file when a smoke task completes. The cooldown is permanently broken.

**Result:** Both dedup and cooldown are non-functional. A new QC task is created every 5-minute heartbeat for as long as the smoke test fails.

---

## Confirmed Evidence

Supabase `tasks` table shows 11 identical "Smoke: Vercel dashboard health failing" rows with `status: done`, created at 5-minute intervals on 2026-03-24 between 02:33 and 03:15 UTC. All are QC tasks. No corresponding "Fix:" dev tasks were ever created — the escalation path was never reached.

---

## Fix Requirements

### Requirement 1: Use a completed-task-aware query in the smoke handler

The smoke handler must be able to find the most recently completed smoke/dev task by title, not just open ones. Replace the two `findTaskByTitle` calls with a dedicated helper `findLatestTaskByTitle(title)` that returns the most recent task regardless of status.

### Requirement 2: Fix escalation logic to use the new query

With `findLatestTaskByTitle`, the existing escalation flow should work correctly:
- `existingSmoke.status === 'done'` → escalate to dev (as designed)
- `existingDev.status === 'done'` → retry dev with context (as designed)
- `existingSmoke || existingDev` with open status → skip (dedup, as designed)

### Requirement 3: Populate `lastTaskCompleted` in smoke state file

When a smoke test task transitions to `done` or `failed`, the orchestrator must write `lastTaskCompleted: <ISO timestamp>` into the relevant entry in `.smoke-test-state.json`. This enables the 2-hour cooldown to function.

Two implementation options:
- **Option A (preferred):** In `createFollowUpTasks()` or the task-completion handler, detect smoke-tagged tasks completing and update the state file.
- **Option B:** Compute `lastTaskCompleted` dynamically from the Supabase `completed_at` column of the most recent smoke task (avoids state file dependency).

### Requirement 4: Circuit breaker must not be bypassable

After `MAX_SMOKE_RETRIES` failed attempts, the circuit breaker must fire and prevent further task creation for the remainder of the day. Currently, because neither `devRetries` nor `totalCost` is being incremented (the escalation paths are never reached), the circuit breaker never fires. Fixing Requirements 1–3 should restore circuit breaker functionality.

### Requirement 5: Clean up duplicate open/ready tasks

Any open "Smoke: Vercel dashboard health failing" tasks that were created during the loop and are still in `ready` status should be cancelled to avoid spawning redundant QC agents.

---

## Acceptance Criteria

1. **No loop recurrence:** With the `vercel-dashboard` smoke test failing, running 10 consecutive heartbeats must NOT create more than 1 QC task. The dedup check must halt task creation from the 2nd heartbeat onward.

2. **Escalation path reached:** After the QC task completes (status `done`), the NEXT heartbeat must create a `Fix: Vercel dashboard health (smoke)` dev task — not another QC task.

3. **Cooldown functional:** After a dev task completes, the cooldown check must prevent new task creation for 2 hours. Verify `testState.lastTaskCompleted` is populated in `.smoke-test-state.json`.

4. **Circuit breaker fires:** After `MAX_SMOKE_RETRIES` dev completions with smoke still failing, no more tasks are created. The actions log shows `🛑 Circuit breaker: ...`.

5. **No duplicate tasks spawned:** After the fix is deployed, query `tasks` table for `status IN ('ready','running','spawned')` with title matching smoke pattern — must return at most 1 row per smoke test ID.

---

## Out of Scope

- Fixing the underlying Vercel dashboard health issue (separate concern — the smoke test handles that via the QC/dev escalation chain once the loop is fixed)
- Changes to the smoke test definitions or health check URLs
- Changes to the 5-minute heartbeat schedule

---

## Files to Modify

| File | Change |
|------|--------|
| `~/.openclaw/genome/core/heartbeat-executor.js` | Fix smoke handler: use `findLatestTaskByTitle`, populate `lastTaskCompleted` |
| `~/.openclaw/genome/core/task-store.js` | Add `findLatestTaskByTitle(title)` method (returns most recent task regardless of status) |

> **Note:** These are genome files — not in the `leadflow` repo. The dev agent must modify them in-place. Do NOT copy them to the leadflow repo.

---

## Test Plan (Human Validation)

1. Stojan checks `tasks` table: count of `title = 'Smoke: Vercel dashboard health failing'` created in the last 1 hour after fix deploy should be ≤ 1.
2. Stojan checks `.smoke-test-state.json` after a QC task completes: verify `lastTaskCompleted` field is present and timestamp is recent.
3. Stojan checks that the next heartbeat after QC task completion creates a `Fix:` dev task (not another `Smoke:` QC task).
