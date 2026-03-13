# Stripe Webhook Setup Guide

## Overview
This guide walks through configuring Stripe webhooks for LeadFlow billing integration.

## Webhook Endpoint
```
https://leadflow-dev.vercel.app/api/webhooks/stripe
```

## Events to Configure

| Event | Description |
|-------|-------------|
| `checkout.session.completed` | Triggered when a customer completes checkout and subscription is created |
| `customer.subscription.updated` | Triggered when subscription is updated (plan change, etc.) |
| `customer.subscription.deleted` | Triggered when subscription is cancelled |
| `invoice.paid` | Triggered when an invoice payment succeeds |

## Step-by-Step Configuration

### 1. Access Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/webhooks
2. Log in with your Stripe account credentials
3. Make sure you're in **Test Mode** (toggle in top-right)

### 2. Create Webhook Endpoint
1. Click **"Add an endpoint"** button
2. Enter the endpoint URL:
   ```
   https://leadflow-dev.vercel.app/api/webhooks/stripe
   ```
3. Click **"Select events"**

### 3. Select Events
Check these events:
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.paid`

Click **"Add endpoint"** to save.

### 4. Get Webhook Signing Secret
1. After creating the endpoint, you'll see the **"Signing secret"** section
2. Click **"Reveal"** to show the secret
3. Copy the secret (starts with `whsec_`)

### 5. Update Environment Variables

#### Option A: Using the setup script
```bash
node scripts/setup-stripe-webhook.js whsec_your_actual_secret_here
```

#### Option B: Manual update
Edit `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

### 6. Deploy to Production

Update Vercel environment variables:
```bash
vercel env add STRIPE_WEBHOOK_SECRET
# Enter the webhook secret when prompted
vercel --prod
```

Or via Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add: `STRIPE_WEBHOOK_SECRET`
5. Redeploy the project

## Testing the Webhook

### Option 1: Using Stripe CLI (Recommended)
```bash
# Install Stripe CLI if not already installed
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local dev
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.paid
```

### Option 2: Using the Test Script
```bash
node scripts/test-stripe-webhook.js
```

### Option 3: Manual Test via Dashboard
1. Go to your webhook endpoint in Stripe Dashboard
2. Click **"Send test event"**
3. Select an event type
4. Click **"Send test event"**
5. Check your application logs for the webhook payload

## Webhook Handler Implementation

The webhook handler is located at:
```
product/lead-response/dashboard/app/api/webhooks/stripe/route.ts
```

It handles:
- Creating/updating agent subscription records in Supabase
- Recording payment events
- Updating MRR (Monthly Recurring Revenue) calculations
- Logging subscription lifecycle events

## Troubleshooting

### Signature Verification Failed
- Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from Stripe Dashboard
- Make sure you're using the correct endpoint URL
- Check that the webhook is configured in the correct mode (test vs live)

### 405 Method Not Allowed
- The endpoint only accepts POST requests
- Ensure your HTTP client is sending POST, not GET

### 500 Server Error
- Check application logs for errors
- Verify Supabase connection is configured
- Ensure `STRIPE_SECRET_KEY` is set correctly

## Security Notes

1. **Never commit webhook secrets to git**
   - `.env.local` is in `.gitignore`
   - Always use environment variables for secrets

2. **Verify webhook signatures**
   - The handler uses `stripe.webhooks.constructEvent()` to verify
   - This prevents spoofed webhook requests

3. **Use different secrets for test and live**
   - Test mode webhooks have different secrets than live mode
   - Use separate Vercel environments if needed

## Files Modified/Created

- `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts` - Webhook handler
- `scripts/setup-stripe-webhook.js` - Helper script to update .env.local
- `scripts/test-stripe-webhook.js` - Test script to verify configuration
- `.env.local` - Environment variables (updated with your secret)
