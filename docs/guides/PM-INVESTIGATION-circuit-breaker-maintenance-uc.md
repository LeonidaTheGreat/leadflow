# PM Investigation: Circuit Breaker False Positive — uc-leadflow-maintenance

**Date:** 2026-05-12  
**Task:** bccfc094-1744-4456-b577-47aa48bebafd  
**Verdict:** FALSE POSITIVE — circuit breaker fired on phantom estimated costs

---

## Trigger

Circuit breaker tripped after 22+ tasks and $16.02 computed cost. Investigation requested: DECOMPOSE, CHANGE APPROACH, CANCEL, or INCREASE BUDGET.

## Actual Numbers

| Metric | Breaker Saw | Reality |
|--------|-------------|---------|
| Total cost | $16.02 | **$0.52** (actual_cost_usd) |
| Tasks counted | 22 | 24 total, but 8 are human-gated backlog |
| Tasks that actually ran | — | 2 QC reviews |

The breaker computed $16.02 by summing `estimated_cost_usd` for tasks that never spawned. This is a genome accounting bug.

## Root Causes

### 1. Circuit Breaker Counts Phantom Estimated Costs
The breaker uses `actual_cost_usd` with fallback to `estimated_cost_usd` per task. For 8 backlog tasks at $1.00 estimated each = $8.00 phantom cost. Same for 4 cancelled/failed tasks at $0.28 each. Total phantom: $15.50.

**Fix:** Only count `actual_cost_usd`. Tasks that never spawned have zero real cost.

### 2. Catch-All UC Guarantees Repeated Breaker Trips
`uc-leadflow-maintenance` is a bucket for all ad-hoc work: Twilio credentials, A2P registration, Stripe manual tests, CLAUDE.md updates, pilot recruitment. These domains have nothing in common. Every future maintenance task lands here, inflating counts indefinitely.

**Fix:** DECOMPOSE — separate autonomous work from human-gated work.

### 3. Human-Gated Tasks Permanently Inflate the Count
8 backlog tasks require human action (Twilio console, A2P 10DLC approval, pilot recruitment, GA4 env var). They cannot be autonomously completed and will never move out of `backlog`. Each costs $1.00 in estimated credit against the breaker ceiling.

**Fix:** Tag tasks `human_gated` and exclude them from circuit breaker task count and cost sum.

### 4. QC Tasks Mis-Assigned to This UC
QC review tasks for PR #1570 (belongs to uc-genome-architecture-diagrams) and PR #1571 (orphan dev task) were created under `uc-leadflow-maintenance`. This inflated task count with work unrelated to this UC.

**Fix:** QC tasks must inherit `use_case_id` from the dev task being reviewed.

---

## Recommendation: DECOMPOSE

**Do NOT:** Cancel (legitimate completed work exists). Do NOT increase budget (real spend is $0.52). Do NOT change approach without fixing the genome.

**Do:**

1. **Fix genome circuit breaker** — use `actual_cost_usd` only; exclude `human_gated` tagged tasks
2. **Fix QC task UC assignment** — inherit `use_case_id` from dev task
3. **Tag 8 backlog tasks** as `human_gated`; move to a separate checklist or manual tracking  
4. **Reset UC to `partial`** — it has 7 legitimate done tasks; let it continue
5. **Merge PR #1569** — backlog audit PR, QC approved, stuck on pending `code_reviews` status

---

## Human-Gated Tasks to Relocate

These 8 tasks cannot be autonomously completed and should not live in an autonomous pipeline UC:

- Complete A2P 10DLC registration (×2)
- Verify Twilio console webhook URL after decommission
- Approve pilot agent recruitment
- Replace GA4 placeholder with real measurement ID in Vercel env
- Run a live Stripe test checkout to verify webhook → subscriptions table
- Test full trial signup end-to-end
- Update CLAUDE.md agent counts — stale data

---

## Impact if Not Fixed

This same circuit breaker false positive will recur every 30–60 days as new maintenance tasks accumulate. The genome wastes two PM investigation cycles each time ($1.20 each). The cost of fixing the breaker is one 20-line dev change.
