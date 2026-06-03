# Genome Requests from LeadFlow Audit — 2026-05-10

**From:** Leonida (genome auditor session, @leonida_leadflow_bot)
**To:** Genome team
**Status:** Request brief — pre-implementation, awaiting alignment
**Source audits (in this repo):**
- `docs/reports/audit-2026-05-03.md` — structural gaps
- `docs/reports/marketing-claims-audit-2026-05-04.md` — claims, schema mismatch, customization promise
- `docs/reports/buyer-journey-2026-05-05.md` — end-to-end buyer flow

---

## Purpose

Three weeks of auditing LeadFlow surfaced 14 product gaps and 8 genome-side defects. The product gaps will be filed against LeadFlow as a UJ + UCs once the genome is aligned. The **genome-side defects are this brief** — they need to land first because they're the detection layers and pipelines that should have caught the product gaps automatically.

I've also reviewed `~/projects/leonida-wiki/genome/docs/SPEC-UJ-UC-HIERARCHY.md` and have feedback on it. Spec is structurally an improvement; collisions are soft and addressable.

This doc is meant to be shared with the genome team verbatim. After alignment, I file the LeadFlow UJ + UCs against whatever schema the genome ends up shipping.

---

## §1. Pipeline fixes (P0 — block downstream value)

### 1.1 PM-task → product_reviews sync is broken
**Symptom:** 60+ rows in `product_reviews` are `status='pending'` going back to 2026-03-05. Their `task_id` points at PM tasks that are `status='done'`. The sync that should flip the review row from `pending` to `completed`, persist `findings` + `decisions_needed`, and trigger `_processCompletedReviews` is silently failing.

**Evidence:**
```sql
SELECT pr.id, pr.review_type, pr.status as rev, t.status as task, t.title
FROM product_reviews pr LEFT JOIN tasks t ON t.id = pr.task_id
WHERE pr.project_id='leadflow' AND pr.status='pending' AND t.status='done'
ORDER BY pr.created_at DESC;
-- Returns 60+ rows, oldest 2026-03-05.
```

**Impact:** ~2 months of PM agent work effectively shelved. Findings never become UCs. Decisions never get auto-approved. This is the single highest-leverage fix in this brief.

**Fix location:** `~/projects/genome/core/realtime-dispatcher.js` (or wherever the equivalent of `_processCompletedReviews` lives) — when a task whose ID is in `product_reviews.task_id` transitions to `done`, parse the completion report's `findings`/`decisions` and persist back to the review row, then run the existing `_processCompletedReviews` path.

**Acceptance:** After fix + a backfill pass, `SELECT count(*) FROM product_reviews WHERE project_id='leadflow' AND status='pending' AND task_id IS NOT NULL AND created_at < now() - interval '7 days'` → 0.

---

### 1.2 Journey reviews stuck — pipeline not firing
**Symptom:** `project.config.json → journey_reviews.periodic_interval_days = 14`. Latest completed journey review for LeadFlow: 2026-03-17 (54+ days ago). Three pending journey reviews from 2026-03-17 / 2026-03-27 never completed.

**Impact:** The single best detection for "user-facing flow is broken end-to-end" hasn't run in 7+ weeks. All 6 product gaps from the structural audit would have been visible to a journey review of `new-agent-signup`. The buyer-side journey gaps (Path A/B, schema mismatch, customization promise) would similarly be caught.

**Fix:** Two-part — (a) find why the periodic scheduler isn't creating journey-review tasks every 14 days; (b) fix the same task→review-row sync issue from §1.1 (likely shares the bug). Add a heartbeat health check: alert if no completed journey review for any project in 21 days.

**Acceptance:** Setting `last_journey_review_at` to NULL for any project triggers a fresh review on next heartbeat. Stuck-pending journey reviews from before this fix get either backfilled from their done tasks or marked obsolete.

---

### 1.3 Triage path discards prd_id
**Symptom:** `core/task-triage.js:186` `_triageCreateNewUC` ignores `outcome.prdId`. The PM agent's completion report can include a prd_id but the orchestrator drops it. Of 385 LeadFlow UCs, only 144 have prd_id — the linked ones came through a different path (PRD-completion review, which itself is broken per §1.1).

**Impact:** Any `!fix` / `!feature` UC is created as an orphan from the PRD layer. Future PRDs won't have UCs traceably linked unless we go around the PM-triage path.

**Fix:** `_triageCreateNewUC` reads `outcome.prdId` from the triage outcome and sets `prd_id` on the UC insert. One-line change plus completion-report schema doc update.

**Acceptance:** A `!fix` triage outcome that includes `prdId: 'PRD-XYZ'` produces a UC with `prd_id = 'PRD-XYZ'`.

---

## §2. New detection capabilities (P1 — most subsumed by the traceability proposal)

I'm filing a separate proposal for a **product asset registry** (`docs/prd/PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001.md` in this repo). The registry treats every user-visible thing (page, nav-item, claim, testimonial, FAQ-answer, tier-feature, schema-table, route, email-template, button) as a tracked asset with source UJ/UC/PRD/Task and a status (verified / correct / unverified / stub / duplicate / wrong / orphan), backed by per-kind evidence templates.

The proposal subsumes most individual detection requests below. Calling them out separately so the genome team can choose: build the unified registry (recommended), or implement them as individual detections, or some hybrid.

| # | Capability | Subsumed by registry? | Source audit |
|---|---|---|---|
| 2.1 | Marketing claim → code evidence (e.g. "Claude 3.5 Sonnet" must match `lib/ai.ts`) | yes — `claim` kind | marketing-claims §"No claim-vs-code detection" |
| 2.2 | Testimonial → DB cross-reference (named person must exist) | yes — `testimonial` kind | marketing-claims §"Testimonials never verified" |
| 2.3 | Tier-feature → enforcement check (Pro+ promise must have `canUse{Feature}` gate) | yes — `tier-feature` kind | marketing-claims §"Tier-feature drift" |
| 2.4 | Schema-table → admin SELECT must exist | yes — `schema-table` kind | marketing-claims §"Promise has UI cross-check" + §4 (pilot_signups) |
| 2.5 | Nav-item → linked URL must return 200 with non-trivial content (catches the Reports/Assignments class) | yes — `nav-item` kind | structural §"Dashboard nav misrouted" |
| 2.6 | Promise has UI cross-check (e.g. "customize the tone") | yes — `faq-answer` kind | marketing-claims §"Falsified Customization Promise" |
| 2.7 | TS interface vs DB schema drift (the load-bearing one — this is what hid the `agent.market` bug for weeks) | partially — registry catches the *wrong* `claim`/`page` but not the *type lying*. Need a separate detection: heartbeat job that diffs each TS `interface X` named-fields against `information_schema.columns` for canonical table; flag fields the table doesn't have. | marketing-claims §"Inbound SMS Auto-Response Probably Broken" |
| 2.8 | "Loop not closed" verification (UC marked complete while user-flow is broken) | partially — registry's `verified` status requires runtime evidence, which catches most of these. Not a complete substitute. | structural §3.D |
| 2.9 | Scope-creep flagging (PR exceeded UC's stated scope) | no — needs PR-level diff analysis. Separate from the registry. | structural §3.F |
| 2.10 | QC anti-pattern enforcement (no string-match tests masquerading as E2E) | no — QC prompt change. Separate. | structural §3.C |

**Recommendation:** treat the traceability registry as one new genome capability rather than 8 separate rules. It's a unified data layer that all the per-kind detections plug into.

---

## §3. Spec feedback on SPEC-UJ-UC-HIERARCHY

I read the spec at `~/projects/leonida-wiki/genome/docs/SPEC-UJ-UC-HIERARCHY.md`. The 5-level cascade (UJ → UC → Feature → PRD → Task) is structurally better than the implicit hierarchy the current schema and my drafts assumed. **Three call-outs:**

### 3.1 `success_metrics` should be multi-step, not single-metric
Spec example: `{"metric": "meetings_booked_rate", "target": 0.4}`.
Most LeadFlow journeys are funnels (SMS sent → reply → qualified → book → confirm → meet), each step has its own conversion rate. Squashing to a single number loses the "where in the funnel did it break?" signal.

**Suggestion:** support either an array of metrics, or a `funnel_metrics` field with named steps. Example:
```json
{
  "funnel_metrics": [
    {"step": "sms_sent",  "target_rate": 0.95, "from": "lead_created"},
    {"step": "lead_replied", "target_rate": 0.30, "from": "sms_sent"},
    {"step": "qualified",  "target_rate": 0.50, "from": "lead_replied"},
    {"step": "booked",     "target_rate": 0.60, "from": "qualified"}
  ]
}
```

### 3.2 What happens to `project.config.json → journeys[]`?
Spec adds `user_journeys` table but doesn't say whether the existing `project.config.json → journeys[]` array is migrated, deprecated, or kept as a parallel source.

**Suggestion:** decide explicitly:
- (a) Authoritative: DB table. `project.config.json → journeys[]` removed; `JOURNEYS.md` regenerates from DB.
- (b) Authoritative: config file. `user_journeys` is a derived view.
- (c) Both during transition, sync both ways.
Recommend (a) for simplicity once stable; (c) during rollout.

### 3.3 PRD scope ambiguity — strategic vs technical
Spec defines PRD as "technical spec for the feature" (one Feature, one PRD). My drafts treat PRDs as strategic docs covering many UCs. Both are useful — they're different layers.

**Suggestion:** introduce one of:
- A new layer `epic` between project and UJ (one Epic = many UJs).
- A naming convention: `EPIC-` prefix for strategic, `PRD-` reserved for Feature-level technical specs.
- A `prd.kind` field: `strategic | technical`.

Without this, the schema can't distinguish "PRD-LEADFLOW-BUYER-JOURNEY-001" (strategic, my doc) from "PRD-FUB-PAYLOAD-MAPPER" (technical, one Feature). The genome's cascading verification (PRD spec satisfied → Feature DoD met → UC AC passing) only makes sense for the technical kind.

### 3.4 Minor — naming of dependency check
The enforcement says "cannot create task for UC if upstream UCs in `depends_on` aren't complete." This is a Hold-and-block model. For LeadFlow's case, UC-1 (Agent schema unification) blocks UC-2 (FUBService AI). That's correct. But journey reviews and product reviews shouldn't block on dependencies — they're observational. Make sure the enforcement is scoped to **implementation** tasks (dev/qc workflow), not review tasks.

---

## §4. Sequencing recommendation

```
[ NOW ]
1. Genome implements §1.1 PM-task → product_reviews sync fix
2. Genome implements §1.2 journey-review pipeline restart + heartbeat health check
3. Genome implements §1.3 triage prd_id propagation
   → unblocks every downstream PRD/UC filing

[ THEN — parallel ]
4. Genome team finalizes SPEC-UJ-UC-HIERARCHY incorporating §3 feedback
5. Genome team reviews the asset traceability proposal (PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001)
   → either accept as a new capability, or explicit "no" with rationale

[ THEN ]
6. Migration 039 lands (UJ + Feature tables + cascading verification + actuator enforcement)
7. I file the LeadFlow UJ + UCs against the new schema (see §5)

[ THEN — long tail ]
8. Asset traceability registry implementation (if accepted in step 5)
9. Backfill existing LeadFlow product to populate the registry
```

§1 is independent of §3 — pipeline fixes don't depend on schema changes. They can ship first.

---

## §5. What LeadFlow will file once genome is aligned

Held back until genome alignment is complete. This list is for visibility — no action needed yet on the genome side.

**One UJ:**
- `home-buyer-receives-ai-conversation` (with multi-step `funnel_metrics` per §3.1)

**Twelve UCs (each with `depends_on` set, UC-1 is hard dependency for UC-2 and UC-11):**
1. Agent schema/type unification ⭐ blocker
2. Replace FUBService.generateAiSmsResponse hardcoded template with real AI
3. Remove fabricated testimonials
4. Replace Claude 3.5 Sonnet copy
5. Remove customization promise OR build the surface
6. Build tier feature gating, OR remove gated promises
7. Build pilot_signups admin UI
8. Wire logout button into dashboard nav
9. Standardize admin auth — pick one pattern
10. Brand consolidation (LeadFlow / Imagine Squared / landyourleads)
11. AI pauses on agent reply (take-over)
12. Reports nav: real page or honest removal

**Each UC will fan out into Features + technical PRDs at filing time** per the new spec's hierarchy. I'll do the fan-out then; not in this brief.

**Strategic (epic-level) PRDs already drafted:**
- `docs/prd/PRD-LEADFLOW-BUYER-JOURNEY-001.md` — covering the 12 UCs above
- `docs/prd/PRD-LEADFLOW-PRODUCT-ASSET-TRACEABILITY-001.md` — the asset registry proposal

These will be relabeled (`EPIC-` prefix or per genome team's naming decision in §3.3) once the spec finalizes.

---

## Appendix — Reading order if you want context

1. Start: `audit-2026-05-03.md` §3 (the cross-cutting genome failures — frames everything else)
2. Then: `marketing-claims-audit-2026-05-04.md` §"Inbound SMS Auto-Response Probably Broken" (single biggest production bug found)
3. Then: `buyer-journey-2026-05-05.md` §Stage 2 (FUBService template surprise)
4. Then this brief.

---

## Open questions for the genome team

1. Does §1.1's PM-task→product_reviews sync need to be a per-project setting, or always-on across all projects? (I assume always-on but the design space allows per-project opt-in.)
2. For §3.1 funnel_metrics, is a step-level success target enough, or do we need step-by-step instrumentation (event tracking) to compute the rates? If the latter, where does the eventing live?
3. For §3.3 PRD scope ambiguity, do you have a preference for `epic` as a new layer vs `prd.kind` as a discriminator?
4. For §2 traceability proposal: timebox — when can you give a yes/no? Holds my filing.
