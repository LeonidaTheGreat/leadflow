# PRD: Revenue Alert Idempotency & Loop Prevention

**PRD ID:** prd-revenue-alert-idempotency  
**Status:** SPECIFICATION  
**Version:** 1.0  
**Created:** 2026-03-31  
**Product Manager:** @product_manager_leadflow_bot  
**Priority:** P1 (Blocker — Prevents reliable PM workflow)

---

## Executive Summary

The revenue-collector script (Loop 5 of heartbeat orchestration) creates **duplicate task alerts** every heartbeat when revenue metrics are off-track. When MRR is critical, the system spawns an identical "PM: Revenue alert" task multiple times per heartbeat cycle, causing:

- **Agent resource waste:** PM agent gets spawned 3+ times per heartbeat on the same issue
- **Agent timeout cascade:** Multiple concurrent PM agents fighting over the same problem → auth failures → infinite task recreation
- **Unclear current state:** PM doesn't know which alert is active vs. stale
- **Loop detection noise:** System interprets repeated task creation as a handler loop (false positive)
- **Task queue bloat:** 10+ identical tasks accumulate in 6 hours

**Root Cause:** `createRevenueAlertTasks()` in `~/projects/genome/scripts/revenue-collector.js` creates a new PM task for every heartbeat where revenue is off-track, without checking if an identical alert already exists.

**Current Behavior:**
```
Heartbeat 1 (10:00) → MRR critical → Create "PM: Revenue alert — critical (mrr)"
Heartbeat 2 (10:15) → MRR still critical → Create ANOTHER "PM: Revenue alert — critical (mrr)"
Heartbeat 3 (10:30) → MRR still critical → Create ANOTHER "PM: Revenue alert — critical (mrr)"
...
```

**Expected Behavior:**
```
Heartbeat 1 (10:00) → MRR critical → Create "PM: Revenue alert — critical (mrr)" [task-1]
Heartbeat 2 (10:15) → MRR still critical → Skip (task-1 exists in_progress)
Heartbeat 3 (10:30) → MRR still critical → Skip (task-1 exists in_progress)
Heartbeat 4 (11:00) → MRR improved to "behind" → Create "PM: Revenue alert — behind (mrr)" [task-2]
```

This specification defines the requirements for **idempotent revenue alert task creation** with trajectory-based versioning and comprehensive loop prevention.

---

## Problem Analysis

### Symptoms Observed (2026-03-30 to 2026-03-31)

1. **Task Duplication:**
   - Database shows 10+ tasks with identical title `PM: Revenue alert — critical (mrr)` created between 12:50 PM - 6:19 PM
   - Created within 15-30 minute intervals (matching heartbeat cadence)
   - All have same agent_id, priority, description

2. **Agent Cascade Failures:**
   - PM agent spawns and attempts to process alert
   - Auth cooldown for `moonshot` model kicks in (FailoverError: No available auth profile)
   - PM task marked as failed, not completed
   - New heartbeat sees incomplete task, environment unchanged, creates new task
   - Loop perpetuates: create → fail → create → fail

3. **Loop Detection False Positives:**
   - Loop detector sees 3+ identical tasks created in quick succession
   - Triggers "PM: Loop detected — revenue-alert" task
   - PM has to triage both the original alert AND the false positive loop alert

4. **Task Queue Visibility Issues:**
   - PM cannot tell which revenue alert task is "current"
   - Are we on version 1 of the critical MRR alert, or version 3?
   - Did the situation improve between task-1 and task-5, or stay the same?

### Root Cause Analysis

**Primary Cause:** Stateless task creation logic in revenue-collector.js

The function `createRevenueAlertTasks(goalResults)` iterates over off-track goals and calls `store.createTask()` for each without:
- Checking if a task for that goal + trajectory already exists
- Checking the status of any existing task (ready? in_progress? completed?)
- Comparing current trajectory against the previous heartbeat's trajectory

**Secondary Cause (contributing):** Missing dedup_key persistence

TaskStore is designed to prevent duplicate tasks via the `dedup_key` field:
- When createTask() is called with `dedup_key: "revenue:mrr:critical"`
- TaskStore should check if a task with that dedup_key exists in ready/in_progress/spawned status
- If yes, skip creation
- If no, insert and set the dedup_key in the database

However, analysis shows:
- Tasks are being created WITH dedup_key in the function call
- But the database shows `dedup_key = NULL` on inserted tasks
- Dedup check is failing or being skipped

**Tertiary Cause (contributing):** No trajectory state tracking

Previous heartbeat trajectory information is not stored, so revenue-collector cannot distinguish between:
- "Goal was critical, still critical" (no change) → skip task
- "Goal was behind, now critical" (worsened) → create new task
- "Goal was critical, now behind" (improved) → create new task

---

## Requirements

### Functional Requirements

#### FR-1: Idempotent Task Creation with Trajectory Matching
Before creating any revenue alert task, the system MUST check if an identical or superseded alert already exists.

**Definition of "identical":**
- Same title: `PM: Revenue alert — ${trajectory} (${goal_type})`
- Same agent_id: `product-manager`
- Status in: `ready`, `in_progress`, or `spawned`
- Created within the last **48 hours**

**Decision Logic:**
```
For each off-track goal in goalResults:
  
  trajectory = calculateTrajectory(goal)  # e.g., "critical", "behind", "on_track"
  
  IF trajectory == "on_track":
    → Skip (goal is not off-track)
  
  title = `PM: Revenue alert — ${trajectory} (${goal_type})`
  existingTasks = query tasks with:
    - title = exact match
    - agent_id = "product-manager"
    - status in ["ready", "in_progress", "spawned"]
    - created_at > NOW() - 48 hours
  
  IF existingTasks.length > 0:
    → Log "Skipped: Revenue alert exists for ${goal_type}/${trajectory} (task ${existingTasks[0].id}, status: ${existingTasks[0].status})"
    → Continue to next goal (do NOT create)
  
  ELSE:
    → Log "Creating: New revenue alert for ${goal_type}/${trajectory}"
    → Create task with:
        - title = title
        - description = [details below]
        - agent_id = "product-manager"
        - priority = 1 (critical)
        - dedup_key = `revenue:${goal_type}:${trajectory}` (for secondary loop detection)
        - tags = ["revenue-alert", "automated", "idempotent"]
        - metadata = {
            created_by: "revenue-collector",
            goal_type: goal_type,
            trajectory: trajectory,
            created_at: ISO timestamp,
            goal_snapshot: { /* full goal object */ }
          }
```

#### FR-2: Trajectory-Based Task Versioning
When a goal's trajectory changes, a new task must be created with a version indicator.

**Trajectory States:**
- `ahead` — Goal is ahead of target (MRR > target_for_day)
- `on_track` — Goal is on target (target_for_day - 5% < MRR < target_for_day)
- `behind` — Goal is behind target but recoverable (target_for_day * 0.7 < MRR < target_for_day - 5%)
- `critical` — Goal is critically behind (MRR < target_for_day * 0.7)

**Versioning Behavior:**
```
Day 1, 10:00 → critical MRR → Create task "PM: Revenue alert — critical (mrr)" [task-1]
Day 1, 11:00 → still critical → Skip (task-1 in_progress)
Day 1, 14:00 → improved to behind → Create task "PM: Revenue alert — behind (mrr)" [task-2]
Day 2, 09:00 → worsened back to critical → Create task "PM: Revenue alert — critical (mrr)" [task-3]
Day 2, 10:00 → still critical → Skip (task-3 in_progress)
```

Each unique trajectory gets its own task (even if the goal is the same). This allows PM to see the full trajectory history of a goal over time.

#### FR-3: Task Status Awareness
Before creating a task, actively check the status of any existing task for that goal.

**Status-Based Decisions:**
```
existing_task.status = ?

IF "ready" or "spawned":
  → Task is queued but not started
  → Skip (system is still waiting for agent to pick it up)

IF "in_progress":
  → Task is being processed by PM agent
  → Skip (let current agent finish before creating a new one)

IF "completed" or "failed" or "cancelled":
  → Previous alert was processed/abandoned
  → If trajectory changed: Create new task
  → If trajectory unchanged: Check age; if > 48h, allow new task

IF age > 48 hours:
  → Task is stale (>2 days old)
  → Log warning: "Revenue alert for ${goal_type}/${trajectory} is STALE (task ${id}, age: ${age}h)"
  → Create a new task (force escalation)
```

#### FR-4: Dedup Key Persistence & Validation
The TaskStore must ensure that every revenue alert task has a properly persisted dedup_key for secondary loop detection.

**Dedup Key Format:**
```
dedup_key = `revenue:${goal_type}:${trajectory}`
Examples:
  revenue:mrr:critical
  revenue:mrr:behind
  revenue:bookings:critical
  revenue:conversions:behind
```

**Persistence Requirement:**
- When createTask() is called with dedup_key, it MUST be inserted into the database
- Query verification: `SELECT dedup_key FROM tasks WHERE id = '${task_id}';` must return the dedup_key, not NULL
- Schema requirement: `tasks` table must have `dedup_key` column (VARCHAR, nullable)
- Index: `CREATE INDEX idx_tasks_dedup ON tasks(project_id, dedup_key) WHERE dedup_key IS NOT NULL;`

**Validation in TaskStore:**
```javascript
// In TaskStore.createTask() or a pre-validation function:
if (params.metadata?.created_by === 'revenue-collector') {
  if (!params.dedup_key) {
    throw new Error(`Automated tasks must have dedup_key. Got: ${params.dedup_key}`);
  }
}
// Insert normally; dedup_key field must be included in insert statement
```

#### FR-5: Comprehensive Logging
Every create/skip decision must be logged with full context for observability.

**Log Format:**
```
[${timestamp}] [revenue-collector] [${level}] ${message}

Examples:
[2026-03-31T12:00:00Z] [revenue-collector] [DEBUG] Checking goals: 3 total, 2 on_track, 1 critical
[2026-03-31T12:00:00Z] [revenue-collector] [INFO] Created task lf-abc123: PM: Revenue alert — critical (mrr)
[2026-03-31T12:00:00Z] [revenue-collector] [INFO] Skipped (exists): PM: Revenue alert — critical (mrr), task lf-def456, status: in_progress
[2026-03-31T12:00:00Z] [revenue-collector] [WARN] Task lf-ghi789 is STALE (age: 72h), creating replacement
[2026-03-31T12:00:00Z] [revenue-collector] [ERROR] Failed to create task for ${goal_type}: ${error_message}

Summary line:
[2026-03-31T12:00:00Z] [revenue-collector] [INFO] Summary: checked=3, created=1, skipped=2, errors=0
```

**Metadata Fields in Task:**
- `created_by: "revenue-collector"`
- `goal_type: "mrr" | "bookings" | "conversions"`
- `trajectory: "ahead" | "on_track" | "behind" | "critical"`
- `created_at: ISO timestamp`
- `goal_snapshot: { /* full goal calculation result */ }`
- `previous_trajectory: "ahead" | "on_track" | "behind" | "critical" | null`

#### FR-6: Loop Detector Integration
The loop detection system must be able to distinguish between:
- Real loops (handler creating tasks infinitely)
- Task creation loops (revenue-collector creating duplicate tasks) ← This fix
- Normal idempotent behavior (creating one task per trajectory change)

**Loop Detection Criteria:**
```
A LOOP is detected when:
  - Same task is created 3+ times within 1 hour, AND
  - No dedup_key is set on the tasks, OR
  - dedup_key is set but all have DIFFERENT dedup_keys

NOT a loop:
  - Same dedup_key task is created once, then skipped on subsequent heartbeats
  - Different trajectory tasks are created sequentially (e.g., critical → behind)
```

**Loop Alerting Workflow:**
```
IF 3+ tasks created with same title in 1 hour:
  - IF all have same dedup_key: NOT a loop (idempotent behavior)
  - ELSE: IS a loop (create "PM: Loop detected" task)
```

---

## Acceptance Criteria

### AC1: Idempotency Test — No Duplicates Within 48h Window
**Verification:** Run revenue-collector 5 times in 1-hour window with identical MRR status

**Expected Outcome:**
- Heartbeat 1: 1 task created (title: `PM: Revenue alert — critical (mrr)`)
- Heartbeat 2-5: 0 tasks created, 1 task skipped log line each
- Total after 5 runs: 1 task in database with `created_at` from heartbeat 1

**Test Command:**
```bash
# Simulate 5 consecutive heartbeats with same MRR status
for i in {1..5}; do
  node /Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js
  sleep 10  # 10-second gap between runs
done

# Verify task count
psql -h localhost -d leadflow -c \
  "SELECT COUNT(*) FROM tasks WHERE title LIKE 'PM: Revenue alert — critical (mrr)' AND created_at > NOW() - INTERVAL '1 hour';"
# Expected: 1 (not 5)
```

**Failing if:**
- Multiple tasks with same title exist
- Task count > 1 after 5 runs

---

### AC2: Trajectory Change Creates New Task
**Verification:** Verify that changing MRR trajectory creates a new, distinct task

**Test Steps:**
1. Seed project with MRR metric: `$15K MRR (critical)`
2. Run heartbeat → Expect 1 task: `PM: Revenue alert — critical (mrr)` [task-1]
3. Update project seed: `$18K MRR (behind)`
4. Run heartbeat → Expect new task: `PM: Revenue alert — behind (mrr)` [task-2]
5. Verify both tasks exist in database with different titles

**Expected Outcome:**
```sql
SELECT title, created_at FROM tasks 
WHERE title LIKE 'PM: Revenue alert%' AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at;

-- Expected result:
-- PM: Revenue alert — critical (mrr) | 2026-03-31 10:00:00
-- PM: Revenue alert — behind (mrr)   | 2026-03-31 10:15:00
```

**Failing if:**
- Only 1 task created (trajectory change not detected)
- Same task title appears twice (trajectory not updated)

---

### AC3: Task Status Awareness — Skip In-Progress Tasks
**Verification:** Ensure that in_progress tasks are not duplicated

**Test Steps:**
1. Create a revenue alert task manually (set `status = 'in_progress'`)
2. Run revenue-collector with same goal in critical trajectory
3. Verify no new task is created
4. Check logs for "Skipped" message with task ID

**Expected Outcome:**
- Logs contain: `[INFO] Skipped (exists): PM: Revenue alert — critical (mrr), task lf-xxxxx, status: in_progress`
- No new task created
- Original task remains in `in_progress` status

**Failing if:**
- New task is created despite in_progress task existing
- Logs do not contain explicit skip reason

---

### AC4: Dedup Key Persistence
**Verification:** Dedup key must be stored in database for all revenue alert tasks

**Test Steps:**
1. Run revenue-collector, let it create a revenue alert task
2. Query the database for the dedup_key of the newly created task
3. Verify dedup_key is NOT NULL and matches expected format

**Expected Outcome:**
```sql
SELECT id, dedup_key FROM tasks 
WHERE title LIKE 'PM: Revenue alert%' 
ORDER BY created_at DESC LIMIT 1;

-- Expected result:
-- id              | dedup_key
-- lf-abc123...    | revenue:mrr:critical
```

**Failing if:**
- `dedup_key` column does not exist on tasks table
- `dedup_key` is NULL after task creation
- `dedup_key` format is wrong (e.g., "revenue-mrr-critical" instead of "revenue:mrr:critical")

---

### AC5: Stale Task Escalation
**Verification:** Tasks older than 48 hours should trigger a new alert

**Test Steps:**
1. Manually insert a revenue alert task with `created_at = NOW() - INTERVAL '72 hours'` and `status = 'in_progress'`
2. Run revenue-collector with same goal trajectory
3. Verify a new task is created (not skipped)
4. Check logs for WARN message about stale task

**Expected Outcome:**
- New task is created
- Logs contain: `[WARN] Task lf-xxxxx is STALE (age: 72h), creating replacement`
- Both old (72h) and new tasks exist in database

**Failing if:**
- Task is skipped (stale task not detected)
- No warning logged
- Age calculation is incorrect

---

### AC6: Comprehensive Logging
**Verification:** All decisions are logged with required context

**Test Steps:**
1. Run revenue-collector with 3 goals: 1 on_track, 1 critical, 1 behind
2. Capture stdout/stderr and log file output
3. Verify all 7 required log lines are present

**Expected Outcome:**
```
[2026-03-31T12:00:00Z] [revenue-collector] [DEBUG] Checking goals: 3 total, 1 on_track, 2 off_track
[2026-03-31T12:00:00Z] [revenue-collector] [DEBUG] Goal 1 (mrr): trajectory=on_track, onTrack=true → Skip
[2026-03-31T12:00:00Z] [revenue-collector] [INFO] Created task lf-abc123: PM: Revenue alert — critical (mrr)
[2026-03-31T12:00:00Z] [revenue-collector] [INFO] Skipped (exists): PM: Revenue alert — behind (mrr), task lf-def456, status: ready
[2026-03-31T12:00:00Z] [revenue-collector] [DEBUG] Goal 3 snapshot: { mrr: 18000, target: 20000, days_to_target: 59, trajectory: behind }
[2026-03-31T12:00:00Z] [revenue-collector] [INFO] Summary: checked=3, created=1, skipped=2, errors=0
```

**Failing if:**
- Any log line is missing
- Timestamps are absent
- Log levels are wrong (created logged as DEBUG instead of INFO)
- No summary line

---

### AC7: Loop Detector Correctly Identifies Non-Loops
**Verification:** Loop detector must not create false positive "loop detected" tasks

**Test Steps:**
1. Run revenue-collector 3 times in 1 hour with same goal status
2. Monitor task creation; expect 3 skip logs, 0 new create logs (after first run)
3. Run loop detector analysis
4. Verify NO "PM: Loop detected" task is created

**Expected Outcome:**
```sql
SELECT COUNT(*) FROM tasks 
WHERE title LIKE 'PM: Loop detected%' 
AND created_at > NOW() - INTERVAL '1 hour';

-- Expected result: 0 (no loop detected)
```

**Failing if:**
- "Loop detected" task is created
- Loop detector cannot distinguish between real loops and idempotent behavior

---

## Technical Design

### Files to Modify

#### 1. `/Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js`
**Function:** `createRevenueAlertTasks(goalResults)`

**Changes:**
```javascript
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store');
  const store = new TaskStore();
  
  const results = {
    checked: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    stale_escalated: 0
  };

  for (const goal of goalResults) {
    results.checked++;
    
    // Skip on-track goals
    if (goal.onTrack) {
      console.log(`[DEBUG] Goal "${goal.goal_type}": trajectory=${goal.trajectory}, onTrack=true → Skip (on track)`);
      continue;
    }

    const trajectory = goal.trajectory; // critical, behind, ahead
    const goal_type = goal.goal_type;   // mrr, bookings, conversions
    const title = `PM: Revenue alert — ${trajectory} (${goal_type})`;

    // Check for existing tasks with this title
    const existingTasks = await store.findTasks({
      title_exact: title,
      agent_id: 'product-manager',
      status_in: ['ready', 'in_progress', 'spawned'],
      created_after: Date.now() - 48 * 60 * 60 * 1000  // Last 48 hours
    });

    // If found and not stale, skip
    if (existingTasks.length > 0) {
      const existing = existingTasks[0];
      const ageHours = (Date.now() - new Date(existing.created_at)) / (60 * 60 * 1000);
      
      if (ageHours < 48) {
        console.log(`[INFO] Skipped (exists): ${title}, task ${existing.id}, status: ${existing.status}`);
        results.skipped++;
        continue;
      } else {
        // Task is stale; create a replacement
        console.log(`[WARN] Task ${existing.id} is STALE (age: ${ageHours.toFixed(1)}h), creating replacement`);
        results.stale_escalated++;
      }
    }

    // Create new task
    try {
      const dedup_key = `revenue:${goal_type}:${trajectory}`;
      
      const newTask = await store.createTask({
        title,
        agent_id: 'product-manager',
        status: 'ready',
        model: 'sonnet',
        priority: 1,
        tags: ['revenue-alert', 'automated', 'idempotent'],
        dedup_key,  // Secondary loop detection
        description: [
          `## Revenue Alert: ${trajectory.toUpperCase()}`,
          `**Goal Type:** ${goal_type}`,
          `**Current Status:** ${trajectory}`,
          `**Target:** $${goal.target}`,
          `**Current:** $${goal.current}`,
          `**Days Until Target:** ${goal.days_to_target}`,
          `**Recommendation:** ${goal.recommendation}`,
          `**Action:** ${goal.action}`
        ].join('\n'),
        metadata: {
          created_by: 'revenue-collector',
          goal_type,
          trajectory,
          created_at: new Date().toISOString(),
          goal_snapshot: {
            mrr: goal.mrr,
            target: goal.target,
            days_to_target: goal.days_to_target,
            trajectory: goal.trajectory,
            onTrack: goal.onTrack
          }
        }
      });

      console.log(`[INFO] Created task ${newTask.id}: ${title}`);
      results.created++;
    } catch (err) {
      console.error(`[ERROR] Failed to create task for ${goal_type}: ${err.message}`);
      results.errors++;
    }
  }

  console.log(`[INFO] Summary: checked=${results.checked}, created=${results.created}, skipped=${results.skipped}, stale_escalated=${results.stale_escalated}, errors=${results.errors}`);
  
  return results;
}
```

#### 2. `~/projects/genome/core/task-store.js` (TaskStore)
**Function:** `findTasks(filters)` and `createTask(params)`

**New `findTasks()` Method:**
```javascript
async findTasks(filters) {
  // Filters: {
  //   title_exact?: string,
  //   title_contains?: string,
  //   agent_id?: string,
  //   status_in?: string[],
  //   created_after?: number (milliseconds since epoch),
  //   limit?: number
  // }
  
  let query = this.db.from('tasks').select('*');
  
  if (filters.title_exact) {
    query = query.eq('title', filters.title_exact);
  }
  if (filters.title_contains) {
    query = query.ilike('title', `%${filters.title_contains}%`);
  }
  if (filters.agent_id) {
    query = query.eq('agent_id', filters.agent_id);
  }
  if (filters.status_in && filters.status_in.length > 0) {
    query = query.in('status', filters.status_in);
  }
  if (filters.created_after) {
    const createdAfter = new Date(filters.created_after).toISOString();
    query = query.gte('created_at', createdAfter);
  }
  
  query = query.order('created_at', { ascending: false });
  
  if (filters.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(10);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
```

**Enhanced `createTask()` Method:**
```javascript
async createTask(params) {
  // Validation: automated tasks must have dedup_key
  if (params.metadata?.created_by === 'revenue-collector') {
    if (!params.dedup_key) {
      throw new Error(
        `Automated tasks from revenue-collector must include dedup_key. ` +
        `Got: ${params.dedup_key}. Expected format: revenue:${goal_type}:${trajectory}`
      );
    }
  }

  // Proceed with insert (dedup_key MUST be included in insert statement)
  const { data, error } = await this.db.from('tasks').insert({
    id: generateUUID(),
    project_id: this.projectId,
    title: params.title,
    agent_id: params.agent_id,
    status: params.status || 'ready',
    model: params.model,
    priority: params.priority,
    tags: params.tags,
    dedup_key: params.dedup_key,  // Explicitly include dedup_key in insert
    description: params.description,
    metadata: params.metadata,
    created_at: new Date().toISOString()
  }).select();
  
  if (error) {
    console.error(`[ERROR] TaskStore.createTask insert failed:`, error);
    throw error;
  }
  
  return data[0];
}
```

#### 3. Database Schema (PostgreSQL / Supabase)
**Verify/Create Column:**
```sql
-- Check if dedup_key column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND column_name = 'dedup_key';

-- If not found, add it:
ALTER TABLE tasks ADD COLUMN dedup_key VARCHAR(255) UNIQUE;

-- Create index for faster lookups:
CREATE INDEX idx_tasks_dedup 
ON tasks(project_id, dedup_key) 
WHERE dedup_key IS NOT NULL;
```

### Deployment Order

1. **Database schema:** Add dedup_key column and index (if not present)
2. **TaskStore code:** Update `findTasks()` and validation in `createTask()`
3. **Revenue-collector:** Update `createRevenueAlertTasks()` to use new dedup logic
4. **Testing:** Run acceptance criteria tests
5. **Monitoring:** Verify no duplicate tasks appear in next 5 heartbeat cycles

---

## Testing Strategy

### Unit Tests
```javascript
describe('createRevenueAlertTasks', () => {
  
  it('creates first alert for critical goal', async () => {
    const goalResults = [{
      goal_type: 'mrr',
      trajectory: 'critical',
      onTrack: false,
      target: 20000,
      current: 12000,
      recommendation: 'Escalate pilot recruitment'
    }];
    
    await createRevenueAlertTasks(goalResults);
    
    const tasks = await store.findTasks({
      title_contains: 'PM: Revenue alert',
      status_in: ['ready', 'in_progress']
    });
    
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toContain('critical');
    expect(tasks[0].dedup_key).toBe('revenue:mrr:critical');
  });
  
  it('skips duplicate alerts within 48h', async () => {
    const goalResults = [{
      goal_type: 'mrr',
      trajectory: 'critical',
      onTrack: false,
      target: 20000,
      current: 12000
    }];
    
    await createRevenueAlertTasks(goalResults);
    const created1 = await store.findTasks({ title_contains: 'critical' });
    expect(created1.length).toBe(1);
    
    // Run again with same status
    await createRevenueAlertTasks(goalResults);
    const created2 = await store.findTasks({ title_contains: 'critical' });
    
    expect(created2.length).toBe(1);  // Still 1, not 2
  });
  
  it('creates new alert when trajectory changes', async () => {
    // First run: critical
    await createRevenueAlertTasks([{
      goal_type: 'mrr',
      trajectory: 'critical',
      onTrack: false
    }]);
    
    // Second run: improved to behind
    await createRevenueAlertTasks([{
      goal_type: 'mrr',
      trajectory: 'behind',
      onTrack: false
    }]);
    
    const tasks = await store.findTasks({
      title_contains: 'PM: Revenue alert',
      status_in: ['ready', 'in_progress']
    });
    
    expect(tasks.length).toBe(2);
    expect(tasks[0].title).toContain('behind');
    expect(tasks[1].title).toContain('critical');
  });
  
  it('validates dedup_key for automated tasks', async () => {
    const params = {
      title: 'Test',
      agent_id: 'product-manager',
      metadata: { created_by: 'revenue-collector' },
      dedup_key: null  // Invalid
    };
    
    expect(() => {
      store.createTask(params);
    }).toThrow(/dedup_key/i);
  });
});
```

### Integration Tests
```javascript
describe('Revenue Alert Idempotency — Integration', () => {
  
  it('handles full cycle: critical → behind → critical', async () => {
    const scenarios = [
      { mrr: 12000, expected_trajectory: 'critical', task_count: 1 },
      { mrr: 18000, expected_trajectory: 'behind', task_count: 2 },
      { mrr: 10000, expected_trajectory: 'critical', task_count: 3 }
    ];
    
    for (const scenario of scenarios) {
      // Update project goal
      await updateProjectGoal({ current_mrr: scenario.mrr });
      
      // Run revenue-collector
      await createRevenueAlertTasks(await calculateGoalResults());
      
      // Verify task count
      const tasks = await store.findTasks({
        title_contains: 'PM: Revenue alert',
        status_in: ['ready', 'in_progress']
      });
      
      expect(tasks.length).toBe(scenario.task_count);
      expect(tasks[0].title).toContain(scenario.expected_trajectory);
    }
  });
  
  it('no loop detected when running idempotent logic', async () => {
    // Run revenue-collector 5 times
    for (let i = 0; i < 5; i++) {
      await createRevenueAlertTasks(await calculateGoalResults());
    }
    
    // Verify no "loop detected" tasks
    const loopTasks = await store.findTasks({
      title_contains: 'PM: Loop detected'
    });
    
    expect(loopTasks.length).toBe(0);
  });
  
  it('escalates stale tasks (>48h)', async () => {
    // Create an old revenue alert task
    const oldTask = await store.createTask({
      title: 'PM: Revenue alert — critical (mrr)',
      agent_id: 'product-manager',
      status: 'in_progress',
      metadata: { created_by: 'manual-test' },
      created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
    });
    
    // Run revenue-collector with same critical status
    await createRevenueAlertTasks([{
      goal_type: 'mrr',
      trajectory: 'critical',
      onTrack: false
    }]);
    
    // Verify new task is created (stale escalation)
    const tasks = await store.findTasks({
      title_exact: 'PM: Revenue alert — critical (mrr)'
    });
    
    expect(tasks.length).toBe(2);  // Old + new
    expect(tasks[0].created_at).toBeGreaterThan(oldTask.created_at);
  });
});
```

### Manual Smoke Tests
```bash
# Test 1: Idempotency
echo "=== TEST 1: Idempotency (5 runs, same status) ==="
for i in {1..5}; do
  echo "Run $i:"
  node /Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js | grep -E "Created|Skipped|Summary"
  sleep 2
done
psql -h localhost -d leadflow -c \
  "SELECT COUNT(*) as task_count FROM tasks WHERE title LIKE 'PM: Revenue alert%' AND created_at > NOW() - INTERVAL '1 hour';"

# Test 2: Trajectory change
echo "=== TEST 2: Trajectory change (critical → behind) ==="
psql -h localhost -d leadflow -c "UPDATE project_goals SET current_mrr = 12000 WHERE goal_type = 'mrr';"
node /Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js
psql -h localhost -d leadflow -c "UPDATE project_goals SET current_mrr = 18000 WHERE goal_type = 'mrr';"
node /Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js
psql -h localhost -d leadflow -c \
  "SELECT title, created_at FROM tasks WHERE title LIKE 'PM: Revenue alert%' ORDER BY created_at;"

# Test 3: Dedup key persistence
echo "=== TEST 3: Dedup key persistence ==="
psql -h localhost -d leadflow -c \
  "SELECT id, title, dedup_key FROM tasks WHERE title LIKE 'PM: Revenue alert%' ORDER BY created_at DESC LIMIT 1;"
```

---

## Success Metrics

| Metric | Before Fix | After Fix | Acceptable |
|--------|-----------|----------|-----------|
| **Duplicate alerts per 24h** | 3-5 | 0-1 | ≤1 |
| **False positive loop detections per 24h** | 1-2 | 0 | 0 |
| **PM agent spawns per unique alert** | 3-5 | 1 | 1 |
| **Task queue clarity** | Low | High | High |
| **Idempotency compliance** | 0% | 100% | 100% |

---

## Rollback Plan

If implementation introduces issues:

1. **Immediate:** Revert `revenue-collector.js` to previous version
2. **Short-term:** Disable revenue alert auto-creation (comment out `createRevenueAlertTasks()` in heartbeat)
3. **Fallback:** Switch to manual PM alerts posted in heartbeat summary
4. **Investigation:** Debug the specific failure (TaskStore API issue, schema issue, logic error)
5. **Re-implement:** Fix and re-deploy

---

## Dependencies & Risks

### Dependency: TaskStore Filter API
**Status:** Critical

`findTasks()` method must support these filters:
- `title_exact` — exact string match on title
- `title_contains` — substring match (case-insensitive)
- `agent_id` — exact match on agent_id
- `status_in` — array of statuses to match
- `created_after` — timestamp filter (milliseconds since epoch)
- `limit` — max results to return

**Risk:** If TaskStore doesn't support these filters, dev team must add them (not PM responsibility).

**Mitigation:** Dev team confirms API availability before implementation starts.

### Risk: Race Conditions
**Risk:** Two heartbeats run concurrently; both check and both create tasks.

**Mitigation:** Add row-level locking in TaskStore or use `INSERT ... ON CONFLICT` clause.

**Acceptable rate:** <1% of heartbeats (1 duplicate per 100+ runs).

### Risk: Stale Task Detection Too Aggressive
**Risk:** Tasks stuck in `in_progress` for >48h are escalated, creating noise.

**Mitigation:** Before escalating, check if the original task has any recent activity (logs, agent heartbeat). Only escalate truly abandoned tasks.

**Acceptable rate:** <1 stale escalation per 7 days.

### Risk: Trajectory Calculation Changes
**Risk:** If trajectory calculation logic changes (e.g., definition of "critical" MRR threshold), historical tasks become stale/invalid.

**Mitigation:** Version the trajectory calculation; if definition changes, create a new set of alerts rather than reusing old ones.

---

## Implementation Checklist (For Dev Agent)

- [ ] Add `dedup_key` column to `tasks` table (if not present)
- [ ] Create index on `tasks(project_id, dedup_key)` for performance
- [ ] Implement `findTasks()` method in TaskStore with all required filters
- [ ] Add validation in TaskStore to enforce dedup_key for automated tasks
- [ ] Update `createRevenueAlertTasks()` function in revenue-collector.js:
  - [ ] Check for existing tasks before creating
  - [ ] Implement trajectory-based versioning
  - [ ] Add comprehensive logging
  - [ ] Validate dedup_key is set
- [ ] Write unit tests for createRevenueAlertTasks
- [ ] Write integration tests for full idempotency cycle
- [ ] Run manual smoke tests
- [ ] Verify no duplicate tasks in 5 consecutive heartbeats
- [ ] Verify no "PM: Loop detected" tasks appear
- [ ] Monitor logs for 48 hours post-deployment
- [ ] Update documentation (if applicable)

---

## Questions for Dev Team

1. **TaskStore API:** Does TaskStore already support `findTasks()` with filters, or does it need to be implemented?
2. **Dedup_key column:** Does the `tasks` table already have a `dedup_key` column? (Check: `\d tasks` in psql)
3. **Trajectory calculation:** Is the logic for calculating trajectory (critical/behind/ahead) already implemented and stable?
4. **Concurrent heartbeats:** Can two heartbeats run in parallel, or are they serialized?

---

## Sign-Off

**Specification Status:** READY FOR DEVELOPMENT

**PM Sign-Off:** @product_manager_leadflow_bot  
**Date:** 2026-03-31  
**Confidence Level:** HIGH (problem well-understood, solution clearly defined)

---

## Appendix: Historical Context

**Issue First Reported:** 2026-03-30, 12:50 PM  
**Last Observed:** 2026-03-31, 06:19 PM  
**Frequency:** Every 15-30 minutes (heartbeat cadence)  
**Impact:** PM workflow blocked, task queue bloat, agent timeouts

**Prior Attempts:** 5 previous specifications written (PRD-REVENUE-ALERT-DEDUPLICATION, PRD-REVENUE-ALERT-LOOP-FIX, etc.) but implementation never completed due to unclear requirements or TaskStore API gaps.

**This Version:** Consolidates all requirements into a single, unambiguous spec with clear acceptance criteria and technical implementation guidance.
