# REPORT-LEADFLOW-ALT-APPROACH-001

Task ID: cd6ba189-3622-4d1d-ae1a-d82006e324f4
Use Case: uc-genome-fix-improve-task-dedup
Category: needs_alternative_approach
Date: 2026-05-17

## Product State
- Mission phase: scale
- Top metric gaps table currently returns no rows marked status=gap in `mission_metrics`.
- UC remains in_progress with repeated retry churn and no durable closure.

## What Was Tested
- Read failed completion reports for dev rescue task `06f8fc45-07be-4110-bc17-d118486067af` (multiple attempts).
- Read current implementation in `~/projects/genome/intelligence/strategic-review-handler.js`.
- Checked task history in `tasks` table for `uc-genome-fix-improve-task-dedup`.

## Verified Diagnosis
1. Bug is real and still present in current code: dedup checks `Fix:` and `Dev:` only, while improve-agent creates `Improve: ...` titles.
2. Current approach keeps failing primarily due to execution path instability, not unclear bug scope:
- latest failed dev rescue task ended with `Max retries exhausted at spawn time`.
- multiple retries failed on unrelated architecture-drift build gates.
- several attempts reported `already fixed/no repro`, indicating retry churn and inconsistent run context.

## Alternative Strategy (Dependency-First)
1. Prerequisite first: restore spawn-path reliability for dev rescue tasks with a binary acceptance check (no-op dev task can spawn and reach in_progress within SLA).
2. After prerequisite passes: execute minimal patch in Genome only (`strategic-review-handler.js`) by extending dedup lookup to include the Improve title signature.
3. Validate with targeted dedup test + seeded duplicate check only; avoid blocking this Genome-scoped fix on unrelated LeadFlow architecture drift gates.

## UC Update Applied
`use_cases.id = uc-genome-fix-improve-task-dedup`
- Updated `description` with the dependency-first approach.
- Updated `metadata`:
  - `diagnosis_category=needs_alternative_approach`
  - `alt_approach_reason=spawn_path_unstable_dependency_first`
