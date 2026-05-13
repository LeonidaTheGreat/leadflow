# PRD-LEADFLOW-UTM-PARAMETER-CAPTURE-LANDING-PAGE-001

- Status: draft
- Version: 1.1
- Date: 2026-05-12
- Owner: Product Manager
- Project: leadflow
- Use Case: feature-utm-parameter-capture-landing-page-for
- Priority: P0

## KPI State (Test Focus)
- Mission phase: `scale`
- Revenue-critical funnel: Awareness -> Signup -> Onboarding -> Trial -> Aha Moment -> Paid
- Current weakest link for this PRD: Awareness -> Signup attribution is not reliably measurable, blocking budget reallocation toward higher Trial->Paid channels.

## Problem Statement
Visitors arrive on marketing landing pages with UTM parameters, but first-touch attribution is not guaranteed to persist through signup. Without consistent attribution capture and persistence, channel ROI cannot be trusted, and revenue decisions are delayed.

## Goal
Guarantee deterministic first-touch UTM capture on landing entry and persistence to customer signup records for marketing attribution.

## Non-Goals
- Multi-touch attribution.
- Cross-device/user identity stitching.
- Offline conversion uploads to ad platforms.
- New attribution dashboard UI.

## Primary Users
- Marketing owner: needs campaign-level performance by signup, activation, and paid conversion.
- Product owner: needs reliable attribution data to prioritize revenue experiments.

## Use Case Coverage
- Covered now:
  - UTM-tagged visitor lands, browses multiple pages, signs up, attribution retained.
  - Direct/no-UTM visitor signs up, categorized without data loss.
  - Re-entry with different UTM in same session preserves first touch.
- Not covered in this PRD:
  - Cross-session or cross-device attribution continuity.
  - Weighted/multi-touch attribution models.

## User Stories
1. As a campaign visitor, my source parameters are captured automatically when I land, without UX friction.
2. As the business owner, I can see original campaign attribution on each new customer signup.
3. As marketing, I can quantify unattributed traffic explicitly instead of silently dropping it.

## Functional Requirements

### FR-1: First-Touch Capture on Landing
- System reads landing URL parameters: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.
- If any UTM parameter exists and no first-touch value exists for the current session, store a normalized attribution object.
- First-touch lock applies within session: later UTM values do not overwrite first-touch.

### FR-2: Persistence Through Signup
- Signup flow includes captured first-touch attribution when available.
- Signup API accepts attribution fields as optional and persists them on customer creation.
- Missing attribution must never block signup completion.

### FR-3: Attribution Data Contract
- Persist nullable fields: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.
- Normalize empty/whitespace values to null before persistence.
- Enforce boundary validation (length and basic string sanitation) at API edge.

### FR-4: Direct/Unknown Handling
- If no UTM exists for a signup, reporting groups it as `direct/unknown`.
- Reporting totals must include both attributed and unattributed signups.

### FR-5: Reliability Requirements
- Storage access failures must fail gracefully (no user-facing errors, no signup interruption).
- No SSR/client-runtime exceptions from attribution handling.

## Acceptance Criteria
1. Given a landing URL with UTM params, when the first page loads, then first-touch attribution is stored exactly once for that session.
2. Given stored first-touch attribution, when user signs up after navigating other pages in the same session, then created customer record contains matching UTM values.
3. Given a second landing in the same session with different UTM values, then original first-touch values remain unchanged.
4. Given no UTM params, when signup completes, then signup succeeds and attribution fields remain null while reporting groups the row into `direct/unknown`.
5. Given storage-disabled/private context, landing and signup still complete with no uncaught runtime errors.
6. Given a reporting time window, attribution report totals equal total signups in the same window.

## Success Metrics
- Attribution capture coverage (non-null `utm_source`) >= 80% of new signups within 14 days of release.
- Signup success rate does not regress versus 7-day pre-release baseline.
- Weekly view available for Trial->Paid conversion by `utm_source` and `utm_campaign`.

## Dependencies
- Signup/customer creation path must carry attribution payload.
- Customer schema supports UTM fields.
- Funnel reporting query includes source/medium/campaign with `direct/unknown` fallback.

## Risks and Mitigations
- Risk: inconsistent key usage across pages and forms.
  - Mitigation: single canonical attribution payload contract across landing and signup boundaries.
- Risk: malformed UTM values degrade reporting.
  - Mitigation: normalization and boundary validation at API edge.
- Risk: stakeholders misread `direct/unknown` as failure.
  - Mitigation: document attribution taxonomy and expected direct baseline.

## Prioritization Rationale
P0: This directly reduces time to first paying customer by enabling channel-level budget and experiment decisions tied to Signup->Activated->Paid outcomes.
