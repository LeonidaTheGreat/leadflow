# PRD: Enable Onboarding Completion + Aha Moment

**PRD ID:** PRD-ONBOARDING-AHA-COMPLETION  
**Status:** approved  
**Author:** Product Manager  
**Priority:** P0 — Critical path to trial activation  
**Workflow:** PM → Dev → QC  
**Revenue Impact:** High — 5-10 paid agents → $300-600 MRR  
**Target Completion:** Day 52 (5 days from specification)  
**Day Assigned:** 47 | **Day Target:** 52

---

## EXECUTIVE SUMMARY

On **Day 47 of 90**, we have an onboarding wizard that 187 verified agents have access to, but **zero agents have completed it** with an aha moment. We have built the simulator UI (PRD-AHA-MOMENT-SIMULATOR-UI) but have not yet **integrated it fully into the onboarding flow** and enabled **completion tracking**.

This PRD specifies:
1. **Full integration** of the aha moment simulator into the onboarding wizard
2. **Onboarding completion tracking** — record when agents complete all 6 steps including aha moment
3. **Completion metrics** — enable dashboard visibility into conversion funnel
4. **End-to-end test coverage** — verify agents experience the complete flow

### Current State (Day 47)

| Metric | Count | Status |
|--------|-------|--------|
| Email-verified agents | 187 | ✅ Ready for onboarding |
| Agents who started wizard | 11 | ❌ 94% never begin |
| Agents who completed all steps | 0 | ❌ None finished |
| Agents who saw aha moment | 0 | ❌ Zero completion |
| MRR from activation | $0 | ❌ Zero impact |

### Expected State (Day 52)

If this spec is executed:

| Metric | Target | Impact |
|--------|--------|--------|
| Agents who start wizard | 150+ | Automated trigger on first login |
| Agents who complete all steps | 50+ | Full wizard flow end-to-end |
| Agents who see aha moment | 40+ | Simulator integration complete |
| Paid agents from trial conversion | 2-3 | 5-10% conversion on aha completion |
| MRR from this cohort | $300-600 | Pro tier @ $149/mo |

---

## 1. PROBLEM STATEMENT

### Why This Matters

The aha moment is the **single highest-impact moment** in the user journey:
- It's where agents understand the product
- It's where trial-to-paid decision gets made
- Without it, agents see an empty dashboard and churn
- With it, we unlock 30-50% conversion rates in trials

### Current Gaps

1. **Onboarding wizard is built but not fully integrated** — the simulator step (PRD-AHA-MOMENT-SIMULATOR-UI) is specified but may not be fully wired into the wizard
2. **No completion tracking** — we don't know which agents finished onboarding vs. which abandoned
3. **No automated trigger** — agents don't auto-start wizard on first login (they have to be manually prompted)
4. **No dashboard visibility** — product has no metrics on onboarding progression

### Root Causes

- Email verification blocker prevents 40% of signups from accessing trial
- Wizard auto-trigger not implemented (agents land on empty dashboard)
- Aha moment simulator UI exists but may not be fully wired into page.tsx
- No completion signal sent → database doesn't record `onboarding_completed = true`
- No API to fetch onboarding progress by agent

---

## 2. SCOPE: WHAT THIS PRD COVERS

### In Scope

1. **Verify simulator integration in wizard** — ensure steps/simulator.tsx is created and page.tsx routes through it
2. **Auto-trigger wizard on first login** — detect `onboarding_completed = false` and redirect to /dashboard/onboarding
3. **Complete implementation of all 6 wizard steps**:
   - Welcome
   - Agent Info
   - Calendar (FUB sync)
   - SMS (Twilio setup)
   - Aha Moment (Lead simulator)
   - Confirmation & Summary
4. **Onboarding completion signal** — ensure `onboarding_completed = true` is set in database after step 6
5. **Track completion metrics** — log timestamps, response times, step durations
6. **End-to-end test coverage** — verify the complete flow works for new agents

### Out of Scope

- Changes to email verification logic (separate BLOCKER #1)
- Marketing/GTM for the wizard (separate PRD)
- Post-onboarding in-dashboard features (separate phase)
- Trial-to-paid checkout UI (separate BLOCKER #3)

---

## 3. FUNCTIONAL REQUIREMENTS

### FR-1: Aha Moment Simulator Full Integration

**Specification:** The aha moment simulator must be fully integrated as step 5 of the 6-step onboarding wizard.

**Requirements:**

#### File: `product/lead-response/dashboard/app/onboarding/steps/simulator.tsx`

Create this file if it does not exist. It must:

1. **Export a React component** `OnboardingSimulator(props)` with interface:
   ```typescript
   interface OnboardingSimulatorProps {
     onNext: () => void
     onBack: () => void
     agentData: {
       email: string
       firstName: string
       // ... other fields
       ahaCompleted?: boolean
       ahaResponseTimeMs?: number
     }
     setAgentData: React.Dispatch<React.SetStateAction<any>>
   }
   ```

2. **Implement three phases:**
   - **Idle:** "See LeadFlow in Action" + "Start Simulation" button
   - **Running:** Polling animation, live conversation display
   - **Success:** Response time badge + "Continue to Summary →" button

3. **Implement lead simulation flow:**
   - Call `POST /api/onboarding/simulator { action: 'start', agentId: email }`
   - Poll every 2 seconds with `{ action: 'status', agentId: email, sessionId }`
   - Render conversation as chat bubbles (role: 'lead' vs 'ai')
   - Show response time when complete: `state.response_time_ms` formatted as `X.Xs`
   - On success, set `agentData.ahaCompleted = true` + `agentData.ahaResponseTimeMs = response_time_ms`

4. **Implement error handling:**
   - If timeout after 90 seconds, show "Try Again" + "Skip for now" buttons
   - Skip action calls `POST /api/onboarding/simulator { action: 'skip', agentId, sessionId }`
   - Skip does NOT block progression (calls `onNext()`)

#### File: `product/lead-response/dashboard/app/onboarding/page.tsx`

**Updates required:**

1. Add `'simulator'` to `OnboardingStep` type:
   ```typescript
   type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'simulator' | 'confirmation'
   ```

2. Update steps array to include simulator as step 5:
   ```typescript
   const steps: OnboardingStep[] = ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']
   ```

3. Add import:
   ```typescript
   import OnboardingSimulator from './steps/simulator'
   ```

4. Add renderer between SMS and confirmation:
   ```tsx
   {currentStep === 'simulator' && (
     <OnboardingSimulator
       onNext={nextStep}
       onBack={prevStep}
       agentData={agentData}
       setAgentData={setAgentData}
     />
   )}
   ```

5. Add agentData fields for aha tracking:
   ```typescript
   const [agentData, setAgentData] = useState({
     // ... existing fields ...
     ahaCompleted: false,
     ahaResponseTimeMs: null as number | null,
   })
   ```

6. **Critical:** Update progress bar display — it should show **"Step X of 6"** (not 5) after adding simulator

---

### FR-2: Auto-Trigger Onboarding Wizard on First Login

**Specification:** When a verified agent logs in for the first time, they must be automatically redirected to the onboarding wizard if they have not completed it.

**Requirements:**

#### Endpoint: `GET /dashboard`

**Before rendering the dashboard:**
1. Check if `real_estate_agents.onboarding_completed = false` for the current agent
2. If true AND agent just logged in (check session age < 10 seconds), redirect to `/dashboard/onboarding`
3. If already visited onboarding (session age > 10 seconds), allow dashboard render (agent is returning, not first-time)

**Code location:** `product/lead-response/dashboard/app/dashboard/page.tsx` or layout middleware

**Pseudo-code:**
```typescript
const response = await fetch(`/api/agents/profile`, { headers: { Authorization: `Bearer ${token}` } })
const agent = await response.json()

// First login detection: check if this is the first authenticated request
const sessionAge = getCurrentSessionAgeMs()

if (agent.onboarding_completed === false && sessionAge < 10000) {
  return redirect('/dashboard/onboarding')
}
```

#### API: `GET /api/agents/onboarding-status`

Create endpoint if it does not exist:

**Request:**
```http
GET /api/agents/onboarding-status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "agentId": "agent@example.com",
  "onboardingCompleted": false,
  "currentStep": 0,
  "completionTimestamp": null,
  "ahaCompleted": false,
  "ahaResponseTimeMs": null
}
```

**Usage:** Dashboard can poll this to show progress widget during onboarding

---

### FR-3: Confirmation Step Must Display Aha Status

**Specification:** The final confirmation step must visually confirm that the agent completed the aha moment.

**File:** `product/lead-response/dashboard/app/onboarding/steps/confirmation.tsx`

**Requirements:**

1. Display "Connected Integrations" section showing:
   - Calendar: "✓ Connected to Follow Up Boss"
   - SMS: "✓ Connected to Twilio"
   - **Aha Moment: "✓ Saw AI respond in X.Xs"** (if `ahaCompleted = true`)
   - **Aha Moment: "⊘ Skipped for now"** (if `ahaCompleted = false`)

2. Display completion timestamp:
   - "Completed on 2026-04-05 at 3:45 PM"

3. CTA button:
   - "Go to Dashboard →" (calls `onNext()` which should redirect to /dashboard)

---

### FR-4: Onboarding Completion Signal & Database Update

**Specification:** When an agent completes all 6 steps, the system must record completion in the database.

**Requirements:**

#### API: `POST /api/onboarding/complete`

**Request:**
```json
{
  "agentId": "agent@example.com",
  "completionPayload": {
    "ahaCompleted": true,
    "ahaResponseTimeMs": 2500,
    "stepsCompleted": ["welcome", "agent-info", "calendar", "sms", "simulator", "confirmation"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed",
  "agentId": "agent@example.com",
  "onboardingCompletedAt": "2026-04-05T19:45:32.123Z"
}
```

**Database Updates:**
```sql
UPDATE real_estate_agents
SET
  onboarding_completed = true,
  onboarding_completed_at = NOW(),
  aha_completed = true,
  aha_response_time_ms = 2500,
  onboarding_final_step = 'confirmation'
WHERE email = ?
```

#### Confirmation Step Integration

In `confirmation.tsx`, after user clicks "Go to Dashboard →":
1. Call `POST /api/onboarding/complete` with `agentData`
2. Wait for response
3. Redirect to `/dashboard`
4. Display success toast: "You're all set! Your AI is ready to respond to real leads."

---

### FR-5: Onboarding Metrics & Dashboard Integration

**Specification:** The system must track and expose onboarding completion metrics.

**Requirements:**

#### Table: `onboarding_telemetry` (Create if missing)

Schema:
```sql
CREATE TABLE onboarding_telemetry (
  id SERIAL PRIMARY KEY,
  agent_id UUID REFERENCES real_estate_agents(id),
  agent_email VARCHAR(255),
  event_type VARCHAR(50),  -- 'step_started', 'step_completed', 'step_skipped'
  step_name VARCHAR(50),  -- 'welcome', 'agent-info', etc.
  duration_ms INT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
)
```

#### Logging Requirements

Each step must log telemetry events:
- `step_started`: When user enters the step
- `step_completed`: When user clicks "Next"
- `step_skipped`: When user clicks "Skip" (if applicable)
- `aha_simulator_success`: When aha moment completes with response time
- `aha_simulator_timeout`: When aha moment times out
- `aha_simulator_skipped`: When user skips aha moment

**Code location:** `product/lead-response/dashboard/app/onboarding/steps/*.tsx`

**Pseudo-code:**
```typescript
useEffect(() => {
  logTelemetry('step_started', 'simulator')
  return () => {
    const duration = Date.now() - stepStartTime
    logTelemetry('step_completed', 'simulator', { duration_ms: duration })
  }
}, [])

async function logTelemetry(eventType: string, stepName: string, metadata = {}) {
  await fetch('/api/onboarding/telemetry', {
    method: 'POST',
    body: JSON.stringify({ eventType, stepName, metadata })
  })
}
```

#### Endpoint: `GET /api/onboarding/completion-stats`

**Response:**
```json
{
  "totalSignups": 311,
  "emailVerified": 187,
  "wizardStarted": 150,
  "allStepsCompleted": 50,
  "ahaCompleted": 40,
  "completionRate": 0.16,
  "ahaCompletionRate": 0.21,
  "avgAhaResponseTimeMs": 2600,
  "conversionToPaid": 3
}
```

This endpoint enables the dashboard to show conversion funnel metrics.

---

## 4. ACCEPTANCE CRITERIA

### AC-1: Aha Moment Simulator Integrated

- [ ] File `product/lead-response/dashboard/app/onboarding/steps/simulator.tsx` exists
- [ ] Component exports `OnboardingSimulator` with correct prop interface
- [ ] Component has three phases: idle, running, success
- [ ] Component calls `/api/onboarding/simulator` with correct action/agentId
- [ ] Component polls every 2 seconds while running
- [ ] Component stops polling after 90 seconds (timeout)
- [ ] Component renders conversation as chat bubbles
- [ ] Component displays response time on success
- [ ] Component sets `agentData.ahaCompleted` and `ahaResponseTimeMs` on success
- [ ] Component has "Skip" button that works without blocking

### AC-2: Page.tsx Correctly Routes Simulator

- [ ] `OnboardingStep` type includes `'simulator'`
- [ ] steps array is `['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']`
- [ ] page.tsx imports `OnboardingSimulator`
- [ ] page.tsx renders simulator step when `currentStep === 'simulator'`
- [ ] Progress bar shows **"Step 5 of 6"** (not "Step 5 of 5")
- [ ] Navigating forward/back through simulator works

### AC-3: Auto-Trigger Wizard on First Login

- [ ] GET /dashboard detects `onboarding_completed = false`
- [ ] First-time login redirects to `/dashboard/onboarding` automatically
- [ ] Returning users (already visited) can access /dashboard without redirect
- [ ] GET /api/agents/onboarding-status exists and returns correct data

### AC-4: Confirmation Step Shows Aha Status

- [ ] Confirmation step displays "Connected Integrations" section
- [ ] Aha moment shows "✓ Saw AI respond in X.Xs" if completed
- [ ] Aha moment shows "⊘ Skipped for now" if not completed
- [ ] Completion timestamp is shown
- [ ] "Go to Dashboard →" button exists and is clickable

### AC-5: Completion Signal Recorded

- [ ] POST /api/onboarding/complete endpoint exists
- [ ] Endpoint accepts `agentId` and `completionPayload`
- [ ] Endpoint updates `real_estate_agents` with:
  - `onboarding_completed = true`
  - `onboarding_completed_at = NOW()`
  - `aha_completed` = (from payload)
  - `aha_response_time_ms` = (from payload)
- [ ] Completion is idempotent (calling twice doesn't error)

### AC-6: Telemetry Logged

- [ ] `onboarding_telemetry` table exists and has correct schema
- [ ] Each step logs `step_started` and `step_completed` events
- [ ] Aha moment logs success/timeout/skip events
- [ ] All telemetry has timestamps and agent_id

### AC-7: Metrics Endpoint Works

- [ ] GET /api/onboarding/completion-stats exists
- [ ] Returns all metrics in correct format
- [ ] Metrics accurately reflect database state

---

## 5. USER STORIES

### US-1: First-Time Signup Flow (Complete Onboarding + Aha Moment)

**As a** real estate agent signing up for LeadFlow  
**I want to** complete onboarding quickly and see the AI working  
**So that** I understand the product value immediately

**Acceptance:**
- Agent signs up → email verified → logs in
- Dashboard auto-redirects to /dashboard/onboarding
- Agent completes 6 wizard steps in <5 minutes
- On aha moment step, agent sees "AI responded in <30 seconds"
- Agent finishes wizard → sees confirmation → redirected to dashboard
- Dashboard shows sample leads responding in real-time
- Agent decides to upgrade → moves to checkout flow

**Test data:** Create 5 test agents and run through complete flow

---

### US-2: Aha Moment Experience (Core Value Prop)

**As a** trial user on the aha moment step  
**I want to** see a realistic lead and watch the AI respond in real-time  
**So that** I'm convinced the system actually works

**Acceptance:**
- User clicks "Start Simulation"
- Conversation loads with realistic lead → "Hi, interested in the property at 123 Main St"
- AI responds within 30 seconds → "Hi! Thanks for reaching out..."
- Response time displayed → "✓ AI responded in 2.6 seconds"
- User can try again or skip
- On success, user can continue to next step

**Test data:** Run simulator 10 times, verify response times are <30 seconds each time

---

### US-3: Skip Without Blocking (Low Friction)

**As a** user who wants to explore the dashboard first  
**I want to** skip the aha moment without being forced through it  
**So that** I can access the dashboard and explore at my own pace

**Acceptance:**
- Aha moment step has visible "Skip for now →" button
- Clicking skip records the decision in database
- User advances to confirmation step
- Dashboard still encourages user to complete aha moment later

**Test data:** Skip aha moment on 2 test accounts, verify they can still use dashboard

---

---

## 6. TECHNICAL SPECIFICATIONS

### Backend API Contracts

#### POST /api/onboarding/simulator

**Start Action**
- Request: `{ action: 'start', agentId: '<email>' }`
- Response: `{ state: { id: '<session-id>', status: 'running', conversation: [] } }`

**Status Action**
- Request: `{ action: 'status', agentId: '<email>', sessionId: '<session-id>' }`
- Response: `{ state: { status: 'running'|'success'|'timeout'|'failed', conversation: [{role, message, timestamp}], response_time_ms: 2500 } }`

**Skip Action**
- Request: `{ action: 'skip', agentId: '<email>', sessionId: '<session-id>', reason: 'user_skipped' }`
- Response: `{ state: { status: 'skipped' } }`

**Notes:**
- sessionId is generated by server on `start`, returned to client
- sessionId is REQUIRED for `status` and `skip` actions
- sessionId is NOT required for `start` action (fix from PRD-AHA-MOMENT-SIMULATOR-UI)

#### POST /api/onboarding/complete

- Request: `{ agentId: '<email>', completionPayload: { ahaCompleted: bool, ahaResponseTimeMs: number, stepsCompleted: string[] } }`
- Response: `{ success: true, onboardingCompletedAt: '<ISO timestamp>' }`
- Idempotent: calling twice with same agentId is safe

#### GET /api/agents/onboarding-status

- Request: `GET /api/agents/onboarding-status` (auth required)
- Response: `{ agentId: string, onboardingCompleted: bool, currentStep: int, completionTimestamp: string|null, ahaCompleted: bool, ahaResponseTimeMs: number|null }`

#### GET /api/onboarding/completion-stats

- Request: `GET /api/onboarding/completion-stats` (admin/internal only)
- Response: `{ totalSignups, emailVerified, wizardStarted, allStepsCompleted, ahaCompleted, completionRate, ahaCompletionRate, avgAhaResponseTimeMs, conversionToPaid }`

---

### Database Schema

#### real_estate_agents table (existing, add these columns if missing)

```sql
ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMP,
  aha_completed BOOLEAN DEFAULT FALSE,
  aha_response_time_ms INT,
  onboarding_final_step VARCHAR(50);
```

#### onboarding_telemetry table (new)

```sql
CREATE TABLE IF NOT EXISTS onboarding_telemetry (
  id SERIAL PRIMARY KEY,
  agent_id UUID REFERENCES real_estate_agents(id),
  agent_email VARCHAR(255),
  event_type VARCHAR(50),  -- 'step_started', 'step_completed', 'step_skipped', 'aha_simulator_success', etc.
  step_name VARCHAR(50),
  duration_ms INT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_onboarding_telemetry_agent_id ON onboarding_telemetry(agent_id);
CREATE INDEX idx_onboarding_telemetry_created_at ON onboarding_telemetry(created_at);
```

---

## 7. END-TO-END TEST SPECIFICATIONS

### E2E-1: Complete Onboarding with Aha Moment (Happy Path)

**Test ID:** e2e-onboarding-complete-with-aha  
**Preconditions:** Agent account exists, email verified, logged in for first time

**Steps:**
1. Load /dashboard → auto-redirects to /dashboard/onboarding
2. Complete Welcome step → "Next"
3. Complete Agent Info step → "Next"
4. Complete Calendar step (mock FUB) → "Next"
5. Complete SMS step (mock Twilio) → "Next"
6. **Aha Moment step:**
   - Click "Start Simulation"
   - Poll for status every 2 seconds
   - Conversation loads with lead message → AI response
   - Response time displays as "✓ AI responded in X.Xs"
   - Click "Continue to Summary →"
7. **Confirmation step:**
   - Verify "Connected Integrations" shows aha status
   - Click "Go to Dashboard →"
8. Redirect to /dashboard
9. **Verify database:** `SELECT onboarding_completed, aha_completed, aha_response_time_ms FROM real_estate_agents WHERE email = ?`
   - `onboarding_completed` = true
   - `aha_completed` = true
   - `aha_response_time_ms` > 0

**Expected Duration:** <5 minutes  
**Success Criteria:** All steps complete without error, database reflects completion

---

### E2E-2: Skip Aha Moment (Non-Blocking)

**Test ID:** e2e-onboarding-skip-aha  
**Preconditions:** Agent account exists, email verified, logged in for first time

**Steps:**
1. Load /dashboard → auto-redirects to /dashboard/onboarding
2. Progress through steps 1-5 as in E2E-1
3. **Aha Moment step:**
   - Click "Skip for now →"
4. **Confirmation step:**
   - Verify "Aha Moment: ⊘ Skipped for now"
   - Click "Go to Dashboard →"
5. Redirect to /dashboard
6. **Verify database:** `aha_completed = false`

**Expected Duration:** <3 minutes  
**Success Criteria:** Skip works without blocking, database reflects skip

---

### E2E-3: Aha Moment Timeout (Error Handling)

**Test ID:** e2e-onboarding-aha-timeout  
**Preconditions:** Agent account exists, email verified, logged in

**Steps:**
1. Progress to Aha Moment step
2. Click "Start Simulation"
3. Wait 90+ seconds (poll times out)
4. Verify error message: "Simulation took longer than expected"
5. Verify two buttons: "Try Again" and "Skip for now →"
6. Click "Try Again" → restart from step 2 (loop once)
7. If still failing, click "Skip for now →" → proceed to confirmation

**Expected Duration:** ~180 seconds (90s × 2 attempts)  
**Success Criteria:** Timeout handled gracefully, skip option always available, user not blocked

---

### E2E-4: Wizard Auto-Trigger on First Login

**Test ID:** e2e-wizard-auto-trigger  
**Preconditions:** New agent account, email verified

**Steps:**
1. Agent logs in immediately after email verification
2. Should automatically redirect to `/dashboard/onboarding` (not /dashboard)
3. Progress bar shows "Step 1 of 6"
4. Wizard displays correct welcome copy

**Expected Duration:** <30 seconds  
**Success Criteria:** Redirect happens, progress bar correct

---

### E2E-5: Telemetry Logging

**Test ID:** e2e-onboarding-telemetry  
**Preconditions:** Agent completes onboarding

**Steps:**
1. Complete onboarding flow (E2E-1)
2. Query telemetry: `SELECT COUNT(*) FROM onboarding_telemetry WHERE agent_email = ?`
3. Verify at least these events exist:
   - `step_started` for each of 6 steps
   - `step_completed` for each of 6 steps
   - `aha_simulator_success` (or `aha_simulator_skipped`)
4. Verify all events have `created_at` timestamps
5. Verify `duration_ms` is present for `step_completed` events

**Expected Count:** ~15-17 telemetry events (2-3 per step)  
**Success Criteria:** All expected telemetry events present, timestamps valid, no gaps

---

## 8. IMPLEMENTATION PRIORITY

### Phase 1: Simulator Integration (Day 47-48)
- Create/verify simulator.tsx exists and has all required logic
- Wire simulator into page.tsx
- Fix API validation bug (remove sessionId from start action)
- **Acceptance:** All AC-1 and AC-2 pass

### Phase 2: Auto-Trigger & Completion (Day 48-49)
- Implement auto-trigger logic in dashboard GET
- Create POST /api/onboarding/complete endpoint
- Update confirmation step to show aha status
- **Acceptance:** All AC-3, AC-4 pass

### Phase 3: Telemetry & Metrics (Day 49-50)
- Create onboarding_telemetry table
- Add logging to all 6 steps
- Create GET /api/onboarding/completion-stats endpoint
- **Acceptance:** All AC-6, AC-7 pass

### Phase 4: E2E Testing & QC (Day 50-52)
- Run E2E tests E2E-1 through E2E-5
- Fix any issues found
- Deploy to production
- Monitor production metrics
- **Acceptance:** 5+ agents complete onboarding by Day 52

---

## 9. SUCCESS METRICS

### North Star (Revenue Impact)

By **Day 52**:
- **5+ agents complete onboarding** (vs. 0 today)
- **3+ agents see aha moment and respond positively** (survey/NPS)
- **2-3 agents convert to paid** (vs. 0 today)
- **$300-600 MRR from this cohort** (at $149/mo Pro tier)

### Operational Metrics

| Metric | Target | Current |
|--------|--------|---------|
| % of verified agents who start wizard | 80% | 6% |
| % of starters who complete all 6 steps | 30% | 0% |
| % of completers who saw aha moment | 80% | 0% |
| Avg aha response time | <30s | N/A |
| Wizard abandonment rate | <20% | 94% |
| Trial-to-paid conversion (aha completers) | 10%+ | 0% |

---

## 10. DEPENDENCIES & BLOCKERS

### Dependencies

1. **Email Verification Must Work (BLOCKER #1)** — 187 agents must be able to access trial and login
2. **First-time signup redirects correctly** — agents reach dashboard, not error page
3. **API /api/onboarding/simulator works** — backend simulator is functional and tested
4. **Session management works** — auth tokens valid, user identity clear in API calls

### Blockers (Resolved)

- ✅ Simulator UI spec complete (PRD-AHA-MOMENT-SIMULATOR-UI)
- ✅ API backend for simulator exists
- ✅ Database schema supports agents table

### Potential New Blockers

- If page.tsx doesn't render steps in order, navigation breaks
- If sessionId mismatch between client/server, polling fails
- If response time calculation is wrong in backend, metrics invalid
- If telemetry insert fails, performance data unavailable

---

## 11. ROLLBACK PLAN

If issues emerge in production:

1. **Simulator times out repeatedly** → Hide "Continue" button, show "Skip" prominently
2. **Auto-trigger causes redirect loops** → Disable auto-trigger, add manual "Start Wizard" button in dashboard
3. **Database inserts fail** → Remove telemetry writes, keep feature functional
4. **Response times invalid** → Disable response time display, show generic "AI responded" instead

All rollbacks preserve user experience without breaking the flow.

---

## 12. REFERENCES

- **PRD-AHA-MOMENT-SIMULATOR-UI:** Detailed simulator UI specification (separate PRD, already approved)
- **PRD-REVENUE-RECOVERY-CRITICAL-DAY47:** Full revenue recovery strategy with 3 blockers
- **CLAUDE.md:** Project architecture and file structure
- **PMF.md:** Pricing tiers and target conversion rates
- **E2E_MAPPINGS.md:** Existing E2E test patterns and naming conventions

---

## 13. VERSION HISTORY

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-04-04 | Product Manager | Initial PRD for onboarding completion + aha moment |

---

**PRD Status:** ✅ APPROVED  
**Assigned to:** Dev + QC  
**Timeline:** Day 47-52 (5 days for specification + implementation)  
**Revenue Target:** $300-600 MRR
