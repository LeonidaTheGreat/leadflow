# Dev Agent — BLOCKED_HUMAN Circuit Breaker

Added pre-flight checks to prevent wasted retries on known-blocked UCs.

## Problem
Dev agent accumulated 50 failures/week with 58-136 retry attempts per blocked_human UC.
Pattern: PR closed → rescue task spawned → rescue PR closed → repeat.

## Solution
Three mandatory SQL checks before writing any code (added to RULES.md, SOUL.md, and genome role-context.js):

1. `SELECT implementation_status FROM use_cases WHERE id = '<uc_id>'` — stop if `blocked_human`
2. `SELECT last_error FROM tasks WHERE use_case_id = '<uc_id>' AND status IN ('failed','blocked') ORDER BY updated_at DESC LIMIT 1` — stop if last_error contains `safety net cleanup`, `blocked_human`, or `PR closed`
3. Upstream dependency check — stop if any UC in `depends_on[]` has `implementation_status = 'blocked_human'`

## Files Changed
- `/Users/clawdbot/.openclaw/workspace-dev/RULES.md` — new `BLOCKED_HUMAN CIRCUIT BREAKER` section
- `/Users/clawdbot/.openclaw/workspace-dev/SOUL.md` — added reference in "What You Don't Do"
- `~/projects/genome/core/food/role-context.js` — added circuit breaker block to dev spawnRole (genome commit c009296)

## Task ID
9d822067-d489-4091-94d5-b43eb04ae716
