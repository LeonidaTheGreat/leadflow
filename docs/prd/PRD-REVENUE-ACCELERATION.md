# PRD: Revenue Acceleration — Day 43, Critical Path to $20K MRR

**Status:** Active  
**Priority:** P0  
**Date:** 2026-04-04  
**Days Remaining:** 11 of 90  
**MRR Gap:** $16,271 (current $0 vs $20,000 target)  
**Trajectory:** Critical

---

## Situation Assessment

Day 43 of 90. Zero MRR. 11 days left to close a $16,271 gap. This is a full-funnel failure, not a single bottleneck — the product is not accessible to users in production.

## Root Cause: Three Compounding Failures

### Failure 1 — Production Is Broken (Blocker)
The customer-facing dashboard (`leadflow-ai-five.vercel.app`) is not serving the Next.js app. Current symptoms:
- `/signup/trial` returns 404 or 500
- Production domain routes to FUB webhook API, not the dashboard
- Zero users can sign up, onboard, or convert

**No signups = no trials = no revenue. Everything else is secondary.**

### Failure 2 — Trial-to-Paid Path Not Built
Even if signup worked, the conversion path is incomplete:
- `uc-trial-to-paid-conversion-path`: in_progress
- `uc-populate-subscriptions-on-checkout-complete`: not_started
- No upgrade mechanism exists in the dashboard
- Stripe checkout flow not validated end-to-end

### Failure 3 — Acquisition Not Started
- 0 pilot agents recruited
- Marketing campaign not launched
- Landing page not optimized for conversion
- No trial activation email sequence running

---

## Funnel Analysis

| Stage | Status | Conversion |
|-------|--------|-----------|
| Awareness | Not started — no campaign | 0 |
| Landing Page | Live but not optimized | ~0 |
| Signup | Broken — 404/500 in production | 0 |
| Onboarding | Complete (code exists) | N/A |
| Aha Moment | Frictionless demo in_progress | N/A |
| Trial Activation | Email verification broken | N/A |
| Trial → Paid | Not implemented | N/A |

**The funnel is broken at Signup. Nothing downstream matters until Signup is fixed.**

---

## Priority Reprioritization (Effective Immediately)

### P0 — Production Access Restored (must ship in 24h)
| UC | Action |
|----|--------|
| `fix-production-vercel-deployment-broken-signup-trial-a` | Fix build/deploy error or roll back |
| `fix-production-domain-leadflow-ai-five-vercel-app-serv` | Verify routing: domain → Next.js dashboard |
| `fix-next-js-customer-dashboard-not-deployed-users-cann` | Deploy confirmed-working dashboard build |

**Definition of done:** `/signup/trial` returns 200, new user can create account, access `/dashboard`.

### P1 — Trial-to-Paid Revenue Path (must ship in 72h)
| UC | Action |
|----|--------|
| `uc-trial-to-paid-conversion-path` | Complete in-progress work |
| `uc-stripe-checkout-end-to-end` | Validate checkout → subscription creation |
| `uc-populate-subscriptions-on-checkout-complete` | Stripe webhook → DB write |
| `uc-email-verification-trial-activation` | Agents must be able to activate trial |
| `feat-frictionless-demo-no-fub` | Complete — reduces time-to-value for cold signups |
| `uc-onboarding-aha-moment-completion` | Complete — agents who see value convert |
| `uc-revenue-checkout-friction` | Remove every click between intent and payment |

**Definition of done:** A new signup can start free trial, see AI respond to a sample lead, and upgrade to Pro with working Stripe checkout.

### P2 — Acquisition and Conversion Optimization (Days 3-7)
| UC | Action |
|----|--------|
| `uc-marketing-campaign-launch` | Launch — 10+ signups/day minimum |
| `uc-revenue-email-sequence` | Active trial → paid email drip |
| `uc-revenue-aha-moment` | AI response within 3 days of trial start |
| `uc-revenue-pricing-clarity` | Show pricing prominently in dashboard |
| `uc-revenue-countdown-widget` | Trial days remaining + urgency |
| `UC-PILOT-WHITE-GLOVE` | 5 agents white-glove recruited + onboarded |
| `feat-weekly-performance-email` | Prove ROI → drive upgrade |

---

## 3 Specific Actions to Close the Gap

### Action 1: Ship a Working Production Deploy TODAY
Single highest-leverage action. Every day signup is broken = 0 MRR chance.
- Dev task: investigate Vercel build failure, fix or roll back to last working commit
- Verify: `curl https://leadflow-ai-five.vercel.app/signup/trial` returns 200
- Timeline: 4-8 hours

### Action 2: Complete Trial-to-Paid Checkout in 72 Hours
Code exists in branches. Merge and validate:
- `uc-trial-to-paid-conversion-path` is `in_progress` — unblock and complete
- Manually test: signup → trial → upgrade → Stripe payment → subscription active in DB
- One working transaction validates the entire revenue path
- Timeline: 48-72 hours

### Action 3: Recruit 5 Pilot Agents (White-Glove) Starting Today
Infrastructure is ready. Stojan needs to activate recruitment:
- `UC-PILOT-WHITE-GLOVE` and `UC-PILOT-DIRECT-RECRUITMENT` are `ready` — just needs execution
- 5 agents on Pro ($149/mo) = $745 MRR immediately
- Each agent who sees real AI responses generates word-of-mouth
- Timeline: Begin outreach today, onboard within 5-7 days

---

## Revenue Math: What's Achievable in 11 Days

| Scenario | Signups | Conversion | MRR |
|----------|---------|-----------|-----|
| Minimal (fix prod + 5 pilots) | 5 pilots | 100% hand-held | $745 |
| Realistic (fix prod + campaign) | 30 trials | 15% | $671 |
| Stretch (all actions execute) | 5 pilots + 30 trials | 15% trial + 100% pilot | $1,416 |

**Honest assessment:** $20K MRR in 11 days requires either (a) a viral/partnership miracle, or (b) redefining success as "validated path to $20K" rather than "$20K this sprint." The realistic 90-day target requires the Phase 2/3 GTM (Weeks 5-8) which requires a working product first.

**Revised milestone:** First $1K MRR by Day 54 validates the conversion path. Scale marketing in Phase 2.

---

## What's NOT the Problem

- Core AI functionality: complete
- FUB integration: complete
- Pricing tiers: correct
- Auth flow: complete (code exists)
- Onboarding wizard: complete (code exists)

The product is built. The deployment is broken.

---

## UC Priority Updates Applied (2026-04-04)

This review updated 27 use cases:
- 4 UCs moved to P0 (production access blockers)
- 9 UCs confirmed/moved to P1 (trial-to-paid path)
- 11 UCs moved to P2 (acquisition and activation)
- 3 UCs moved to P4 (infrastructure housekeeping)

---

## Success Criteria

| Metric | Target | When |
|--------|--------|------|
| Production signup works | /signup/trial returns 200 | Day 44 |
| First trial activated | 1 real agent in trial | Day 46 |
| First payment | 1 Stripe transaction | Day 50 |
| First $1K MRR | 7 Pro agents paid | Day 54 |

