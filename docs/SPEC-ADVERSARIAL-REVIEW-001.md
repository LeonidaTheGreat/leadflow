# SPEC-ADVERSARIAL-REVIEW-001 — Cross-Model Refutation Review

**Source:** Genome adversarial-review design, adoption ratified.
**Status:** Phase 0–1 implemented; Phase 2 routes after >=14 days of structured verdict data.
**Priority:** P2
**Canonical spec:** ~/projects/genome/docs/SPEC-ADVERSARIAL-REVIEW-001.md

## Premise

A model rubber-stamps its own blind spots — the reviewer must be able to fail
the writer in ways the writer can't predict. Review is refutation, not
confirmation. Approval attaches to exact content. A fast review is no review.

## Phase 0 — Structured Verdict Schema

**Migration:** `migrations/025_adversarial_review_structured_verdicts.sql`

Columns added to `code_reviews`:
- `verdict` — enum: `pass`, `pass_with_nits`, `concerns`
- `rubric` — JSONB: `{gap_closure, correctness, dead_code, drift}` (each `{ok, note}`)
- `patch_id` — text: `git patch-id --stable` of full diff vs merge-base
- `reviewer_model` — text: which model reviewed
- `review_duration_ms` — int: wall-clock QC duration
- `dissent_agreed` — bool: did the dissent judge agree

**Verdict persistence:**
- `VerdictPersistenceService` writes structured fields to code_reviews
- Full verdict body persisted to `state/{project}/qc-verdicts/` (searchable archive)
- Audit ledger entry (genome_traces, component='qc-verdict')

**QC prompt four questions (via genome spawn-message-builder):**
1. Does this genuinely close the gap or box-check it?
2. Is the code correct (logic, edge cases, types)?
3. Is there dead code introduced or left behind?
4. Does this drift from the architecture / existing patterns?

## Phase 1 — Six Integrity Rules

### Live immediately (prompt/selection changes):

**R1 — Cross-provider QC selection:**
- Module: `~/projects/genome/core/food/qc-cross-provider.js`
- QC reviewer PROVIDER ≠ author provider
- anthropic dev → codex QC; all others → sonnet QC

**R5 — Acceptance-criteria contract:**
- Module: `~/projects/genome/core/food/spawn-message-builder.js` (`buildQcSections`)
- UC acceptance_checks are the FIRST section in the QC prompt
- Reviewer must verify each against the actual repo

**R6 — REWORK block leads:**
- Module: `~/projects/genome/core/loops/pr-review-loop.js` (`_buildReworkBlock`)
- On `concerns`, rework task description STARTS with numbered REWORK block

### Shadow 14 days (log + audit `would_block`):

**R2 — Patch-ID binding:**
- Module: `lib/services/ReviewIntegrityService.js`
- Verdict stores `git patch-id --stable` of full diff vs merge-base
- Merge refuses verdict whose patch_id ≠ branch's current patch_id
- Shadow: logs to `state/leadflow/shadow-audit/adversarial-review-shadow.jsonl`

**R3 — Anti-treadmill:**
- Module: `lib/services/ReviewIntegrityService.js`
- Resubmitting a rejected patch_id unchanged → auto-reject with prior verdict quoted
- Shadow: logs would_block without actually rejecting

**R4 — Timing floor:**
- Module: `lib/services/ReviewIntegrityService.js`
- Review duration < 45s → `no_verdict`, re-run once; second failure escalates model
- Shadow: logs would_block without invalidating

## Phase 2 — Reviewer Quality Loop (future)

Routes after >=14 days of structured verdict data. Includes:
- Sabotage testing (known-bad + known-good diffs through QC path)
- Label-body audit (local LLM classifies body vs verdict label)
- Novel finding tracking
- Lesson distillation into spawn packets

## Boundaries

- Extends QC loop / panel-review / verdict extractor — no parallel review system
- Dissent reflex (qwen3 + sonnet tiebreak) kept as third voice
- Shadow rules never block during shadow period — only audit
- Phase 2 cannot route until 14+ days of Phase 0–1 data
