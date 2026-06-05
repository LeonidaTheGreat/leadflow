<!--
TASK SPEC (0a6616ad-f594-42ef-968d-a885f4555f5b)
What:
- Create file: docs/verification-0a6616ad-no-commits-retry1.md
- Purpose: add a minimal tracked documentation artifact so the branch has a concrete commit for
  verification. The actual code fix was already applied to ~/projects/genome at commit c22c159.

Verify:
- Run: git log --oneline origin/main..HEAD (shows at least one commit after push)
- Run: git diff --name-only origin/main...HEAD (shows only this file)

Boundaries:
- Do not modify application code, routes, services, tests, migrations, or configs.
- Do not change previously delivered task implementation in genome.
- Do not touch protected files listed in task instructions.
-->

# Verification Retry Note — Task 0a6616ad

This commit exists solely to fix the CI verification failure `no commits on branch` for task
`0a6616ad-f594-42ef-968d-a885f4555f5b`.

## Actual Fix (already applied)

The code fix was applied directly to `~/projects/genome/core/food/spawn-preparer.js` at genome
commit `c22c159 fix(spawn-preparer): exempt maintenance UCs from circuit breaker`:

1. **Primary fix (line 407):** Changed circuit-breaker guard from `if (task.use_case_id && store.db)`
   to `if (task.use_case_id && store.db && !MAINTENANCE_UC_SET.has(task.use_case_id))`.
   `MAINTENANCE_UC_SET` = `{uc-leadflow-maintenance, uc-genome-maintenance, uc-bo2026-maintenance}`.

2. **Secondary fix (line 427):** Added recently-cancelled check (2 h window) so `findTaskByTitle`
   dedup also suppresses investigation tasks that were cancelled within the last 2 hours, preventing
   the circuit-breaker from re-creating them every heartbeat.

No product behavior or source code in this (leadflow) repository was changed.
