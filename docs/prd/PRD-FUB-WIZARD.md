# PRD: Guided FUB Connection Wizard — Self-Serve Integration in <5 Minutes

**ID:** prd-fub-wizard  
**Use Case:** feat-onboarding-fub-wizard  
**Status:** draft  
**Priority:** P2 (user-facing, pilot adoption blocker)  
**Phase:** Phase 1 — Pilot  
**Last Updated:** 2026-04-04  

---

## Problem Statement

### Current State
New agents who sign up for LeadFlow cannot connect their Follow Up Boss account without manual intervention. There is no guided flow — agents are left to figure out API key location, webhook configuration, and connection verification on their own. Most cannot.

### Impact
- Activation rate is blocked: agents sign up, hit a wall, and churn before seeing value
- Every manual onboarding is a support burden that doesn't scale
- PMF.md identifies "adoption friction — must integrate with existing workflows" as a top risk factor
- PMF.md's pivot trigger: if <50% complete onboarding → simplify onboarding (we are not measuring this yet because the flow doesn't exist)

### Why Now
Day 43 of 90 to $20K MRR. Pilot agent recruitment is in progress. The activation gap — from signup to first AI response — is the single biggest drop-off point before any revenue is realized. A self-serve wizard eliminates this blocker without requiring Stojan to manually configure each agent.

---

## User Stories

1. As a new real estate agent, I want to connect my FUB account step-by-step so I can start receiving AI-assisted lead responses immediately without calling support.

2. As a new agent, I want clear instructions with direct links to the right FUB settings page so I can find my API key in under 60 seconds.

3. As a new agent, I want to verify my connection works before I go live so I have confidence that real leads will be captured.

4. As an agent returning to a partially completed setup, I want the wizard to resume where I left off so I don't have to start over.

---

## Functional Requirements

### Wizard Entry Point
- New agents with no FUB API key configured are redirected to `/onboarding` after login
- Agents who have completed onboarding skip directly to `/dashboard`
- Progress indicator at the top: "Step 1 of 3", "Step 2 of 3", "Step 3 of 3"
- Back button available on steps 2 and 3
- Wizard state persists across page refreshes (stored server-side in `onboarding_step` column)

### Step 1 — API Key Entry

**UI:**
- Text input: "Your FUB API Key"
- Help text: "You can find this in Follow Up Boss → Admin → My Account → API"
- Hyperlink: "Open FUB API settings →" → `https://app.followupboss.com/2/api`
- "Continue" button (disabled until field is non-empty)
- Inline error display if validation fails

**Validation:**
- Client-side: non-empty, minimum 20 characters
- Server-side: attempt a lightweight FUB API call to verify key is valid (e.g. `GET /v1/me`)
- On valid: save key (encrypted at rest), advance to step 2
- On invalid: display "This API key doesn't appear to be valid. Check that you copied it fully from FUB."

**Security:**
- API key stored encrypted at rest — never stored in plaintext
- Key never returned in API responses after initial save

### Step 2 — Webhook URL Configuration

**UI:**
- Displayed webhook URL: `https://fub-inbound-webhook.vercel.app/fub-webhook?agent_id={agent_id}`
- Copy-to-clipboard button adjacent to the URL
- Visual feedback on copy: button changes to "Copied!" for 2 seconds
- Step-by-step instructions:
  1. In FUB, go to Admin → Integrations → Webhooks
  2. Click "Add Webhook"
  3. Paste the URL above
  4. Select event types: "New Lead", "Lead Updated"
  5. Click Save
- Link: "Open FUB Webhook settings →" → `https://app.followupboss.com/2/integrations/webhooks`
- Checkbox: "I've added the webhook in FUB" (required to advance)
- "Continue" button (enabled after checkbox ticked)

### Step 3 — Connection Test

**UI:**
- Instruction: "Send a test lead from FUB to verify your webhook is working"
- Option A — Test button: "Send Test Ping" — backend sends a test event to the agent's FUB (requires FUB API access)
- Option B — Passive verification: "I've sent a test lead" — backend checks for a webhook receipt in the last 5 minutes
- Polling indicator: spinner + "Waiting for test lead..." while polling
- Timeout: 2 minutes. On timeout: "No lead received yet. Make sure you sent a test lead in FUB, then try again."
- "Try Again" button resets the 2-minute polling window
- On success: green checkmark animation + "Connection verified!" message

**Backend logic:**
- `POST /api/onboarding/test-connection` starts a 2-minute polling window
- `GET /api/onboarding/test-status` returns `{received: true/false, received_at: timestamp}`
- Backend checks `webhook_events` table (or equivalent) for this agent's most recent entry
- If timestamp is within the last 5 minutes: success
- Sets `fub_webhook_verified_at` on the agent record

### Success State

- Full-screen (or modal) success animation: green checkmark
- Headline: "Your FUB connection is active"
- Body: "LeadFlow will now respond to new leads from Follow Up Boss in under 30 seconds."
- CTA button: "Go to Dashboard" → navigates to `/dashboard`
- Sets `onboarding_completed_at` timestamp

---

## Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Wizard completion time | < 5 minutes end-to-end for a non-technical agent |
| Mobile responsiveness | Must work on iOS Safari and Android Chrome |
| Progress persistence | Refresh at any step resumes at same step |
| Support contact required | < 5% of agents (95% self-serve success) |
| Step 3 polling timeout | 2 minutes, with clear retry path |
| API key validation latency | < 3 seconds |

---

## API Endpoint Specifications

All endpoints require authentication (valid session cookie). All return JSON.

### `GET /api/onboarding/status`
Returns current wizard state for the authenticated agent.

**Response 200:**
```json
{
  "step": 2,
  "completed_steps": ["api_key", "webhook"],
  "completed_at": null,
  "fub_connected": false,
  "fub_webhook_verified_at": null
}
```

**Fields:**
- `step`: current step (0 = not started, 1 = api key, 2 = webhook, 3 = test, 4 = complete)
- `completed_steps`: array of completed step keys
- `completed_at`: ISO timestamp or null
- `fub_connected`: true if API key is saved and validated
- `fub_webhook_verified_at`: ISO timestamp of last successful test, or null

---

### `POST /api/onboarding/fub-api-key`
Saves and validates the FUB API key for the authenticated agent.

**Request body:**
```json
{ "apiKey": "abc123..." }
```

**Response 200 (valid):**
```json
{ "valid": true, "step": 2 }
```

**Response 400 (invalid key):**
```json
{ "valid": false, "error": "API key rejected by Follow Up Boss" }
```

**Behavior:**
- Validates by calling FUB `GET /v1/me` with provided key
- On success: encrypts key, saves to agents table, sets `onboarding_step = 2`
- Never returns the key value after save

---

### `GET /api/onboarding/webhook-url`
Returns the auto-generated webhook URL for the current agent.

**Response 200:**
```json
{
  "webhookUrl": "https://fub-inbound-webhook.vercel.app/fub-webhook?agent_id=agent_abc123",
  "agentId": "agent_abc123"
}
```

---

### `POST /api/onboarding/test-connection`
Initiates a connection test. Opens a 2-minute window to receive a webhook event.

**Request body:** (empty or `{}`)

**Response 200:**
```json
{
  "testStarted": true,
  "expiresAt": "2026-04-04T12:07:00Z",
  "pollUrl": "/api/onboarding/test-status"
}
```

---

### `GET /api/onboarding/test-status`
Polls for webhook receipt after test-connection was initiated.

**Response 200:**
```json
{
  "received": false,
  "received_at": null,
  "window_expires_at": "2026-04-04T12:07:00Z",
  "timed_out": false
}
```

**On success:**
```json
{
  "received": true,
  "received_at": "2026-04-04T12:05:42Z",
  "window_expires_at": "2026-04-04T12:07:00Z",
  "timed_out": false
}
```

**Behavior:**
- Checks for any webhook event for this agent within the test window
- Sets `fub_webhook_verified_at` and `onboarding_step = 4` (complete) on first success
- After `expiresAt`: returns `timed_out: true`

---

## Database Schema Changes

### Option A (preferred): Columns on `agents` table

```sql
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fub_webhook_verified_at TIMESTAMPTZ;
```

`onboarding_step` values:
- `0` — not started
- `1` — API key entered and validated
- `2` — webhook URL acknowledged
- `3` — test initiated
- `4` — complete (webhook verified)

### Option B (alternative): Separate `onboarding_state` table

```sql
CREATE TABLE IF NOT EXISTS onboarding_state (
  agent_id        TEXT PRIMARY KEY REFERENCES agents(id),
  step            INTEGER NOT NULL DEFAULT 0,
  completed_steps JSONB NOT NULL DEFAULT '[]',
  test_window_started_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Use Option A unless the agents table already has a migration freeze. The dev agent should check current agents table structure before deciding.

---

## UI Specifications

### Route
- Wizard: `/onboarding` (Next.js page in `product/lead-response/dashboard/app/onboarding/page.tsx`)
- Redirect logic: in the dashboard layout or middleware — check `onboarding_step` < 4 AND no `onboarding_completed_at` → redirect to `/onboarding`

### Layout
- Centered card, max-width 520px
- Step indicator (text-based is fine: "Step 2 of 3")
- Back button: top-left, only visible on steps 2 and 3
- Progress bar optional but not required for v1

### Styling
- Match existing dashboard design system (Tailwind, same color palette)
- Success state: use green-500 or equivalent
- Error states: red-500 with clear error message text
- Mobile: single-column, full-width inputs, minimum 44px tap targets

---

## Acceptance Criteria (Machine-Verifiable)

| ID | Check | Expected |
|----|-------|----------|
| onboarding-route-exists | `find /Users/clawdbot/projects/leadflow/product/lead-response/dashboard/app -name 'page.tsx' -path '*/onboarding/*' \| wc -l \| tr -d ' '` | `1` |
| onboarding-api-status | `grep -r 'onboarding' /Users/clawdbot/projects/leadflow/routes/ --include='*.js' -l \| wc -l \| tr -d ' '` | min `1` |
| fub-api-key-endpoint | `grep -r 'fub-api-key\|fubApiKey' /Users/clawdbot/projects/leadflow/routes/ --include='*.js' \| wc -l \| tr -d ' '` | min `1` |
| onboarding-step-column | `psql postgresql://clawdbot@localhost/openclaw -c "SELECT column_name FROM information_schema.columns WHERE table_name='agents' AND column_name='onboarding_step';" \| grep -c onboarding_step` | `1` |
| webhook-url-endpoint | `grep -r 'webhook-url\|webhookUrl' /Users/clawdbot/projects/leadflow/routes/ --include='*.js' \| wc -l \| tr -d ' '` | min `1` |

---

## E2E Test Scenarios

1. **New agent sees FUB wizard after signup** — sign up as new agent, navigate to `/dashboard`, verify redirect to `/onboarding`, verify step 1 UI is visible.

2. **FUB API key entry validation** — on step 1, submit empty field → verify submit blocked. Submit a short invalid key → verify error message shown. Submit a well-formed key → verify advancement to step 2.

3. **Webhook URL copy button** — on step 2, verify webhook URL is displayed and contains the agent's ID. Click copy button, verify button text changes to "Copied!".

4. **Connection test flow** — on step 3, click "Send Test Ping" or "I've sent a test lead". Verify spinner/polling UI appears. Simulate webhook receipt → verify success checkmark displayed.

5. **Wizard completion → dashboard redirect** — complete all 3 steps, verify redirect to `/dashboard`. Re-navigate to `/onboarding` → verify redirect back to `/dashboard` (completed agents skip wizard).

---

## Out of Scope (v1)

- Cal.com appointment booking configuration (separate wizard step, future)
- Twilio phone number setup (future)
- Team/multi-agent onboarding
- FUB pipeline stage mapping configuration
- Admin override to mark onboarding complete without FUB

---

## Dependencies

- FUB API access (agents must have admin-level API key in FUB)
- `fub-inbound-webhook.vercel.app` must be live and accepting webhooks
- Agent auth session must be functional (UC-AUTH-FIX-001: complete)
- agents table must be accessible from the Next.js API routes

---

## Revenue Impact

Direct. Pilot agents blocked on FUB setup cannot reach the Aha Moment (first AI response in <30s). Without this wizard, every pilot agent requires manual setup time, capping throughput. With self-serve onboarding, pilot scale from 3 → 10 → 50 agents becomes feasible without support overhead.

PMF.md target: 100 Pro agents at $149/mo = $14,900 MRR of a $20K target. Activation rate is the multiplier.

