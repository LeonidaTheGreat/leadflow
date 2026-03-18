# Stripe Webhook Secret Verification & Setup Guide

**Status:** Configuration Required  
**Severity:** High  
**Task ID:** 8cbc844c-c004-4e67-9d2f-43164bc967b7

## Overview

The LeadFlow billing system relies on Stripe webhooks for subscription lifecycle management. The webhook secret (`STRIPE_WEBHOOK_SECRET`) must be configured in Vercel production environment for:

- Checkout completion handling
- Payment success/failure tracking
- Subscription status updates
- Revenue reporting

## Current Status

### What's Configured ✅
- Webhook handler endpoint: `/api/webhooks/stripe`
- Event handlers for:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`
- Supabase integration for webhook data storage

### What's Missing ❌
- **STRIPE_WEBHOOK_SECRET** — Not set in Vercel `leadflow-ai` production
- **STRIPE_SECRET_KEY** — Not set in Vercel `leadflow-ai` production
- **Both secrets** — Also missing from `fub-inbound-webhook` project

## Verification Steps

### 1. Check Current Status
```bash
# Check leadflow-ai project
cd product/lead-response/dashboard
vercel env ls

# Check fub-inbound-webhook project
cd ../../fub-inbound-webhook  # or wherever it is
vercel env ls
```

**Expected output:** Both `STRIPE_WEBHOOK_SECRET` and `STRIPE_SECRET_KEY` should be listed.

### 2. Run Verification Tests
```bash
# Test the webhook endpoint
node tests/fix-stripe-webhook-secret-not-set-in-vercel-production.e2e.test.js

# Run full Stripe verification
node scripts/verify-stripe-webhook-secret.js
```

**Expected results:**
- ✅ Webhook endpoint returns HTTP 400 (bad signature), NOT 503
- ✅ Checkout endpoint returns non-503 response
- ✅ No "Stripe not configured" error messages

## Setup Instructions

### Step 1: Get Stripe Credentials

1. Go to **https://dashboard.stripe.com/test/webhooks**
2. Find your webhook endpoint:
   - For `leadflow-ai`: `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`
   - For `fub-inbound-webhook`: Your configured endpoint
3. Click the endpoint to view details
4. Find "Signing secret" and click "Reveal"
5. Copy the secret (format: `whsec_...`)

Also get your API keys:
1. Go to **https://dashboard.stripe.com/test/apikeys**
2. Copy the **Secret key** (format: `sk_test_...` or `sk_live_...`)

### Step 2: Add to Vercel (Automated)

**Using the provided setup script:**

```bash
# Interactive mode (prompts for credentials)
node scripts/setup-stripe-webhook-production.js leadflow-ai

# Or non-interactive (pipe credentials)
echo -e "whsec_...\nsk_test_..." | node scripts/setup-stripe-webhook-production.js leadflow-ai
```

This script will:
1. Validate secret format
2. Verify Vercel authentication
3. Add both secrets to production environment
4. Verify they were added successfully

### Step 3: Manual Setup (If Script Fails)

**Via Vercel CLI:**
```bash
cd product/lead-response/dashboard

# Add webhook secret
echo "whsec_..." | vercel env add STRIPE_WEBHOOK_SECRET production --yes --sensitive

# Add API secret
echo "sk_test_..." | vercel env add STRIPE_SECRET_KEY production --yes --sensitive

# Verify
vercel env ls
```

**Via Vercel Dashboard:**
1. Go to **https://vercel.com/dashboard**
2. Select your project (`leadflow-ai`)
3. Go to **Settings** → **Environment Variables**
4. Add new variables:
   - Name: `STRIPE_WEBHOOK_SECRET`, Value: `whsec_...`, Environment: Production
   - Name: `STRIPE_SECRET_KEY`, Value: `sk_test_...`, Environment: Production
5. Click "Save"

### Step 4: Redeploy to Production

After adding environment variables, redeploy the application:

```bash
cd product/lead-response/dashboard
vercel --prod
```

**Wait for deployment to complete.** This typically takes 1-2 minutes.

### Step 5: Verify Configuration

Once deployment is complete, run:

```bash
node scripts/verify-stripe-webhook-secret.js
```

**Expected output:**
```
✅ STRIPE_WEBHOOK_SECRET found in Vercel environment variables
✅ Webhook endpoint returned HTTP 400 (bad signature)
   This is correct — means STRIPE_WEBHOOK_SECRET is set
✅ E2E tests passed
```

## Troubleshooting

### "Stripe not configured" Error

**Cause:** `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` not set in Vercel

**Solution:**
1. Verify both are set: `vercel env ls`
2. Check they're in the **Production** environment
3. Redeploy: `vercel --prod`
4. Wait 2-3 minutes for new deployment

### "Webhook signature verification failed"

**Cause:** Wrong webhook secret or secret not synchronized with Stripe

**Solution:**
1. Go to Stripe Dashboard → Webhooks
2. Get the CURRENT secret from "Signing secret" → "Reveal"
3. Update in Vercel: `vercel env add STRIPE_WEBHOOK_SECRET production --force`
4. Redeploy: `vercel --prod`

### Environment Variable Not Appearing in Vercel

**Solution:**
1. Delete and re-add the variable: `vercel env rm STRIPE_WEBHOOK_SECRET`
2. Add it again: `vercel env add STRIPE_WEBHOOK_SECRET production --yes --sensitive`
3. Verify: `vercel env ls`

### Test Secrets vs Live Secrets

**Important:** Use appropriate secret types based on mode:

| Mode | Secret Format | Source |
|------|--------------|--------|
| Test | `whsec_test_...` | https://dashboard.stripe.com/**test**/webhooks |
| Live | `whsec_live_...` | https://dashboard.stripe.com/webhooks |
| API (Test) | `sk_test_...` | https://dashboard.stripe.com/**test**/apikeys |
| API (Live) | `sk_live_...` | https://dashboard.stripe.com/apikeys |

For development/staging, use **test** secrets.  
For production, use **live** secrets.

## Testing Webhooks

### Option 1: Stripe CLI (Local)

```bash
# Forward webhooks from Stripe to local development
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.paid
```

### Option 2: Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click your endpoint
3. Scroll to "Recent Events"
4. Select an event type
5. Click "Send test event"

### Option 3: Test Script

```bash
node scripts/test-stripe-webhook.js
```

## Related Documentation

- **Webhook Handler:** `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts`
- **Billing Integration:** `product/lead-response/dashboard/app/api/billing/create-checkout/route.ts`
- **Stripe Integration Setup:** `docs/STRIPE_WEBHOOK_SETUP.md`
- **Database Schema:** See `subscriptions` table in Supabase

## Files Involved

### Configuration
- `.env` — Local development (has placeholders)
- `.env.local` — Local overrides
- `product/lead-response/dashboard/.env.local` — Dashboard env

### Verification Scripts
- `scripts/verify-stripe-webhook-secret.js` — Full verification
- `scripts/setup-stripe-webhook-production.js` — Automated setup
- `tests/fix-stripe-webhook-secret-not-set-in-vercel-production.e2e.test.js` — E2E test

### Implementation
- `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` — Webhook handler
- `lib/webhook-handler.js` — Event processing

## Acceptance Criteria

✅ `STRIPE_WEBHOOK_SECRET` is set in Vercel `leadflow-ai` production  
✅ `STRIPE_SECRET_KEY` is set in Vercel `leadflow-ai` production  
✅ `STRIPE_WEBHOOK_SECRET` is set in Vercel `fub-inbound-webhook` production  
✅ Webhook endpoint returns HTTP 400 (not 503) for test requests  
✅ E2E tests pass: `fix-stripe-webhook-secret-not-set-in-vercel-production.e2e.test.js`  
✅ Webhooks are received and processed by Supabase  

## Monitoring & Support

### After Successful Setup

Monitor webhook deliveries:
- **Stripe Dashboard:** https://dashboard.stripe.com/webhooks
- **Application Logs:** Check Vercel deployment logs
- **Database:** Check `subscription_events` table in Supabase

### Getting Help

If issues persist after setup:
1. Check Vercel deployment logs: `vercel logs`
2. Check Stripe webhook delivery logs (Stripe Dashboard → Webhooks → Your endpoint → Recent events)
3. Check application error logs in Supabase
4. Verify network connectivity to webhook endpoint

---

**Last Updated:** 2026-03-18  
**Task Status:** In Progress  
**Responsible:** Dev Agent
