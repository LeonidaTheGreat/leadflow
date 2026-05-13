# PRD-LEADFLOW-LANDING-PAGE-ANALYTICS-002

## Product State (2026-05-12)
- Mission: first paying customer and faster path from traffic to paid.
- Known top mission gaps (context): NPS score, signup→activated rate, trial→paid conversion.
- This PRD scope: instrument landing funnel so we can identify and remove conversion drop-off.

## What Is Being Tested
Whether landing visitors who engage with content and CTAs progress to signup and activation at higher rates once funnel blind spots are visible.

## Problem
Landing page decisions are still partially blind. Prior GA4 work exists, but the current use case requires a production-ready, auditable tracking contract for:
- CTA clicks
- Scroll depth
- Funnel progression to signup/trial activation
- Tool choice governance (GA4 vs PostHog)

Without a strict event contract and verification gates, we cannot trust conversion diagnostics or prioritize growth work.

## Goal
Ship a minimal analytics layer that answers, daily:
1. Which CTA drives the highest qualified progression to signup?
2. Where do users drop in the landing funnel?
3. Which traffic sources produce activated trials, not just clicks?

## Non-Goals
- Session replay optimization workflows
- Full product analytics across authenticated dashboard
- Multi-touch attribution modeling
- Warehouse/BI rebuild

## Success Metrics
Primary:
- 100% of defined landing CTA clicks emit valid analytics events.
- 100% of sessions emit at least one funnel stage event (`landing_view`).
- Funnel report available for stages: `landing_view -> scroll_50 -> cta_click -> signup_start -> signup_complete -> trial_activated`.

Business guardrail:
- No measurable regression in landing page Core Web Vitals after instrumentation.

## User Stories
1. As PM, I need CTA-level conversion rates so I can prioritize copy/layout changes that reduce time to first paying customer.
2. As Marketing, I need source-level funnel drop-off so I can cut channels that generate low-intent traffic.
3. As Founder, I need a daily trusted funnel snapshot so revenue-critical decisions are not guesswork.

## Platform Decision
Default: GA4 (P0).
Optional extension: PostHog (P1) only if one of these is true:
- team needs session replay for unresolved conversion ambiguity after GA4 rollout,
- team needs event-level self-serve product analytics not feasible in GA4 explorations.

Rationale:
- GA4 is already partially present and fastest to standardize.
- PostHog adds implementation and governance overhead; defer until GA4 signal quality is proven.

## Requirements

### FR-1 Event Taxonomy (Mandatory)
Define and use this exact event set on landing flow:
- `landing_view`
- `scroll_depth`
- `cta_click`
- `signup_start`
- `signup_submit`
- `signup_complete`
- `trial_activated` (server-confirmed, if available)

Required common properties for every event:
- `event_version` (start at `1`)
- `page_path`
- `session_id` (anonymous allowed)
- `timestamp_ms`
- `utm_source` (nullable)
- `utm_medium` (nullable)
- `utm_campaign` (nullable)

### FR-2 CTA Instrumentation (Mandatory)
Track all high-intent CTAs on landing page sections:
- nav
- hero primary/secondary
- pricing section CTA(s)
- final page CTA

`cta_click` required properties:
- `cta_id` (stable slug)
- `cta_text`
- `cta_section`
- `destination`

### FR-3 Scroll Depth (Mandatory)
Emit `scroll_depth` at thresholds 25, 50, 75, 90.
Required property:
- `percent_scrolled` (integer)

Dedup rule:
- fire each threshold once per session per page.

### FR-4 Funnel Contract (Mandatory)
Funnel stages and definitions:
1. `landing_view`: first render complete.
2. `scroll_50`: first `scroll_depth` with `percent_scrolled >= 50`.
3. `cta_click`: qualifying CTA click.
4. `signup_start`: first interaction with signup form.
5. `signup_complete`: successful signup response.
6. `trial_activated`: activation confirmed by backend state.

Each stage must be queryable by day and by source (`utm_*`).

### FR-5 Environment + Safety (Mandatory)
- Analytics must be disabled safely when measurement keys are absent.
- No PII (email/phone/name/free-text lead content) in client analytics payloads.
- Instrumentation must not throw runtime errors if analytics SDK is unavailable.

### FR-6 Tool Choice Switch (Mandatory)
Implementation must support one active provider at runtime:
- `GA4` or `PostHog`
- provider selected by env/config flag
- same event taxonomy regardless of provider

### FR-7 Verification Surface (Mandatory)
Provide a lightweight verification checklist showing:
- event fired name
- required properties present
- event appears in provider debug view
- funnel exploration report built and saved

## Revenue Funnel Mapping
Awareness -> Signup -> Onboarding -> Trial -> Aha -> Paid mapping:
- Awareness: `landing_view`, `scroll_depth`
- Signup intent: `cta_click`, `signup_start`
- Signup: `signup_complete`
- Onboarding/Trial: `trial_activated`
- Aha/Paid: out of this PRD scope, but this PRD must output attribution keys consumed downstream.

Current coverage gap:
- Aha and Paid attribution from landing source remains incomplete until downstream instrumentation is aligned.

## Acceptance Criteria
1. All defined events fire with required properties in production build.
2. CTA report shows event counts segmented by `cta_id` and `cta_section`.
3. Scroll report shows unique session counts at 25/50/75/90 thresholds.
4. Funnel report exists for all six stages and is shareable with PM/Founder.
5. UTM dimensions are present on events when URL contains UTM parameters.
6. No PII fields are present in any analytics payload sample.
7. Disabling provider key results in no runtime errors and no event send attempts.
8. Documentation includes provider choice, env vars, and verification checklist.

## Prioritization
- P0: FR-1, FR-2, FR-3, FR-4, FR-5, FR-7
- P1: FR-6 (if provider switch is not already available)
- P2: PostHog-specific enhancements (session replay, heatmaps)

## Risks
- Event drift from ad hoc naming: mitigated by strict taxonomy above.
- False confidence from client-only conversion events: mitigated by `trial_activated` server-confirmed stage.
- Performance regressions: mitigated by non-blocking script load and post-deploy CWV check.

## Dependencies
- Existing landing page CTA components
- Signup/trial state endpoints for `trial_activated`
- Env configuration in deployment platform

## Out of Scope
- Building dashboards outside provider-native reporting
- Retroactive historical backfill
- CRM-level lifecycle reporting

