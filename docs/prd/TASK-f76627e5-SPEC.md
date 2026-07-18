# Circuit Breaker Investigation — fix-qc-agent-never-dispatched-for-15-awaiting-merge-ta
**Task:** f76627e5-0c29-4381-bb8e-fadd18d26860
**Date:** 2026-07-18
**Recommendation:** INCREASE BUDGET + CHANGE APPROACH

---

## Findings

### Why the circuit breaker keeps tripping
- Budget limit: $10. Cumulative UC spend: $20.37 across 5 tasks.
- The CB counter accumulates across retry rounds — already over budget before any new attempt can run.
- Two tasks (4dc34721, 6120ad30) cancelled at $0.00 — killed before spawning.

### Why dev tasks keep failing
- Task 2eb6252b (claude-opus-4-7) modified `core/loops/pr-review-loop.js` — the **wrong file**.
  - It wrote a backfill dedup test, not the root fix.
  - PR #437 was closed by safety-net cleanup (no real changes on branch).
- Tasks 4dc34721 and 6120ad30 were cancelled by circuit breaker before even spawning.

### Root bug status: UNFIXED
`/Users/clawdbot/projects/genome/core/loops/spawn-health-monitor.js` line 283 still reads:
```js
.eq('project_id', this.projectId)
```
`getAllProjectIds` is exported from project-config-loader.js (line 185, 285) but not imported or used in spawn-health-monitor.js.

### Current queue state
- 10 tasks in `awaiting_merge` (4 genome, 2 leadflow + others) — no QC tasks stuck in `ready` right now.
- The immediate pain has cleared, but the bug will recur when a new QC task's NOTIFY event is missed.

---

## New Dev Task Spec

**Title:** Fix: spawn-health-monitor.js detectStuckSpawns uses single-project filter — cross-project QC tasks get stuck

**Working directory:** `/Users/clawdbot/projects/genome` (NOT leadflow)

**File to change:** `core/loops/spawn-health-monitor.js`

**Change 1 — Add import (line ~14):**
```
// BEFORE:
const { getProjectDir } = require('../project-config-loader')

// AFTER:
const { getProjectDir, getAllProjectIds } = require('../project-config-loader')
```

**Change 2 — Fix query (line 283, inside detectStuckSpawns()):**
```
// BEFORE:
.eq('project_id', this.projectId)

// AFTER:
.in('project_id', getAllProjectIds())
```

**Scope: ONLY these 2 lines. No new files. No infrastructure changes.**

**Verification:**
```bash
grep 'getAllProjectIds' core/loops/spawn-health-monitor.js   # → 2 results (import + usage)
grep -n 'this\.projectId' core/loops/spawn-health-monitor.js  # → 0 results in detectStuckSpawns
```

**Budget for new task:** $8 (2-line surgical fix, no exploration needed)

**Budget increase for UC:** $35 total ($20.37 already spent + $8 dev + $4 QC + buffer)
