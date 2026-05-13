# PRD-LEADFLOW-UTM-PARAMETER-CAPTURE-LANDING-PAGE-001

- Status: draft
- Version: 1.0
- Date: 2026-05-12
- Owner: Product Manager
- Project: leadflow
- Use Case: feature-utm-parameter-capture-landing-page-for
- Priority: P0

## Product State and KPI Context
- Mission phase: `scale` (first paying customer urgency).
- Current KPI gaps: `Signup to Activated Rate`, `Trial to Paid Conversion`, `NPS Score`.
- Funnel weakness addressed by this PRD: we cannot reliably attribute top-of-funnel traffic source to signup and later activation/paid outcomes.

## Problem
Landing page visitors arrive from campaigns with UTM parameters, but attribution is inconsistently preserved through navigation and signup. Without reliable first-touch capture on landing and persistence to signup records, channel ROI is not trustworthy and revenue decisions are delayed.

## Goal
Implement deterministic first-touch UTM capture on landing page and persist attribution to signup records so each new customer can be tied to source/medium/campaign for funnel analysis.

## Non-Goals
- Multi-touch attribution.
- Cross-device identity stitching.
- Ad-network API integrations (Google/Meta offline conversion upload).
- Attribution modeling beyond first-touch.

## Primary Users
- Marketing owner: needs campaign-level signup and activation visibility.
- Product owner: needs attribution-linked funnel analytics to prioritize conversion work.

## User Stories
1. As a campaign visitor, when I land with UTM parameters, my attribution should be captured immediately without affecting UX.
2. As the business owner, when that visitor signs up, I need the original UTM values saved on the customer record.
3. As product/marketing, I need unattributed signups clearly labeled `direct/unknown` so reporting totals remain complete.

## Functional Requirements

### FR-1 Landing Page Capture (First Touch)
- On initial client render of the landing page, read: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.
- If any UTM key is present and no prior first-touch exists in session state, write a normalized attribution object to session storage.
- First-touch lock: once stored, later pages with different UTM values in same session must not overwrite.
- If no UTM exists, do nothing (no placeholder writes).

### FR-2 Attribution Persistence to Signup
- Trial/signup submission payload must include stored first-touch UTM values when available.
- API must accept UTM fields as optional and persist them on customer creation.
- If no UTM is present, persist nulls and continue normal signup flow.

### FR-3 Data Contract
- Persist the following nullable text fields on customer record:
  - `utm_source`
  - `utm_medium`
  - `utm_campaign`
  - `utm_content`
  - `utm_term`
- Normalize empty strings to null before DB write.

### FR-4 Reporting Contract
- Attribution reporting must support grouping by source/medium/campaign.
- Unattributed rows must roll up as `direct/unknown`.
- Reporting must include denominator-safe totals (no dropped rows).

### FR-5 Reliability and Safety
- Storage operations must fail gracefully (no user-facing error, no signup block).
- SSR/client boundary must not throw runtime errors.
- Input length limits enforced at API boundary to protect database and logs.

## Acceptance Criteria
1. Given landing URL includes any UTM key, when page loads, then first-touch attribution is stored once for that session.
2. Given stored first-touch attribution, when user completes signup from any subsequent page in same session, then created customer row contains matching UTM values.
3. Given a second UTM-tagged page visit in same session, first-touch values remain unchanged.
4. Given direct traffic (no UTM), signup succeeds and UTM columns remain null.
5. Given storage-unavailable browser context, landing and signup still function without uncaught exceptions.
6. Attribution report totals equal total new signups for the selected window (including direct/unknown).

## Instrumentation and Metrics
- Event: `utm_first_touch_captured` with captured keys.
- Event: `signup_attribution_attached` with attribution presence flag.
- KPI rollups (weekly):
  - Attribution coverage rate = signups with non-null `utm_source` / total signups.
  - Activation rate by `utm_source`.
  - Trial-to-paid by `utm_source` and `utm_campaign`.

## Success Metrics
- Attribution coverage for new signups >= 80% within 14 days of release.
- No increase in signup error rate post-release.
- Funnel report available for source-level comparison of signup -> activated -> paid.

## Dependencies
- Existing signup API endpoint and customer creation path.
- Customer table schema migration for UTM columns if not already present.
- Dashboard/report query update for `direct/unknown` grouping.

## Risks and Mitigations
- Risk: inconsistent storage key usage across components.
  - Mitigation: define single canonical storage key in shared constant.
- Risk: malformed UTM values pollute reporting.
  - Mitigation: trim, null-normalize, max length validation.
- Risk: attribution breaks on navigation paths not using landing page component.
  - Mitigation: ensure capture executes at app entry where landing traffic arrives.

## Test Scenarios (Product-Level)
1. Campaign URL -> browse -> signup: attribution preserved.
2. Campaign URL A -> campaign URL B same session -> signup: A preserved.
3. Direct visit -> signup: null attribution, successful flow.
4. Private/incognito with storage restrictions -> signup still succeeds.
5. Reporting query returns direct/unknown plus attributed rows summing to total signups.

## Prioritization Rationale
This is P0 because it directly improves time-to-first-paying-customer decisions by identifying which acquisition channels produce activated and paying agents, reducing wasted spend during conversion-critical period.
