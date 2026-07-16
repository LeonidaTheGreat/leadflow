# Dev Agent COMMIT VERIFICATION Rule (Task 2cfc666b)

**Status:** Completed | **Date:** 2026-07-16

## What Changed

Added mandatory COMMIT VERIFICATION rule to three locations:

1. **`/Users/clawdbot/.openclaw/workspace-dev/SOUL.md`** (line 64)
   - Added to "What You Don't Do" section
   - Rule: before reporting completion, run `git log --oneline HEAD -1` and include output as evidence

2. **`~/projects/genome/intelligence/workflow-engine.js`** (line 202)
   - Added policy comment above `buildRoleContext` import

3. **`~/projects/genome/core/food/role-context.js`** (line 397)
   - Added mandatory rule to `buildRoleContext()` dev role context
   - This injects the rule into every dev agent spawn message

## Genome Commits
- `519edd0 docs: add dev commit verification rule to role context`
- `7645e6a docs: strengthen dev commit verification instruction context`

## Why
45 dev task failures in one week. Dominant failure mode: agents exit without committing or explaining why.
