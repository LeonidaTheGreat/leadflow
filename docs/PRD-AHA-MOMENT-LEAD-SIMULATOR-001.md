# PRD: Aha Moment — Live Lead Simulator in Onboarding (First AI Response in <30s)

**PRD ID:** PRD-AHA-MOMENT-LEAD-SIMULATOR-001  
**Status:** draft  
**Version:** 1.0  
**Use Case:** feat-aha-moment-lead-simulator  
**Priority:** P0 (conversion-critical)  
**Workflow:** PM → Dev → QC

---

## 1) Problem Statement

New agents currently complete signup and land in a dashboard with little or no visible value. The onboarding wizard is stuck, and there is no guaranteed "aha moment" proving the core product promise: **LeadFlow responds to leads with AI in <30 seconds**.

Without this moment in onboarding, trial users do not experience outcome confidence, which directly hurts activation and trial-to-paid conversion.

---

## 2) Goal

Make the final onboarding step a mandatory value demonstration:
- User triggers a realistic lead simulation
- User sees inbound lead + AI response in onboarding UI
- First AI response latency is clearly shown and must be **<30 seconds**
- User exits onboarding with confidence in "this works now"

---

## 3) Scope

### In Scope
1. Integrate existing Lead Experience Simulator into onboarding as final step (Step 4 or Step 5 depending on wizard architecture).
2. Show simulated lead message and generated AI response in onboarding context (not hidden in admin tools).
3. Measure and display response latency (`X seconds`).
4. Gate onboarding completion on either:
   - simulation success, or
   - explicit skip with persistent follow-up re-prompt on first dashboard visit.
5. Track funnel analytics for completion and response-time SLA.

### Out of Scope
- New AI model work or prompt redesign.
- Twilio production deliverability optimization.
- Full simulator redesign (reuse existing feature where possible).

---

## 4) User Stories

### US-1: Aha Moment During Onboarding
**As a** new agent, **I want** to run a quick lead simulation before dashboard access **so that** I can see LeadFlow actually respond with AI.

**Acceptance Criteria**
- On final onboarding step, CTA is visible: **"Run My First Lead Simulation"**.
- Clicking CTA starts simulation and shows loading/progress state.
- Inbound simulated lead message is shown in the UI.
- AI response is shown in same thread/UI context.
- System displays: **"Your first lead was responded to in Xs."**
- Success state includes next CTA: **"Go to Dashboard"** and secondary CTA: **"Connect FUB to go live."**

### US-2: Response Time Promise (<30s)
**As a** new agent, **I want** visible proof of response speed **so that** I trust the core value proposition.

**Acceptance Criteria**
- Latency starts when user triggers simulation.
- Latency stops when first AI response is rendered to user.
- If latency ≤ 30s: show success badge/message.
- If latency > 30s: show fallback state, actionable message, and retry CTA.
- Latency value is persisted for analytics.

### US-3: Skip/Recovery Path
**As a** new agent, **if I skip** the simulator step, **I still need** a guided path to complete the aha moment.

**Acceptance Criteria**
- Skip action requires explicit confirmation.
- Skipped users can complete onboarding but are marked `aha_moment_completed=false`.
- First dashboard visit shows prominent simulator prompt until completed.
- Once completed later, prompt is dismissed permanently.

### US-4: Reliability / Non-Blocking Onboarding
**As a** new agent, **I need** onboarding to remain usable even if simulation fails temporarily.

**Acceptance Criteria**
- Simulation failure does not crash onboarding flow.
- Failure state includes retry + continue options.
- Error event captured with reason (timeout, API error, render error, unknown).

---

## 5) Functional Requirements

- **FR-1:** Onboarding includes dedicated "Aha Moment" step wired to simulator backend flow.
- **FR-2:** Step renders inbound and outbound messages in chronological order.
- **FR-3:** First-response timer measured and shown to user.
- **FR-4:** Success state only when AI response is visible in UI.
- **FR-5:** Skip path available but tracked; incomplete aha users reprompted on first dashboard visit.
- **FR-6:** Analytics events emitted for start/success/failure/skip and latency.
- **FR-7:** State persisted per agent so re-login resumes correct status.

---

## 6) Non-Functional Requirements

- **NFR-1 Performance:** P95 first-response latency ≤ 30s in production for simulator onboarding flow.
- **NFR-2 UX:** Clear state transitions (idle → loading → success/failure).
- **NFR-3 Reliability:** Failure is recoverable without blocking account activation.
- **NFR-4 Observability:** All key events and latency metrics queryable by PM/QC.

---

## 7) Data & Tracking Requirements

Minimum analytics events:
1. `onboarding_simulation_started`
2. `onboarding_simulation_succeeded`
3. `onboarding_simulation_failed`
4. `onboarding_simulation_skipped`
5. `onboarding_aha_completed`

Required event properties:
- `agent_id`
- `session_id` (if available)
- `response_latency_ms` (for success/failure when measurable)
- `step_name`
- `error_type` (for failures)
- `timestamp`

Suggested status fields (existing table or metadata object):
- `aha_moment_completed` (bool)
- `aha_first_response_ms` (int)
- `aha_completed_at` (timestamp)
- `aha_skipped_at` (timestamp)

---

## 8) KPI / Success Metrics

Primary:
- **Aha completion rate** = % of new signups who complete simulator step within onboarding session
- Target: **≥80%**

Secondary:
- **P95 first-response latency** ≤ 30s
- **Wizard completion rate uplift** vs baseline (before this feature)
- **Trial-to-paid uplift** for users with completed aha moment vs skipped

---

## 9) QA Acceptance Criteria (Definition of Done)

1. Final onboarding step triggers live simulation from UI.
2. User sees simulated inbound + AI response in onboarding thread.
3. Latency value shown in success state and logged in analytics.
4. Happy-path response appears in under 30 seconds.
5. Failure path shows retry and does not break onboarding.
6. Skip path marks user incomplete and re-prompts on first dashboard visit.
7. Completion analytics and status persistence are verifiable in Supabase.
8. End-to-end flow passes on desktop + mobile viewport.

---

## 10) Dependencies

- Existing feature: `feat-lead-experience-simulator`
- Existing/ongoing feature: `feat-post-login-onboarding-wizard`
- Session/auth context for agent-scoped onboarding state
- Analytics pipeline (GA4 and/or product analytics events)

---

## 11) Risks & Mitigations

- **Risk:** Simulator latency frequently exceeds 30s.  
  **Mitigation:** Instrument latency distribution; add retry UX and alerting threshold.

- **Risk:** Users skip step and never see value.  
  **Mitigation:** mandatory re-prompt on first dashboard visit until completion.

- **Risk:** Onboarding complexity increases abandonment.  
  **Mitigation:** keep step lightweight (single CTA, clear progress, immediate payoff).

---

## 12) Implementation Handoff Notes

- Reuse simulator capabilities; do not build duplicate simulation engines.
- Place this step at end of onboarding to maximize "now I'm ready" confidence.
- Prioritize instrumentation from day 1; PM must be able to monitor completion + latency immediately after release.

---

*This PRD is the source of truth for feat-aha-moment-lead-simulator.*
