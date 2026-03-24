# PRD: Aha Moment — Live Lead Simulator in Onboarding (First AI Response in <30s)

- **PRD ID:** PRD-AHA-MOMENT-LEAD-SIMULATOR
- **Project:** LeadFlow AI (`leadflow`)
- **Use Case ID:** `feat-aha-moment-lead-simulator`
- **Owner:** Product
- **Status:** Draft
- **Version:** 1.0
- **Last Updated:** 2026-03-10

---

## 1) Problem Statement
New agents complete signup and land on an empty dashboard without experiencing product value. This breaks activation and trial-to-paid conversion. The onboarding wizard is currently a blocker and does not guarantee a verified "aha moment."

**Aha definition for this feature:**
A new agent sees an inbound lead simulation and receives a generated AI SMS response in **under 30 seconds** before leaving onboarding.

---

## 2) Goal & Success Metrics

### Primary Goal
Guarantee every onboarding-complete user experiences one live, end-to-end lead-response simulation before first dashboard view.

### North Star Metric
- **Aha Completion Rate:** % of new signups who reach "AI response received" success state in onboarding.

### Success Metrics (launch target)
- **P0:** Median time from "Start simulation" to "AI response shown" < 30s
- **P0:** p90 time to first AI response < 45s
- **P0:** Onboarding completion (through simulator step) ≥ baseline onboarding completion - 5pp max drop
- **P1:** Trial-to-paid lift vs prior cohort (7/14/30-day cohorts)

---

## 3) Scope

### In Scope
1. Integrate existing Lead Experience Simulator as final onboarding step.
2. Trigger simulation from onboarding UI with explicit status progression.
3. Show both inbound lead event and outbound AI response in onboarding.
4. Show elapsed-response-time success message.
5. Provide post-aha CTA: "Connect FUB and go live."
6. Persist simulator completion state for onboarding + first dashboard logic.
7. Recovery path when response is delayed/fails.
8. Instrument analytics for funnel and latency.

### Out of Scope
- Building a new simulator engine (reuse existing feature).
- Full CRM sync in onboarding step.
- Pricing/paywall changes.
- Major dashboard redesign.

---

## 4) User Stories
1. **As a new agent**, I want to see a realistic lead and AI response during onboarding so I understand the product works.
2. **As a new agent**, I want the first response quickly (<30s) so I trust the service speed promise.
3. **As a new agent**, I want clear fallback guidance if simulation fails so I can still complete setup.
4. **As PM/analytics**, I want measurable activation events so we can connect aha completion to conversion.

---

## 5) Functional Requirements

### FR-1: Onboarding Flow Placement
- Simulator is the **final step** in onboarding flow (Step 5/5).
- User cannot be marked "onboarding complete" until simulator succeeds or explicit skip path is selected.

### FR-2: Simulation Trigger + Status UI
- User clicks **"Run Live Lead Simulation."**
- UI states: `idle → running → inbound_received → ai_responded → success`.
- UI displays a real-time timer from simulation start.

### FR-3: Evidence of Product Value
- On success, user sees:
  - Simulated inbound lead payload summary (name, intent, timestamp).
  - AI-generated SMS response content preview.
  - Response time badge ("Responded in X seconds").

### FR-4: Time-to-Response Requirement
- System target is AI response shown within 30s.
- If 30s passes without response, show "still processing" state and offer retry.
- If timeout threshold (configurable, default 90s) reached, show fallback with retry and continue options.

### FR-5: CTA After Success
- Success state includes primary CTA: **"Connect Follow Up Boss to go live."**
- Secondary CTA: "Continue to dashboard."

### FR-6: Skip and Re-surface Logic
- If user skips simulator, set `aha_pending=true` and surface simulator entry point on first dashboard visit.
- Dashboard should prominently show unresolved "Complete your first simulation" task.

### FR-7: Data Persistence
Persist at minimum:
- `simulation_started_at`
- `inbound_received_at`
- `ai_response_received_at`
- `response_time_ms`
- `status` (`success|skipped|timeout|failed`)
- `error_code` (if applicable)

### FR-8: Analytics Events (minimum)
- `onboarding_simulation_started`
- `onboarding_simulation_inbound_received`
- `onboarding_simulation_ai_responded`
- `onboarding_simulation_succeeded`
- `onboarding_simulation_skipped`
- `onboarding_simulation_failed`

Each event must include: user/agent id, session id, timestamp, elapsed_ms, and onboarding step.

---

## 6) Non-Functional Requirements
- **Performance:** UI feedback within 1s of trigger click; timestamp precision to seconds.
- **Reliability:** Retries must not create duplicate final success records for same onboarding session.
- **Observability:** Error reasons and latency histogram available for PM/QC review.
- **Security/Privacy:** No real external lead data used in simulator mode.

---

## 7) UX Requirements
- Final step headline: "See your first AI lead response live."
- Show progress indicator and reassuring copy while waiting.
- Show explicit success confirmation and elapsed time.
- On failure/timeout: actionable next step, not dead-end.
- Mobile-responsive: simulation status and response text readable without horizontal scroll.

---

## 8) Edge Cases
1. User closes tab during running simulation → state recoverable on return.
2. Duplicate button clicks → idempotent run lock per session.
3. Simulator backend unavailable → deterministic error state and retry.
4. Response arrives after timeout UI shown → state reconciles to success if valid.
5. User proceeds to dashboard with skip → simulator re-surfaced once on first dashboard entry.

---

## 9) Acceptance Criteria (Definition of Done)
1. Onboarding includes simulator as final step for all new users.
2. Successful simulation displays both inbound lead and AI response content.
3. Response time is computed and displayed in seconds.
4. In normal conditions, first AI response appears in <30s median for QC test runs.
5. If simulation is skipped, dashboard first-visit prompt re-surfaces simulator.
6. Timeout/failure paths are recoverable with retry and do not block app access indefinitely.
7. Required analytics events are emitted with required properties.
8. QC can verify funnel events and timing via logs/dashboard without manual DB digging.
9. Onboarding can complete end-to-end without runtime errors.

---

## 10) Dependencies
- Existing Lead Experience Simulator (`feat-lead-experience-simulator`).
- Onboarding wizard state machine.
- Event tracking pipeline.
- Dashboard first-visit task/prompt component.

---

## 11) Risks & Mitigations
- **Risk:** Simulation latency >30s in real environments.  
  **Mitigation:** Timeout states, retries, latency instrumentation, clear user messaging.
- **Risk:** New step reduces completion rate.  
  **Mitigation:** Keep copy tight, quick feedback loop, allow skip + re-surface.
- **Risk:** Non-idempotent retriggering causes inconsistent state.  
  **Mitigation:** Session-level run lock and dedupe keys.

---

## 12) Rollout & Validation Plan
1. Enable in staging/internal accounts.
2. QC executes E2E scenarios (success, timeout, skip, retry, resume).
3. Enable for new signups only.
4. Monitor first 72h: aha completion rate, latency distributions, onboarding drop-off.
5. Decide full rollout/iteration based on activation + conversion movement.
