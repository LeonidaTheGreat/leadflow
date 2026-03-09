# PRD: Fix Smoke Loop V5 — Vercel Dashboard Health (Fifth Attempt)

**ID:** prd-smoke-loop-fix-v5  
**Status:** approved  
**Author:** Product Manager  
**Date:** 2026-03-24  
**Supersedes:** prd-smoke-loop-fix-v4, prd-smoke-loop-fix-v3, prd-fix-smoke-loop-vercel-dashboard  
**Use Case:** uc-smoke-loop-dedup  

---

## ⚠️ CRITICAL WARNING: FIFTH ATTEMPT — PREVIOUS 4 AGENTS DID NOT COMMIT

This fix has been specified **four times**. Every previous dev agent reported success with **no_commits_on_branch** — meaning **zero code changes were actually made**.

### Why Agents Fail This Task
The genome files live in **`~/.openclaw/genome/`** — a **separate git repository** from `~/projects/leadflow/`. Most agents modify the wrong files, or modify the right files but commit to the wrong repo, or forget to commit entirely.

### Non-Negotiable Delivery Requirements
1. Verify the genome repo path: `ls -la ~/.openclaw/genome/.git`
2. Make the code changes in `~/.openclaw/genome/core/`
3. `cd ~/.openclaw/genome && git add -A && git commit -m "fix: smoke loop dedup - findLatestTaskByTitle + lastTaskCompleted"`
4. Report the **commit hash** in the completion report
5. If `~/.openclaw/genome` is not a git repo: report failure immediately

**DO NOT mark this task done without a commit hash.**

---

## Problem

"Smoke: Vercel dashboard health failing" is created in an infinite loop — **3x in 2h as of this task**. Every heartbeat cycle creates a new QC task. Budget is wasted, Telegram is flooded, and actual fixes are never initiated.

---

## Root Cause (Code-Level, Confirmed)

### Bug 1: `findTaskByTitle` excludes completed tasks

**File:** `~/.openclaw/genome/core/task-store.js`  
**Method:** `findTaskByTitle`

```javascript
// Current (BROKEN) — excludes done/failed/cancelled
.not('status', 'in', '("done","failed","cancelled")')
```

When the QC "Smoke: Vercel dashboard health failing" task completes (`status = done`), the next heartbeat calls `findTaskByTitle(smokeTitle)` → returns **`null`**. 

Result:
- Dedup check: `if (existingSmoke && ...)` → never fires (existingSmoke is null)
- Escalation check: `existingSmoke.status === 'done'` → unreachable (null.status crashes, or code falls through)
- A fresh QC task is created every single heartbeat

### Bug 2: `lastTaskCompleted` is never written

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`  
**Location:** smoke handler (~line 2329)

```javascript
const lastCompleted = testState.lastTaskCompleted  // always undefined
```

There is no code anywhere in the heartbeat that writes `lastTaskCompleted` to `.smoke-test-state.json`. The 2-hour cooldown has never worked.

### Combined Effect

Neither dedup nor cooldown can stop the loop. A new QC task is created at every 5-minute heartbeat for as long as the smoke test is failing. The loop detector in `task-store.js` fires at 3+ tasks and creates this PM investigation task — but the loop continues because the handler bug is unfixed.

---

## Current State of Genome Files

As of this spec, check these before starting:

```bash
# Does findLatestTaskByTitle exist?
grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/task-store.js

# Is lastTaskCompleted ever written?
grep -n "lastTaskCompleted" ~/.openclaw/genome/core/heartbeat-executor.js

# Current smoke state
cat ~/.openclaw/genome/state/leadflow/.smoke-test-state.json | python3 -m json.tool
```

If `findLatestTaskByTitle` already exists: check that it's actually being **called** in the smoke handler. The fix may have been added to task-store.js but the heartbeat-executor.js call was never updated.

---

## Required Changes

### Change 1: Add `findLatestTaskByTitle()` to task-store.js

**File:** `~/.openclaw/genome/core/task-store.js`

Add after the existing `findTaskByTitle` method:

```javascript
async findLatestTaskByTitle(title) {
  // Returns the most recent task with this title, regardless of status
  // Used by smoke handler to detect completed tasks for escalation/cooldown
  if (this.useLocalFallback) {
    const matches = this.localTasks.filter(t => t.title === title)
    return matches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null
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

### Change 2: Update smoke handler in heartbeat-executor.js to use findLatestTaskByTitle

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`  
**Location:** smoke failure handler (search for `const existingSmoke = await this.store.findTaskByTitle`)

Replace:
```javascript
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
const existingDev = await this.store.findTaskByTitle(devTitle)
```

With:
```javascript
const existingSmoke = await (this.store.findLatestTaskByTitle
  ? this.store.findLatestTaskByTitle(smokeTitle)
  : this.store.findTaskByTitle(smokeTitle))
const existingDev = await (this.store.findLatestTaskByTitle
  ? this.store.findLatestTaskByTitle(devTitle)
  : this.store.findTaskByTitle(devTitle))
```

> Note: the null-safe pattern (checking `findLatestTaskByTitle` exists before calling) prevents regression if the state file gets swapped. But both changes must be deployed together.

### Change 3: Write `lastTaskCompleted` when smoke task is created

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`  
**Location:** After the QC smoke task is successfully created (look for `await this.store.createTask(...)` inside the smoke failure handler)

After each successful `createTask` call for a smoke QC task, write to state:

```javascript
// Persist task creation timestamp to enable cooldown
state.results[failure.id] = {
  ...(state.results[failure.id] || {}),
  lastTaskCreated: new Date().toISOString()
}
smokeTests.saveState(state)
```

Then update the cooldown check (around line 2329) to also check `lastTaskCreated`:

```javascript
// Cooldown: if a smoke task was recently created or completed, skip
const lastCompleted = testState.lastTaskCompleted
const lastCreated = testState.lastTaskCreated
const cooldownAnchor = lastCompleted || lastCreated
if (cooldownAnchor) {
  const hoursSince = (Date.now() - new Date(cooldownAnchor).getTime()) / (1000 * 60 * 60)
  if (hoursSince < 2) {
    console.log(`   ⏳ ${smokeTitle} — cooldown (${hoursSince.toFixed(1)}h since last task)`)
    continue
  }
}
```

> This fallback (using `lastTaskCreated` when `lastTaskCompleted` is unavailable) stops the loop even if the task completion writer isn't in place yet.

---

## Acceptance Criteria

1. **No loop recurrence:** With the smoke test failing, running 5 consecutive heartbeats creates at most **1** QC task. The `lastTaskCreated` cooldown prevents additional tasks from being spawned within 2 hours.

2. **Escalation path reached:** After the QC task status = `done`, the next heartbeat creates a `Fix: Vercel dashboard health (smoke)` dev task — not another `Smoke:` QC task.

3. **State file updated:** After a QC smoke task is created, inspect `.smoke-test-state.json` — `lastTaskCreated` (or `lastTaskCompleted`) must be present for `vercel-dashboard`.

4. **No duplicate open tasks:** Query `SELECT id, title, status FROM tasks WHERE title ILIKE 'Smoke: Vercel%' AND status IN ('ready','running','spawned') ORDER BY created_at DESC` → returns at most 1 row.

5. **Commit exists in genome repo:** `cd ~/.openclaw/genome && git log --oneline -3` shows a commit with these changes.

---

## Verification Steps (Dev Agent Must Run These)

```bash
# 1. Confirm genome is a git repo
ls -la ~/.openclaw/genome/.git

# 2. Confirm changes are in place
grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/task-store.js
grep -n "findLatestTaskByTitle\|lastTaskCreated" ~/.openclaw/genome/core/heartbeat-executor.js

# 3. Commit
cd ~/.openclaw/genome
git diff --stat  # must show changes
git add core/task-store.js core/heartbeat-executor.js
git commit -m "fix: smoke loop dedup - findLatestTaskByTitle + lastTaskCreated cooldown"
git log --oneline -1  # paste this hash in completion report

# 4. Check current smoke state
cat ~/.openclaw/genome/state/leadflow/.smoke-test-state.json

# 5. Cancel any lingering open smoke tasks
node -e "
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('tasks')
  .update({ status: 'cancelled' })
  .eq('project_id', 'leadflow')
  .ilike('title', 'Smoke: Vercel dashboard health%')
  .in('status', ['ready', 'spawned'])
  .then(r => console.log('Cancelled:', r))
  .catch(console.error);
"
```

---

## Out of Scope

- Fixing the underlying Vercel dashboard health failure (separate task)
- Changes to smoke test definitions or health check URLs
- Modifying the leadflow repo (`~/projects/leadflow/`)
- Changes to heartbeat scheduling

---

## Files to Modify

| File | Repository | Change |
|------|-----------|--------|
| `~/.openclaw/genome/core/task-store.js` | genome (NOT leadflow) | Add `findLatestTaskByTitle()` method |
| `~/.openclaw/genome/core/heartbeat-executor.js` | genome (NOT leadflow) | Use `findLatestTaskByTitle`, write `lastTaskCreated` to state |

---

## History

| Version | Date | Outcome |
|---------|------|---------|
| V1 (prd-fix-smoke-loop-vercel-dashboard) | 2026-03-24 | no_commits_on_branch |
| V2 (prd-smoke-loop-fix-001) | 2026-03-24 | no_commits_on_branch |
| V3 (prd-smoke-loop-fix-v3) | 2026-03-24 | no_commits_on_branch |
| V4 (prd-smoke-loop-fix-v4) | 2026-03-24 | no_commits_on_branch |
| **V5 (this document)** | 2026-03-24 | Pending |
