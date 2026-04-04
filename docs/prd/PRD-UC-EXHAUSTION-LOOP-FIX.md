# PRD: Fix UC Exhaustion Loop — Duplicate PM Task Creation

**ID:** prd-uc-exhaustion-loop-fix  
**Status:** approved  
**Created:** 2026-04-04  
**Author:** PM Agent  
**Affects:** genome (OpenClaw Genome)

---

## Problem Statement

The `_checkUCExhausted()` function in `heartbeat-executor.js` creates duplicate "PM: Investigate stuck UC" tasks when a use case hits the exhaustion threshold. A single UC can trigger 2–3 task creations per heartbeat cycle because:

1. The function is called from **three separate code paths** within each heartbeat:
   - `rescueStuckChains()` (line ~1224)
   - `retryStuckUCs()` (line ~1647)
   - `retryNeedsMergeUCs()` (line ~1808)
2. There is **no early exit** when the UC is already marked `implementation_status = 'stuck'`
3. The `findTaskByTitle()` guard can be bypassed by race conditions or status transitions

**Observed impact:** "PM: Investigate stuck UC — uc-distribution-loop-fix" created 3× in 2 hours, consuming agent budget and creating noise in the task queue.

---

## Root Cause

**File:** `~/.openclaw/genome/core/heartbeat-executor.js`  
**Function:** `_checkUCExhausted(ucId, ucName, maxTotalAttempts)`

The function lacks an early-exit guard at the top. When a UC is already marked `stuck`, all three calling paths re-execute the full exhaustion logic:

```
[rescueStuckChains] → _checkUCExhausted(ucId) → marks stuck, creates PM task
[retryStuckUCs]     → _checkUCExhausted(ucId) → marks stuck again, may create PM task
[retryNeedsMergeUCs]→ _checkUCExhausted(ucId) → marks stuck again, may create PM task
```

The existing `findTaskByTitle()` guard only prevents duplicates if the task is still in `ready` status. Any timing gap between the three calls — or status transitions on the PM task — allows a second or third task to slip through.

---

## Requirements

### R1 — Early Exit for Already-Stuck UCs (P1)
At the **top** of `_checkUCExhausted()`, before any task queries or counts:
- Query `use_cases` for the UC's current `implementation_status`
- If `implementation_status = 'stuck'`, return `true` immediately
- Log: `"UC {ucId} already stuck — skipping exhaustion check"`

**Acceptance criteria:**
- `grep -n "implementation_status.*stuck.*return" ~/.openclaw/genome/core/heartbeat-executor.js` returns at least 1 match inside `_checkUCExhausted`

### R2 — Single PM Task Per UC (P1)
The `findTaskByTitle()` guard must also check across all `project_id` values, not just the current project, to catch cross-project PM tasks.

Alternatively: After creating the PM task, write a flag to the UC's `metadata` column (e.g., `pm_task_created: true`) and check this flag at the top of `_checkUCExhausted()` before querying tasks.

**Preferred approach:** UC `metadata` flag + early-exit guard (belt and suspenders).

**Acceptance criteria:**
- Running `_checkUCExhausted()` on an already-stuck UC 3× in sequence creates exactly 1 PM task (verified via task count query in Supabase)

### R3 — Consistent De-duplication Across Call Sites (P2)
All three call sites (`rescueStuckChains`, `retryStuckUCs`, `retryNeedsMergeUCs`) must respect the early exit in R1. No separate guards needed at each call site — the function-level guard is sufficient.

### R4 — No Silent Failure (P2)
The early exit must log at debug level so it's visible in heartbeat logs without being noisy. Format: `[_checkUCExhausted] UC {ucId} already stuck, skipping`

---

## Implementation Spec

**Target file:** `~/.openclaw/genome/core/heartbeat-executor.js`

**Change:** Insert at the top of `_checkUCExhausted()`, after the `if (!this.store.supabase)` guard:

```javascript
// Early exit: UC already marked stuck — don't re-trigger exhaustion logic
const { data: ucStatus } = await this.store.supabase
  .from('use_cases')
  .select('implementation_status, metadata')
  .eq('id', ucId)
  .maybeSingle()

if (ucStatus?.implementation_status === 'stuck') {
  console.log(`   [_checkUCExhausted] UC ${ucId} already stuck, skipping`)
  return true
}
```

**Also change:** After creating the PM task, mark the UC metadata:
```javascript
await this.store.supabase
  .from('use_cases')
  .update({ metadata: { ...existingMetadata, pm_investigation_task_created: true } })
  .eq('id', ucId)
```

---

## E2E Test Specs

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| T1 | UC hits 8 attempts | Call `_checkUCExhausted(ucId)` once | UC marked stuck, 1 PM task created |
| T2 | UC already stuck | Call `_checkUCExhausted(ucId)` again | Returns `true` immediately, no new task |
| T3 | Three call paths same cycle | Simulate rescueStuckChains + retryStuckUCs + retryNeedsMergeUCs all calling `_checkUCExhausted(ucId)` | Exactly 1 PM task in DB |

---

## Out of Scope
- Changes to `findTaskByTitle()` (not broken, just insufficient alone)
- Changes to how UCs enter the exhaustion threshold (8 attempts)
- Changes to PM task content or routing

---

## Affected Projects
- **genome** — implementation changes required in `heartbeat-executor.js`
