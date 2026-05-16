# PRD-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-001

## Product State (2026-05-12)
- Mission: Active, phase `scale` (`project_missions`).
- Top metric gaps from mission context: `NPS Score`, `Signup to Activated Rate`, `Trial to Paid Conversion`.
- Current weakest point for this use case: activation truthfulness and flow fragmentation in onboarding.

## KPI Focus for This PRD
- Primary KPI: `Signup to Activated Rate`.
- Secondary KPI: `Trial to Paid Conversion`.
- Guardrail KPI: `NPS Score` during first-session onboarding.

## Problem Statement
New agents can log in, but the post-login setup path is inconsistent and can mark onboarding complete without enforcing full activation-critical setup. This delays first value and suppresses conversion to paid.

## Scope
- Post-login onboarding wizard for new agents.
- Guided setup for:
1. Connect Follow Up Boss (FUB).
2. Configure phone number.
3. Verify SMS.
- Resume behavior across sessions.
- Instrumentation for funnel visibility.

## Out of Scope
- Signup page redesign.
- Billing/pricing changes.
- Broad settings page redesign beyond onboarding.

## Verified Current State (Code-Read)
- Wizard UI exists at `product/lead-response/dashboard/app/setup/page.tsx`.
- Wizard includes a non-critical `simulator` step before FUB/phone/SMS.
- Agent onboarding APIs exist:
1. `POST /api/agents/onboarding/fub-connect`
2. `POST /api/agents/onboarding/configure-phone`
3. `POST /api/agents/onboarding/verify-sms`
4. `POST /api/agents/onboarding/complete`
5. `GET /api/agents/onboarding/status`
- Fragmentation risk:
1. Setup UI currently calls mixed endpoint families (`/api/setup/*`, `/api/integrations/fub/verify`) rather than only `/api/agents/onboarding/*`.
2. Completion endpoint sets `onboarding_completed=true` without explicitly validating all required step outcomes in that route.

## Use Cases and Coverage
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-001`: New agent completes FUB, phone, SMS in one guided flow.
Status: Partially covered today.
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-002`: New agent leaves and resumes at first incomplete required step.
Status: Partially covered today.
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-003`: New agent receives actionable recovery when FUB/Twilio fails.
Status: Partially covered today.
- `UC-LEADFLOW-POSTLOGIN-ONBOARDING-WIZARD-004`: Product can measure per-step drop-off with trustworthy events.
Status: Not fully covered.

## User Stories
- As a new real estate agent, I want a single post-login setup flow so I can go live quickly.
- As a new agent, I want to resume where I left off if I close the browser.
- As a new agent, I want clear errors and retries when integration checks fail.
- As Product, I want activation marked only when required setup is truly complete.

## Functional Requirements

### FR-1 Canonical Entry Gate
- After authentication, if agent is not fully activated, system must route to one canonical onboarding wizard.
- Wizard should block normal dashboard workflow until required steps are complete or an explicitly defined defer path is used.

### FR-2 Canonical Step Sequence
- Required sequence:
1. FUB connect
2. Phone configure
3. SMS verify
- Non-critical steps (e.g., simulator) cannot block or reorder required activation steps.

### FR-3 FUB Connect Requirement
- User enters API key.
- Backend validates against FUB.
- Backend stores key in encrypted form.
- Step completes only on successful validation + persisted connection status.

### FR-4 Phone Configuration Requirement
- User submits supported US/Canada number format.
- Backend normalizes and persists phone configuration for the agent.
- Step completes only after backend success.

### FR-5 SMS Verification Requirement
- User triggers test SMS to personal mobile.
- Backend confirms send success.
- Step completes only after successful send result and persisted progress.

### FR-6 Activation Truthfulness
- `onboarding_completed=true` must be set only when all required steps are complete.
- If any defer/skip path exists, deferred users must not count as activated.

### FR-7 Resume and Persistence
- Progress must persist server-side by authenticated agent.
- On re-login, wizard resumes at first incomplete required step.

### FR-8 Error Handling and Retry
- Each required step must provide actionable error copy and retry without full restart.
- Session expiry must redirect to login and preserve resumability.

### FR-9 Analytics Instrumentation
- Minimum events:
1. `wizard_opened`
2. `wizard_step_viewed`
3. `wizard_step_completed`
4. `wizard_step_failed`
5. `wizard_completed`
6. `wizard_deferred` (if defer exists)
- Required properties: `agent_id` (internal), `step_name`, `attempt_count`, `error_type`, `timestamp`.

## Non-Functional Requirements
- P50 status/save API latency <= 2s excluding external provider latency.
- Mobile + desktop usable without horizontal overflow.
- Idempotent step submissions.
- No secret leakage in client logs/analytics payloads.

## Acceptance Criteria
- AC-1: New authenticated agent with incomplete setup is automatically routed into wizard.
- AC-2: FUB step cannot be marked complete unless live validation succeeds and state is persisted.
- AC-3: Phone step cannot be marked complete unless valid normalized number is persisted.
- AC-4: SMS step cannot be marked complete unless test SMS send succeeds and progress is persisted.
- AC-5: Onboarding completion cannot be persisted unless all three required steps are complete.
- AC-6: Reload/re-login resumes at first incomplete required step.
- AC-7: Step success and failure analytics events are emitted with required schema.
- AC-8: User can retry failed step without losing prior successful steps.

## Funnel Impact Hypotheses
- `Signup to Activated Rate`: +15% to +25% relative lift within 30 days.
- `Trial to Paid Conversion`: +8% to +15% relative lift within 45 days.
- Time from first login to activation: median <= 10 minutes.

## Risks and Mitigations
- Risk: FUB/Twilio provider instability creates false failure loops.
Mitigation: explicit retry states + provider-specific error handling.
- Risk: Multiple onboarding endpoint families create state drift.
Mitigation: canonical contract for post-login wizard APIs and completion checks.
- Risk: Skip paths inflate activation KPI.
Mitigation: separate deferred status from activated status.

## Dependencies
- Follow Up Boss API availability.
- Twilio messaging availability and account config.
- Auth/session integrity for agent-scoped state.
- Analytics event sink for onboarding telemetry.

## Open Decisions
1. Should defer/skip be allowed for pilots, or hard-block until required steps finish?
2. Should simulator remain in setup surface but always optional, or move post-activation?
3. Which endpoint family becomes canonical for this wizard (`/api/agents/onboarding/*` strongly preferred)?

## Delivery Definition
This PRD is complete when dev can implement without guessing step semantics, completion rules, telemetry schema, or KPI ownership.
