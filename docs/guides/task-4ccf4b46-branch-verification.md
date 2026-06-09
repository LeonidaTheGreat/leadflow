# Task 4ccf4b46 — Dev Agent Commit Verification Rule

## Task
Improve dev agent instructions: add COMMIT VERIFICATION rule to prevent agents exiting without committing (root cause of 45 failures this week).

## Verification

Rule is present in all three authoritative locations:

**SOUL.md** (`/Users/clawdbot/.openclaw/workspace-dev/SOUL.md`, line 62):
> **COMMIT VERIFICATION (mandatory).** Before reporting task completion, run `git log --oneline HEAD -1` and confirm your commit is present. Include that output line in your completion report as evidence.

**genome/core/food/role-context.js** (lines 369–370, genome commit `519edd0`):
```
- COMMIT VERIFICATION (mandatory): before reporting task completion, run `git log --oneline HEAD -1` and confirm your commit is present
- "No commits on branch" is the #1 cause of task failure...
```

**genome/intelligence/workflow-engine.js** (line 202):
```js
// COMMIT VERIFICATION policy (`git log --oneline HEAD -1` before completion).
```

## Commit Verification (this task)
Changes are in the genome repo (commit `519edd0 docs: add dev commit verification rule to role context`).
No leadflow application code was changed — this verification doc is the branch artifact.
