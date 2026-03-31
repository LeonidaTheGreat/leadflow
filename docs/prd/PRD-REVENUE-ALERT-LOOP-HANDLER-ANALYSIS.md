# PRD: Revenue Alert Loop — Handler Analysis & Deduplication Spec

**PRD ID:** `prd-revenue-alert-loop-handler-analysis`  
**Status:** Analysis Complete — Ready for Dev Implementation  
**Priority:** 1 (Blocker — consumes PM task capacity every heartbeat)  
**Owner:** Product Manager  
**Created:** 2026-03-30  
**Updated:** 2026-03-30

---

## Executive Summary

The "PM: Revenue alert — critical (mrr)" loop is caused by `revenue-collector.js` (Genome Loop 5) creating duplicate revenue alert tasks every heartbeat **without checking if an active task already exists**. The loop detector is working correctly and detecting this idempotent failure, but the root cause is in the revenue collector source code, not the loop detector.

**Current status:**
- ✅ Loop detector is working as designed — it correctly identifies 3+ tasks in 2h window and creates investigation task
- ❌ Revenue collector is missing deduplication logic — creates same task every 30 seconds when revenue is off-track
- ⚠️ Result: False-positive loop alerts, PM task queue pollution, orchestration noise

**The fix is not in the loop detector. The fix is in the revenue collector.**

---

## Problem Statement

### What's Happening

Every ~30 seconds (one heartbeat cycle), the revenue collector runs and checks if MRR meets goal targets. When MRR is behind target (e.g., $15K actual vs $20K goal = "critical" status), it creates a task with title:

```
PM: Revenue alert — critical (mrr)
```

**The function does not check if this exact task already exists.** So if revenue stays at $15K for an hour:

```
2026-03-30 12:53:00 — Heartbeat 1: "PM: Revenue alert — critical (mrr)" [Task A] created
2026-03-30 13:00:00 — Heartbeat 2: "PM: Revenue alert — critical (mrr)" [Task B] created (DUPLICATE)
2026-03-30 13:07:00 — Heartbeat 3: "PM: Revenue alert — critical (mrr)" [Task C] created (DUPLICATE)
2026-03-30 13:14:00 — Heartbeat 4: Loop detector fires
                   → Creates "PM: Loop detected — PM: Revenue alert — critical (mrr)"
```

One business intent (revenue is behind) → 4 tasks created.

### Impact

1. **Task Queue Pollution** — PM gets assigned 3+ identical tasks instead of 1
2. **Agent Overhead** — PM agent wastes capacity on duplicates (each task is parsed, assigned, attempted)
3. **Meta-Task Noise** — Loop detector creates "PM: Loop detected" tasks, adding more noise
4. **Investigation Burden** — Stojan sees "Loop detected" and has to investigate, when the real issue is known

### Why This Happens

**File:** `~/.openclaw/genome/scripts/revenue-collector.js`  
**Function:** `createRevenueAlertTasks(goalResults)`  
**Lines:** ~313-338

```javascript
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`
    
    // ❌ NO DEDUP CHECK — just creates the task unconditionally
    await store.createTask({
      title,
      agent_id: 'product',
      status: 'ready',
      model: 'sonnet',
      priority: 1,
      tags: ['revenue', 'automated', 'high-priority'],
      description: [ /* ... */ ].join('\n'),
      metadata: { /* ... */ }
    })

    console.log(`  Created PM task for ${result.trajectory} ${result.goal_type} goal`)
  }
}
```

**The problem:** Before calling `store.createTask()`, the function should check if a task with the same title already exists in `ready` status. If it does, skip creation.

---

## Loop Detector Analysis (Handler Status)

### What Is It?

**Location:** `~/.openclaw/genome/core/task-store.js`, lines ~150-165  
**Trigger:** Any task creation that matches pattern

The loop detector runs every time a new task is created. It:
1. Counts tasks with matching title prefix (first 60 chars) created in last 2 hours
2. If count ≥ 3, creates a single "PM: Loop detected" meta-task
3. Includes root task title in description for investigation

### Code

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
      
      // Check if investigation task already exists (don't create duplicates of the meta-task)
      const { data: existingInv } = await this.supabase
        .from('tasks')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('title', invTitle)
        .not('status', 'in', '("done","failed","cancelled")')
        .limit(1)
      
      if (!existingInv?.length) {
        await this.supabase.from('tasks').insert({
          title: invTitle,
          description: `Loop detected: "${task.title}" created ${recentSimilar.length}x in 2h. Investigate the handler.`,
          agent_id: 'product',
          status: 'ready',
          priority: 1,
          project_id: this.projectId,
          tags: ['loop-detection'],
          metadata: { created_by: 'loop-detector' }
        })
      }
      return null  // Don't create the original task
    }
  } catch {}
}
```

### Verdict: ✅ Handler Is Working Correctly

The loop detector:
- ✅ Detects actual loops (3+ identical tasks in 2h window)
- ✅ Creates exactly 1 investigation task per unique loop (deduped)
- ✅ Includes the root task title for investigation context
- ✅ Has error handling (try/catch)
- ✅ Is idempotent for the meta-task itself (checks if investigation already exists)

**The handler is not broken. It's detecting a real problem — but not the problem you want to solve.**

The problem is not "How do we make the loop detector ignore this?" The problem is **"How do we prevent the duplicate tasks from being created in the first place?"**

---

## Solution Design

### Root Cause: No Deduplication in Revenue Collector

The revenue collector must check for existing active tasks before creating new ones.

### Implementation (Genome Dev)

**File:** `~/.openclaw/genome/scripts/revenue-collector.js`  
**Function:** `createRevenueAlertTasks(goalResults, store)`

#### Change 1: Add Store Parameter

```javascript
// Before:
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()
  // ...
}

// After:
async function createRevenueAlertTasks(goalResults, store) {
  // Accept store as parameter (allows access to store.projectId, store.supabase)
  // If not provided, create one (backward compatibility)
  if (!store) {
    const { TaskStore } = require('../core/task-store')
    store = new TaskStore()
  }
  // ...
}
```

#### Change 2: Add Deduplication Check

```javascript
async function createRevenueAlertTasks(goalResults, store) {
  if (!store) {
    const { TaskStore } = require('../core/task-store')
    store = new TaskStore()
  }

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`
    
    // [NEW] Check if an active revenue alert task already exists for this goal + trajectory
    const { data: existingTask } = await store.supabase
      .from('tasks')
      .select('id, status, created_at')
      .eq('project_id', store.projectId)
      .eq('title', title)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingTask && existingTask.length > 0) {
      const existing = existingTask[0]
      const ageMinutes = Math.floor((Date.now() - new Date(existing.created_at)) / 60000)
      console.log(`[Revenue Collector] Task already exists for ${result.trajectory} ${result.goal_type}: skipping (ID: ${existing.id}, age: ${ageMinutes}m)`)
      continue  // Skip creation
    }

    // [EXISTING] Create task as before
    await store.createTask({
      title,
      agent_id: 'product',
      status: 'ready',
      model: 'sonnet',
      priority: 1,
      tags: ['revenue', 'automated', 'high-priority'],
      description: [
        `MRR Status: ${result.trajectory}`,
        `Goal: ${result.goal_type}`,
        `Current: $${result.current}K`,
        `Target: $${result.target}K`,
        `Days remaining: ${result.daysRemaining}`,
        `Recommendation: ${result.recommendation}`
      ].join('\n'),
      metadata: {
        created_by: 'revenue-collector',
        goal_type: result.goal_type,
        trajectory: result.trajectory,
        current: result.current,
        target: result.target,
        deduplication_check: 'performed'  // [NEW]
      }
    })

    console.log(`[Revenue Collector] Created PM task for ${result.trajectory} ${result.goal_type} goal`)
  }
}
```

#### Change 3: Update Caller

In `collectRevenue()` function, pass store to `createRevenueAlertTasks()`:

```javascript
async function collectRevenue() {
  // ... existing code ...
  
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()
  
  // Pass store as second parameter
  await createRevenueAlertTasks(goalResults, store)
}
```

---

## Acceptance Criteria

### AC-1: No Duplicate Revenue Alert Tasks in Ready Status
- **Test:** Run `collectRevenue()` twice in succession with identical MRR data
- **Expected:** Only 1 task with title `PM: Revenue alert — {trajectory} ({goal_type})` exists in ready status
- **Verify:**
  ```sql
  SELECT COUNT(*) FROM tasks 
  WHERE agent_id = 'product'
  AND title LIKE 'PM: Revenue alert%'
  AND status = 'ready'
  -- Expected: 1
  ```

### AC-2: Loop Detector Does Not Trigger
- **Test:** Let heartbeat run for 2 hours without changing revenue data
- **Expected:** No new "PM: Loop detected — PM: Revenue alert" tasks created
- **Verify:**
  ```sql
  SELECT COUNT(*) FROM tasks
  WHERE title LIKE 'PM: Loop detected — PM: Revenue alert%'
  AND created_at > NOW() - INTERVAL '2 hours'
  -- Expected: 0 new tasks created after fix
  ```

### AC-3: Deduplication Logs Are Present
- **Test:** Verify revenue-collector.js logs show dedup pattern
- **Expected:** Logs contain `[Revenue Collector] Task already exists` messages
- **Verify:** `grep -c "Task already exists" ~/.openclaw/genome/logs/revenue-collector.log` should be > 0

### AC-4: New Alerts Created When Trajectory Changes
- **Test:** Start with trajectory='behind', update metrics to trajectory='critical'
- **Expected:** New task created with different title
- **Verify:** Both tasks appear in ready status with different titles

### AC-5: Completed Tasks Allow New Alerts
- **Test:** Mark old revenue alert task as 'done', run heartbeat with same off-track goal
- **Expected:** New task created (done task doesn't block)
- **Verify:** New task exists with same title but different ID and creation time

---

## E2E Test Scenarios

### Test Scenario 1: Deduplication Prevents Second Create

**Setup:**
- MRR = $15K (goal = $20K, trajectory = 'critical')
- No existing "PM: Revenue alert — critical (mrr)" task

**Test Steps:**
1. Run `collectRevenue()` → finds MRR is critical
2. Calls `createRevenueAlertTasks()` → no existing task found → creates Task [A]
3. Run `collectRevenue()` again 30 seconds later with MRR still $15K
4. Calls `createRevenueAlertTasks()` → finds Task [A] exists → skips creation
5. Verify logs show dedup pattern

**Expected Outcome:**
- Exactly 1 "PM: Revenue alert — critical (mrr)" task in ready status
- Log shows: `[Revenue Collector] Task already exists for critical mrr: skipping (ID: {A_id}, age: 0m)`
- No new loop detection task created after 2 hours

**Automated Check:**
```bash
psql "postgresql://clawdbot@localhost/openclaw" -c "
SELECT COUNT(*) as task_count FROM tasks 
WHERE agent_id = 'product'
AND title = 'PM: Revenue alert — critical (mrr)'
AND status = 'ready'
" 
# Expected: 1
```

### Test Scenario 2: Trajectory Change Creates New Task

**Setup:**
- Task [A] exists: "PM: Revenue alert — critical (mrr)" (created 30m ago)
- MRR improves from $15K → $18K (new trajectory = 'behind')

**Test Steps:**
1. Run `collectRevenue()` → MRR=$18K shows trajectory='behind'
2. Calls `createRevenueAlertTasks()` with trajectory='behind'
3. Queries for "PM: Revenue alert — behind (mrr)" → finds none
4. Creates new Task [B]
5. Task [A] remains unchanged

**Expected Outcome:**
- Task [A]: "PM: Revenue alert — critical (mrr)" still exists in ready
- Task [B]: "PM: Revenue alert — behind (mrr)" newly created
- Both tasks in queue, PM investigates latest status

**Automated Check:**
```bash
psql "postgresql://clawdbot@localhost/openclaw" -c "
SELECT title, COUNT(*) FROM tasks 
WHERE agent_id = 'product'
AND title LIKE 'PM: Revenue alert%'
AND status = 'ready'
GROUP BY title
"
# Expected output:
#              title               | count
# --------------------------------+-------
#  PM: Revenue alert — behind (mrr) |   1
#  PM: Revenue alert — critical (mrr) |   1
```

### Test Scenario 3: Done Tasks Don't Block New Creation

**Setup:**
- Task [A] exists: "PM: Revenue alert — critical (mrr)" with status='done' (completed 24h ago)
- MRR still critical at $15K

**Test Steps:**
1. Run `collectRevenue()` → MRR=$15K shows trajectory='critical'
2. Calls `createRevenueAlertTasks()` with trajectory='critical'
3. Queries for "PM: Revenue alert — critical (mrr)" with status='ready' → finds none (A is done)
4. Creates new Task [C]

**Expected Outcome:**
- Task [A]: still in done status, unchanged
- Task [C]: newly created with same title, different ID
- Log shows: `[Revenue Collector] Created PM task for critical mrr goal`

**Automated Check:**
```bash
psql "postgresql://clawdbot@localhost/openclaw" -c "
SELECT id, status, created_at FROM tasks 
WHERE agent_id = 'product'
AND title = 'PM: Revenue alert — critical (mrr)'
ORDER BY created_at DESC
LIMIT 2
"
# Expected: 2 rows (one done, one ready, different IDs/timestamps)
```

---

## Machine-Verifiable Acceptance Checks

For use case `uc-revenue-alert-dedup`, add these automated checks:

```json
{
  "acceptance_checks": [
    {
      "id": "check-dedup-no-duplicates",
      "command": "psql 'postgresql://clawdbot@localhost/openclaw' -t -c \"SELECT COUNT(*) FROM tasks WHERE agent_id='product' AND title LIKE 'PM: Revenue alert%' AND status='ready'\"",
      "expected": "1"
    },
    {
      "id": "check-dedup-no-loops-24h",
      "command": "psql 'postgresql://clawdbot@localhost/openclaw' -t -c \"SELECT COUNT(*) FROM tasks WHERE title LIKE 'PM: Loop detected — PM: Revenue alert%' AND created_at > NOW() - INTERVAL '24 hours'\"",
      "expected": "0"
    },
    {
      "id": "check-dedup-logging",
      "command": "grep -c 'Task already exists' ~/.openclaw/genome/logs/revenue-collector.log 2>/dev/null || echo 0",
      "expected": "> 0"
    },
    {
      "id": "check-heartbeat-idempotent",
      "command": "node -e \"const rc = require('~/.openclaw/genome/scripts/revenue-collector.js'); rc.testDedup().then(r => console.log(r ? 'pass' : 'fail'))\" 2>/dev/null || echo 0",
      "expected": "pass"
    }
  ]
}
```

---

## Implementation Order

1. **[GENOME-DEV]** Implement deduplication in revenue-collector.js
   - Add store parameter
   - Add dedup query before task creation
   - Update caller in collectRevenue()
   - Add logging

2. **[GENOME-DEV]** Test locally
   - Run `collectRevenue()` 3 times with same data
   - Verify only 1 task created
   - Check logs for dedup messages

3. **[QC]** Run all 5 acceptance criteria
   - Verify no duplicates in ready status
   - Verify no new loop detection in 2h
   - Verify dedup logs present
   - Verify trajectory change creates new task
   - Verify done tasks don't block

4. **[ORCHESTRATOR]** Deploy to production
   - Merge to Genome repo
   - Monitor logs for 24h
   - Confirm loop detector silent

---

## Migration/Rollout

This fix requires no database migrations or data cleanup. It's a pure code change:
- When deployed, future heartbeats use dedup logic
- Existing duplicate tasks remain in database (for audit trail)
- No retroactive cleanup needed

**Estimated Time to Fix:** 2-3 hours (dev + testing)  
**Risk Level:** Low (additive logic, no breaking changes)

---

## Related Documentation

- **Loop Detector Code:** `~/.openclaw/genome/core/task-store.js` (lines 150-165)
- **Revenue Collector:** `~/.openclaw/genome/scripts/revenue-collector.js` (lines 313-338)
- **Heartbeat Executor:** `~/.openclaw/genome/core/heartbeat-executor.js` (calls revenue-collector)
- **Project Goals:** `/Users/clawdbot/projects/leadflow/project.config.json` (goals section)
- **Related Use Case:** `uc-revenue-alert-dedup`

---

## Sign-Off

**Investigation Status:** ✅ Complete — Handler is working correctly  
**Handler Verdict:** ✅ Loop detector working as designed — detects actual loops  
**Root Cause:** ❌ Revenue collector missing deduplication check  
**Next Step:** Genome Dev agent implements dedup logic in revenue-collector.js

---

## Notes for Developer

- The `revenue-collector.js` already has access to Supabase via the TaskStore instance it creates
- The dedup query should only check `status = 'ready'` (not done/failed/cancelled)
- Query timeout is critical: keep the dedup query fast (indexed on title + status)
- Add detailed logging so PM can verify dedup is happening
- Consider adding a `deduplication_check: 'performed'` flag to task metadata for audit
