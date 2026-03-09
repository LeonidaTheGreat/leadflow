# PRD: Fix Smoke Loop V4 — Vercel Dashboard Health (Fourth Attempt)

**ID:** prd-smoke-loop-fix-v4  
**Status:** approved  
**Author:** Product Manager  
**Date:** 2026-03-24  
**Supersedes:** prd-smoke-loop-fix-v3, prd-fix-smoke-loop-vercel-dashboard  
**Use Case:** uc-smoke-loop-dedup  

---

## ⚠️ WARNING: FOURTH ATTEMPT — Previous Agents Did Not Commit

This fix has been specified 3 times before. Each time, dev agents reported completion with **no_commits_on_branch** — meaning NO code changes were made.

**Do not mark this task done without a git commit hash showing the changes in the genome repo.**

---

## Problem

"Smoke: Vercel dashboard health failing" is created in an infinite loop — 7x in 2 hours as of 2026-03-24. Every heartbeat creates a new QC task. Budget is wasted. Telegram is flooded. No actual fix is ever initiated.

**Evidence from state file** (`~/.openclaw/genome/state/leadflow/.smoke-test-state.json`):
```json
"vercel-dashboard": {
  "lastPass": "2026-03-24T01:40:24.111Z",
  "lastFail": "2026-03-24T13:39:12.164Z",
  "lastCloudSpawn": "2026-03-24T01:42:39.243Z"
  // ← NO lastTaskCompleted
  // ← NO lastTaskCreated
  // ← NO devRetries
}
```

---

## Root Cause (Confirmed via Code Inspection)

### Bug 1: `findTaskByTitle` excludes completed tasks

**File:** `~/.openclaw/genome/core/task-store.js`, method `findTaskByTitle` (~line 227)

```javascript
.not('status', 'in', '("done","failed","cancelled")')
```

When the QC task "Smoke: Vercel dashboard health failing" completes (`status = done`), the next heartbeat calls `findTaskByTitle(smokeTitle)` → returns **null**. The dedup check never fires. The escalation path (which requires `existingSmoke.status === 'done'`) is unreachable because `existingSmoke` is always null.

### Bug 2: `lastTaskCompleted` is never written

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`, smoke handler (~line 2329)

The cooldown relies on `testState.lastTaskCompleted`, which is **never written anywhere** in the codebase. The 2-hour cooldown is permanently non-functional.

### Bug 3: `lastCloudSpawn` not always written on task creation

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`, ~line 2505–2510

`lastCloudSpawn` is only written when: `severity === 'critical' && cloudCooldownExpired && cloudCountToday < 1`. For `vercel-dashboard`, this condition may not always hold, so `lastCloudSpawn` isn't updated when the QC task is created. The cooldown cannot activate.

---

## Required Changes (EXACT CODE CHANGES REQUIRED)

### Change 1: Add `findLatestTaskByTitle()` to `task-store.js`

**File:** `~/.openclaw/genome/core/task-store.js`

After the existing `findTaskByTitle` method, add:

```javascript
async findLatestTaskByTitle(title) {
  // Returns the most recent task with this title, regardless of status
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

> **For local PG (no Supabase):** The task store uses local PG via `LOCAL_PG_URL`. Add a local fallback branch for `useLocalFallback` or use the direct DB query path — whichever path `findTaskByTitle` uses. Mirror its pattern exactly.

### Change 2: Update smoke handler dedup in `heartbeat-executor.js`

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`, ~lines 2317–2320

**Replace:**
```javascript
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
const existingDev = await this.store.findTaskByTitle(devTitle)
if (existingSmoke && !['done', 'failed'].includes(existingSmoke.status)) {
  console.log(`   ⏭️ QC task already open: ${smokeTitle}`)
  continue
}
```

**With:**
```javascript
const existingSmoke = await this.store.findLatestTaskByTitle(smokeTitle)
const existingDev = await this.store.findLatestTaskByTitle(devTitle)
if (existingSmoke && !['done', 'failed', 'cancelled'].includes(existingSmoke.status)) {
  console.log(`   ⏭️ QC task already open: ${smokeTitle}`)
  continue
}
```

### Change 3: Write `lastTaskCreated` to smoke state after creating QC task

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`

After the code that creates the QC task (look for where `this.store.createTask(...)` is called with `smokeTitle`), add:

```javascript
// Write lastTaskCreated to smoke state for dedup/cooldown
state.results[failure.id] = {
  ...state.results[failure.id],
  lastTaskCreated: new Date().toISOString()
}
smokeTests.saveState(state)
```

### Change 4: Update cooldown check to use `lastTaskCreated`

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`, ~line 2329

**Replace:**
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

**With:**
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

---

## Acceptance Criteria

- [ ] **AC-1:** `findLatestTaskByTitle` method exists in `~/.openclaw/genome/core/task-store.js` — verify with `grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/task-store.js`
- [ ] **AC-2:** Smoke handler in `heartbeat-executor.js` calls `findLatestTaskByTitle` (not `findTaskByTitle`) for dedup — verify with `grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/heartbeat-executor.js`
- [ ] **AC-3:** After a QC smoke task is created, `lastTaskCreated` appears in `.smoke-test-state.json` for that test ID — verify by checking the state file after a heartbeat run
- [ ] **AC-4:** Cooldown check uses `lastTaskCompleted || lastTaskCreated` — verify with `grep -n "lastTaskCreated\|lastTaskCompleted" ~/.openclaw/genome/core/heartbeat-executor.js`
- [ ] **AC-5:** 10 consecutive heartbeats with failing `vercel-dashboard` produce AT MOST 1 new QC task (not 10)
- [ ] **AC-6:** Git commit exists in `~/.openclaw/genome/` with these changes — provide commit hash in completion report
- [ ] **AC-7:** `~/.openclaw/genome/state/leadflow/.smoke-test-state.json` shows `lastTaskCreated` for `vercel-dashboard` after next heartbeat

---

## What NOT To Do

- ❌ Do NOT report success without a git commit hash
- ❌ Do NOT create test scripts and leave them unrun
- ❌ Do NOT edit files in `~/projects/leadflow/` — the fix is in `~/.openclaw/genome/`
- ❌ Do NOT add `lastTaskCompleted` writes if there's no mechanism to set them — use `lastTaskCreated` instead
- ❌ Do NOT create a new PRD or spec — implement the fix directly

---

## How to Verify the Fix Works

After making changes:

```bash
# 1. Confirm the method exists
grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/task-store.js

# 2. Confirm heartbeat-executor uses it
grep -n "findLatestTaskByTitle" ~/.openclaw/genome/core/heartbeat-executor.js

# 3. Confirm cooldown uses lastTaskCreated
grep -n "lastTaskCreated" ~/.openclaw/genome/core/heartbeat-executor.js

# 4. Commit in genome repo
cd ~/.openclaw/genome && git add -A && git commit -m "fix: smoke loop — findLatestTaskByTitle + lastTaskCreated cooldown"

# 5. Show the commit hash
cd ~/.openclaw/genome && git log --oneline -1
```

---

## Part 2: Fix the Vercel Health Endpoint (LeadFlow Product)

The `/api/health` endpoint at `https://leadflow-ai-five.vercel.app/api/health` returns:

```json
{
  "status": "degraded",
  "errors": ["supabase_connectivity: query failed: HTTP 404: {\"error\":\"requested path is invalid\"}"]
}
```

**Root cause:** The health endpoint checks Supabase connectivity, but **Supabase has been fully removed** from this project (per CLAUDE.md). The project now uses local PostgreSQL (`LOCAL_PG_URL`). The Supabase connectivity check will always fail on Vercel because there's no valid Supabase endpoint.

**Fix:** Update the health endpoint (`routes/health.js` or equivalent in the LeadFlow codebase) to:
1. Remove the `supabase_connectivity` check
2. Replace with a local PG connectivity check (if the DB is accessible from Vercel) OR remove that check entirely and return `status: ok` when env vars are set
3. The endpoint should NOT check for `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` as required env vars — those are legacy Supabase vars

**Acceptance Criteria for Health Endpoint Fix:**
- [ ] `curl https://leadflow-ai-five.vercel.app/api/health` returns `{"status":"ok",...}` (not "degraded")
- [ ] No `supabase_connectivity` check in the health endpoint
- [ ] Health endpoint committed, pushed, and deployed to Vercel

---

## Affected Projects

- **genome**: Loop prevention fix (`findLatestTaskByTitle` + `lastTaskCreated` cooldown)
- **leadflow**: Health endpoint fix (remove broken Supabase connectivity check)
