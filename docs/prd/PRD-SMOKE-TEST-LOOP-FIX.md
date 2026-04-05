---
id: prd-smoke-test-loop-fix
title: Fix Smoke Test Fix-Task Loop (Missing lastTaskCreated State Update)
status: approved
version: 1.0
created: 2026-04-04
---

# PRD: Fix Smoke Test Fix-Task Loop

## Problem

The smoke test handler in `~/.openclaw/genome/core/heartbeat-executor.js` creates duplicate "Fix: {name} (smoke)" dev tasks in a loop when a smoke test keeps failing across heartbeats.

**Observed:** "Fix: Lead Experience Simulator (smoke)" created 3× in 2 hours.

## Root Cause

Two code paths that create dev fix tasks **fail to update `state.results[failure.id].lastTaskCreated`** after creating the task. This means the 2-hour cooldown guard in the next heartbeat sees a stale (or null) `lastActivity` value and allows a new task to be created.

### Affected Code Paths

| Path | Where | Missing Update |
|------|-------|----------------|
| QC→Dev escalation | `heartbeat-executor.js` ~line 2849 | `lastTaskCreated` not set after creating dev task |
| Dev→Dev retry | `heartbeat-executor.js` ~line 2781–2786 | `lastTaskCreated` not set after creating retry dev task |

The **initial QC failure path** (~line 2933) correctly sets `lastTaskCreated` — it is not affected.

### Why Dedup Fails

1. `findTaskByTitle()` in task-store.js filters out `done/failed/cancelled` tasks
2. When a dev fix task completes (`done`), it is excluded from the active-task check
3. The smoke test still fails → next heartbeat evaluates the cooldown
4. Cooldown check uses `testState.lastTaskCompleted || testState.lastTaskCreated`
5. `lastTaskCreated` is stale/null → cooldown passes → new task created
6. Repeat each heartbeat → loop

## Fix Specification

### File: `~/.openclaw/genome/core/heartbeat-executor.js`

**Change 1 — QC→Dev escalation path (~line 2849):**

After creating the dev task and updating state with `devRetries`, add:
```javascript
state.results[failure.id] = {
  ...testState,
  devRetries: 1,
  lastTaskCreated: new Date().toISOString()   // ADD THIS
}
smokeTests.saveState(state)
```

**Change 2 — Dev→Dev retry path (~line 2781–2786):**

After creating the retry dev task and updating state with `devRetries` and `totalCost`, add:
```javascript
state.results[failure.id] = {
  ...testState,
  devRetries: retryCount + 1,
  totalCost: (testState.totalCost || 0) + modelCost,
  lastTaskCreated: new Date().toISOString()   // ADD THIS
}
smokeTests.saveState(state)
```

### Secondary Hardening (Optional, P3)

Add a title-based dedup check inside the smoke handler itself (before calling `createTask`) that queries for any active task with the same title regardless of status age:

```javascript
const recentDup = await taskStore.findRecentTaskByTitle(title, { withinHours: 2, includeStatuses: ['done', 'failed'] })
if (recentDup && (Date.now() - new Date(recentDup.updated_at)) < 2 * 3600 * 1000) {
  log(`[Smoke] Skipping — task completed recently: ${recentDup.id}`)
  continue
}
```

This adds defense-in-depth but is not required for the primary fix.

## Acceptance Criteria

1. After a smoke test fix task completes (`done`), the next heartbeat does NOT create a new fix task for the same smoke test within 2 hours.
2. The state file (`.smoke-test-state.json`) has `lastTaskCreated` updated immediately after each dev fix task creation in both the QC→Dev and Dev→Dev code paths.
3. Existing behavior: if the fix task fails and the smoke test is still failing after 2 hours, a new fix task CAN be created (retry still works).
4. The initial QC failure path is not modified and continues to work as before.

## Machine-Verifiable Checks

```json
[
  {
    "id": "escalation-path-has-lastTaskCreated",
    "command": "grep -A5 'devRetries: 1' ~/.openclaw/genome/core/heartbeat-executor.js | grep -c 'lastTaskCreated'",
    "expected": "1"
  },
  {
    "id": "retry-path-has-lastTaskCreated",
    "command": "grep -A8 'devRetries: retryCount' ~/.openclaw/genome/core/heartbeat-executor.js | grep -c 'lastTaskCreated'",
    "expected": "1"
  }
]
```

## Priority

**P4 (Maintenance)** — Does not block users. Does waste budget (duplicate dev tasks) and pollutes the task queue. Fix is straightforward.

## Project

- **Affected file:** `~/.openclaw/genome/core/heartbeat-executor.js` (genome project)
- **affectedProjects:** `["genome"]`
