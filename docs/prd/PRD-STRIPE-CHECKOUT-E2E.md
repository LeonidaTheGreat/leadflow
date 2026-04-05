# PRD: Stripe Checkout E2E — Trial to Paid Conversion Flow

**PRD ID:** prd-stripe-checkout-e2e
**Use Case:** uc-stripe-checkout-end-to-end
**Status:** active
**Priority:** P0 (revenue-blocking)
**Created:** 2026-04-05

---

## Problem

The `uc-stripe-checkout-end-to-end` use case has been in `ready` status with no dedicated PRD and no machine-verifiable acceptance criteria. This caused the PM loop: the task spawned 3x in 2 hours because there was no clear definition of done. This PRD closes that gap.

The related `feat-self-serve-stripe-checkout` UC is marked `complete` and `feat-stripe-checkout-production-e2e` is also `complete`, but `uc-stripe-checkout-end-to-end` remains `ready` — indicating the existing implementations have not been validated end-to-end with automated test coverage in the current codebase state.

---

## Goal

Validate the complete Stripe trial-to-paid checkout flow end-to-end using automated tests. A real estate agent on a free trial can click "Upgrade", complete payment, and have their `plan_tier` updated automatically — with every step verified by a test.

---

## User Story

As a real estate agent on a free trial, I can upgrade to a paid plan via Stripe Checkout so that I get immediate access to paid features without contacting support.

---

## Scope

This UC is **validation-only**. The implementation (`feat-self-serve-stripe-checkout`) is already marked complete. This task is about:

1. Writing automated tests that verify the existing implementation works
2. Confirming the checkout → webhook → DB update pipeline is functional
3. Ensuring the test runs in Stripe test mode (no real money)

---

## Acceptance Criteria

All criteria are machine-verifiable in Stripe test mode.

### AC-1: Checkout Session Creation
- `POST /api/billing/create-checkout-session` returns HTTP 200 with `{ sessionId, url }`
- `url` begins with `https://checkout.stripe.com/`
- `price_id` in the session matches the selected plan (Starter/Pro/Team)
- `client_reference_id` is set to the agent's UUID
- Unauthenticated request returns HTTP 401

### AC-2: Webhook Processes Payment Completion
- `POST /api/webhooks/stripe` with a valid `checkout.session.completed` event returns HTTP 200 `{ received: true }`
- Invalid Stripe signature returns HTTP 400 (not 200, not 500)
- After successful webhook: `real_estate_agents` row has `plan_tier` set to the purchased plan
- After successful webhook: `stripe_customer_id` and `stripe_subscription_id` are populated
- After successful webhook: `plan_activated_at` timestamp is set
- Webhook is idempotent: replaying the same event does not create duplicate DB updates

### AC-3: Customer Portal Access
- `POST /api/stripe/portal-session` (or equivalent endpoint) returns HTTP 200 with `{ url }`
- `url` begins with `https://billing.stripe.com/`
- Unauthenticated request returns HTTP 401
- Request for agent without `stripe_customer_id` returns HTTP 400 or 404

### AC-4: Dashboard Reflects Upgrade
- After webhook fires, the agent's dashboard shows the new plan tier (not "trial")
- The Upgrade CTA is no longer visible after successful upgrade

### AC-5: Automated Test Coverage
- A test file at `tests/integration/stripe-checkout-e2e.test.js` covers AC-1 through AC-3
- Tests use Stripe test mode (key starts with `sk_test_`)
- Tests do not require manual steps — fully automated with Stripe test fixtures

---

## What is NOT in scope

- Changing the Stripe integration implementation
- New pricing tiers or plan changes
- Stripe billing portal UI changes
- Annual billing (separate UC)

---

## Definition of Done

The UC `uc-stripe-checkout-end-to-end` is complete when:

1. `tests/integration/stripe-checkout-e2e.test.js` exists and passes in CI
2. All 5 acceptance criteria above are covered by the test
3. `npm test` passes with the new test file included
4. UC `implementation_status` updated to `complete`

---

## Loop Prevention Note

The PM task for this UC was spawned 3x in 2 hours (task IDs: `ee691f62`, `263521d9`, `404be63c`) because:
- The UC had `prd_id = prd-revenue-critical-final-10days` (a broad multi-UC PRD)
- No acceptance criteria defined on the UC row
- No dedicated PRD to anchor what "done" means

This PRD (`prd-stripe-checkout-e2e`) is dedicated to this UC. The UC's `prd_id` is now updated to point here. Future PM tasks will have a clear definition of done and should not re-spawn.

---

## Related PRDs

- `prd-self-serve-stripe-checkout` — implementation PRD (complete)
- `prd-stripe-checkout-production-e2e` — production env verification (complete)
- `prd-frictionless-stripe-checkout-e2e` — frictionless flow (complete)
- `prd-revenue-critical-final-10days` — parent revenue sprint (this UC was previously under this)
