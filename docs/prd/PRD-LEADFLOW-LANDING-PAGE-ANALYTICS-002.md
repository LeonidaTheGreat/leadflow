# PRD-LEADFLOW-LANDING-PAGE-ANALYTICS-002

## KPI State (2026-05-12)
- Mission phase: `scale`
- Top mission gaps provided by mission context: `NPS Score`, `Signup to Activated Rate`, `Trial to Paid Conversion`
- This PRD target: close measurement blind spots in Awareness -> Signup -> Trial so conversion work can be prioritized by evidence.

## What Is Being Tested
Whether standardized landing-page analytics (CTA, scroll depth, and funnel stages) reveals the highest drop-off point quickly enough to improve signup->activated and trial->paid experiments.

## Use Case Coverage
- Use case: `improve-landing-page-analytics-add-ga4-posthog`
- Coverage in this PRD:
  - CTA click instrumentation contract
  - Scroll depth instrumentation contract
  - Funnel stage contract from landing view to trial activation
  - Provider decision and fallback (`GA4` default, `PostHog` optional)
- Not covered:
  - In-app authenticated product analytics
  - Aha/Paid-stage instrumentation implementation
  - Dashboard redesign or BI warehouse work

## Problem
Existing landing analytics is inconsistent across prior PRDs and implementations. Event naming and validation are not strict enough for reliable funnel analysis. Without a single production contract, traffic and conversion decisions remain guesswork.

## Goal
Deliver a production-ready analytics specification that any developer can implement without interpretation errors, enabling daily answers to:
1. Which CTA drives the strongest progression to signup completion?
2. Where is the largest drop-off in the landing funnel?
3. Which acquisition sources generate trial activation, not just clicks?

## User Stories
1. As a PM, I need CTA-level funnel conversion so I can prioritize high-impact landing changes.
2. As a growth operator, I need source-level drop-off visibility so I can stop spending time on low-intent channels.
3. As founder, I need a trusted daily funnel view so decisions on paid experiments are evidence-based.

## Platform Decision
- P0 provider: `GA4`
- P1 optional provider: `PostHog`

Decision rule:
- Implement GA4 first for speed and operational simplicity.
- Add PostHog only if GA4 cannot resolve a concrete analysis gap after 7 days of clean GA4 data.

## Functional Requirements

### FR-1: Canonical Event Taxonomy (P0)
The implementation MUST emit exactly these canonical events for the landing flow:
- `landing_view`
- `scroll_depth`
- `cta_click`
- `signup_start`
- `signup_submit`
- `signup_complete`
- `trial_activated` (server-confirmed when available)

Every event MUST include:
- `event_version` (integer, start `1`)
- `page_path`
- `session_id` (anonymous allowed)
- `timestamp_ms`
- `utm_source` (nullable)
- `utm_medium` (nullable)
- `utm_campaign` (nullable)

### FR-2: CTA Click Tracking (P0)
Track all high-intent landing CTAs:
- `nav_primary`
- `hero_primary`
- `hero_secondary`
- `pricing_primary`
- `final_primary`

`cta_click` MUST include:
- `cta_id` (stable slug from list above)
- `cta_text`
- `cta_section` (`nav`, `hero`, `pricing`, `final`)
- `destination`

### FR-3: Scroll Depth Tracking (P0)
Emit `scroll_depth` at thresholds:
- `25`
- `50`
- `75`
- `90`

`scroll_depth` MUST include:
- `percent_scrolled` (integer)

Dedup rule:
- Each threshold fires once per session per page.

### FR-4: Funnel Stage Contract (P0)
Canonical funnel stages:
1. `landing_view`
2. `scroll_50` (derived from `scroll_depth >= 50`)
3. `cta_click`
4. `signup_start`
5. `signup_complete`
6. `trial_activated`

Each stage MUST be segmentable by:
- day
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `cta_id` (where applicable)

### FR-5: Provider Abstraction (P1)
Implementation MUST support one active provider selected by config:
- `GA4`
- `PostHog`

Constraint:
- Canonical event names and required fields remain unchanged across providers.

### FR-6: Privacy and Data Safety (P0)
The implementation MUST NOT send any PII to either provider:
- no email
- no phone
- no name
- no message/free-text lead content

If provider SDK/key is missing:
- no runtime exceptions
- no retry loop spam
- application UX unaffected

### FR-7: Verification Checklist Artifact (P0)
Delivery MUST include a verification checklist covering:
- event emitted name
- required fields present
- provider debug view evidence
- funnel report created and shared

## Non-Functional Requirements
- Performance: analytics scripts load non-blocking; no measurable regression in landing CWV versus pre-instrumentation baseline.
- Reliability: event emission failures do not block navigation or form submission.
- Maintainability: single event dictionary file for names/required properties to prevent drift.

## Revenue Funnel Mapping
- Awareness: `landing_view`, `scroll_depth`
- Signup Intent: `cta_click`, `signup_start`
- Signup: `signup_submit`, `signup_complete`
- Trial: `trial_activated`
- Aha: out of scope (dependency for future PRD)
- Paid: out of scope (dependency for future PRD)

Current weakest link this PRD addresses:
- Awareness -> Signup instrumentation quality is insufficient for confident prioritization.

## Acceptance Criteria
1. In production build, all canonical events fire with required fields and `event_version=1`.
2. For each tracked CTA, at least one validated `cta_click` event appears in provider debug view during test run.
3. `scroll_depth` events appear exactly once per threshold (25/50/75/90) per session per page.
4. Funnel exploration/report exists with all six canonical stages.
5. UTM parameters are present in event payloads when URL contains UTM query params.
6. QA payload review confirms zero PII fields in all tracked events.
7. With provider key removed, site behavior remains functional and console/error logs show no uncaught analytics exceptions.
8. A short operator runbook exists documenting provider selection, env vars, and validation steps.

## Prioritization
- P0: FR-1, FR-2, FR-3, FR-4, FR-6, FR-7
- P1: FR-5
- P2: PostHog-specific enhancements (session replay, heatmaps)

## Dependencies
- Landing page CTA components and IDs
- Signup success signal
- Trial activation signal from backend
- Deployment env var management

## Risks and Mitigations
- Risk: event naming drift across components.
  - Mitigation: single canonical event dictionary and CI lint/check for event constants.
- Risk: client-only conversion overstates funnel quality.
  - Mitigation: include `trial_activated` server-confirmed stage.
- Risk: performance regression from analytics script loading.
  - Mitigation: non-blocking load strategy and post-deploy CWV comparison.

## Out of Scope
- Heatmaps/session replay optimization workflows
- Attribution backfill for historical traffic
- Cross-product analytics for authenticated dashboard
