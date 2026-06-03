# PM Re-spec Report

- Task ID: `7b9b3c4f-99a9-439c-95a4-b98c0b2ebfd5`
- Use Case ID: `feature-signup-must-require-confirmed-inbox-link`
- Category: `needs_alternative_approach`
- Date: `2026-05-16` (America/Toronto)

## Diagnosis
Repeated failures were not tied to a verified runtime defect. Task history shows repeated `PARKED: Stale >24h + already retried` across escalation levels, which indicates execution/queue churn combined with over-scoped delivery.

## Why prior approach failed
1. Combined three deliverables in one pass: login policy gate + new token persistence + new check-your-inbox page.
2. No evidence of a broken baseline path was documented before expanding schema/UI scope.
3. Escalation retries changed model/scope but not decomposition strategy.

## Alternative MVP approach (approved in UC)
1. Phase 1 (ship first): enforce login gate using existing account verification state (`email_verified`-style flag already in auth flow).
2. Return explicit contract for blocked sign-in: HTTP `403` + deterministic error code `VERIFICATION_REQUIRED`.
3. Add funnel instrumentation: `signup_submitted`, `verification_gate_hit`, `verification_completed`, `first_login_after_verification`.
4. Phase 2 (only if KPI gap remains): add token table + dedicated check-your-inbox UX.

## Revenue rationale
This prioritizes the shortest path to improving `Signup -> Activated` while minimizing implementation risk in auth-sensitive paths.

## Data changes applied
- `use_cases.id = feature-signup-must-require-confirmed-inbox-link`
- Updated: `description`, `priority` (to `0`), `implementation_status` (to `ready`), `acceptance_criteria`, `spec.diagnosis_category`.
