# PRD: Loop Detection Handler Investigation

**PRD ID:** `prd-loop-detection-handler-investigation`  
**Status:** Analysis Complete — Specification Ready  
**Priority:** 1 (Blocker)  
**Created:** 2026-03-30  
**Updated:** 2026-03-30  
**Owner:** Product Manager

---

## Executive Summary

A loop detection mechanism is correctly identifying duplicate "PM: Revenue alert — critical (mrr)" tasks being created 3+ times within 2 hours. The loop detector itself is **working as designed** — it detects duplicates and creates a "PM: Loop detected" meta-task to escalate the issue.

**However, the root cause is not in the loop detector; it's in the revenue collector source code.**

The `~/.openclaw/genome/scripts/revenue-collector.js` creates a new task **every heartbeat** (every ~30 seconds) without checking if an identical task already exists. This is idempotent failure — the system works correctly but does the wrong thing repeatedly.

**This spec documents the investigation findings and the required fix.**

---

## Problem Statement

### Symptom
Loop detector triggers: "PM: Loop detected — PM: Revenue alert — critical (mrr)" created on 2026-03-30 at ~13:14:00 UTC, after detecting 3 instances of "PM: Revenue alert — critical (mrr)" created between 12:53:00 and 13:07:00.

### Root Cause Analysis

**Location:** `~/.openclaw/genome/scripts/revenue-collector.js`, function `createRevenueAlertTasks()` (lines 313-338)

**Current Code:**
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
1. **No deduplication check** — The function unconditionally calls `store.createTask()` without verifying if a task with the same title already exists
2. **Deterministic title** — The title is based only on `trajectory` and `goal_type`, both of which are stable during a revenue collection period
3. **Repeated calls** — Heartbeat runs every ~30 seconds. If revenue metrics don't change, the same task is created again and again
4. **Loop detection trigger** — After 3+ identical tasks appear within 2 hours, the loop detector (in `task-store.js`, lines ~150-160) correctly detects this as a loop and creates the "PM: Loop detected" meta-task

### Why Loop Detection Works (The Handler Is Correct)

**File:** `~/.openclaw/genome/core/task-store.js`, lines 150-165

**Code:**
```javascript
// Runtime loop detection: 3+ tasks with same title prefix in 2h = loop
if (this.supabase) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const titlePrefix = task.title.slice(0, 60)
    const { data: recentSimilar } = await this.supabase
      .from('tasks')
      .select('id')
      .eq('project_id', this.projectId)
      .ilike('title', titlePrefix + '%')
      .gte('created_at', twoHoursAgo)
    
    if (recentSimilar?.length >= 3) {
      console.warn(`[TaskStore] LOOP DETECTED: "${titlePrefix}..." created ${recentSimilar.length}x in 2h`)
      const invTitle = `PM: Loop detected — ${titlePrefix}`.slice(0, 120)
      const { data: existingInv } = await this.supabase
        .from('tasks')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('title', invTitle)
        .not('status', 'in', '("done","failed","cancelled")')
        .limit(1)
      
      // Only create meta-task if one doesn't already exist
      if (!existingInv?.length) {
        await this.supabase.from('tasks').insert({
          title: invTitle,
          description: `Loop detected: "${task.title}" created ${recentSimilar.length}x in 2h. Investigate the handler.`,
          agent_id: 'product',
          status: 'ready',
          model: 'sonnet',
          priority: 1,
          project_id: this.projectId,
          tags: ['loop-detection'],
          metadata: { created_by: 'loop-detector' },
          created_at: new Date().toISOString()
        }).select().single()
      }
      return null
    }
  } catch {}
}
```

**Why This Is Correct:**
- ✅ Detects actual loops (3+ tasks in 2h)
- ✅ Creates a single "PM: Loop detected" task, not multiple
- ✅ The task description includes the root task title so the PM can investigate
- ✅ Only creates the meta-task once (checks for existing)
- ✅ Has graceful error handling (catch block)

**The handler works exactly as intended.**

---

## Why This Is a Problem

### Impact on Orchestration

1. **Task Queue Pollution** — Every 30 seconds, another identical "PM: Revenue alert" task is created (3 × 4 heartbeats/hour = 3-4 per hour = 9-12 per 3 hours)
2. **PM Overload** — The PM agent gets assigned multiple identical tasks, consuming capacity
3. **Loop Detection Noise** — False-positive loop detection meta-tasks are created, adding orchestration overhead
4. **User Confusion** — Stojan sees "PM: Loop detected" in the task queue and has to investigate, when the real issue is in the revenue collector

### Timeline

```
2026-03-30 12:53:00 — Heartbeat 1: MRR = $15K (target = $20K, critical)
                    → revenue-collector.js creates "PM: Revenue alert — critical (mrr)" [Task A]

2026-03-30 13:00:00 — Heartbeat 2: MRR = $15K (unchanged)
                    → revenue-collector.js creates "PM: Revenue alert — critical (mrr)" [Task B] (DUPLICATE)

2026-03-30 13:07:00 — Heartbeat 3: MRR = $15K (unchanged)
                    → revenue-collector.js creates "PM: Revenue alert — critical (mrr)" [Task C] (DUPLICATE)

2026-03-30 13:14:00 — Heartbeat 4: Loop detector triggers (3 tasks found in 2h window)
                    → task-store creates "PM: Loop detected — PM: Revenue alert — critical (mrr)"

Result: 4 tasks created from 1 business intent
```

---

## Solution Design

The fix is **not** to change the loop detector — it's working correctly. The fix is to **prevent duplicate tasks from being created in the first place** by adding deduplication logic to `revenue-collector.js`.

### Implementation Requirements

#### FR1: Query for Existing Revenue Alert Tasks

Before calling `store.createTask()`, check if an active task already exists with the same goal type and trajectory:

```javascript
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`
    
    // [NEW] Check for existing active task before creating
    const existingTask = await store.supabase
      .from('tasks')
      .select('id, status, created_at')
      .eq('project_id', store.projectId)
      .eq('title', title)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingTask?.data?.length > 0) {
      console.log(`[Revenue Collector] Task already exists for ${result.trajectory} ${result.goal_type}: skipping (ID: ${existingTask.data[0].id})`)
      continue  // Do not create duplicate
    }

    // [EXISTING] Create task as before
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

    console.log(`[Revenue Collector] Created PM task for ${result.trajectory} ${result.goal_type} goal`)
  }
}
```

#### FR2: Store Reference to TaskStore

The `createRevenueAlertTasks()` function needs access to the Supabase client to query for existing tasks:

```javascript
async function createRevenueAlertTasks(goalResults, store) {
  // Accept store as parameter instead of creating new one
  // This allows access to store.projectId and store.supabase
  
  for (const result of goalResults) {
    // ... dedup logic ...
  }
}

// Update caller (in collectRevenue):
async function collectRevenue() {
  // ...
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()
  
  // Pass store to function
  await createRevenueAlertTasks(goalResults, store)
}
```

#### FR3: Metadata Enrichment

All created tasks include metadata for audit trail:

```javascript
metadata: {
  created_by: 'revenue-collector',
  goal_type: result.goal_type,
  trajectory: result.trajectory,
  last_checked: new Date().toISOString(),
  days_remaining: result.daysRemaining,
  gap_percent: result.gapPercent,
  target_value: result.target,
  current_value: result.current,
  deduplication_check: 'performed'  // [NEW]
}
```

---

## Acceptance Criteria

### AC-1: No Duplicate Revenue Alert Tasks in Ready Status
**Test:** Run heartbeat twice with identical MRR data  
**Expected:** Only 1 task with title matching `PM: Revenue alert — {trajectory} ({goal_type})` exists in ready status  
**Verify:** Query `SELECT COUNT(*) FROM tasks WHERE title LIKE 'PM: Revenue alert — %' AND status = 'ready'` → should be 1 or fewer

### AC-2: Loop Detector Does Not Trigger
**Test:** Let heartbeat run for 2+ hours with constant off-track revenue  
**Expected:** No new "PM: Loop detected — PM: Revenue alert" tasks created after initial fix deployment  
**Verify:** Check task log for absence of "LOOP DETECTED" warnings in logs after 2 hours

### AC-3: New Alerts Created When Trajectory Changes
**Test:** Start with trajectory='behind', update metrics to trajectory='critical'  
**Expected:** New task created with different title (critical vs behind)  
**Verify:** Both tasks exist in ready status with different titles

### AC-4: Completed Tasks Allow New Alerts
**Test:** Mark old revenue alert task as 'done', then run heartbeat with same off-track goal  
**Expected:** New task created (done task doesn't block it)  
**Verify:** New task exists with same title but different ID

---

## E2E Test Scenarios

### Scenario 1: Deduplication Prevents Second Create
**Setup:** Revenue is $15K (goal $20K = critical)

**Test Steps:**
1. Heartbeat 1 runs: `collectRevenue()` → checks goals → MRR=$15K is critical
2. `createRevenueAlertTasks()` queries for existing task → finds none
3. Creates task [A]: "PM: Revenue alert — critical (mrr)"
4. Heartbeat 2 runs (30s later): same MRR=$15K
5. `createRevenueAlertTasks()` queries for existing task → finds [A]
6. Skips creation, logs "Task already exists"

**Expected Outcome:**
- Exactly 1 "PM: Revenue alert — critical (mrr)" task exists in ready status
- Logs show: `[Revenue Collector] Task already exists for critical mrr: skipping (ID: {A_id})`
- No new loop detection task created after 2 hours

**Pass Criteria:**
```sql
SELECT COUNT(*) as cnt FROM tasks 
WHERE agent_id = 'product' 
AND title = 'PM: Revenue alert — critical (mrr)' 
AND status = 'ready'
-- Expected: 1
```

### Scenario 2: Trajectory Improvement Allows New Task
**Setup:** Task [A] exists with trajectory='critical', revenue improves to trajectory='behind'

**Test Steps:**
1. Task [A] exists: "PM: Revenue alert — critical (mrr)", status='ready', metadata.trajectory='critical'
2. Heartbeat 3 runs: Revenue improves from $15K → $18K
3. `checkGoalProgress()` shows new trajectory='behind' (no longer critical)
4. `createRevenueAlertTasks()` receives result with trajectory='behind'
5. Queries for existing "PM: Revenue alert — behind (mrr)" → finds none
6. Creates new task [B] OR creates no task (depends on if trajectory='behind' triggers alert)

**Expected Outcome:**
- If 'behind' triggers alert: Task [B] created with title "PM: Revenue alert — behind (mrr)"
- Task [A] remains unchanged (ready status) OR gets closed
- Logs show revenue trajectory change

**Pass Criteria:**
```sql
SELECT COUNT(*) as cnt FROM tasks 
WHERE agent_id = 'product' 
AND title LIKE 'PM: Revenue alert%' 
AND status = 'ready'
-- Expected: 1 or 2 (depending on trajectory alert rules)
```

### Scenario 3: Completed Task Unblocks New Creation
**Setup:** Task [A] completed >24h ago, revenue still critical

**Test Steps:**
1. Task [A] exists with status='done', completed_at='2026-03-29 12:00'
2. New heartbeat at 2026-03-30 14:00 (26 hours later)
3. Revenue still critical ($15K)
4. `createRevenueAlertTasks()` queries for active tasks
5. Finds [A] but status='done' (not 'ready'), so no dedup block
6. Creates new task [C]: "PM: Revenue alert — critical (mrr)"

**Expected Outcome:**
- Task [C] created successfully (different ID from [A])
- [A] remains done (not reopened)
- Logs show: `[Revenue Collector] Created PM task for critical mrr goal`

**Pass Criteria:**
```sql
SELECT COUNT(DISTINCT id) as cnt FROM tasks 
WHERE agent_id = 'product' 
AND title = 'PM: Revenue alert — critical (mrr)' 
AND status = 'ready'
-- Expected: 1 (only [C], not [A])
```

---

## Machine-Verifiable Acceptance Checks

Add to use case `uc-revenue-alert-dedup`:

```json
{
  "acceptance_checks": [
    {
      "id": "check-1-no-duplicates",
      "name": "No duplicate revenue alerts in ready status",
      "command": "sqlite3 <<EOF\nSELECT COUNT(*) FROM tasks WHERE agent_id='product' AND title LIKE 'PM: Revenue alert%' AND status='ready';\nEOF",
      "expected": "1"
    },
    {
      "id": "check-2-no-loops",
      "name": "No loop detection tasks in 24h",
      "command": "sqlite3 <<EOF\nSELECT COUNT(*) FROM tasks WHERE title LIKE 'PM: Loop detected%' AND created_at > datetime('now', '-1 day');\nEOF",
      "expected": "0"
    },
    {
      "id": "check-3-dedup-logging",
      "name": "Deduplication logging in revenue-collector logs",
      "command": "grep -c 'Task already exists' ~/.openclaw/genome/logs/revenue-collector.log 2>/dev/null || echo 0",
      "expected": "1"
    }
  ]
}
```

---

## Handler Analysis

### Loop Detector (Source of Truth)
**Location:** `~/.openclaw/genome/core/task-store.js`, lines 150-165  
**Status:** ✅ **Working Correctly**

The loop detector:
1. ✅ Checks for 3+ tasks with matching title prefix in 2h window
2. ✅ Creates exactly 1 "PM: Loop detected" meta-task per unique loop
3. ✅ Includes the problematic task title in the meta-task description
4. ✅ Prevents re-creation of the same meta-task (checks for existing)
5. ✅ Has error handling

**Verdict:** The handler is not broken. It's doing its job correctly by detecting and escalating the loop. The real issue is upstream in revenue-collector.

### Revenue Collector (Root Cause)
**Location:** `~/.openclaw/genome/scripts/revenue-collector.js`, lines 313-338  
**Status:** ❌ **Missing Deduplication Logic**

The revenue collector creates idempotent failures:
- Same business condition (MRR=$15K, critical) → Same task created every 30 seconds
- System loop detector correctly identifies this as a problem
- But the real fix must be in the revenue collector, not the loop detector

**Verdict:** This is where the fix must be implemented.

---

## Rollout Plan

### Phase 1: Dev Implementation
**Owner:** Dev Agent (Genome)  
**Duration:** 2-4 hours  
**File:** `~/.openclaw/genome/scripts/revenue-collector.js`  
**Changes:**
1. Add dedup query to `createRevenueAlertTasks()` function
2. Update function signature to accept TaskStore instance
3. Update `collectRevenue()` to pass TaskStore to the function
4. Enhance logging and metadata
5. Add JSDoc updates

### Phase 2: QC Validation
**Owner:** QC Agent  
**Duration:** 2-4 hours  
**Tests:**
- Run all 3 E2E scenarios above
- Verify no loop detection tasks created for 24h
- Check logs for dedup patterns
- Verify task count remains stable over 2h of heartbeats

### Phase 3: Production Rollout
**Owner:** Orchestrator  
**Duration:** <30 minutes  
**Steps:**
1. Merge to Genome repo
2. Update deployed revenue-collector.js
3. Monitor logs for "Task already exists" patterns
4. Verify loop detection silent for 24+ hours

---

## Dependencies

- **TaskStore API:** Already available, used elsewhere in heartbeat
- **Supabase (PostgreSQL) access:** Already configured in revenue-collector.js
- **Backward Compatibility:** Change is additive, doesn't break existing code

---

## Related Documentation

- **Loop Detection Code:** `~/.openclaw/genome/core/task-store.js` (lines 150-165)
- **Revenue Collector:** `~/.openclaw/genome/scripts/revenue-collector.js` (lines 313-338)
- **Heartbeat Executor:** `~/.openclaw/genome/core/heartbeat-executor.js` (calls revenue-collector)
- **Project Goals:** `/Users/clawdbot/projects/leadflow/project.config.json` (goals section)
- **Related PRD:** `PRD-REVENUE-COLLECTOR-DEDUP.md`
- **Related UC:** `uc-revenue-alert-dedup` (use case)

---

## Sign-Off

**PM Review:** ✅ Investigation Complete — Handler Is Correct, Fix Required in Revenue Collector  
**Loop Detector Status:** ✅ Working as designed  
**Revenue Collector Status:** ❌ Missing deduplication logic  
**Next Step:** Dev agent implements dedup logic in revenue-collector.js

