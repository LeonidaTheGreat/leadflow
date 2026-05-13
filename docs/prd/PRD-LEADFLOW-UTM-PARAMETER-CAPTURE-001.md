# PRD-LEADFLOW-UTM-PARAMETER-CAPTURE-001

## Product State / KPI Context (2026-05-12)
- Mission phase: `scale`
- Primary gap to address: low confidence in funnel attribution from Awareness -> Signup -> Paid.
- Revenue-critical hypothesis: clearer source attribution enables budget shift to channels that produce activated and paid agents faster.

## Scope
Capture UTM parameters on landing-page first touch and persist attribution through signup so every created agent can be tied to a marketing source.

## Problem
Current funnel cannot reliably answer:
- Which channel produced this signup?
- Which campaign produced activated trial users?
- Which sources convert to paid?

Without this, marketing spend and outreach effort cannot be prioritized by revenue yield.

## Goal
Ship reliable first-touch marketing attribution for landing traffic with zero user-facing friction.

## Non-Goals
- Multi-touch attribution.
- Cross-device identity stitching.
- Paid-ad platform integrations (Meta/Google conversions API).
- Attribution model experimentation (last-touch, position-based).

## Personas
- Founder/PM: needs channel-level ROI visibility.
- Marketing operator: needs campaign-level feedback loop within 24h.
- Prospective agent (customer): should experience no UX change.

## User Stories
1. As a PM, I want every signup to carry first-touch UTM fields so I can compare signup and paid conversion rates by source.
2. As a marketing operator, I want unattributed signups visible as `direct/unknown` so data quality issues are explicit.
3. As a prospective customer, I want signup flow to remain unchanged while attribution is captured silently.

## Functional Requirements
### FR-1: First-touch UTM Capture on Landing Entry
- On first visit to public marketing pages, system reads:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_term` (optional)
  - `utm_content` (optional)
- If one or more UTM params exist, persist first-touch payload for current browser session.
- If first-touch payload already exists in session, do not overwrite.

### FR-2: Attribution Persistence Across Navigation
- Captured UTM data remains available when visitor navigates from landing -> pricing -> onboarding/signup in same session.
- Absence of UTM on downstream pages must not clear existing attribution.

### FR-3: Signup Write-through to Customer Record
- On successful signup, persist captured UTM fields to the customer record (`agents` domain table in LeadFlow).
- If no UTM exists, store normalized fallback values (`direct`/`unknown`) per data contract.

### FR-4: Data Validation and Normalization
- Reject/trim malformed UTM values at API boundary.
- Normalize casing and whitespace.
- Enforce max lengths to protect DB integrity.

### FR-5: Attribution Observability
- Provide queryable attribution outputs for funnel reporting:
  - Signups by source/medium/campaign.
  - Activated-trial by source.
  - Paid conversion by source.
- Unattributed share must be measurable.

### FR-6: Backward Compatibility
- Existing signup flows continue to work when no UTM payload is present.
- No regression in signup success rate.

## Data Contract
Required fields at signup persistence time:
- `utm_source` (string, fallback `direct`)
- `utm_medium` (string, fallback `unknown`)
- `utm_campaign` (string, fallback `unknown`)
Optional:
- `utm_term` (nullable string)
- `utm_content` (nullable string)
- `attribution_captured_at` (timestamp)
- `attribution_model` (fixed value: `first_touch`)

## Acceptance Criteria
1. Given a visitor lands with `?utm_source=facebook&utm_medium=paid_social&utm_campaign=pilot_q2`, when they complete signup in same session, then customer record contains those exact normalized UTM values.
2. Given a visitor lands with UTM and later navigates to signup page without query params, when they sign up, then original first-touch UTM is persisted.
3. Given a visitor lands with no UTM, when they sign up, then record stores fallback `utm_source=direct`, `utm_medium=unknown`, `utm_campaign=unknown`.
4. Given a visitor lands with UTM A then later with UTM B in same session, when they sign up, then UTM A is stored (first-touch wins).
5. Given malformed or oversized UTM values, when signup request is processed, then payload is normalized safely and signup still succeeds.
6. Attribution reporting query returns non-null source buckets and exposes unattributed percentage.
7. Post-release, signup success rate does not degrade versus 7-day pre-release baseline.

## Success Metrics
- Attribution completeness: >=95% of signups have non-null normalized source/medium/campaign (including fallback bucket).
- Direct/unknown rate: <40% after 2 weeks of campaign hygiene enforcement.
- Decision latency: channel-level performance visible within 24h of traffic.
- Business KPI linkage: ability to compute Trial->Paid conversion by `utm_source` weekly.

## Risks / Gaps
- Existing UTM taxonomy drift across teams can pollute source dimensions.
- Session-based first-touch does not handle cross-browser/device journeys.
- Campaign links without UTM will inflate `direct/unknown`.

## Dependencies
- Marketing UTM taxonomy governance doc: `docs/guides/MARKETING-UTM-STRATEGY.md`.
- Signup pipeline stores attribution fields in customer schema.
- Reporting layer includes attribution dimensions.

## Prioritization
- Priority: P1 (directly supports Trial->Paid conversion optimization and spend allocation).
- Rationale: funnel KPI gaps (NPS, Signup->Activated, Trial->Paid) require source-level attribution to target interventions.

## Out of Scope Follow-ups
- Multi-touch attribution model (`UC-LEADFLOW-MULTI-TOUCH-ATTRIBUTION-001` future).
- Offline/source import enrichment.

## Release Readiness Checklist
- Requirements reviewed by PM, Dev, QC.
- E2E scenarios defined for first-touch persistence and fallback bucket.
- Reporting query validated on production-like data.
