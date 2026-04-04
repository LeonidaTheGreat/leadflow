# PRD: Frictionless Demo Mode — See AI Respond in 60 Seconds (No FUB Required)

**PRD ID:** prd-frictionless-demo-no-fub  
**Feature ID:** feat-frictionless-demo-no-fub  
**Status:** approved  
**Priority:** 2 (User-facing — directly affects activation rate)  
**Author:** Product Manager  
**Version:** 1.0  

---

## 1. Problem Statement

After signup, new agents must complete FUB webhook setup (30–60 minutes) before they can witness the AI responding to a lead. The vast majority of new signups abandon before completing this step.

**Key friction:** The "aha moment" (seeing the AI respond in <30 seconds) is gated behind a technical integration that most non-technical real estate agents can't complete on their own.

**Expected impact:** Removing this blocker should produce 2x+ improvement in activation rate (signup → aha moment).

---

## 2. Goal

Give every new agent a full-fidelity AI response demonstration **within 60 seconds of signup**, requiring zero FUB setup. After 3 demos, show a conversion CTA to connect FUB and unlock real leads.

---

## 3. User Story

> As a newly signed-up real estate agent, I want to see the AI respond to a real-looking lead immediately after signing up — without needing to configure FUB — so I can understand the product's value before investing time in integration.

---

## 4. Scope

### In Scope
- Demo mode trigger available immediately post-signup (or from dashboard CTA)
- Pre-filled fake lead form (name, phone, email, source, property interest)
- AI processes demo lead and returns an SMS response within 30 seconds
- Demo response displayed in dashboard (not sent as real SMS)
- Demo counter: 3 demos per agent, then FUB connect CTA
- Demo leads clearly labelled as "[DEMO]" — never sent to Twilio or FUB
- Demo mode works without any FUB/Twilio credentials configured

### Out of Scope
- Sending real SMS during demo
- Creating real FUB contacts during demo
- Charging agent for demo usage
- Persistent demo lead storage (ephemeral session only)

---

## 5. Functional Requirements

### FR-1: Demo Lead Input Form
- Form pre-fills with realistic fake lead data (editable by agent):
  - **Name:** e.g., "Sarah Johnson"
  - **Phone:** e.g., "+1 (555) 867-5309" (non-real number)
  - **Email:** e.g., "sarah.johnson.demo@example.com"
  - **Source:** e.g., "Zillow"
  - **Property interest:** e.g., "3BR house under $750K in Mississauga"
- Agent can edit any field before running demo
- "Run Demo" button triggers AI response generation

### FR-2: AI Response Simulation
- Backend route `POST /api/demo/run` accepts demo lead payload
- Route validates agent is authenticated
- Route does NOT invoke Twilio or FUB APIs
- Route invokes the same AI message-generation logic used for real leads
- Response generated within **30 seconds** (p95)
- Response displayed in a "Demo Response" card in the dashboard
- Response clearly marked as "[DEMO]" — not queued for sending

### FR-3: Demo Counter & Limit
- `agents` table: add column `demo_runs_used INT DEFAULT 0`
- Increment `demo_runs_used` on every successful demo run
- Maximum **3 demo runs** per agent
- When limit reached: disable "Run Demo" button, show FUB connect CTA
- CTA: "Connect Follow Up Boss to respond to real leads →" linking to `/dashboard/onboarding#fub`

### FR-4: Demo Availability
- Demo mode available to all agents regardless of plan tier
- Demo mode available even if `fub_connected = false`
- Demo mode NOT available if agent has already connected FUB (they have real leads)
  - Exception: if agent explicitly navigates to demo section, show it with note "You're live — demo still available for testing"

### FR-5: Demo Entry Points
- **Post-signup onboarding wizard:** Demo step shown before FUB connect step
- **Dashboard empty state:** "No leads yet? See the AI in action →" CTA when lead count = 0
- **Direct route:** `/dashboard/demo` renders demo interface

### FR-6: Demo Labelling & Safety
- All demo runs logged to a `demo_runs` table (see schema below)
- `is_demo = true` flag must be set on any internal lead record created during demo
- Demo leads MUST NOT trigger:
  - Twilio SMS send
  - FUB API contact creation
  - Billing/SMS credit deduction
  - Sequence enrollment

---

## 6. API Specification

### `POST /api/demo/run`

**Auth:** Required (JWT)

**Request body:**
```json
{
  "lead": {
    "name": "Sarah Johnson",
    "phone": "+15558675309",
    "email": "sarah.johnson.demo@example.com",
    "source": "Zillow",
    "property_interest": "3BR house under $750K in Mississauga"
  }
}
```

**Response (success):**
```json
{
  "success": true,
  "demo_run_id": "uuid",
  "ai_response": "Hi Sarah, thanks for reaching out about the 3BR properties in Mississauga! I'd love to find you the perfect home under $750K. Are you available for a quick call this week?",
  "response_time_ms": 1842,
  "demos_remaining": 2
}
```

**Response (limit reached):**
```json
{
  "success": false,
  "error": "demo_limit_reached",
  "demos_remaining": 0,
  "cta": { "text": "Connect Follow Up Boss", "url": "/dashboard/onboarding#fub" }
}
```

**Error cases:**
- 401: not authenticated
- 429: demo limit reached (return above payload with 200 status)
- 500: AI generation failed

---

## 7. Database Schema

### New column on `agents` table
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS demo_runs_used INT DEFAULT 0;
```

### New table: `demo_runs`
```sql
CREATE TABLE IF NOT EXISTS demo_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  lead_name TEXT,
  lead_phone TEXT,
  lead_source TEXT,
  ai_response TEXT,
  response_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 8. UI/UX Requirements

### Demo Card Component
- Headline: **"See the AI respond — no setup needed"**
- Subheading: "Enter a lead below and watch the AI craft a personalized response in seconds."
- Pre-filled form (editable)
- "Run Demo →" CTA button (primary, full-width on mobile)
- After response: show AI response in speech-bubble style card
- Show "Response generated in X.Xs" timing
- Show demo counter: "2 demos remaining"
- After 3rd demo: replace button with FUB connect CTA card

### Post-Demo State
- Response bubble displayed prominently
- Sub-text: "This is exactly what your leads would receive — instantly."
- Two CTAs:
  1. "Run Another Demo" (if demos remaining)
  2. "Connect FUB to go live →"

---

## 9. Acceptance Criteria

### AC-1: Demo endpoint exists and responds
- `POST /api/demo/run` with valid auth returns `{ success: true, ai_response: "..." }` within 30 seconds
- Response body includes `demos_remaining` field

### AC-2: Demo limit enforced
- After 3 successful demo runs, `POST /api/demo/run` returns `{ error: "demo_limit_reached" }`
- `agents.demo_runs_used` incremented correctly after each run

### AC-3: No real SMS/FUB calls during demo
- Twilio send API NOT called during any demo run
- FUB contact creation API NOT called during any demo run
- Demo leads do NOT appear in FUB

### AC-4: Demo labelling
- `demo_runs` table row created for each demo run
- Demo run includes `agent_id`, `ai_response`, `response_time_ms`

### AC-5: Demo UI accessible
- `/dashboard/demo` route renders demo form
- Demo CTA appears in onboarding wizard when `fub_connected = false`
- Demo CTA appears in dashboard empty state when lead count = 0

### AC-6: Demo available without FUB
- Agent with no FUB credentials can run demo successfully

---

## 10. Machine-Verifiable Acceptance Checks

```json
[
  {
    "id": "demo-endpoint-exists",
    "command": "grep -r 'demo/run\\|demo-run\\|demoRun' /Users/clawdbot/projects/leadflow/routes /Users/clawdbot/projects/leadflow/app/api --include='*.js' --include='*.ts' -l | wc -l | tr -d ' '",
    "expected": "1"
  },
  {
    "id": "demo-runs-used-column-migration",
    "command": "grep -r 'demo_runs_used' /Users/clawdbot/projects/leadflow/scripts --include='*.js' --include='*.sql' -l | wc -l | tr -d ' '",
    "expected": "1"
  },
  {
    "id": "demo-table-migration-exists",
    "command": "grep -r 'demo_runs' /Users/clawdbot/projects/leadflow/scripts --include='*.js' --include='*.sql' -l | wc -l | tr -d ' '",
    "expected": "1"
  },
  {
    "id": "no-twilio-in-demo-route",
    "command": "grep -r 'twilio\\|sendSms\\|send_sms' /Users/clawdbot/projects/leadflow/routes/demo* /Users/clawdbot/projects/leadflow/app/api/demo* 2>/dev/null | grep -v '.md' | wc -l | tr -d ' '",
    "expected": "0"
  },
  {
    "id": "demo-ui-route-exists",
    "command": "find /Users/clawdbot/projects/leadflow/frontend /Users/clawdbot/projects/leadflow/app -name 'demo*' -type f 2>/dev/null | wc -l | tr -d ' '",
    "expected": "1"
  }
]
```

---

## 11. Non-Functional Requirements

- **Performance:** AI response generated in ≤30s (p95)
- **Security:** Demo endpoint requires authentication; rate-limited to prevent abuse
- **Isolation:** Demo runs are completely isolated from production lead flows
- **Observability:** Demo run events tracked in PostHog as `demo_run_completed` with `demos_remaining` property

---

## 12. PostHog Events

| Event | Properties | Trigger |
|-------|-----------|---------|
| `demo_run_started` | `agent_id`, `demos_remaining` | User clicks "Run Demo" |
| `demo_run_completed` | `agent_id`, `response_time_ms`, `demos_remaining` | AI response returned |
| `demo_limit_reached` | `agent_id` | 3rd demo completes |
| `demo_cta_clicked` | `agent_id`, `cta_type` | User clicks FUB connect CTA |

---

## 13. Success Metrics

- **Primary:** Activation rate (signup → aha moment seen) target: 2x improvement
- **Secondary:** Time to aha moment from signup: target ≤60s
- **Conversion:** % of agents who run demo and then connect FUB: target >30%
- **Demo usage:** Average demos run per agent before FUB connect: target 1.5–2.5

---

## 14. Dependencies

- AI message generation service (must work without FUB lead context)
- `agents` table DDL access for migration
- Dashboard frontend (Next.js or existing frontend framework)
- No Twilio or FUB credentials required

---

## 15. Workflow

`PM → Dev → QC`

Dev implements:
1. DB migration (`demo_runs_used` column + `demo_runs` table)
2. `POST /api/demo/run` route
3. `/dashboard/demo` frontend page
4. Demo CTA in onboarding wizard and empty state

QC verifies:
1. Machine acceptance checks pass
2. Manual: signup fresh account, run demo, see response in <30s
3. Manual: run 3 demos, verify limit reached and CTA shown
4. Manual: verify no Twilio/FUB calls in network tab
