# PRD-LEADFLOW-LEAD-EXPERIENCE-VISIBILITY-001

- Project: LeadFlow (`leadflow`)
- Use Case ID: `improve-lead-experience-visibility-test-lead-simul`
- Artifact: `PRD-LEADFLOW-LEAD-EXPERIENCE-VISIBILITY-001`
- Owner: Product
- Status: Active Draft
- Priority: P1 (revenue-critical enablement)
- Version: 1.1
- Last Updated: 2026-05-12

## Product State and KPI Gaps
- Mission phase: `scale`.
- Current mission metrics (openclaw DB):
  - `MRR`: 597 / 20000 (gap)
  - `Paying Customers`: 0 / 50 (gap)
  - `Trial to Paid Conversion`: null / 15% (gap, not instrumented)
  - `Signup to Activated Rate`: null / 60% (gap, not instrumented)
  - `NPS Score`: null / 50 (gap, not instrumented)
- Funnel weakness addressed by this PRD: activation narrative breaks during live demos when simulator flow is slow/fails and no fast fallback is surfaced.

## Why This Matters Now
LeadFlow cannot shorten time-to-first-paying-customer if the founder cannot reliably show the lead experience in under 2 minutes. This PRD reduces drop-off between `Onboarding -> Aha Moment -> Paid intent` by making demo proof deterministic.

## Problem Statement
Stojan needs one reliable “show me the lead experience now” path for live calls and internal validation. Current state has simulator and conversation capabilities, but visibility is fragmented and fallback handling is not consistently first-class in the user flow.

## Goal
Deliver a single “Lead Experience Visibility” flow where Stojan can always produce a credible transcript (simulated or sample) within 2 minutes, with privacy-safe sharing.

## Non-Goals
- No new CRM/provider integration.
- No new billing or checkout behavior.
- No redesign of entire onboarding.
- No advanced analytics dashboards beyond required event instrumentation.

## Use Case Coverage
- Covered by this PRD:
  - Test lead simulation for live demo confidence.
  - Sample conversation fallback when simulator fails/times out.
  - Read-only demo sharing.
- Not covered by this PRD:
  - Automated scoring of conversation quality.
  - Persona library management.
  - Multi-agent/brokerage demo orchestration.

## Users
- Primary: Stojan (founder/operator).
- Secondary: prospective pilot real estate agents during demo calls.

## User Stories
1. As Stojan, I can open one page and run a test lead simulation so I can prove the AI lead experience live.
2. As Stojan, if simulation fails, I can switch to sample conversation view in one click without breaking the pitch flow.
3. As a prospect on a call, I can read a clean transcript with masked PII and clear outcome labels.
4. As PM, I can measure whether this surface improves activation and conversion progression.

## Functional Requirements
### FR-1 Unified Entry and IA
- Provide one labeled entry: `Lead Experience Visibility`.
- Entry has two explicit actions:
  - `Run Test Lead Simulator` (primary path)
  - `Open Sample Conversation Viewer` (fallback path)
- System remembers the last used path and most recent successful transcript session for quick replay.

### FR-2 Simulator Execution Path
- User selects a scenario template and runs simulation.
- UI state model is explicit: `idle | running | success | failed | timed_out`.
- Transcript renders turn-by-turn with timestamps and role labels.
- Simulator mode must never send live outbound SMS.

### FR-3 Sample Conversation Viewer
- Show at least 10 demo-safe conversations with:
  - scenario label
  - outcome (`booked | in_progress | opted_out | unqualified`)
  - message count
  - date/time
- Thread expands inline with chronological transcript.
- Sensitive fields are masked before rendering.

### FR-4 One-Click Fallback Continuity
- On simulator `failed` or `timed_out`, show primary CTA: `Open Sample Conversation`.
- Fallback opens without page navigation and preserves presenter context.

### FR-5 Demo Share Link
- Generate read-only link for either:
  - the current simulator transcript, or
  - selected sample thread.
- Link expires in 24h by default and can be revoked.
- Access is auditable (created_by, created_at, opened_at, expires_at).

### FR-6 Instrumentation
- Emit events:
  - `lead_visibility_opened`
  - `lead_simulator_started`
  - `lead_simulator_succeeded`
  - `lead_simulator_failed`
  - `lead_visibility_fallback_used`
  - `sample_viewer_opened`
  - `demo_link_generated`
- Required fields: `actor_id`, `timestamp`, `scenario_id`, `elapsed_ms`, `result_state`.

## UX Requirements
- Transcript readability first: clear role distinction, mobile + desktop fit.
- Failure and fallback CTAs visible above the fold.
- Copy focuses on business outcome (`responds fast`, `books appointments`) not internal implementation terms.

## Data, Privacy, and Compliance
- No raw phone/email/address in visible transcript text.
- Masking standard: only last 4 digits for phone, first letter + domain for email where shown.
- Demo links are read-only and time-bound.
- Audit trail retained for PM/QC verification.

## Acceptance Criteria
1. User can access `Lead Experience Visibility` and open either simulator or sample viewer in one click.
2. Simulator run displays full transcript and confirms no live SMS sent.
3. If simulator fails or times out, one-click fallback loads sample conversation without page reload.
4. Sample viewer provides >=10 usable conversations with required metadata and masked PII.
5. Demo link works in incognito without standard login and expires after TTL.
6. All required events are emitted and queryable for PM analysis.
7. P50 time from page open to visible transcript (simulator success OR fallback sample) is <120 seconds.

## Funnel Impact Hypotheses
- Awareness -> Signup: neutral.
- Signup -> Onboarding: slight positive due to clearer “what happens next” confidence.
- Onboarding -> Trial: positive from earlier proof of value.
- Trial -> Aha Moment: strong positive; deterministic transcript experience.
- Aha Moment -> Paid: positive by reducing trust gap in pilot sales calls.

## Prioritization Rationale
- P1 because it does not directly process billing, but is a blocker for sales confidence and activation narrative.
- Higher priority than cosmetic dashboard work; lower than payment-path breakages.

## Risks and Mitigations
- Risk: simulator instability during live calls.
  - Mitigation: mandatory one-click fallback path.
- Risk: stale/low-quality sample data hurts credibility.
  - Mitigation: curated sample ownership and refresh cadence.
- Risk: privacy leakage.
  - Mitigation: masking checks in QC acceptance tests.

## Dependencies
- Existing simulator endpoint and state model.
- Existing conversation source for sample threads.
- Dashboard route + token middleware for demo access.
- Event capture path used by mission metrics collection.

## Definition of Done
- Acceptance criteria 1-7 pass in QC.
- Stojan completes one successful live simulator demo and one fallback demo.
- Event telemetry is present for first-week usage review.
- PRD is linked to this use case in project tracking.
