# PRD: Loop Detection Handler — Prevent Duplicate Investigations

**PRD ID:** `prd-loop-detection-handler-fix`  
**Status:** Ready for Implementation  
**Priority:** P1 (Blocker)  
**Version:** 1.0  
**Date:** 2026-03-30  

---

## Executive Summary

The loop detection mechanism (`task-store.js`, lines 138-157) correctly identifies when the same task is created 3+ times within 2 hours and creates a "PM: Loop detected" meta-task to escalate the issue. However, the handler itself is being created repeatedly (once per heartbeat) because the deduplication check has a logic gap.

**Current behavior:**
- Heartbeat 1 (t=0): Revenue alert duplicate #1 detected → "PM: Loop detected" task created
- Heartbeat 2 (t=30s): Revenue alert duplicate #2 detected → Another "PM: Loop detected" task created
- Heartbeat 3 (t=60s): Revenue alert duplicate #3 detected → Another "PM: Loop detected" task created
- Result: Multiple "PM: Loop detected — PM: Revenue alert..." tasks accumulate

**Required fix:** The handler deduplication check should account for the fact that the same investigation task may be created across multiple heartbeats when the underlying loop hasn't been fixed yet.

---

## Problem Statement

### Current Loop Detection Code
**File:** `~/projects/genome/core/task-store.js`, lines 138-157

```javascript
// Runtime loop detection: 3+ tasks with same title prefix in 2h = loop
if (this.supabase) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const titlePrefix = task.title.slice(0, 60)
    const { data: recentSimilar } = await this.supabase.from('tasks')
      .select('id')
      .eq('project_id', this.projectId)
      .ilike('title', titlePrefix + '%')
      .gte('created_at', twoHoursAgo)
    
    if (recentSimilar?.length >= 3) {
      console.warn(`[TaskStore] LOOP DETECTED: "${titlePrefix}..." created ${recentSimilar.length}x in 2h`)
      const invTitle = `PM: Loop detected — ${titlePrefix}`.slice(0, 120)
      
      // Deduplication: only create the investigation task if one doesn't already exist
      const { data: existingInv } = await this.supabase.from('tasks')
        .select('id')
        .eq('project_id', this.projectId)
        .eq('title', invTitle)
        .not('status', 'in', '("done","failed","cancelled")')
        .limit(1)
      
      if (!existingInv?.length) {
        // Create investigation task
        await this.supabase.from('tasks').insert({ /* ... */ })
      }
      return null
    }
  } catch {}
}
```

### The Gap

The check at line 153 queries for existing investigation tasks with status NOT IN (done, failed, cancelled). This means it checks for tasks with status 'ready', 'in_progress', or 'spawned'.

**However**, if the investigation task from heartbeat 1 is still in status='ready' by heartbeat 3, the check will correctly skip re-creation. But **observation shows that multiple "PM: Loop detected" tasks are being created**, which suggests:

1. **The investigation task gets marked done/failed/cancelled quickly** (within 30 seconds), allowing the next heartbeat to create a new one
2. **OR** the check is not working as intended due to query timing, transaction isolation, or null handling

### Impact

- **Orchestration Noise:** Multiple investigation tasks accumulate, each asking PM to "investigate the handler"
- **Wasted Capacity:** PM is asked to investigate the same underlying issue multiple times
- **Root Cause Hidden:** Instead of focusing on fixing the revenue-collector, the PM loop gets deeper

---

## Solution Design

### Root Cause Analysis

Given the failure pattern (multiple "PM: Loop detected" tasks created 3x in 2 hours), the most likely cause is:

1. **Investigation task is marked done too quickly** — A prior PM investigation task may have been marked 'done' or 'failed' before the next heartbeat, allowing a new one to be created
2. **OR the query has an issue** — The `.not('status', 'in', '(...)')` syntax may not work as expected in Supabase PostgREST
3. **OR timing race condition** — The task is created after the query, but before the check fully completes

### Implementation Requirements

#### Option A: Extended Deduplication Window (Recommended)

**Change:** Track whether an investigation task was already created for this loop in the *current heartbeat cycle*, not just globally.

**File:** `~/projects/genome/core/task-store.js`

**Approach:**
1. Add a `loopDetectionCache` (in-memory, cleared each heartbeat)
2. Before checking the database, check the cache
3. If investigation task was already created in this heartbeat, skip re-creation
4. Cache is cleared at the start of each heartbeat

**Pseudocode:**
```javascript
// At module level
const loopDetectionCache = new Set() // { "PM: Loop detected — ...", ... }

// Inside createTask()
const loopDetectionKey = `PM: Loop detected — ${titlePrefix}`
if (loopDetectionCache.has(loopDetectionKey)) {
  console.log(`[TaskStore] Loop investigation already created this heartbeat: skipping`)
  return null
}

if (recentSimilar?.length >= 3) {
  const invTitle = `PM: Loop detected — ${titlePrefix}`.slice(0, 120)
  
  // Check DB for existing investigation (older approach)
  const { data: existingInv } = await this.supabase.from('tasks')
    .select('id')
    .eq('project_id', this.projectId)
    .eq('title', invTitle)
    .not('status', 'in', '("done","failed","cancelled")')
    .limit(1)
  
  if (!existingInv?.length) {
    // Create investigation task
    await this.supabase.from('tasks').insert({ /* ... */ })
    loopDetectionCache.add(loopDetectionKey) // Cache it
  }
  return null
}

// Clear cache at heartbeat start (called from heartbeat-executor or realtime-dispatcher)
function resetLoopDetectionCache() {
  loopDetectionCache.clear()
}
```

#### Option B: Status-Based Deduplication

**Change:** When creating the investigation task, explicitly set its status to 'in_progress' to indicate it's actively being handled, and update the check to include this status.

**File:** `~/projects/genome/core/task-store.js`

**Approach:**
1. Investigation tasks are created with status='in_progress' (not 'ready')
2. The deduplication check includes 'in_progress' in the list of "active" statuses
3. When investigation is complete, task moves to 'done' or 'cancelled'

**Pseudocode:**
```javascript
const { data: existingInv } = await this.supabase.from('tasks')
  .select('id, status')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .in('status', ['ready', 'in_progress', 'spawned'])  // Only check for truly active tasks
  .limit(1)

if (!existingInv?.length) {
  // Create with status='in_progress' to signal it's being handled
  await this.supabase.from('tasks').insert({
    title: invTitle,
    status: 'in_progress',  // Signal: investigation is active
    // ... rest of fields
  })
}
```

#### Option C: Timestamp-Based Gate (Most Robust)

**Change:** Track the last time an investigation task was created for each loop type, and only create a new one if the previous one is older than a threshold (e.g., 30 minutes).

**File:** `~/projects/genome/core/task-store.js`

**Approach:**
1. Query for the most recent investigation task with the same title
2. If found and created less than 30 minutes ago, skip re-creation
3. Otherwise, create a new one (indicating the issue persists)

**Pseudocode:**
```javascript
const { data: lastInv } = await this.supabase.from('tasks')
  .select('id, created_at')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .not('status', 'in', '("cancelled")')  // Include done/in_progress
  .order('created_at', { ascending: false })
  .limit(1)

const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)
if (lastInv?.length && new Date(lastInv[0].created_at) > thirtyMinutesAgo) {
  console.log(`[TaskStore] Loop investigation created ${Math.round((Date.now() - new Date(lastInv[0].created_at)) / 1000)}s ago: skipping`)
  return null
}

// Create new investigation task
```

### Recommendation

**Go with Option C (Timestamp-Based Gate).** Reasons:

1. **Most robust:** Works across process restarts and timeouts (no in-memory cache loss)
2. **Most transparent:** Allows legitimate re-investigation if the loop persists for 30+ minutes
3. **Least invasive:** Minimal changes to existing code, uses database as source of truth
4. **Most maintainable:** Threshold is clear and easy to tune

---

## Acceptance Criteria

### 1. No Duplicate Investigation Tasks Within 30 Minutes
- **Test:** Simulate a revenue alert loop by calling `createTask()` 6+ times with identical title within 30 minutes
- **Expected:** Only 1 investigation task with title `PM: Loop detected — PM: Revenue alert...` is created
- **Verify:** Query tasks table where `title LIKE 'PM: Loop detected — PM: Revenue alert%'` — count should be 1 within any 30-minute window

### 2. Investigation Task Persists Until Root Cause Fixed
- **Test:** Let the revenue-collector loop continue for 35+ minutes without fixing the root cause
- **Expected:** After 30 minutes, a new investigation task is created (allowing re-escalation if the issue persists)
- **Verify:** Count tasks with title `PM: Loop detected — PM: Revenue alert%` created > 30 minutes apart

### 3. Logs Show Deduplication Decision
- **Test:** Run heartbeat twice with identical loop condition
- **Expected:** Second run logs `"Loop investigation created X seconds ago: skipping"` instead of creating another task
- **Verify:** Grep `task-store.js` logs for deduplication message

### 4. Loop Detector Itself Cannot Loop
- **Test:** Trigger 3+ investigations for different loops within 2 hours (e.g., revenue alert + budget alert + deployment alert)
- **Expected:** Each gets a single investigation task; no "PM: Loop detected — PM: Loop detected" meta-task
- **Verify:** No task titles containing "Loop detected — PM: Loop detected" exist in database

---

## Implementation Checklist

- [ ] Modify `~/projects/genome/core/task-store.js` to add timestamp-based deduplication
- [ ] Add console.log for deduplication decision (for debugging)
- [ ] Test: Trigger the same loop 6+ times within 30 minutes → verify only 1 investigation task
- [ ] Test: Trigger 3+ different loops within 2 hours → verify no nested "Loop detected — Loop detected"
- [ ] Validate: No regressions in non-loop tasks (should still be created normally)
- [ ] Document: Add comment in code explaining the 30-minute threshold

---

## Related Tasks

- **Upstream fix required:** `PRD-FIX-REVENUE-COLLECTOR-LOOP` — Fix the revenue-collector to deduplicate tasks at source
- **Investigation reference:** `PRD-LOOP-DETECTION-HANDLER-INVESTIGATION` — Root cause analysis of the loop detector

---

## Notes

This is a defensive fix. The **primary** solution is to fix the revenue-collector itself (PRD-FIX-REVENUE-COLLECTOR-LOOP). This investigation handler improvement ensures that even if other loops emerge, the orchestration system remains stable and doesn't drown in investigation meta-tasks.
