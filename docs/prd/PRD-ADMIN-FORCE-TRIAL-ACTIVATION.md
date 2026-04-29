# PRD: Admin Force-Trial-Activation

**UC:** `feat-admin-force-trial-activation`
**Priority:** P0 (revenue-critical — unblocks stuck agents and enables white-glove onboarding)
**Status:** Draft
**Author:** PM Agent
**Date:** 2026-04-29

---

## Problem

Three scenarios require manual trial activation:

1. **Stuck agents from legacy signup flow.** The `/api/agents/create` endpoint (Stripe checkout path) creates agents with `email_verified = false`. If email delivery fails (Resend 408/410 errors), these agents are permanently blocked — the login route (`app/api/auth/login/route.ts:37`) rejects them with `EMAIL_NOT_VERIFIED` (403). There is no admin-side mechanism to unblock them.

2. **White-glove pilot recruitment.** When Stojan recruits an agent via phone or LinkedIn, he needs to activate their trial immediately. The current flows require the agent to complete self-serve signup first.

3. **No visibility into stuck state.** No admin view exists to show agents who are stuck (unverified, no trial set up, inactive for days after signup). The existing trial-activation funnel page (`/admin/funnel/trial-activation`) only shows agents who already have active trials — it misses the ones who never got that far.

**Revenue impact:** Every stuck agent is a lost conversion opportunity. Force-activation + personal outreach is the highest-conversion path to first revenue.

## Solution

Two admin API endpoints + admin UI integration:

1. **POST `/api/admin/force-activate-trial`** — force-activates a trial for a specific agent
2. **GET `/api/admin/stuck-agents`** — lists agents stuck in pre-trial states
3. **UI: "Activate Trial" button** on the existing `/admin/funnel/trial-activation` page (replacing the disabled "Flag" button)

## Code Verification Notes

Before implementation, the dev agent should verify these findings (confirmed 2026-04-29):

- **Table name:** `real_estate_agents` (not `agents`)
- **Login gate:** `app/api/auth/login/route.ts:37` — checks `email_verified`, returns 403 if false
- **Trial signup** (`app/api/auth/trial-signup/route.ts:86`) sets `email_verified: true` at creation — no gate
- **Pilot signup** (`app/api/auth/pilot-signup/route.ts:208`) sets `email_verified: true` at creation — no gate
- **Legacy create** (`app/api/agents/create/route.ts:103`) sets `email_verified: false` — HAS gate
- **subscription_status:** Stripe-managed field. Trial signup does NOT set this (stays default `'inactive'`). Only Stripe webhooks transition to `'trialing'`/`'active'`/`'canceled'`. Force-activation must NOT set this to avoid conflicting with Stripe state.
- **Existing admin trial-activation page:** `app/admin/funnel/trial-activation/page.tsx` — has disabled "Send Email" and "Flag" buttons (lines 108-139). Replace "Flag" with "Activate Trial".
- **Auth patterns:** Express routes use `requireApiKey` middleware (`lib/middleware/require-api-key.js`, checks `x-api-key` header). NextJS admin routes use `isAdminUser()` from `lib/services/AuthService.ts`.

---

## Detailed Requirements

### FR-1: GET /api/admin/stuck-agents

Lists agents stuck at email verification or in a pre-trial limbo.

**Next.js route:** `product/lead-response/dashboard/app/api/admin/stuck-agents/route.ts`
**Auth:** `isAdminUser()` from `lib/services/AuthService.ts` (consistent with other NextJS admin routes)

**Query — agents matching ANY of these stuck conditions:**
```sql
SELECT id, email, first_name, last_name, created_at, email_verified, plan_tier, subscription_status
FROM real_estate_agents
WHERE created_at > NOW() - INTERVAL '90 days'
  AND (
    email_verified = false
    OR (plan_tier IS NULL AND trial_ends_at IS NULL AND subscription_status = 'inactive')
  )
  AND email NOT LIKE '%@example.com'
  AND email NOT LIKE '%@qc.test'
  AND email NOT LIKE '%@leadflow-qc.invalid'
ORDER BY created_at DESC
```

**Response shape:**
```json
{
  "stuck_agents": [
    {
      "id": "uuid",
      "email": "agent@example.com",
      "first_name": "Jane",
      "last_name": "Doe",
      "email_verified": false,
      "plan_tier": null,
      "subscription_status": "inactive",
      "created_at": "2026-04-12T...",
      "days_since_signup": 17
    }
  ],
  "count": 7
}
```

**Notes:**
- `days_since_signup` = `floor((NOW() - created_at) / 86400000)`
- No pagination needed at current scale (< 100 agents total)

**Also expose as Express route:** `routes/admin/force-activate-trial.js`, GET handler with `requireApiKey` middleware (for CLI usage via `curl -H "x-api-key: $KEY"`)

---

### FR-2: POST /api/admin/force-activate-trial

Force-activates a trial for a specific agent by ID.

**Next.js route:** `product/lead-response/dashboard/app/api/admin/force-activate-trial/route.ts`
**Auth:** `isAdminUser()` from `lib/services/AuthService.ts`

**Request body:**
```json
{ "agent_id": "uuid-string" }
```

**Action — set these fields on `real_estate_agents` (mirrors trial-signup state):**

| Column | Value | Rationale |
|--------|-------|-----------|
| `email_verified` | `true` | Unblocks login/dashboard access |
| `plan_tier` | `'trial'` | Grants trial-tier features |
| `trial_start_date` | `NOW()` | Fresh 14-day trial window |
| `trial_ends_at` | `NOW() + 14 days` | Matches `trial-signup/route.ts` line 75 |
| `onboarding_completed` | `false` | Agent still needs to complete onboarding |
| `onboarding_step` | `0` | Reset onboarding progress |
| `source` | `'admin_force_activation'` | Distinguishes from organic signups for analytics |
| `updated_at` | `NOW()` | Standard audit timestamp |

**Fields NOT changed (intentionally):**
- `subscription_status` — stays at default `'inactive'`. Normal trial-signup does not set this. Only Stripe webhooks transition to `'active'`/`'trialing'`.
- `status` — stays at current value (e.g. `'onboarding'`). Normal trial-signup does not set this.
- `password_hash` — untouched. If the agent signed up, they already have credentials.
- `trial_email_*` flags — left at defaults (false). The trial email cron will pick them up on its normal schedule.

**After update, log an audit event:**
```sql
INSERT INTO events (event_type, agent_id, properties, created_at)
VALUES ('admin_force_trial_activated', :agent_id,
  '{"source": "admin_force_activation", "previous_state": {"email_verified": <old>, "plan_tier": "<old>", "trial_ends_at": "<old>"}}'::jsonb,
  NOW())
```

Also log to metrics table:
```sql
INSERT INTO metrics (project_id, domain, metric_type, value, metadata, created_at)
VALUES ('leadflow', 'admin', 'force_activation', 1,
  '{"agent_id": "<agent_id>"}'::jsonb, NOW())
```

**Success response (200):**
```json
{
  "success": true,
  "agent": {
    "id": "uuid",
    "email": "agent@example.com",
    "first_name": "Jane",
    "plan_tier": "trial",
    "trial_ends_at": "2026-05-13T..."
  }
}
```

**Error responses:**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | `agent_id` missing from body | `{ "error": "agent_id is required" }` |
| 400 | Agent has `subscription_status = 'active'` | `{ "error": "Agent already has an active subscription. Force-activation is for trial onboarding only." }` |
| 400 | Agent already has `plan_tier = 'trial'` AND `email_verified = true` AND `trial_ends_at` in the future | `{ "error": "Agent already has an active trial.", "trial_ends_at": "..." }` |
| 404 | No agent found with that ID | `{ "error": "Agent not found" }` |
| 401 | Not admin | `{ "error": "Unauthorized" }` |

**Also expose as Express route:** `routes/admin/force-activate-trial.js`, POST handler with `requireApiKey` middleware (for CLI usage).

---

### FR-3: Admin UI — Stuck Agents Panel

**Location:** Add a new segment to `product/lead-response/dashboard/app/admin/funnel/trial-activation/page.tsx`

**Changes:**

1. **New "Stuck / Unverified" segment** — a fourth column alongside the existing `active`, `onboarded`, and `never_activated` segments. Pulls data from GET `/api/admin/stuck-agents`. Accent color: `#ef4444` (red).

2. **"Activate Trial" button** per agent card in the stuck segment — replaces the disabled "Flag" button pattern (lines 124-139 in current code).

3. **Button behavior:**
   - On click: inline confirmation "Start 14-day trial for {first_name} {last_name} ({email})?" with Confirm/Cancel
   - Calls POST `/api/admin/force-activate-trial` with `{ agent_id }`
   - On success: green toast/banner "Trial activated for {email} — expires {date}". Button becomes disabled with text "Activated".
   - On error: red inline error message below the button with error text from API
   - After success: re-fetch stuck agents list (activated agent should disappear)

4. **Empty state:** "No agents stuck at verification" centered message in the segment when list is empty

**Styling:** Match existing card styling in the page. Use Tailwind CSS. No inline styles except dynamic values.

---

## Non-Functional Requirements

- **Idempotency:** Calling force-activate twice on the same agent returns 400 "already has active trial" on the second call. Does not extend or reset an existing trial.
- **Audit trail:** Every activation logged to both `events` and `metrics` tables. Queryable for who was force-activated and when.
- **No email sent by this endpoint.** Force-activation does not trigger a welcome email or notification. Stojan handles outreach personally. The trial email cron will pick up these agents on its normal schedule.

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `POST /api/admin/force-activate-trial` with valid `agent_id` sets `email_verified=true`, `plan_tier='trial'`, `trial_ends_at` = 14 days from now | Query DB after call: `SELECT email_verified, plan_tier, trial_ends_at FROM real_estate_agents WHERE id = '...'` |
| AC-2 | Returns 404 if agent not found | Call with non-existent UUID |
| AC-3 | Returns 400 if agent has `subscription_status = 'active'` | Call on a paying agent |
| AC-4 | Returns 400 if agent already has an active trial | Call twice on same agent |
| AC-5 | `GET /api/admin/stuck-agents` returns agents with `email_verified=false` within 90 days, excluding test domains | Verify response includes only real agents |
| AC-6 | Admin UI shows stuck agent list with "Activate Trial" button | Visit `/admin/funnel/trial-activation`, see stuck agents, click button |
| AC-7 | After force-activation, agent disappears from stuck list on refresh | Activate an agent, refresh page, verify |
| AC-8 | Activated agent can log in and access `/dashboard` without `EMAIL_NOT_VERIFIED` error | Login with activated agent's credentials |
| AC-9 | Event logged to `events` table with `event_type = 'admin_force_trial_activated'` | `SELECT * FROM events WHERE event_type = 'admin_force_trial_activated'` |
| AC-10 | No regression: existing trial-signup and pilot-signup flows unchanged | Run existing E2E tests |

---

## E2E Test Spec

**File:** `tests/e2e/admin-force-trial-activation.test.js`

1. **Setup:** Insert a test agent with `email_verified = false`, `subscription_status = 'inactive'`, `plan_tier = NULL`
2. **GET stuck-agents:** Verify test agent appears in response
3. **POST force-activate:** Call with test agent ID, verify 200 + success response
4. **Verify DB state:** `email_verified = true`, `plan_tier = 'trial'`, `trial_ends_at` ~14 days out, `source = 'admin_force_activation'`
5. **Verify event logged:** Query `events` for `admin_force_trial_activated`
6. **Verify idempotency:** Second POST returns 400 "already has active trial"
7. **Verify 404:** POST with non-existent UUID returns 404
8. **Verify active-sub guard:** Insert agent with `subscription_status = 'active'`, POST returns 400
9. **GET stuck-agents again:** Activated agent no longer in list
10. **Cleanup:** Delete test agents

---

## File Inventory

| File | Action | Purpose |
|------|--------|---------|
| `product/.../app/api/admin/stuck-agents/route.ts` | Create | Next.js GET endpoint for stuck agent list |
| `product/.../app/api/admin/force-activate-trial/route.ts` | Create | Next.js POST endpoint for force-activation |
| `product/.../app/admin/funnel/trial-activation/page.tsx` | Edit | Add "Stuck / Unverified" segment with activate buttons |
| `routes/admin/force-activate-trial.js` | Create | Express routes (GET stuck-agents + POST force-activate) for CLI usage |
| `server.js` | Edit (2 lines) | Import + mount the Express admin router |
| `tests/e2e/admin-force-trial-activation.test.js` | Create | E2E test per spec above |

**No migration needed.** All required columns already exist on `real_estate_agents`. No new tables.

---

## Out of Scope

- **Bulk activation** — per-agent only for safety; iterate later if needed
- **Automatic retry of failed verification emails** — separate UC
- **Password reset for stuck agents** — separate flow
- **Notification to the agent** — Stojan handles outreach manually post-activation
- **Service class extraction** — the Express and Next.js routes can share logic via a simple helper function in the route files themselves. A full service class is overkill for two UPDATE queries. Extract to `lib/services/` only if a third caller appears.

---

## Discovered Finding (Not In Scope — Separate Bug)

**Trial email cron may be broken for all trial agents.** The cron at `product/lead-response/dashboard/lib/trial-emails.ts:54` filters `.eq('subscription_status', 'trial')`, but the trial-signup route does NOT set `subscription_status` — it stays at the DB default `'inactive'`. This means no trial agents would match the cron filter, and no drip emails would be sent. Recommend filing as a separate P1 bug: `fix-trial-email-cron-subscription-status-filter`.

---

## Post-Deploy Playbook

1. Hit GET `/api/admin/stuck-agents` to see who's stuck
2. Ignore test-data agents (`@example.com`, `@qc.test`)
3. Force-activate any real stuck agents
4. Personally contact each activated agent (email or phone) with login instructions
5. Track conversion: activated → logged in → connected FUB → first lead responded
