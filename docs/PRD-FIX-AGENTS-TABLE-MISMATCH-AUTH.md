# PRD: Fix agents Table Mismatch in Auth/Onboarding API Routes

**PRD ID:** PRD-FIX-AGENTS-TABLE-MISMATCH-AUTH  
**Status:** approved  
**Priority:** high  
**Created:** 2026-03-09  
**Author:** Product Manager

---

## Problem Statement

LeadFlow's Supabase database has two different tables named similarly:

| Table | Owner | Purpose |
|---|---|---|
| `agents` | Genome Orchestrator | AI agent task metadata (orchestrator-internal) |
| `real_estate_agents` | LeadFlow Product | Customer records (the paying real estate agents) |

Multiple API routes in the Next.js dashboard (`product/lead-response/dashboard/app/api/`) are querying the wrong `agents` table. Since the `agents` table is the orchestrator task table, these queries either return no data, wrong data, or cause silent failures.

The login route (`app/api/auth/login/route.ts`) is **already fixed** — it correctly uses `real_estate_agents`. However, the following routes still reference the wrong table:

- `app/api/agents/check-email/route.ts` — email availability check during signup
- `app/api/agents/profile/route.ts` — agent profile read/update (2 references)
- `app/api/agents/satisfaction-ping/route.ts` — satisfaction survey sends (2 references)
- `app/api/satisfaction/stats/route.ts` — satisfaction statistics
- `app/api/onboarding/check-email/route.ts` — email check during onboarding
- `app/api/onboarding/submit/route.ts` — onboarding form submission (2 references)
- `app/api/webhooks/stripe/route.ts` — Stripe webhook handler updating subscriptions (4 references)
- `app/api/stripe/portal-session/route.ts` — Stripe billing portal (3 references)
- `app/api/webhook/route.ts` — FUB webhook handler
- `app/api/webhook/fub/route.ts` — FUB-specific webhook (2 references)
- `app/api/webhook/twilio/route.ts` — Twilio SMS webhook (2 references)

**Critical impact:**
- New users cannot complete the signup flow (email uniqueness check fails against wrong table)
- Onboarding form submissions fail or corrupt wrong table
- Stripe billing webhooks write to the orchestrator's agents table, breaking billing
- Agent profiles cannot be loaded or saved

---

## Goals

1. All product-facing API routes query `real_estate_agents` for customer records
2. The `agents` table is only ever touched by orchestration/genome code
3. Signup, login, onboarding, billing, and webhook flows all work end-to-end
4. No regression in existing functionality

---

## Out of Scope

- Renaming the `agents` table or `real_estate_agents` table in the database
- Changing any genome/orchestrator code
- Changing `routes/auth.js` (file does not exist; no-op)

---

## Affected Files

All changes are inside: `product/lead-response/dashboard/app/api/`

| File | References to fix |
|---|---|
| `agents/check-email/route.ts` | 1 |
| `agents/profile/route.ts` | 2 |
| `agents/satisfaction-ping/route.ts` | 2 |
| `satisfaction/stats/route.ts` | 1 |
| `onboarding/check-email/route.ts` | 1 |
| `onboarding/submit/route.ts` | 2 |
| `webhooks/stripe/route.ts` | 4 |
| `stripe/portal-session/route.ts` | 3 |
| `webhook/route.ts` | 1 |
| `webhook/fub/route.ts` | 2 |
| `webhook/twilio/route.ts` | 2 |

**Total references to change: ~21**

---

## Functional Requirements

### FR-1: Systematic Table Reference Fix
Replace all `supabase.from('agents')` calls in product API routes with `supabase.from('real_estate_agents')`.

**Exception:** Any route that intentionally queries the orchestrator's agents table (if such a route exists) must add a clear comment explaining the intent.

### FR-2: Column Compatibility
After changing table name, verify that all selected/filtered column names exist on `real_estate_agents`. The `real_estate_agents` table schema includes:
- `id`, `email`, `password_hash`, `first_name`, `last_name`
- `email_verified`, `onboarding_completed`, `last_login_at`
- `plan_tier`, `stripe_customer_id`, `mrr`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`

If a route queries a column that doesn't exist on `real_estate_agents`, note the discrepancy and either add a migration or remove the column reference.

### FR-3: No Breaking Changes to Auth Flow
The already-fixed login route must continue to work. Test that:
- POST `/api/auth/login` — succeeds with valid email/password from `real_estate_agents`
- POST `/api/auth/trial-signup` — inserts into `real_estate_agents` (already correct)

### FR-4: Stripe Webhook Consistency
The Stripe webhook must update the `real_estate_agents` table when subscription events fire. Verify that `stripe_customer_id` exists on `real_estate_agents` to allow lookup.

---

## Acceptance Criteria

| # | Criterion | How to Test |
|---|---|---|
| AC-1 | Email check during signup returns correct availability | POST `/api/agents/check-email` with an email that exists in `real_estate_agents` — returns `{available: false}` |
| AC-2 | Agent profile loads correctly | GET `/api/agents/profile` with valid session — returns agent data from `real_estate_agents` |
| AC-3 | Onboarding form submission succeeds | POST `/api/onboarding/submit` with valid data — creates/updates row in `real_estate_agents` |
| AC-4 | No 500 errors in auth-related routes | Hit each fixed endpoint — all return appropriate 2xx or 4xx (no 5xx) |
| AC-5 | `grep -r "from('agents')" product/lead-response/dashboard/app/api/` returns no product-customer routes | Run the grep — only legitimate orchestrator references remain (if any) |
| AC-6 | Stripe webhook updates `real_estate_agents` on subscription event | Simulate Stripe `customer.subscription.updated` webhook — verify `real_estate_agents` row updated |

---

## Human Test Plan (Stojan)

1. Open https://leadflow-ai-five.vercel.app/signup
2. Enter email + password → proceed through onboarding → complete setup
3. Log out
4. Log back in with same credentials → reach dashboard successfully
5. Open Settings → Profile → verify name/email visible
6. Open Settings → Billing → verify subscription info loads without error

If all 6 steps complete without errors, the fix is verified.

---

## Implementation Notes

- This is a search-and-replace task with careful column validation
- Dev should run `grep -rn "from('agents')" product/lead-response/dashboard/app/api/` to find all instances
- After fix: run `grep` again to confirm 0 product-customer route references to `agents`
- Must run `npm run build` in `product/lead-response/dashboard/` — zero TypeScript errors before shipping
- Deploy to Vercel and verify production endpoints
