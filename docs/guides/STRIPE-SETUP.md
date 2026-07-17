# Stripe Setup Guide

How to configure Stripe products and environment variables so checkout works.

## 1. Create Products in Stripe Dashboard

Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products) and create three products:

| Product Name | Monthly Price | Annual Price |
|-------------|--------------|--------------|
| LeadFlow Starter | $49/mo | $490/yr |
| LeadFlow Pro | $149/mo | $1,490/yr |
| LeadFlow Team | $399/mo | $3,990/yr |

For each product, create the recurring prices. After creation, copy each price's ID (looks like `price_1AbCDEFGHIJKL...`).

## 2. Set Environment Variables in Vercel

Go to Vercel > leadflow-ai project > Settings > Environment Variables and set:

### Required for checkout

| Variable | Description | Example |
|----------|-------------|---------|
| `STRIPE_SECRET_KEY` | Stripe API secret key (sk_live_... or sk_test_...) | `sk_live_abc123...` |
| `STRIPE_PRICE_STARTER_MONTHLY` | Price ID for Starter monthly plan | `price_1QvIEf2eZvKYlo2C...` |
| `STRIPE_PRICE_STARTER_ANNUAL` | Price ID for Starter annual plan | `price_1QvIFa2eZvKYlo2C...` |
| `STRIPE_PRICE_PRO_MONTHLY` | Price ID for Pro monthly plan | `price_1QvIGb2eZvKYlo2C...` |
| `STRIPE_PRICE_PRO_ANNUAL` | Price ID for Pro annual plan | `price_1QvIHc2eZvKYlo2C...` |
| `STRIPE_PRICE_TEAM_MONTHLY` | Price ID for Team monthly plan | `price_1QvIId2eZvKYlo2C...` |
| `STRIPE_PRICE_TEAM_ANNUAL` | Price ID for Team annual plan | `price_1QvIJe2eZvKYlo2C...` |

### Required for webhooks

| Variable | Description |
|----------|-------------|
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret (whsec_...) |

## 3. Validate Configuration

After setting the env vars, redeploy and check:

```bash
curl -H "Authorization: Bearer $LEADFLOW_API_KEY" \
  https://leadflow-ai-five.vercel.app/api/admin/revenue-config-health
```

Expected response when everything is configured:
```json
{
  "stripe": {
    "ok": true,
    "secret_key": "valid",
    "prices": { "ok": ["STRIPE_PRICE_STARTER_MONTHLY", ...], "missing": [], "invalid": [] }
  },
  "email": { "ok": true, "resend_api_key": "configured", "domain": "landyourleads.com" },
  "overall": "ok"
}
```

The admin dashboard at `/admin` also shows a revenue config banner when any issues are detected.

## 4. Common Mistakes

- **Placeholder values**: `price_starter_49`, `price_pro_149` are not real Stripe price IDs. Real IDs look like `price_1QvIEf2eZvKYlo2CkuDLQABG`.
- **Wrong env var names**: The checkout routes use `STRIPE_PRICE_PRO_MONTHLY` (not `STRIPE_PRICE_PROFESSIONAL_MONTHLY`). Use the exact names from the table above.
- **NEXT_PUBLIC_ prefix**: Price ID env vars must NOT have the `NEXT_PUBLIC_` prefix. They are server-side only.
- **Missing redeploy**: Vercel env var changes require a redeploy to take effect.

## 5. Test Mode vs Live Mode

Use `sk_test_...` keys and test-mode price IDs during development. Switch to `sk_live_...` for production. Test and live price IDs are different even for the same product.
