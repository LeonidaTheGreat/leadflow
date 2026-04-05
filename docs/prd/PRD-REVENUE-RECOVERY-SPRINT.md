# PRD: Revenue Recovery Sprint — 10-Day Path to First Paying Customer

**Status:** Active  
**Priority:** P0  
**Created:** 2026-04-05  
**Owner:** PM Agent  
**Deadline:** Day 90 (10 days remaining)  
**Revenue Gap:** $0 → $20,000 MRR

---

## The Situation

Day 80 of 90. $0 MRR. 0 customers. 0 subscriptions.

The technical foundation is largely built: auth, Stripe checkout, trial flow, onboarding, Aha moment simulator, pilot invite flow — all marked complete. The gap is not missing features. The gap is an unvalidated end-to-end funnel and zero pilots in the product.

The fastest path to first paying customer is: get a real person through signup → email verification → onboarding → Aha moment → upgrade prompt → paid.

---

## Funnel Analysis

| Stage | Status | Blocker |
|-------|--------|---------|
| Awareness | Weak | Landing page live, no active outreach |
| Signup | Broken (500 error) | `/signup` returns 500 in production |
| Email Verification | Unvalidated | UC ready but not shipped/tested E2E |
| Onboarding | Untested with real users | Trial flow built, no pilot agents |
| Aha Moment | Built | Lead simulator complete |
| Trial-to-Paid Prompt | In progress | Nudge built, checkout E2E unvalidated |
| Paid | 0 | Everything upstream is blocked |

**Primary blocker:** Signup page returns 500. No one can enter the funnel.

**Secondary blocker:** No real agents have been recruited to pilot. Even if the funnel works, there's no one walking through it.

**Tertiary blocker:** Stripe checkout E2E not validated in production. Even if pilots enter and reach the upgrade prompt, payment may fail silently.

---

## Priority Actions

### Action 1 — Fix Signup 500 (P0, Day 1-2)

**UC:** `fix-most-recent-next-js-dashboard-deployment-returns-5` (in_progress)

**Why:** This is the gate to the entire funnel. No signup = no trial = no revenue. Every day this is broken is a day with zero conversion potential.

**Acceptance Criteria:**
- `POST /signup` on `leadflow-ai-five.vercel.app` returns 200 with valid session token
- New account is created in `customers` table
- User is redirected to `/dashboard/onboarding` (not a 404 or 500)
- E2E smoke test covers: signup → redirect → onboarding page loads
- Verified in production (not just local)

---

### Action 2 — Validate Email Verification + Trial Activation E2E (P0, Day 2-3)

**UC:** `uc-email-verification-trial-activation` (ready)

**Why:** Without working email verification, new signups are stuck. They can't activate their trial, can't experience the product, can't convert.

**Acceptance Criteria:**
- Signup sends verification email via Resend within 60 seconds
- Clicking verification link sets `email_verified=true` in DB
- Verified user is auto-redirected to onboarding (not left on a blank/error page)
- Trial status (`trial_active=true`, `trial_ends_at=now()+14d`) is set on verification
- E2E test covers full flow: signup → email received → click link → onboarding loads with trial active
- Verified in production with a real email address

---

### Action 3 — Validate Stripe Checkout Production (P0, Day 3-4)

**UC:** `uc-stripe-checkout-end-to-end` (ready) + `uc-revenue-checkout-friction` (ready)

**Why:** If a pilot agent reaches the upgrade prompt and checkout fails, we lose the conversion at the last moment. This must be validated before recruiting pilots.

**Acceptance Criteria:**
- Full checkout flow works: dashboard upgrade CTA → Stripe checkout page loads → test card completes → webhook fires → `subscriptions` table populated with `status='active'`, correct `plan_tier`
- `uc-populate-subscriptions-on-checkout-complete` (not_started) must be shipped as part of this — without it, no subscription record is created post-payment
- Trial-to-paid conversion nudge (countdown widget, expiry CTA) visible and functional for users in trial
- Post-payment redirect lands on dashboard with active subscription state
- E2E test covers: checkout completion → subscription row exists → dashboard reflects paid status

---

### Action 4 — Recruit First 3 Pilot Agents (P0, Day 4-7, Human-Driven)

**UC:** `UC-PILOT-DIRECT-RECRUITMENT` (ready)

**Why:** The funnel is broken without real users. Stojan needs to personally recruit 3 agents who will use the product for free for 14 days, then convert. These are the only path to MRR within 10 days.

**What "ready" means here:** Actions 1-3 must be complete before recruiting. Sending a pilot to a broken signup page kills the relationship.

**Acceptance Criteria:**
- 3 real estate agents have active accounts (signup complete, email verified, trial active)
- Each agent has connected their FUB account OR experienced the demo mode
- Each agent has seen the Aha Moment (lead simulator response in <30s)
- Stojan has had a direct conversation with each agent about converting to paid at trial end

**Target:** At least 1 pilot converts to Pro ($149/mo) by Day 88. That's $149 MRR — the first dollar. Scale follows.

---

## Use Case Reprioritization

### Promote to P0 (block everything else)

| UC ID | Name | Reason |
|-------|------|--------|
| `fix-most-recent-next-js-dashboard-deployment-returns-5` | Signup 500 fix | Gate blocker |
| `uc-email-verification-trial-activation` | Email verification + trial activation | Required for any activation |
| `uc-stripe-checkout-end-to-end` | Stripe checkout E2E | Required for payment |
| `uc-populate-subscriptions-on-checkout-complete` | Populate subscriptions on checkout | Required for post-payment state |
| `UC-PILOT-DIRECT-RECRUITMENT` | Direct pilot recruitment | Required for any users |

### Keep at P1 (ship in parallel if capacity exists)

| UC ID | Name | Reason |
|-------|------|--------|
| `uc-trial-to-paid-conversion-path` | Trial-to-paid conversion path | Nudge + CTA for converting pilots |
| `uc-auto-trigger-onboarding-post-verify` | Auto-trigger onboarding post-verify | Reduces drop-off after email verification |
| `uc-revenue-checkout-friction` | Frictionless checkout | Remove any payment friction |

### Defer (not this sprint)

Everything with `revenue_impact='none'` and no direct funnel impact. Genome improvements, analytics, design polish — none of this matters until we have a paying customer.

---

## Success Metrics for This Sprint

| Metric | Target by Day 90 |
|--------|-----------------|
| Signup page 200 response | Yes |
| End-to-end trial activation working | Yes |
| Stripe checkout producing subscription rows | Yes |
| Pilot agents in product | 3 |
| Paying customers | 1+ |
| MRR | $149+ (first dollar) |

$20K MRR in 10 days from 0 customers is not achievable through product work alone. The realistic target is: **first paying customer within 10 days**, then use that proof point to accelerate pilot recruitment and scale.

---

## What This PRD Does NOT Cover

- Marketing campaigns, SEO, content — not this sprint
- Team/Brokerage tier features — not this sprint
- Voice integration (VAPI) — not this sprint
- FUB Marketplace listing — not this sprint
- A2P 10DLC compliance — external dependency, can't be resolved in 10 days

---

## Risks

| Risk | Probability | Mitigation |
|------|------------|------------|
| Signup fix reveals deeper DB/schema issues | Medium | Fix has been in_progress; dev must test against production DB |
| Email delivery still broken (Resend key) | Low | RESEND_API_KEY fix is marked complete; verify in production |
| Pilots don't convert within trial period | High | Stojan must be hands-on: demo calls, direct follow-up |
| Stripe webhooks not firing in production | Medium | Must test with real Stripe test clock, verify webhook endpoint |

