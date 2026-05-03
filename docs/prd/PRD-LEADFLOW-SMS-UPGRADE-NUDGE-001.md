# PRD-LEADFLOW-SMS-UPGRADE-NUDGE-001

**Title:** SMS Upgrade Nudge — Twilio SMS to Trial/Pilot Agents (Bypasses Broken Email)
**Status:** Draft
**Author:** PM Agent
**Date:** 2026-05-02
**Use Case:** feat-sms-upgrade-nudge-bypass-email
**Priority:** P0 — directly unblocks conversion path to first paying customer

---

## Problem

All upgrade conversion paths (upgrade offer tool, lapsed trial reactivation, trial email sequence) depend on Resend email. Email delivery is blocked: domain is unverified and PR #1343 is not merged. There are 8 trial/pilot/onboarding agents with phone numbers in `real_estate_agents`. There is zero non-email path to reach these users today. Twilio SMS is already integrated, working, and A2P-registered.

**Impact:** Without a working outreach channel, the Day 90 conversion target ($20K MRR extended to Day 180) has no mechanism to nudge trial users toward paid plans. This is the single biggest blocker in the funnel: the product works but no one is being asked to pay via a channel that actually delivers.

**Data snapshot (2026-05-02):**
- Agents with phone numbers: 8
- Of those, eligible (not active subscriber, status in trial/pilot/onboarding): 8
- Agents with real phone numbers (not test 555-0000): 1 (Stojan, trial, phone `2264485331`)
- Current email delivery rate: 0% (blocked)

---

## Solution

Two deliverables:

1. **Admin API endpoint** `POST /api/admin/send-sms-upgrade` — sends a Twilio SMS upgrade nudge to eligible agents, with dry-run support.
2. **Admin UI tab** on a new `/admin/sms-nudge` page — lists eligible agents, supports per-agent and bulk SMS send.

---

## Deliverable 1: Admin API Endpoint

### Endpoint

```
POST /api/admin/send-sms-upgrade
```

### Authentication

Reuse the existing `ApiKeyAuthService` pattern from `routes/admin/reactivation-campaign.js`:
- Check `LEADFLOW_API_KEY` via headers: `leadflow_api_key`, `leadflow-api-key`, or `x-api-key`
- Timing-safe comparison via `ApiKeyAuthService.isAuthorized()`

### Request Body

```json
{
  "agentIds": ["uuid", "uuid"],   // optional — if omitted, targets all eligible
  "tier": "pro",                   // optional — default "pro" (starter|pro|team)
  "dryRun": true                   // required — boolean
}
```

### Eligible Agent Query

When `agentIds` is omitted, target all agents matching:

```sql
SELECT id, first_name, phone_number, status, plan_tier, trial_ends_at, last_login_at
FROM real_estate_agents
WHERE phone_number IS NOT NULL
  AND phone_number != '555-0000'
  AND COALESCE(subscription_status, 'inactive') != 'active'
  AND status IN ('trial', 'pilot', 'onboarding')
```

When `agentIds` is provided, apply the same filters but add `AND id = ANY($1::uuid[])`.

**Important:** Filter out test phone numbers (`555-0000`) to avoid wasting Twilio credits.

### SMS Message

```
Hi {first_name}, your LeadFlow {status} includes full AI lead responses. Upgrade to Pro now: {url} — Reply STOP to unsubscribe
```

- `{first_name}`: from `real_estate_agents.first_name` (fallback: "there")
- `{status}`: from `real_estate_agents.status` (e.g. "trial", "pilot")
- `{url}`: `https://leadflow-ai-five.vercel.app/settings/billing?tier={tier}&utm_source=sms_upgrade_nudge&utm_medium=sms&utm_campaign=upgrade_nudge`
- Must include "Reply STOP to unsubscribe" for TCPA compliance.
- Total length must stay within 160 characters. If over, shorten URL via a redirect route or trim the message body.

### SMS Sending

Use existing `TwilioService.sendSms(phoneNumber, message, options)`:
- `phoneNumber`: must be E.164 format. The `phone_number` column stores raw values (e.g. `2264485331`). The service must normalize to E.164 (prepend `+1` for US/CA numbers) before calling `sendSms`.
- `options`: `{ trigger: 'sms_upgrade_nudge' }`
- No `agentId` in options — this is a platform-initiated outreach, not a lead-response SMS. Using platform credentials is correct.

### Event Logging

Log each send attempt to `email_events`:

| Column       | Value                                                              |
|--------------|--------------------------------------------------------------------|
| customer_id  | agent's `id` from `real_estate_agents`                             |
| email_type   | `'sms_upgrade_nudge'`                                              |
| recipient    | agent's phone_number (masked in response, full in DB)              |
| subject      | `NULL` (SMS has no subject)                                        |
| status       | `'sent'` or `'failed'`                                             |
| sent_at      | `NOW()` on success                                                 |
| error_message| Twilio error message on failure, `NULL` on success                 |
| metadata     | `{ "channel": "sms", "tier": "pro", "twilio_sid": "SM...", "trigger": "sms_upgrade_nudge" }` |

**Migration required:** The `email_events_email_type_check` CHECK constraint currently allows: `welcome`, `renewal_success`, `payment_failed`, `subscription_cancelled`, `subscription_upgraded`, `subscription_downgraded`, `trial_ending`, `trial_ended`, `upgrade_offer`, `pilot_signup_outreach`. Must add `'sms_upgrade_nudge'` to the allowed list.

### Deduplication

Before sending to an agent, check `email_events` for a recent `sms_upgrade_nudge` to the same `customer_id` within the last 7 days. Skip if found (prevents spamming on repeated admin clicks).

### Dry Run Response

```json
{
  "eligible": 8,
  "agents": [
    {
      "id": "uuid",
      "first_name": "Stojan",
      "status": "trial",
      "phone_masked": "***-5331",
      "last_login_at": "2026-04-10T...",
      "already_sent_recently": false
    }
  ],
  "dryRun": true
}
```

### Live Run Response

```json
{
  "sent": 1,
  "skipped": 7,
  "failed": 0,
  "dryRun": false,
  "results": [
    { "id": "uuid", "status": "sent", "twilio_sid": "SM..." },
    { "id": "uuid", "status": "skipped", "reason": "test_number" }
  ]
}
```

### Error Responses

| Status | Condition                    | Body                                           |
|--------|------------------------------|-------------------------------------------------|
| 401    | Missing/invalid API key      | `{ "error": "Unauthorized" }`                   |
| 400    | Invalid body                 | `{ "error": "dryRun must be a boolean" }`       |
| 400    | Invalid tier                 | `{ "error": "tier must be starter, pro, or team" }` |
| 400    | Invalid agentIds             | `{ "error": "agentIds must be an array of UUIDs" }` |
| 500    | Twilio or DB failure         | `{ "error": "Internal server error" }`          |

---

## Deliverable 2: Admin UI — SMS Nudge Page

### Location

New page: `product/lead-response/dashboard/app/admin/sms-nudge/page.tsx`

### Auth

Same pattern as existing admin pages (e.g. `admin/outreach/page.tsx`): read `admin_token` from `localStorage`, pass as `x-admin-token` header. **Note:** The API endpoint uses `LEADFLOW_API_KEY` via `x-api-key` header. The UI must use `x-api-key` (not `x-admin-token`) when calling the Express API, OR the endpoint must also accept the admin token. Recommendation: accept both auth methods in the endpoint (ApiKeyAuthService for API callers, ADMIN_SECRET for dashboard callers).

### UI Components

**Header:** "SMS Upgrade Nudge" with subtitle "Send Twilio SMS to trial/pilot agents who haven't upgraded."

**Eligible Agents Table:**

| Column            | Source                          |
|-------------------|---------------------------------|
| Name              | `first_name` + `last_name`      |
| Status            | `status` (trial/pilot/onboarding) |
| Last Login        | `last_login_at` (relative time) |
| Trial Ends        | `trial_ends_at` (relative time) |
| Phone             | `phone_number` (masked: `***-XXXX`) |
| SMS Status        | "Not sent" / "Sent [date]" / "Failed [date]" |
| Action            | "Send SMS" button (disabled if sent recently) |

**SMS Status** is derived from the most recent `email_events` row where `email_type = 'sms_upgrade_nudge'` AND `customer_id = agent.id`.

**Bulk Action:** "Send SMS to All Eligible" button at top. Triggers confirmation dialog:
> "Send upgrade SMS to {N} eligible agents? This will use Twilio credits."
> [Cancel] [Send]

**Tier Selector:** Dropdown to pick target tier (starter/pro/team). Default: `pro`.

**Results Panel:** After send, show summary: "Sent: N, Skipped: N, Failed: N" with expandable per-agent details.

### Styling

Tailwind CSS. Follow existing admin page patterns (cards, tables, buttons). No inline styles.

---

## Database Migration

**Migration file:** `~/.openclaw/genome/migrations/XXX_add_sms_upgrade_nudge_email_type.sql`

```sql
-- Add sms_upgrade_nudge to email_events email_type CHECK constraint
ALTER TABLE email_events DROP CONSTRAINT email_events_email_type_check;
ALTER TABLE email_events ADD CONSTRAINT email_events_email_type_check
  CHECK (email_type = ANY (ARRAY[
    'welcome', 'renewal_success', 'payment_failed',
    'subscription_cancelled', 'subscription_upgraded', 'subscription_downgraded',
    'trial_ending', 'trial_ended', 'upgrade_offer', 'pilot_signup_outreach',
    'sms_upgrade_nudge'
  ]));
```

No new tables required. `email_events` with `metadata.channel = 'sms'` is sufficient.

---

## Files to Create / Modify

| Action  | File                                                                 | What                                      |
|---------|----------------------------------------------------------------------|-------------------------------------------|
| Create  | `lib/services/SmsUpgradeNudgeService.js`                             | Service class: eligible query, send logic, dedup, logging |
| Create  | `routes/admin/sms-upgrade-nudge.js`                                  | Express route: auth, validation, delegates to service |
| Modify  | `server.js`                                                          | Mount new route                           |
| Create  | `product/lead-response/dashboard/app/admin/sms-nudge/page.tsx`       | Admin UI page                             |
| Create  | `tests/unit/sms-upgrade-nudge-service.test.js`                       | Unit tests for service                    |
| Create  | `tests/e2e/sms-upgrade-nudge.test.js`                                | E2E test for endpoint                     |
| Create  | Migration file                                                       | ALTER email_events CHECK constraint        |

### Files NOT to touch

- `lib/services/TwilioService.js` — use as-is
- `lib/services/LapsedTrialReactivationService.js` — separate concern
- `routes/admin/reactivation-campaign.js` — separate endpoint
- Any lead-response SMS flows (UC-1, UC-2, UC-7)
- Twilio credentials or A2P registration
- `agents.json` or agent config files

---

## Service Design: `SmsUpgradeNudgeService`

```
class SmsUpgradeNudgeService {
  constructor({ pool, twilioService, appUrl })

  async getEligibleAgents({ agentIds, tier })
    → { agents: Agent[], eligible: number }

  async runCampaign({ agentIds, tier, dryRun })
    → { eligible, sent, skipped, failed, dryRun, agents?, results? }

  _normalizePhone(raw) → E.164 string or null
  _buildMessage(agent, tier, url) → string (≤160 chars)
  _wasRecentlySent(agentId) → boolean (checks email_events, 7-day window)
  _logEvent(agentId, phone, status, metadata) → void (inserts into email_events)
}
```

Constructor injection: `pool` (pg), `twilioService` (TwilioService instance), `appUrl` (string). No singletons.

---

## Acceptance Criteria

1. **Dry run returns eligible count:** `POST /api/admin/send-sms-upgrade` with `{ "dryRun": true }` returns `{ "eligible": N, "dryRun": true, "agents": [...] }` with N > 0 (given current data).

2. **Live run sends SMS:** `POST /api/admin/send-sms-upgrade` with `{ "dryRun": false }` sends real Twilio SMS to at least one agent with a real phone number. Verify in Twilio console logs.

3. **Event logged:** After live run, `SELECT * FROM email_events WHERE email_type = 'sms_upgrade_nudge'` returns at least one row with `status = 'sent'` and `metadata->>'channel' = 'sms'`.

4. **Dedup works:** Sending twice within 7 days to the same agent: second call returns that agent as `skipped` with `reason: 'recently_sent'`.

5. **Admin UI shows eligible agents:** `/admin/sms-nudge` renders a table of eligible agents with masked phone numbers and SMS-sent status.

6. **Admin UI per-agent send:** Clicking "Send SMS" on an individual agent row triggers send and updates status to "Sent [date]".

7. **Admin UI bulk send:** "Send SMS to All Eligible" with confirmation dialog sends to all, shows results summary.

8. **Auth enforced:** Requests without valid API key return 401.

9. **Test numbers filtered:** Agents with phone `555-0000` are excluded from both dry run and live run.

10. **TCPA compliance:** Every SMS body includes "Reply STOP to unsubscribe".

---

## E2E Test Plan

**File:** `tests/e2e/sms-upgrade-nudge.test.js`

| # | Test                                              | Method                                         |
|---|---------------------------------------------------|------------------------------------------------|
| 1 | Auth required                                     | POST without API key → 401                     |
| 2 | Dry run returns eligible                          | POST `dryRun: true` → eligible > 0, no email_events created |
| 3 | Invalid tier rejected                             | POST `tier: 'invalid'` → 400                   |
| 4 | Invalid agentIds rejected                         | POST `agentIds: ['not-a-uuid']` → 400          |
| 5 | Live run logs to email_events                     | POST `dryRun: false` with test agent → query email_events for row |
| 6 | Dedup prevents double-send                        | POST twice → second returns skipped            |
| 7 | Test numbers filtered                             | Agent with 555-0000 not in eligible list        |

---

## Risks & Mitigations

| Risk                                     | Mitigation                                              |
|------------------------------------------|---------------------------------------------------------|
| Phone numbers not in E.164 format        | `_normalizePhone()` prepends `+1`, validates length     |
| Only 1 real phone in DB right now         | Feature works for N agents; current data is a floor     |
| Twilio A2P filtering                     | Platform A2P is registered; monitor for 30034 errors    |
| SMS cost ($0.0079/segment)               | 8 agents = $0.06 max; negligible                        |
| TCPA opt-out                             | "Reply STOP" in every message; Twilio handles STOP natively |
| email_events CHECK constraint            | Migration adds new type before feature code deploys      |

---

## Out of Scope

- Automated recurring SMS campaigns (build manual-trigger first, automate later)
- SMS conversation threading / replies (Twilio handles STOP; other replies not processed)
- New SMS templates or A/B testing
- Modifying existing lead-response SMS flows
- Fixing Resend email delivery (separate workstream, PR #1343)
- Adding `channel` column to `email_events` (use `metadata.channel` instead — avoids schema churn)

---

## Dependencies

- `TwilioService` — existing, working
- `ApiKeyAuthService` — existing, working
- `email_events` table — exists, needs CHECK constraint migration
- Twilio platform credentials — configured in env
- A2P 10DLC registration — already done

---

## Success Metrics

| Metric                        | Target                    |
|-------------------------------|---------------------------|
| SMS delivery rate             | > 90%                     |
| Checkout URL click-through    | > 10% (from UTM tracking) |
| Time from SMS to upgrade      | < 48 hours                |
| First paid conversion via SMS | 1 (proves the channel)    |
