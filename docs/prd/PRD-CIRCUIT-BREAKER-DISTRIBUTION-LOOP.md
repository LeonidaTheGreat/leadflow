# PRD: Circuit Breaker — uc-distribution-loop-fix

**ID:** prd-circuit-breaker-distribution-loop  
**Status:** approved  
**Date:** 2026-04-04  
**Author:** PM Agent  

## Summary

Circuit breaker tripped for `uc-distribution-loop-fix`: 26 tasks, $16.65 spent. Investigation reveals the underlying issue is **already resolved** but the UC is stuck in a task-creation loop due to merge gate requirements.

## Investigation Findings

### Root Cause
The UC's acceptance check **passes** — `distribution_channels` table exists with an active landing page record (`COUNT(*) = 1`). The actual fix was applied via migration-fix-006 on 2026-03-31.

However, the UC remains `stuck` because:
1. All 3 associated PRs (#736, #796, #813) are **closed** (not merged)
2. The genome's `sweepUCCompletions` merge gate requires a merged PR for dev workflow UCs
3. Without a merge, the UC stays `stuck` → triggers `retryStuckUCs` → creates new PM investigate tasks every ~1 hour
4. Today alone: 7 PM investigate tasks spawned + 4 circuit breaker cancellations

### Cost Breakdown
| Category | Count | Cost |
|----------|-------|------|
| Dev tasks (re-merge attempts) | 8 | ~$0.70 |
| PM investigate tasks (loop) | 8 | ~$9.48 |
| QC tasks | 1 | $0 |
| Product chain tasks | 1 | $0 |
| Cancelled | 8 | $0 |
| **Total** | **26** | **$16.65** |

### Why PRs Were Never Merged
The dev tasks kept creating branches and PRs, but QC reviewed and closed them (likely due to merge conflicts or the fix already being applied via direct migration rather than through a PR workflow).

## Recommendation: CANCEL

**Action:** Mark UC as `done` — the acceptance criteria are met.

### Justification
1. **Acceptance check passes:** `SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'` returns `1`
2. **Fix is live:** The `distribution_channels` table was populated by migration-fix-006 on 2026-03-31
3. **No PR needed:** The fix was a data migration, not a code change that needs merging
4. **Continuing costs money:** Every heartbeat spawns another PM investigate task ($2.35/each on sonnet)
5. **Priority 4 (maintenance):** This is the lowest priority — budget is better spent on P1/P2 work

### Action Items
1. Set `implementation_status = 'done'` on `uc-distribution-loop-fix`
2. No further dev/QC work needed — the fix is already in production
3. Consider adding a genome-level guard: if acceptance_checks pass but merge gate blocks, auto-complete the UC

## Genome Improvement Opportunity

The genome should check acceptance_checks BEFORE enforcing the merge gate. If all acceptance checks pass, the UC should be completable regardless of PR status. This prevents budget waste on UCs where the fix was applied through non-PR channels (direct migrations, manual fixes, etc.).
