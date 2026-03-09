# PRD: Fix Smoke Test Task Loop — Vercel Dashboard Health

**PRD ID:** prd-smoke-loop-fix-vercel-dashboard  
**Status:** approved  
**Priority:** P0 — Critical  
**Date:** 2026-03-24 (updated after second investigation)  
**Author:** PM Agent

---

## Problem Statement

The orchestrator's smoke test handler is creating the same QC task ("Smoke: Vercel dashboard health failing") on **every heartbeat cycle (~every 2–5 minutes)**, producing **141 duplicate tasks** total. This wastes agent budget, floods the task queue, and prevents the actual dashboard fix from being escalated to a dev agent.

The loop has been confirmed to re-occur: original investigation created ~45 tasks, second investigation found 141 total (140 done, 1 in_progress). The PRD was approved but the genome engine fix was never implemented as a dev task.

---

## Root Cause Analysis

### Bug 1 (Primary): `findTaskByTitle` filters out completed tasks — escalation never triggers

`task-store.js > findTaskByTitle()` explicitly excludes completed tasks:

```sql
NOT status IN ('done', 'failed', 'cancelled')
```

The smoke dedup logic in `heartbeat-executor.js > runSmokeTests()` checks:

```javascript
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
// existingSmoke is ALWAYS null for done tasks → falls through every time
if (existingSmoke && existingSmoke.status === 'done') {
  // escalate to dev  ← NEVER REACHED
}
// First failure: create QC investigation task  ← RUNS EVERY HEARTBEAT
```

Because `findTaskByTitle` never returns done/failed tasks, the escalation block (QC done → dev task) is **unreachable**. Every heartbeat falls through to "First failure: create QC investigation task."

### Bug 2 (Contributing): `lastTaskCompleted` never written to smoke state

The 2-hour cooldown guard:
```javascript
const lastCompleted = testState.lastTaskCompleted
if (lastCompleted && hoursSince < 2) continue  // ← never fires
```

`lastTaskCompleted` is read but **never set anywhere in the codebase**. The cooldown never triggers.

### Bug 3: Actual `vercel-dashboard` health endpoint failure

The underlying smoke test is genuinely failing. Response from `https://leadflow-ai-five.vercel.app/api/health`:

```json
{
  "status": "degraded",
  "errors": ["supabase_connectivity: query failed: HTTP 404: {\"error\":\"requested path is invalid\"}"]
}
```

Root cause: The Vercel dashboard `/api/health` endpoint still tries to connect to Supabase, but **Supabase has been fully removed from LeadFlow** (database migrated to local PostgreSQL). The health check is hitting an invalid Supabase path.

### Combined Effect

1. `vercel-dashboard` smoke test fails → should create QC task (AC: investigate)  
2. QC task runs, marks done (can't actually fix deployment)  
3. Next heartbeat: `findTaskByTitle` returns null (task is done, filtered out)  
4. No cooldown (lastTaskCompleted never set)  
5. Falls through to "First failure: create QC investigation task"  
6. → Repeat every heartbeat ♾️

---

## Required Changes

### Part 1: Fix Genome Engine Loop Bug

**Files:** `~/.openclaw/genome/core/task-store.js`, `~/.openclaw/genome/core/heartbeat-executor.js`

#### 1A — Add `findTaskByTitleAny` method to task-store.js

```javascript
async findTaskByTitleAny(title) {
  // Returns the most recent task regardless of status (for smoke dedup + escalation)
  if (this.useLocalFallback) {
    const tasks = this.localTasks
      .filter(t => t.title === title)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return tasks[0] || null
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

**Constraint:** Do NOT change `findTaskByTitle` — it is correctly used elsewhere.

#### 1B — Replace `findTaskByTitle` with `findTaskByTitleAny` in `runSmokeTests()`

In `heartbeat-executor.js > runSmokeTests()`, replace:
```javascript
const existingSmoke = await this.store.findTaskByTitle(smokeTitle)
const existingDev   = await this.store.findTaskByTitle(devTitle)
```
with:
```javascript
const existingSmoke = await this.store.findTaskByTitleAny(smokeTitle)
const existingDev   = await this.store.findTaskByTitleAny(devTitle)
```

#### 1C — Fix cooldown to use task completion timestamps

Replace the broken `lastTaskCompleted` cooldown with:

```javascript
// Cooldown: skip if QC or Dev completed recently (< 2h)
const SMOKE_COOLDOWN_HOURS = 2
const completedStatuses = ['done', 'failed', 'cancelled']

if (existingSmoke && completedStatuses.includes(existingSmoke.status)) {
  const completedAt = existingSmoke.completed_at || existingSmoke.updated_at
  if (completedAt) {
    const hoursSince = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60)
    if (hoursSince < SMOKE_COOLDOWN_HOURS) {
      console.log(`   ⏳ ${smokeTitle} — cooldown (${hoursSince.toFixed(1)}h ago, cooling for ${SMOKE_COOLDOWN_HOURS}h)`)
      continue
    }
  }
}
if (existingDev && completedStatuses.includes(existingDev.status)) {
  const completedAt = existingDev.completed_at || existingDev.updated_at
  if (completedAt) {
    const hoursSince = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60)
    if (hoursSince < SMOKE_COOLDOWN_HOURS) {
      console.log(`   ⏳ ${devTitle} — cooldown (${hoursSince.toFixed(1)}h ago)`)
      continue
    }
  }
}
```

**Note:** If `tasks` table does not have a `completed_at` column, use `updated_at` as a proxy. Check schema before implementing.

#### 1D — Ensure dedup guard uses correct status check

After switching to `findTaskByTitleAny`, the dedup guard becomes:
```javascript
if (existingSmoke && !['done', 'failed', 'cancelled'].includes(existingSmoke.status)) {
  console.log(`   ⏭️ QC task already open: ${smokeTitle}`)
  continue
}
if (existingDev && !['done', 'failed', 'cancelled'].includes(existingDev.status)) {
  console.log(`   ⏭️ Dev task already open: ${devTitle}`)
  continue
}
```

#### 1E — Reset `vercel-dashboard` state in smoke-test-state.json

After deploying the fix, reset the `vercel-dashboard` entry in `.smoke-test-state.json`:
```json
"vercel-dashboard": {
  "devRetries": 0,
  "totalCost": 0,
  "lastCloudSpawn": null,
  "lastCircuitBreakerAlert": null
}
```

This gives the escalation ladder a clean slate.

---

### Part 2: Fix the Underlying Vercel Dashboard Health Endpoint

**Files:** LeadFlow Vercel deployment — `/api/health` route

**Problem:** Health endpoint checks Supabase connectivity, but Supabase has been removed. The check returns 404 and marks the health status as `degraded`.

**Fix:** Remove or replace the `supabase_connectivity` check in the `/api/health` endpoint. Since the database is now local PostgreSQL (not accessible from Vercel), the health endpoint should check:
- Environment variable completeness (already working)
- Any other truly verifiable production dependencies

**Options (dev to choose the best approach):**
1. Remove the `supabase_connectivity` check entirely from the health endpoint
2. Replace it with a connectivity check to a Vercel-accessible dependency (e.g., Resend API ping)
3. If the health check was added to verify DB connectivity, replace it with a check that works for the current architecture

**Acceptance Criteria for Part 2:**  
`https://leadflow-ai-five.vercel.app/api/health` returns `{"status":"ok"}` with HTTP 200.

---

## Acceptance Criteria

### AC1 — No duplicate smoke tasks created within 2h of previous completion
**Given** a smoke test is failing and a QC task was just marked done  
**When** the next 3 heartbeat cycles run (over ~15 minutes)  
**Then** only 1 new task total is created for that smoke failure (not 3)

**Human test:** Run `SELECT count(*) FROM tasks WHERE title = 'Smoke: Vercel dashboard health failing' AND created_at > NOW() - INTERVAL '2 hours';` — should return ≤ 1 after fix

### AC2 — Escalation path works: QC done → dev task created (not another QC)
**Given** `findTaskByTitleAny` returns the existing done QC task  
**When** smoke is still failing on next heartbeat  
**Then** a `Fix: Vercel dashboard health (smoke)` dev task is created with `agent_id = 'dev'`

**Human test:** Force a heartbeat after marking any smoke QC task done; verify next task has `agent_id = 'dev'` in tasks table

### AC3 — Circuit breaker triggers after 3 dev retries
**Given** `devRetries >= 3` in smoke state file  
**When** next heartbeat runs  
**Then** no new task created; `🛑 HUMAN NEEDED` alert fires in Telegram/actions

### AC4 — `findTaskByTitleAny` does not break existing `findTaskByTitle` usage
**Given** other code paths (build-health, replenishQueue, etc.) use `findTaskByTitle`  
**When** `findTaskByTitleAny` is added  
**Then** those callers continue to work correctly (they expect only open tasks)

### AC5 — Vercel dashboard health returns 200 + `{"status":"ok"}`
**Given** the health endpoint no longer checks Supabase connectivity  
**When** `GET https://leadflow-ai-five.vercel.app/api/health` is called  
**Then** response is HTTP 200 with `{"status":"ok"}`

**Human test:** `curl -s https://leadflow-ai-five.vercel.app/api/health | jq .status` → `"ok"`

---

## Out of Scope
- Do NOT change `findTaskByTitle` (correctly used for non-smoke dedup)
- Do NOT change smoke test URLs or test configurations in project.config.json
- Do NOT modify the LeadFlow product's core lead-response logic

---

## Affected Projects
- **genome** (OpenClaw Genome): heartbeat-executor.js + task-store.js loop fix (Part 1)
- **leadflow** (LeadFlow AI): /api/health endpoint Supabase removal (Part 2)
