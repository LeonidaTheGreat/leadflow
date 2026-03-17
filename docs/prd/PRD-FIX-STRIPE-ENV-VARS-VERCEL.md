# PRD: Fix — STRIPE_SECRET_KEY & STRIPE_WEBHOOK_SECRET Missing from Vercel Production

**PRD ID:** prd-fix-stripe-env-vars-vercel  
**Status:** approved  
**Severity:** Critical — blocks all billing transactions  
**Created:** 2025-01-24  
**Related Use Cases:**  
- `fix-stripe-secret-key-not-set-in-vercel-production`  
- `fix-stripe-webhook-secret-not-set-in-vercel-production`

---

## Problem

Both `/api/billing/create-checkout` and `/api/webhooks/stripe` return `{"error":"Stripe not configured"}` (HTTP 503) in production. This means **zero transactions are possible**. No agent can upgrade, no payment can be processed, no subscription can activate.

Root cause: `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are not set in the `leadflow-ai` Vercel project's environment variables.

**Note:** Five previous tasks attempted to fix this. All were marked DONE but the endpoints remain broken. The root cause is that dev agents cannot set Vercel environment variables programmatically without Vercel API token access — this requires human action or a specific Vercel API call.

---

## Who Does This

This is a **2-minute human task for Stojan** — not a coding task. The fix is to add two environment variables in Vercel Dashboard. An action item has been inserted to the dashboard for immediate action.

Fallback: If Stojan cannot do it immediately, a dev agent can use `vercel env add` CLI command (see Acceptance Criteria).

---

## Requirements

### R1 — STRIPE_SECRET_KEY in Vercel Production

The Vercel project `leadflow-ai` must have `STRIPE_SECRET_KEY` set to the live Stripe secret key (`sk_live_...`) for the **Production** environment.

- **Not** the test key (`sk_test_...`) — production endpoints must use live keys
- Apply to: Production environment (and optionally Preview)
- Obtain from: Stripe Dashboard → Developers → API keys → Secret key

### R2 — STRIPE_WEBHOOK_SECRET in Vercel Production

The Vercel project `leadflow-ai` must have `STRIPE_WEBHOOK_SECRET` set to the Stripe webhook signing secret (`whsec_...`) for the **Production** environment.

- The webhook endpoint must be registered in Stripe Dashboard pointing to: `https://leadflow-ai.vercel.app/api/webhooks/stripe`
- Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Obtain `whsec_...` from: Stripe Dashboard → Developers → Webhooks → [your endpoint] → Signing secret

### R3 — No Code Changes Required

The application code in `app/api/billing/create-checkout/route.ts` and `app/api/webhooks/stripe/route.ts` already correctly reads these env vars. **No code changes are needed.** The fix is purely configuration.

---

## How to Fix (Human Checklist for Stojan)

### Option A — Vercel Dashboard (Recommended, 2 minutes)

1. Go to https://vercel.com/dashboard
2. Select project: **leadflow-ai**
3. Settings → Environment Variables
4. Add: `STRIPE_SECRET_KEY` = `sk_live_...` (Environment: Production)
5. Add: `STRIPE_WEBHOOK_SECRET` = `whsec_...` (Environment: Production)
6. Click Save
7. **Redeploy** — go to Deployments tab → latest deployment → "..." → Redeploy (env vars only take effect after redeploy)

### Option B — Vercel CLI (Dev agent can do this if Vercel API token is available)

```bash
# Authenticate first (requires VERCEL_TOKEN env var or interactive login)
vercel env add STRIPE_SECRET_KEY production
# (paste the sk_live_... value when prompted)

vercel env add STRIPE_WEBHOOK_SECRET production
# (paste the whsec_... value when prompted)

# Then redeploy
vercel --prod
```

---

## Acceptance Criteria

### AC1 — Checkout endpoint returns non-503

```bash
curl -X POST https://leadflow-ai.vercel.app/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId": "price_test", "agentId": "test"}'
```

Expected: Response is NOT `{"error":"Stripe not configured"}`. May return a Stripe error (invalid price, auth required) — that is acceptable. A 503 with "Stripe not configured" is a FAIL.

### AC2 — Webhook endpoint returns non-503

```bash
curl -X POST https://leadflow-ai.vercel.app/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: Returns 400 (bad signature) or similar — NOT 503 "Stripe not configured".

### AC3 — Full checkout flow completes

Using Stripe test mode credentials (after confirming live env vars are set):
1. Navigate to LeadFlow dashboard → Upgrade
2. Click a pricing plan
3. Stripe Checkout page opens (not a 503 error page)
4. Enter test card `4242 4242 4242 4242`
5. Payment completes
6. Agent subscription status updates in Supabase `agents` table

This is the human acceptance test Stojan must perform.

---

## Definition of Done

- [ ] `STRIPE_SECRET_KEY` set in Vercel production environment
- [ ] `STRIPE_WEBHOOK_SECRET` set in Vercel production environment
- [ ] Production redeployed after env var changes
- [ ] AC1 passes (no 503 from checkout endpoint)
- [ ] AC2 passes (no 503 from webhook endpoint)
- [ ] AC3 passes (Stojan completes a test transaction)
- [ ] Use cases `fix-stripe-secret-key-not-set-in-vercel-production` and `fix-stripe-webhook-secret-not-set-in-vercel-production` updated to `complete`

---

## Why Previous Attempts Failed

Five previous tasks were marked DONE but the issue persists. Likely causes:
1. Dev agents verified env vars exist locally in `.env.local` but not in Vercel dashboard
2. Scripts that set env vars weren't actually executed (no_commits_on_branch)
3. No human validation step was required

**This PRD escalates to human action** via a dashboard action_item. Stojan must set these variables manually.

---

## Revenue Impact

CRITICAL — blocks 100% of billing transactions. No agent can upgrade. No revenue until fixed.
