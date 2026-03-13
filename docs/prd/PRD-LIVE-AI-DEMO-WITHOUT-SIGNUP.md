# PRD — Live AI Demo Without Signup

- **PRD ID:** PRD-FEAT-DEMO-WITHOUT-SIGNUP-001
- **Use Case ID:** feat-demo-without-signup
- **Project:** LeadFlow AI (`leadflow`)
- **Owner:** Product Manager
- **Status:** approved
- **Version:** 1.0
- **Last Updated:** 2026-03-12

## 1) Objective

Increase top-of-funnel activation by letting prospects experience LeadFlow’s core value (AI lead response in under 30 seconds) before any signup/auth step.

## 2) Problem

Current funnel asks visitors to commit (trial/signup) before they experience product value. This creates high friction for curious prospects and lowers conversion from landing visitor to activated prospect.

## 3) Success Criteria

- Prospect can run a realistic lead-response demo in <60 seconds from landing.
- Demo visibly shows AI-generated personalized SMS response and response-time proof (<30s).
- Demo ends with a high-intent CTA to start free trial.
- Demo interactions are measurable in analytics for conversion attribution.

## 4) Scope

### In Scope
- Public interactive demo available on `/demo` **or** on landing-page embedded section.
- No authentication required.
- Prospect input fields for fake lead simulation.
- AI-generated SMS copy using Claude.
- Visual timeline/animation showing AI “thinking” and response completion time.
- Post-demo CTA to trial signup.
- Event logging for demo funnel analytics.

### Out of Scope
- Real SMS send to external phone numbers.
- CRM writebacks during public demo.
- Account creation inside demo flow.
- Multi-step onboarding personalization beyond demo context.

## 5) User Stories

1. **As a first-time visitor**, I want to try the product instantly without creating an account so I can assess value quickly.
2. **As a real estate prospect**, I want to input a fake lead and property context so the demo feels relevant to my day-to-day workflow.
3. **As a skeptical buyer**, I want to see the AI reply speed and message quality so I trust the core promise.
4. **As a ready-to-buy prospect**, I want an immediate CTA to start trial after seeing the demo so I can continue with minimal friction.

## 6) Functional Requirements

### FR-1: Public Demo Access
- Demo entry point exists at `/demo` or landing section.
- Route/section is publicly accessible with no auth wall.

### FR-2: Lead Input Simulator
- Inputs required:
  - Lead name (free text)
  - Property interest/type (free text or select)
- Optional input:
  - Lead source (e.g., Zillow, Realtor.com, Facebook)
- Clear “Send Lead” primary action.

### FR-3: AI SMS Generation (Claude)
- On submit, backend calls Claude to generate personalized first-response SMS.
- Output includes lead name and property context when provided.
- If AI call fails, show graceful fallback message and allow retry.

### FR-4: Response-Time Experience
- Demo displays a visible response timer or countdown.
- Completed state clearly communicates “Responded in X seconds”.
- Target perceived system response: under 30 seconds.

### FR-5: Demo Conversation Visualization
- User sees staged progression:
  1. Lead submitted
  2. AI processing/typing
  3. SMS response delivered in UI
- Animation must make the “instant response” value obvious.

### FR-6: Conversion CTA
- End state includes prominent CTA:
  - Primary: “Start Free Trial — No Credit Card Required”
- CTA links to trial signup route used by current funnel.

### FR-7: Analytics Logging
- Track at minimum:
  - `demo_started`
  - `demo_response_generated`
  - `demo_completed`
  - `demo_cta_clicked`
- Include contextual properties where available (source page, property_type, lead_source, response_time_bucket, device type).
- No PII persisted in analytics payloads.

## 7) Non-Functional Requirements

- Mobile-first responsive behavior (375px viewport supported).
- Demo interaction should feel fast and stable under normal load.
- Accessibility baseline: keyboard-usable controls, readable contrast, labels for inputs.
- No auth/session dependency for core demo usage.

## 8) UX Requirements

- Above-the-fold demo headline tied to value prop: AI responds in <30s.
- Input section should require minimal typing.
- Loading/processing state must be explicit (avoid dead UI state).
- Completed state should reinforce trust with speed proof + personalized output.
- CTA should appear immediately after successful demo response.

## 9) Data & Analytics Spec

### Event Contract (minimum)
1. `demo_started`
   - props: `entry_point`, `property_type`, `lead_source`, `session_id`
2. `demo_response_generated`
   - props: `response_time_ms`, `response_time_bucket`, `personalization_present`, `session_id`
3. `demo_completed`
   - props: `response_time_ms`, `cta_visible`, `session_id`
4. `demo_cta_clicked`
   - props: `cta_target`, `entry_point`, `session_id`

### Privacy
- Do not store raw lead names in analytics event payload.
- Mask or omit free-text input in event logs.

## 10) Edge Cases

- Empty/invalid input: inline validation, no API request.
- Claude timeout/error: show fallback response + retry option.
- Slow response >30s: still show final state with clear messaging and retry.
- Multiple rapid submits: disable duplicate sends while request in progress.

## 11) Acceptance Criteria (Final)

1. `/demo` page or landing demo section presents an interactive lead simulator.
2. Demo is accessible without authentication.
3. AI generates personalized SMS copy via Claude from provided lead context.
4. User sees animated progression and explicit response-time feedback targeting <30s value proof.
5. Demo completion state includes CTA linking to trial signup.
6. Demo interactions (`started`, `response_generated`, `completed`, `cta_clicked`) are logged for conversion analytics.
7. Demo is usable on mobile viewport.
8. Error/fallback states are handled gracefully without blocking trial CTA discovery.

## 12) Dependencies

- Claude API availability and key configuration.
- Existing analytics ingestion pipeline/table compatibility.
- Existing trial signup route remains active and stable.

## 13) Rollout & Validation

- Release behind a demo feature flag if needed.
- Validate on production:
  - demo loads unauthenticated
  - Claude output is generated
  - response timer displayed
  - CTA routes correctly
  - analytics events recorded end-to-end

## 14) Implementation Handoff Notes (Design/Dev/QC)

- **Design:** prioritize a high-clarity “before signup value moment” layout; mobile-first.
- **Dev:** do not use real outbound SMS; treat this as a simulated UX flow.
- **QC:** verify response timing display semantics and analytics event integrity (names + required properties).
