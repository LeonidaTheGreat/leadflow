# PRD-LEADFLOW-LAPSED-TRIAL-REACTIVATION-001

## Product State (2026-05-12)
- Mission: first paying customer and conversion scale depend on reducing onboarding friction.
- Metric gaps tied to this spec: Signup to Activated Rate, Trial to Paid Conversion, NPS Score.
- Use case under execution: `feat-lapsed-trial-reactivation` (in_progress).

## Problem Being Tested
Users moving between `/signup` and `/login` experience inconsistent auth form layout for email/password fields. This lowers trust during a high-intent conversion moment and likely contributes to trial drop-off among cold signups returning to reactivate.

## Evidence (Code-Verified)
- Login form is the canonical pattern: full-width, vertical stack, 48px input height, consistent spacing and labels.
  - `product/lead-response/dashboard/app/login/page.tsx`
- Signup has multiple entry points (paid flow + trial form component). Layout consistency must hold across all signup variants using email/password.
  - `product/lead-response/dashboard/app/signup/page.tsx`
  - `product/lead-response/dashboard/components/trial-signup-form.tsx`

## Scope
This PRD covers UX/layout consistency only (no auth logic or schema changes).

In scope:
- Align email/password field layout and visual treatment between signup and login.
- Ensure consistency across all signup modes that collect email/password.
- Preserve existing validation, analytics events, and API contracts.

Out of scope:
- Email sequence/reactivation campaign backend.
- Copy overhaul.
- Changes to onboarding routing or billing steps.

## Target Users
- Lapsed trial users returning from reactivation outreach.
- New signups evaluating product trust in first 60 seconds.

## User Stories
1. As a returning trial user, when I open signup and login, I see the same field structure so I trust I am in one coherent product.
2. As a mobile user, email/password inputs are readable and tap-friendly on both pages.
3. As PM, I need consistent auth UI so we can measure funnel impact without confounding visual differences.

## Functional Requirements
1. **Canonical layout source**
- Login page email/password field structure is canonical.
- Signup email/password fields must match canonical structure for:
  - Vertical stacking order.
  - Full-width controls within container.
  - Equivalent input height and typography scale.
  - Label placement and spacing rhythm.

2. **Signup variants coverage**
- Apply consistency to all signup variants that collect email/password, including:
  - Trial signup form component usage.
  - Paid signup step collecting account credentials.

3. **Responsive behavior**
- On mobile (`<640px`), both signup and login keep vertical stack with no side-by-side email/password placement.
- Inputs remain fully visible without horizontal scrolling.

4. **Non-functional guardrails**
- No changes to endpoint URLs, payloads, auth/session behavior, or DB writes.
- Existing GA/events instrumentation remains intact.
- Existing data-testid hooks for auth inputs remain stable or are equivalently migrated with QC note.

## Acceptance Criteria
1. On `/login`, email and password appear as vertically stacked full-width fields (baseline behavior retained).
2. On `/signup` paid credentials step, email and password match login layout pattern (stacking, width, spacing, readable size).
3. On trial signup form, email and password match same vertical full-width pattern as login.
4. On iOS Safari and Chrome mobile viewport, no horizontal alignment of email/password fields occurs.
5. No regression to signup/login submit behavior (valid submit succeeds; invalid input still shows current validation messages).
6. No API or schema changes are introduced.

## QA Scenarios
1. Desktop: compare `/signup` and `/login` side-by-side for email/password layout parity.
2. Mobile width 390px: verify vertical stack and full-width fields on both pages.
3. Trial mode (`/signup?mode=trial`): verify same field treatment as login.
4. Paid mode: select any plan → credentials step → verify parity.
5. Smoke: perform signup+login flow to confirm no functional regression.

## Prioritization
- Priority: P1 (revenue-critical polish at funnel entry).
- Rationale: reduces trust friction at activation step with low implementation risk and immediate conversion relevance.

## Dependencies
- Existing auth UI components (`Input`, `Label`, form containers).
- QC regression checks for auth flow.

## Risks
- Hidden variant drift if a signup mode bypasses shared form patterns.
- Overly local CSS changes could reintroduce inconsistency later.

## Mitigations
- Explicit variant checklist in QC.
- Prefer shared style pattern/tokenized class usage for auth fields.

## Release Definition of Done
- Acceptance criteria all pass in dev + QC validation.
- PR references this PRD ID.
- No new funnel regressions in signup/login smoke checks.
