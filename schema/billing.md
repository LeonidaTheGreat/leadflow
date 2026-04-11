<!-- AUTO-GENERATED — DO NOT EDIT. Run `node scripts/generate-schema-docs.js` to regenerate. -->
# Schema: Billing

> Stripe subscriptions, payments, invoices, referrals, trials
> Generated: 2026-04-11T22:20:04.798Z | 8 tables

[← Back to SCHEMA.md](../SCHEMA.md)

## Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `subscriptions` | 3 | |
| `subscription_events` | 15 | |
| `payments` | 1 | |
| `checkout_sessions` | 0 | |
| `mrr_snapshots` | 0 | |
| `referral_links` | 0 | |
| `referrals` | 0 | |
| `trial_email_logs` | 0 | |

---

## Column Details

### subscriptions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | no | gen_random_uuid() |
| user_id | uuid | yes | - |
| customer_id | uuid | yes | - |
| stripe_customer_id | character varying | no | - |
| stripe_subscription_id | character varying | yes | - |
| status | character varying | no | 'incomplete'::character varying |
| tier | character varying | no | - |
| price_id | character varying | no | - |
| interval | character varying | no | 'month'::character varying |
| current_period_start | timestamp without time zone | yes | - |
| current_period_end | timestamp without time zone | yes | - |
| trial_start | timestamp without time zone | yes | - |
| trial_end | timestamp without time zone | yes | - |
| cancel_at_period_end | boolean | yes | false |
| canceled_at | timestamp without time zone | yes | - |
| ended_at | timestamp without time zone | yes | - |
| metadata | jsonb | yes | '{}'::jsonb |
| created_at | timestamp without time zone | yes | CURRENT_TIMESTAMP |
| updated_at | timestamp without time zone | yes | CURRENT_TIMESTAMP |

