# Audit: improve-agent action_item processor (genome)

**Task:** 04c72578 — Fix: Audit the improve-agent action_item processor in genome
**Date:** 2026-08-03
**Verdict:** Handler is not broken. The upstream review generator that feeds it was silently stalled for 9 days. Fixed in genome PR [#873](https://github.com/LeonidaTheGreat/genome/pull/873).

## What was asked

> Audit the improve-agent action_item processor in genome... If a handler exists, check the last write timestamp to `~/.openclaw/workspace-dev/SOUL.md` vs task completion timestamps (ab27c3e7, 2c85a8f1 — done 2026-07-21). If no handler or broken handler, wire one.
>
> Reason: Same dev failure categories appear in 4 consecutive daily reviews. Improve-agent tasks were marked done on 2026-07-21 but identical failure patterns persist.

## Investigation

`grep -r 'improve-agent' ~/projects/genome/core/` surfaced the generator (`core/loops/strategic-review-loop.js`); the actual write handler lives in `~/projects/genome/intelligence/strategic-review-handler.js` (`StrategicReviewHandler.processStrategicReview()`, wired from `completion-handler.js`).

**The handler itself is not broken.** It was already fixed on 2026-07-25 (genome commit `fb17f240`, done by Stojan directly): it appends `improve-agent` instructions straight to the workspace `RULES.md` (falling back to `SOUL.md`), with content-based dedup, instead of the old broken pattern of creating a dev task to edit those files (dev tasks run in project worktrees with no access to `~/.openclaw/workspace-*`, so they phantom-completed without writing anything — that's what the 2026-07-21 tasks `ab27c3e7`/`2c85a8f1` actually hit). This matches `tests/improve-agent-dedup.test.js` (3/3 passing) and file mtimes confirmed independently:
- `~/.openclaw/workspace-dev/RULES.md` — mtime Jul 27 23:33 (after the fix)
- `~/.openclaw/workspace-dev/SOUL.md` — mtime Jul 25 20:06 (after the fix)

So the write path works. **The real root cause is upstream:** `orchestratorStrategicReview()` (`core/loops/strategic-review-loop.js`) generates the "Orchestrator: Daily Strategic Review" task whose completion produces the `improve-agent` action_items in the first place. Its dedup guard —

```js
const existing = await this.store.findTaskByTitle(existingTitle)
if (existing) { console.log('   Strategic review task already active'); return }
```

— only excludes `done`/`failed`/`cancelled` tasks, with **no staleness timeout**. Confirmed against production Postgres (`openclaw` DB, `leadflow` project):

- `.orchestrator-review-state.json` (`~/projects/genome/state/leadflow/`) was frozen at `lastRun: 2026-07-26T00:12:20.429Z` for 9 days — no new run recorded, no error logged anywhere.
- The last `tasks` row titled "Orchestrator: Daily Strategic Review" (id `2150faa3`) was created 2026-07-25 20:12, status `ready`/non-terminal, and was **not actually worked until 2026-08-03 21:49** — a 9-day spawn-queue stall for the `product` agent.
- Every heartbeat in between (leadflow heartbeats run every ~20–30 min, confirmed active via other state files updating normally) hit the "already active" branch and returned immediately — before the code ever reaches the `fs.writeFileSync` for the state file. No exception is thrown (so genome's step-failure self-healer, which auto-creates `Fix: Genome step X failing` tasks on uncaught errors, never fired — there was nothing to catch).
- Net effect: **zero new `improve-agent` (or any) action items were generated for leadflow for 9 days**, which is exactly why the same dev/qc failure categories kept reappearing in review after review with nothing acting on them — not because the handler no-ops, but because it was never being fed new work.

I reproduced this behavior directly against the production store (read-only dry run, `createTask`/`fs.writeFileSync` stubbed) and confirmed `orchestratorStrategicReview()` returns immediately whenever a non-terminal review task exists, regardless of age.

## Fix

Genome PR [#873](https://github.com/LeonidaTheGreat/genome/pull/873) (branch `fix/04c72578-orchestrator-review-stale-task-block`, not merged by this task — left for review since it changes the live orchestration engine):

- Adds `STALE_REVIEW_TASK_HOURS = 48` (2x the 24h cooldown).
- If the existing review task is older than that, it's treated as stuck (queue starvation, not real progress): cancelled, and a fresh review is generated instead of blocking forever.
- New test `tests/strategic-review-stale-task.test.js` (5 cases). Full genome suite: 3460/3461 pass — the one failure is a pre-existing, unrelated `npm audit` CVE gate (`brace-expansion` transitive dependency), not touched by this change.

## Why this leadflow PR has no code changes

The bug and its fix are entirely in the genome repo (`~/projects/genome`), a separate git repository from `leadflow`. There is no leadflow-side code to change. This doc is the leadflow-side record of the audit; the actual fix ships via the genome PR linked above.

## Follow-up (not fixed here, out of scope)

`opusStrategicReview()` in the same file has an analogous (but currently unobserved) risk: its existing-task check also has no staleness escape valve, though it does filter by status. Worth a similar staleness guard if this pattern recurs there.
