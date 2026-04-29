# PRD-FRICTIONLESS-STRIPE-CHECKOUT-E2E

## Title
Frictionless Stripe Checkout E2E

## Status
Approved — Implementation Complete

## Objective
Remove every friction point between a trial user deciding to upgrade and their first charge being processed. The full path — pricing page → Stripe checkout → webhook → dashboard confirmation — must work without errors and with clear feedback at each step.

## Problem
Trial users who decide to pay cannot be allowed to fail silently or hit confusing errors. Any break in this flow is direct revenue loss. Before this PRD, there was no verified E2E path and no automated test that caught regressions.

## Target User
Solo real estate agents on a 14-day trial who have seen value and are ready to pay. They are not technical. They expect the upgrade to work like every other SaaS they use.

## Scope

### In Scope
1. Pricing page at `/dashboard/pricing` — plan selection with clear CTAs
2. `/api/stripe/upgrade-checkout` — authenticated Stripe Checkout Session creation
3. Stripe-hosted payment form (no card collection in our UI)
4. `/api/webhooks/stripe` — `checkout.session.completed` handler persists subscription + updates agent
5. Post-checkout redirect to `/dashboard?upgrade=success` with success toast
6. `subscription_attempts` table logging for funnel analytics
7. Automated smoke test at `/api/smoke/stripe-checkout-e2e` using Stripe test mode
8. Customer portal access via `/api/stripe/portal-session`

### Out of Scope
- Annual billing plan (separate UC: feat-annual-billing-plan)
- Checkout abandonment recovery / re-engagement (separate UC: feat-subscription-funnel-tracking)
- Brokerage tier (Contact Sales flow — no Stripe checkout)
- Failed payment recovery flows

## User Stories
1. As a trial user, I can click "Upgrade" from my dashboard and reach a plan selection screen in <2 seconds.
2. As a trial user, I can select a plan and be redirected to Stripe Checkout without logging in again.
3. As a paying user, my dashboard immediately reflects my new plan tier after payment completes.
4. As a paying user, I receive a confirmation email with my plan details and next billing date.
5. As a paying user, I can access the Stripe billing portal from Settings to manage my subscription.

## Functional Requirements

### FR-1: Pricing Page
- Display all 4 tiers: Starter ($49), Pro ($149), Team ($399), Brokerage ($999+)
- Highlight Pro as recommended
- Show plan features for each tier
- Show trial days remaining if user is on trial
- CTA per plan initiates checkout (Brokerage → mailto)

### FR-2: Checkout Session
- `POST /api/stripe/upgrade-checkout` requires valid auth cookie
- Creates a Stripe customer if one doesn't exist for the agent
- Maps plan name to Stripe price ID via `STRIPE_PRICE_*` env vars
- Returns `{ url, sessionId }` — frontend redirects to Stripe URL
- Logs attempt to `subscription_attempts` table (status: `session_created`)

### FR-3: Webhook Handler
- Verify Stripe signature before processing any event
- `checkout.session.completed`: update agent (`plan_tier`, `subscription_status: active`, `stripe_customer_id`, `mrr`) + upsert `subscriptions` row + send confirmation email
- `invoice.paid`: record payment in `payments` table, update agent MRR
- `invoice.payment_failed`: set agent `subscription_status: past_due`
- `customer.subscription.deleted`: set agent `status: cancelled`, `mrr: 0`
- All handlers are idempotent (safe to replay)

### FR-4: Post-Checkout UX
- Success URL: `/dashboard?upgrade=success`
- `UpgradeSuccessToast` shown on `?upgrade=success`, auto-dismisses after 5s
- Toast must reflect the correct plan tier (not hardcoded "Pro")
- Cancel URL: `/dashboard` (no error state shown — silent cancel)

### FR-5: Automated Verification
- Smoke test at `GET /api/smoke/stripe-checkout-e2e` runs the full pipeline in Stripe test mode
- Steps: preflight → create customer → create checkout session → create subscription → simulate webhook DB writes → verify DB state → cleanup
- Returns `{ status: 'ok' | 'fail', steps: [...], duration_ms }`
- Only runs with `sk_test_*` keys — refuses live keys

### FR-6: Subscription Tracking
- `subscription_attempts` table records every checkout initiation
- Admin funnel endpoint at `GET /api/admin/funnel/checkout-attempts` returns daily initiation/completion/abandonment rates

## Acceptance Criteria

| # | Criterion | Verified |
|---|-----------|---------|
| AC-1 | Checkout session created successfully for all 3 paid tiers | ✅ |
| AC-2 | Stripe redirects to plan-specific checkout with correct price | ✅ |
| AC-3 | Webhook processes `checkout.session.completed` and updates agent + subscription | ✅ |
| AC-4 | Dashboard shows paid plan tier after upgrade (not "trial") | ✅ |
| AC-5 | Success toast shown on return from Stripe | ✅ |
| AC-6 | Confirmation email sent via Resend after payment | ✅ |
| AC-7 | Smoke test passes against Stripe test mode | ✅ |
| AC-8 | Unauthenticated requests to upgrade endpoint return 401 | ✅ |
| AC-9 | Invalid plan name returns 400 | ✅ |
| AC-10 | Webhook replays are idempotent | ✅ |

## Known Issues (Post-Implementation)

### BUG-1: Success toast hardcodes "Pro" plan name
- **File:** `components/dashboard/UpgradeSuccessToast.tsx:49`
- **Impact:** Users who upgrade to Starter or Team see "You're now on Pro!" — incorrect
- **Fix:** Pass `plan` query param in `success_url` and read it in the toast component

### DEFERRED-1: Checkout abandonment recovery
- `feat-subscription-funnel-tracking` (needs_merge) adds re-engagement for abandoned sessions
- Not blocking for initial checkout E2E, but needed for funnel optimization

## Non-Functional Requirements
- Checkout redirect <2 seconds from CTA click under normal network conditions
- Webhook processing <5 seconds end-to-end
- No payment data stored in our DB (Stripe tokenization only)
- Test mode guard prevents smoke test from running against live Stripe keys

## Dependencies
- `STRIPE_SECRET_KEY` (test and production)
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER_MONTHLY`, `STRIPE_PRICE_PROFESSIONAL_MONTHLY`, `STRIPE_PRICE_TEAM_MONTHLY`
- `RESEND_API_KEY` (optional — email confirmation)
- PostgREST configured (`NEXT_PUBLIC_API_URL`, `API_SECRET_KEY`)

## Measurement
- Primary: trial-to-paid conversion rate (tracked via `subscription_events`)
- Secondary: checkout initiation rate, completion rate, abandonment rate
- Smoke test status monitored every heartbeat

## Workflow
product → dev → qc
