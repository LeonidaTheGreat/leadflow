# PRD-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-001

_Last updated: 2026-05-12_

## Product State and KPI Focus (2026-05-12)
- Mission phase: `scale` (from `project_missions`).
- Revenue-critical gaps: `Signup to Activated Rate`, `Trial to Paid Conversion`, `NPS Score`.
- This PRD targets first-session activation quality for new agents after login.

## Spec Objective
Define a post-login onboarding wizard for new agents that guides required activation setup in one flow:
1. Connect Follow Up Boss (FUB)
2. Configure phone number
3. Verify SMS

## Problem
New agents can authenticate but may fail to finish activation-critical setup quickly. Fragmented setup paths and weak completion gating reduce true activation and delay time-to-value.

## Scope
- Post-login onboarding wizard for newly authenticated agents.
- Required setup sequence: FUB -> phone -> SMS verification.
- Resume behavior across refresh/re-login.
- Per-step error/retry UX.
- Activation telemetry for funnel visibility.

## Out of Scope
- Signup page changes.
- Pricing, billing, or trial policy changes.
- Broad settings redesign outside onboarding surface.
- Non-FUB CRM onboarding.

## Verified Current Product Surface (Code-Read)
- Wizard surface exists: `product/lead-response/dashboard/app/setup/page.tsx`.
- Onboarding APIs exist under `/api/agents/onboarding/*` including:
  - `GET /status`
  - `POST /fub-connect`
  - `POST /configure-phone`
  - `POST /verify-sms`
  - `POST /complete`
- Existing PRD/docs indicate mixed onboarding endpoint families have existed historically; this spec defines one canonical flow contract.

## Use Case Coverage
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-001`: New agent completes FUB, phone, SMS in one guided session.
Coverage status: partial.
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-002`: Agent exits and resumes at first incomplete required step.
Coverage status: partial.
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-003`: Agent receives actionable recovery on FUB/SMS failure.
Coverage status: partial.
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-004`: Product can measure drop-off by step with trustworthy telemetry.
Coverage status: not complete.

## User Stories
- As a new real estate agent, I want a guided setup immediately after login so I can go live without guessing.
- As a new agent, I want progress to persist so I can resume if I leave.
- As a new agent, I want clear failure messages and retries for external integrations.
- As Product, I want activation counted only when required setup is truly complete.

## Functional Requirements

### FR-1 Trigger and Route Guard
- If authenticated agent is not fully activated, route to canonical onboarding wizard.
- Block normal dashboard workflow until required steps are complete, except explicit defer rules defined below.

### FR-2 Required Step Sequence
- Required order is fixed:
1. FUB connect
2. Phone configure
3. SMS verify
- Optional/non-critical onboarding tasks must not block or reorder these required steps.

### FR-3 FUB Connection
- Agent submits FUB API key.
- Backend validates key against FUB and persists connection state.
- Step completion requires successful validation plus persisted success state.

### FR-4 Phone Configuration
- Agent submits supported US/Canada phone number format.
- Backend normalizes and persists configured number.
- Step completion requires backend success.

### FR-5 SMS Verification
- Agent sends test SMS to personal mobile number.
- Backend confirms send success and persists verification state.
- Step completion requires successful send result.

### FR-6 Truthful Activation Gate
- `onboarding_completed=true` can be set only when FR-3/FR-4/FR-5 are all complete.
- Deferred/skipped users must not be counted as activated.

### FR-7 Resume Behavior
- Progress state is persisted server-side per authenticated agent.
- Reload/re-login resumes at first incomplete required step.

### FR-8 Error Handling and Retry
- Every required step provides actionable error reason and retry action.
- Retry should not erase previously completed steps.

### FR-9 Telemetry Contract
- Required events:
  - `wizard_opened`
  - `wizard_step_viewed`
  - `wizard_step_completed`
  - `wizard_step_failed`
  - `wizard_completed`
  - `wizard_deferred` (if defer is allowed)
- Required properties: `agent_id`, `step_name`, `attempt_count`, `error_type`, `timestamp`.

## Non-Functional Requirements
- P50 step status/save API latency <= 2s (excluding third-party provider latency).
- Mobile and desktop usability with no horizontal overflow.
- Idempotent step submissions.
- No secret leakage in logs or analytics payloads.

## Acceptance Criteria
- AC-1: New authenticated agents with incomplete activation are auto-routed to onboarding wizard.
- AC-2: FUB step cannot complete unless live validation succeeds and state persists.
- AC-3: Phone step cannot complete unless normalized number persists.
- AC-4: SMS step cannot complete unless test SMS send succeeds and state persists.
- AC-5: Completion endpoint cannot set onboarding complete unless all required steps are complete.
- AC-6: Refresh/re-login resumes at first incomplete required step.
- AC-7: Required telemetry events emit with required property schema.
- AC-8: Failed steps are retryable without resetting previous successful steps.

## Funnel Impact Hypotheses
- Signup to Activated Rate: +15% to +25% relative lift in 30 days.
- Trial to Paid Conversion: +8% to +15% relative lift in 45 days.
- First login to activation median: <= 10 minutes.

## Risks and Mitigations
- Risk: FUB/Twilio instability creates false-negative setup failures.
Mitigation: explicit retry states plus provider-specific error mapping.
- Risk: Mixed endpoint families create state drift.
Mitigation: canonicalize onboarding on `/api/agents/onboarding/*` for this flow.
- Risk: Defer paths inflate activation KPI.
Mitigation: maintain separate deferred vs activated status.

## Open Product Decisions
1. Is defer/skip allowed for all cohorts, or only pilot cohort?
2. If defer is allowed, should deferred agents see a persistent activation banner until complete?
3. Should optional simulator tasks move post-activation entirely?

## Definition of Ready for Dev
This PRD is ready when implementation can proceed without ambiguity on:
- required step order,
- completion gating rules,
- resume semantics,
- telemetry schema,
- KPI ownership.
