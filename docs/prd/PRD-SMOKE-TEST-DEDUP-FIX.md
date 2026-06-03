# PRD: Smoke Test Fix Task Deduplication

**ID:** prd-smoke-dedup-fix  
**Status:** approved  
**Author:** Product Manager  
**Date:** 2026-04-04  
**Supersedes:** prd-smoke-loop-fix-v5, prd-smoke-loop-fix-v4, prd-smoke-loop-fix-v3, prd-fix-smoke-loop-vercel-dashboard  
**Use Case:** uc-smoke-dedup-fix  

---

## Background

This is the sixth specification for fixing the smoke test task duplication loop. Previous specs (V1–V5) identified and specified fixes. The V5 fixes were implemented: `findLatestTaskByTitle` exists in `task-store.js` and IS being called in `heartbeat-executor.js`. Yet the loop recurs.

**As of 2026-04-04, `Fix: Vercel dashboard health (smoke)` was created 11 times in one day** — including 3 times within 5 minutes (22:43, 22:45, 22:48 EST).

---

## Problem Statement

The smoke test orchestration handler in `~/projects/genome/core/heartbeat-executor.js` creates duplicate fix tasks for the same failing smoke test across multiple heartbeat cycles. The previous dedup fixes (V5) resolved the QC task loop, but the dev fix task loop remains broken due to three new gaps in the escalation paths.

---

## Root Cause Analysis

### Evidence

```sql
SELECT title, status, created_at FROM tasks
WHERE title = 'Fix: Vercel dashboard health (smoke)'
ORDER BY created_at DESC LIMIT 11;
-- Returns 11 rows, all status=done, spanning 2026-04-04 11:36 → 22:48
-- Three created within 5 minutes: 22:43, 22:45, 22:48
```

State file at time of investigation (`~/projects/genome/state/leadflow/.smoke-test-state.json`):
```json
"vercel-dashboard": {
  "lastPass": "2026-04-05T03:03:27.932Z",
  "lastFail": "2026-04-05T03:03:27.932Z",
  "lastCloudSpawn": "2026-03-24T01:42:39.243Z",
  "lastTaskCreated": "2026-03-25T00:03:10.036Z",  // ← STALE: 10 days ago
  "devRetries": 1,
  "totalCost": 0
}
```

The `lastTaskCreated` is from March 25 — 10 days stale. This means the "hard cap: max 1 task per day" guard never fires because it checks `lastTaskCreated.startsWith(today)` and the date is ancient.

### Bug 1: Escalation paths do not update `lastTaskCreated` in state file

**File:** `~/projects/genome/core/heartbeat-executor.js`

The "daily hard cap" guard (line ~2726) checks `testState.lastTaskCreated`:
```javascript
const today = new Date().toISOString().split('T')[0]
const lastCreated = testState.lastTaskCreated
if (lastCreated && lastCreated.startsWith(today)) {
  console.log(`   🛑 ${smokeTitle} — already created task today (${lastCreated.slice(11,16)}), skipping`)
  continue
}
```

However, `lastTaskCreated` is only updated in **one** path — the QC initial creation at the very bottom (line ~2933):
```javascript
state.results[failure.id] = { ...testState, lastTaskCreated: new Date().toISOString() }
smokeTests.saveState(state)
```

The two **escalation paths** (QC-done → first dev task, and dev-done → retry dev task) do NOT update `lastTaskCreated`. This means after any escalation, `lastTaskCreated` remains the date of the original QC task creation — potentially days or weeks ago. On the next heartbeat, the daily cap check passes, and another escalation runs.

**Affected locations:**
- Dev retry escalation (line ~2781): updates `devRetries` and `totalCost` but NOT `lastTaskCreated`
- QC-done-to-dev escalation (line ~2849): sets `devRetries: 1` but NOT `lastTaskCreated`

### Bug 2: Auto-resolve wipes `devRetries` but not `lastTaskCompleted`, enabling rapid re-escalation

**File:** `~/projects/genome/core/heartbeat-executor.js`

The auto-resolve path (line ~2956) resets retry counters when smoke tests pass:
```javascript
if (passState && (passState.devRetries || passState.lastCircuitBreakerAlert || passState.totalCost)) {
  state.results[pass.id] = { 
    ...passState, 
    devRetries: 0, 
    totalCost: 0, 
    lastCircuitBreakerAlert: null 
  }
  smokeTests.saveState(state)
}
```

This correctly resets `devRetries` when the test passes. However, when the smoke test is **flapping** (intermittently passing and failing within the same session), the auto-resolve fires mid-heartbeat:

1. Heartbeat starts: smoke test fails
2. Handler creates dev fix task (task A)
3. Auto-resolve fires in same heartbeat (test showed as passing in another check): marks task A as `done`
4. Next heartbeat: `findLatestTaskByTitle(devTitle)` returns task A with status `done`
5. Escalation path fires: `existingDev.status === 'done'` → creates task B immediately
6. `lastTaskCreated` is stale → no daily cap check fires
7. Repeat every 5 minutes

The core issue is that auto-resolve does NOT update `lastTaskCompleted` in the state file, so the 2-hour cooldown at line 2713 never activates.

### Bug 3: Cooldown check (line ~2713) is bypassed by escalation paths

The 2-hour cooldown check fires before the escalation branching logic:
```javascript
const lastActivity = testState.lastTaskCompleted || testState.lastTaskCreated
if (lastActivity) {
  const hoursSince = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 2) {
    console.log(`   ⏳ ${smokeTitle} — cooldown (last activity ${hoursSince.toFixed(1)}h ago)`)
    continue
  }
}
```

But `lastTaskCompleted` is **never written anywhere** in the smoke handler. And `lastTaskCreated` is only written in the QC initial creation path — not in the escalation paths. So for any task created via escalation, `lastActivity` resolves to the stale QC creation date (potentially weeks old), and the 2-hour cooldown never fires.

### Combined Effect

```
Heartbeat N:   smoke fails → existingDev is done → escalation → creates new dev task
                             state.lastTaskCreated = (stale, weeks ago)
Heartbeat N+1: smoke fails → existingDev is done → daily cap check: lastTaskCreated doesn't start with today → PASSES
                                                  → cooldown check: lastActivity = stale date → PASSES
                                                  → escalation fires again → creates another dev task
Heartbeat N+2: same as N+1
... infinite loop, every 5 minutes
```

---

## Required Changes

**All changes are in `~/projects/genome/` — a separate git repo from `~/projects/leadflow`.**

### Change 1: Update `lastTaskCreated` in ALL task creation paths (not just QC initial)

**File:** `~/projects/genome/core/heartbeat-executor.js`

After EVERY `await this.store.createTask(...)` call in the smoke handler, update `lastTaskCreated` in the state file. There are three such calls:

**Path A — Dev retry (line ~2812):**
```javascript
// After: await this.store.createTask({ title: devTitle, ... })
// Currently updates devRetries but NOT lastTaskCreated
// ADD:
state.results[failure.id] = {
  ...state.results[failure.id],
  lastTaskCreated: new Date().toISOString()
}
smokeTests.saveState(state)
```

**Path B — QC-done to first dev (line ~2873):**
```javascript
// After: await this.store.createTask({ title: devTitle, ... })
// Currently sets devRetries: 1 but NOT lastTaskCreated
// ADD:
state.results[failure.id] = {
  ...state.results[failure.id],
  lastTaskCreated: new Date().toISOString()
}
smokeTests.saveState(state)
```

**Path C — QC initial creation (line ~2933, already correct):**
```javascript
// This path already writes lastTaskCreated. No change needed here.
state.results[failure.id] = { ...testState, lastTaskCreated: new Date().toISOString() }
smokeTests.saveState(state)
```

### Change 2: Write `lastTaskCompleted` when auto-resolve fires

**File:** `~/projects/genome/core/heartbeat-executor.js`

In the auto-resolve block (line ~2956), also write `lastTaskCompleted` to the state file so the 2-hour cooldown activates:

```javascript
// Current code:
if (passState && (passState.devRetries || passState.lastCircuitBreakerAlert || passState.totalCost)) {
  state.results[pass.id] = { ...passState, devRetries: 0, totalCost: 0, lastCircuitBreakerAlert: null }
  smokeTests.saveState(state)
  console.log(`   🔄 Reset retry counter for ${pass.id}`)
}
```

Replace with:
```javascript
// ALWAYS write lastTaskCompleted when a test passes and had open tasks
// (not just when there were retries to reset)
const nowIso = new Date().toISOString()
state.results[pass.id] = {
  ...passState,
  devRetries: 0,
  totalCost: 0,
  lastCircuitBreakerAlert: null,
  lastTaskCompleted: nowIso  // enables 2-hour cooldown on next failure
}
smokeTests.saveState(state)
console.log(`   🔄 Reset retry counter for ${pass.id}, lastTaskCompleted=${nowIso}`)
```

Note: This block should fire unconditionally when a task is auto-resolved (not just when counters need resetting). The condition `passState && (passState.devRetries || ...)` should also include `passState` existing at all, to ensure we always record completion.

### Change 3: Verify the daily cap check uses `lastTaskCreated` correctly

**File:** `~/projects/genome/core/heartbeat-executor.js`

The daily cap check (line ~2726) is correct in logic but depends on `lastTaskCreated` being fresh. With Change 1 in place, this guard will now correctly fire after any escalation. No code change needed here, but verify after testing.

---

## Verification Steps

```bash
# 1. Confirm genome is a git repo
ls -la ~/projects/genome/.git

# 2. Check current state of state file
cat ~/projects/genome/state/leadflow/.smoke-test-state.json | python3 -m json.tool

# 3. After making changes, confirm the writes exist
grep -n "lastTaskCreated\|lastTaskCompleted" ~/projects/genome/core/heartbeat-executor.js

# 4. Verify ALL three task creation paths update lastTaskCreated
grep -n -A5 "createTask.*devTitle\|createTask.*smokeTitle" ~/projects/genome/core/heartbeat-executor.js | grep -A3 "lastTaskCreated\|saveState"

# 5. Commit to genome repo
cd ~/projects/genome
git diff --stat  # must show heartbeat-executor.js changed
git add core/heartbeat-executor.js
git commit -m "fix: smoke loop dedup - update lastTaskCreated in all escalation paths + lastTaskCompleted on auto-resolve"
git log --oneline -1  # paste commit hash in completion report

# 6. Manually update stale state to prevent immediate re-loop
node -e "
const fs = require('fs');
const path = '~/projects/genome/state/leadflow/.smoke-test-state.json'.replace('~', process.env.HOME);
const state = JSON.parse(fs.readFileSync(path, 'utf-8'));
const now = new Date().toISOString();
for (const [id, s] of Object.entries(state.results)) {
  state.results[id] = { ...s, lastTaskCreated: now, lastTaskCompleted: now };
}
fs.writeFileSync(path, JSON.stringify(state, null, 2));
console.log('State reset to now:', now);
"
```

---

## Acceptance Criteria

1. **No new loop:** After the fix is deployed, `Fix: Vercel dashboard health (smoke)` is NOT created more than once per day while the smoke test is failing continuously.

2. **Cooldown respected:** If a dev fix task was created in the last 2 hours (via any path — initial, escalation, or auto-resolve), the handler skips the smoke test on the next heartbeat and logs "cooldown (X.Xh ago)".

3. **Daily cap respected:** At most one dev fix task per smoke test per calendar day. Subsequent failures within the same day log "already created task today" and skip.

4. **State file updated after escalation:** After any smoke-related `createTask` call, `.smoke-test-state.json` shows `lastTaskCreated` set to today's date.

5. **Auto-resolve writes lastTaskCompleted:** When a smoke test passes and has existing open tasks that get auto-resolved, the state file's `lastTaskCompleted` is updated.

6. **Commit exists in genome repo:** `cd ~/projects/genome && git log --oneline -5` shows a commit with these changes from today.

7. **No duplicate open tasks:** At no point should there be more than 1 active (ready/spawned/in_progress) task for the same smoke test title.

---

## Non-Goals

- Do not change the smoke test runner logic or test definitions
- Do not change `findLatestTaskByTitle` — it is working correctly
- Do not change the circuit breaker or retry ladder logic
- Do not change the QC escalation ladder logic — only fix the state file writes

---

## Notes for Dev Agent

1. **This is a genome fix.** All changes go in `~/projects/genome/core/heartbeat-executor.js`. The `~/projects/leadflow/` repo does not need changes.

2. **The genome is a separate git repo.** Commit with `cd ~/projects/genome && git add ... && git commit`.

3. **Check the genome git status first:** `cd ~/projects/genome && git status`. If there are unstaged changes from previous attempts, stash or review them before making new changes.

4. **Do not mark done without a commit hash.** The previous V5 fix was only committed after 5 attempts precisely because agents forgot to commit to the genome repo.

5. **Manually reset the stale state file** (step 6 in verification above) to prevent the loop from triggering again before the next heartbeat.
