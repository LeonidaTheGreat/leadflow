# PRD-LEADFLOW-LAPSED-TRIAL-REACTIVATION-001

## Product State (2026-05-12)
- Mission phase: `scale` (active)
- KPI gaps (current -> target):
  - MRR: `597 -> 20000`
  - Paying Customers: `0 -> 50`
  - Trial to Paid Conversion: `null -> 15%`
  - Signup to Activated Rate: `null -> 60%`
  - NPS Score: `null -> 50`
- Use case status: `feat-lapsed-trial-reactivation` is `in_progress`

## Problem
Cold signups returning from reactivation touchpoints hit inconsistent auth form UX:
- login uses full-width, vertical email/password layout
- one signup variant uses a compact visual style that does not match login density/field treatment

This inconsistency lowers trust at the highest-friction point (credential entry), increasing abandon risk before activation.

## Goal
Standardize email/password field layout and visual hierarchy across signup and login so reactivated agents experience a predictable auth flow and proceed to onboarding.

## Scope
In scope:
- Signup surfaces used by reactivated traffic (including trial signup entry points)
- Email and password field layout, width, spacing, and interaction affordances
- Consistency of error placement and helper text around these two fields

Out of scope:
- Pricing/plan selection logic
- Auth API behavior
- New copy experiments, discounts, or lifecycle messaging

## Use Cases
1. Returning lapsed trial agent clicks reactivation email/SMS link and lands on signup; email/password fields are easy to scan and consistent with login.
2. Agent compares login and signup during password confusion; both forms present identical field structure and interaction expectations.
3. Mobile reactivation user completes credentials without cramped/horizontal field rendering.

## User Stories
1. As a lapsed trial agent, I want signup and login credential fields to look the same so I trust I am in the correct flow.
2. As a returning user who may already have an account, I want consistent email/password behavior so switching between signup and login is low-friction.
3. As product, we want reduced reactivation drop-off at credential step so more cold signups reach onboarding.

## Functional Requirements
1. Signup email and password fields must use vertical stacking and full available form width, matching login structure.
2. Field heights, typography scale, and internal padding for signup email/password must match login token values.
3. Error state treatment for signup email/password must be visually equivalent to login (placement directly under/near affected field group, readable contrast).
4. Password visibility toggle behavior on signup must match login interaction pattern where present.
5. Consistency must hold across desktop and mobile breakpoints for all reactivation-targeted signup pages.

## Non-Functional Requirements
1. Accessibility: visible labels for email/password (no placeholder-only labels), keyboard reachable controls, and screen-reader association for validation errors.
2. Performance: no regression in LCP/CLS from layout updates.
3. Analytics continuity: existing signup/login event names remain unchanged.

## Acceptance Criteria
1. On each in-scope signup page, `email` and `password` inputs render on separate rows (vertical stack), each occupying full form width at all breakpoints.
2. On login and in-scope signup pages, computed field container width and height classes for email/password are identical or mapped to the same design token set.
3. At `375px` viewport width, no horizontal scrolling is introduced by email/password inputs on signup.
4. Validation errors for invalid email and weak password appear adjacent to their field groups and remain readable (contrast-compliant) on both signup and login.
5. Switching between `/login` and signup entry points does not change credential field order, core spacing rhythm, or affordance location in a way that requires relearning.

## Measurement
Primary:
- Reactivation signup start -> submit rate (+10% relative vs 7-day baseline)
- Signup -> onboarding redirect completion (+8% relative)

Secondary:
- Reduction in auth-form related support complaints
- Lower bounce rate on reactivation-tagged signup sessions

## Dependencies
- Existing auth pages/components in `product/lead-response/dashboard/app/signup*` and `product/lead-response/dashboard/app/login/page.tsx`
- Existing analytics instrumentation for signup/login funnel events

## Risks
1. Variant mismatch: multiple signup entry points may diverge if not all are included.
2. Hidden coupling: component-level style overrides may reintroduce inconsistency later.

## Rollout
1. Internal QA across all signup entry points used by reactivation links.
2. Ship behind normal release path; no migration required.
3. Monitor 7 days of reactivation funnel deltas before further iteration.

## Priority
- Priority: P1 (directly supports `Signup to Activated Rate` and `Trial to Paid Conversion` gaps)
