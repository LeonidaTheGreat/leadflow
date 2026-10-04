# PM Investigation: Circuit Breaker — feat-stripe-webhook-dead-letter-monitor

**Task:** 4034f9ff-2b3a-4c1c-bbf7-ab4c3fd9f94b
**UC:** feat-stripe-webhook-dead-letter-monitor
**Date:** 2026-10-03
**Verdict:** **CHANGE APPROACH** — the overspend is phantom, not real. Fix a genome cost-tracking bug; do not decompose, cancel, or increase the UC's budget.

## Trigger

Circuit breaker fired: `1/23 tasks, $29.54/$15.00`. One PM task (5994b5a0) had `actual_cost_usd=$29.54` against a $15.00 UC cap (workflow length 3 × $10 base), cancelling the follow-on dev task with $0.00 spent and marking the UC `stuck`.

## Investigation

The PM task's job was to write one PRD (`docs/prd/PRD-STRIPE-WEBHOOK-DEAD-LETTER-MONITOR.md`, already present and reviewed as part of this investigation — it is a solid, verified-against-live-systems spec). Its first spawn attempt (codex runtime) died in 27 seconds (`can't find pane`, zombie after 6m, retried). The second attempt (claude-tmux, sonnet) ran for ~3 minutes and exited 0 with the PRD written.

$29.54 for a 3-minute, single-file PRD write is implausible on its face. Traced the real session transcript (`~/.claude/projects/-Users-clawdbot-projects-leadflow/d408cfb1-9474-4319-ae8f-c2d329df0712.jsonl`, session key `leadflow-5994b5a0-1791004434869`): 13 turns, 26 input + 75,773 cache-write + 1,152,187 cache-read + 11,209 output tokens. At sonnet pricing ($3/$15 per M, cache-read $0.30/M) that's **$0.7412** — not $29.54. A 40x overstatement.

### Root cause

`intelligence/completion-handler.js` tries to read real per-task cost in this order:
1. `readClaudeJsonOutput()` on the spawn's `.stdout.log` — fails here, because claude-tmux runs the full interactive TUI (ANSI terminal capture), not `--output-format json`. Returns null.
2. `readSessionActualCost(agentId, model, sessionId)` with `sessionId=null` (no session id was ever recovered from step 1) — correctly returns null per the no-cumulative-fallback fix from audit 82. Working as intended.
3. Falls back to `core/food/cost-estimator.js:historicalCost(store, model, agentId)` — **this function takes `agentId` as a parameter but never uses it in the query.** It filters only `model ILIKE '%sonnet%'`, `status='done'`, last 7 days, and takes the median of up to 10 rows — across every role (dev, qc, product, design, analytics). A lightweight PM/PRD task gets billed the median of recent **dev/qc coding tasks**, which run far longer and cost far more. That median was $29.54.

This is a genome-level measurement bug, not a leadflow product issue, and not evidence of a runaway UC. The dev task that got cancelled had spent $0.00.

### Corrective action taken (this task)

- Corrected `tasks.actual_cost_usd` on 5994b5a0 from `29.54` → `0.74` (verified real figure), with the original value, reasoning, and evidence recorded in `spawn_config.cost_anomaly_corrected` for auditability — nothing was silently overwritten.
- Reset UC `feat-stripe-webhook-dead-letter-monitor` from `stuck` → `in_progress` (real UC spend is $0.74 against a $15 cap — nowhere near tripping).
- Reset the wrongly-cancelled dev task (bd81c791) → `ready` so it re-spawns on the next heartbeat.
- Filed genome dev task `e325079e-9127-4a2d-b8a6-4e2c0c8ccdad` ("Fix: historicalCost() cost fallback ignores agent_id...") against `uc-genome-maintenance` with the two-part fix: (A) filter `historicalCost()`'s query by `agent_id`, falling back to the static per-model/per-role estimate table rather than a cross-role median when samples are too thin; (B) give claude-tmux spawns a real per-task cost signal (persist the resolved session id, or a one-shot `--output-format json` summary call) so this fallback path stops being needed for that runtime at all.

## Why CHANGE APPROACH, not CANCEL/DECOMPOSE/INCREASE BUDGET

- **Not CANCEL** — the UC is real (verified: `stripe_events`/`payments`/`subscriptions` all have 0 rows after months of claimed-complete checkout UCs; this is a legitimate P0 revenue-detection gap), and 1/3 of the workflow (PM/PRD) is done and good.
- **Not DECOMPOSE** — the PRD is already appropriately scoped (4 user stories, clear acceptance criteria, explicit non-goals). Splitting further adds coordination overhead for no benefit.
- **Not INCREASE BUDGET** — the UC never actually needed more budget. Raising the cap would have papered over the measurement bug and let it keep misfiring on the next cheap task that happens to hit the same fallback path.
- **CHANGE APPROACH** — fix the cost-attribution bug at its source (genome task filed) and unblock the UC with the real numbers. This is the "genome catches its own gaps" case CLAUDE.md asks for: a detection/accounting gap, not a product gap.
