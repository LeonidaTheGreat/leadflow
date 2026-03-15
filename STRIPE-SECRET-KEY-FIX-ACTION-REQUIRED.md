# STRIPE_SECRET_KEY Missing — Action Required

**Task ID:** 7f5fe169-8549-4f38-b0c6-01d60c84fc2c  
**Branch:** dev/7f5fe169-dev-fix-stripe-secret-key-missing-from-v  
**Date:** 2026-03-15  
**Status:** BLOCKED — Requires Stripe Account Access

---

## Issue Summary

✅ **Verified:** STRIPE_SECRET_KEY is NOT configured in Vercel production  
✅ **Impact Confirmed:** https://leadflow-ai-five.vercel.app/api/stripe/portal-session returns HTTP 503 `{"error":"Stripe not configured"}`  
✅ **Code Ready:** Billing API routes are correctly implemented and check for the key  
❌ **Blocker:** Actual Stripe API secret key is not available in repository or codebase

---

## Root Cause

The project's `.env.local` file contains only a **placeholder** value:
```
STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key_here
```

This placeholder was never replaced with the actual key from the Stripe account. The key must be obtained directly from the Stripe Dashboard and cannot be generated or inferred.

---

## What Has Been Verified

| Check | Result | Details |
|-------|--------|---------|
| Code implementation | ✅ PASS | `/api/billing/create-checkout/route.ts` correctly checks for key |
| Vercel CLI access | ✅ PASS | `vercel env ls` confirmed missing |
| Environment files | ✅ PASS | Searched all .env*, .js, .md files — no real keys found |
| Git history | ✅ PASS | Checked all commits — only placeholders |
| System deployment | ✅ LIVE | Vercel app is deployed and accessible |
| Stripe price IDs | ✅ SET | NEXT_PUBLIC_STRIPE_PRICE_* already configured in Vercel (7d ago) |

---

## What Needs to Happen (Human Action Required)

**Assigned to:** Stojan (Project Owner) or team member with Stripe account access  
**Time Required:** 5-10 minutes  
**Complexity:** Straightforward dashboard access

### Step 1: Get the Secret Key from Stripe Dashboard

1. Go to: **https://dashboard.stripe.com/apikeys**
2. Log in with your Stripe account credentials
3. Ensure you're in **Live Mode** (toggle in top-right corner)
4. Copy the **Secret key** (starts with `sk_live_`)
   - ⚠️ **IMPORTANT:** Use **Live** mode keys for production, not test mode
   - Test keys start with `sk_test_` and will not work with real payments
5. Note down the key (example format): `sk_live_51HzP4CKqCbqjLIUi...` (50+ characters)

### Step 2: Add to Vercel (Production Environment)

**Option A: Using Vercel CLI (Faster)**
```bash
cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard

# Set STRIPE_SECRET_KEY
vercel env add STRIPE_SECRET_KEY production
# When prompted, paste your sk_live_... key from Step 1

# Set STRIPE_WEBHOOK_SECRET (also needed but currently missing)
# Get this from: Stripe Dashboard → Developers → Webhooks → Select endpoint
vercel env add STRIPE_WEBHOOK_SECRET production
# When prompted, paste your whsec_... webhook signing secret

# Deploy to production with new env vars
vercel --prod
```

**Option B: Via Vercel Dashboard (Recommended for verification)**
1. Go to: **https://vercel.com/dashboard**
2. Click on **leadflow-ai** project
3. Go to **Settings → Environment Variables**
4. Click **Add New**:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** Paste your `sk_live_...` key
   - **Environment:** Production
   - Click **Save**
5. Repeat for `STRIPE_WEBHOOK_SECRET`:
   - **Name:** `STRIPE_WEBHOOK_SECRET`
   - **Value:** Paste your `whsec_...` key  
   - **Environment:** Production
   - Click **Save**
6. Go to **Deployments** tab → Click on latest deployment
7. Click **⋮** menu → **Redeploy** (CRITICAL: env vars don't take effect until redeployed)

### Step 3: Verify the Fix

Once keys are added and deployment is complete:

```bash
# Test the portal session endpoint
curl -X POST https://leadflow-ai-five.vercel.app/api/stripe/portal-session \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cus_test123"}'

# Expected response: either a valid Stripe URL or an error about missing customerId
# NOT the "Stripe not configured" error
```

---

## Related Blockers

Both of these are blocked by the same missing key:
- ❌ STRIPE_WEBHOOK_SECRET (also missing)
- ❌ STRIPE_PRICE_IDs (already set, but won't work without secret key)

Once STRIPE_SECRET_KEY is added, STRIPE_WEBHOOK_SECRET should also be configured to allow webhooks to function.

---

## Files That Document This

- `STRIPE_ENV_SETUP.md` — Setup guide
- `docs/prd/PRD-FIX-STRIPE-ENV-VARS-VERCEL.md` — PRD documentation
- `scripts/shell/setup-stripe-env-production.sh` — Automated setup script (requires manual key input)
- `STRIPE-ENV-VARS-FIX-STATUS.md` — Status from previous attempt (PR #326)

---

## Developer Action Taken

This branch (`dev/7f5fe169-dev-fix-stripe-secret-key-missing-from-v`) has:
- ✅ Verified the issue exists
- ✅ Confirmed code is correct
- ✅ Searched all files for actual keys (none found)
- ✅ Confirmed Vercel deployment is live
- ✅ Created this action document
- ⏳ **Waiting for:** Stripe API key from project owner

---

## Next Steps

1. **Project Owner:** Obtain STRIPE_SECRET_KEY from Stripe Dashboard (live mode)
2. **Project Owner:** Add both STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to Vercel
3. **Dev Agent:** Will be notified to verify deployment and close task

---

## Command to Add Key (Once Available)

For the dev agent (once keys are available):
```bash
cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard
vercel env add STRIPE_SECRET_KEY production  # Paste: sk_live_...
vercel env add STRIPE_WEBHOOK_SECRET production  # Paste: whsec_...
vercel --prod
```

Then verify at: `https://leadflow-ai-five.vercel.app/api/stripe/portal-session`

---

**Last Updated:** 2026-03-15  
**Status:** Awaiting Human Action
