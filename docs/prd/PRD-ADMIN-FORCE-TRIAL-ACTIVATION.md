# PRD: Admin Force-Trial-Activation

**UC:** `feat-admin-force-trial-activation`
**Priority:** P0 (revenue-critical — unblocks stuck agents and enables white-glove onboarding)
**Status:** Draft
**Author:** PM Agent
**Date:** 2026-04-29

---

## Problem

Agents who signed up through older flows or whose verification emails failed (Resend 408/410 failures) are permanently stuck with `email_verified = false`. They have no path forward — no retry mechanism, no admin override.

The current admin tooling (`/admin/funnel/trial-activation`) only shows agents who already have active trials. Agents stuck at email verification are invisible to the admin dashboard.

This also blocks white-glove pilot onboarding: when Stojan recruits a pilot agent via phone or LinkedIn, there's no way to activate their trial without the agent completing email verification.

**Impact:** Every stuck agent is a lost conversion opportunity. With 0 paying customers at Day 79, each activated agent is a potential first-revenue conversion.

## Solution

Two admin API endpoints + admin UI to identify and force-activate stuck agents.

---

## Detailed Requirements

### FR-1: GET /api/admin/stuck-agents

Lists agents stuck at email verification.

**Express route:** `routes/admin/force-activate-trial.js`
**Auth:** `x-api-key` header via `require-api-key` middleware (same as `activation-outreach.js`)

**Query:**
```sql
SELECT id, email, first_name, last_name, created_at, plan_tier, status
FROM real_estate_agents
WHERE email_verified = false
  AND created_at > NOW() - INTERVAL '90 days'
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
      "created_at": "2026-04-12T...",
      "days_stuck": 17,
      "plan_tier": null,
      "status": "onboarding"
    }
  ],
  "count": 7
}
```

**Notes:**
- `days_stuck` = `floor((NOW() - created_at) / 86400000)`
- Excludes test accounts: filter out emails matching `*@example.com`, `*@qc.test`, `*@qc.invalid`, `*@leadflow-qc.invalid` (test harness domains)
- No pagination needed at current scale (< 100 agents total)

**Next.js route:** `product/lead-response/dashboard/app/api/admin/stuck-agents/route.ts`
Same logic, auth via `Authorization: Bearer {LEADFLOW_API_KEY}` (same pattern as existing `/api/admin/funnel/trial-activation/route.ts`).

---

### FR-2: POST /api/admin/force-activate-trial

Force-activates a trial for a specific agent by ID.

**Express route:** `routes/admin/force-activate-trial.js`
**Auth:** `x-api-key` header via `require-api-key` middleware

**Request body:**
```json
{ "agent_id": "uuid-string" }
```

**Action — must set the agent to the SAME state as a normal trial signup:**

| Column | Value | Rationale |
|--------|-------|-----------|
| `email_verified` | `true` | Unblocks login/dashboard access |
| `plan_tier` | `'trial'` | Grants trial-tier features |
| `trial_start_date` | `NOW()` | Fresh 14-day trial window |
| `trial_ends_at` | `NOW() + 14 days` | Matches trial-signup route.ts line 75 |
| `onboarding_completed` | `false` | Agent still needs to complete onboarding |
| `onboarding_step` | `0` | Reset onboarding progress |
| `source` | `'admin_force_activation'` | Distinguishes from organic signups for analytics |
| `updated_at` | `NOW()` | Standard audit timestamp |

**Fields NOT changed (intentionally):**
- `subscription_status` — stays at default `'inactive'`. Normal trial-signup does not set this to `'trial'`. Only Stripe webhooks transition to `'active'`.
- `status` — stays at default `'onboarding'`. Normal trial-signup does not set this to `'active'`.
- `password_hash` — untouched. If the agent signed up, they already have credentials.
- `trial_email_*` flags — left at defaults (false). The trial email cron will pick them up.

**After update, log an event:**
```sql
INSERT INTO events (event_type, agent_id, properties, created_at)
VALUES ('admin_force_trial_activated', :agent_id,
  '{"source": "admin_force_activation", "activated_by": "api_key"}'::jsonb,
  NOW())
```

Also log to metrics table:
```sql
INSERT INTO metrics (project_id, domain, metric_type, value, metadata, created_at)
VALUES ('leadflow', 'admin', 'force_activation',
  1, '{"agent_id": ":agent_id"}'::jsonb, NOW())
```

**Success response (200):**
```json
{
  "success": true,
  "agent": {
    "id": "uuid",
    "email": "agent@example.com",
    "first_name": "Jane",
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
| 401 | Missing or invalid API key | `{ "error": "Unauthorized" }` (from middleware) |

**Next.js route:** `product/lead-response/dashboard/app/api/admin/force-activate-trial/route.ts`
Same logic, auth via `Authorization: Bearer {LEADFLOW_API_KEY}`.

---

### FR-3: Service Class

**File:** `lib/services/ForceActivationService.js`

Single-responsibility service class. Constructor-injected dependencies (pool or db client). Two public methods:

- `getStuckAgents()` — returns filtered list (excludes test domains, within 90 days)
- `forceActivateTrial(agentId)` — validates preconditions, updates agent, logs event + metric, returns result

The Express route and Next.js route both delegate to this service. Express route uses it directly; Next.js route can use `postgrestAdmin` or import the service.

**Dev note:** The Express route (`routes/admin/`) uses `getPool()` from `lib/db.js` for raw SQL. The Next.js route uses `postgrestAdmin` (PostgREST query builder). Both are valid — use whichever matches the existing pattern in each context. The service class should accept either.

---

### FR-4: Admin UI — Stuck Agents Panel

**Location:** Add a new section to the existing trial-activation page at:
`product/lead-response/dashboard/app/admin/funnel/trial-activation/page.tsx`

**OR** (dev's choice based on complexity): create a standalone page at:
`product/lead-response/dashboard/app/admin/stuck-agents/page.tsx`
and add a link from the `/admin` hub page.

**UI requirements:**

1. **Header:** "Stuck at Verification" with count badge
2. **Agent cards** showing: name, email, created_at, days stuck
3. **"Activate Trial" button** per agent card — calls `POST /api/admin/force-activate-trial`
4. **Confirmation step:** Button click shows inline "Are you sure? This will start a 14-day trial for {name}." with Confirm/Cancel
5. **Success state:** Card shows green checkmark + "Trial activated — expires {date}" and disables the button
6. **Error state:** Red inline error message below the button
7. **Auth:** Same `NEXT_PUBLIC_LEADFLOW_API_KEY` Bearer pattern used by the existing trial-activation page (line 208)
8. **Refresh:** After successful activation, re-fetch the stuck agents list (agent should disappear from it since `email_verified` is now `true`)
9. **Empty state:** "No agents stuck at verification" message when list is empty

**Styling:** Tailwind CSS. Match the existing card styling in `trial-activation/page.tsx`.

---

## Non-Functional Requirements

- **Idempotency:** Calling force-activate twice on the same agent returns the 400 "already has active trial" error on the second call. Does not extend or reset an existing trial.
- **Audit trail:** Every activation logged to both `events` and `metrics` tables. Queryable for who was force-activated and when.
- **Rate limiting:** Admin endpoints already covered by `adminLimiter` middleware in server.js (line 31).
- **No email sent by this endpoint.** Force-activation does not trigger a welcome email or any notification. The admin (Stojan) handles outreach personally. The trial email cron will pick up these agents on its normal schedule.

---

## Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `POST /api/admin/force-activate-trial` with valid `agent_id` sets `email_verified=true`, `plan_tier='trial'`, `trial_ends_at` = 14 days from now | `curl -X POST -H "x-api-key: $KEY" -d '{"agent_id":"..."}' .../api/admin/force-activate-trial` returns `{ success: true, agent: { trial_ends_at: "..." } }`. Verify in DB: `SELECT email_verified, plan_tier, trial_ends_at FROM real_estate_agents WHERE id = '...'` |
| AC-2 | Returns 404 if agent not found | Call with non-existent UUID, expect `{ error: "Agent not found" }` |
| AC-3 | Returns 400 if agent has `subscription_status = 'active'` | Call on a paying agent, expect 400 |
| AC-4 | Returns 400 if agent already has an active trial | Call twice on same agent, second call returns 400 |
| AC-5 | `GET /api/admin/stuck-agents` returns agents with `email_verified=false` within 90 days, excluding test domains | Verify response includes only non-test agents |
| AC-6 | Admin UI shows stuck agent list with "Activate Trial" button | Visit `/admin/funnel/trial-activation` (or `/admin/stuck-agents`), see stuck agents, click button |
| AC-7 | After force-activation, agent disappears from stuck list on refresh | Activate an agent, refresh page, agent no longer shown |
| AC-8 | Activated agent can log in and access `/dashboard` without email verification prompt | Manual verification or E2E test |
| AC-9 | Event logged to `events` table with `event_type = 'admin_force_trial_activated'` | `SELECT * FROM events WHERE event_type = 'admin_force_trial_activated'` |
| AC-10 | No regression: existing trial-signup flow unchanged | Run existing trial-signup E2E tests |

---

## E2E Test Spec

**File:** `tests/e2e/admin-force-trial-activation.test.js`

1. **Setup:** Insert a test agent with `email_verified = false`, `subscription_status = 'inactive'`, `plan_tier = NULL`
2. **GET stuck-agents:** Verify test agent appears in response
3. **POST force-activate:** Call with test agent ID, verify 200 + success response
4. **Verify DB state:** `email_verified = true`, `plan_tier = 'trial'`, `trial_ends_at` ~14 days out, `source = 'admin_force_activation'`
5. **Verify event logged:** Query `events` table for `admin_force_trial_activated`
6. **Verify idempotency:** Second POST returns 400 "already has active trial"
7. **Verify 404:** POST with non-existent UUID returns 404
8. **Verify active-sub guard:** Insert agent with `subscription_status = 'active'`, POST returns 400
9. **GET stuck-agents again:** Activated agent no longer in list
10. **Cleanup:** Delete test agents

---

## File Inventory

| File | Action | Purpose |
|------|--------|---------|
| `lib/services/ForceActivationService.js` | Create | Business logic for stuck-agent query + force-activation |
| `routes/admin/force-activate-trial.js` | Create | Express routes (GET stuck-agents, POST force-activate) |
| `server.js` | Edit (2 lines) | Import + mount the new router |
| `product/lead-response/dashboard/app/api/admin/stuck-agents/route.ts` | Create | Next.js API for dashboard UI |
| `product/lead-response/dashboard/app/api/admin/force-activate-trial/route.ts` | Create | Next.js API for dashboard UI |
| `product/lead-response/dashboard/app/admin/funnel/trial-activation/page.tsx` | Edit | Add "Stuck at Verification" section with activate buttons |
| `tests/e2e/admin-force-trial-activation.test.js` | Create | E2E test per spec above |

**No migration needed.** All required columns already exist on `real_estate_agents`. No new tables.

---

## Out of Scope

- **Bulk activation** (activate all stuck agents at once) — keep it per-agent for now for safety; can iterate later
- **Automatic retry of failed verification emails** — separate UC
- **Trial email cron discrepancy** — the trial email cron filters on `subscription_status = 'trial'` (`product/lead-response/dashboard/lib/trial-emails.ts:54`) but normal trial-signup leaves `subscription_status = 'inactive'`. This means trial emails may not be sending for ANY trial agents. **File this as a separate P1 bug — do not fix here.** (Discovered during PRD research.)
- **Password reset for stuck agents** — if an agent forgot their password, that's a separate flow
- **Notification to the agent** — Stojan handles outreach manually post-activation

---

## Discovered Finding (Not In Scope — Separate Bug)

**Trial email cron may be broken for all trial agents.** The cron at `product/lead-response/dashboard/lib/trial-emails.ts:54` filters `.eq('subscription_status', 'trial')`, but the trial-signup route (`app/api/auth/trial-signup/route.ts`) does NOT set `subscription_status` — it stays at the database default `'inactive'`. This means no trial agents would match the cron filter, and no trial drip emails would be sent. Recommend filing as `feat-fix-trial-email-cron-filter` P1.
