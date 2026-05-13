# PRD-LEADFLOW-LANDING-PAGE-ANALYTICS-GA4-POSTHOG-003

## KPI State and Test Focus (2026-05-12)
- Mission phase: `scale`; paying customers: `0`; MRR: `597/20000`.
- Top funnel metric gaps: `Signup to Activated Rate`, `Trial to Paid Conversion`, `NPS Score`.
- Product test in this PRD: establish a trustworthy landing analytics funnel so growth decisions reduce time to first paying customer.

## Problem
Landing traffic and CTA interactions are partially tracked but not governed by one immutable event contract. Without a canonical funnel contract, Product cannot diagnose where conversion collapses between awareness and paid.

## Goal
Define one production-ready analytics specification for landing pages that supports:
1. CTA optimization by placement and audience source.
2. Scroll engagement measurement for content effectiveness.
3. Funnel visibility from awareness to paid-intent handoff.
4. Explicit tool decision: GA4 baseline required, PostHog optional by gate.

## Scope
In scope:
- Public landing routes (`/` and directly related signup entry points from landing CTAs).
- CTA click analytics.
- Scroll depth analytics.
- Funnel events from landing view to signup success signal.
- GA4 mandatory instrumentation and conversion setup.
- PostHog enablement decision gate.

Out of scope:
- Dashboard product usage analytics after authentication.
- Ad platform spend optimization models.
- New experimentation platform rollout.

## Use Cases and Coverage
- `UC-LEADFLOW-LANDING-CTA-ANALYTICS-001`: track revenue-critical CTA clicks by placement.
- `UC-LEADFLOW-LANDING-SCROLL-DEPTH-002`: track section engagement depth.
- `UC-LEADFLOW-LANDING-CONVERSION-FUNNEL-003`: measure stage conversion and drop-off.
- `UC-LEADFLOW-LANDING-TOOLING-GATE-004`: choose GA4-only vs GA4+PostHog by evidence.

Coverage status: `4/4` defined in this PRD.

## Revenue Funnel Mapping (Awareness -> Paid)
- Awareness: `landing_page_view`.
- Signup intent: `landing_cta_click`, `landing_signup_form_view`, `landing_signup_form_start`.
- Onboarding handoff: `landing_signup_submit_success`.
- Trial and paid occur downstream; this PRD must provide clean handoff attribution into those steps.

## User Stories
1. As Product, I need CTA performance by location and source so I can prioritize copy/layout changes with highest signup impact.
2. As Product, I need scroll-depth distribution so I can identify where attention drops before pricing or signup intent.
3. As Product, I need a canonical landing funnel so I can isolate the highest drop-off stage weekly.
4. As Product, I need an explicit PostHog decision gate so we avoid tool sprawl before first paying customer.

## Canonical Event Contract
Event names are immutable for this PRD version.

### Required Events
1. `landing_page_view`
- Trigger: landing page view rendered.
- Required properties: `page`, `path`, `session_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.

2. `landing_scroll_depth`
- Trigger: first reach of each milestone in a session.
- Required properties: `depth_percent` (`25`, `50`, `75`, `90`), `page`, `session_id`.

3. `landing_cta_click`
- Trigger: click/tap on tracked CTA.
- Required properties: `cta_id`, `cta_label`, `cta_location`, `destination`, `page`, `session_id`.

4. `landing_signup_form_view`
- Trigger: signup form becomes visible.
- Required properties: `form_id`, `entry_point`, `page`, `session_id`.

5. `landing_signup_form_start`
- Trigger: first user input in signup form.
- Required properties: `form_id`, `entry_point`, `page`, `session_id`.

6. `landing_signup_submit_attempt`
- Trigger: form submit intent before API result.
- Required properties: `form_id`, `entry_point`, `page`, `session_id`.

7. `landing_signup_submit_success`
- Trigger: successful signup API result.
- Required properties: `form_id`, `entry_point`, `page`, `session_id`.

8. `landing_signup_submit_error`
- Trigger: failed signup API result.
- Required properties: `form_id`, `entry_point`, `error_type`, `page`, `session_id`.

### Contract Rules
- No PII in payloads (no email, name, phone, message text).
- Scroll events fire once per milestone per session.
- `session_id` must remain stable through the same browser session.
- All required events must exist in GA4; if PostHog is enabled, mirror same names/properties.

## Functional Requirements
### FR-1 GA4 Baseline (P0)
- GA4 instrumentation is mandatory for landing analytics.
- `landing_signup_submit_success` must be configured as a GA4 conversion.
- GA4 debug validation path must exist for preview/staging checks.

### FR-2 CTA Tracking Completeness (P0)
- All revenue-relevant CTAs on landing page must map to stable `cta_id` values.
- Minimum coverage: `hero`, `nav`, `pricing`, `final_cta` placements.
- New CTA additions are not releasable without `landing_cta_click` mapping.

### FR-3 Scroll Tracking (P1)
- Capture milestones `25/50/75/90` once per session.
- Support users entering deep links without backfilling missed milestones.

### FR-4 Funnel Completeness (P0)
- Reportable funnel stages: `landing_page_view` -> `landing_cta_click` -> `landing_signup_form_view` -> `landing_signup_form_start` -> `landing_signup_submit_attempt` -> `landing_signup_submit_success`.
- Weekly reporting must include stage conversion rates and maximum drop-off stage.

### FR-5 PostHog Decision Gate (P1)
PostHog remains disabled by default. Enable only if any condition is true after at least 14 days of clean GA4 data:
- GA4 data cannot resolve a conversion drop-off root cause.
- A stage has sustained drop-off >25% and needs session-level behavioral evidence.
- Product commits to at least two UX experiments requiring replay/funnel cohort tooling.

## Non-Functional Requirements
- Performance: analytics changes must not increase p75 LCP by more than 100ms.
- Reliability: event delivery target >= 98% for required client-side events.
- Privacy/compliance: analytics disclosure aligns with policy; no PII event payloads.
- Maintainability: single canonical event table documented and reused across Dev + QC.

## Acceptance Criteria
1. GA4 receives all required events with required properties for tested landing flows.
2. GA4 funnel can be built directly from canonical event names without ad-hoc remapping.
3. Product can compare 7-day CTA click and CTA-to-signup-success performance by `cta_location`.
4. Scroll milestones (`25/50/75/90`) are recorded when reached and not duplicated per session.
5. `landing_signup_submit_success` is active as GA4 conversion event.
6. QA evidence includes at least one full test session from `landing_page_view` to `landing_signup_submit_success`.
7. PostHog gate outcome is documented as either `not met (disabled)` or `met (enabled + reason)`.

## Prioritization
- P0: canonical event contract, CTA completeness, funnel completeness, GA4 conversion setup.
- P1: scroll instrumentation hardening, PostHog decision gate.
- P2: advanced segmentation/report automation.

## Risks and Mitigations
- Risk: fragmented naming across historical analytics code.
- Mitigation: freeze canonical event names in this PRD version.

- Risk: tool sprawl before first paying customer.
- Mitigation: GA4 mandatory baseline; PostHog strict gate.

- Risk: false optimization due to missing stage events.
- Mitigation: acceptance requires a complete verified event chain.

## Delivery Artifacts
- Updated landing analytics tracking plan with canonical event table.
- GA4 DebugView proof of full funnel session.
- CTA registry (`cta_id`, DOM location, destination) for landing route.
- PostHog decision note with gate evidence.

## Open Questions
1. Should `/pilot` be grouped into this same top-of-funnel model or treated as a separate downstream funnel?
2. What owner publishes weekly funnel variance commentary (Product vs Analytics)?
