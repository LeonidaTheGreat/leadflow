# PRD: Guided FUB Connection Wizard — Self-Serve Integration in <5 Minutes

**ID:** prd-fub-connection-wizard
**Status:** draft
**Use Case:** feat-onboarding-fub-wizard
**Priority:** P2 (activation blocker for pilot)
**Last Updated:** 2026-04-04

---

## Problem

New real estate agents who sign up for LeadFlow cannot connect their Follow Up Boss (FUB) account without support help. The integration requires manual configuration with no in-product guidance. This causes:

- **Time-to-value:** hours or never (many agents abandon before connecting)
- **High support burden:** every FUB connection requires Stojan to intervene during pilot phase
- **Low activation rate:** blocked path to $20K MRR — agents who don't connect FUB never see value

This is the **#1 activation blocker** identified in the pilot recruitment phase.

---

## Goal

New agents can complete FUB integration **self-serve in <5 minutes** with zero support. Activation rate (FUB connected / signed up) target: >80% within 7 days.

---

## Users

Real estate agents who just signed up for LeadFlow. Primary ICP: solo agents doing 12–24 transactions/year, moderate tech comfort (uses FUB/CRM), not technical (no APIs, webhooks knowledge). Decision-maker. Budget-conscious — paying $49–$149/mo.

---

## User Stories

1. As a new agent, I see a wizard immediately after signup so I know exactly how to connect FUB.
2. As a new agent, I get clear instructions on where to find my FUB API key so I don't have to guess.
3. As a new agent, I get an auto-generated webhook URL I can copy with one click so I don't have to type anything.
4. As a new agent, I can send a test lead to verify my connection is working before I go live.
5. As a new agent, I see a success confirmation and am directed to the dashboard so I know I'm done.
6. As a returning agent who already completed the wizard, I do NOT see the wizard again.

---

## Wizard Flow

### Step 1: Enter FUB API Key

- Input field for FUB API key
- Helper text: "Find your API key in Follow Up Boss → Admin → API"
- Direct link opens FUB admin page: `https://app.followupboss.com/2/api`
- Validation: API key format check (non-empty, 20+ chars)
- Backend: test key via FUB `GET /me` endpoint before proceeding
- Error states:
  - Invalid key: red border + "Invalid API key. Check Follow Up Boss → Admin → API."
  - Network error: yellow warning + retry button

### Step 2: Configure Webhook

- Display auto-generated webhook URL: `https://api.imagineapi.org/webhooks/fub/{agent_id}`
- One-click copy button with "Copied!" confirmation feedback (2-second flash)
- Instructions: "In FUB → Admin → Webhooks → Add Webhook, paste this URL and select 'New Lead' event"
- Descriptive alt-text for where to find Webhooks in FUB admin
- Confirmation checkbox: "I've added the webhook" — must be checked to proceed

### Step 3: Send Test Lead

- Instruction: "In FUB, create a test lead (or ask your admin). LeadFlow will receive it within 30 seconds."
- Live status indicator: polls every 5 seconds for an incoming webhook from this agent
- Timeout: 3 minutes — shows helpful message "No lead received yet. Make sure you added the webhook URL in step 2."
- On success: animate checkmark, display received lead name

### Step 4: Success

- Large green checkmark + "You're connected!"
- Summary: "FUB is connected. When a new lead arrives, LeadFlow will respond via SMS within 30 seconds."
- CTA: "Go to Dashboard" button (primary)
- Optional: display first lead name received during test

---

## Acceptance Criteria (Machine-Verifiable)

| ID | Criterion |
|----|-----------|
| `validate-key-valid` | `POST /api/onboarding/fub/validate-key` with valid FUB API key returns 200 + `{valid: true}` |
| `validate-key-invalid` | `POST /api/onboarding/fub/validate-key` with invalid key returns 400 + `{valid: false, error: "..."}` |
| `webhook-url-endpoint` | `GET /api/onboarding/fub/webhook-url` returns 200 + `{url: "https://api.imagineapi.org/webhooks/fub/{agent_id}"}` |
| `test-status-polling` | `GET /api/onboarding/fub/test-status` returns `{received: false}` initially, `{received: true, leadName: "..."}` after test lead arrives |
| `wizard-complete` | `POST /api/onboarding/fub/complete` sets `agents.fub_onboarding_completed = true` for the authenticated agent |
| `wizard-hidden-after-complete` | Agents with `fub_onboarding_completed = true` do NOT see the wizard on next login |

---

## API Endpoints Required

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/onboarding/fub/validate-key` | Body: `{apiKey}`. Validates via FUB `GET /me`. Returns `{valid, error?}`. |
| `GET` | `/api/onboarding/fub/webhook-url` | Returns agent-specific webhook URL. Requires auth. |
| `GET` | `/api/onboarding/fub/test-status` | Polls for received test webhook. Returns `{received, leadName?}`. |
| `POST` | `/api/onboarding/fub/complete` | Marks `agents.fub_onboarding_completed = true`. |

All endpoints require agent authentication (session cookie or API key header).

---

## Database Changes

| Table | Column | Type | Default | Purpose |
|-------|--------|------|---------|---------|
| `agents` | `fub_onboarding_completed` | boolean | false | Tracks whether wizard is complete |
| `agents` | `fub_onboarding_step` | int | 0 | Tracks resume point (0–4) |

Note: `agents.fub_api_key` column already exists and is used to store the validated key.

Migration required: `ALTER TABLE agents ADD COLUMN IF NOT EXISTS fub_onboarding_completed boolean DEFAULT false; ALTER TABLE agents ADD COLUMN IF NOT EXISTS fub_onboarding_step int DEFAULT 0;`

---

## E2E Tests

| Test | Description | Priority |
|------|-------------|----------|
| Happy path | Enter valid API key → get webhook URL → receive test lead → success screen | P1 |
| Invalid API key | Error shown, cannot proceed to step 2 | P1 |
| Webhook timeout | 3-minute timeout shows helpful message | P2 |
| Re-login after completion | Wizard does NOT appear again | P1 |
| Mid-wizard refresh | Wizard resumes at correct step | P2 |

---

## Non-Goals

- Does not configure AI response templates (separate UC)
- Does not handle FUB OAuth (API key is sufficient for pilot)
- Does not support other CRMs (FUB only for now)
- Does not replace the existing FUB webhook handler — wizard reuses existing infrastructure

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Activation rate (FUB connected / signed up) | >80% within 7 days of signup |
| Time to complete wizard | <5 minutes (p90) |
| Support tickets about FUB connection | 0 per week |
| Wizard abandonment rate | <20% |

---

## Dependencies

- Existing FUB webhook handler at `/webhooks/fub/:agentId` (already built)
- `agents` table migration for new columns
- Auth middleware for onboarding routes
- Next.js dashboard at `product/lead-response/dashboard/` for wizard UI

---

## Implementation Notes

- Wizard should be shown as a modal or dedicated `/onboarding` page — not embedded in dashboard nav
- Step progress persisted in DB (`fub_onboarding_step`) so agents can resume if they close browser
- Test lead polling: use lightweight GET endpoint, not WebSockets (keep it simple)
- FUB API key stored encrypted at rest using existing key storage pattern
- Rate-limit the validate-key endpoint (max 10 attempts per agent per hour) to prevent API abuse

---

*This PRD is the authoritative specification for UC `feat-onboarding-fub-wizard`. Implementation must satisfy all machine-verifiable acceptance criteria above.*
