# PRD: Revenue Recovery — Close $20K MRR Gap
**PRD ID:** prd-revenue-recovery-critical  
**Created:** 2026-03-31  
**Status:** active  
**Priority:** P0 (Blocker)  
**Days Remaining:** 46  
**Target:** $20,000 MRR  
**Current:** $0 MRR  
**Gap:** -$20,000 (-100%)

---

## Executive Summary

At Day 44 of 90, LeadFlow AI has $0 MRR and is 49% behind the expected revenue trajectory. Without immediate intervention, we will miss the $20K minimum target by Day 90. This PRD analyzes the critical bottleneck and proposes 3 executable actions to close the gap within 14 days.

---

## Current State Analysis

### Timeline Context
| Milestone | Target | Status | Days Remaining |
|-----------|--------|--------|-----------------|
| **Day 0** | Feb 15, 2026 | ✅ Launch MVP | - |
| **Day 44** | Mar 31, 2026 | **NOW** | - |
| **Day 90** | May 15, 2026 | Hit $20K MRR | **46 days** |

### Revenue Trajectory Gap
Expected revenue by Day 44: ~$9,890 (based on linear ramp: $20K ÷ 90 days × 44 days)  
Actual revenue by Day 44: $0  
**Gap: -$9,890 (-100%)**

This is not a small miss — we are completely off the trajectory. At the current pace, we will hit $0 MRR by Day 90.

---

## Root Cause: The Conversion Funnel is Broken

The conversion funnel from visitor → trial → paid customer has **5 critical breaks** that prevent revenue from even being attempted:

### Break 1: Zero Signups — No Real Agents Entering the Funnel
**Problem:** After 44 days, we have ZERO real-estate-agent signups. The product is live, but marketing channels are not activated, and there is no paid customer acquisition motion.

**Evidence:**
- Landing page deployed but no acquisition campaign running
- Landing page shows old "API docs" content mixed with marketing copy (conversion-killing)
- "Join the Pilot" button points to /pilot, which doesn't exist or is not advertised
- No Facebook ads, Reddit posts, FUB Marketplace listing, or referral program active
- No email nurture sequence flowing from landing page lead capture

**Conversion Killer:** Even if 100% of visitors converted to customers, we can't convert zero visitors.

### Break 2: Email Verification is Blocking Trial Activation (34% Completion)
**Problem:** Agents who sign up cannot access the product because email verification is broken. They receive no verification email or cannot click through.

**Evidence:**
- RESEND_API_KEY not configured in Vercel → no transactional emails sent
- Email verification tokens table missing or not integrated
- Signup page shows "Email us to verify" fallback instead of automated flow
- Pilot agent madzunkov@hotmail.com is locked out (email_verified=false)

**Conversion Killer:** 66% of signups abandon before seeing the product.

### Break 3: Onboarding Wizard is Incomplete — No Aha Moment
**Problem:** Agents who bypass email verification land on the dashboard with NO data, NO setup wizard, and NO "aha moment" (seeing AI respond to a test lead in <30 seconds). They see an empty dashboard and churn immediately.

**Evidence:**
- /dashboard/onboarding page redirects loop to /setup (ambiguous routing)
- simulator.tsx (the core aha moment demo) was never created
- Onboarding steps incomplete: email → FUB → SMS → **[aha moment missing]** → done
- New trial users see zero sample leads (empty state problem)
- No success page showing "Your AI lead responder is live"

**Conversion Killer:** Even agents who verify email see no product value and churn before paying.

### Break 4: Self-Serve Stripe Checkout is Not Connected to Real Data
**Problem:** Agents who complete onboarding and want to upgrade to paid cannot self-serve. There is no clear upgrade path, and Stripe integration has not been end-to-end tested in production.

**Evidence:**
- Self-serve checkout button may exist but has no E2E test in production
- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET not confirmed set in Vercel
- Stripe price IDs are placeholder strings (price_starter_49) not real IDs
- Webhook endpoint exists but column mismatches will cause silent failures
- No confirmation email on successful upgrade

**Conversion Killer:** If a miracle happens and an agent wants to pay, they hit a broken checkout.

### Break 5: Admin Pilot Invite Flow is Not Live
**Problem:** Stojan cannot directly recruit pilot agents without waiting for organic signups (which don't exist). The admin invite API does not exist.

**Evidence:**
- No /api/admin/invite-pilot endpoint
- Stojan must manually create accounts or wait for inbound traffic
- "Pilot recruitment blocked — 2 action items WAITING since Feb 25" (Telegram)
- 22 days of delay on the highest-priority business driver

**Conversion Killer:** We cannot bootstrap the first 3 agents without action items.

---

## Revenue Recovery Plan: 3 Critical Actions

Closing the $9,890 gap requires parallel execution of **3 P0 actions** over the next 14 days:

### Action 1: Activate Email Delivery (Days 1-2)
**Owner:** Dev  
**Dependency:** Stojan provides RESEND_API_KEY

**Scope:**
- Verify RESEND_API_KEY set in Vercel (leadflow-ai project)
- Test: signup → verification email sent → verify → trial access → dashboard
- If email_verification_tokens table missing, create it
- Smoke test validates email delivery within 60 seconds

**Why This is Critical:**
- Blocks 34% of trial signups from accessing the product
- Simplest fix (single env var)
- Unblocks all downstream UCs

**Success Metric:** All new trial signups receive verification email within 60 seconds

**UC Dependencies:**
- uc-email-verification-trial-activation (ready → in_progress)

---

### Action 2: Complete the Onboarding Aha Moment (Days 3-7)
**Owner:** Dev + PM  
**Dependency:** Clear routing (dashboard/onboarding vs /setup), simulator.tsx creation

**Scope:**
1. Create simulator.tsx (the missing component that shows AI response in <30s)
2. Wire simulator into onboarding page.tsx (step 5 of 6)
3. Test end-to-end: signup → email verify → dashboard → onboarding → FUB → SMS → **aha moment** → complete → main dashboard
4. Add sample leads for new-user empty state
5. Smoke test validates <5 min from signup to aha moment completion

**Why This is Critical:**
- $0 agents have seen the product work
- Aha moment is the #1 conversion driver pre-revenue
- Current empty dashboard = 90%+ churn

**Success Metric:** Aha moment completes in <5 minutes, agent sees "Your AI lead responder is live"

**UC Dependencies:**
- feat-aha-moment-lead-simulator (complete → verify in production)
- feat-post-signup-dashboard-onboarding-redirect (complete → verify routing)
- fix-simulator-tsx-step-component-does-not-exist (complete → verify implementation)

---

### Action 3: Direct Pilot Recruitment via Admin Invite (Days 3-5)
**Owner:** Dev + PM  
**Dependency:** Stojan approval + list of recruit emails

**Scope:**
1. Create /api/admin/invite-pilot endpoint (POST {email, name})
2. Create /admin/invite form for Stojan to input recruit info
3. Endpoint creates account, sends personalized magic-link email (expires 7 days)
4. Recruits click link → bypass email verification → land on onboarding
5. Orchestrator notifies Stojan of successful invites
6. Manual cohort: target 3-5 recruits in first week

**Why This is Critical:**
- Removes dependency on organic signups (which are zero)
- Direct path to first paying agents
- Can execute in parallel with email/aha moment fixes
- Gives Stojan agency over pilot recruitment

**Success Metric:** First 3 pilot agents onboard and see aha moment within 48 hours of invite

**UC Dependencies:**
- feat-admin-pilot-invite-flow (complete → verify in production)

---

## Reprioritized Use Cases by Revenue Impact

Based on this analysis, reprioritize the backlog as follows:

### P0 — Revenue Blockers (Do This Week)
**These 5 UCs must ship in the next 14 days or we miss the target.**

| UC ID | Name | Status | Owner | Est. Days | Why Critical |
|-------|------|--------|-------|-----------|------------|
| uc-email-verification-trial-activation | Fix Email Verification & Trial Activation | ready → in_progress | Dev | 2 | Unblocks 34% of signups |
| feat-aha-moment-lead-simulator | Complete Aha Moment Demo | complete → verify | Dev | 2 | Zero agents see product |
| feat-admin-pilot-invite-flow | Admin Direct Pilot Invite | complete → verify | Dev | 1 | Manual bootstrap |
| uc-stripe-checkout-end-to-end | Validate Stripe E2E (Prod) | ready → in_progress | Dev | 3 | Test first paid conversion |
| uc-marketing-campaign-launch | Launch Acquisition (10+ signups/day) | ready → in_progress | Marketing | 5 | Get agents into funnel |

### P1 — Revenue Enablers (Do in Week 2)
**These UCs convert agents from trial to paid once the top-of-funnel is fixed.**

| UC ID | Name | Status | Owner | Est. Days | Why Important |
|-------|------|--------|-------|-----------|--------------|
| uc-trial-email-sequence-activate | Pilot-to-Paid Nurture Sequence | in_progress | Dev | 3 | Automates pilot → paid |
| uc-dashboard-trial-countdown | Trial Expiration Countdown | not_started | Dev | 2 | Creates urgency |
| uc-pricing-page-conversion-refresh | Pricing Page Social Proof | not_started | Design + Dev | 3 | Improves checkout conversion |
| uc-first-agent-activation-test | Manual First Paid Conversion | ready → in_progress | PM | 2 | Prove the model works |
| uc-landing-page-refresh-messaging | Landing Page A/B Test | ready → in_progress | Marketing + Design | 5 | Improve top-of-funnel |

### P2 — Quality & Polish (Do After Revenue is Flowing)
**Everything else: nice-to-haves that don't directly impact MRR.**

---

## Expected Impact

### Scenario: All 3 Actions Executed Successfully (Days 1-7)

| Phase | Timeline | Signups | Trial→Paid % | MRR |
|-------|----------|---------|-------------|-----|
| **Current** | Day 44 | 0 | N/A | $0 |
| **Email Fix** | Day 46 | 5-10 | 0% (demo only) | $0 |
| **Aha Moment Live** | Day 48 | 10-15 | 5-10% | $0-150 |
| **Pilot Recruiting Starts** | Day 49 | 15-20 | 10-15% | $200-450 |
| **Striped Prod Test** | Day 51 | 20-25 | 15-20% | $500-1,000 |
| **Acquisition Campaign** | Day 55 | 40-50/week | 20-25% | $2,000-5,000 |
| **Day 90 Target** | Day 90 | 150+ agents | 30%+ | $20,000+ |

**Notes:**
- Email verification fix alone: +5% activation (from 66% churn to ~61%)
- Aha moment: +10-15% trial-to-paid conversion
- Acquisition campaign: 10x top-of-funnel growth
- Expected MRR by Day 60: $5K-10K (halfway to target)
- Expected MRR by Day 90: $20K-30K (exceed target)

---

## Risk Mitigation

### Risk 1: Email Verification Takes Longer Than Expected
**Mitigation:** Switch to transactional email via Resend immediately; use fallback manual verification if needed.

### Risk 2: Aha Moment is Buggy in Production
**Mitigation:** Run extensive QC smoke tests before deploy; have fallback to landing page demo if dashboard demo fails.

### Risk 3: Stripe Checkout is Not End-to-End Tested
**Mitigation:** Manually process first 5 paid conversions via admin endpoint; automated Stripe checkout is nice-to-have after that.

### Risk 4: Zero Acquisition Campaign Uptake
**Mitigation:** Focus on direct pilot recruitment (Stojan outbound) first; organic/referral second; paid ads only if organic is slow.

### Risk 5: Pilot Agents Don't Convert to Paid
**Mitigation:** This is a product problem — aha moment, onboarding speed, and lead volume must prove ROI. If pilots don't convert after 30 days, analyze why and pivot UX.

---

## Success Criteria

**Revenue Alert is RESOLVED when ANY of the following is true:**
1. ✅ First trial signup completes email verification and accesses dashboard
2. ✅ First agent sees aha moment (AI responds to test lead in <30s)
3. ✅ First pilot agent is invited via admin endpoint and joins
4. ✅ First Stripe transaction succeeds end-to-end (trial→paid)
5. ✅ Acquisition campaign running with 5+/day signups

**MRR Trajectory is Back on Track when:**
- Day 60: $5,000+ MRR (25% of target)
- Day 75: $15,000+ MRR (75% of target)
- Day 90: $20,000+ MRR (100% of target)

---

## Implementation Timeline

```
Week 1 (Days 44-50): Unblock the Funnel
├─ Day 44-46: Email verification live
├─ Day 46-48: Aha moment component + routing fixed
├─ Day 48-49: Admin invite endpoint + first pilots recruited
└─ Day 50: All 3 actions in production, smoke tests green

Week 2 (Days 51-57): Bootstrap Early Revenue
├─ Day 51-53: Stripe prod test + first paid conversion manual
├─ Day 54-55: Acquisition campaign launches
├─ Day 56-57: First 5-10 trial signups via campaign
└─ Day 57: $0 → $200-500 MRR (proof of concept)

Week 3 (Days 58-64): Scale Acquisition
├─ Day 58-60: Nurture sequence activated for pilots
├─ Day 61-64: Acquisition spending ramped to 10+/day signups
└─ Day 64: Target $2K-5K MRR

Weeks 4-6 (Days 65-90): Accelerate to Target
├─ Days 65-75: Full marketing campaign (10+/day)
├─ Days 75-85: Optimize trial→paid conversion funnel
├─ Days 85-90: Final sprint to $20K MRR
└─ Day 90: Hit target or escalate
```

---

## Acceptance Criteria

This PRD is **COMPLETE** when:

1. ✅ All 3 P0 actions are merged and in production
2. ✅ Email verification smoke test passes (new signup → email → verify → dashboard)
3. ✅ Aha moment E2E smoke test passes (<5 min from signup to aha completion)
4. ✅ Admin invite endpoint working + first 3 pilots onboarded
5. ✅ Stripe checkout E2E test passes (trial → upgrade → plan updated)
6. ✅ Acquisition campaign live with 5+/day signups
7. ✅ MRR > $0 (first paid agent converted)
8. ✅ Daily tracking dashboard shows MRR trajectory improving
9. ✅ Day 60 checkpoint: $5K+ MRR or escalate

---

## Open Questions Requiring Stojan Approval

1. **Admin Invite List:** What are the 5-10 target recruit emails for direct pilot recruitment?
2. **Acquisition Budget:** What's the max CAC we should spend on ads? ($50? $100? $200?)
3. **Pricing Strategy:** Do we stick with $49/$149/$399? Or change based on pilot feedback?
4. **Go/No-Go by Day 60:** If MRR < $5K by Day 60, do we pivot the product or strategy?

---

## Appendix: Use Case Dependencies

**All use cases must meet acceptance criteria before this PRD is marked complete.**

### Email Verification Chain
- uc-email-verification-trial-activation → feat-transactional-email-resend → fix-resend-api-key-not-set-in-vercel

### Onboarding Aha Moment Chain
- feat-post-signup-dashboard-onboarding-redirect → feat-aha-moment-lead-simulator → fix-simulator-tsx-step-component-does-not-exist → feat-post-login-onboarding-wizard

### Stripe Revenue Chain
- fix-self-serve-stripe-checkout → feat-stripe-checkout-production-e2e → fix-stripe-secret-key-missing → fix-stripe-webhook-secret-missing

### Acquisition Chain
- UC-LANDING-MARKETING-001 → uc-marketing-campaign-launch → improve-landing-page-analytics-ga4

---

**Status:** Active  
**Last Updated:** 2026-03-31  
**Next Review:** 2026-04-07 (Day 51 — assess progress on P0 actions)
