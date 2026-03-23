# PRD: Stripe Checkout Production Verification — First Real Transaction Test

**PRD ID:** prd-stripe-checkout-production-e2e  
**Use Case:** feat-stripe-checkout-production-e2e  
**Status:** approved  
**Priority:** P0 — Revenue Critical  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-03-15  

---

## Problem Statement

`feat-self-serve-stripe-checkout` is marked **complete** in Supabase but has **never processed a real transaction**. The action_items table shows Stojan has not confirmed Stripe API keys are configured in Vercel production environment.

Code review reveals a critical risk: the `STRIPE_PRICE_*` env vars default to literal strings (`'price_starter_monthly'`, etc.) which are **invalid Stripe Price IDs**. If these aren't set in Vercel, every checkout attempt will fail with a Stripe `StripeInvalidRequestError`.

**Impact:** The first pilot agent who clicks "Upgrade" hits a broken flow. This destroys trust and loses the conversion.

---

## Goal

Verify — with real Stripe API calls against the production Vercel deployment — that the complete billing lifecycle works end-to-end before any pilot agent encounters it:

```
Dashboard Upgrade Click
  → POST /api/billing/create-checkout
  → Stripe Checkout Session created
  → User completes payment
  → Stripe POST /api/webhooks/stripe (checkout.session.completed)
  → real_estate_agents.plan_tier updated
  → real_estate_agents.stripe_customer_id set
  → Billing portal accessible at /dashboard/billing
```

---

## User Stories

### US-1: Agent Upgrades to Starter Plan
> As a pilot agent on a free trial, I want to click "Upgrade to Starter" and be redirected to a secure Stripe checkout page so I can enter payment details and activate my subscription.

**Acceptance:** Checkout page loads with correct plan name ($49/mo), card field accepts Stripe test card `4242 4242 4242 4242`, and redirects to `/dashboard?session_id=...` on success.

### US-2: Subscription Activates After Payment
> As an agent who just paid, I want my dashboard to immediately reflect my new plan tier so I know the payment worked.

**Acceptance:** After webhook fires, `real_estate_agents` row shows `plan_tier='starter'` (or `professional`/`enterprise`), `stripe_customer_id` is set, `status='active'`.

### US-3: Billing Portal Access
> As a paying agent, I want to click "Manage Billing" in my dashboard settings and be taken to the Stripe customer portal to manage my subscription, update payment method, or cancel.

**Acceptance:** POST to `/api/stripe/portal-session` returns a valid Stripe-hosted portal URL. Link opens without error.

### US-4: Deployment Smoke Test
> As an operator, I want a post-deployment smoke test to run on every Vercel deployment so I know immediately if the billing flow breaks.

**Acceptance:** A test script using Stripe test mode keys verifies: (a) checkout session creation, (b) webhook endpoint reachability, (c) portal session creation. Test runs in CI/CD and fails the deployment health check if any step errors.

---

## Acceptance Criteria

### AC-1: Vercel Env Vars Confirmed
**Required env vars in Vercel production environment (not just local .env):**
- `STRIPE_SECRET_KEY` — production Stripe secret key (`sk_live_...` or `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret (`whsec_...`)
- `STRIPE_PRICE_STARTER_MONTHLY` — valid Stripe Price ID (e.g. `price_1ABC...`)
- `STRIPE_PRICE_STARTER_ANNUAL` — valid Stripe Price ID
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY` — valid Stripe Price ID
- `STRIPE_PRICE_PROFESSIONAL_ANNUAL` — valid Stripe Price ID
- `STRIPE_PRICE_ENTERPRISE_MONTHLY` — valid Stripe Price ID
- `STRIPE_PRICE_ENTERPRISE_ANNUAL` — valid Stripe Price ID

**Test:** POST `/api/billing/create-checkout` with a valid `tier` and `agentId` returns `{ sessionId, url }` — not a 503 "Stripe not configured" or a Stripe `StripeInvalidRequestError`.

### AC-2: Stripe Products & Prices Exist
**Stripe Products must exist with correct amounts:**
| Plan | Monthly Price | Annual Price |
|------|--------------|--------------|
| Starter | $49/mo | $490/yr |
| Professional | $149/mo | $1,490/yr |
| Enterprise (Team) | $399/mo | $3,990/yr |

**Test:** Using Stripe CLI or API, list prices and confirm all 6 Price IDs referenced in env vars exist, are active, and match the amounts above.

### AC-3: Checkout Session Creation Succeeds
**Request:**
```
POST /api/billing/create-checkout
{ "tier": "starter_monthly", "agentId": "<test-agent-uuid>", "email": "test@leadflowai.com" }
```
**Expected response:**
```json
{ "sessionId": "cs_test_...", "url": "https://checkout.stripe.com/pay/cs_test_..." }
```
**Test:** Response status 200, `url` is a valid Stripe checkout URL, session visible in Stripe Dashboard.

### AC-4: Webhook Receives & Processes `checkout.session.completed`
**Setup:** Stripe CLI (`stripe listen --forward-to`) or Vercel webhook configured to receive events.  
**Trigger:** Complete checkout with test card `4242 4242 4242 4242`.  
**Expected:** 
- Stripe sends `checkout.session.completed` event to `/api/webhooks/stripe`
- Endpoint returns `{ received: true }` with HTTP 200
- No signature verification failure (confirms `STRIPE_WEBHOOK_SECRET` is correct)

### AC-5: Database Updated After Webhook
After `checkout.session.completed` is processed:
```sql
SELECT plan_tier, stripe_customer_id, stripe_subscription_id, status, mrr
FROM real_estate_agents
WHERE id = '<test-agent-uuid>';
```
**Expected:**
- `plan_tier` = `'starter'` (or relevant tier)
- `stripe_customer_id` = `'cus_...'` (not null)
- `stripe_subscription_id` = `'sub_...'` (not null)
- `status` = `'active'`
- `mrr` > 0

### AC-6: Billing Portal Opens
**Request:**
```
POST /api/stripe/portal-session
{ "agentId": "<test-agent-uuid>" }
```
**Expected:** Returns `{ url: "https://billing.stripe.com/p/session/..." }`. URL resolves without error.

### AC-7: Smoke Test on Every Deployment
A test script exists at `tests/integrated/stripe-production-smoke.test.js` (or `.ts`) that:
1. Uses Stripe **test mode** keys (safe to run anywhere)
2. Creates a checkout session → verifies response shape
3. Verifies webhook endpoint returns 400 (not 500) on bad signature (confirms it's running)
4. Verifies portal session endpoint is reachable
5. Is included in `package.json` test scripts or Vercel `postbuild` hook

---

## Implementation Notes for Dev Agent

### Critical Issues Found in Code Review

**Issue 1 — Fallback Price IDs are invalid:**  
In `product/lead-response/dashboard/app/api/billing/create-checkout/route.ts`:
```typescript
priceId: process.env.STRIPE_PRICE_STARTER_MONTHLY || 'price_starter_monthly',
```
The fallback `'price_starter_monthly'` is NOT a valid Stripe Price ID (must be `price_xxx...`). If the env var is missing, every checkout attempt fails with a Stripe API error. **Fix:** Remove fallbacks entirely, or validate that Price IDs start with `price_` and return a descriptive error if not configured.

**Issue 2 — plan_tier mapping inconsistency:**  
The webhook handler maps tier from `subscription.metadata.tier` which is set during checkout session creation as `tier.split('_')[0]`. For `starter_monthly` → `'starter'`. For `professional_monthly` → `'professional'`. But the AC uses `'starter'|'pro'|'team'`. Confirm which values `plan_tier` column accepts and ensure consistency.

**Issue 3 — Webhook URL must be registered in Stripe Dashboard:**  
Vercel deployment URL: `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`  
This must be added as a webhook endpoint in Stripe Dashboard with events:
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

**Issue 4 — No validation that checkout endpoint requires auth:**  
The `/api/billing/create-checkout` endpoint currently validates that the agent exists by ID but does NOT verify the caller is authenticated as that agent. A malicious user could create checkout sessions for any agent ID.  
**Fix:** Require valid session/JWT before creating checkout sessions. Verify the authenticated user's ID matches `agentId`.

### Files to Modify
- `product/lead-response/dashboard/app/api/billing/create-checkout/route.ts` — add auth check, fix invalid price ID fallbacks
- `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` — verify plan_tier values match DB enum
- `product/lead-response/dashboard/app/api/stripe/portal-session/route.ts` — review and ensure auth check
- `tests/integrated/stripe-production-smoke.test.js` — **create** (new file)

### Environment Variables Checklist for Vercel
Dev agent must verify these exist in Vercel project settings (not just local `.env`):
```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for staging)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_ANNUAL=price_...
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_PROFESSIONAL_ANNUAL=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_ANNUAL=price_...
```

---

## Security Requirements

Per SOUL.md mandatory security standards:

- **Auth middleware:** `/api/billing/create-checkout` and `/api/stripe/portal-session` MUST verify the caller's session matches the `agentId` being billed — prevents IDOR attacks
- **Webhook signature:** Already implemented via `stripe.webhooks.constructEvent()` — confirm `STRIPE_WEBHOOK_SECRET` is set in Vercel
- **No secrets in logs:** Confirm webhook handler doesn't log full request body (which could contain card data in edge cases)
- **Rate limiting:** The checkout creation endpoint should be rate-limited (max 5 requests/minute per IP) to prevent abuse
- **Input validation:** Validate `tier` is one of the known enum values before passing to Stripe; validate `agentId` is a valid UUID format

---

## Out of Scope

- Refund flows
- Dunning / failed payment retry emails
- Annual billing proration
- Coupon/discount code creation (allow_promotion_codes is already enabled)
- Brokerage ($999+) white-label tier

---

## Definition of Done

1. ✅ All 7 Acceptance Criteria verified with evidence (screenshots or test output)
2. ✅ Smoke test runs green against production Vercel deployment
3. ✅ Stripe Dashboard shows test transaction processed
4. ✅ Supabase `real_estate_agents` row updated correctly
5. ✅ Auth check added to checkout creation endpoint
6. ✅ PM sign-off (Stojan confirms Stripe keys are set in Vercel AND reviews billing flow manually)

---

## Human Validation Test (Stojan)

After implementation, Stojan performs this manual test:

1. Open `https://leadflow-ai-five.vercel.app/pricing` in incognito
2. Click "Get Started" on Starter plan
3. Complete checkout with Stripe test card: `4242 4242 4242 4242`, exp `12/29`, CVC `123`
4. Confirm redirect to dashboard with success message
5. Open Supabase → `real_estate_agents` → confirm `plan_tier = 'starter'` and `stripe_customer_id` set
6. Open Stripe Dashboard → Customers → confirm new customer created
7. Go to dashboard Settings/Billing → click "Manage Billing" → confirm Stripe portal opens
8. **Sign off:** "Stripe checkout production verified ✅"
