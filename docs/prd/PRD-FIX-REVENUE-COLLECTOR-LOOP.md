# PRD-FIX-REVENUE-COLLECTOR-LOOP — Fix Revenue Collector Task Loop Detection

**PRD ID:** `fix-revenue-collector-loop`
**Status:** Ready for Implementation
**Priority:** P1 (Blocker)
**Version:** 1.0

## Problem Statement

The revenue-collector (Loop 5) creates duplicate "PM: Revenue alert — critical (mrr)" tasks on every heartbeat when revenue is off-track. After ~30 seconds (the heartbeat interval), the same task title is created again, causing 3+ duplicates within 2 hours. This triggers the task-store's loop detector, which creates a "PM: Loop detected" meta-task.

**Current Behavior:**
- Heartbeat runs every ~30 seconds
- `revenue-collector.js` → `collectRevenue()` → `checkGoalProgress()` → `createRevenueAlertTasks()`
- For each off-track goal, a task is created **without checking if one already exists**
- Result: Identical task titles created every 30 seconds
- Task-store detects 3+ duplicates within 2h window, creates loop-detection task

**Impact:**
- False positive loop detection
- Task queue polluted with near-identical tasks
- Meta-task (loop detector) consumes PM capacity
- Orchestration noise increases, making real issues hard to spot

## Solution Design

### Root Cause
The `createRevenueAlertTasks()` function does not:
1. Check for existing, active revenue alert tasks before creating new ones
2. Deduplicate by goal type + trajectory (which should be static during a goal period)
3. Skip task creation if one with the same goal + trajectory already exists

### Implementation Requirements

#### File: `~/projects/genome/scripts/revenue-collector.js`

**Function:** `createRevenueAlertTasks(goalResults)`

**Change:** Before creating a task, check if an active task already exists for the same goal type and trajectory.

**Pseudocode:**
```javascript
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`
    
    // [NEW] Check if an active revenue alert task already exists for this goal + trajectory
    const existingTask = await store.supabase
      .from('tasks')
      .select('id, status, created_at')
      .eq('project_id', store.projectId)
      .eq('title', title)
      .eq('status', 'ready')  // Only check for 'ready' status, ignore done/failed
      .order('created_at', { ascending: false })
      .limit(1)

    if (existingTask?.data?.length > 0) {
      console.log(`  Task already exists for ${result.trajectory} ${result.goal_type}: skipping`)
      continue
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

    console.log(`  Created PM task for ${result.trajectory} ${result.goal_type} goal`)
  }
}
```

### Key Design Decisions

1. **Query Scope:** Only check for tasks with status='ready'. Tasks that are 'done', 'failed', or 'cancelled' should not block new alerts (they represent old closed issues).

2. **Matching Criteria:** Match by exact `title` because the title encodes both goal_type and trajectory. If trajectory changes (e.g., from 'behind' to 'critical'), the old task should naturally close and a new alert should fire.

3. **Idempotent:** Repeated calls to `collectRevenue()` in the same heartbeat or neighboring heartbeats will not create duplicate tasks. This prevents the loop detector from triggering.

## Acceptance Criteria

### 1. No Duplicate Revenue Alert Tasks in Ready Status
- **Test:** Run `collectRevenue()` twice in succession with identical MRR data
- **Expected:** Only 1 task with title `PM: Revenue alert — {trajectory} ({goal_type})` exists in ready status
- **Verify:** Query tasks table where `status = 'ready'` and `title LIKE 'PM: Revenue alert%'` — count should be 1

### 2. Loop Detector Does Not Trigger
- **Test:** Let heartbeat run for 2 hours without changing revenue data
- **Expected:** No new "PM: Loop detected — PM: Revenue alert" tasks created
- **Verify:** Check realtime-dispatcher.log for absence of loop-detection task creation

### 3. New Alerts Created When Trajectory Changes
- **Test:** Start with trajectory='behind', then update revenue_metrics to show trajectory='critical'
- **Expected:** Old task remains, new task created with 'critical' in title
- **Verify:** Both tasks appear in ready status with different titles

### 4. Completed Revenue Tasks Don't Block New Alerts
- **Test:** Mark an old revenue alert task as 'done', then run `collectRevenue()` with same off-track goal
- **Expected:** New task created (done task doesn't block it)
- **Verify:** Query returns only the new task, not the old done one

## Implementation Notes

- **File Location:** `~/projects/genome/scripts/revenue-collector.js` (in orchestration repo, not leadflow)
- **Dependencies:** Already has `TaskStore` imported
- **Testing:** Can be tested standalone: `node revenue-collector.js` after updating code
- **Backward Compatibility:** Change is additive (adds check, doesn't break existing behavior)

## Timeline
- **Implementation:** Dev agent (genome project)
- **QC Validation:** Verify loop detector not triggered for 24h after merge
- **Deployment:** Automatic via Genome CI/CD

## Related Documentation
- Loop Detection: `task-store.js` → `createTask()` function, lines ~150-160
- Revenue Collector: `revenue-collector.js` → `createRevenueAlertTasks()` function
- Heartbeat Loop Architecture: `~/projects/genome/ARCHITECTURE.md`
- Task Lifecycle: `~/projects/genome/docs/TASK-LIFECYCLE.md`

