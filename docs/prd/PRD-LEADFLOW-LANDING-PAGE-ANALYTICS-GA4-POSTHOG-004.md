# PRD-LEADFLOW-LANDING-PAGE-ANALYTICS-GA4-POSTHOG-004

## KPI State and Test Focus (2026-05-12)
- Mission: AI-powered real estate lead response with first paying customer target.
- Phase: `scale`.
- Critical metric gaps directly impacted by this PRD:
  - `Signup to Activated Rate`: current `null`, target `60%`.
  - `Trial to Paid Conversion`: current `null`, target `15%`.
  - `NPS Score`: current `null`, target `50`.
- Product test in this PRD: instrument a trustworthy landing funnel so PM can identify the highest-revenue leak within 7 days.

## Problem
Landing analytics coverage exists but remains operationally fragile across CTA, scroll, and conversion stages. PM cannot reliably answer:
1. Which CTA placement produces the most signup starts.
2. Where visitors drop before signup completion.
3. Whether top-of-funnel quality correlates with downstream activation and paid conversion.

## Goal
Ship one canonical analytics contract for landing traffic with GA4 as mandatory baseline and PostHog as explicit optional add-on, so revenue-critical decisions are made from valid funnel data instead of assumptions.

## Scope
In scope:
- Landing route `/` and immediate signup entry points triggered from landing CTAs.
- CTA click tracking with stable placement IDs.
- Scroll-depth milestones for engagement diagnostics.
- Conversion funnel from page view through signup success handoff event.
- GA4 conversion setup and QA evidence.
- PostHog decision gate with measurable enable criteria.

Out of scope:
- Authenticated product usage analytics.
- Paid ad bidding optimization.
- Pricing or copy experiments themselves (this PRD enables measurement only).

## Use Cases and Coverage
- `UC-LEADFLOW-LANDING-CTA-ANALYTICS-001` (P0): Measure CTA performance by placement and destination.
- `UC-LEADFLOW-LANDING-SCROLL-DEPTH-002` (P1): Measure engagement depth and attention decay.
- `UC-LEADFLOW-LANDING-CONVERSION-FUNNEL-003` (P0): Measure stage conversion and primary leak.
- `UC-LEADFLOW-LANDING-TOOLING-GATE-004` (P1): Decide GA4-only vs GA4+PostHog by evidence.

Coverage status: `4/4` use cases defined with acceptance checks.

## Revenue Funnel Mapping
Top-of-funnel steps instrumented by this PRD:
1. Awareness: `landing_page_view`
2. Intent: `landing_cta_click`
3. Signup entry: `landing_signup_form_view`
4. Signup action: `landing_signup_form_start` -> `landing_signup_submit_attempt`
5. Handoff for downstream monetization tracking: `landing_signup_submit_success`

Downstream dependency (outside scope but required for business interpretation): successful mapping from `landing_signup_submit_success` cohorts into activation and trial-to-paid cohorts.

## Revenue Impact Hypotheses
1. If `landing_cta_click` by `cta_location` is visible weekly, PM can remove or rewrite the lowest-yield CTA block within one sprint.
2. If `landing_signup_submit_error` is measured with `error_type`, PM can isolate conversion losses caused by form/API friction rather than traffic quality.
3. If funnel stage drop-off is measurable from view to submit success, PM can prioritize P0 conversion fixes before feature expansion.

## User Stories
1. As Product, I need CTA conversion by placement so I can prioritize the highest-yield page changes first.
2. As Product, I need scroll-depth distributions so I can detect where page narrative loses buyers before pricing/signup.
3. As Product, I need one canonical funnel definition so weekly reviews compare like-for-like data.
4. As Product, I need a strict PostHog gate so we do not add tooling overhead before first paying customer.

## Canonical Event Contract
Event names are immutable for this PRD revision.

### Required Events
1. `landing_page_view`
- Required props: `page`, `path`, `session_id`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.

2. `landing_scroll_depth`
- Required props: `depth_percent` (`25`, `50`, `75`, `90`), `page`, `session_id`.

3. `landing_cta_click`
- Required props: `cta_id`, `cta_label`, `cta_location`, `destination`, `page`, `session_id`.

4. `landing_signup_form_view`
- Required props: `form_id`, `entry_point`, `page`, `session_id`.

5. `landing_signup_form_start`
- Required props: `form_id`, `entry_point`, `page`, `session_id`.

6. `landing_signup_submit_attempt`
- Required props: `form_id`, `entry_point`, `page`, `session_id`.

7. `landing_signup_submit_success`
- Required props: `form_id`, `entry_point`, `page`, `session_id`.

8. `landing_signup_submit_error`
- Required props: `form_id`, `entry_point`, `error_type`, `page`, `session_id`.

### Contract Rules
- No PII in event payloads (no name, email, phone, free text).
- Each scroll milestone fires once per session max.
- `session_id` remains stable for same browser session.
- All required events must exist in GA4.
- If PostHog is enabled, mirror the same events and required props.

## Functional Requirements
### FR-1 GA4 Baseline Instrumentation (P0)
- GA4 is mandatory for this use case.
- `landing_signup_submit_success` is configured as GA4 conversion event.
- Debug validation path exists for preview/staging.

### FR-2 CTA Coverage Completeness (P0)
- Every revenue-relevant CTA on `/` maps to one stable `cta_id`.
- Minimum placement coverage: `nav`, `hero`, `mid_page`, `pricing`, `final_cta`.
- New landing CTAs are not releasable without analytics mapping.

### FR-3 Scroll Depth Reliability (P1)
- Track `25/50/75/90` milestones once per session.
- Support deep-link entry without synthetic backfill of missed milestones.

### FR-4 Funnel Completeness and Reporting (P0)
- Required funnel chain:
`landing_page_view` -> `landing_cta_click` -> `landing_signup_form_view` -> `landing_signup_form_start` -> `landing_signup_submit_attempt` -> `landing_signup_submit_success`.
- Weekly PM report includes stage counts, stage conversion, and primary drop-off stage.

### FR-5 Attribution Readiness (P0)
- Funnel events carry UTM params from session context where available.
- PM can segment CTA and signup success by `utm_source` and `utm_campaign`.

### FR-6 PostHog Decision Gate (P1)
PostHog default state: disabled.
Enable only after at least 14 consecutive days of clean GA4 data and at least one criterion is true:
- GA4 cannot isolate root cause for sustained stage drop-off >25%.
- PM has two queued UX tests requiring replay/behavior traces to unblock decision.
- QA confirms GA4 event completeness but decision confidence remains low due to path ambiguity.

## Non-Functional Requirements
- Performance: no analytics-induced p75 LCP regression >100ms.
- Data reliability: >=98% delivery of required client events in QA sample sessions.
- Privacy: analytics payloads contain no PII.
- Operability: event contract lives in one canonical table in this PRD and in implementation docs.

## Acceptance Criteria
1. GA4 receives all required events with required properties for validated landing sessions.
2. GA4 funnel can be built with canonical event names only (no event remapping).
3. PM can compare 7-day CTA click and CTA->signup-success conversion by `cta_location`.
4. Scroll milestones `25/50/75/90` appear when reached and do not duplicate in one session.
5. `landing_signup_submit_success` is configured as GA4 conversion.
6. QA evidence includes at least one full session from `landing_page_view` to `landing_signup_submit_success`.
7. UTM-segmented view of CTA and signup success is available for PM weekly review.
8. PostHog gate outcome is documented as `disabled` or `enabled` with explicit evidence.
9. Dev handoff includes explicit CTA registry table (`cta_id`, `cta_location`, `destination`, `component/path`) for all landing CTAs.
10. QC handoff includes one failing-path validation proving `landing_signup_submit_error` emits with `error_type`.
11. PM weekly review template includes three mandatory outputs: top drop-off stage, worst-performing CTA location, and top `error_type` by frequency.

## Prioritization
- P0: FR-1, FR-2, FR-4, FR-5.
- P1: FR-3, FR-6.
- P2: Replay/heatmap enhancements (only if FR-6 gate passes).

## Risks and Mitigations
- Risk: repeated PRD revisions create drift in event naming.
- Mitigation: this revision freezes canonical names; future changes require explicit version bump.

- Risk: team adds PostHog prematurely and increases operational overhead.
- Mitigation: strict decision gate with measurable criteria.

- Risk: complete top-funnel data but weak downstream linkage to activation/paid.
- Mitigation: require weekly cohort handoff check to activation and paid reports.

## Dependencies
- Existing landing CTA components and signup flow events.
- GA4 property and conversion configuration access.
- Existing UTM capture behavior on landing/session.

## Open Questions
1. Should `/pilot` traffic be included in the same canonical funnel or reported as a parallel funnel?
2. Who owns weekly funnel audit publishing: PM or Analytics agent?
