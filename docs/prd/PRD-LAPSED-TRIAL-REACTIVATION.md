# PRD: Lapsed Trial Reactivation — Win Back Cold Signups

**PRD ID:** prd-lapsed-trial-reactivation  
**Status:** ready  
**Priority:** P1  
**Use Case:** feat-lapsed-trial-reactivation  
**Owner:** Product Manager (spec) → Dev → QC  
**Last Updated:** 2026-04-29  
**Revenue Impact:** Direct win-back of warm leads → $149–$399 MRR per conversion. Cheapest acquisition channel — brand recognition exists.

---

## Executive Summary

LeadFlow has accumulated a pool of real estate agents who signed up for a trial but went cold — either never completed onboarding, never hit the aha moment (seeing the AI respond to a lead), or let their trial expire without engaging. These agents already trusted us enough to create an account. They are warmer than any cold outreach target.

This PRD specifies a **one-shot reactivation campaign** with an admin-triggered batch email, sent via Resend, targeting agents whose trials expired without reaching the aha moment. The email leads with an urgency hook ("Your leads are going to a competitor who responds in 30 seconds"), includes a direct link back to the dashboard (session-aware, no re-login if session is valid), and tracks opens via UTM parameters. The campaign is admin-initiated (not automated cron) to allow manual review of the eligible cohort before sending.

**CRITICAL DATA DISCREPANCY:** The task context cites 363 registered agents. The production database (`real_estate_agents` table) contains **11 agents total**, with only **2 matching reactivation criteria** (`trial_ends_at < NOW() AND aha_completed = false AND subscription_status != 'active'`). All 11 have `subscription_status = 'inactive'`. The acceptance criterion of "at least 50 eligible agents" is **not currently met**. Either: (a) 352 agents exist in an external system (website signups, waitlist) not yet imported into the database, or (b) the 363 figure is stale. **The dev team must verify and reconcile the agent count before sending any campaign.** The system should be built regardless — the pool will grow.

---

## 1. Problem Statement

### 1.1 Current State

- **11 agents** in `real_estate_agents` table, all `subscription_status = 'inactive'`
- **7 agents** never completed onboarding (`onboarding_completed = false`)
- **10 agents** never hit the aha moment (`aha_completed = false`)
- **Only 4** have verified emails — the rest can't receive email
- **0 paying customers** — every reactivated agent is incremental revenue

### 1.2 What Exists Already

| System | Purpose | Audience |
|--------|---------|----------|
| Active Trial Email Sequence (`trial-emails.ts`) | 6-email drip (Day 0–15) | Agents currently in trial (`subscription_status = 'trial'`) |
| Activation Outreach (`activation-outreach.js`) | Personal email to unactivated signups | Verified but never-onboarded agents |
| Pilot Conversion Emails (`pilot-conversion-service.ts`) | White-glove pilot → paid | Pilot agents |

**Gap:** No mechanism targets agents whose trial expired AND who never reached the aha moment. The existing Day 14/15 emails fire during the trial — this UC targets the post-trial population that those emails failed to convert.

### 1.3 Distinction from Active Trial Sequence

| | Active Trial Sequence | Lapsed Trial Reactivation |
|---|---|---|
| **Audience** | `subscription_status = 'trial'` | `trial_ends_at < NOW() AND aha_completed = false AND subscription_status != 'active'` |
| **Timing** | Automated, days 0–15 from signup | Admin-triggered, any time post-expiry |
| **Goal** | Prevent churn during trial | Win back agents who already churned |
| **Messaging** | Educational, progressive | Urgency + FOMO, competitive pressure |
| **Cadence** | 6-email drip | Single batch email (v1) |

---

## 2. Requirements

### 2.1 Eligibility Query

```sql
SELECT id, email, first_name, created_at, trial_ends_at, onboarding_completed
FROM real_estate_agents
WHERE trial_ends_at < NOW()
  AND aha_completed = false
  AND subscription_status != 'active'
  AND email_verified = true
  AND reactivation_email_sent = false
ORDER BY trial_ends_at DESC;
```

**Filters explained:**
- `trial_ends_at < NOW()` — trial has expired (not currently in trial)
- `aha_completed = false` — never saw the AI respond to a lead
- `subscription_status != 'active'` — not already paying
- `email_verified = true` — valid deliverable email address
- `reactivation_email_sent = false` — haven't already received this campaign

### 2.2 Database Migration

Add one column to `real_estate_agents`:

```sql
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS reactivation_email_sent BOOLEAN NOT NULL DEFAULT false;
```

Also add a `reactivation_email_sent_at` timestamp for funnel analysis:

```sql
ALTER TABLE real_estate_agents
  ADD COLUMN IF NOT EXISTS reactivation_email_sent_at TIMESTAMPTZ;
```

**Migration file:** `~/.openclaw/genome/migrations/NNN_reactivation_email_columns.sql`

### 2.3 Admin Endpoint

**Route:** `POST /api/admin/reactivation-campaign`  
**Auth:** `requireApiKey` middleware (LEADFLOW_API_KEY bearer token)  
**File:** `routes/admin/reactivation-campaign.js`

**Request body:**
```json
{
  "dryRun": true,
  "limit": 50
}
```

**Response (dryRun: true):**
```json
{
  "eligible": 2,
  "agents": [
    {
      "id": "uuid",
      "email": "agent@example.com",
      "first_name": "Jane",
      "created_at": "2026-03-15T...",
      "trial_ends_at": "2026-03-29T...",
      "days_since_expiry": 31,
      "onboarding_completed": false
    }
  ],
  "dryRun": true
}
```

**Response (dryRun: false):**
```json
{
  "sent": 2,
  "failed": 0,
  "errors": [],
  "dryRun": false
}
```

**Behavior:**
1. Query eligible agents using Section 2.1 query
2. If `dryRun: true` → return eligible count and agent list without sending
3. If `dryRun: false` → send reactivation email to each eligible agent (up to `limit`), mark `reactivation_email_sent = true` and `reactivation_email_sent_at = NOW()` on success, log to `trial_email_logs` with `email_type = 'reactivation'`
4. If eligible count is 0 → return `{ eligible: 0, agents: [], dryRun: true/false }`

### 2.4 Service Class

**File:** `lib/services/ReactivationService.js`  
**Pattern:** Follows `ActivationService.js` — constructor injection of `pool`, methods return data, caller handles HTTP.

```
class ReactivationService {
  constructor({ pool })
  
  async getEligibleAgents(limit)
    → returns rows from eligibility query

  async sendReactivationEmail(agent)
    → calls EmailService.send() with reactivation template
    → marks reactivation_email_sent = true
    → logs to trial_email_logs
    → returns { success, agent_id, resend_id } or { success: false, error }

  async runCampaign({ dryRun, limit })
    → orchestrates: getEligible → if dryRun return count → else send batch
    → returns { sent, failed, errors, eligible }
}
```

### 2.5 Email Template

**File:** `lib/templates/reactivation-email.js`  
**Function:** `buildReactivationEmail(agentName, dashboardUrl)`  
**Returns:** `{ subject, html, text }`

| Property | Value |
|----------|-------|
| **Subject** | `Your AI lead responder is waiting` |
| **From** | `stojan@leadflow.ai` (or `FROM_EMAIL` env var) |
| **Tone** | Urgent, competitive pressure, personal |

**Body structure:**

> Hi [first_name],
>
> While your trial was inactive, your competitors' leads were getting AI responses in under 30 seconds. Every lead that sits unanswered for more than 5 minutes has a 90% lower chance of converting.
>
> Your LeadFlow AI is still configured and ready to go. Nothing to set up again — just log in and activate.
>
> **[Reactivate My AI →]** `{dashboardUrl}?utm_source=reactivation&utm_medium=email&utm_campaign=lapsed_trial_v1`
>
> If you had trouble during setup, reply to this email — I'll personally walk you through it.
>
> — Stojan, Founder

**Dashboard URL logic:**
- Link to `/dashboard` with UTM parameters for tracking
- If the agent's session is still valid, they land directly on the dashboard
- If session expired, they hit the login page (standard auth flow — magic links are out of scope for v1)

### 2.6 Email Logging

Log every send attempt to the existing `trial_email_logs` table:

```sql
INSERT INTO trial_email_logs (agent_id, email_type, email_address, delivery_status, created_at)
VALUES ($1, 'reactivation', $2, $3, NOW());
```

`delivery_status`: `'sent'` on Resend success, `'failed'` on error.

### 2.7 Admin Funnel Page

**File:** `product/lead-response/dashboard/app/admin/reactivation/page.tsx`  
**Route:** `/admin/reactivation`

Displays:
- **Eligible count** — agents matching reactivation criteria right now
- **Sent count** — agents with `reactivation_email_sent = true`
- **Opened (UTM proxy)** — count of agents with dashboard logins where `utm_campaign = 'lapsed_trial_v1'` after `reactivation_email_sent_at` (requires `agent_page_views` or `agent_sessions` table to have UTM tracking)
- **Re-activated** — agents who completed onboarding OR hit aha moment after receiving the reactivation email (`aha_completed = true AND reactivation_email_sent = true`)
- **Converted** — agents with `subscription_status = 'active' AND reactivation_email_sent = true`

**Data source:** Server-side API route querying `real_estate_agents` directly. No new tables needed — all metrics derivable from existing columns plus the two new ones.

**UTM tracking note:** If `agent_page_views` or `agent_sessions` does not currently capture UTM parameters from the dashboard URL, the "Opened" metric should show "N/A — UTM tracking not yet implemented" rather than showing 0. The funnel page should still render without this metric. UTM capture is a nice-to-have for v1.

---

## 3. User Stories

### US-1: Admin reviews eligible pool
**As** the admin, **I** want to see which agents are eligible for reactivation before sending any emails, **so that** I can verify the batch size and review the list.

**When** I call `POST /api/admin/reactivation-campaign` with `{ "dryRun": true }`,  
**Then** I receive a JSON response with the eligible count and agent details.

### US-2: Admin triggers reactivation campaign
**As** the admin, **I** want to send the reactivation email to all eligible agents in one action, **so that** I don't have to send them individually.

**When** I call `POST /api/admin/reactivation-campaign` with `{ "dryRun": false, "limit": 100 }`,  
**Then** each eligible agent (up to the limit) receives the reactivation email, and the response tells me how many were sent and how many failed.

### US-3: Agent receives reactivation email
**As** a real estate agent whose trial expired without trying the AI, **I** want to receive a compelling email reminding me why I signed up, **so that** I'm motivated to log back in.

**When** I open the email and click "Reactivate My AI",  
**Then** I land on the LeadFlow dashboard (logged in if session valid, or login page if not).

### US-4: Admin tracks campaign performance
**As** the admin, **I** want to see how many reactivation emails were sent, how many agents re-engaged, and how many converted, **so that** I can measure ROI and iterate on messaging.

**When** I visit `/admin/reactivation`,  
**Then** I see the funnel: Eligible → Sent → Opened → Re-activated → Converted.

---

## 4. Acceptance Criteria

### AC-1: Eligibility query
- Query returns agents where `trial_ends_at < NOW() AND aha_completed = false AND subscription_status != 'active' AND email_verified = true AND reactivation_email_sent = false`
- **Verify:** `psql openclaw -c "SELECT COUNT(*) FROM real_estate_agents WHERE trial_ends_at < NOW() AND aha_completed = false AND subscription_status != 'active' AND email_verified = true"` returns a number ≥ 0

### AC-2: Dry run endpoint
- `POST /api/admin/reactivation-campaign` with `{ "dryRun": true }` returns `{ eligible: N, agents: [...], dryRun: true }` without sending any emails
- **Verify:** Call endpoint, then check `trial_email_logs` has no new `reactivation` entries

### AC-3: Live send
- `POST /api/admin/reactivation-campaign` with `{ "dryRun": false }` sends emails via Resend to eligible agents
- Each sent agent gets `reactivation_email_sent = true` and `reactivation_email_sent_at` set
- Each send attempt logged to `trial_email_logs` with `email_type = 'reactivation'`
- **Verify:** After send, `SELECT COUNT(*) FROM real_estate_agents WHERE reactivation_email_sent = true` equals the sent count. `SELECT COUNT(*) FROM trial_email_logs WHERE email_type = 'reactivation'` equals the sent count.

### AC-4: Idempotency
- Calling the endpoint twice does not re-send to agents who already received the email
- **Verify:** Second call returns `{ eligible: 0 }` or lower count

### AC-5: Email template
- Subject line: "Your AI lead responder is waiting"
- CTA links to dashboard with UTM parameters: `utm_source=reactivation&utm_medium=email&utm_campaign=lapsed_trial_v1`
- Email renders correctly in HTML and has a plain-text fallback
- **Verify:** Inspect returned HTML from `buildReactivationEmail()` for UTM params and CTA link

### AC-6: Admin funnel page
- `/admin/reactivation` page displays: Eligible, Sent, Re-activated, Converted
- Data is live (queries database on load)
- **Verify:** Visit page after running campaign, confirm numbers match database

### AC-7: E2E test
- Test file: `tests/e2e/reactivation-campaign.test.js`
- Tests `POST /api/admin/reactivation-campaign` with `{ "dryRun": true }` returns `{ eligible: N }` shape
- Tests auth: unauthenticated request returns 401
- **Verify:** `npm test -- --testPathPattern=reactivation` exits 0

### AC-8: Migration
- Migration adds `reactivation_email_sent BOOLEAN DEFAULT false` and `reactivation_email_sent_at TIMESTAMPTZ` to `real_estate_agents`
- **Verify:** `psql openclaw -c "\d real_estate_agents" | grep reactivation` shows both columns

---

## 5. Technical Spec

### 5.1 New Files

| File | Type | Purpose |
|------|------|---------|
| `lib/services/ReactivationService.js` | Service | Eligibility query, batch send orchestration |
| `lib/templates/reactivation-email.js` | Template | HTML + text email builder |
| `routes/admin/reactivation-campaign.js` | Route | Admin endpoint (POST) |
| `product/lead-response/dashboard/app/admin/reactivation/page.tsx` | Page | Admin funnel dashboard |
| `tests/e2e/reactivation-campaign.test.js` | Test | E2E coverage |
| `~/.openclaw/genome/migrations/NNN_reactivation_email_columns.sql` | Migration | Schema change |

### 5.2 Modified Files

| File | Change |
|------|--------|
| `server.js` or route index | Mount `routes/admin/reactivation-campaign.js` |

### 5.3 Dependencies

- `EmailService` (existing) — for Resend API calls
- `requireApiKey` middleware (existing) — for admin auth
- `getPool` from `lib/db` (existing) — for database access
- `trial_email_logs` table (existing) — for send logging

### 5.4 No New Dependencies

No new npm packages required. Resend integration, admin auth, and database access all exist.

---

## 6. Out of Scope (v1)

- **Magic links / passwordless re-login:** The CTA links to the standard dashboard URL. If the agent's session expired, they use the normal login flow. Magic links are a separate UC.
- **Multi-email drip sequence:** v1 is a single batch email. A follow-up sequence (e.g., reminder 7 days later if no action) is a future enhancement.
- **Automated cron trigger:** v1 is admin-initiated only. Automation (e.g., auto-send 30 days post-expiry) is a future enhancement.
- **A/B testing subject lines:** v1 ships one subject line. Testing variants is a future optimization.
- **Agent import/reconciliation:** If 363 agents exist in an external system, importing them into `real_estate_agents` is a prerequisite but separate UC.

---

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Eligible pool too small (<50) | Campaign ROI unclear | Dry run endpoint lets admin verify count before sending. Build the system anyway — pool will grow. |
| Resend domain not verified for `leadflow.ai` | Emails go to spam | Check Resend domain config before campaign. Fall back to `onboarding@resend.dev` if needed. |
| Agents mark email as spam | Domain reputation damage | Small batch first (limit: 10), monitor delivery stats, iterate. |
| Agent data discrepancy (11 vs 363) | False expectations | Dev must verify actual eligible count via dry run. PRD flags the discrepancy. |

---

## 8. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Reactivation email delivery rate | >95% | `trial_email_logs` WHERE `email_type = 'reactivation'` AND `delivery_status = 'sent'` / total |
| Dashboard re-visit rate | >15% of sent | Agents with `reactivation_email_sent = true` who logged in within 7 days of `reactivation_email_sent_at` |
| Aha moment completion | >5% of sent | `aha_completed = true AND reactivation_email_sent = true` |
| Conversion to paid | >2% of sent | `subscription_status = 'active' AND reactivation_email_sent = true` |

---

## 9. Implementation Notes for Dev

1. **Follow the `ActivationService` pattern** — `routes/admin/activation-outreach.js` + `lib/services/ActivationService.js` is the exact blueprint. Same auth, same service injection, same error handling.
2. **Email template follows `trial-cta-email.js` pattern** — export a `buildReactivationEmail(agentName, dashboardUrl)` function returning `{ subject, html, text }`.
3. **Use `EmailService.send()`** for Resend delivery — don't call Resend API directly.
4. **Batch sends sequentially** with small delays (100ms between sends) to avoid Resend rate limits. Log each result individually.
5. **Admin funnel page** is a server component querying the database via the existing database utilities in the dashboard app. No new API routes needed for the dashboard — use server-side data fetching.
6. **Migration numbering:** Check `~/.openclaw/genome/migrations/` for the latest migration number and increment.
