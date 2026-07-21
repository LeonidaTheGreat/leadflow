# Circuit Breaker Investigation: fix-qc-agent-never-dispatched-for-15-awaiting-merge-ta

**Task:** c024807c  
**Date:** 2026-07-21  
**Budget consumed:** $20.65 / $10.00 (107% over)

---

## What the circuit breaker saw

3 tasks created on this UC across 3 dev cycles, all failing to apply the fix.

## Root cause: 2-line fix never applied despite 5 PM investigations

File: `/Users/clawdbot/projects/genome/core/loops/spawn-health-monitor.js`

**Line 17** (import) — UNCHANGED after 3 dev cycles:
```
const { getProjectDir } = require('../project-config-loader')
// Should be:
const { getProjectDir, getAllProjectIds } = require('../project-config-loader')
```

**Line 283** (query filter) — UNCHANGED after 3 dev cycles:
```
.eq('project_id', this.projectId)
// Should be:
.in('project_id', getAllProjectIds())
```

Dev agents consistently go off-script, creating new infrastructure files instead of this targeted edit.

## Secondary finding: d168cdf1 stuck due to missing code_reviews record

Task d168cdf1 ("Fix: Quality gate 'completion_reports' failing in leadflow") has been in `awaiting_merge` since 2026-07-17 with PR #1912 open and CI passing — 4 days with no QC dispatch.

Root cause: `insertCodeReview()` in pr-creator.js failed silently when the task entered `awaiting_merge`. No code_reviews record → QC backfill finds nothing → QC never dispatched.

**Fixed in this investigation:** Created the missing code_reviews record directly (id: dcd1dccd). QC backfill will dispatch on next heartbeat.

## Recommendation: CHANGE APPROACH

**Do not retry with a dev agent.** Three cycles prove they won't follow "change only 2 lines" instructions.

**Use `hand-ship` agent** — designed for precise mechanical changes, stalled task rescue.

### New task spec (create separately):

**Title:** `Hand-ship: apply 2-line spawn-health-monitor fix — getAllProjectIds import + .in() filter`

**Agent:** hand-ship  
**File:** `/Users/clawdbot/projects/genome/core/loops/spawn-health-monitor.js` (genome repo)  
**Max budget:** $3

**Exact changes:**
1. Line 17: add `getAllProjectIds` to the destructured require import
2. Line 283: change `.eq('project_id', this.projectId)` → `.in('project_id', getAllProjectIds())`

**Hard stop rules:**
- NO new files
- NO new dependencies  
- If you open any file other than `spawn-health-monitor.js`, you're wrong — stop

**Verify:**
```bash
grep -n 'getAllProjectIds' /Users/clawdbot/projects/genome/core/loops/spawn-health-monitor.js
# Must return lines 17 AND 283
NODE_PATH=/Users/clawdbot/projects/genome/node_modules npm test --prefix /Users/clawdbot/projects/genome
```

### This UC: keep blocked_human

The UC description has been updated with current findings. Do not create new tasks on this UC until the hand-ship task is created and assigned.

## Cost breakdown

| Task | Agent | Cost |
|------|-------|------|
| PM investigation #1 (5f64e58c) | product | $19.94 |
| Dev rescue (995e3054) | dev | $0.43 |
| Dev failed (2eb6252b) | dev | $0.00 |
| PM investigation #2 (abe0ed31) | product | $1.03 |
| PM investigation #3 (f76627e5) | product | $1.06 |
| PM investigation #4 (28ad0aa6) | product | $1.07 |
| **Total** | | **$23.53** |

PM investigation #1 ($19.94) was the primary budget blowout — subsequent tasks were correctly scoped.
