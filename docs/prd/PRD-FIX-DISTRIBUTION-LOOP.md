# PRD: Fix Distribution Health Check Loop
<!--
TASK SPEC (eb5ef675-2276-4dbd-a86b-a68822452c02)
What:
- Change file: docs/prd/PRD-FIX-DISTRIBUTION-LOOP.md
- Update stale dedup/cooldown window values in sections: "Fix 2", "Fix 3", "Acceptance Criteria", and "E2E Test Specs".
- Align wording to current implementation in Genome:
  - /Users/clawdbot/.openclaw/genome/scripts/distribution-collector.js
  - /Users/clawdbot/.openclaw/genome/core/task-store-base.js

Verify:
- Run: rg -n "24 hours|4 hours|7 days|24h cooldown|dedup window|Loop detector 24h guard" docs/prd/PRD-FIX-DISTRIBUTION-LOOP.md
- Run: rg -n "7 \\* 24 \\* 60 \\* 60 \\* 1000|24 \\* 60 \\* 60 \\* 1000|24h cooldown|Dedup guard: skip if equivalent task created in last 7 days" /Users/clawdbot/.openclaw/genome/scripts/distribution-collector.js /Users/clawdbot/.openclaw/genome/core/task-store-base.js
- Quality gates: npm run build, npm run lint, npm test, npm audit --audit-level=high

Boundaries:
- Do not modify product/runtime code in routes/, lib/, server.js, or Genome core/scripts.
- Do not modify other PRDs or auto-generated docs.
- Do not change behavior; documentation alignment only.
-->

**ID:** PRD-FIX-DISTRIBUTION-LOOP  
**Status:** approved  
**Priority:** 1 (Blocker)  
**Created:** 2026-03-30  
**Author:** Product Manager  
**Affected Projects:** genome (OpenClaw Genome)

---

## Problem Statement

A critical task-spawning loop has been detected and confirmed running since 2026-03-30T12:36. The `checkDistributionHealth()` function in the Genome's Loop 6 creates a "PM: Distribution — Create Landing Page" task every heartbeat. Because there is no deduplication guard, 9+ duplicate tasks have been created. The Genome's loop-detection system then fires "PM: Loop detected" investigation tasks — but those investigation tasks also loop, producing 9+ additional tasks. At the time of writing (task 40fe7bfa), this secondary loop is still running.

**Business Impact:** Agent capacity is being consumed by no-op investigation tasks. The loop will continue indefinitely without a code fix in the Genome.

---

## Root Cause Analysis

### Bug 1 — Missing `distribution_channels` table (PRIMARY)

`checkDistributionHealth()` queries `distribution_channels` for an active `landing_page` entry:

```js
const { data: landingPages } = await supabase
  .from('distribution_channels')
  .select('*')
  .eq('project_id', PROJECT_ID)
  .eq('channel_type', 'landing_page')
  .eq('status', 'active')
```

The `distribution_channels` table **does not exist** in the local PostgreSQL database. The query returns `null` (error is silently swallowed by the destructuring). The `null` check `!landingPages || landingPages.length === 0` evaluates to `true`, so `no_landing_page` is pushed to issues every heartbeat.

### Bug 2 — No dedup guard in `createDistributionTasks()`

`createDistributionTasks()` calls `store.createTask()` directly without first checking whether an open or recently-created task with the same title already exists. Every heartbeat that finds a distribution issue spawns a fresh task, regardless of whether one is already queued or in-progress.

### Bug 3 — Loop detector re-triggers on completed investigation tasks

`task-store.js` loop detection guard (line 147):

```js
const { data: existingInv } = await this.supabase.from('tasks').select('id')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .not('status', 'in', '("done","failed","cancelled")')
  .limit(1)
```

Once investigation tasks are marked `done`, the guard clears. On the next heartbeat, if 3+ "PM: Loop detected" tasks exist within the 2h window (they do, since PM agents complete them quickly), the detector fires again, creating another investigation task in a self-sustaining secondary loop.

---

## Required Fixes (all in `~/projects/genome/`)

### Fix 1 — Create `distribution_channels` table + seed active entry (CRITICAL)

**File:** `~/projects/genome/scripts/migrations/` (new migration)  
**Also:** `~/projects/genome/scripts/distribution-collector.js`

Create the `distribution_channels` table:

```sql
CREATE TABLE IF NOT EXISTS distribution_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL,
  channel_type TEXT NOT NULL,   -- 'landing_page', 'email', 'social', 'paid'
  name        TEXT NOT NULL,
  url         TEXT,
  status      TEXT NOT NULL DEFAULT 'active',  -- 'active', 'inactive', 'archived'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

Seed LeadFlow's deployed landing page:

```sql
INSERT INTO distribution_channels (project_id, channel_type, name, url, status)
VALUES ('leadflow', 'landing_page', 'LeadFlow Marketing Landing Page', 'https://www.imagineapi.org', 'active')
ON CONFLICT DO NOTHING;
```

Additionally, add error handling in `checkDistributionHealth()` so a table-not-found error does NOT produce issues. If the table query errors, log a warning and return `[]` rather than treating a missing table as a missing landing page.

### Fix 2 — Add dedup guard in `createDistributionTasks()`

**File:** `~/projects/genome/scripts/distribution-collector.js`  
**Function:** `createDistributionTasks()`

Before calling `store.createTask()`, check for an existing non-cancelled, non-failed task with the same title that was created within the last 7 days:

```js
// Dedup: skip if a task with this title already exists and is recent
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
const { data: existingTask } = await store.supabase
  .from('tasks')
  .select('id, status, created_at')
  .eq('project_id', store.projectId)
  .eq('title', title)
  .not('status', 'in', '("cancelled","failed")')
  .gte('created_at', sevenDaysAgo)
  .limit(1)

if (existingTask && existingTask.length > 0) {
  console.log(`  Skipping duplicate task: ${title} (existing: ${existingTask[0].id})`)
  continue
}
```

The dedup window should be **7 days** — long enough to prevent repeated task churn from persistent distribution issues across many heartbeats, while still allowing a fresh task after a full week if the issue remains unresolved.

### Fix 3 — Extend loop detector guard to cover recently-done tasks

**File:** `~/projects/genome/core/task-store.js`  
**Location:** Loop detection block (~line 147)

Change the guard from checking only "not done/failed/cancelled" to also checking "created within the last 24 hours":

```js
// Guard: skip if a loop-investigation task was already created recently (open OR just completed)
const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const { data: existingInv } = await this.supabase
  .from('tasks')
  .select('id')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .gte('created_at', twentyFourHoursAgo)
  .limit(1)

if (existingInv && existingInv.length > 0) {
  console.log(`[TaskStore] Loop investigation already exists, skipping: ${invTitle}`)
  return
}
```

This prevents the loop detector itself from looping when investigation tasks complete quickly.

---

## Acceptance Criteria

1. After fix is deployed, no new "PM: Distribution — Create Landing Page" tasks are created on subsequent heartbeats (dedup guard fires).
2. After fix is deployed, no new "PM: Loop detected — PM: Distribution — Create Landing Page" tasks are created (secondary loop stopped).
3. `distribution_channels` table exists and has an active `landing_page` row for project `leadflow`.
4. If `distribution_channels` table is dropped/missing, `checkDistributionHealth()` returns `[]` (no issues) and logs a warning — it does NOT create tasks.
5. The dedup window for distribution tasks is exactly 7 days.
6. The loop detector guard covers tasks created within the last 24 hours (open OR completed).

---

## Out of Scope

- This PRD does NOT require the PM or dev agents to modify product code in `~/projects/leadflow/`
- The landing page itself already exists and is deployed — no rebuild required
- Conversion rate optimization, traffic acquisition, and analytics are separate use cases

---

## E2E Test Specs

### Test 1: Distribution dedup guard
- **Trigger:** Run `checkDistributionHealth()` + `createDistributionTasks()` twice in succession
- **Expected:** Only one task created; second call logs "Skipping duplicate task"

### Test 2: Missing table graceful failure
- **Trigger:** Rename `distribution_channels` table, run `checkDistributionHealth()`
- **Expected:** Returns `[]`, logs warning, no tasks created

### Test 3: Loop detector 24h guard
- **Trigger:** Mark all "PM: Loop detected" tasks done, then re-trigger loop detection
- **Expected:** If most recent done task is < 24h old, no new investigation task is created

---

## Implementation Notes

- Fix 1 (table + seed) must be applied FIRST; it eliminates the trigger condition entirely
- Fix 2 (dedup) is a safety net for future distribution issues that legitimately recur
- Fix 3 (loop detector guard) is a systemic fix that protects all loop-detection paths
- All changes are in `~/projects/genome/` — **do not modify** `~/projects/leadflow/` product code for this fix

---

## Affected Supabase Tables

| Table | Action |
|-------|--------|
| `distribution_channels` | CREATE + seed LeadFlow row |
| `tasks` | Read-only (dedup queries) |
