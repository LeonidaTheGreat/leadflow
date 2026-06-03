# Completion Report: PM Loop Fix

**Task ID:** c784f3a9-194d-44c5-8c7b-b728aed6238a  
**Status:** ✅ COMPLETE  
**Date:** 2025-01-05

## Problem Statement

UC-PILOT-WHITE-GLOVE (and other use cases) had PM tasks complete 3x in 2 hours without advancing to dev. The workflow_step remained at 0, causing an infinite loop of PM task creation.

**Root Cause:**
1. `replenishQueue()` only checked done tasks when UC status was `['stuck', 'in_progress', 'not_started']`
2. When UC status was `'ready'` (even after PM completed), `replenishQueue` would create another step-0 PM task
3. The `activeUCs` dedup check only looked for `ready`/`in_progress`/`blocked` tasks - not `done` tasks
4. `chainTask()` used `workflow.indexOf(agent_id)` which could find the wrong step if an agent appears multiple times

## Solution

### Fix 1: heartbeat-executor.js - replenishQueue()

**Location:** `~/projects/genome/core/heartbeat-executor.js` (lines ~7453-7485)

**Changes:**
1. **Always calculate startStep from done tasks** - regardless of UC implementation_status
2. **Added dedup guard** - prevents creating tasks for steps that already have done tasks
3. **Simplified status transition logic** - UC moves from `ready`/`not_started` → `in_progress` when replenished

```javascript
// BEFORE: Only checked done tasks for certain statuses
if (['stuck', 'in_progress', 'not_started'].includes(uc.implementation_status)) {
  // ... calculate startStep
}

// AFTER: Always check done tasks
const { data: doneTasks } = await this.store.supabase
  .from('tasks').select('agent_id')
  .eq('use_case_id', uc.id).eq('project_id', this.projectId).eq('status', 'done')
const doneAgents = new Set((doneTasks || []).map(t => t.agent_id))
// ... calculate startStep from doneAgents

// NEW: Dedup guard
const targetAgentForStep = normalizeAgentId(uc.workflow?.[startStep] || 'product')
if (doneAgents.has(targetAgentForStep)) {
  console.log(`   ⏭️ Skipping ${uc.id} — step ${startStep} (${targetAgentForStep}) already has a done task`)
  continue
}
```

### Fix 2: workflow-engine.js - chainTask()

**Location:** `~/projects/genome/core/workflow-engine.js` (lines ~706-715)

**Changes:**
1. **Use task.metadata.workflow_step if available** - more reliable than searching the workflow array
2. **Fallback to array search** for backwards compatibility with old tasks

```javascript
// BEFORE:
const currentIdx = uc.workflow.indexOf(task.agent_id)
if (currentIdx === -1) return

// AFTER:
let currentIdx = -1
if (task.metadata?.workflow_step != null) {
  currentIdx = task.metadata.workflow_step
} else {
  currentIdx = uc.workflow.indexOf(task.agent_id)
}
if (currentIdx === -1 || currentIdx >= uc.workflow.length) return
```

## Test Coverage

Created comprehensive unit tests in `tests/unit/pm-loop-fix.test.js`:

1. **testReplenishQueueStartStep** - Verifies startStep is calculated correctly from done tasks
2. **testDedupGuard** - Verifies dedup guard prevents duplicate step-0 tasks
3. **testChainTaskUsesMetadata** - Verifies chainTask uses workflow_step from metadata
4. **testFullWorkflowScenario** - End-to-end test of PM→dev→qc workflow
5. **testStuckUCWithPartialCompletion** - Verifies stuck UCs resume from last completed step

**Test Results:**
```
🧪 PM Loop Fix Tests

✅ replenishQueue calculates startStep from done tasks
✅ Dedup guard prevents duplicate step-0 tasks  
✅ chainTask uses workflow_step from metadata
✅ Full workflow scenario works correctly
✅ Stuck UC correctly resumes from last completed step

✅ All tests passed!
```

## Files Modified

### Genome Core (outside LeadFlow repo)
- `~/projects/genome/core/heartbeat-executor.js` - replenishQueue() fix
- `~/projects/genome/core/workflow-engine.js` - chainTask() fix

### LeadFlow Repo
- `tests/unit/pm-loop-fix.test.js` - New unit tests (208 lines)

## Verification

1. ✅ Both modified files load without syntax errors
2. ✅ Unit tests pass
3. ✅ Changes are minimal and focused on the root cause
4. ✅ Backwards compatibility maintained (fallback to array search)

## Impact

- **Before:** UCs with `implementation_status='ready'` could spawn duplicate PM tasks
- **After:** `replenishQueue()` correctly resumes from the next uncompleted step
- **Result:** Workflow chains advance properly (PM → dev → QC)

## Deployment Notes

The Genome core files (`~/projects/genome/core/`) are shared orchestration infrastructure. Changes take effect immediately on the next heartbeat cycle (every 5 minutes). No deployment to Vercel required.
