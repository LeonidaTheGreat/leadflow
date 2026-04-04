# PRD: Revenue Alert — Day 49 Critical Analysis & Action Plan

**ID:** prd-revenue-alert-day49
**Status:** approved
**Priority:** P0
**Date:** 2026-04-04
**Author:** PM Agent
**Task:** 7239268c-373e-4f41-a557-81bce38f9417

---

## Situation

- **Goal:** $20,000 MRR within 90 days (day_zero: 2026-02-15)
- **Current Day:** 49 of 90
- **Current MRR:** $0
- **Gap:** $20,000 (100%)
- **Days Remaining:** 41
- **Trial Agents:** 315 (all test/automated data, $0 MRR)
- **Pilot Agents:** 11 (all test/automated data, $0 MRR)
- **Real Paying Customers:** 0
- **Real Human Users:** 0

## Honest Assessment

**The product has zero real users.** All 331 records in `real_estate_agents` are test data from automated systems. No real estate agent has ever signed up, used the product, or paid money.

The system has completed 249 use cases and 2311 tasks — an impressive engineering velocity — but none of it has been validated with a real human customer.

## Root Cause: Sequential Blockers

The $0 MRR stems from a chain of 4 blockers that must be resolved in order:

### Blocker 1: Signup Returns 500 (P0 — in_progress)
- **UC:** `fix-most-recent-next-js-dashboard-deployment-returns-5`
- Users literally cannot sign up. The top of the funnel is broken.
- **Impact:** 100% funnel blockage

### Blocker 2: Trial-to-Paid Conversion Not Implemented (P0 — in_progress)
- **UC:** `uc-trial-to-paid-conversion-path`
- Even if signup works, there is no mechanism for trial users to upgrade to paid.
- **Supporting:** `uc-populate-subscriptions-on-checkout-complete` (not_started), `uc-stripe-checkout-end-to-end` (ready)
- **Impact:** 100% conversion blockage

### Blocker 3: Stripe Checkout Not Validated E2E (P0 — ready)
- **UC:** `uc-stripe-checkout-end-to-end`, `uc-revenue-checkout-friction`
- The checkout flow has never processed a real transaction in production.
- **Impact:** Payments will likely fail even after conversion path exists

### Blocker 4: Zero Real Pilot Agents (P1 — ready)
- **UC:** `UC-PILOT-DIRECT-RECRUITMENT`
- No real estate agent has been recruited. All data is synthetic.
- This requires Stojan to personally recruit 3-5 agents from his network.
- **Impact:** No one to convert

## Priority Actions (Ordered)

### Action 1: Fix Signup 500 [P0, Dev]
- **UC:** `fix-most-recent-next-js-dashboard-deployment-returns-5` (already in_progress)
- **Acceptance:** `curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/signup` returns `200`
- **Timeline:** Must be resolved before anything else matters

### Action 2: Ship Trial-to-Paid Conversion [P0, Dev]
- **UC:** `uc-trial-to-paid-conversion-path` (already in_progress)
- **Dependencies:** `uc-populate-subscriptions-on-checkout-complete`, `uc-stripe-checkout-end-to-end`
- **Acceptance:** A trial user can click "Upgrade" in dashboard, complete Stripe checkout, and `real_estate_agents.plan_tier` changes to `pro` and `mrr > 0`
- **Timeline:** Must follow Action 1

### Action 3: Validate Stripe End-to-End [P0, Dev]
- **UC:** `uc-stripe-checkout-end-to-end`
- **Acceptance:** Stojan completes a real $1 test transaction (Stripe test mode) and subscription appears in Stripe Dashboard + local DB
- **Timeline:** Must follow Action 2

### Action 4: Recruit 3-5 Real Agents [P1, Human + Marketing]
- **UC:** `UC-PILOT-DIRECT-RECRUITMENT`
- **Acceptance:** 3+ real estate agents with real email addresses appear in `real_estate_agents` with `email_verified=true`
- This is a **human action** — Stojan must reach out to real estate agents in his network
- The system can prepare materials (invite emails, onboarding flow) but cannot recruit humans

## Revenue Math

With 41 days remaining and $20K target:
- **Minimum viable path:** 134 Pro agents ($149/mo) — unrealistic in 41 days
- **Realistic path:** 5-10 agents at Pro ($149) + 2-3 teams ($399) = ~$1,500-$2,700 MRR
- **Honest target:** First paying customer. $20K MRR in 41 days from $0 with 0 users is not achievable.

## Recommendation: Redefine Success

The 90-day $20K MRR target was set before the product existed. The product now exists but has never been used by a real person. The realistic next milestone is:

1. **Week 1 (Days 49-55):** Fix signup + checkout pipeline. Stojan tests full flow personally.
2. **Week 2 (Days 56-62):** Recruit 3-5 real agents. White-glove onboarding.
3. **Week 3-4 (Days 63-76):** First aha moments. First conversion attempt.
4. **Week 5-6 (Days 77-90):** Optimize based on real feedback. Target: 3-10 paying agents = $450-$1,500 MRR.

$1,500 MRR by Day 90 with real validated customers is worth more than $20K MRR on paper.

## Use Case Priority Update

The following UCs should maintain P0 (blocker) priority:
1. `fix-most-recent-next-js-dashboard-deployment-returns-5` — P0 (signup broken)
2. `uc-trial-to-paid-conversion-path` — P0 (no conversion path)
3. `uc-stripe-checkout-end-to-end` — P0 (checkout unvalidated)
4. `uc-populate-subscriptions-on-checkout-complete` — P0 (subscriptions don't persist)

The following should be P1:
5. `UC-PILOT-DIRECT-RECRUITMENT` — P1 (needs humans)
6. `uc-revenue-checkout-friction` — P1 (checkout UX)

Everything else (genome fixes, loop detection, distribution collectors, analytics) is P3+ until a real human has used the product.

## Action Items for Dashboard

1. **DECISION: Acknowledge $20K target is unreachable** — Stojan must decide whether to extend timeline or redefine success metric
2. **ACTION: Stojan recruits 3-5 real agents** — No automated system can do this. Personal outreach required.
3. **VERIFY: Test full signup→checkout flow personally** — Once dev fixes Blockers 1-3, Stojan must test the complete flow before recruiting anyone

## UC Priority Update (Applied 2026-04-04)

Reprioritized UCs to focus all dev capacity on revenue path:

**Promoted to P0 (blockers — sequential, must resolve in order):**
1. `fix-most-recent-next-js-dashboard-deployment-returns-5` — signup 500 (in_progress)
2. `uc-trial-to-paid-conversion-path` — no upgrade path (in_progress)
3. `uc-populate-subscriptions-on-checkout-complete` — subscriptions don't persist (not_started)
4. `uc-stripe-checkout-end-to-end` — checkout unvalidated (ready)

**Maintained at P1 (revenue-adjacent):**
- `UC-PILOT-DIRECT-RECRUITMENT` — recruit real agents
- `uc-revenue-checkout-friction` — checkout UX
- `uc-email-verification-trial-activation` — trial activation
- `fix-stripe-webhook-integration` — webhook processing
- `feat-stripe-keys-vercel` — Stripe keys deployment
- `feat-checkout-page-stripe-elements` — checkout page

**Demoted to P3 (not revenue-blocking):**
- `uc-fix-smoke-loop` — smoke test loop
- `uc-action-1-loop-detection-fix` — loop detection
- `uc-loop-detection-handler-fix` — loop handler
- `fix-loop-handler-distribution-dedup` — distribution dedup
- `uc-revenue-alert-dedup` — alert dedup
- `uc-revenue-alert-loop-dedup` — alert loop dedup

## 3 Specific Actions to Close the Gap

1. **Fix signup 500 + ship trial-to-paid conversion (Dev, this week):** These are sequential P0 blockers. No revenue is possible until signup works and users can upgrade. Dev agents must resolve `fix-most-recent-next-js-dashboard-deployment-returns-5` first, then `uc-trial-to-paid-conversion-path`.

2. **Stojan personally tests full flow (Human, after P0 blockers clear):** Before recruiting anyone, Stojan must sign up, go through onboarding, and complete a test Stripe checkout. Any friction found here must be fixed immediately. This is not automatable.

3. **White-glove recruit 3-5 real agents (Human + Marketing, Days 55-70):** Personal outreach to real estate agents in Stojan's network. The system has invite flows and onboarding ready — what's missing is actual human contact. Target: 3 agents on Pro ($149/mo) = $447 MRR as proof of concept.

## Acceptance Criteria (Machine-Verifiable)

```json
[
  {"id": "signup-200", "command": "curl -s -o /dev/null -w '%{http_code}' https://leadflow-ai-five.vercel.app/signup", "expected": "200"},
  {"id": "checkout-page-exists", "command": "curl -s -o /dev/null -w '%{http_code}' https://leadflow-ai-five.vercel.app/dashboard/billing", "expected": "200"},
  {"id": "real-agents-exist", "command": "psql postgresql://clawdbot@localhost/openclaw -t -c \"SELECT COUNT(*) FROM real_estate_agents WHERE email NOT LIKE '%example.com' AND email NOT LIKE '%test%' AND mrr > 0\"", "expected": ">0"}
]
```
