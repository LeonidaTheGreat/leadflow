# UC-LEADFLOW-FIX-QC-REJECTION-RECORDING-001

## Category
needs_alternative_approach

## Product State
- Mission phase: scale
- Revenue-critical metric gaps: NPS Score, Signup to Activated Rate, Trial to Paid Conversion
- QC rejection signal is effectively zero in current reporting (`status='changes_requested'` rows: 0)

## Diagnosis
- Repeated retries failed at spawn/parking stage, not in feature logic execution.
- UC `fix-qc-rejection-recording` is stored under `project_id='genome'`, but retry history includes leadflow-context QC tasks, causing branchless spawn churn.
- Existing genome code already has `_syncQCReviewVerdict` upsert behavior and regression test coverage for writing rejection rows.

## Alternative Strategy (MVP)
1. Dependency-first gate: pause broad rescue retries until genome QC spawn reliability is restored.
2. Genome-only deterministic verification run: force one QC reject path and assert code review rejection note write.
3. Reporting MVP: compute QC rejection from `review_notes` rejection markers (not terminal status only).
4. Backfill recent closed rejection rows with normalized verdict marker to restore historical metric continuity.

## UC Update Applied
- Updated in DB (`use_cases.id='fix-qc-rejection-recording'`, `project_id='genome'`):
  - `description`: replaced with dependency-first MVP approach above
  - `priority`: 1
  - `metadata.diagnosis_category`: `needs_alternative_approach`
  - `metadata.alt_approach_reason`: `spawn_path_unstable_and_project_context_drift`
