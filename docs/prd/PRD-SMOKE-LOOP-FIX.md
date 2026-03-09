# PRD: Fix Smoke Test Task Loop — Vercel Dashboard Health

**PRD ID:** prd-smoke-loop-fix-001  
**Status:** approved  
**Version:** 1.0  
**Created:** 2026-03-24  
**Author:** PM Agent

---

## Problem Statement

The smoke test handler created "Smoke: Vercel dashboard health failing" **39 times in 2 hours**, overwhelming the task queue and consuming significant QC agent capacity. The loop detector caught it and raised this investigation.

Two root causes were identified:

### Root Cause 1: Cooldown Never Fires (Primary Bug)

The `runSmokeTests()` handler in `heartbeat-executor.js` has a 2-hour cooldown mechanism that checks `testState.lastTaskCompleted`. **This field is never populated.** Smoke-tests state only tracks `lastPass`, `lastFail`, and `lastCloudSpawn` — never `lastTaskCompleted`. The cooldown that was designed to prevent re-spawning after a task completes is permanently bypassed.

**Consequence:** Every time a QC task reaches `done` status (even without fixing the underlying issue), the next heartbeat finds no open task, skips the cooldown, and creates another QC task.

### Root Cause 2: Health Endpoint Reports Degraded (Triggering Failure)

The smoke test checks `https://leadflow-ai-five.vercel.app/api/health` with `check_type: json_status_ok`. The endpoint returns:
```json
{"status":"degraded","checks":{"supabase_connectivity":{"ok":false,"detail":"query failed: HTTP 404: {\"error\":\"requested path is invalid\"}"}}}
```

Supabase was fully removed from the LeadFlow project (local PostgreSQL is now used). The health endpoint still includes a Supabase connectivity check, which always fails. This is a **stale health check** — the endpoint is reporting a component that no longer belongs to this architecture.

---

## Scope

Two separate fixes required:

### Fix A — Genome: Track `lastTaskCompleted` in smoke test state  
Location: `~/.openclaw/genome/core/heartbeat-executor.js`  
Scope: When a QC/dev smoke task transitions to `done` or `failed` status, write `lastTaskCompleted` into the smoke-test-state.json so the 2-hour cooldown actually fires.

### Fix B — LeadFlow: Update `/api/health` to reflect current architecture  
Location: `product/lead-response/dashboard/app/api/health/route.ts` (or equivalent)  
Scope: Remove the Supabase connectivity check (or change it to local PostgreSQL). Health endpoint should return `status: ok` when the product is operating correctly.

---

## User Stories

**As the orchestrator,** I want smoke test loops to be impossible — when a QC task for a failing smoke test is completed, the handler must respect the cooldown and not immediately spawn a replacement.

**As Stojan,** I want the Vercel dashboard health check to reflect actual system health — when the product is running correctly, the smoke test should pass.

**As the QC agent,** I want smoke tasks to be non-duplicate — I should never receive two identical smoke investigation tasks for the same test within a 2-hour window.

---

## Acceptance Criteria

### Fix A — Cooldown State Tracking
- [ ] When a QC task titled `Smoke: <name> failing` reaches status `done` or `failed`, the heartbeat executor writes `lastTaskCompleted: <ISO timestamp>` to `state.results[smoke_test_id]` in the smoke-test state file
- [ ] When `lastTaskCompleted` is set and `hoursSince < 2`, no new task is created (log: `⏳ <title> — cooldown (task completed X.Xh ago)`)
- [ ] The loop detector does NOT fire on subsequent heartbeat runs after the fix (i.e., no more duplicate tasks created)
- [ ] Smoke state file at `~/.openclaw/genome/state/leadflow/.smoke-test-state.json` contains `lastTaskCompleted` entries after QC task completion

### Fix B — Health Endpoint
- [ ] `GET https://leadflow-ai-five.vercel.app/api/health` returns `{"status":"ok"}` when the product is operating correctly
- [ ] Supabase connectivity check is removed or replaced with a local PostgreSQL check (or simply removed since the DB is internal)
- [ ] `check_type: json_status_ok` smoke test for `vercel-dashboard` passes after the fix
- [ ] The `vercel-dashboard` smoke test auto-resolves (heartbeat marks open tasks `done` and logs `✅ Auto-resolved: Smoke: Vercel dashboard health failing`)

---

## Technical Notes

### Where to add lastTaskCompleted tracking (Fix A)

The heartbeat-executor's `runSmokeTests()` handles task completion at two points:
1. Auto-resolve pass: when a previously-failing test passes, it closes open tasks. Here, also write `lastTaskCompleted`.
2. The `createTask` for QC creates a task — but `lastTaskCompleted` should be written when that task **completes**, not when it is created.

The simplest approach: after creating a QC/dev task, also track `lastTaskCreated`. Then in the dedup check, add: *if a task with this title was created in the last 2h, skip.* This avoids needing async task completion hooks.

**Recommended implementation (simpler, avoids hooking into task lifecycle):**

In `runSmokeTests()`, after the `findTaskByTitle` dedup, add a secondary check:
```javascript
const lastCreated = testState.lastTaskCreated
if (lastCreated) {
  const hoursSince = (Date.now() - new Date(lastCreated).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 2) {
    console.log(`   ⏳ ${smokeTitle} — task created ${hoursSince.toFixed(1)}h ago, cooldown active`)
    continue
  }
}
```
And when creating a task, set: `state.results[failure.id].lastTaskCreated = new Date().toISOString()`

This is more robust than `lastTaskCompleted` because it doesn't require hooking into task lifecycle events.

### Health Endpoint Fix (Fix B)

File to edit: `product/lead-response/dashboard/app/api/health/route.ts`

Current check (causing failure):
```typescript
supabase_connectivity: { ok: false, detail: 'query failed: HTTP 404: ...' }
```

Fix options:
1. **Remove** the Supabase connectivity check entirely (since Supabase is no longer used)
2. **Replace** with a check against the local PostgreSQL connection (if a health-checkable endpoint exists)
3. **Mark as non-critical**: return `status: ok` even with degraded checks, only flag as `error` for truly critical dependencies

Recommended: Option 1 — remove Supabase check. The product uses local PostgreSQL internally; a public health endpoint does not need to expose internal DB connectivity.

---

## E2E Test Spec

### Test 1: Smoke Loop Prevention
- **Given:** A smoke test is failing
- **When:** The heartbeat spawns a QC task
- **Then:** On the next heartbeat, `findTaskByTitle` returns the open QC task, and no duplicate is created
- **And:** If the QC task completes, `lastTaskCreated` prevents re-spawn for 2 hours

### Test 2: Health Endpoint Returns OK
- **Given:** The Vercel dashboard is deployed and running
- **When:** `GET /api/health` is requested
- **Then:** Response is `{"status":"ok"}` with HTTP 200
- **And:** The `vercel-dashboard` smoke test passes

---

## Affected Projects

- **genome** — Fix A requires changes to `heartbeat-executor.js` 
- **leadflow** — Fix B requires changes to the dashboard health endpoint

---

## Priority

**P0 — Critical.** The loop is actively creating waste (QC agent capacity, task queue noise) and will recur on every heartbeat until fixed.
