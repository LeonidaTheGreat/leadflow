# PRD: Revenue Recovery — Critical Path to First Paying Customer

**PRD ID:** prd-revenue-recovery  
**Status:** active  
**Priority:** P0 — Revenue Emergency  
**Created:** 2026-04-04  
**Author:** PM Agent  
**Phase:** Day 43 of 90-day pilot

---

## Problem Statement

LeadFlow is at $0 MRR on Day 43 of its 90-day $20K MRR target. There are 335 registered accounts (319 trial, 11 pilot) and zero paying customers. The funnel has users but no conversion. 10 days remain before the 90-day window closes.

This is not a product problem. The product works. This is a conversion funnel problem.

---

## Current State Audit

| Metric | Value | Status |
|--------|-------|--------|
| MRR | $0 | CRITICAL |
| Days remaining | 10 | CRITICAL |
| MRR target | $20,000 | — |
| Gap | $20,000 | — |
| Total registered | 335 | — |
| Trial accounts | 319 | Not converting |
| Pilot accounts | 11 | Not paying |
| Pilot signups (pre-product) | 20 | Untapped |

---

## Root Cause Analysis

### Funnel Audit: Awareness → Paid

| Stage | State | Verdict |
|-------|-------|---------|
| **Awareness** | Landing page live | OK |
| **Signup** | Working — 335 accounts | OK |
| **Email Verification** | Broken for 386+ agents | BLOCKED |
| **Onboarding** | Post-verify trigger not built | BLOCKED |
| **Aha Moment** | FUB/SMS simulator exists but not auto-triggered | BLOCKED |
| **Trial Countdown** | Widget ready, not deployed | BLOCKED |
| **Checkout** | Stripe checkout E2E not fully validated | BLOCKED |
| **Subscriptions table** | Not populated on checkout | BLOCKED |
| **Paid** | $0 | BLOCKED |

### Critical Blockers (in order of funnel position)

1. **Email verification broken** — 386 trial agents cannot access the product. No product access = no aha moment = no conversion. UC: `uc-email-verification-trial-activation` (ready, P0).

2. **Onboarding not auto-triggered post-verify** — Even when verified, agents don't see the onboarding wizard. UC: `uc-auto-trigger-onboarding-post-verify` (not_started, P0).

3. **Stripe checkout E2E unvalidated** — Checkout flow exists but end-to-end transaction hasn't been validated in production. UCs: `uc-stripe-checkout-end-to-end`, `uc-revenue-checkout-friction` (both ready, P0).

4. **Subscriptions table not populated** — After successful checkout, subscription record is not created, so billing state is never recorded. UC: `uc-populate-subscriptions-on-checkout-complete` (not_started, P0).

5. **Pilot recruitment stalled** — 20 pre-product pilot signups exist. Direct outreach to convert these to active pilots has not happened. Pilot recruitment blocked pending Stojan approval. UC: `UC-PILOT-DIRECT-RECRUITMENT` (ready, P0).

---

## The Critical Path

The only path to first MRR in 10 days:

```
Email Verification Fixed
        ↓
Agents Access Product (<5 min onboarding)
        ↓
Aha Moment: AI responds to sample lead in <30s
        ↓
Trial Countdown + Upgrade CTA visible
        ↓
Stripe Checkout works end-to-end
        ↓
Subscription recorded → Agent is PAID
```

**Parallel track:** Direct outreach to 11 existing pilot accounts + 20 pilot signups to convert manually.

---

## Three Required Actions

### Action 1: Fix the Email Verification Funnel (P0, Dev, 1-2 days)

**Problem:** 386 agents cannot access the product because email verification is broken or not triggering correctly.

**Required:**
- Diagnose why email verification is failing (RESEND_API_KEY in Vercel? Verification endpoint? Token expiry?)
- Fix the verification flow
- Manually verify the 11 existing pilot accounts so they can access immediately
- Auto-trigger onboarding wizard on first post-verify login

**Success criteria:**
- Pilot accounts can log in and reach /dashboard
- Onboarding wizard auto-launches on first login
- AI lead simulator fires within 30 seconds

**Linked UCs:** `uc-email-verification-trial-activation`, `uc-auto-trigger-onboarding-post-verify`

---

### Action 2: Validate Stripe Checkout End-to-End (P0, Dev, 1-2 days)

**Problem:** Stripe checkout exists but has never been validated with a real transaction in production. Subscriptions table is not populated on checkout completion.

**Required:**
- Run Stripe checkout E2E with a test card on production
- Confirm webhook fires and subscription is recorded in `subscriptions` table
- Confirm agent `plan_tier` updates after successful payment
- Confirm upgrade CTA in dashboard links to correct Stripe checkout URL

**Success criteria:**
- Checkout flow completes without error
- `subscriptions` row created with correct `agent_id`, `plan`, `status='active'`
- Agent's plan_tier updates to `pro` or `starter`

**Linked UCs:** `uc-stripe-checkout-end-to-end`, `uc-revenue-checkout-friction`, `uc-populate-subscriptions-on-checkout-complete`

---

### Action 3: Activate the 11 Pilot Accounts + Outreach to 20 Pre-Product Signups (P0, Stojan, immediate)

**Problem:** Pilot recruitment has been pending Stojan's approval since before Day 22. There are 11 pilot accounts already in the system and 20 pre-product signups sitting idle.

**Required (Stojan action, not dev work):**
- Manually approve and activate the 11 existing pilot accounts
- Direct outreach to 20 pre-product pilot signups (email or SMS from Stojan personally)
- Offer: Free 30-day pilot, white-glove onboarding, provide a real lead to demonstrate value
- Convert at least 3 pilots to active users this week
- After 7 days of product use, present upgrade offer ($149/mo Pro)

**Success criteria:**
- 3+ pilot accounts actively using the product by Day 50
- At least 1 upgrade to paid within 10 days

**This requires Stojan's approval and personal outreach — no dev work needed.**

---

## Revenue Model: How We Get to $20K

Given 10 days and the current state, the realistic path is:

| Path | Mechanism | Timeline | MRR |
|------|-----------|----------|-----|
| Convert pilots | 5 pilots → Pro ($149) | 7-10 days | $745 |
| Trial conversion | 10 trial users convert | 14-21 days | $490-$1,490 |
| Outbound | Direct sales by Stojan | 14-30 days | $1,000+ |

**Honest assessment:** $20K MRR in 10 days is not achievable from zero. The goal should be **first paying customer within 10 days** and **$1K MRR within 30 days**, then scaling from proof points. Getting 1 paying customer validates the entire model and unlocks the next phase.

---

## Prioritization Changes

The following UCs must be elevated to P0 and unblocked immediately:

| UC ID | Name | Current Priority | Required |
|-------|------|-----------------|---------|
| `uc-email-verification-trial-activation` | Fix Email Verification | P0 | Execute NOW |
| `uc-auto-trigger-onboarding-post-verify` | Auto-Trigger Onboarding | P0 | Execute after above |
| `uc-stripe-checkout-end-to-end` | Stripe Checkout E2E | P0 | Execute in parallel |
| `uc-populate-subscriptions-on-checkout-complete` | Populate Subscriptions | P0 | Execute with checkout |
| `UC-PILOT-DIRECT-RECRUITMENT` | Pilot Recruitment | P0 | Stojan action required |

---

## What NOT to Build Right Now

- New features (ROI widget, content marketing, demo mode)
- Analytics enhancements
- Mobile redesigns
- Any UC with `revenue_impact = none`

Every sprint cycle that isn't on the critical path above is a cycle away from first revenue.

---

## Definition of Done

This PRD is complete when:
1. At least 1 pilot account has accessed the product and experienced the aha moment
2. Stripe checkout has completed a real transaction (test or live)
3. Stojan has been presented the pilot outreach plan and approved it
4. First paying customer exists (any tier)

