# PM Investigation: Circuit Breaker — uc-distribution-loop-fix

**Date:** 2026-04-04
**Task ID:** 2a65ba96-78aa-4e0a-a880-2e646c982d4f
**Circuit Breaker:** 25 tasks, $16.05 spent

## Verdict: FALSE POSITIVE — CHANGE APPROACH

### The UC is Genuinely Complete

uc-distribution-loop-fix has `implementation_status=complete` and `phase=complete`.
All 4 acceptance checks pass:
- `distribution_channels` seeded with active row: PASS
- `sevenDaysAgo` dedup guard in `distribution-collector.js`: PASS
- `cutoff24h` cooldown guard in `task-store.js`: PASS
- `Skipping duplicate` log in `distribution-collector.js`: PASS

### Why the Circuit Breaker Tripped (3 genome bugs)

**Bug 1 — stuck-UC detection fires on complete UCs**
`heartbeat-executor.js` `rescueStuckChains()` / `retryStuckUCs()` do not filter
`implementation_status='complete'` from their query. A complete UC keeps triggering
PM investigation tasks indefinitely.

**Bug 2 — Supabase task write pipeline broken since ~2026-04-02**
New tasks are not being written to Supabase. Zero tasks exist for `uc-distribution-loop-fix`
in Supabase — not because no work was done, but because writes silently failed.
The genome then interprets zero tasks as no work done, triggering re-investigation.

**Bug 3 — PM investigation tasks completing hollow**
PM tasks for stuck UCs complete in under 2 minutes with no `triageOutcome`. The dispatcher
sees no completion artifact and re-spawns. This created the 25-task loop at $16.05.

## Recommendation: CHANGE APPROACH

1. **Cancel retry** of `uc-distribution-loop-fix` — it is complete
2. **Implement** `prd-genome-circuit-breaker-false-positive` (already approved)
   - Genome dev task created: `0db60842-ab66-469f-adc6-6951944389c7` (P1, project=genome)
3. **Do NOT increase budget** — the budget was consumed by the false-positive loop itself

## Genome Fix Task Created

**Task ID:** `0db60842-ab66-469f-adc6-6951944389c7`
**Project:** genome
**Priority:** 1 (Blocker)
**PRD:** `prd-genome-circuit-breaker-false-positive`

Three fixes required in genome:
1. `heartbeat-executor.js` — filter `implementation_status IN ('complete','cancelled','paused')` from stuck-UC detection
2. `task-store.js` — surface Supabase write errors; add connectivity health check
3. `workflow-engine.js` — validate PM task completion requires `triageOutcome`; retry hollow completions

## PRD Reference

Linked PRD: `prd-genome-circuit-breaker-false-positive` (status: approved)
File: `docs/prd/PRD-genome-circuit-breaker-false-positive.md` (genome repo)
