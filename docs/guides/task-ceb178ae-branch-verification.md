# Task ceb178ae — COMMIT VERIFICATION Rule Added to Dev Agent

## What was done

Added the COMMIT VERIFICATION mandatory rule to all authoritative locations for dev agent instructions.
Changes were committed to external repos (genome + workspace-dev), not to the leadflow application codebase.

## Files changed (external repos)

| File | Repo | Commit |
|------|------|--------|
| `core/food/role-context.js` | genome | `519edd0` |
| `intelligence/workflow-engine.js` | genome | `7645e6a` |
| `workspace-dev/SOUL.md` | workspace-dev | `7258d5e` |

## Rule added

```
COMMIT VERIFICATION (mandatory): before reporting task completion, run
`git log --oneline HEAD -1` and confirm your commit is present. Include
that output line in your completion report as evidence. "No commits on
branch" is the #1 cause of task failure. If you have nothing to commit
(task already done or no changes needed), say so explicitly in your
completion report with evidence — do not exit silently without committing
or explaining.
```

## Verification

```
node -e "const { buildRoleContext } = require('/Users/clawdbot/projects/genome/core/food/role-context');
const out = buildRoleContext('dev','demo','desc');
console.log(/COMMIT VERIFICATION/.test(out.spawnRole) && /git log --oneline HEAD -1/.test(out.spawnRole) ? 'PASS' : 'FAIL')"
```

Result: **PASS**
