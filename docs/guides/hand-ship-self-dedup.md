# Hand-Ship Self-Dedup Rule

**Added:** 2026-07-20
**Genome commit:** 68936dd (feat: add self-dedup check to hand-ship spawn message)

## Problem

Three consecutive hand-ship tasks failed with `Pre-spawn dedup: identical task completed recently`. The pre-spawn dedup guard runs before the agent is spawned, but there is a race window between that check and actual execution start. When genome dispatches a hand-ship and a concurrent task completes before the agent begins work, the agent still runs and creates double-commits, double-PRs, and merge conflicts.

## Solution

Added a self-dedup check to both:
1. `~/.claude/agents/hand-ship.md` — the agent reads this as its primary instructions
2. `~/projects/genome/core/dispatch/hand-ship-dispatcher.js` (`buildSpawnMessage`) — the check is embedded directly in every spawn message

The agent now runs the following query as its FIRST action before touching any file:

```sql
SELECT id, status, updated_at
FROM tasks
WHERE title = '<this task title>'
  AND agent_id = 'hand-ship'
  AND status = 'done'
  AND updated_at > NOW() - INTERVAL '24 hours'
ORDER BY updated_at DESC LIMIT 1;
```

If a row is returned, the agent logs the existing task ID and exits immediately with `status=completed, reason=self-dedup-no-op`.
