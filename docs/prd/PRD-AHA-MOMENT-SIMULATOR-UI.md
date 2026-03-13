# PRD: Aha Moment Simulator — Onboarding Step UI

**PRD ID:** PRD-AHA-MOMENT-SIMULATOR-UI  
**Status:** active  
**Author:** Product Manager  
**Use Cases:** feat-aha-moment-lead-simulator, fix-simulator-tsx-step-component-does-not-exist, fix-page-tsx-not-updated-simulator-step-not-wired-into, fix-ahacompleted-not-included-in-onboarding-submit-pay  
**Priority:** P0 — Critical path to activation  
**Workflow:** PM → Dev → QC

---

## Problem Statement

The onboarding wizard's "Aha Moment" step is not implemented. The backend API (`/api/onboarding/simulator`) exists and works, but:

1. **simulator.tsx step component does not exist** — the file `product/lead-response/dashboard/app/onboarding/steps/simulator.tsx` was never created
2. **page.tsx never wired the simulator step** — the `OnboardingStep` type, steps array, imports, and renderer are all missing the simulator step
3. **API has a validation bug** — the `start` action incorrectly requires `sessionId` as input (it should only require `agentId`; `sessionId` is generated and returned by the start response)
4. **completion.tsx doesn't show Aha status** — the confirmation step doesn't reflect whether the user completed the simulator
5. **Progress bar count is wrong** — currently shows 5 steps; after inserting simulator it should show 6

Without this step, new users never experience the core product value during onboarding — the AI responding to a lead in real time. This is the single most important moment for D1 activation and trial-to-paid conversion.

---

## Goal

Implement the full Aha Moment simulator step inside the onboarding wizard so that every new user experiences an AI lead response within 30 seconds of completing setup.

---

## Scope

### In Scope
- `steps/simulator.tsx` — new onboarding step component
- `page.tsx` — wire simulator step between `sms` and `confirmation`
- `steps/confirmation.tsx` — display Aha Moment completion status in Connected Integrations
- API fix: remove `sessionId` from `start` action required fields validation
- Progress bar update: show 6 total steps

### Out of Scope
- Changes to the backend simulation logic
- Changes to database schema
- Admin `/admin/simulator` page (already complete, separate feature)
- Post-login re-prompt after skipping (separate use case)

---

## Functional Requirements

### FR-1: simulator.tsx Step Component

Create `product/lead-response/dashboard/app/onboarding/steps/simulator.tsx`.

**Props interface:**
```typescript
interface SimulatorStepProps {
  onNext: () => void
  onBack: () => void
  agentData: {
    email: string
    firstName: string
    // ... all existing fields
    ahaCompleted?: boolean       // new field
    ahaResponseTimeMs?: number   // new field
  }
  setAgentData: React.Dispatch<React.SetStateAction<any>>
}
```

**Initial state:**
- Phase: `idle` — show "See LeadFlow in Action" headline with a "Start Simulation" button
- Supporting copy: "Watch AI respond to a real lead in under 30 seconds"

### FR-2: Start Simulation Action

On "Start Simulation" click:
1. Call `POST /api/onboarding/simulator` with `{ action: 'start', agentId: agentData.email }`
2. **The API currently (incorrectly) requires `sessionId` for start — see FR-6 for API fix**
3. Response includes `state.id` — store this as the `sessionId` for all subsequent status polls
4. Transition to `running` phase — show animated conversation loading UI

### FR-3: Polling for Status

While in `running` phase, poll `POST /api/onboarding/simulator` every 2 seconds:
```json
{ "action": "status", "agentId": "<email>", "sessionId": "<state.id from start>" }
```

Poll until `state.status === 'success'` or `state.status === 'timeout'` or `state.status === 'failed'`.

**Polling cap:** Stop polling after 90 seconds (match backend timeout).

### FR-4: Conversation Display

Render `state.conversation[]` as a live chat thread:
- `role: 'lead'` → grey bubble, left-aligned, prefixed with "🏠 Lead"
- `role: 'ai'` → emerald/green bubble, right-aligned, prefixed with "🤖 LeadFlow AI"
- Messages append as they arrive (each poll adds new messages from the array)
- Show a "typing..." indicator while status is `running` or `inbound_received`
- **Use `state.conversation` (array of `{role, message, timestamp}`) — not any other field**

### FR-5: Success State

When `state.status === 'success'`:
- Display response time: `state.response_time_ms` formatted as `X.Xs`
- Show success badge: "✓ AI responded in X.Xs"
- Show "Your AI is ready to respond to real leads just like this"
- Enable "Continue to Summary →" button
- Set `agentData.ahaCompleted = true`
- Set `agentData.ahaResponseTimeMs = state.response_time_ms`

### FR-6: API Bug Fix — Remove sessionId from Start Validation

**File:** `product/lead-response/dashboard/app/api/onboarding/simulator/route.ts`

Current bug:
```typescript
if (!action || !agentId || !sessionId) {
  return NextResponse.json(
    { error: 'Missing required fields: action, agentId, sessionId' },
    { status: 400 }
  )
}
```

Fix: `sessionId` is only required for `status` and `skip` actions, not `start`. The `start` action generates and returns the session ID.

```typescript
if (!action || !agentId) {
  return NextResponse.json(
    { error: 'Missing required fields: action, agentId' },
    { status: 400 }
  )
}
if (action !== 'start' && !sessionId) {
  return NextResponse.json(
    { error: 'Missing required field: sessionId (required for status/skip actions)' },
    { status: 400 }
  )
}
```

### FR-7: Error/Timeout State

When `state.status === 'timeout'` or `state.status === 'failed'`:
- Show non-blocking error: "Simulation took longer than expected"
- Show two actions: "Try Again" (re-runs FR-2) and "Skip for now →" (FR-8)
- Do NOT block the user from continuing onboarding

### FR-8: Skip Action

"Skip for now" button (visible in idle and error states):
1. Call `POST /api/onboarding/simulator` with `{ action: 'skip', agentId: agentData.email, sessionId: '<current or generated>' , reason: 'user_skipped' }`
2. Set `agentData.ahaCompleted = false`
3. Call `onNext()` to proceed to confirmation

**Note:** The skip button uses a client-generated `sessionId` (e.g., `crypto.randomUUID()`) when no server session exists yet.

---

## page.tsx Updates

**File:** `product/lead-response/dashboard/app/onboarding/page.tsx`

### Step 1: Add to OnboardingStep type
```typescript
type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'simulator' | 'confirmation'
```

### Step 2: Update steps array
```typescript
const steps: OnboardingStep[] = ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation']
```
Total: **6 steps** — this automatically fixes the progress bar count (rendered as `Step X of {steps.length}`).

### Step 3: Add import
```typescript
import OnboardingSimulator from './steps/simulator'
```

### Step 4: Add renderer
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

### Step 5: Add agentData fields
```typescript
const [agentData, setAgentData] = useState({
  // ... existing fields ...
  ahaCompleted: false,
  ahaResponseTimeMs: null as number | null,
})
```

### Step 6: Include in completeOnboarding() payload
The `agentData` object is already spread into the POST body — `ahaCompleted` and `ahaResponseTimeMs` will be included automatically. No changes needed to `completeOnboarding()`.

---

## confirmation.tsx Updates

**File:** `product/lead-response/dashboard/app/onboarding/steps/confirmation.tsx`

Add Aha Moment status to the "Connected Integrations" section:

```tsx
<div className="flex justify-between items-center">
  <div className="flex items-center gap-2">
    <span className="text-lg">🤖</span>
    <span className="text-slate-300">AI Lead Response</span>
  </div>
  <span className={`text-sm font-medium ${
    agentData.ahaCompleted ? 'text-emerald-400' : 'text-slate-500'
  }`}>
    {agentData.ahaCompleted 
      ? `✓ Live (${(agentData.ahaResponseTimeMs / 1000).toFixed(1)}s response)` 
      : '○ Skipped'}
  </span>
</div>
```

Insert after the Twilio SMS row.

---

## API Contract (Actual — Use This, Not Older Docs)

### POST /api/onboarding/simulator

**Start:**
```json
// Request
{ "action": "start", "agentId": "user@email.com" }

// Response
{
  "success": true,
  "state": {
    "id": "<session-uuid>",           // ← this is the sessionId for future calls
    "session_id": "<session-uuid>",
    "agent_id": "user@email.com",
    "status": "running",
    "simulation_started_at": "ISO",
    "inbound_received_at": null,
    "ai_response_received_at": null,
    "response_time_ms": null,
    "conversation": [],
    "lead_name": "Sarah Johnson"
  }
}
```

**Status:**
```json
// Request
{ "action": "status", "agentId": "user@email.com", "sessionId": "<id from start>" }

// Response
{
  "state": {
    "id": "<uuid>",
    "status": "success",              // idle | running | inbound_received | ai_responded | success | skipped | timeout | failed
    "response_time_ms": 2341,
    "conversation": [
      { "role": "lead", "message": "Hi, I'm interested in buying...", "timestamp": "ISO" },
      { "role": "ai", "message": "Hi Sarah! I'd love to help...", "timestamp": "ISO" },
      ...
    ],
    "lead_name": "Sarah Johnson"
  }
}
```

**Completion check:** `state.status === 'success'` (not any other value)

**Skip:**
```json
// Request
{ "action": "skip", "agentId": "user@email.com", "sessionId": "<any-uuid>", "reason": "user_skipped" }

// Response
{ "success": true, "message": "Simulation skipped" }
```

---

## UX / Visual Design

### Idle Phase
```
┌─────────────────────────────────────┐
│  🤖  See LeadFlow in Action         │
│                                      │
│  Watch your AI respond to a lead     │
│  in under 30 seconds — live.         │
│                                      │
│  ┌─────────────────────────────┐    │
│  │   ▶  Start Simulation       │    │
│  └─────────────────────────────┘    │
│                                      │
│  [Skip for now →]                   │
└─────────────────────────────────────┘
```

### Running Phase
```
┌─────────────────────────────────────┐
│  Simulating lead interaction...      │
│                                      │
│  🏠 Lead: Hi, I'm interested in...  │
│                   🤖 AI: Hi Sarah!  │
│  [typing indicator...]               │
│                                      │
│  ⏱ 2.4 seconds                      │
└─────────────────────────────────────┘
```

### Success Phase
```
┌─────────────────────────────────────┐
│  ✅ AI responded in 2.4s            │
│                                      │
│  [full conversation thread]          │
│                                      │
│  Your AI is ready to respond to      │
│  real leads just like this.          │
│                                      │
│  ┌─────────────────────────────┐    │
│  │   Continue to Summary →     │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### Error/Timeout Phase
```
┌─────────────────────────────────────┐
│  ⚠️  Simulation took longer than    │
│  expected                            │
│                                      │
│  ┌──────────┐  ┌────────────────┐  │
│  │ Try Again│  │  Skip for now  │  │
│  └──────────┘  └────────────────┘  │
└─────────────────────────────────────┘
```

### Design Constraints
- Use existing Tailwind design system (slate-900/800/700 backgrounds, emerald-500 primary)
- Chat bubbles: lead = `bg-slate-700`, AI = `bg-emerald-600`
- Animate new messages in with `animate-in fade-in-up`
- Live elapsed timer during simulation
- Mobile responsive (375px+)

---

## Acceptance Criteria

| # | Criteria | How to Test |
|---|----------|-------------|
| AC-1 | simulator.tsx file exists and renders | Navigate `/onboarding?step=simulator` (or progress through wizard to step 5) |
| AC-2 | Progress bar shows Step 5 of 6 on simulator step | Reach simulator in wizard |
| AC-3 | Start Simulation calls API with only agentId (no sessionId) | DevTools Network tab — verify `start` request body has only action + agentId |
| AC-4 | sessionId from start response used for subsequent polls | DevTools — verify status requests use `state.id` from start response |
| AC-5 | Conversation renders correctly (lead left, AI right) | Complete a simulation — verify bubble layout |
| AC-6 | Success state shows response time from state.response_time_ms | Complete simulation — see "X.Xs response" |
| AC-7 | ahaCompleted = true written to agentData on success | Complete simulation → reach confirmation → see "✓ Live (X.Xs response)" |
| AC-8 | Confirmation shows Aha Moment status | Complete with and without simulator — verify Connected Integrations section |
| AC-9 | Skip sets ahaCompleted = false and advances | Click Skip — reach confirmation — see "○ Skipped" for AI Lead Response |
| AC-10 | API start action no longer requires sessionId | POST `{ action: 'start', agentId: 'test@test.com' }` → no 400 error |
| AC-11 | Error state shows Retry + Skip options | Force timeout by invalid agentId — verify non-blocking error |

---

## E2E Test Specs (Reference)

Existing specs in `e2e_test_specs` table for `feat-aha-moment-lead-simulator`:
- **E2E-AHA-001:** Happy path — first AI response < 30s
- **E2E-AHA-002:** Failure/timeout path — retry and continue
- **E2E-AHA-003:** Skip recovery — dashboard re-prompt
- **E2E-AHA-004:** Analytics events + latency persistence

New specs needed (to be added):
- **E2E-AHA-005:** Onboarding progress bar shows 6 steps on simulator step
- **E2E-AHA-006:** confirmation.tsx shows AI Lead Response row with correct status

---

## Files to Create/Modify

| Action | File | Notes |
|--------|------|-------|
| CREATE | `product/lead-response/dashboard/app/onboarding/steps/simulator.tsx` | FR-1 through FR-8 |
| MODIFY | `product/lead-response/dashboard/app/onboarding/page.tsx` | Add step, type, import, renderer, agentData fields |
| MODIFY | `product/lead-response/dashboard/app/onboarding/steps/confirmation.tsx` | Add Aha Moment row to Connected Integrations |
| MODIFY | `product/lead-response/dashboard/app/api/onboarding/simulator/route.ts` | Fix sessionId validation for start action |

---

## Definition of Done

- [ ] `simulator.tsx` exists and is testable
- [ ] Onboarding wizard shows 6 steps with simulator between sms and confirmation
- [ ] Simulation runs on Start click; conversation renders progressively
- [ ] Success state captures response time; ahaCompleted written to agentData
- [ ] Skip works without crashing; advances to confirmation with ahaCompleted = false
- [ ] API start action accepts agentId only (no sessionId required)
- [ ] confirmation.tsx shows Aha Moment status in Connected Integrations
- [ ] All AC-1 through AC-11 pass QC review
- [ ] Stojan can run a complete simulation during onboarding in < 2 minutes

---

*Dev note: The API uses `state.conversation[]` (array), `state.response_time_ms` (number ms), and `state.status === 'success'` for completion detection. Do not use any other field names. The `state.id` returned from `start` is the sessionId for all subsequent requests.*
