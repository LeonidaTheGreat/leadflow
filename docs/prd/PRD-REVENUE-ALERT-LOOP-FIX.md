# PRD: Fix Revenue Alert Loop Detection

**ID:** prd-revenue-alert-loop-fix  
**Status:** specification  
**Version:** 1.0  
**Last Updated:** 2026-03-30  

## Executive Summary

The PM Revenue Alert task creation logic is creating duplicate tasks every heartbeat when revenue goals are off-track. The loop-detection mechanism in `TaskStore` has a bug where the `dedup_key` is not being properly persisted to the database, causing the dedup check to fail.

**Impact:** PM agent gets spawned repeatedly on the same alert, causing resource waste and agent timeouts.

**Root Cause:** When `createRevenueAlertTasks()` in `revenue-collector.js` calls `store.createTask()` with a `dedup_key`, the TaskStore correctly passes it to the insert statement, but the database schema or ORM may not be persisting the field properly, OR there's a bug in the dedup check logic itself.

## Problem Statement

### Evidence
1. Database shows 10+ tasks with title `PM: Revenue alert — critical (mrr)` created between 12:50 PM - 6:19 PM on 3/30
2. All tasks have `dedup_key = NULL` in the database
3. TaskStore.createTask() in genome has code to:
   - Check if dedup_key exists on active or recently-completed tasks
   - Insert the dedup_key into the database
4. However, all inserted tasks show `dedup_key: null` regardless of whether the function was called with a dedup_key

### Why This is Critical
- **Infinite loop:** Revenue goal stays "critical" → each heartbeat creates a new PM task
- **Resource waste:** PM agent gets spawned 3+ times per heartbeat
- **Agent failure cascade:** PM agent tries to process the alert, fails due to auth cooldown (moonshot model), gets marked as failed, then a new task is created
- **Diagnosis loop:** Since the PM can't complete the task, it keeps getting recreated

## Solution

### Fix 1: Verify dedup_key is being inserted (TaskStore)
The issue likely lies in one of these areas:

1. **Database schema issue:** The `dedup_key` column doesn't exist or isn't writable on the tasks table
2. **ORM bug:** Supabase client is stripping the field during insert
3. **Logic bug:** The dedup check is finding a match but the task is still being inserted

**Action:** 
- Verify `tasks` table has a `dedup_key` column (varchar, nullable)
- Check if Supabase is silently dropping the field during insert
- Add logging to TaskStore.createTask() to confirm what's being sent to the database
- Verify the dedup check query is executing before insert

### Fix 2: Stop creating duplicate tasks in revenue-collector.js (Revenue Collector)
Even if dedup_key works perfectly, the revenue collector should NOT create a task every heartbeat if the goal state hasn't changed. It should only create a task when:
- The goal trajectory changes (e.g., "on_track" → "critical")
- OR this is the first heartbeat the goal was critical
- NOT every heartbeat while it remains critical

**Action:**
- Track the previous goal state per goal_type in the database
- Only create a task if trajectory has CHANGED since last heartbeat
- OR add a task state table that tracks "Revenue alert already created for goal X in trajectory Y"

### Fix 3: Make dedup_key a required field when creating automated tasks
Rather than hoping dedup_key works, enforce it for tasks created by automated systems (revenue-collector, diagnostics, etc).

**Action:**
- Add validation in TaskStore.createTask(): if `metadata.created_by` is 'revenue-collector' or other automated source, dedup_key must be provided
- Throw an error if missing, don't silently allow NULL

## Acceptance Criteria

✅ **Check 1:** Database `tasks` table has `dedup_key` column that persists on insert  
```bash
psql -h localhost -d leadflow -c "SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name='dedup_key';"
```
Expected: one row with column_name=dedup_key

✅ **Check 2:** New revenue alert task has non-NULL dedup_key after creation  
```bash
# After revenue-collector runs, check the newest revenue alert task:
psql -h localhost -d leadflow -c "SELECT id, dedup_key FROM tasks WHERE title ILIKE 'PM: Revenue alert%' ORDER BY created_at DESC LIMIT 1;"
```
Expected: dedup_key = `revenue:mrr:critical` (or similar non-NULL value)

✅ **Check 3:** Creating a revenue alert twice with same trajectory doesn't duplicate  
```bash
# Run revenue-collector twice in a row with same goal state
node /Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js
node /Users/clawdbot/.openclaw/genome/scripts/revenue-collector.js
# Check task count with title matching 'PM: Revenue alert — critical (mrr)'
psql -h localhost -d leadflow -c "SELECT COUNT(*) FROM tasks WHERE title = 'PM: Revenue alert — critical (mrr)' AND created_at > NOW() - INTERVAL '5 minutes';"
```
Expected: 1 (not 2)

✅ **Check 4:** No "PM: Loop detected" tasks are created when running revenue-collector multiple times  
```bash
psql -h localhost -d leadflow -c "SELECT COUNT(*) FROM tasks WHERE title ILIKE 'PM: Loop detected%' AND created_at > NOW() - INTERVAL '5 minutes';"
```
Expected: 0

## Implementation Notes

### For Dev Agent
1. **Diagnose the TaskStore bug:**
   - Add console.log in TaskStore.createTask() to show what's being sent to Supabase
   - Run a test task creation with dedup_key and verify it's persisted
   - Check if Supabase client is filtering fields

2. **Fix the database schema** (if needed):
   - If `dedup_key` column doesn't exist, add it: `ALTER TABLE tasks ADD COLUMN dedup_key VARCHAR(255);`
   - Add index: `CREATE INDEX idx_tasks_dedup ON tasks(project_id, dedup_key) WHERE dedup_key IS NOT NULL;`

3. **Fix revenue-collector.js:**
   - Track previous goal state in `project_goals` table (`previous_trajectory` column)
   - Only call `createRevenueAlertTasks()` if trajectory changed
   - OR add dedup-safety: check if a recent task exists before creating

4. **Add validation in TaskStore:**
   - If `metadata.created_by` is an automated system, require `dedup_key` to be non-NULL

### For QC Agent
- Verify that `dedup_key` is persisted for all newly-created tasks
- Verify that running revenue-collector twice doesn't create duplicate tasks
- Verify no "PM: Loop detected" tasks are created

## Timeline
- **Investigation:** Complete root cause analysis of why dedup_key is NULL
- **Fix:** Implement the three fixes above
- **Test:** Run revenue-collector multiple times, verify no duplicates
- **Validation:** Monitor for 2 heartbeat cycles, ensure no more "PM: Loop detected" tasks

## Dependencies
- Requires access to PostgreSQL/Supabase to verify schema and test
- Requires ability to run revenue-collector standalone
- Requires access to TaskStore code in Genome repository

## Cross-Project Impact
This fix affects the **Genome** orchestration engine. LeadFlow is the test bed, but the fix will prevent this loop issue across ALL orchestrated projects that use revenue tracking.
