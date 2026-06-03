# PRD: Revenue Collector Deduplication

**PRD ID:** `prd-revenue-collector-dedup`  
**Status:** Approved for Implementation  
**Priority:** 1 (Blocker)  
**Created:** 2026-03-30  
**Updated:** 2026-03-30  
**Owner:** Product Manager

---

## Executive Summary

The revenue collector (Loop 5 in Genome) creates duplicate "PM: Revenue alert" tasks every heartbeat when revenue is off-track, flooding the task queue and triggering false-positive loop detection. This spec defines the deduplication and lifecycle management system to fix it.

**Impact:**
- Currently: 3+ identical tasks created within 2 hours when revenue is critical
- After fix: Max 1 active revenue alert per goal+trajectory combination
- Benefit: Eliminates loop detection noise, reduces PM workload by 2-3x

---

## Problem Statement

### Current Behavior

**File:** `~/projects/genome/scripts/revenue-collector.js`  
**Function:** `createRevenueAlertTasks()` (line 237)

Every heartbeat (~30 seconds):
1. `collectRevenue()` is called
2. `checkGoalProgress()` calculates current vs target MRR
3. For each off-track goal, `createRevenueAlertTasks()` creates a **new** task without checking for existing ones
4. Result: Identical "PM: Revenue alert — critical (mrr)" tasks created repeatedly

### Why This Breaks

1. **No deduplication logic** — Always calls `store.createTask()` regardless of existing tasks
2. **No idempotency** — Same task spawned on every heartbeat interval
3. **Loop detection triggered** — System detects 3+ identical task titles within 2 hours → spawns "PM: Loop detected" meta-task
4. **Model cooldown cascade** — PM agent times out due to moonshot cooldown → becomes zombie → loop detector triggers again

### Example Timeline

```
2026-03-30 12:53:00 — Heartbeat runs, MRR = $15K (goal = $20K, critical)
                    → Task created: "PM: Revenue alert — critical (mrr)" [ID: t1]

2026-03-30 13:00:00 — Heartbeat runs, MRR = $15K (same)
                    → Task created: "PM: Revenue alert — critical (mrr)" [ID: t2] ← DUPLICATE

2026-03-30 13:07:00 — Heartbeat runs, MRR = $15K (same)
                    → Task created: "PM: Revenue alert — critical (mrr)" [ID: t3] ← DUPLICATE

2026-03-30 13:14:00 — Loop detector triggers (3 identical tasks in 21 min window)
                    → Task created: "PM: Loop detected — PM: Revenue alert — critical (mrr)" ← META-TASK
```

---

## Root Cause Analysis

### Code Location

**File:** `~/projects/genome/scripts/revenue-collector.js`

**Current Code (line 246-263):**
```javascript
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`
    await store.createTask({
      title,
      agent_id: 'product',
      status: 'ready',
      model: 'sonnet',
      priority: 1,
      tags: ['revenue', 'automated', 'high-priority'],
      description: [ /* ... */ ].join('\n'),
      metadata: { created_by: 'revenue-collector', goal_type: result.goal_type, trajectory: result.trajectory }
    })

    console.log(`  Created PM task for ${result.trajectory} ${result.goal_type} goal`)
  }
}
```

**The Problem:**
- No check for existing tasks before calling `store.createTask()`
- Title is deterministic (depends only on trajectory + goal_type)
- If those values don't change between heartbeats, same task created repeatedly

### Why It Matters

1. **Orchestrator Overload** — Task queue fills with near-identical tasks
2. **Loop Detection False Positive** — System correctly identifies duplicates but spawns meta-task instead of fixing source
3. **PM Distraction** — Multiple notifications for the same issue
4. **Learning Signal Corruption** — Task history becomes noisy, learning system has trouble extracting patterns

---

## Solution Design

### Deduplication Strategy

**Core Principle:** Before creating a revenue alert task, check if an active task already exists for the same goal type + trajectory combination. If yes, skip creation.

### Implementation Requirements

#### FR1: Query for Existing Tasks

Before calling `store.createTask()`, query TaskStore for active tasks with matching criteria:

```javascript
const existingTasks = await store.supabase
  .from('tasks')
  .select('id, status, created_at, metadata')
  .eq('project_id', store.projectId)
  .eq('agent_id', 'product')
  .eq('title', title)
  .in('status', ['ready', 'in_progress', 'waiting_feedback'])
  .order('created_at', { ascending: false })
  .limit(1)
```

**Match Criteria:**
- `agent_id = 'product'` (PM agent)
- `title = "PM: Revenue alert — {trajectory} ({goal_type})"` (exact match)
- `status IN ['ready', 'in_progress', 'waiting_feedback']` (active, not completed/failed)

**If Found:**
- Log: `[Revenue Collector] Skipped duplicate task for {goal_type}: {trajectory}. Existing task: {task_id}`
- Continue to next goal (do not create new task)

#### FR2: Skip Recently Completed Tasks

Allow new task creation only if the previous task was completed >24 hours ago:

```javascript
const recentlyCompleted = await store.supabase
  .from('tasks')
  .select('id, completed_at')
  .eq('project_id', store.projectId)
  .eq('agent_id', 'product')
  .eq('title', title)
  .in('status', ['done', 'failed'])
  .gt('completed_at', new Date(Date.now() - 24*60*60*1000).toISOString())
  .limit(1)

if (recentlyCompleted?.data?.length > 0) {
  console.log(`  [Dedup] Task completed <24h ago for ${result.goal_type}: ${result.trajectory}. Skipping new creation.`)
  continue
}
```

#### FR3: Trajectory Change Detection

If revenue trajectory improves (e.g., from `critical` → `behind`), close the old task:

```javascript
// Query for existing task with OLD trajectory (before improvement)
const oldTask = await store.supabase
  .from('tasks')
  .select('id, metadata')
  .eq('project_id', store.projectId)
  .eq('agent_id', 'product')
  .match({
    'title.ilike': `PM: Revenue alert — % (${result.goal_type})`,
    'status': 'ready'
  })
  .limit(1)

if (oldTask?.data?.length > 0) {
  const old = oldTask.data[0]
  const oldTrajectory = old.metadata?.trajectory
  
  // If trajectory improved, close the old task
  if (oldTrajectory && oldTrajectory !== result.trajectory &&
      ['critical', 'behind'].includes(oldTrajectory) &&
      ['behind', 'on_track'].includes(result.trajectory)) {
    
    await store.supabase
      .from('tasks')
      .update({
        status: 'done',
        completed_at: new Date().toISOString(),
        metadata: {
          ...old.metadata,
          closed_by: 'revenue-collector',
          closed_reason: 'trajectory_improved',
          new_trajectory: result.trajectory
        }
      })
      .eq('id', old.id)
    
    console.log(`  [Trajectory] Revenue ${result.goal_type} improved from ${oldTrajectory} to ${result.trajectory} — closed task ${old.id}`)
  }
}
```

#### FR4: Task Metadata

All created tasks must include enriched metadata:

```javascript
metadata: {
  created_by: 'revenue-collector',
  goal_type: result.goal_type,          // e.g., 'mrr', 'subscribers'
  trajectory: result.trajectory,        // e.g., 'critical', 'behind', 'on_track'
  last_checked: new Date().toISOString(),
  days_remaining: result.daysRemaining,
  gap_percent: result.gapPercent,       // Percentage off target (negative = behind)
  target_value: result.target,
  current_value: result.current
}
```

#### FR5: Observability & Logging

Log every decision for audit trail:

- **Dedup Skip:** `[Revenue Collector] Skipped duplicate task for {goal_type}: {trajectory}. Existing task: {task_id}`
- **Creation:** `[Revenue Collector] Created revenue alert task for {goal_type}: {trajectory} (gap: {gap_percent}%, days: {days_remaining})`
- **Trajectory Improvement:** `[Revenue Collector] Revenue {goal_type} trajectory improved from {old} → {new}. Closed task {task_id}`
- **Escalation:** `[Revenue Collector] Escalated revenue alert task {task_id} — inaction >48h`

---

## User Stories

### US1: Deduplication Prevents Duplicate Tasks
**As a** Genome heartbeat executor  
**I want to** check for existing revenue alert tasks before creating new ones  
**So that** identical tasks don't flood the queue  

**Acceptance Criteria:**
- [ ] When heartbeat runs and revenue is off-track, query for active tasks with same goal+trajectory
- [ ] If task exists with status `ready` or `in_progress`, skip creation and log skip
- [ ] Only 1 active revenue alert task per goal+trajectory combination can exist
- [ ] No loop detection tasks triggered when revenue stays off-track for 24+ hours

### US2: Trajectory Improvement Auto-Closes Tasks
**As a** revenue collector  
**I want to** detect when revenue trajectory improves (critical → behind)  
**So that** old alerts are cleaned up automatically  

**Acceptance Criteria:**
- [ ] When trajectory improves, mark old task as done with metadata `{ closed_reason: 'trajectory_improved', new_trajectory: ... }`
- [ ] New task NOT created for better trajectory unless it deteriorates again
- [ ] Logs show: `[Revenue Collector] Revenue {goal_type} trajectory improved from {old} → {new}`

### US3: New Tasks Created After Completion
**As a** product development team  
**I want to** receive a new alert if revenue returns to critical after a previous alert was completed  
**So that** recurring issues get re-escalated  

**Acceptance Criteria:**
- [ ] When previous task is done/failed >24 hours ago AND revenue is still off-track, create new task
- [ ] New task has same goal_type+trajectory but different task_id
- [ ] Logs distinguish between "new" creation and "duplicate skip"

---

## E2E Test Scenarios

### Scenario 1: Deduplication Blocks Second Task
**Setup:** Revenue is $15K (goal $20K, critical)  
**Test Steps:**
1. Heartbeat runs → `collectRevenue()` → `checkGoalProgress()` = critical
2. `createRevenueAlertTasks()` creates task [A]: "PM: Revenue alert — critical (mrr)"
3. Heartbeat runs again (30s later) → same MRR data
4. `createRevenueAlertTasks()` queries for existing task
5. Should find [A] with status='ready'

**Expected Outcome:**
- Task queue has exactly 1 "PM: Revenue alert — critical (mrr)" task
- Logs show: `[Revenue Collector] Skipped duplicate task for mrr: critical. Existing task: {A_id}`
- No loop detection task created

### Scenario 2: Trajectory Improvement Closes Old Task
**Setup:** Task [A] exists with trajectory='critical', new data shows trajectory='behind'  
**Test Steps:**
1. Heartbeat 1: Creates [A] "PM: Revenue alert — critical (mrr)"
2. Revenue improves: $18K (gap reduced)
3. Heartbeat 2: `checkGoalProgress()` = 'behind' (no longer critical)
4. Query for old task with goal_type='mrr'
5. Compare trajectories: critical → behind

**Expected Outcome:**
- Task [A] marked as done with metadata: `{ closed_reason: 'trajectory_improved', new_trajectory: 'behind' }`
- Logs: `[Revenue Collector] Revenue mrr trajectory improved from critical → behind. Closed task {A_id}`
- No new task created for 'behind' trajectory (unless implemented separately)

### Scenario 3: New Task Created After Completion + 24h
**Setup:** Task [A] completed 24+ hours ago, revenue still critical  
**Test Steps:**
1. Task [A] exists with status='done', completed_at='2026-03-29 13:00'
2. New heartbeat: 2026-03-30 14:00
3. Query for active tasks → [A] excluded (status='done')
4. Query for recently completed → [A] excluded (completed >24h ago)
5. No active/recent task blocks creation

**Expected Outcome:**
- Task [B] created as new "PM: Revenue alert — critical (mrr)"
- [A] remains done (not reopened)
- Logs: `[Revenue Collector] Created revenue alert task for mrr: critical (previous completed 25h ago)`

### Scenario 4: Database-Level Uniqueness
**Setup:** Two heartbeats run concurrently (race condition)  
**Test Steps:**
1. Heartbeat-1 queries → no existing task found
2. Heartbeat-2 queries → no existing task found
3. Both attempt to create same task simultaneously
4. Database has unique index on (agent_id, title, status)

**Expected Outcome:**
- First insert succeeds, second fails with unique constraint violation
- Losing heartbeat logs and continues (graceful degradation)
- No duplicate in database

---

## Implementation Plan

### Phase 1: Code Changes (Dev Agent)

**File:** `~/projects/genome/scripts/revenue-collector.js`

**Changes:**
1. Modify `createRevenueAlertTasks()` function (line 237-263)
2. Add dedup query before `store.createTask()` call
3. Add trajectory improvement detection
4. Enhance logging and metadata
5. Update JSDoc comments

**Testing:**
- Standalone: `node scripts/revenue-collector.js --test`
- Mocked data with pre-created tasks

### Phase 2: QC Validation

**Tests to Run:**
1. Scenario 1 (Dedup Blocks Second Task)
2. Scenario 2 (Trajectory Improvement)
3. Scenario 3 (Completion + 24h)
4. Scenario 4 (Race Condition)

**Verification:**
- No duplicate revenue alert tasks in ready/in_progress status
- Loop detection not triggered for 24+ hours
- Logs match expected patterns

### Phase 3: Production Rollout

1. Merge to Genome repo
2. Deploy updated revenue-collector.js
3. Monitor logs for dedup patterns
4. Verify no loop-detected tasks created

---

## Acceptance Checks (Machine-Verifiable)

```sql
-- Check 1: No duplicate revenue alert tasks in active status
SELECT 
  COUNT(*) as dup_count,
  title
FROM tasks
WHERE agent_id = 'product'
  AND title LIKE 'PM: Revenue alert — %'
  AND status IN ('ready', 'in_progress')
GROUP BY title
HAVING COUNT(*) > 1

-- Expected: 0 rows (no duplicates)

-- Check 2: All revenue alert tasks have required metadata
SELECT COUNT(*) as missing_meta
FROM tasks
WHERE agent_id = 'product'
  AND title LIKE 'PM: Revenue alert — %'
  AND (
    metadata->>'goal_type' IS NULL
    OR metadata->>'trajectory' IS NULL
    OR metadata->>'last_checked' IS NULL
  )

-- Expected: 0 rows

-- Check 3: No loop detection tasks for revenue alerts in last 24h
SELECT COUNT(*) as loop_tasks
FROM tasks
WHERE title LIKE 'PM: Loop detected — PM: Revenue alert%'
  AND created_at > NOW() - INTERVAL '24 hours'

-- Expected: 0 rows (after fix is deployed)

-- Check 4: Revenue alert tasks created only when needed
SELECT 
  DATE(created_at) as day,
  COUNT(*) as tasks_created
FROM tasks
WHERE agent_id = 'product'
  AND title LIKE 'PM: Revenue alert — %'
GROUP BY DATE(created_at)
ORDER BY day DESC

-- Expected: ≤2 per day per trajectory (not 3+/hour)
```

---

## Success Metrics

✅ **No Duplicate Tasks:** Max 1 revenue alert per goal+trajectory in ready/in_progress status  
✅ **Loop Detection Eliminated:** No "PM: Loop detected — PM: Revenue alert" tasks in 24h period after deploy  
✅ **Trajectory Tracking:** All tasks include goal_type, trajectory, gap_percent, days_remaining in metadata  
✅ **Auto-Closure:** Tasks marked done when trajectory improves (critical → behind)  
✅ **Logging:** All dedup/closure decisions logged with task IDs and timestamps  
✅ **E2E Tests Pass:** All 4 scenarios above pass verification  

---

## Dependencies & Constraints

### Dependencies
- **TaskStore API:** Must support `.query()` method with filters (already implemented)
- **Supabase client:** For querying tasks table (already available in revenue-collector.js)
- **Task metadata structure:** Must support JSON storage (already in schema)

### Constraints
- **Backward Compatibility:** Change is additive, doesn't break existing task creation
- **Performance:** Dedup query must complete in <500ms (single query + index lookup)
- **Atomicity:** Race condition possible if two heartbeats run simultaneously → mitigated by database unique constraint

### Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Race condition (concurrent creates) | Database unique index on (agent_id, title, status) |
| Query performance degradation | Add index on (agent_id, title, status, created_at) |
| Old tasks block new alerts | Only check tasks <24h old or status='ready' |
| Metadata corruption | Validate metadata schema before insert |

---

## Rollout Timeline

| Phase | Owner | Duration | Start | End |
|-------|-------|----------|-------|-----|
| Development | Dev Agent | 2-4 hours | 2026-03-30 | 2026-03-30 |
| QC Testing | QC Agent | 2-4 hours | 2026-03-30 | 2026-03-30 |
| Validation | PM | 1 hour | 2026-03-30 | 2026-03-30 |
| Deployment | Orchestrator | <30 min | 2026-03-30 | 2026-03-30 |

**Target:** All tests passing + deployed by end of 2026-03-30

---

## Related Documentation

- **Revenue Collector:** `~/projects/genome/scripts/revenue-collector.js`
- **Genome Architecture:** `~/projects/genome/ARCHITECTURE.md` (Loop 5)
- **Task Lifecycle:** `~/projects/genome/docs/TASK-LIFECYCLE.md`
- **Loop Detection:** `~/projects/genome/core/task-store.js` (line 150-160)
- **Project Goals:** `/Users/clawdbot/projects/leadflow/project.config.json` (goals section)
- **Heartbeat Spec:** `/Users/clawdbot/projects/leadflow/HEARTBEAT.md`

---

## Sign-Off

**PM Review:** ✅ Approved  
**Status:** Ready for Dev → QC → Production

**Next Step:** Dev agent implements changes in `~/projects/genome/scripts/revenue-collector.js`
