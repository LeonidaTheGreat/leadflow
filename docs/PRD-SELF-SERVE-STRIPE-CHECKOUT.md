# PRD: Self-Serve Stripe Checkout — In-Dashboard Upgrade Flow

**ID:** prd-self-serve-stripe-checkout  
**Use Case:** feat-self-serve-stripe-checkout  
**Phase:** Phase 1  
**Priority:** P0 — Revenue Critical  
**Status:** draft  
**Author:** Product Manager  
**Created:** 2026-03-12

---

## 1. Problem Statement

Pilot agents and trial users currently have **no self-serve path to become paying customers**. To upgrade, they must contact Stojan directly — a manual, unscalable friction point that blocks revenue. Every day without self-serve checkout is a day of lost conversion.

**Revenue impact:** Path to $20K MRR depends on autonomous agent upgrades. Without this, zero self-serve revenue is possible.

---

## 2. Goal

Enable any pilot or trial agent to upgrade to a paid plan (Starter $49/mo, Pro $149/mo, Team $399/mo) directly from the LeadFlow dashboard — without human intervention. Stripe Checkout handles payment. Webhooks update the agent's plan tier automatically. The dashboard reflects the new plan immediately.

---

## 3. User Stories

### US-1: Upgrade CTA visibility
> As a pilot or trial agent viewing my dashboard, I want to see a clear "Upgrade" call-to-action so I know I can upgrade to a paid plan without asking anyone.

**Acceptance criteria:**
- An "Upgrade Plan" button/banner is visible on the main dashboard page for any agent with `plan_tier` of `trial`, `pilot`, or `null`
- The CTA is NOT shown for agents with `plan_tier` of `starter`, `pro`, or `team` (already paid)
- The CTA links to the billing page OR triggers the upgrade flow inline
- On mobile, the CTA is visible without scrolling (above the fold)

### US-2: Stripe Checkout session initiated server-side
> As a trial agent who clicks "Upgrade to Pro," I want to be redirected to Stripe's secure hosted checkout so I can pay with my card.

**Acceptance criteria:**
- Clicking "Upgrade to [Plan]" on the billing/settings page calls `POST /api/billing/create-checkout-session`
- The endpoint creates a Stripe Checkout session server-side (never client-side) with:
  - `mode: 'subscription'`
  - Correct `price_id` for the selected plan (Starter/Pro/Team)
  - `customer_email` pre-filled from the agent's email
  - `client_reference_id` set to the agent's `agent_id` (for webhook correlation)
  - `success_url` pointing to `/dashboard?upgrade=success`
  - `cancel_url` pointing to `/settings/billing?upgrade=cancelled`
- Agent is redirected to Stripe's hosted Checkout page
- No Stripe keys are ever exposed to the browser

### US-3: Webhook updates plan_tier on payment success
> As an agent who completes payment, I want my account to immediately reflect my new plan so I can access paid features.

**Acceptance criteria:**
- Stripe sends `checkout.session.completed` event to `POST /api/webhooks/stripe`
- Webhook validates the Stripe signature (using `STRIPE_WEBHOOK_SECRET`)
- On valid event, the webhook:
  1. Extracts `client_reference_id` (agent_id) and `customer` (stripe_customer_id) from the session
  2. Resolves the plan_tier from the purchased price_id (starter/pro/team)
  3. Updates `real_estate_agents` table:
     - `plan_tier` → resolved tier
     - `stripe_customer_id` → Stripe customer ID
     - `stripe_subscription_id` → Stripe subscription ID
     - `plan_activated_at` → current timestamp
- On failure (invalid signature, missing agent), webhook returns 400 and logs error — does NOT silently succeed
- Idempotent: repeated webhook delivery of same session does not double-update or break state

### US-4: Dashboard reflects new tier immediately after payment
> As an agent returning from Stripe Checkout, I want to see my new plan tier in the dashboard so I have instant confirmation the upgrade worked.

**Acceptance criteria:**
- On redirect to `/dashboard?upgrade=success`, a success banner/toast is shown: "🎉 You're now on [Plan Name]! Your account is upgraded."
- The Plan tier badge in the nav/settings updates to the new plan immediately (not on next login)
- The "Upgrade" CTA is no longer shown for the agent
- If the redirect arrives before the webhook processes (race condition), the dashboard polls or shows a "Confirming your payment..." state for up to 10 seconds before showing the plan

### US-5: Confirmation email after successful upgrade
> As an agent who upgrades, I want to receive an email confirming my plan so I have a receipt and feel confident the payment was processed.

**Acceptance criteria:**
- On `checkout.session.completed` webhook, after updating the DB, send a transactional email via Resend to the agent's email
- Email subject: "You're on LeadFlow [Plan Name] — here's your receipt"
- Email body includes:
  - Plan name and price
  - Next billing date (from Stripe subscription `current_period_end`)
  - Link to billing portal for managing/cancelling
  - Support email: support@leadflowai.com
- Email uses the existing Resend integration (uses `RESEND_API_KEY`)
- If Resend fails, the webhook still returns 200 (email failure is non-blocking)

### US-6: Failed payment surfaces clear error UI
> As an agent whose card was declined, I want to see a clear error message so I know what went wrong and how to fix it.

**Acceptance criteria:**
- If the agent cancels checkout, they land on `/settings/billing?upgrade=cancelled` with a banner: "No charge was made. You can upgrade anytime."
- For Stripe payment failures (card declined, etc.), Stripe Checkout handles this inline — no custom code required in MVP
- If `create-checkout-session` API call fails (server error), the UI shows: "Something went wrong. Please try again or contact support@leadflowai.com"
- Error states use red/amber styling, not generic grey

---

## 4. Technical Requirements

### 4.1 New API Endpoint

**`POST /api/billing/create-checkout-session`** (Next.js API route)

Request body:
```json
{
  "planId": "starter" | "pro" | "team"
}
```

Response:
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

- Auth: requires valid session (middleware already exists)
- Server-side only: `STRIPE_SECRET_KEY` never sent to client
- Price ID mapping (from env vars):
  - `starter` → `STRIPE_PRICE_STARTER_MONTHLY`
  - `pro` → `STRIPE_PRICE_PROFESSIONAL_MONTHLY`
  - `team` → `STRIPE_PRICE_TEAM_MONTHLY`

### 4.2 Stripe Webhook Enhancement

Existing `POST /api/webhooks/stripe` (or `/api/webhooks/stripe` in server.js) needs to handle `checkout.session.completed`:

```
session.client_reference_id → agent_id
session.customer → stripe_customer_id
session.subscription → stripe_subscription_id
line_items[0].price.id → map to plan_tier
```

**DB write target:** `real_estate_agents` table (not `agents` orchestration table)

### 4.3 UI Changes

**Dashboard main page (`/dashboard/page.tsx`):**
- Add `<UpgradeBanner />` component (conditional on plan_tier)
- Banner shows for: `trial`, `pilot`, null
- Banner hidden for: `starter`, `pro`, `team`

**Billing page (`/settings/billing/page.tsx`):**
- Existing plan cards' "Upgrade" buttons currently link to `/signup?plan=X` — change to call `create-checkout-session` API
- Add loading state during Stripe redirect
- Add success/cancel query param handlers

### 4.4 Plan Tier Mapping

| Stripe Price Env Var | plan_tier | Display Name |
|---|---|---|
| `STRIPE_PRICE_STARTER_MONTHLY` | `starter` | Starter |
| `STRIPE_PRICE_PROFESSIONAL_MONTHLY` | `pro` | Pro |
| `STRIPE_PRICE_TEAM_MONTHLY` | `team` | Team |

### 4.5 Environment Variables Required

All required in Vercel project settings for `leadflow-ai`:
- `STRIPE_SECRET_KEY` — secret key (sk_live_ or sk_test_)
- `STRIPE_WEBHOOK_SECRET` — webhook signing secret (whsec_...)
- `STRIPE_PRICE_STARTER_MONTHLY` — Stripe price ID for Starter plan
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY` — Stripe price ID for Pro plan
- `STRIPE_PRICE_TEAM_MONTHLY` — Stripe price ID for Team plan

Note: `STRIPE_PRICE_TEAM_MONTHLY` may need to be created in Stripe if not yet present (check `STRIPE_PRICE_ENTERPRISE_MONTHLY` as potential alias).

### 4.6 Database Fields Required

The `real_estate_agents` table must have these columns (verify/add if missing):
- `plan_tier` (text) — e.g., `trial`, `pilot`, `starter`, `pro`, `team`
- `stripe_customer_id` (text) — Stripe cus_ ID
- `stripe_subscription_id` (text) — Stripe sub_ ID
- `plan_activated_at` (timestamptz) — when plan was activated

---

## 5. Out of Scope (This PRD)

- Annual pricing / discount codes
- Team member management after Team plan purchase
- Brokerage / white-label tier
- Stripe Customer Portal (manage/cancel) — see UC-10 (already complete)
- Downgrades
- Prorated upgrades between paid tiers

---

## 6. Acceptance Criteria Summary

| # | Criterion | How to Verify |
|---|---|---|
| AC-1 | Upgrade CTA visible for pilot/trial agents in dashboard | Log in as trial agent → see upgrade banner |
| AC-2 | Upgrade CTA NOT visible for paid agents | Log in as pro agent → no upgrade banner |
| AC-3 | Clicking upgrade plan creates Stripe Checkout session server-side | Network tab: POST /api/billing/create-checkout-session returns Stripe URL |
| AC-4 | Checkout redirects to Stripe hosted page | Stripe URL opens in same tab |
| AC-5 | After successful payment, plan_tier updated in DB | Check `real_estate_agents` table after test payment |
| AC-6 | stripe_customer_id saved in DB | Same row — stripe_customer_id populated |
| AC-7 | Dashboard shows success banner on return from Stripe | /dashboard?upgrade=success shows "You're now on [Plan]" |
| AC-8 | Upgrade CTA gone after successful payment | Refresh dashboard — no upgrade prompt |
| AC-9 | Confirmation email received | Check inbox after Stripe test payment |
| AC-10 | Cancel redirect shows "no charge" message | Abandon checkout → /settings/billing?upgrade=cancelled shows message |
| AC-11 | Webhook validates Stripe signature | Send webhook with invalid signature → 400 response |
| AC-12 | Webhook is idempotent | Replay same event → no double-update |

---

## 7. Definition of Done

- [ ] All 12 ACs pass in Vercel preview environment
- [ ] Test mode Stripe payment completes end-to-end (use Stripe test card 4242...)
- [ ] Webhook signature validation confirmed
- [ ] Confirmation email received in test inbox
- [ ] No Stripe keys in browser network tab
- [ ] QC agent signs off
- [ ] PM (Stojan) manually verifies AC-1, AC-4, AC-7, AC-9 on staging URL

---

## 8. Risk & Notes

- **Webhook delivery vs redirect race:** Stripe webhooks may arrive after the success redirect. Handle with a short polling/refresh or optimistic UI showing "Confirming..." state.
- **Stripe Checkout mode:** Use hosted checkout (not Elements) for fastest, most secure implementation.
- **Team tier price ID:** Check whether `STRIPE_PRICE_TEAM_MONTHLY` exists or if `STRIPE_PRICE_ENTERPRISE_MONTHLY` is the intended alias.
- **Pilot agents:** `plan_tier = 'pilot'` agents should also see the upgrade CTA — they're free pilots who may be ready to pay.
