# PRD: Revenue Critical — $0 MRR, 10 Days Left

**ID:** prd-revenue-critical-2026-04-04  
**Status:** active  
**Date:** 2026-04-04  
**Author:** PM Agent  
**Priority:** P0 — Revenue Emergency

---

## Executive Summary

10 days remain to hit $20K MRR. Current MRR is $0. The product has 335 registered agents, 211 verified, 28 onboarded, 1 on pilot, and 0 paying. The funnel is not broken at the top — it is broken in the middle and at the bottom. The pipeline has processed hundreds of signups and delivered zero conversions to paid.

The problem is not awareness or landing page. The problem is: agents sign up, may or may not verify email, hit a broken or confusing onboarding, never reach the aha moment, and have no working path to pay. The checkout flow and subscription activation are unverified in production.

**Required action in 10 days: get 1 paying customer.** That proves the pipe works. Then scale.

---

## Funnel Analysis

| Stage | Count | Drop Rate | Status |
|-------|-------|-----------|--------|
| Registered | 335 | — | Healthy — signups working |
| Email Verified | 211 | 37% drop | BROKEN — 124 agents stuck unverified |
| Onboarding Completed | 28 | 87% drop | CRITICAL — 183 verified agents never finished |
| Pilot / Trial Active | 1 | 96% drop | DEAD — no conversion path |
| Paid | 0 | 100% drop | ZERO — checkout untested in production |

**The three critical breaks:**

1. **Email verification → product access** — `uc-email-verification-trial-activation` is `ready` but not done. 124 agents are locked out. More importantly, the post-verify onboarding auto-trigger (`uc-auto-trigger-onboarding-post-verify`) is `not_started`.

2. **Onboarding completion** — 183 verified agents hit onboarding and stopped. The FUB wizard is not built (`feat-onboarding-fub-wizard` is `not_started`). Agents requiring Twilio credentials to experience SMS is a known friction blocker (`fix-sms-integration-requires-customer-owned-twilio-cre`). No aha moment = no conversion.

3. **Trial → Paid** — The checkout flow has multiple P0 UCs still open: `uc-populate-subscriptions-on-checkout-complete` (not_started), `uc-revenue-checkout-friction` (ready, not done), `uc-trial-to-paid-conversion-path` (in_progress). Stripe webhook processing is unverified. No trial-to-paid conversion nudge exists.

---

## Top 3 Revenue Actions

### Action 1: Close the Checkout Pipe (P0)

**What:** End-to-end verify that a real agent can pay and get an active subscription.  
**Why:** Everything else is pointless if money cannot flow in. This is the only action that directly produces MRR.  
**How:**
- Run `uc-stripe-checkout-end-to-end` to completion (currently `ready`)
- Complete `uc-populate-subscriptions-on-checkout-complete` (currently `not_started`)
- Complete `uc-revenue-checkout-friction` (currently `ready`)
- Verify Stripe webhook processes `subscription.created` → sets `subscription_status = 'active'` in `real_estate_agents`
- Verify `fix-stripe-webhook-integration` (currently `ready`)

**Acceptance criteria:**
- A test agent completes Stripe checkout and `subscription_status` = `active` in DB
- `stripe_customer_id` is populated
- `mrr` column reflects correct plan amount
- No 500 or 503 errors on any checkout or webhook endpoint in production

**Timeline:** Must complete in 48 hours.

---

### Action 2: Unblock the 211 Verified Agents (P0)

**What:** Fix the path from verified email → completed onboarding → trial start.  
**Why:** 211 agents are verified. 183 stopped at onboarding. This is the largest existing pipeline of potential customers. Reactivating even 1% = 2 agents who may convert.  
**How:**
- Complete `uc-email-verification-trial-activation` (currently `ready`)
- Complete `uc-auto-trigger-onboarding-post-verify` (currently `not_started`) — redirect to onboarding immediately after verification click
- Complete `uc-onboarding-restore-001` — make the onboarding wizard functional
- Remove the Twilio-credentials-required blocker for the aha moment demo (use LeadFlow's shared Twilio account for demo, agent's own only required after activation)
- Add the frictionless demo: `feat-frictionless-demo-no-fub` (currently `in_progress`)

**Acceptance criteria:**
- Agent clicks verification link → lands on onboarding wizard (not dashboard)
- Wizard completes without requiring agent's own Twilio/FUB credentials in step 1
- Agent sees a simulated AI lead response within 60 seconds of entering onboarding
- Onboarding funnel telemetry confirms at least 1 step completion event fires

**Timeline:** 72 hours.

---

### Action 3: White-Glove Convert 1 Pilot Agent to Paid (P0)

**What:** Stojan personally recruits and converts one known real estate agent to paid.  
**Why:** $0 MRR with 10 days left cannot be solved by product fixes alone. We need a human to close a deal. One paid customer proves the pipe works and gives us a real testimonial.  
**How:**
- `UC-PILOT-DIRECT-RECRUITMENT` is `ready` — execute it
- Target: 1 agent from Stojan's network, offer first month free (pilot tier)
- Walk them through onboarding manually if needed
- Once Actions 1 and 2 are done, convert them to paid via Stripe checkout
- Capture: name, quote, before/after response time

**Acceptance criteria:**
- 1 agent record in `real_estate_agents` with `subscription_status = 'active'`
- `mrr` = 149 (Pro tier minimum)
- Testimonial captured (email or Telegram confirmation)

**Timeline:** 7 days.

---

## UC Reprioritization

### Promote to P0 (Revenue-blocking — every hour counts)

| UC ID | Name | Current Status | Why P0 |
|-------|------|----------------|--------|
| uc-stripe-checkout-end-to-end | Validate Stripe Checkout | ready | Money pipe unverified |
| uc-populate-subscriptions-on-checkout-complete | Populate subscriptions on checkout | not_started | Checkout events don't write to DB |
| uc-revenue-checkout-friction | Frictionless Stripe Checkout E2E | ready | Checkout friction = 0 conversions |
| fix-stripe-webhook-integration | Verify Stripe webhook | ready | Subscriptions not activating |
| uc-email-verification-trial-activation | Fix Email Verification | ready | 124 agents locked out |
| uc-auto-trigger-onboarding-post-verify | Auto-Trigger Onboarding | not_started | Verified agents hit dead end |
| uc-trial-to-paid-conversion-path | Trial-to-Paid Conversion Path | in_progress | No upgrade mechanism |
| UC-PILOT-DIRECT-RECRUITMENT | Direct Pilot Recruitment | ready | Only human action that produces MRR |

### Promote to P1 (Revenue-enabling — required for scale)

| UC ID | Name | Why P1 |
|-------|------|--------|
| uc-onboarding-restore-001 | Fix Onboarding Wizard | 183 verified agents need this to progress |
| feat-frictionless-demo-no-fub | Frictionless Demo Mode | Aha moment without FUB friction |
| feat-onboarding-fub-wizard | Guided FUB Connection Wizard | Self-serve integration reduces support burden |
| feat-trial-conversion-nudge | Trial Expiry Conversion Nudge | Automated push to upgrade |
| uc-revenue-recovery-critical-2026-03-31 | Revenue Recovery Critical Path | Active recovery plan |

### Deprioritize to P3 (Quality — defer until first paying customer)

- All loop detection fixes
- SMS stats API fixes
- Admin funnel page
- UTM parameter tracking
- Smoke test loop dedup

---

## Definition of Done for This PRD

1. At least 1 agent with `subscription_status = 'active'` and `mrr > 0` in `real_estate_agents`
2. Stripe checkout → webhook → subscription activation verified end-to-end in production
3. Email verification → onboarding → aha moment path unblocked for all 211 verified agents
4. White-glove recruitment attempt executed (regardless of outcome)

---

## What This PRD Does NOT Cover

- Marketing campaigns (premature — fix the funnel first)
- New feature development beyond the conversion path
- Analytics or telemetry beyond what's needed to verify the funnel works
- Pricing changes

