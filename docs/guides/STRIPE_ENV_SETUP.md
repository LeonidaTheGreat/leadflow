# Stripe Environment Variables Setup Guide

## Status
- ✅ `.env.local` file created with structure
- ✅ Vercel deployment script ready
- ✅ Verification script ready
- ⏳ Waiting for actual Price IDs from Stripe Dashboard

---

## Steps to Complete Setup

### Step 1: Get Price IDs from Stripe Test Dashboard

1. Log into Stripe Test Dashboard:
   ```
   https://dashboard.stripe.com/test/products
   ```

2. If products don't exist, create them:
   - **Basic Plan** - $29/month
   - **Pro Plan** - $149/month  
   - **Enterprise Plan** - $499/month

3. For each product, copy the **Price ID** (starts with `price_`)

---

### Step 2: Update `.env.local`

Edit `.env.local` and replace the placeholder values:

```bash
# Replace these with actual values from Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...        # $29 plan
STRIPE_PRICE_ID_PRO=price_...          # $149 plan
STRIPE_PRICE_ID_ENTERPRISE=price_...   # $499 plan
```

---

### Step 3: Verify Local Setup

Run the verification script:
```bash
node verify-stripe-env.js
```

You should see all green checkmarks.

---

### Step 4: Add to Vercel Production

Run the setup script:
```bash
./setup-stripe-env-production.sh
```

Or manually add via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your LeadFlow project
3. Go to Settings → Environment Variables
4. Add each variable:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_ID_BASIC`
   - `STRIPE_PRICE_ID_PRO`
   - `STRIPE_PRICE_ID_ENTERPRISE`

---

### Step 5: Deploy and Verify

```bash
# Deploy to production
vercel --prod

# Or if using git push, redeploy will pick up new env vars
```

---

## Verification Checklist

- [ ] Logged into Stripe Test Dashboard
- [ ] Copied Price ID for Basic ($29) plan
- [ ] Copied Price ID for Pro ($149) plan
- [ ] Copied Price ID for Enterprise ($499) plan
- [ ] Updated `.env.local` with all values
- [ ] Ran `node verify-stripe-env.js` locally (all passed)
- [ ] Added variables to Vercel production
- [ ] Deployed to production
- [ ] Verified in production environment

---

## Files Created

| File | Purpose |
|------|---------|
| `.env.local` | Local environment variables with placeholders |
| `setup-stripe-env-production.sh` | Interactive script to add env vars to Vercel |
| `verify-stripe-env.js` | Verification script to check all variables |
| `STRIPE_ENV_SETUP.md` | This guide |

---

## Troubleshooting

### "Missing STRIPE_SECRET_KEY"
Get your test secret key from: https://dashboard.stripe.com/test/apikeys

### "Missing STRIPE_WEBHOOK_SECRET"
Create a webhook endpoint first, then copy the signing secret from the webhook details page.

### "Price ID not found"
Make sure you're in **Test Mode** (toggle at top-right of Stripe Dashboard).

### Legacy aliases mismatch
The system supports both naming conventions:
- `STRIPE_PRICE_ID_BASIC` (new)
- `STRIPE_PRICE_STARTER_MONTHLY` (legacy)

Both should point to the same Price ID.

---

## Support

For Stripe-related questions:
- Stripe Docs: https://stripe.com/docs
- Price ID help: https://stripe.com/docs/products-prices/manage-prices

For LeadFlow billing questions:
- See: `STRIPE_SUBSCRIPTIONS_COMPLETE.md`
- See: `docs/guides/STRIPE_SUBSCRIPTIONS_GUIDE.md`
