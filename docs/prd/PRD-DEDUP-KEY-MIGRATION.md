# PRD: Add dedup_key Column to tasks Table

**PRD ID:** `prd-dedup-key-migration`  
**Status:** ready  
**Priority:** 1 (Blocker)  
**Affected Systems:** Orchestration Engine (Genome), Task Store, Revenue Collector

## Problem Statement

The TaskStore (`~/.openclaw/genome/core/task-store.js`) implements deduplication logic to prevent automated tasks from being created repeatedly:

```javascript
const dedupKey = task.dedup_key || task.dedupKey || null
if (dedupKey && this.supabase) {
  const { data: activeDupes } = await this.supabase
    .from('tasks').select('id, title, status')
    .eq('project_id', this.projectId)
    .eq('dedup_key', dedupKey)
    .in('status', ['ready', 'in_progress', 'blocked'])
    .limit(1)
  if (activeDupes?.length > 0) {
    // Task already exists — don't create duplicate
    return activeDupes[0]
  }
}
```

However, the `tasks` table in Supabase is missing the `dedup_key` column. This causes:

1. **Silent Query Failures**: Queries selecting/filtering on `dedup_key` fail with "column does not exist"
2. **Revenue Alert Loop**: Revenue collector creates revenue alert tasks with identical dedup_keys, but duplicate prevention doesn't work
3. **Cascading Failures**: 3+ duplicate tasks in 2 hours triggers loop detection, which itself is affected by the schema mismatch
4. **Infinite Task Creation**: Loop-detected task also attempts to use dedup logic, perpetuating the cycle

## Root Cause

The TaskStore code was updated to support dedup_key (merged in Genome), but the Supabase schema was not migrated to add the column. This creates a mismatch between code expectations and database schema.

## Solution

Add a migration to create the `dedup_key` column in the `tasks` table with:
- **Column Name:** `dedup_key` (VARCHAR, nullable, indexed)
- **Index:** Composite index on `(project_id, dedup_key)` for efficient dedup lookups
- **Default:** NULL (only automated tasks set this)
- **Purpose:** Stable identity for automated task creation, enabling true deduplication

## Acceptance Criteria

### AC1: Column Creation
- [ ] `dedup_key` column exists in `tasks` table
- [ ] Column is VARCHAR(255), nullable
- [ ] Default value is NULL

### AC2: Indexing
- [ ] Index exists on `(project_id, dedup_key)` for query performance
- [ ] Index name follows naming convention: `idx_tasks_project_dedup`

### AC3: Data Integrity
- [ ] Existing tasks have NULL `dedup_key`
- [ ] No data loss during migration
- [ ] Migration is idempotent (safe to run multiple times)

### AC4: Functional Verification
- [ ] TaskStore can successfully insert tasks with `dedup_key`
- [ ] TaskStore can query tasks by dedup_key without errors
- [ ] Revenue collector can create alert tasks with dedup logic working
- [ ] Loop detection task creation respects dedup logic

### AC5: Code Integration
- [ ] No changes required to TaskStore code (dedup logic already written, just needs column)
- [ ] Revenue collector continues to work unmodified
- [ ] Existing automated task creation patterns work as designed

## Implementation Details

### Supabase Migration SQL

```sql
-- Add dedup_key column if it doesn't exist
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS dedup_key VARCHAR(255) DEFAULT NULL;

-- Create index for dedup lookups
CREATE INDEX IF NOT EXISTS idx_tasks_project_dedup
ON tasks (project_id, dedup_key)
WHERE dedup_key IS NOT NULL;
```

### Deployment Checklist
1. Generate migration timestamp
2. Run SQL migration against Supabase
3. Verify column exists and is queryable
4. Restart realtime-dispatcher (to reload task store)
5. Monitor heartbeat for duplicate task creation
6. Confirm revenue alerts are deduplicated correctly

## Testing Strategy

### Manual Verification (PM Sign-Off)
1. **Query Test**: Run a SELECT query filtering on dedup_key
2. **Dedup Test**: Create revenue alert task twice, verify only one is created
3. **Loop Test**: Create 3 identical dummy tasks, verify loop detection fires only once
4. **Production Test**: Run heartbeat, observe revenue collection without duplicates

### Automated Checks
```bash
# Verify column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name='tasks' AND column_name='dedup_key'

# Verify index exists
SELECT indexname FROM pg_indexes 
WHERE tablename='tasks' AND indexname='idx_tasks_project_dedup'

# Query dedup test
SELECT COUNT(*) FROM tasks 
WHERE project_id='leadflow' AND dedup_key='revenue:mrr:critical'
```

## Success Metrics

- ✅ No duplicate "PM: Revenue alert" tasks created in next 48 hours
- ✅ No "PM: Loop detected" tasks created for revenue alerts
- ✅ TaskStore queries with dedup_key filter successfully (no "column does not exist" errors)
- ✅ Revenue metrics continue to collect cleanly without task spam

## Timeline
- **Dev**: 15 min (SQL migration + restart)
- **QC**: 30 min (verification + monitoring)
- **PM Sign-Off**: Immediate on passing tests

## Rollback Plan

If issues occur:
1. Drop the index: `DROP INDEX IF EXISTS idx_tasks_project_dedup`
2. Drop the column: `ALTER TABLE tasks DROP COLUMN IF EXISTS dedup_key`
3. Restart realtime-dispatcher
4. Return to previous behavior (no dedup, but at least no schema errors)

Note: Rollback should be unnecessary — this is a purely additive migration.

## Dependencies

- Supabase CLI access (for schema operations)
- PostgreSQL ALTER TABLE privileges
- Realtime-dispatcher restart capability

## Related Issues

- Loop detected: "PM: Revenue alert — critical (mrr)" created 3x in 2h (Task: ec8737e7-4bee-4a3e-91e9-eca7c34430cb)
- Failure patterns: zombie_timeout on identical revenue alert tasks
- Genome TaskStore: dedup logic implemented but schema mismatch prevents usage
