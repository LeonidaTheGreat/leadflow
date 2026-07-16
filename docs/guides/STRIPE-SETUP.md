# Stripe Setup Guide

This guide walks through creating Stripe products/prices and setting the required
Vercel environment variables so LeadFlow checkout works end-to-end.

## Prerequisites

- Stripe account (test mode first, live mode for production)
- Access to the Vercel project `leadflow-ai` (dashboard) environment variables

---

## Step 1 — Create Products in Stripe Dashboard

Go to **Stripe Dashboard → Products → Add product** and create the following three products:

| Product name | Price | Billing |
|---|---|---|
| LeadFlow Starter | $49.00/month | Monthly recurring |
| LeadFlow Pro | $149.00/month | Monthly recurring |
| LeadFlow Team | $399.00/month | Monthly recurring |

For each product:
1. Click **Add product**
2. Enter the product name (e.g. "LeadFlow Starter")
3. Under **Pricing**, select **Recurring**, interval **Monthly**
4. Enter the price (e.g. $49.00)
5. Click **Save product**
6. After saving, the product page shows the **Price ID** — it looks like `price_1AbCDEFGHIJKLMN` (NOT `price_starter_49`)
7. Copy that Price ID

Repeat for all three tiers.

---

## Step 2 — Set Vercel Environment Variables

Go to **Vercel → leadflow-ai project → Settings → Environment Variables**.

Add or update these variables for **Production** (and Preview if you want staging to work):

| Variable name | Value | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` | From Stripe Dashboard → Developers → API keys |
| `STRIPE_PRICE_STARTER_MONTHLY` | `price_1AbC...` | Price ID for LeadFlow Starter ($49/mo) |
| `STRIPE_PRICE_PRO_MONTHLY` | `price_1DeF...` | Price ID for LeadFlow Pro ($149/mo) |
| `STRIPE_PRICE_TEAM_MONTHLY` | `price_1GhI...` | Price ID for LeadFlow Team ($399/mo) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` | Publishable key (used client-side) |

> **IMPORTANT:** The server-side checkout routes use `STRIPE_PRICE_PRO_MONTHLY`, NOT
> `STRIPE_PRICE_PROFESSIONAL_MONTHLY`. Do not use the `PROFESSIONAL` variant.

After adding all variables, **redeploy** the dashboard so they take effect:

```bash
cd product/lead-response/dashboard
vercel --prod
```

---

## Step 3 — Verify Configuration

Hit the health check endpoint to confirm everything is wired up:

```bash
curl -H "x-api-key: $LEADFLOW_API_KEY" \
  https://leadflow-ai-five.vercel.app/api/admin/revenue-config-health
```

Expected response when configured correctly:

```json
{
  "stripe": {
    "ok": true,
    "keyConfigured": true,
    "missing": [],
    "invalid": []
  },
  "email": { "ok": true, "domain": "landyourleads.com" },
  "overall": "ok"
}
```

If `overall` is `degraded` or `broken`, the response lists exactly which env vars are missing or have placeholder values.

The Admin Activation page (`/admin/activation`) also shows this status at the top.

---

## Annual Plans (Optional)

If you want to offer annual billing, add these additional Price IDs:

| Variable name | Price | Notes |
|---|---|---|
| `STRIPE_PRICE_STARTER_ANNUAL` | `price_1...` | Starter annual ($490/yr) |
| `STRIPE_PRICE_PRO_ANNUAL` | `price_1...` | Pro annual ($1,490/yr) |
| `STRIPE_PRICE_TEAM_ANNUAL` | `price_1...` | Team annual ($3,990/yr) |

---

## Webhook Setup (Existing — Do Not Change)

The Stripe webhook is already configured at:
- URL: `https://fub-inbound-webhook.vercel.app/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

The signing secret is stored in `STRIPE_WEBHOOK_SECRET`. Do not modify this.
