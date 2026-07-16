# Stripe Setup Guide

How to create Stripe products/prices and configure the Vercel environment variables so that checkout works.

## 1. Create Products in Stripe Dashboard

Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products) and create three products:

| Product Name | Monthly Price | Description |
|-------------|--------------|-------------|
| LeadFlow Starter | $49/mo | 100 SMS, basic AI response |
| LeadFlow Pro | $149/mo | Unlimited SMS, full AI, priority support |
| LeadFlow Team | $399/mo | Up to 5 agents, team dashboard |

For each product:
1. Click **Add product**
2. Enter the name and description
3. Add a **Recurring** price with the monthly amount
4. Optionally add an **Annual** price (e.g., $490/year for Starter)
5. After creating, copy the **Price ID** (looks like `price_1AbCDEFGHIJKLMN`)

## 2. Set Vercel Environment Variables

Go to [Vercel Dashboard > leadflow-ai > Settings > Environment Variables](https://vercel.com/stojans-projects-7db98187/leadflow-ai/settings/environment-variables).

Set these variables for **Production** (and Preview/Development if needed):

### Required for Checkout

| Variable | Value | Example |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | Your Stripe secret key | `sk_live_51Ab...` or `sk_test_51Ab...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` |
| `STRIPE_PRICE_STARTER_MONTHLY` | Starter monthly price ID | `price_1QvIEf2eZvKYlo2C...` |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro monthly price ID | `price_1QvIFg3fAwLZmp3D...` |
| `STRIPE_PRICE_TEAM_MONTHLY` | Team monthly price ID | `price_1QvIGh4gBxMAno4E...` |

### Optional (annual billing)

| Variable | Value |
|----------|-------|
| `STRIPE_PRICE_STARTER_ANNUAL` | Starter annual price ID |
| `STRIPE_PRICE_PRO_ANNUAL` | Pro annual price ID |
| `STRIPE_PRICE_TEAM_ANNUAL` | Team annual price ID |

### Required for Email

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | Resend API key for transactional email |
| `FROM_EMAIL` | Sender address (e.g., `stojan@landyourleads.com`) |

## 3. Verify Configuration

After setting the env vars and redeploying, check:

```
GET /api/admin/revenue-config-health
```

This endpoint (requires admin auth) returns the status of all revenue-related config. You can also see it on the **Activation** admin page as a banner at the top.

Expected response when everything is configured:

```json
{
  "stripe": {
    "ok": true,
    "secretKey": "valid",
    "webhookSecret": "set",
    "prices": { "valid": [...], "missing": [], "placeholder": [] }
  },
  "email": { "ok": true, "resendApiKey": "set", "domain": "landyourleads.com" },
  "overall": "ok"
}
```

## 4. Common Issues

**"PRICE_NOT_CONFIGURED" on checkout:**
The price env var is either missing or set to a placeholder like `price_starter_49`. Real Stripe price IDs look like `price_1QvIEf2eZvKYlo2CkuDLQABG` (14+ alphanumeric characters after `price_`).

**Checkout creates session but payment fails:**
Make sure you're using the correct mode (`sk_live_*` for production, `sk_test_*` for testing). Live and test price IDs are different.

**Webhook events not arriving:**
Create a webhook endpoint in [Stripe Dashboard > Developers > Webhooks](https://dashboard.stripe.com/webhooks) pointing to `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`. Subscribe to events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`.
