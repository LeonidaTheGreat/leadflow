# STRIPE_SECRET_KEY & STRIPE_WEBHOOK_SECRET Fix — Status Report

**Task ID:** bfab5595-1fc9-49d9-9ff6-598bd72c6949  
**Branch:** dev/bfab5595-dev-fix-stripe-secret-key-not-set-in-ver  
**Status:** BLOCKED - Requires Human Action  
**Date:** 2026-03-15

---

## Issue Verified ✅

The following have been confirmed:

1. **Code is correct.** Both endpoints properly check for `STRIPE_SECRET_KEY`:
   - `/api/billing/create-checkout/route.ts` (line 4-5): Creates Stripe client only if key exists
   - `/api/webhooks/stripe/route.ts` (line 4-5): Creates Stripe client only if key exists
   - Both return HTTP 503 with `{ error: 'Stripe not configured' }` if missing

2. **Environment vars are missing from Vercel production.** Verified via `vercel env ls`:
   - ✗ `STRIPE_SECRET_KEY` — NOT PRESENT in production
   - ✗ `STRIPE_WEBHOOK_SECRET` — NOT PRESENT in production
   - Other billing-related vars (price IDs) ARE present and configured

3. **No real Stripe keys found in repository.** All references in `.env.local`, docs, and config files contain placeholder values only:
   - `STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key_here`
   - `STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here`

---

## What Needs to Happen (Human Action)

**Assigned to:** Stojan (project owner)  
**Time Required:** 5 minutes  
**Complexity:** Straightforward configuration

### Step 1: Get Live Stripe Keys

1. Go to **Stripe Dashboard** → https://dashboard.stripe.com/
2. Navigate to **Developers** → **API keys**
3. Ensure you are in **Live mode** (NOT test mode)
4. Copy the **Secret key** (starts with `sk_live_...`)
5. Navigate to **Webhooks**
6. Find the endpoint: `https://leadflow-ai.vercel.app/api/webhooks/stripe`
7. If it doesn't exist, create it with these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
8. Copy the **Signing secret** (starts with `whsec_...`)

### Step 2: Add to Vercel Production

**Option A: Vercel Dashboard (Recommended)**
1. Go to https://vercel.com/dashboard
2. Select **leadflow-ai** project
3. Settings → **Environment Variables**
4. Click **Add New** and create:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** Paste the `sk_live_...` key from Stripe
   - **Environment:** Production (and optionally Preview/Development)
5. Click **Add New** again for:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** Paste the `whsec_...` key from Stripe
   - **Environment:** Production (and optionally Preview/Development)
6. Click **Save**
7. Go to **Deployments** tab → latest deployment → **⋮** menu → **Redeploy** (REQUIRED for env vars to take effect)

**Option B: Vercel CLI** (if dashboard unavailable)
```bash
cd product/lead-response/dashboard
vercel env add STRIPE_SECRET_KEY --environment production
# Paste sk_live_... when prompted

vercel env add STRIPE_WEBHOOK_SECRET --environment production
# Paste whsec_... when prompted

vercel --prod
```

### Step 3: Verify the Fix

Run the Acceptance Criteria tests:

```bash
# AC1: Checkout endpoint should NOT return 503 "Stripe not configured"
curl -X POST https://leadflow-ai.vercel.app/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"tier": "starter_monthly", "agentId": "00000000-0000-0000-0000-000000000000", "email": "test@example.com"}'

# Expected: 400 (invalid agent) or 404 (agent not found) — NOT 503

# AC2: Webhook endpoint should NOT return 503 "Stripe not configured"
curl -X POST https://leadflow-ai.vercel.app/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 (bad signature) — NOT 503

# AC3: Full end-to-end checkout flow
# 1. Navigate to https://leadflow-ai.vercel.app/dashboard
# 2. Click "Upgrade" → Select a plan
# 3. Stripe Checkout page should load (NOT a 503 error)
# 4. Complete test transaction with card: 4242 4242 4242 4242
# 5. Verify subscription created in Supabase (real_estate_agents.stripe_subscription_id)
```

---

## Why This Is a Human Task

As documented in the PRD:
- Vercel's environment variable API requires authentication that only works with personal Vercel accounts or organization API tokens
- Dev agents don't have access to live Stripe keys (security by design)
- Live keys are secrets that should be managed by humans/business owners, not stored in code or accessible by CI/CD agents
- The code is already correct — it just needs the configuration

---

## Files Verified

✓ `/product/lead-response/dashboard/app/api/billing/create-checkout/route.ts`  
✓ `/product/lead-response/dashboard/app/api/webhooks/stripe/route.ts`  
✓ Vercel CLI authentication confirmed  
✓ Project structure and routing confirmed  

---

## Next Steps

1. **Stojan** completes the 5-minute setup above
2. Runs the AC tests to confirm endpoints work
3. **Orchestrator** moves task to QC review
4. QC marks task `complete`

This is not a code issue. This is a deployment configuration that requires human secret management.
