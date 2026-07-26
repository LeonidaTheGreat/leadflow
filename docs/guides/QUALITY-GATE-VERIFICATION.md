# Quality Gate Verification — Dev Agent Rule

**Added:** 2026-07-25 (task 73b895fc)
**Reason:** Three consecutive fix-task cancellations (ea06566d, 597e0b88, 8170e4f4) caused by dev agents declaring done without re-running the triggering gate command.

## Rule

Before calling `reportSuccess()` on any fix task, re-run the EXACT gate command that triggered the task and confirm it exits 0:

| Trigger | Gate command |
|---------|-------------|
| Build failure | `npm run build 2>&1 \| tail -5` |
| Test failures | `npm test 2>&1 \| tail -5` |
| Lint errors | `npm run lint 2>&1 \| tail -5` |
| Security vulnerabilities | `npm audit --audit-level=high 2>&1 \| tail -5` |

Include the gate output in your completion report under `"gateVerification"`.

## Where This Rule Lives

- `~/.openclaw/workspace-dev/RULES.md` — `## Quality Gate Verification` section
- `~/.openclaw/workspace-dev/SOUL.md` — bullet in "What You Don't Do"
- `~/projects/genome/core/food/role-context.js` — `### QUALITY GATE VERIFICATION` in dev fix-task block (genome commit 63229d89)
