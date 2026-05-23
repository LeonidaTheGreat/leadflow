# PRD-LEADFLOW-FIX-QC-REJECTION-RECORDING-001

## Objective
Unblock reliable QC rejection measurement with a dependency-first MVP approach after repeated spawn-time retry failures.

## Diagnosis Category
`needs_alternative_approach`

## Verified Current State
- UC id: `fix-qc-rejection-recording` exists under `project_id='genome'`.
- Retry history includes mixed project contexts (`genome` and `leadflow`) and a blocked QC task with `Max retries exhausted at spawn time`.
- `code_reviews` currently has zero rows with `status='changes_requested'` in both `genome` and `leadflow` projects.
- Genome code path already implements QC verdict upsert in `intelligence/completion-handler-qc.js` (`_syncQCReviewVerdict`) with regression coverage in `tests/2bef954d-qc-rejection-recording.test.js`.

## Why Previous Approach Failed
1. Retries failed before deterministic execution (spawn/parking churn), so no stable validation signal.
2. Cross-project task routing drift caused branchless QC retries.
3. Scope stayed as full rescue loop instead of narrow write-path verification + metric-safe reporting.

## Alternative Approach (MVP)
1. Prerequisite gate: restore genome QC spawn reliability before new broad retries.
2. Genome-only verification: run one forced QC rejection and assert a rejection signal is written to `code_reviews.review_notes` at decision time.
3. Reporting fix: measure rejection via normalized rejection signal in `review_notes` (or explicit verdict marker), not terminal `status='changes_requested'` only.
4. Backfill: annotate recent closed rejection rows with normalized verdict marker for continuity.

## Acceptance Criteria
1. Deterministic forced-reject run in genome writes one `code_reviews` row containing rejection signal (`review_notes.rejected_by` and issues).
2. 7-day rejection query using rejection marker returns `> 0` without depending on terminal status.
3. No new leadflow-context retries for this UC; execution context remains genome-only.
4. UC priority stays P1 until rejection metric continuity is restored.

## Scope Guardrails
- No large refactor.
- No new retry ladder logic.
- No duplicate UC creation.
