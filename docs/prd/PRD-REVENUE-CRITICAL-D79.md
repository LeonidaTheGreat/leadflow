# PRD: Revenue Critical — Close MRR Gap (Day 79 of 90)

**ID:** PRD-REVENUE-CRITICAL-D79  
**Status:** active  
**Priority:** P0 — Emergency Sprint  
**Version:** 1.0  
**Date:** 2026-04-04  
**Author:** PM Agent  
**Window:** 11 days remaining to hit $20K MRR goal

---

## 1. Situation Assessment

### Current State (Day 79 of 90)
- **MRR:** $0 (goal: $20,000)
- **Days remaining:** 11
- **Subscriptions:** 0 active, 0 trialing
- **Registered agents:** 332 total
- **Email verified:** 208 (63%)
- **Pilot started:** 1 (0.3%)
- **Onboarding completed:** 25 (7.5%)

### The Funnel Collapse
332 agents registered → 208 verified email → 1 pilot started → 0 paid.

The product has users. It has no customers. The funnel is collapsing between email verification and pilot activation, and there is no mechanism converting trials to payment.

---

## 2. Root Cause Analysis

### Blocker A: No Trial-to-Paid Conversion Path (Revenue Blocker)
The most critical revenue blocker: even if agents onboard, there is no working payment conversion flow.

- UC `uc-trial-to-paid-conversion-path` is `in_progress` — not complete
- UC `uc-revenue-checkout-friction` is `ready` — not started
- UC `uc-populate-subscriptions-on-checkout-complete` is `not_started`
- `subscriptions` table: 0 rows. No revenue mechanism is wired end-to-end.

An agent cannot give LeadFlow money. This must be fixed first.

### Blocker B: Email Verification → Activation Gap
208 agents verified email. 1 started a pilot. That is a 99.5% drop.

- UC `uc-email-verification-trial-activation` is `ready` — not started
- UC `uc-onboarding-mandatory-auto-trigger` is `ready` — not started
- After email verification, agents land... somewhere. No clear activation flow.

307 unverified agents + 208 verified-but-stuck = zero activation. The funnel after email is broken.

### Blocker C: Smoke Test / Deploy Issues Consuming Dev Capacity
Active dev tasks are: "Fix: Login page (smoke)", "Fix: Signup page (smoke)", "Fix: E2E flow test failures". These are infrastructure tasks, not revenue tasks. Dev capacity is being consumed by smoke loop maintenance instead of revenue-critical work.

### Blocker D: Zero Pilot Recruitment Traction
- UC `UC-PILOT-DIRECT-RECRUITMENT` is `ready` — Stojan approval pending
- 0 pilots recruited despite 22 UCs completed around pilot infrastructure
- Pilot signups table: 20 rows (last entry: 2026-03-17 — 18 days ago)
- Direct recruitment has been waiting for human action. This is a known blocker.

---

## 3. 11-Day Sprint Plan

With 11 days left, the only credible path to first revenue is:

**Day 1-3: Wire the payment flow (unblocks all revenue)**
- Complete `uc-trial-to-paid-conversion-path`
- Complete `uc-revenue-checkout-friction` (Stripe checkout E2E)
- Complete `uc-populate-subscriptions-on-checkout-complete`
- Test: one real transaction must succeed end-to-end

**Day 3-6: Fix activation gap (convert existing 208 verified agents)**
- Complete `uc-email-verification-trial-activation` — verified agents must be able to start a trial
- Complete `uc-onboarding-mandatory-auto-trigger` — onboarding wizard triggers automatically
- Complete `uc-auto-trigger-onboarding-post-verify` — post-verification landing
- Target: move 20+ verified agents into active trial

**Day 6-11: Convert trials to paid + recruit pilots**
- Complete `uc-revenue-email-sequence` — trial conversion emails
- Complete `uc-revenue-countdown-widget` — urgency mechanism in dashboard
- Stojan must take action on `UC-PILOT-DIRECT-RECRUITMENT` — white-glove recruitment of 5-10 agents
- Target: 5 paying customers at Pro tier ($149) = $745 MRR minimum
- Realistic target: 3 Pro + 1 Team = $847 MRR (not $20K, but first revenue)

### Honest Assessment of $20K MRR in 11 Days
$20K MRR requires ~134 Pro tier customers or ~50 Team. With 0 current customers and 11 days, $20K MRR is not achievable in this window. The realistic target is:
- **First revenue:** $149-$999 from 1-5 paying customers
- **Proof of concept:** Subscription pipeline working
- **Foundation for 30-day sprint:** to $2K-5K MRR

---

## 4. Priority Changes to Use Cases

### Elevate to P0 (Revenue Blocker — must complete in 11 days)
1. `uc-trial-to-paid-conversion-path` — implement trial to paid upgrade path
2. `uc-revenue-checkout-friction` — Stripe checkout E2E (frictionless)
3. `uc-populate-subscriptions-on-checkout-complete` — DB writes on payment
4. `uc-email-verification-trial-activation` — activate verified agents
5. `uc-onboarding-mandatory-auto-trigger` — auto-trigger wizard

### Maintain P1 (Important but not day-1 blocking)
6. `uc-stripe-checkout-end-to-end` — E2E validation
7. `uc-auto-trigger-onboarding-post-verify` — post-verify flow
8. `fix-smoke-auth-dashboard-not-deployed` — unblocks smoke tests

### Maintain P2 (Week 2 of sprint)
9. `uc-revenue-email-sequence` — conversion emails
10. `uc-revenue-countdown-widget` — urgency UI
11. `uc-revenue-aha-moment` — demo value in onboarding
12. `UC-PILOT-WHITE-GLOVE` — concierge onboarding for pilots

### Deprioritize to P4 (Post-sprint, not revenue-critical now)
- `feat-agent-referral-program` — viral growth, premature
- `uc-marketing-campaign-launch` — CAC spend before funnel fixed = waste
- `uc-revenue-funnel-diagnostics` — diagnostic tool, not fixer
- `uc-landing-page-revenue-optimization` — acquisition is not the bottleneck

---

## 5. Acceptance Criteria

- [ ] A real credit card transaction succeeds in production (Stripe checkout → subscriptions table populated)
- [ ] At least 5 verified agents receive post-verification activation prompt
- [ ] At least 1 agent completes onboarding wizard after email verification
- [ ] Trial-to-paid upgrade UI visible in dashboard for all trial users
- [ ] `subscriptions` table has at least 1 active row by Day 84

---

## 6. Human Action Required (Cannot be automated)

**Stojan must act on these:**
1. `UC-PILOT-DIRECT-RECRUITMENT` — directly recruit 5-10 agents via personal outreach. Pilots exist on the system; someone must contact them. The genome cannot do this.
2. Verify Stripe production keys are correct in Vercel (previous tasks marked this complete but 0 subscriptions exist)
3. Make a test purchase to validate the end-to-end checkout before pursuing external customers

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dev capacity consumed by smoke loops | High | High | Resolve smoke auth loop UC first |
| Stripe keys incorrect in production | Medium | Critical | Stojan manually verifies Vercel env vars |
| No agents willing to pay in 11 days | Medium | High | White-glove pilot offer: first month free |
| $20K MRR target missed | Certain | High | Reset expectation to "first revenue" milestone |

---

*Generated by PM Agent on Day 79. Last data pull: 2026-04-04T22:xx UTC.*
