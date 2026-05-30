# PRD-LEADFLOW-REAL-REPORTS-PAGE-ALTERNATIVE-001

## Objective
Unblock `uc-buyer-journey-real-reports-page` with a different execution strategy that avoids repeated rebuild retries and focuses on time-to-value.

## Diagnosis Category
`needs_alternative_approach`

## Product State (2026-05-29)
- Mission phase: `scale`
- Top metric gaps: `NPS Score`, `Signup to Activated Rate`, `Trial to Paid Conversion`
- Reports page work is not the current funnel bottleneck; repeated retries were consuming cycles without net customer value.

## Verified Current State
1. UC exists: `uc-buyer-journey-real-reports-page`.
2. Failed dev tasks: `72cf4482-b620-4f44-919a-0cc555a51b5e` and `30146f09-4f8a-44fd-b613-fb34af2c6532`.
3. Both failed with `Invariant: awaiting_merge requires pr_number for dev/design tasks`.
4. Main already contains implementation commit `31daea60` (`feat: build distinct dashboard reports page and API`) including:
- `/dashboard/reports` page
- `ReportsDashboard` component
- `/api/reports/summary` route
- `ReportsService`
- nav wiring and tests

## Why Previous Approach Failed
1. Strategy mismatch: retries kept treating this as missing implementation, but the core feature had already landed on `main`.
2. Execution-path churn: rescue tasks ended in `awaiting_merge` invariant failures due to missing PR context/no-op branch state.
3. Low-value retry loop: repeated full rebuild attempts produced no new product learning relative to funnel-critical metrics.

## Alternative Approach (MVP)
1. Freeze full rebuild retries for this UC.
2. Run a verification-and-differentiation pass on shipped Reports experience:
- Reports must answer operational follow-up questions (at-risk leads, top performers, action items).
- Analytics remains trend/KPI view.
3. If overlap/confusion remains, ship only minimal tune-ups:
- section labels/copy,
- payload field naming clarity,
- ordering of report blocks.
4. Spawn new dev work only for concrete verification failures (small deltas, not refactor).

## Acceptance Criteria
1. `/dashboard/reports` renders dedicated Reports UI and not Analytics UI.
2. `/api/reports/summary` returns report-centric sections (`atRiskLeads`, `topPerformingLeads`, `actionItems`, `totals`).
3. Reports page includes explicit operational framing distinct from Analytics trend framing.
4. No new full rebuild task is created for this UC unless a concrete failing check is documented.

## Scope Guardrails
- No architecture refactor.
- No duplicate UC.
- No escalation ladder restart without new failing acceptance evidence.

## Revenue Priority Decision
Set to `P3` (deprioritized) because this is not on the direct critical path for first paying customer compared with activation and trial-to-paid conversion work.
