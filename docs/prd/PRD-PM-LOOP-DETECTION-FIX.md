# PRD: PM Task Loop Detection Fix

**ID:** prd-pm-loop-detection-fix  
**Status:** active  
**Priority:** P0  
**Affected component:** `~/.openclaw/genome/core/heartbeat-executor.js`, `~/.openclaw/genome/core/task-store.js`

---

## Problem

The PM task `"PM: uc-revenue-aha-moment - Trial Aha Moment — AI Response by Day 3"` was created 5+ times over two hours (07:13, 07:18, 07:23 on 2026-04-05). The loop detection system caught this on the 4th occurrence and created a `PM: Loop detected` investigation task — but only after multiple wasted spawns.

## Root Cause (Verified)

There are two bugs working together, both in `replenishQueue()` in `heartbeat-executor.js`:

### Bug 1: `implementation_status='ready'` is excluded from the done-step resume logic

`replenishQueue` has a block that finds the last completed workflow step and advances `startStep` accordingly (lines 7514–7531). This block only runs when `implementation_status` is `stuck`, `in_progress`, or `not_started`:

```js
if (['stuck', 'in_progress', 'not_started'].includes(uc.implementation_status)) {
  // ... find startStep from done tasks ...
}
```

When `implementation_status='ready'`, this block is skipped. `startStep` stays at `0`, meaning the loop always targets the first workflow step (typically `product`) — even when the PM step is already `done`.

### Bug 2: The UC+agent dedup check in `createTask` only blocks non-done tasks

The dedup guard in `task-store.js` (lines 135–145) prevents creating a duplicate task only when an existing task for the same UC+agent is NOT in `done/failed/cancelled`:

```js
.not('status', 'in', '("done","failed","cancelled")')
```

Once the PM task completes (`status='done'`), this check passes — allowing a new identical PM task to be created immediately on the next heartbeat.

### Combined effect

Every heartbeat:
1. `replenishQueue` finds `uc-revenue-aha-moment` with `implementation_status='ready'` and no active task.
2. The `ready` status skips the done-step advance logic → `startStep=0` → targets `product`.
3. `createTask` checks: no active PM task for this UC → proceeds to insert.
4. A new PM task is created. It runs, completes (`done`), and the cycle repeats.

### Why `sweepUCCompletions` doesn't catch this

`sweepUCCompletions` (step 5g) only processes UCs with status `not_started`, `in_progress`, `partial`, `stuck`, or `needs_merge`. Status `ready` is not in this list, so UCs with `implementation_status='ready'` that have completed workflow steps are never advanced to the next step or marked `complete`.

---

## Fix Spec

### Fix 1: Add `'ready'` to the done-step resume check in `replenishQueue`

In `heartbeat-executor.js`, expand the condition at the `startStep` block to include `'ready'`:

```js
// Before:
if (['stuck', 'in_progress', 'not_started'].includes(uc.implementation_status)) {

// After:
if (['stuck', 'in_progress', 'not_started', 'ready'].includes(uc.implementation_status)) {
```

This ensures that for `ready` UCs, the system checks which workflow steps are already done and starts from the correct next step — not step 0.

### Fix 2: Add `'ready'` to `sweepUCCompletions` scope

In `heartbeat-executor.js`, add `'ready'` to the `implementation_status` filter in `sweepUCCompletions`:

```js
// Before:
.in('implementation_status', ['not_started', 'in_progress', 'partial', 'stuck', 'needs_merge'])

// After:
.in('implementation_status', ['not_started', 'in_progress', 'partial', 'stuck', 'needs_merge', 'ready'])
```

This ensures UCs in `ready` state that have all workflow steps done get swept to `complete`.

### Fix 3: Add a `done-task cooldown` check to `createTask` for PM tasks

In `task-store.js`, strengthen the UC+agent dedup to also block creation when a `done` task for the same UC+agent exists within the last 2 hours:

```js
// After the existing UC+agent active-task check, add:
if (ucId && agentIdRaw && this.supabase) {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  const { data: recentDone } = await this.supabase
    .from('tasks').select('id, title, status')
    .eq('project_id', this.projectId)
    .eq('use_case_id', ucId)
    .eq('agent_id', normalizedAgent)
    .eq('status', 'done')
    .gte('completed_at', twoHoursAgo)
    .limit(1)
  if (recentDone?.length > 0) {
    console.warn(`[TaskStore] Recent-done cooldown: UC ${ucId} ${normalizedAgent} task completed within 2h (${recentDone[0].id.slice(0,8)})`)
    return recentDone[0]
  }
}
```

This is a safety net: even if Fixes 1 and 2 work correctly, this prevents rapid re-creation of any UC+agent task combination that just completed.

---

## Implementation Order

1. Fix 1 (replenishQueue condition) — highest impact, prevents the loop from occurring
2. Fix 2 (sweepUCCompletions scope) — advances stuck `ready` UCs correctly
3. Fix 3 (createTask cooldown) — defense in depth, catches edge cases

All three changes are small, surgical, and do not require DB migrations.

---

## Acceptance Criteria

- [ ] A UC with `implementation_status='ready'` and product step `done` does NOT get a new PM task created on the next heartbeat
- [ ] A UC with `implementation_status='ready'` and ALL workflow steps `done` is swept to `complete` by `sweepUCCompletions`
- [ ] A UC with `implementation_status='ready'` and product step `done` but dev step `not started` gets a `dev` task created (not a PM task re-do)
- [ ] `uc-revenue-aha-moment` advances to dev step after fix is deployed (currently stuck in PM loop)
- [ ] No new `PM: Loop detected` tasks appear for `uc-revenue-aha-moment` after fix
- [ ] The 2-hour done-task cooldown in `createTask` blocks duplicate UC+agent task creation regardless of replenishQueue state

---

## Files to Modify

| File | Change |
|------|--------|
| `~/.openclaw/genome/core/heartbeat-executor.js` | Fix 1: add `'ready'` to replenishQueue startStep condition |
| `~/.openclaw/genome/core/heartbeat-executor.js` | Fix 2: add `'ready'` to sweepUCCompletions status filter |
| `~/.openclaw/genome/core/task-store.js` | Fix 3: add 2h done-task cooldown to createTask UC+agent guard |
