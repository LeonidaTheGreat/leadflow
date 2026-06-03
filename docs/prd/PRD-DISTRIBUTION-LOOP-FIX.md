# PRD: Fix Distribution Health Loop — Prevent Repeated "Create Landing Page" Task Spawning

**PRD ID:** prd-distribution-loop-fix-001  
**Status:** approved  
**Priority:** 1 (Blocker — loop wastes agent budget and creates noise)  
**Author:** Product Manager  
**Date:** 2026-03-28  
**Project:** genome (affects `~/projects/genome/scripts/distribution-collector.js`)

---

## Problem Statement

The `distribution-collector.js` health check (Loop 6) repeatedly spawns "PM: Distribution — Create Landing Page" tasks because:

1. The check queries `distribution_channels` for `status = 'active'` and `channel_type = 'landing_page'`
2. When no active channel exists, it spawns a task
3. The spawned task runs and completes (`done`) — but **never updates `distribution_channels`**
4. Next heartbeat: same check, same result → new task spawned → infinite loop

This created 12+ identical tasks on 2026-03-02 over ~3 hours. The loop was manually broken by inserting a `distribution_channels` row with `status = 'active'`, NOT by fixing the root cause. The loop can recur for any of the 5 distribution issue types (`no_landing_page`, `zero_traffic`, `zero_signups`, `low_conversion`, `low_trial_conversion`).

---

## Root Cause Analysis

### Primary cause: No cooldown on recently-completed tasks

`checkDistributionHealth()` checks infrastructure state (`distribution_channels` table), but not task state. After a task completes (`done`), the infrastructure state may not reflect the fix yet — either because:
- The agent completed the spec/PRD but code hasn't been deployed
- The `distribution_channels` table wasn't updated as part of task acceptance criteria

### Secondary cause: UC dedup only fires for non-done tasks

`TaskStore.createTask()` deduplicates by `use_case_id + agent_id` only for active (non-done) tasks. If the task completes quickly (before next heartbeat), the dedup window expires.

### Contributing factor: Missing acceptance check

The `gtm-landing-page` use case has `implementation_status: 'complete'` but `e2e_tests_defined: false` and no acceptance checks. The distribution health loop should respect UC completion status.

---

## Requirements

### REQ-1: UC Completion Gate (in `checkDistributionHealth`)

Before raising any distribution issue that maps to a use case, check if the linked UC has `implementation_status = 'complete'`:

```
If UC.implementation_status === 'complete', skip this issue type entirely.
```

**Affected issue types and their UC IDs:**
- `no_landing_page` → `gtm-landing-page`
- `zero_traffic` → `gtm-content`
- `zero_signups` → `gtm-conversion`
- `low_conversion` → `gtm-conversion`
- `low_trial_conversion` → `gtm-onboarding`

### REQ-2: Task Cooldown Check (in `createDistributionTasks`)

Before calling `store.createTask()` for an issue type, query for recent tasks of the same title (or same `use_case_id`) created within the last **48 hours** that are `done`, `failed`, or `in_progress`:

```javascript
const recentTasks = await supabase
  .from('tasks')
  .select('id, status, created_at')
  .eq('project_id', PROJECT_ID)
  .eq('use_case_id', template.use_case_id)
  .gte('created_at', fortyEightHoursAgo)
  .order('created_at', { ascending: false })
  .limit(1)

if (recentTasks?.length > 0) {
  console.log(`  Skipping ${template.name} — task already created within 48h (${recentTasks[0].id}: ${recentTasks[0].status})`)
  continue
}
```

### REQ-3: Suppress `no_landing_page` When Channel Exists But Recent Task Failed

If a landing page channel exists with any status (not just `active`), and there's a recent task — do not re-raise `no_landing_page`. Only raise it if no channel row exists at all.

Change the check from:
```javascript
.eq('status', 'active')
```
To:
```javascript
// Any row = channel is known to exist (even if inactive/building)
// Only raise if NO row exists at all
if (!landingPages || landingPages.length === 0) { /* raise issue */ }
```

Remove the `.eq('status', 'active')` filter for the `no_landing_page` check. A non-active channel means work is in progress, not absent.

### REQ-4: Log Loop Prevention

When skipping task creation due to cooldown or UC completion, log clearly:
```
[Distribution] Skipping "Create Landing Page" — gtm-landing-page is complete
[Distribution] Skipping "Content Marketing Campaign" — task created 4h ago (abc-123: done)
```

---

## Acceptance Criteria

1. **No duplicate tasks within 48h**: If "PM: Distribution — Create Landing Page" was created in the last 48h, `createDistributionTasks()` skips it and logs the skip.
2. **UC completion respected**: If `gtm-landing-page.implementation_status = 'complete'`, `checkDistributionHealth()` does NOT raise `no_landing_page`.
3. **Channel check loosened**: A `distribution_channels` row with any status (active, building, inactive) suppresses `no_landing_page` issue.
4. **Logs emit correctly**: Skipped issues are logged with reason.
5. **Existing channels preserved**: No changes to existing `distribution_channels` data or schema.

---

## File to Modify

**Genome project only:** `~/projects/genome/scripts/distribution-collector.js`

- Function: `checkDistributionHealth()` — add UC completion gate (REQ-1) and loosen channel check (REQ-3)
- Function: `createDistributionTasks()` — add cooldown check (REQ-2) and skip logging (REQ-4)

**No changes to LeadFlow product code.**

---

## E2E Test Specs

### Test 1: UC-complete gate prevents task creation
- Setup: `gtm-landing-page` has `implementation_status = 'complete'`
- Action: Run `checkDistributionHealth()` with empty `distribution_channels`
- Expected: `no_landing_page` issue is NOT in the returned issues array

### Test 2: Recent task cooldown prevents duplicate
- Setup: A task with `use_case_id = 'gtm-landing-page'` created 2h ago exists
- Action: Run `createDistributionTasks([{ type: 'no_landing_page', uc_template: 'landing-page', ... }])`
- Expected: No new task inserted, cooldown message logged

### Test 3: No channel row = issue raised
- Setup: `distribution_channels` is empty, `gtm-landing-page.implementation_status = 'planned'`
- Action: Run `checkDistributionHealth()`
- Expected: `no_landing_page` appears in issues (if no recent task either)

### Test 4: Non-active channel suppresses issue
- Setup: `distribution_channels` has a row with `status = 'building'`
- Action: Run `checkDistributionHealth()`
- Expected: `no_landing_page` NOT raised

---

## Migration / Immediate Fix

No migration required. The `distribution_channels` table already has the active landing page row for LeadFlow (`leadflow-ai-five.vercel.app`). The fix is purely logic changes in `distribution-collector.js`.

**Immediate state (no code change needed for LeadFlow):**
- `distribution_channels` row exists: `status = 'active'`, `channel_type = 'landing_page'` ✅
- `gtm-landing-page` UC: `implementation_status = 'complete'` ✅
- Loop is currently resolved — fix prevents recurrence

---

## Affected Projects

- **genome** — `distribution-collector.js` needs the dedup and cooldown logic
- **leadflow** — no code changes needed (loop is already broken by manual channel insert)
