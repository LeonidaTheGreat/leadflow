# PRD: Post-Login Onboarding Wizard for New Agents

**PRD ID:** PRD-ONBOARDING-WIZARD-001  
**Status:** draft  
**Version:** 1.0  
**Use Case:** feat-post-login-onboarding-wizard  
**Priority:** medium  
**Workflow:** product → marketing → design → dev → qc  

---

## 1. Problem Statement

New agents complete signup/payment but land in a dashboard with no active integrations. Currently they must manually navigate settings to connect FUB, add a Twilio phone number, and test SMS — with no guidance. This friction causes:
- Agents abandoning setup (not reaching "aha moment")
- Support burden from misconfiguration
- Delayed time-to-value (first SMS response to a lead never fires)

A post-login onboarding wizard eliminates this drop-off by guiding each new agent step-by-step through activation.

---

## 2. Goals

| Goal | Metric | Target |
|------|--------|--------|
| Reduce time-to-first-SMS | Minutes from signup to first AI SMS | < 10 min |
| Reduce setup abandonment | % of new agents completing full setup | ≥ 80% |
| Reduce support tickets | Setup-related support requests / week | ↓ 50% |
| Increase pilot conversion | Pilots who become paying customers | Baseline via pilot cohort |

---

## 3. Scope

### In Scope
- Wizard shown to newly registered agents (first login after account creation)
- Three-step guided setup:
  1. **Connect FUB** — enter FUB API key + webhook registration
  2. **Configure Phone Number** — provision or enter existing Twilio phone number
  3. **Verify SMS** — send a test SMS to the agent's own mobile number
- Progress persistence (resume if session dropped)
- Completion state stored in `agents` table — wizard not shown again
- Skip option per step (agent can return later via Settings)
- Success screen with next steps ("Go to Dashboard")

### Out of Scope
- Cal.com booking setup (handled in settings post-wizard)
- Stripe billing reconfiguration
- Multi-agent / team account setup
- Mobile app (web dashboard only)

---

## 4. User Stories

### US-1: Triggered on First Login
**As** a newly registered agent,  
**When** I log in for the first time after completing signup/payment,  
**Then** I should be automatically redirected to the onboarding wizard instead of the main dashboard.

**Acceptance Criteria:**
- Wizard triggers if `agents.onboarding_completed` is `false` or `null`
- Wizard does NOT trigger for existing agents with `onboarding_completed = true`
- If agent refreshes mid-wizard, they resume at their last completed step
- Session expiry during wizard → resume on next login at same step

---

### US-2: Step 1 — Connect FUB Integration
**As** a new agent in the onboarding wizard,  
**When** I enter my Follow Up Boss API key,  
**Then** the system should validate it, register the webhook, and confirm connection.

**Acceptance Criteria:**
- Input field for FUB API key (masked)
- "Test Connection" button that:
  - Calls FUB `/v1/people` or identity endpoint with the key
  - Returns success or a clear error (invalid key, network error)
- On success: webhook URL is auto-registered in FUB
- FUB credentials stored in `agents.fub_api_key` (encrypted)
- `agents.fub_connected = true` set after validation passes
- Step marked complete; wizard advances to Step 2
- "Skip for now" link — step state saved as `skipped`, wizard advances

---

### US-3: Step 2 — Configure Phone Number
**As** a new agent on Step 2 of the wizard,  
**When** I choose how to configure my SMS phone number,  
**Then** I can either provision a new Twilio number or enter an existing one.

**Acceptance Criteria:**
- Two options presented:
  - **Get a new number** — provision a Twilio number in the agent's area code; agent enters desired area code (US/Canada)
  - **Use existing number** — enter a verified Twilio number they already own
- For "get new number":
  - System calls Twilio to provision; presents assigned number
  - Number stored in `agents.twilio_phone_number`
- For "existing number":
  - Validates format (E.164)
  - Stored in `agents.twilio_phone_number`
- `agents.phone_configured = true` after step completes
- "Skip for now" allowed; SMS verify step (Step 3) disabled if skipped
- Clear cost disclosure: "A Twilio phone number costs ~$1/month — billed to your Twilio account"

---

### US-4: Step 3 — Verify SMS
**As** a new agent on Step 3 of the wizard,  
**When** I enter my mobile number and click "Send Test SMS",  
**Then** I should receive an actual SMS confirming LeadFlow is connected and working.

**Acceptance Criteria:**
- Input field for agent's personal mobile number (E.164 format with helper)
- "Send Test SMS" button triggers real Twilio SMS send
- SMS content: "Hi [Agent Name]! 👋 Your LeadFlow setup is complete. You're all set to auto-respond to leads in under 30 seconds. — LeadFlow AI"
- Success state: green checkmark, "SMS sent! Check your phone."
- Error state: if SMS fails, show error with retry option and link to Support
- `agents.sms_verified = true` stored on success
- Step disabled (greyed) if Step 2 was skipped

---

### US-5: Wizard Completion
**As** a new agent who has completed (or skipped) all wizard steps,  
**When** I reach the completion screen,  
**Then** I should see a summary of what's connected and be guided to the dashboard.

**Acceptance Criteria:**
- Completion screen shows:
  - ✅ FUB Connected (or ⚠️ Not connected — go to Settings)
  - ✅ Phone Number: +1 (XXX) XXX-XXXX (or ⚠️ Not configured)
  - ✅ SMS Verified (or ⚠️ Not verified)
- "Go to Dashboard" button navigates to main dashboard
- `agents.onboarding_completed = true` set on completion screen render
- If any steps skipped, show: "You can complete setup anytime in Settings → Integrations"

---

### US-6: Re-entry from Settings
**As** an agent who skipped setup steps,  
**When** I navigate to Settings → Integrations,  
**Then** I should be able to complete or re-run each wizard step individually.

**Acceptance Criteria:**
- Settings → Integrations shows same step UI as wizard (FUB, Phone, SMS Verify)
- Each can be independently updated
- Does not re-trigger the full wizard modal
- `onboarding_completed` is not reset when re-running individual steps

---

## 5. Data Model Changes

### `agents` table — new columns required:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `onboarding_completed` | boolean | false | Wizard fully completed or dismissed |
| `onboarding_step` | integer | 0 | Last completed step (0=not started, 1=FUB, 2=phone, 3=SMS) |
| `fub_connected` | boolean | false | FUB API key validated and webhook registered |
| `phone_configured` | boolean | false | Twilio phone number provisioned |
| `sms_verified` | boolean | false | Test SMS sent successfully |

> **Note:** `fub_api_key` and `twilio_phone_number` columns may already exist. Dev to verify schema and add missing columns only.

---

## 6. API Endpoints Required

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/agents/onboarding/fub-connect` | Validate FUB API key, register webhook |
| `POST` | `/api/agents/onboarding/provision-phone` | Provision Twilio number (area code param) |
| `POST` | `/api/agents/onboarding/configure-phone` | Store existing Twilio number |
| `POST` | `/api/agents/onboarding/verify-sms` | Send test SMS to agent mobile |
| `POST` | `/api/agents/onboarding/complete` | Mark wizard as complete |
| `GET` | `/api/agents/onboarding/status` | Return current onboarding state for resume |

All endpoints require authenticated session (JWT middleware).

---

## 7. Routing / UI Logic

- **Trigger:** After login, if `agents.onboarding_completed = false`, redirect to `/onboarding` 
- **Route:** `/onboarding` — wizard page (Next.js route in `product/lead-response/dashboard/`)
- **Guard:** If agent directly navigates to `/dashboard` and `onboarding_completed = false`, redirect to `/onboarding`
- **Progress bar:** 3-step progress indicator at top (Step 1, 2, 3)
- **Back navigation:** allowed — re-entering a step does not reset state

---

## 8. Design Requirements

Passed to Design agent:
- 3-step wizard modal/page (not a multi-page form — single page with step transitions)
- Progress bar with step labels: "Connect FUB → Add Phone → Verify SMS"
- Each step: title, description, input(s), primary CTA, "Skip" secondary link
- Success state per step: green checkmark animation, step turns green in progress bar
- Error state: inline error below input, red border, retry CTA
- Mobile-responsive (agents may complete this on their phone)
- Brand consistent with dashboard (dark sidebar, white content area)
- Completion screen: status summary cards (3 items), "Go to Dashboard" primary CTA

---

## 9. Marketing Requirements

Passed to Marketing agent:
- Email sequence triggered on signup:
  1. **Immediate:** "Welcome to LeadFlow — here's how to set up in 5 minutes" (links to wizard)
  2. **+24h (if wizard not completed):** "Your setup is incomplete — you're missing leads" (urgency)
  3. **+48h (if still not completed):** "Need help? Book a quick setup call" (concierge offer)
- SMS copy for test message (see US-4 above)
- Wizard step completion emails (optional, lower priority)

---

## 10. Acceptance Criteria Summary (Definition of Done)

- [ ] Wizard appears on first login for new agents only
- [ ] Each step can be completed or skipped independently
- [ ] FUB API validation is real (live API call, not mocked)
- [ ] Phone number provisioning via Twilio works end-to-end
- [ ] Test SMS is actually delivered to agent's mobile
- [ ] `agents` table updated correctly at each step
- [ ] Wizard does not appear again after completion
- [ ] Agent can re-access each step via Settings → Integrations
- [ ] All endpoints are authenticated
- [ ] Completion screen shows accurate status per step
- [ ] Mobile-responsive UI
- [ ] E2E test passes for full wizard flow (all 3 steps completed)
- [ ] E2E test passes for partial flow (steps skipped)

---

## 11. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Does provisioning a Twilio number auto-bill the agent's Twilio account, or does LeadFlow pay and charge via Stripe? | Stojan | Open |
| 2 | Should skipped agents see a persistent banner in the dashboard until setup is complete? | PM/Design | Open |
| 3 | What happens if an agent's FUB account is on a plan without API access? | PM | Open — may need plan-gating message |
| 4 | Is `fub_api_key` already stored in `agents` table or a separate `integrations` table? | Dev | Open |

---

## 12. Out-of-Scope (Future)
- Cal.com booking integration wizard step
- Team/brokerage multi-agent onboarding
- Video walkthrough per step
- In-app chat support widget during setup
