# PRD: Revenue Recovery — Day 49 Critical Analysis

**ID:** prd-revenue-recovery-d49
**Status:** approved
**Priority:** P0 — Blocker
**Date:** 2026-04-04
**Author:** PM Agent

---

## Situation

- **Target:** $20,000 MRR within 60 days (Day 49 of 60)
- **Current MRR:** $0
- **Gap:** $20,000 (100% behind)
- **Days Remaining:** 11
- **Trial Agents:** 315
- **Pilot Agents:** 11
- **Paid Agents:** 0

The $20K MRR target in 11 days is mathematically unreachable through organic growth. Even at $149/mo Pro tier, we'd need 134 paying customers converted in 11 days from a base of 0 paid.

**Revised realistic goal for remaining 11 days:** First 3 paying customers ($447-$1,197 MRR depending on tier).

---

## Funnel Analysis

```
Awareness  → 315 trial signups (strong)
Signup     → 315 trials created (no friction here)
Onboarding → UNKNOWN completion rate (telemetry gap)
Aha Moment → UNKNOWN (simulator exists but unclear usage)
Trial→Paid → 0 conversions (COMPLETE BLOCK)
Retention  → N/A (no paid users)
```

### Critical Bottleneck: Trial-to-Paid Conversion (0%)

Three blockers prevent ANY revenue:

1. **Signup/Dashboard 500 errors** (P0 `fix-most-recent-next-js-dashboard-deployment-returns-5` — in_progress)
   - Users hitting signup get 500 → cannot enter product
   - Must be resolved before anything else matters

2. **Trial-to-paid conversion path not implemented** (P0 `uc-trial-to-paid-conversion-path` — in_progress, `uc-stripe-checkout-end-to-end` — ready)
   - No upgrade button, no checkout flow from trial → paid
   - Even willing customers cannot pay

3. **Stripe env vars may be missing/placeholder** (P1 `fix-stripe-not-configured-in-vercel-all-billing-return`, `fix-all-6-stripe-price-env-vars-are-placeholders`)
   - Even if checkout UI exists, backend may 503

### Secondary Blockers

4. **Email verification pipeline broken** (`uc-email-verification-unblock` — ready)
   - 386 trial agents may be locked out
5. **No direct outreach to existing trials** (`UC-PILOT-DIRECT-RECRUITMENT` — ready)
   - 315 trial users exist but zero have been contacted for conversion
6. **Landing page issues** (multiple P1/P2 UCs)
   - Affects new acquisition but not conversion of existing trials

---

## Recommended Actions (Priority Order)

### Action 1: Fix Production 500 Errors (Days 1-2)
**UC:** `fix-most-recent-next-js-dashboard-deployment-returns-5`
**Priority:** P0
**Why:** Nothing else matters if the app crashes on load.

### Action 2: Ship Trial-to-Paid Checkout Flow (Days 1-3)
**UC:** `uc-trial-to-paid-conversion-path` + `uc-stripe-checkout-end-to-end`
**Priority:** P0
**Why:** The only way to get from $0 to $X is a working checkout button.
**Acceptance:**
- Dashboard shows "Upgrade to Pro" CTA for trial users
- Clicking CTA → Stripe Checkout with real price IDs
- Successful payment → `real_estate_agents.plan_tier` updated to 'pro'
- `subscriptions` table populated on webhook

### Action 3: Direct Outreach to Top Trial Agents (Days 3-5)
**UC:** `UC-PILOT-DIRECT-RECRUITMENT`
**Priority:** P1
**Why:** 315 trial agents already signed up. Even a 1% conversion = 3 paid.
**Approach:**
- Query `real_estate_agents` for most engaged trials (login count, page views)
- Personal email from Stojan offering white-glove onboarding
- Requires working email delivery (RESEND_API_KEY in Vercel)

### Action 4: Unblock Email Verification (Days 2-4)
**UC:** `uc-email-verification-unblock` + `uc-email-verification-trial-activation`
**Priority:** P1
**Why:** 386 locked-out agents are potential revenue if unblocked.

---

## Use Case Priority Reassignment

The following UCs should be reprioritized to focus all capacity on revenue:

| UC | Current Priority | New Priority | Reason |
|----|-----------------|-------------|--------|
| `uc-trial-to-paid-conversion-path` | 0 | 0 | Keep — critical path |
| `uc-stripe-checkout-end-to-end` | 0 | 0 | Keep — critical path |
| `fix-most-recent-next-js-dashboard-deployment-returns-5` | 0 | 0 | Keep — blocks everything |
| `UC-PILOT-DIRECT-RECRUITMENT` | 1 | 0 | Upgrade — only way to reach trials |
| `uc-email-verification-unblock` | 0 | 0 | Keep — unlocks locked users |
| `uc-email-verification-trial-activation` | 1 | 0 | Upgrade — directly enables revenue |
| `uc-revenue-checkout-friction` | 1 | 0 | Upgrade — checkout must be frictionless |
| All P2+ UCs | 2-4 | Freeze | No P2+ work until first paid customer |

---

## Acceptance Criteria

1. At least 1 trial agent successfully completes Stripe checkout → becomes paid
2. `real_estate_agents` table shows `plan_tier = 'pro'` for at least 1 record with `stripe_customer_id` populated
3. MRR > $0
4. Checkout flow tested end-to-end on production (not just locally)

---

## Revised 90-Day Targets

Given the current state, the original 60-day/$20K target should be formally revised:
- **Day 60 (11 days):** First 1-3 paying customers. Proof of concept.
- **Day 75:** 20 paying customers (~$3,000 MRR)
- **Day 90:** 50+ paying customers (~$7,500 MRR)
- **Day 120:** Path to $20K MRR visible with growth metrics

The product has strong trial acquisition (315 signups) but zero conversion infrastructure. Fixing the checkout flow is the single highest-leverage action.
