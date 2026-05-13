# PRD-LEADFLOW-LANDING-ANALYTICS-GA4-POSTHOG-002

## Product State (2026-05-12)
- Mission: first paying customer; weakest measurable funnel segments are Signup to Activated and Trial to Paid.
- Existing implementation: GA4 loader is present in `app/layout.tsx`; landing page already emits some CTA and scroll events; PostHog client scaffolding exists but is not standardized for landing funnel decisions.
- Gap: we still lack one canonical landing funnel event contract that is reliable across GA4 and optional PostHog, so optimization decisions are not trustworthy.

## Objective
Define a single, testable analytics specification for landing page behavior so Product can answer, weekly and without manual reconciliation:
1. Which CTA drives the most qualified signup starts.
2. Where visitors drop in the landing-to-signup funnel.
3. Whether adding PostHog (session replay/funnels) materially improves optimization speed over GA4-only.

## Scope
In scope:
- Landing page (`/`) CTA click analytics.
- Scroll depth analytics.
- Conversion funnel instrumentation from page view to successful signup submit.
- Tooling strategy: GA4 required, PostHog optional behind explicit decision gate.

Out of scope:
- Dashboard in-app analytics unrelated to public landing funnel.
- Paid ad attribution model redesign.
- Cookie consent/legal rewrite beyond analytics disclosure alignment.

## Use Case Coverage
- `UC-LEADFLOW-LANDING-ANALYTICS-CTA-001`: Measure CTA engagement by placement and intent.
- `UC-LEADFLOW-LANDING-ANALYTICS-SCROLL-002`: Measure content consumption depth.
- `UC-LEADFLOW-LANDING-ANALYTICS-FUNNEL-003`: Measure drop-off between visitor, intent, and conversion.
- `UC-LEADFLOW-LANDING-ANALYTICS-TOOLING-004`: Decide GA4-only vs GA4+PostHog using decision criteria, not preference.

Coverage status in this PRD: 4/4 defined.

## User Stories
1. As Product, I need CTA performance by location so I can prioritize copy/layout experiments that increase signup starts.
2. As Product, I need scroll-depth distribution so I can detect where content fails to retain buyer attention.
3. As Product, I need a canonical funnel from landing visit to successful signup so I can find the highest-leverage drop-off.
4. As Product, I need a clear decision gate for PostHog so we avoid adding tooling without proven ROI.

## Event Contract (Canonical)
All events must be emitted with identical naming and required properties in GA4, and if enabled, mirrored to PostHog.

### Required Events
1. `landing_page_view`
- Trigger: landing page render complete (first client paint state acceptable).
- Properties: `page`, `path`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `session_id`.

2. `landing_scroll_depth`
- Trigger: first reach of each milestone per session.
- Properties: `depth_percent` where value in `{25,50,75,90}`, `page`, `session_id`.

3. `landing_cta_click`
- Trigger: click/tap on tracked CTA.
- Properties: `cta_id`, `cta_label`, `cta_location`, `destination`, `page`, `session_id`.

4. `landing_signup_form_view`
- Trigger: signup form becomes visible.
- Properties: `form_id`, `entry_point` (hero/pricing/footer/modal), `page`, `session_id`.

5. `landing_signup_form_start`
- Trigger: first user interaction with a signup form field.
- Properties: `form_id`, `entry_point`, `page`, `session_id`.

6. `landing_signup_submit_attempt`
- Trigger: submit intent before API response.
- Properties: `form_id`, `entry_point`, `page`, `session_id`.

7. `landing_signup_submit_success`
- Trigger: successful signup API result.
- Properties: `form_id`, `entry_point`, `page`, `session_id`.

8. `landing_signup_submit_error`
- Trigger: failed signup API result.
- Properties: `form_id`, `entry_point`, `error_type`, `page`, `session_id`.

### Contract Rules
- No PII allowed in events (no email, name, phone, free-text form fields).
- Event names are immutable without PRD version update.
- `session_id` must be generated consistently per browser session to stitch funnel steps.
- Duplicate firing guard required for scroll milestones.

## Functional Requirements
### FR-1 GA4 Baseline (P0)
- GA4 remains mandatory baseline instrumentation for landing analytics.
- `landing_signup_submit_success` must be marked as conversion event in GA4 admin.
- GA4 debug verification path must exist for staging/preview validation.

### FR-2 CTA Coverage (P0)
- Every revenue-relevant CTA on `/` must map to one stable `cta_id`.
- CTA map must include hero, nav, pricing, and bottom/final CTA placements.
- Any newly introduced CTA in landing page PRs is blocked until mapped to `landing_cta_click`.

### FR-3 Scroll Coverage (P1)
- Scroll depth must capture 25/50/75/90 milestones once per session.
- If user lands deep via anchor links, first visible eligible milestone may fire immediately; no backfill required.

### FR-4 Funnel Completeness (P0)
- Required funnel stages for reporting: `landing_page_view` → `landing_cta_click` → `landing_signup_form_view` → `landing_signup_form_start` → `landing_signup_submit_attempt` → `landing_signup_submit_success`.
- Product reporting must include stage-to-stage conversion rates and largest drop-off stage.

### FR-5 PostHog Decision Gate (P1)
- PostHog remains optional until this gate is evaluated after 14 days of GA4-clean data.
- Enable PostHog only if at least one condition is true:
  - Funnel ambiguity cannot be resolved with GA4 event data alone.
  - Session-level behavior is needed to explain a drop-off >25% at one stage.
  - Product commits to running at least two UX experiments that require replay evidence.

## Non-Functional Requirements
- Performance: analytics scripts and handlers must not regress LCP by more than 100ms at p75 on production landing traffic.
- Reliability: event delivery success rate target >= 98% for client-fired events (sampled by debug logs/analytics QA).
- Privacy: comply with privacy policy language for analytics use; no PII in payloads.
- Maintainability: one shared analytics event schema document referenced by dev and QC.

## Analytics KPIs
Primary:
- Landing Visitor → CTA Click Rate.
- CTA Click → Signup Form Start Rate.
- Signup Attempt → Signup Success Rate.
- Visitor → Signup Success Rate.

Secondary:
- Scroll milestone distribution (% reaching 50%, 75%, 90%).
- CTA performance split by source/medium/campaign.

## Acceptance Criteria
1. GA4 receives all required events with required properties for each tracked landing session path.
2. Funnel exploration in GA4 can be built directly from canonical events without event renaming or ad-hoc joins.
3. For each tracked CTA placement, Product can read 7-day click counts and click-to-success conversion.
4. Scroll milestones (25/50/75/90) are each observed in GA4 when achieved and never double-counted within one session.
5. `landing_signup_submit_success` is configured as GA4 conversion and appears in conversion reporting.
6. A QA run (manual or automated) demonstrates one successful session from landing view through signup success with complete event chain.
7. PostHog is either:
- disabled with gate explicitly documented as "not met", or
- enabled with mirrored event names and the gate reason recorded.

## Prioritization
- P0: canonical event contract, CTA instrumentation completeness, signup funnel completeness, GA4 conversion configuration.
- P1: scroll rigor, PostHog decision gate evaluation.
- P2: advanced segmentation and replay-driven qualitative workflows.

## Risks and Mitigations
- Risk: fragmented event naming between old and new trackers.
- Mitigation: migrate/alias to canonical event names and freeze naming in this PRD version.

- Risk: over-instrumentation before first paying customer.
- Mitigation: keep GA4 baseline mandatory; PostHog is gated and optional.

- Risk: false optimization due to missing stage events.
- Mitigation: acceptance requires complete staged funnel evidence from test session.

## Delivery Artifacts Required from Dev/QC
- Updated analytics tracking plan doc with canonical event table.
- Evidence screenshot/export of GA4 DebugView for full funnel session.
- List of mapped CTA IDs and their DOM locations.
- PostHog gate decision note (enabled/disabled + reason).

## Open Questions
1. Should pilot application (`/pilot`) be treated as same funnel or downstream funnel in separate PRD version?
2. Is a consent banner required now for target geographies, or can we defer until paid acquisition scale?
3. Which owner (Product vs Analytics) publishes the weekly funnel report and variance commentary?
