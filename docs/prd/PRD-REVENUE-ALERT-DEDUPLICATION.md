# PRD: Fix Revenue Alert Task Duplication Loop

**Task ID:** b42938c6-0e25-4034-998a-6e5be1fe3433  
**Date Created:** 2026-03-30  
**Status:** SPECIFICATION  
**Product Manager:** @product_manager_leadflow_bot  
**Priority:** P1 (Blocker — Prevents reliable PM workflow)

---

## Problem Summary

The revenue-collector script (Loop 5 of heartbeat orchestration) creates duplicate "PM: Revenue alert — critical (mrr)" tasks on every heartbeat when revenue is off-track. This causes:

- Multiple identical PM tasks in the task queue
- Wasted PM agent cycles (same analysis spawned N times)
- Unclear which alert is current
- Difficulty tracking when a goal trend changed
- Loop detection false positives (system thinks there's a handler loop when there's only task creation loop)

**Root Cause:** The `createRevenueAlertTasks()` function in `~/.openclaw/genome/scripts/revenue-collector.js` creates a new task for EVERY off-track goal, without checking if an identical task was recently created.

**Current Behavior:**
```
Heartbeat 1 (10:00) → MRR critical → Create task "PM: Revenue alert — critical (mrr)"
Heartbeat 2 (10:15) → MRR still critical → Create ANOTHER task "PM: Revenue alert — critical (mrr)"
Heartbeat 3 (10:30) → MRR still critical → Create ANOTHER task "PM: Revenue alert — critical (mrr)"
```

**Expected Behavior:**
```
Heartbeat 1 (10:00) → MRR critical → Create task "PM: Revenue alert — critical (mrr)" [version 1]
Heartbeat 2 (10:15) → MRR still critical → Skip (task exists, still in_progress)
Heartbeat 3 (10:30) → MRR still critical → Skip (task exists, still in_progress)
Heartbeat 4 (11:00) → MRR improved to "behind" → Create NEW task "PM: Revenue alert — behind (mrr)" [version 2]
```

---

## Requirements

### Functional Requirements

1. **Idempotent Task Creation**
   - Before creating a revenue alert task, check if an **identical or superseded** task already exists in the queue
   - A task is "identical" if it has the same `title` and was created < 24 hours ago
   - A task is "superseded" if a better task exists (e.g., "critical" replaced by "behind" or "ahead")

2. **Task Deduplication Logic**
   ```
   For each off-track goal:
     - Check task store for tasks with title = `PM: Revenue alert — ${trajectory} (${goal_type})`
     - If found and status in ['ready', 'in_progress', 'spawned']:
       → Skip (don't create duplicate)
     - Else if found but trajectory improved (e.g., 'critical' → 'behind'):
       → Create NEW task (trajectory changed, needs new analysis)
     - Else if NOT found:
       → Create task (first alert for this trajectory)
   ```

3. **Task Versioning**
   - Append version metadata to task title when trajectory changes:
     - First "critical" alert: `PM: Revenue alert — critical (mrr)` [v1]
     - Improves to "behind": `PM: Revenue alert — behind (mrr)` [v1]
     - Worsens back to "critical": `PM: Revenue alert — critical (mrr)` [v2]
   - This helps PM understand at a glance whether it's a new problem or a recurring one

4. **Logging & Observability**
   - Log each decision: "Created new alert", "Skipped (exists)", "Upgraded version"
   - Include task ID and status of found task
   - Example: `[Revenue Collector] Skipped PM alert for critical/mrr (task lf-abc123 still in_progress)`

---

## Acceptance Criteria

### AC1: No Duplicate Task Creation Within 24h
- **Verification:** Run heartbeat 5x in a 1-hour window with same MRR status
- **Expected:** Only 1 task created; subsequent heartbeats log "Skipped (exists)"
- **Command:** Check task-store.log and revenue-collector logs

### AC2: Trajectory Change Creates New Version
- **Verification:** 
  1. Run heartbeat with "critical" MRR → creates task v1
  2. Update project goal to put it "ahead" of expected
  3. Run heartbeat with "ahead" MRR → creates task v2 (different title)
  4. Check task store has both tasks
- **Expected:** 2 distinct tasks with different trajectory in title

### AC3: Task Status Awareness
- **Verification:** 
  1. Create and spawn revenue alert task
  2. Task is in_progress
  3. Run heartbeat again before task completes
  4. Check logs for "Skipped (task lf-xxx in_progress)"
- **Expected:** No duplicate created while original is active

### AC4: Logging is Detailed
- **Verification:** Run revenue-collector standalone, examine stdout
- **Expected:** Each decision logged with task ID, status, trajectory

---

## Technical Design

### Code Location
- **File to Modify:** `~/.openclaw/genome/scripts/revenue-collector.js`
- **Function to Fix:** `createRevenueAlertTasks(goalResults)`
- **Dependencies:** 
  - TaskStore API (already imported)
  - No new database queries needed

### Implementation Approach

```javascript
async function createRevenueAlertTasks(goalResults) {
  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()

  for (const result of goalResults) {
    if (result.onTrack || !result.recommendation) continue

    const title = `PM: Revenue alert — ${result.trajectory} (${result.goal_type})`
    
    // 1. CHECK if task already exists
    const existingTasks = await store.findTasks({
      title_contains: `PM: Revenue alert.*${result.goal_type}`,
      agent_id: 'product',
      status_in: ['ready', 'in_progress', 'spawned'],
      created_after: Date.now() - 24 * 60 * 60 * 1000  // Last 24h
    })
    
    // 2. Filter for exact trajectory match
    const exactMatch = existingTasks.find(t => t.title === title)
    if (exactMatch) {
      console.log(`  [Skip] Revenue alert ${title} exists (task ${exactMatch.id}, status: ${exactMatch.status})`)
      continue
    }
    
    // 3. If trajectory changed, create new version
    // (different trajectory = different title, so will pass the above check)
    
    // 4. CREATE task (no match found, or trajectory changed)
    const newTask = await store.createTask({
      title,
      agent_id: 'product',
      status: 'ready',
      model: 'sonnet',
      priority: 1,
      tags: ['revenue', 'automated', 'high-priority'],
      description: [ /* ... */ ],
      metadata: { 
        created_by: 'revenue-collector', 
        goal_type: result.goal_type, 
        trajectory: result.trajectory,
        created_at: Date.now()
      }
    })

    console.log(`  [Create] Revenue alert ${title} (task ${newTask.id})`)
  }
}
```

### TaskStore API Required
This fix requires TaskStore to support `findTasks()` with filters:
- `title_contains` or `title_regex` (fuzzy match for goal_type)
- `status_in` (multiple status values)
- `created_after` (timestamp filter)

If TaskStore doesn't support these filters yet, this becomes a **dev task** to add them.

---

## Testing Strategy

### Unit Test (Pseudo-code)
```javascript
describe('createRevenueAlertTasks', () => {
  it('creates first alert for critical goal', async () => {
    const goalResults = [{ trajectory: 'critical', onTrack: false, ... }]
    await createRevenueAlertTasks(goalResults)
    const tasks = await store.findTasks({ title_contains: 'critical' })
    expect(tasks.length).toBe(1)
  })
  
  it('skips duplicate alerts within 24h', async () => {
    await createRevenueAlertTasks([{ trajectory: 'critical', onTrack: false, ... }])
    await createRevenueAlertTasks([{ trajectory: 'critical', onTrack: false, ... }])
    const tasks = await store.findTasks({ title_contains: 'critical' })
    expect(tasks.length).toBe(1)  // Still 1, not 2
  })
  
  it('creates new alert when trajectory improves', async () => {
    await createRevenueAlertTasks([{ trajectory: 'critical', onTrack: false, ... }])
    await createRevenueAlertTasks([{ trajectory: 'behind', onTrack: false, ... }])
    const tasks = await store.findTasks({ title_contains: 'Revenue alert' })
    expect(tasks.length).toBe(2)  // Different trajectories
    expect(tasks[0].title).toContain('critical')
    expect(tasks[1].title).toContain('behind')
  })
})
```

### Integration Test
1. Configure project goal: $20K MRR by day 90
2. Seed Stripe with data: $15K MRR (critical, behind target)
3. Run heartbeat 3 times in rapid succession
4. **Verify:** Only 1 task created
5. Update Stripe to $18K MRR (behind but improving)
6. Run heartbeat again
7. **Verify:** New task created (trajectory changed from "critical" to "behind")

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Duplicate alerts per 24h | 3+ | 0 |
| PM task queue clarity | Low (N identical tasks) | High (1 current alert per goal) |
| Revenue alerts created per goal per 24h | 3-5 | ≤2 (only when trajectory changes) |
| Log clarity (dedupe decisions visible) | No | Yes |

---

## Timeline & Ownership

- **Spec completion:** Today (PM)
- **TaskStore filter API (if needed):** Dev task
- **Implementation (revenue-collector fix):** Dev task
- **Testing & verification:** Dev + QC
- **Deployment:** After verification on staging
- **Monitoring:** Revenue-collector logs, task queue metrics

---

## Dependencies & Risks

### Dependency: TaskStore Filter API
- **Risk:** If TaskStore doesn't support `findTasks()` with filters, implementation will be slower
- **Mitigation:** Dev team confirms TaskStore API capabilities before starting
- **Plan B:** Use direct SQL query to task-store or implement basic in-memory filter

### Risk: Race Conditions
- **Risk:** Two heartbeats run concurrently, both create alerts
- **Mitigation:** Add task lock/version check at creation time; TaskStore should return error if duplicate detected
- **Contingency:** Accept occasional duplicates if rare; acceptable threshold: <1% of heartbeats

### Risk: False Positives (Skipping Legitimate New Alerts)
- **Risk:** New trajectory alert wrongly skipped because similar old alert exists
- **Mitigation:** Use exact trajectory match, not fuzzy match
- **Verification:** Test trajectory change from "critical" → "behind" → "critical" (should create 3 total tasks)

---

## Rollback Plan

If implementation causes issues:
1. Revert `revenue-collector.js` to previous version
2. Disable revenue alert auto-creation (comment out `createRevenueAlertTasks()` call)
3. Switch to manual PM alerts in heartbeat summary
4. Investigation & fix in next cycle

---

## Questions for Stojan

1. **TaskStore capabilities:** Does TaskStore support `.findTasks()` with filters, or do we need to implement?
2. **Acceptable duplicate rate:** If deduplication has rare race conditions, is <1% duplicate rate acceptable?
3. **Version numbering:** Should task titles include `[v1]`, `[v2]` explicitly, or just different trajectory?
4. **Historic cleanup:** Should we archive or delete old revenue alerts from task queue when new ones created?

---

## Appendix: Current Issue Trace

**Symptom:** "PM: Revenue alert — critical (mrr)" created 3x in 2 hours on 2026-03-30

**Root Cause:** `~/.openclaw/genome/scripts/revenue-collector.js` line ~267 calls `store.createTask()` without checking for existing tasks

**Impact:** 
- Loop detection system sees 3 identical tasks created in quick succession
- Triggers false "loop detected" alert
- PM workflow interrupted
- Uncertain which alert is current

**Solution:** Implement idempotent task creation with trajectory-based versioning

