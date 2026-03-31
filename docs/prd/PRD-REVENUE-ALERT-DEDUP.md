# PRD: Revenue Alert Task Deduplication

**PRD ID:** `prd-revenue-alert-dedup`  
**Status:** READY  
**Created:** 2026-03-30  
**Priority:** 1 (Blocker)

---

## Problem Statement

The `revenue-collector.js` script unconditionally creates a new "PM: Revenue alert" task every time the heartbeat runs and detects an off-track revenue goal. This causes:

1. **Duplicate task creation** — 3+ identical tasks created within 2 hours during stable conditions
2. **Task spam** — PM agent gets repeatedly spawned on the same issue
3. **Orphaned context** — Each task has identical context, wasting model budget and agent execution time
4. **No escalation signal** — Inability to distinguish between "same problem persisting" and "new problem emerging"

### Root Cause
The `createRevenueAlertTasks()` function (line 261-293 in `revenue-collector.js`) creates a task for every goal in the results array without checking if a task already exists for that goal.

---

## Acceptance Criteria

### 1. **Deduplication Logic**
- ✅ Before creating a "PM: Revenue alert" task, query the task store for existing tasks with:
  - `title` matching `PM: Revenue alert — {trajectory} ({goal_type})`
  - `status` in ['ready', 'running', 'in_progress']
  - `created_at` within the last 60 minutes
- ✅ If such a task exists, **skip creation** and log it
- ✅ If no such task exists, create a new task

### 2. **Trajectory Change Detection**
- ✅ Query the most recent completed "PM: Revenue alert" task (if any) for the same goal_type
- ✅ If the trajectory **changed** (e.g., "on_track" → "critical"), create a new task immediately
- ✅ If the trajectory **is the same**, respect the 60-minute throttle

### 3. **Logging & Observability**
- ✅ Log when a task is skipped due to deduplication
- ✅ Include in logs: `goal_type`, `trajectory`, `existing_task_id`, `gap_percent`
- ✅ Add comment to the existing task with: current gap %, current_value, daysRemaining

### 4. **Task Metadata for Tracking**
- ✅ Add `dedup_key` to task metadata: `revenue-alert-{goal_type}`
- ✅ Add `last_check` timestamp to task metadata (when it was last checked)
- ✅ Add `trajectory_history` to task metadata: `['critical', 'critical']` (to track changes)

---

## User Stories

### US-1: PM Receives Revenue Alerts Without Spam
**Given** a revenue goal is off-track  
**When** the heartbeat runs  
**Then** a single "PM: Revenue alert" task exists for that goal  
**And** the task is not duplicated on subsequent heartbeats  
**And** the task metadata includes the latest gap %, current_value, daysRemaining

### US-2: PM Notices When Trajectory Changes
**Given** a revenue goal was "behind" on the last heartbeat  
**When** the heartbeat runs and the goal is now "critical"  
**Then** a new task is created immediately (dedup window bypassed)  
**And** PM is notified of the escalation

### US-3: PM Sees Throttle Info in Logs
**Given** a revenue alert task exists within the last 60 minutes  
**When** the revenue-collector runs again  
**Then** the log shows: `Skipped: revenue-alert-mrr (existing task already created 15m ago)`

---

## Specification

### Changes to `revenue-collector.js`

#### 1. Import TaskStore
```javascript
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const dedupKey = `revenue-alert-${result.goal_type}`
    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`

    // ✅ NEW: Check for existing task
    const existingTask = await findRecentTask(store, dedupKey, title)
    
    if (existingTask) {
      // ✅ NEW: Update existing task metadata with latest data
      await updateTaskMetadata(store, existingTask.id, result)
      console.log(`  Skipped: ${dedupKey} (existing task ${existingTask.id} created ${existingTask.minutesAgo}m ago)`)
      continue
    }

    // ✅ Create new task only if no recent duplicate
    await store.createTask({
      title,
      agent_id: 'product',
      status: 'ready',
      model: 'sonnet',
      priority: 1,
      tags: ['revenue', 'automated', 'high-priority'],
      description: buildTaskDescription(result),
      metadata: {
        created_by: 'revenue-collector',
        goal_type: result.goal_type,
        trajectory: result.trajectory,
        dedup_key: dedupKey,
        gap_percent: result.gapPercent,
        current_value: result.current,
        days_remaining: result.daysRemaining,
        last_check: new Date().toISOString(),
        trajectory_history: [result.trajectory]
      }
    })

    console.log(`  Created PM task for ${result.trajectory} ${result.goal_type} goal`)
  }
}
```

#### 2. Helper: Find Recent Task
```javascript
async function findRecentTask(store, dedupKey, title) {
  // Query task store for recent task with matching dedup_key
  const recentTasks = await store.query({
    title,
    status: { $in: ['ready', 'running', 'in_progress'] },
    metadata: { dedup_key }
  })

  if (recentTasks && recentTasks.length > 0) {
    const task = recentTasks[0]
    const createdAt = new Date(task.created_at)
    const minutesAgo = Math.round((Date.now() - createdAt) / 60000)
    
    if (minutesAgo < 60) {  // Within 60-minute window
      return { id: task.id, minutesAgo, ...task }
    }
  }

  return null
}
```

#### 3. Helper: Update Task Metadata
```javascript
async function updateTaskMetadata(store, taskId, result) {
  // Append to trajectory_history
  const task = await store.getTask(taskId)
  const history = task.metadata?.trajectory_history || []
  
  await store.updateTask(taskId, {
    metadata: {
      ...task.metadata,
      gap_percent: result.gapPercent,
      current_value: result.current,
      days_remaining: result.daysRemaining,
      last_check: new Date().toISOString(),
      trajectory_history: [...history, result.trajectory]
    }
  })
}
```

#### 4. Helper: Build Task Description
```javascript
function buildTaskDescription(result) {
  return [
    `Revenue Goal: $${result.target.toLocaleString()} ${result.goal_type.toUpperCase()}`,
    `Current: $${result.current.toLocaleString()} (${result.gapPercent}% vs expected)`,
    `Trajectory: ${result.trajectory} | Days remaining: ${result.daysRemaining}`,
    '',
    `Action: ${result.recommendation}`,
    '',
    'Tasks:',
    '1. Analyze current conversion funnel for bottlenecks',
    '2. Review and reprioritize use cases by revenue impact',
    '3. Recommend 2-3 specific actions to close the gap',
    '4. Update use_case priorities based on analysis'
  ].join('\n')
}
```

---

## E2E Test Specification

### Test 1: No Duplicate on Stable Condition
**Setup:** Goal is "behind" (-15% gap)  
**Step 1:** Run heartbeat → creates task T1 at 12:00pm  
**Step 2:** Wait 5 minutes  
**Step 3:** Run heartbeat → goal still "behind", same gap  
**Expected:** No new task created; T1 still exists with `last_check` = 12:05pm  
**Pass:** Task count is 1, not 2

### Test 2: New Task on Trajectory Change
**Setup:** Goal was "behind" (-15% gap), now "critical" (-35% gap)  
**Step 1:** Task T1 exists from previous heartbeat  
**Step 2:** Revenue collector runs with new trajectory "critical"  
**Expected:** New task T2 created immediately; T1 and T2 both exist  
**Pass:** Task count is 2; T2.created_at > T1.created_at

### Test 3: New Task After 60-Minute Window
**Setup:** Task T1 created 65 minutes ago with trajectory "behind"  
**Step 1:** Revenue collector runs with same trajectory "behind"  
**Expected:** New task T2 created (window expired)  
**Pass:** Task count is 2

### Test 4: Metadata Preserved on Dedup
**Setup:** Task T1 exists with trajectory_history = ["critical"]  
**Step 1:** Revenue collector runs with same trajectory "critical"  
**Expected:** T1.metadata.trajectory_history updated to ["critical", "critical"]  
**Pass:** Task T1 is unchanged; metadata reflects latest check

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Duplicate Tasks Eliminated** | 0 | Task count for same goal_type stays constant over 3 heartbeats |
| **Task Spam Reduction** | 95% | No more than 1 task per goal_type per 60-minute window |
| **Observability** | 100% | All dedup decisions logged with timestamps and reasons |
| **Trajectory Sensitivity** | 100% | New task created within 1 heartbeat of trajectory change |

---

## Deployment

This fix will be deployed to:
- ✅ Genome orchestration engine (`~/.openclaw/genome/scripts/revenue-collector.js`)
- ✅ No product/leadflow code changes required

Once merged, all future heartbeat runs will deduplicate revenue alert tasks automatically.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Task dedup window too long, PM misses worsening condition | Monitor trajectory_history in task metadata; reduce window to 30min if needed |
| Query performance on large task store | Index on `metadata.dedup_key` and `status`; batch queries |
| PM task already claimed/in progress when new task needed | Check task status before update; don't update if status is 'running' |

---

## Implementation Notes

- This is a **pure specification** task — no code changes to leadflow product
- All changes are scoped to `~/.openclaw/genome/scripts/revenue-collector.js`
- Requires TaskStore query/update capabilities (verify in task-store.js)
- Zero changes to Supabase schema — metadata already supports arbitrary JSON
