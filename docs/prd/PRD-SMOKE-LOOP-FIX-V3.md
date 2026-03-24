# PRD: Fix Smoke Loop V3 — `findLatestTaskByTitle` + `lastTaskCreated` Cooldown

**ID:** prd-smoke-loop-fix-v3  
**Status:** approved  
**Author:** Product Manager  
**Date:** 2026-03-24  
**Supersedes:** prd-fix-smoke-loop-vercel-dashboard, prd-smoke-loop-fix-001  
**Affected Files:**
- `~/.openclaw/genome/core/task-store.js`
- `~/.openclaw/genome/core/heartbeat-executor.js`

---

## Problem Statement

The smoke loop for "Vercel dashboard health failing" has been created 15x in 2 hours (task 0ac12eac). This is a **recurring failure** — PRDs were written, fix tasks were spawned, but dev agents completed tasks with **no_commits_on_branch** (no code changes made). The loop persists.

The root cause is in the genome orchestrator, not the LeadFlow product code.

---

## Root Cause Analysis (Confirmed by Code Inspection)

### Bug 1: `findTaskByTitle` filters out completed tasks

**File:** `~/.openclaw/genome/core/task-store.js`, line 227–242

```javascript
async findTaskByTitle(title) {
  // ...
  .not('status', 'in', '("done","failed","cancelled")')  // ← EXCLUDES COMPLETED TASKS
  // ...
}
```

**Impact:** When a QC task for `"Smoke: Vercel dashboard health failing"` completes (`status = done`), the next heartbeat calls `findTaskByTitle(smokeTitle)` and gets **null** — as if no task ever existed.

### Bug 2: Escalation checks are unreachable

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`, lines 2317–2460

The escalation logic:
```javascript
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)  // returns null for done tasks
const existingDev   = await this.store.findTaskByTitle(devTitle)    // returns null for done tasks

// Dedup (line 2319): skips if existingSmoke is open — but existingSmoke is null, so NEVER skips
// Escalation (line 2439): requires existingSmoke.status === 'done' — but existingSmoke is null, UNREACHABLE
// Falls through to "First failure" → creates another QC task every heartbeat ∞
```

### Bug 3: `lastTaskCompleted` is never written

**File:** `~/.openclaw/genome/core/heartbeat-executor.js` — smoke handler and auto-resolve section

The cooldown check (line 2329) relies on `testState.lastTaskCompleted`:
```javascript
const lastCompleted = testState.lastTaskCompleted  // ← ALWAYS undefined
if (lastCompleted) { /* hoursSince < 2 → skip */ }  // ← never fires
```

There is NO code in the heartbeat that writes `lastTaskCompleted` to `.smoke-test-state.json`. The cooldown is permanently non-functional.

**Confirmed Evidence:** `~/.openclaw/genome/state/leadflow/.smoke-test-state.json` shows:
```json
"vercel-dashboard": {
  "lastPass": "2026-03-24T01:40:24.111Z",
  "lastFail": "2026-03-24T13:17:10.494Z",
  "lastCloudSpawn": "2026-03-24T01:42:39.243Z"
  // NO lastTaskCompleted field
  // NO devRetries field
  // NO totalCost field
}
```

---

## Required Changes

### Change 1: Add `findLatestTaskByTitle(title)` to `task-store.js`

Add this method immediately after `findTaskByTitle` (after line 242):

```javascript
/**
 * Find the most recently created task with this title, regardless of status.
 * Used by smoke handler to detect completed tasks for escalation logic.
 */
async findLatestTaskByTitle(title) {
  if (this.useLocalFallback) {
    const matches = this.localTasks.filter(t => t.title === title)
    if (!matches.length) return null
    return matches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
  }

  const { data, error } = await this.supabase
    .from('tasks')
    .select('*')
    .eq('title', title)
    .eq('project_id', this.projectId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}
```

### Change 2: Replace `findTaskByTitle` with `findLatestTaskByTitle` in smoke handler

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`, lines 2317–2318

**Before:**
```javascript
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
const existingDev = await this.store.findTaskByTitle(devTitle)
```

**After:**
```javascript
const existingSmoke = await this.store.findLatestTaskByTitle(smokeTitle)
const existingDev = await this.store.findLatestTaskByTitle(devTitle)
```

**Only change these two lines in the smoke handler** (around line 2317). Do NOT change other uses of `findTaskByTitle` elsewhere in the file — those are for different use cases (escalation of open tasks, spec tasks, etc.) and should remain as-is.

### Change 3: Write `lastTaskCreated` when spawning smoke tasks

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`

After the line that creates the initial QC task (`await this.store.createTask({ title: smokeTitle, ... })`), add state update:

```javascript
// After creating QC task:
state.results[failure.id] = {
  ...testState,
  lastTaskCreated: new Date().toISOString()
}
smokeTests.saveState(state)
```

Then update the cooldown check to use EITHER `lastTaskCompleted` OR `lastTaskCreated`:

**Before (line ~2329):**
```javascript
const lastCompleted = testState.lastTaskCompleted
if (lastCompleted) {
  const hoursSince = (Date.now() - new Date(lastCompleted).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 2) {
    console.log(`   ⏳ ${smokeTitle} — cooldown (task completed ${hoursSince.toFixed(1)}h ago)`)
    continue
  }
}
```

**After:**
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

This means: even if `lastTaskCompleted` is never populated, the cooldown still fires based on when the task was CREATED.

---

## Why Previous Fix Attempts Failed

Previous PM tasks wrote PRDs. Previous dev tasks were spawned. But all completed with **no commits on branch** — the genome files were never actually modified.

**Likely causes:**
1. Dev agents read the PRD but couldn't find the exact lines to change
2. Agents created scripts rather than directly editing genome files
3. Agents forgot to verify that changes took effect

**This PRD provides:**
- Exact file paths (absolute)
- Exact line numbers
- Exact before/after code snippets
- Explicit verification steps

---

## Verification Steps (Dev Agent Must Execute)

```bash
# 1. Verify the method was added to task-store.js
grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/task-store.js

# 2. Verify the smoke handler now uses findLatestTaskByTitle
grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/heartbeat-executor.js

# 3. Verify lastTaskCreated is written after smoke task creation
grep -n "lastTaskCreated" ~/.openclaw/genome/core/heartbeat-executor.js

# 4. Verify cooldown check uses lastTaskCreated as fallback
grep -n "lastTaskCreated\|lastActivity" ~/.openclaw/genome/core/heartbeat-executor.js
```

**All four commands must return matches. If any returns empty, the fix is incomplete.**

---

## Acceptance Criteria

1. **No loop recurrence:** With `vercel-dashboard` smoke test failing, 10 consecutive heartbeats must create AT MOST 1 QC task. The cooldown (via `lastTaskCreated`) must halt creation from the 2nd heartbeat onward.

2. **Escalation path reached:** After the QC task completes (`status = done`), the NEXT heartbeat must create a `Fix: Vercel dashboard health (smoke)` dev task — not another QC task. This verifies `findLatestTaskByTitle` correctly reads the completed QC task.

3. **`lastTaskCreated` populated:** After a new QC task is spawned, verify `~/.openclaw/genome/state/leadflow/.smoke-test-state.json` contains `lastTaskCreated` timestamp for `vercel-dashboard`.

4. **Cooldown functional:** Within 2h of task creation, a second heartbeat with the same failing test must skip task creation and log `⏳ ... cooldown`.

5. **No new loop tasks in Supabase:** Query `tasks` table for `title = 'Smoke: Vercel dashboard health failing'` with `status IN ('ready','running','spawned')` — must return at most 1 row.

---

## Out of Scope

- Fixing the underlying `vercel-dashboard` health endpoint failure (separate; handled by QC/dev escalation once the loop is fixed)
- Changes to smoke test definitions
- LeadFlow product code changes

---

## Test Plan (Human Validation by Stojan)

1. After fix is deployed, check `.smoke-test-state.json` for `lastTaskCreated` field in `vercel-dashboard` entry
2. Wait for next 2 heartbeats and verify Supabase `tasks` table has no new `Smoke: Vercel dashboard health failing` entries
3. After cooldown expires (2h), verify the NEXT task created is a `Fix:` dev task (escalation), not another `Smoke:` QC task
