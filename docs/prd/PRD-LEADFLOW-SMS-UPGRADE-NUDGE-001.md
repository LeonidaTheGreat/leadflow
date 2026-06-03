# PRD-LEADFLOW-SMS-UPGRADE-NUDGE-001
## SMS Upgrade Nudge — Twilio SMS to Trial/Pilot Agents (Bypasses Broken Email)

**Status:** Draft  
**Version:** 1.0  
**Date:** 2026-05-02  
**Author:** PM Agent  
**Use Case:** feat-sms-upgrade-nudge-bypass-email

---

## Problem

All upgrade conversion paths depend on Resend email delivery (upgrade offer tool, lapsed reactivation campaign, active trial email sequence). Email delivery is blocked — domain unverified, fix PR #1343 not merged. This leaves no way to reach trial/pilot agents about upgrading.

There are **8 eligible agents** with `phone_number IS NOT NULL` and `subscription_status = 'inactive'` in the database right now. Twilio SMS is already integrated and working (`product/lead-response/dashboard/lib/twilio.ts`). SMS bypasses the email block entirely.

---

## Goal

Ship a one-shot admin SMS capability that lets the operator trigger upgrade nudges to eligible agents via Twilio today — without waiting for email to be fixed.

---

## Non-Goals (Do Not Touch)

- Existing SMS lead-response flows (UC-1, UC-2, UC-7)
- Twilio credentials or A2P registration
- Existing email upgrade offer tool (`routes/admin/activation-outreach.js`)
- Existing email reactivation campaign (`routes/admin/reactivation-campaign.js`)
- Any code path that sends Twilio SMS to leads (only to agents)

---

## Schema Change Required

**The `email_events` table cannot accept this data as-is.** Two blockers:

1. It has `customer_id UUID NOT NULL` (references `customers` table, not `real_estate_agents`)
2. `email_type` has a CHECK constraint — `'sms_upgrade_nudge'` is not a valid value

**Migration required** (`~/projects/genome/migrations/` — next available number):

```sql
-- Extend email_events to support agent-targeted outreach channels
ALTER TABLE email_events
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES real_estate_agents(id),
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email',
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE email_events
  DROP CONSTRAINT email_events_email_type_check;

ALTER TABLE email_events
  ADD CONSTRAINT email_events_email_type_check CHECK (
    email_type = ANY (ARRAY[
      'welcome', 'renewal_success', 'payment_failed', 'subscription_cancelled',
      'subscription_upgraded', 'subscription_downgraded', 'trial_ending', 'trial_ended',
      'upgrade_offer', 'pilot_signup_outreach',
      'sms_upgrade_nudge'
    ])
  );

CREATE INDEX IF NOT EXISTS idx_email_events_agent_id ON email_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_email_events_channel ON email_events(channel);
```

---

## Solution

### 1. API Endpoint — `POST /api/admin/send-sms-upgrade`

**File:** `product/lead-response/dashboard/app/api/admin/send-sms-upgrade/route.ts`  
**Pattern:** Next.js App Router route (same as `/app/api/admin/outreach/blast/route.ts`)

#### Auth
Header: `x-admin-token`  
Env var: `ADMIN_SECRET`  
Pattern: `timingSafeEqual` check (or use existing `checkAdminAuth` helper from blast route)

#### Request Body

```typescript
{
  agentIds?: string[]   // UUIDs — if omitted, targets all eligible
  tier?: 'starter' | 'pro' | 'team'   // default: 'pro'
  dryRun?: boolean      // default: false
}
```

#### Eligibility Query

```sql
SELECT id, first_name, phone_number, status, subscription_status, trial_ends_at
FROM real_estate_agents
WHERE phone_number IS NOT NULL
  AND subscription_status != 'active'
  AND status IN ('trial', 'pilot', 'onboarding')
-- AND id = ANY($1)  -- when agentIds provided
```

#### Dry Run Response

When `dryRun: true`, return immediately without calling Twilio:

```json
{ "eligible": 8, "dryRun": true }
```

#### Live Run Behavior

For each eligible agent:

1. Build checkout URL: `/settings/billing?tier=<tier>`  
   Full URL: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?tier=<tier>`

2. Send SMS via `sendSms()` from `lib/twilio.ts`:
   ```
   Hi [first_name], your LeadFlow [status] includes full AI lead responses. Upgrade to Pro now: [url] — Reply STOP to unsubscribe
   ```
   - Replace `[first_name]` with `real_estate_agents.first_name`
   - Replace `[status]` with `real_estate_agents.status` (e.g. "trial", "pilot")
   - Replace `[url]` with checkout URL
   - Replace `[Pro]` with tier param (capitalize first letter)

3. Log to `email_events`:
   ```sql
   INSERT INTO email_events (agent_id, email_type, channel, recipient, status, sent_at, metadata)
   VALUES ($agent_id, 'sms_upgrade_nudge', 'sms', $phone_number, 'sent', NOW(),
           '{"tier": "pro", "message_sid": "SM..."}')
   ```
   On Twilio error: insert with `status = 'failed'`, `error_message = error.message`

4. Return:
   ```json
   { "sent": 7, "skipped": 1, "dryRun": false }
   ```
   Skipped = agents where Twilio returned an error (logged as failed, not thrown).

#### Error Handling

- Invalid `agentIds` (not UUID format) → 400
- `agentIds` provided but none found in DB → 400 `{ error: "No eligible agents found for provided IDs" }`
- Twilio failure for individual agent → log as `failed`, continue to next agent (don't abort batch)
- Missing `ADMIN_SECRET` env var → 500

---

### 2. Admin UI — `/admin/upgrade-offers` Page

**File:** `product/lead-response/dashboard/app/admin/upgrade-offers/page.tsx`  
**Auth:** Uses existing session auth (same as other `/admin/*` pages)

#### Page Layout

Single page with two sections: **Eligible Agents** table + **Send SMS Nudge** action panel.

**Eligible Agents Table**

Fetches: `GET /api/admin/send-sms-upgrade?dryRun=true` on load (or a dedicated list endpoint).

Actually: fetch eligible agents via a separate `GET /api/admin/sms-eligible-agents` endpoint OR inline a server component query.

Recommended: Server component — query DB directly via Prisma/pool pattern used elsewhere in the admin pages.

Columns:

| Name | Last Login | Status | Trial Ends | Phone | SMS Sent |
|------|-----------|--------|------------|-------|---------|

- **Name**: `first_name + last_name`
- **Last Login**: `last_login_at` formatted as relative time ("3 days ago")
- **Status**: badge (trial / pilot / onboarding)
- **Trial Ends**: `trial_ends_at` formatted as date, red if past
- **Phone**: masked — show only last 4 digits (`•••-•••-1234`)
- **SMS Sent**: "Sent [date]" if `email_events` row exists with `agent_id = id AND email_type = 'sms_upgrade_nudge'`; otherwise "—"

**Action Panel**

- Tier selector: radio buttons (Starter / Pro / Team), default Pro
- "Preview (Dry Run)" button → calls API with `dryRun: true`, shows eligible count
- "Send SMS to All Eligible" button → confirmation dialog: "Send upgrade SMS to [N] agents?" → calls API without dryRun
- Per-row "Send" button → calls API with `agentIds: [id]`
- All buttons show loading state; display result as toast (success/error)

**Navigation**: Add link in admin sidebar or `/admin/page.tsx` Execution Areas section under "Outreach."

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC1 | `POST /api/admin/send-sms-upgrade` with `dryRun: true` returns `{ eligible: N, dryRun: true }` with N > 0 | `curl -X POST .../api/admin/send-sms-upgrade -H "x-admin-token: $ADMIN_SECRET" -d '{"dryRun":true}'` |
| AC2 | `dryRun: true` makes zero Twilio API calls | Verify no entries in Twilio console; check mock flag in response if using mock mode |
| AC3 | Live send creates `email_events` rows with `email_type='sms_upgrade_nudge'`, `channel='sms'`, `agent_id` set | `psql openclaw -c "SELECT agent_id, channel, status FROM email_events WHERE email_type='sms_upgrade_nudge'"` |
| AC4 | Admin UI lists all eligible agents (phone IS NOT NULL, not active) with masked phone and SMS-sent status | Load `/admin/upgrade-offers` in browser; verify table rows match DB count |
| AC5 | "Sent [date]" shows for agents already messaged; prevents double-send confusion | Send to one agent; reload page; row shows sent timestamp |
| AC6 | E2E test: `dryRun=true` returns non-zero count; live call logs to `email_events` | `npm test -- --testPathPattern=sms-upgrade-nudge` exits 0 |
| AC7 | Migration applied: `email_events` accepts `agent_id` and `email_type='sms_upgrade_nudge'` | `psql openclaw -c "\d email_events"` shows agent_id column |

---

## Files to Create / Modify

| File | Action | What |
|------|--------|------|
| `~/projects/genome/migrations/0XX_email_events_agent_channel.sql` | **Create** | Schema migration (see above) |
| `product/lead-response/dashboard/app/api/admin/send-sms-upgrade/route.ts` | **Create** | POST endpoint |
| `product/lead-response/dashboard/app/admin/upgrade-offers/page.tsx` | **Create** | Admin UI page |
| `product/lead-response/dashboard/app/admin/page.tsx` | **Modify** | Add "Upgrade Offers" link in Outreach section |
| `tests/e2e/sms-upgrade-nudge.test.js` | **Create** | E2E test (AC6) |

**Do NOT modify:**
- `lib/twilio.ts` — use as-is
- `routes/admin/activation-outreach.js`
- `routes/admin/reactivation-campaign.js`
- Any SMS lead-response routes

---

## Test Spec

```javascript
// tests/e2e/sms-upgrade-nudge.test.js
describe('POST /api/admin/send-sms-upgrade', () => {
  it('dryRun=true returns eligible count without calling Twilio', async () => {
    const res = await request(app)
      .post('/api/admin/send-sms-upgrade')
      .set('x-admin-token', process.env.ADMIN_SECRET)
      .send({ dryRun: true })
    expect(res.status).toBe(200)
    expect(res.body.dryRun).toBe(true)
    expect(res.body.eligible).toBeGreaterThan(0)
  })

  it('live send logs to email_events', async () => {
    // Use mock Twilio (TWILIO_MOCK_MODE=true in test env)
    const res = await request(app)
      .post('/api/admin/send-sms-upgrade')
      .set('x-admin-token', process.env.ADMIN_SECRET)
      .send({ tier: 'pro' })
    expect(res.status).toBe(200)
    expect(res.body.sent).toBeGreaterThan(0)

    const rows = await db.query(
      "SELECT * FROM email_events WHERE email_type = 'sms_upgrade_nudge' ORDER BY created_at DESC LIMIT 1"
    )
    expect(rows.rows.length).toBe(1)
    expect(rows.rows[0].channel).toBe('sms')
    expect(rows.rows[0].agent_id).toBeTruthy()
  })

  it('rejects missing admin token', async () => {
    const res = await request(app).post('/api/admin/send-sms-upgrade').send({ dryRun: true })
    expect(res.status).toBe(401)
  })
})
```

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| TWILIO_MOCK_MODE not set in test env → real SMS sent during tests | Medium | E2E test must set `TWILIO_MOCK_MODE=true`; test file must assert mock=true in response |
| A2P opt-out state — agents who replied STOP receive SMS anyway | Low | Twilio handles STOP automatically; no additional code needed |
| Double-send — admin clicks Send twice | Low | UI disables button after send; `email_events` query in UI shows "Sent" state |
| Migration breaks email_events for existing email sends | Low | All changes are additive (new nullable column, new type added to constraint) |
| `NEXT_PUBLIC_APP_URL` not set → checkout URL is relative | Low | Validate env var at startup; fall back to `https://leadflow-ai-five.vercel.app` |

---

## Out of Scope

- Automated/scheduled SMS sends (this is an admin-triggered one-shot tool)
- SMS unsubscribe tracking beyond Twilio's native STOP handling
- A2P compliance changes (existing registration covers upgrade nudge content)
- Email delivery fix (separate track)
- Per-agent message customization beyond first_name/status
