# PRD: Fix Distribution Health Check Loop
**ID:** prd-distribution-loop-fix  
**Status:** draft  
**Priority:** 1 (Blocker — tasks are being duplicated, wasting agent budget and creating noise)  
**Author:** PM Agent  
**Date:** 2026-03-30

---

## Problem Statement

The distribution health check (`distribution-collector.js`) creates "PM: Distribution — Create Landing Page" tasks repeatedly without any cooldown or completion-aware deduplication. Over 10 such tasks were created in 2 hours, exhausting agent budget and flooding the task queue.

### Root Cause Analysis

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`  
**Function:** `createDistributionTasks()`

**Root Cause 1 — Deduplication only blocks active tasks:**  
`TaskStore.createTask()` checks for duplicate tasks via:
- UC + agent dedup: `NOT status IN ('done','failed','cancelled')` — **only prevents duplicates while a task is still active**
- Once the PM task completes (`status=done`), dedup allows a new identical task on the next health check cycle

**Root Cause 2 — Workflow doesn't chain:**  
`createDistributionTasks` creates only the FIRST step of the workflow (PM task). After PM writes a spec, no mechanism chains to design → dev → qc. The landing page is never built.

**Root Cause 3 — `distribution_channels` table stays empty:**  
No task in the workflow writes a record to `distribution_channels` when the landing page is deployed. So `checkDistributionHealth()` permanently sees "no active landing page" and keeps raising the issue.

**Evidence:**
```
distribution_channels: [] (empty forever)
10+ tasks titled "PM: Distribution — Create Landing Page" all status=done
```

---

## Goals

1. Stop the task creation loop for "Distribution — Create Landing Page"
2. Ensure the distribution workflow chains properly (PM → Marketing → Design → Dev → QC)
3. Ensure `distribution_channels` is populated when a landing page goes live
4. Give the genome loop-safe distribution health checks with cooldown logic

---

## Out of Scope

- Building the actual landing page (separate Design/Dev task)
- General landing page content or design

---

## Requirements

### REQ-1: Per-Issue-Type Cooldown in `createDistributionTasks`

Before creating a task for any issue type (e.g., `no_landing_page`), check for existing tasks created in the last **7 days** for the same `use_case_id` regardless of status (including `done`).

```
IF exists task WHERE:
  use_case_id = template.use_case_id
  AND created_at > NOW() - INTERVAL '7 days'
THEN: skip creation, log "cooldown active"
```

Implementation: Add a 7-day completed-task check to `createDistributionTasks()` before calling `store.createTask()`.

### REQ-2: Use Case Status Check

Before creating a distribution task, check the `use_cases` table for the related UC's status:
- If `status = 'in_progress'` or `status = 'done'`: skip task creation, log reason
- If `status = 'not_started'` or `status = 'backlog'`: proceed

### REQ-3: Register Landing Page on Completion

When the dev/qc step of the landing page workflow completes, insert a row into `distribution_channels`:

```sql
INSERT INTO distribution_channels (project_id, channel_type, name, url, status, created_at)
VALUES ('leadflow', 'landing_page', 'LeadFlow Landing Page', '<deployed URL>', 'active', NOW())
ON CONFLICT DO NOTHING;
```

This must happen in the dev or QC completion step of the `gtm-landing-page` use case workflow. The QC agent should verify the URL is live before inserting.

### REQ-4: Genome — `TaskStore.createTask` Cooldown Option

Add an optional `cooldownDays` parameter to `TaskStore.createTask()`:

```js
store.createTask({
  ...,
  cooldownDays: 7  // Don't recreate if same use_case_id completed within 7 days
})
```

`createDistributionTasks` should pass `cooldownDays: 7` for all distribution tasks.

---

## Acceptance Criteria

### AC-1: No duplicate tasks within 7 days
After the PM task for "Create Landing Page" completes, running `checkDistributionHealth()` again should NOT create a new task for 7 days.

**Verifiable:** Query tasks table — no two tasks with `use_case_id = 'gtm-landing-page'` and `agent_id = 'product'` should have `created_at` within 7 days of each other (after fix lands).

### AC-2: Workflow chains after PM step
After PM creates a spec for the landing page, a Marketing task and Design task should be spawned automatically within the next heartbeat cycle.

### AC-3: `distribution_channels` populated on deploy
When the landing page is deployed and QC passes, a record exists in `distribution_channels` with `channel_type = 'landing_page'` and `status = 'active'`.

**Verifiable:** `SELECT count(*) FROM distribution_channels WHERE project_id = 'leadflow' AND channel_type = 'landing_page' AND status = 'active'` returns >= 1 after deployment.

### AC-4: No new "Loop detected" tasks after fix
After the fix lands, no new "PM: Loop detected — PM: Distribution — Create Landing Page" tasks should appear in the next 48 hours.

---

## E2E Test Specs

### T1: Distribution Dedup Guard
- **Setup:** Ensure `gtm-landing-page` UC has a `done` task from 3 days ago
- **Action:** Run `checkDistributionHealth()` + `createDistributionTasks()`
- **Expected:** No new task created; log shows "cooldown active"

### T2: Distribution Channel Registration  
- **Setup:** Complete landing page dev + QC
- **Action:** Check `distribution_channels` table
- **Expected:** Row with `channel_type=landing_page`, `status=active` exists

### T3: No Loop on Next Heartbeat
- **Setup:** `distribution_channels` is empty but a recent PM task for `gtm-landing-page` exists (< 7 days)
- **Action:** Run heartbeat loop 6 (distribution collection)
- **Expected:** No new landing page task created

---

## Implementation Notes

**Files to modify (Genome — `~/.openclaw/genome/`):**
1. `scripts/distribution-collector.js` — Add 7-day cooldown check in `createDistributionTasks()` before `store.createTask()`
2. `core/task-store.js` — Add optional `cooldownDays` parameter support in `createTask()`

**Files to modify (LeadFlow — `/Users/clawdbot/projects/leadflow/`):**
3. QC completion handler for `gtm-landing-page` — Add `distribution_channels` INSERT on pass

**Agent responsible for genome fix:** Dev (genome project)  
**Agent responsible for distribution_channels insert:** Dev (leadflow project)  
**Project:** This fix spans both `genome` and `leadflow` projects.

---

## Acceptance Checks (Machine-Verifiable)

```json
[
  {
    "id": "no-recent-dup-tasks",
    "command": "node -e \"require('dotenv').config({path:'/Users/clawdbot/projects/leadflow/.env'}); const {createClient}=require('@supabase/supabase-js'); const sb=createClient('http://localhost:8787',process.env.LEADFLOW_API_KEY,{auth:{autoRefreshToken:false,persistSession:false}}); sb.from('tasks').select('id,created_at').eq('project_id','leadflow').eq('use_case_id','gtm-landing-page').eq('agent_id','product').order('created_at',{ascending:false}).limit(2).then(r=>{const tasks=r.data||[];if(tasks.length<2){console.log('0');return;} const diff=(new Date(tasks[0].created_at)-new Date(tasks[1].created_at))/86400000; console.log(diff<1?'1':'0');}).catch(()=>console.log('0'))\"",
    "expected": "0",
    "description": "Two most recent PM landing page tasks should be >= 1 day apart (cooldown active)"
  }
]
```
