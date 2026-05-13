# PRD-LEADFLOW-UTM-PARAMETER-CAPTURE-LANDING-PAGE-001

- Status: draft
- Version: 1.1
- Date: 2026-05-13
- Owner: Product Manager
- Project: leadflow
- Task ID: 4b380dd3-c9b0-4a8c-9c69-7072c7d8836b
- Use Case ID: feature-utm-parameter-capture-landing-page-for
- Priority: P0

## Product State (KPIs First)
- Mission: active (`phase: scale`)
- Paying customers: `0 / 50` (gap)
- MRR: `597 / 20000` (gap)
- Top metric gaps to unblock revenue decisions: `Signup to Activated Rate`, `Trial to Paid Conversion`, `NPS Score` (current values not instrumented)
- Use case status: `in_progress`

## What Is Being Tested
Can LeadFlow reliably preserve first-touch UTM from landing entry through signup so funnel conversion can be measured by source/campaign and acquisition spend can be reallocated faster?

## Problem
Landing traffic includes campaign UTMs, but attribution is not consistently guaranteed end-to-end in every signup path. Without deterministic capture and write-through, source-level funnel analysis is untrustworthy, delaying channel optimization during a paying-customer critical phase.

## Goal
Ship deterministic first-touch UTM capture on landing entry and persist attribution onto the customer record at signup, with direct/unknown fallback for denominator-safe reporting.

## Non-Goals
- Multi-touch attribution
- Cross-device stitching
- Ad network conversion API integrations
- Campaign taxonomy governance process changes

## Users
- Marketing owner: needs campaign ROI visibility
- Product owner: needs signup->activated->paid conversion by source
- Prospective customer (real estate agent): should see zero UX friction

## User Stories
1. As a campaign visitor, when I arrive with UTM parameters, my first-touch attribution is captured silently.
2. As LeadFlow, when that visitor signs up later in the same session, the original attribution is written to the customer record.
3. As PM/marketing, when signups lack UTM, they appear as `direct/unknown` so reporting totals remain complete.

## Functional Requirements

### FR-1: First-Touch Capture on Landing Entry
- On first client render of marketing landing entry, parse query params:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- If any key is present and no first-touch exists for the session, store normalized attribution payload.
- First-touch lock: once stored in-session, later UTM values in that session do not overwrite.
- If no UTM keys exist, no attribution write is made.

### FR-2: Session Persistence Across Navigation
- Captured attribution survives landing -> pricing -> signup navigation in same browser session.
- Missing UTM on downstream pages must not clear prior first-touch payload.

### FR-3: Signup Payload Attachment
- Signup/trial submission includes stored first-touch UTM when present.
- If attribution absent, signup continues normally without errors.

### FR-4: API and Data Persistence Contract
- Signup API accepts optional UTM fields and persists on customer creation.
- Persisted fields:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_content`
  - `utm_term`
- Empty or whitespace-only UTM values normalize to null before write.

### FR-5: Reporting Contract
- Funnel reporting supports group-by on source/medium/campaign.
- Unattributed signups must be represented as `direct/unknown` bucket.
- Attribution report totals must equal total signups for the same time window.

### FR-6: Reliability and Safety
- Storage-read/write failures are non-blocking.
- No uncaught errors at SSR/client boundaries.
- API boundary enforces safe max field lengths and trimming.

## Acceptance Criteria
1. Given landing URL includes at least one UTM key, when page loads, then first-touch payload is stored once for that session.
2. Given first-touch payload exists, when signup completes in same session, then customer record contains matching UTM values.
3. Given two different UTM-tagged visits in one session, first-touch values remain from the first visit.
4. Given no UTM at entry, signup succeeds and UTM fields are null (and reportable as `direct/unknown`).
5. Given storage unavailable/restricted browser context, landing and signup still work without uncaught exceptions.
6. Given reporting window W, attribution breakdown row totals exactly match total signups in W.

## Success Metrics
- Attribution coverage: >= 80% of new signups have non-null `utm_source` within 14 days post-release.
- Funnel visibility: weekly reporting can compute Signup->Activated and Trial->Paid by `utm_source` and `utm_campaign`.
- Guardrail: no increase in signup failure rate vs 7-day pre-release baseline.

## Dependencies
- Existing signup/onboarding API path
- Customer schema includes UTM fields
- Reporting surface/query includes attribution dimensions and direct/unknown fallback

## Risks and Mitigations
- Risk: key mismatch between capture and signup read paths.
  - Mitigation: one canonical attribution storage key contract used across landing and signup.
- Risk: malformed UTM values pollute reporting.
  - Mitigation: trim + max length + null normalization.
- Risk: partial rollout leaves some signup paths unattributed.
  - Mitigation: acceptance checks must cover each active signup entry path.

## Revenue Prioritization Rationale
This is P0 because channel-level attribution is a prerequisite for reducing time to first paying customer. Without reliable source mapping, paid/organic channel spend cannot be optimized against Signup->Activated->Paid outcomes.
