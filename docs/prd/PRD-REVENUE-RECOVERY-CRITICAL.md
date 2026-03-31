# PRD: Revenue Recovery — Critical Path to $20K MRR

**PRD ID:** revenue-recovery-critical-2026-q1  
**Priority:** P0 (Blocker)  
**Status:** Ready for Implementation  
**Goal Type:** MRR (Monthly Recurring Revenue)  
**Date:** 2026-03-31  
**Revision:** 1.0

---

## Executive Summary

LeadFlow AI has **384 trial signups** but **$0 MRR**. The product is not converting users from trial to paid. Root cause analysis reveals a **broken onboarding funnel**: 98.6% of trial users never progress past onboarding step 0.

**Critical findings:**
- 384 total signups (365 via trial CTA)
- 0 paid customers
- 367 trial users in onboarding
- **0 progression** — all stuck at step 0
- **0 users** with FUB connected or SMS verified

**This is a complete conversion failure, not a traffic problem.**

**Recommendation:** Fix the post-signup onboarding wizard first (P0), then activate the trial→paid conversion path (P1).

---

## 1. Current State Analysis

### 1.1 Funnel Breakdown

| Stage | Count | % of Signups | % of Previous | Note |
|-------|-------|--------------|---------------|------|
| Landing Page Visitor | ? | — | — | Not tracked yet |
| Signup Submitted | 384 | 100% | — | Trial CTA: 365, Direct: 18, Pilot: 1 |
| Trial Active | 367 | 95.6% | 95.6% | plan_tier = 'trial' |
| Onboarding Completed | 5 | 1.3% | 1.4% | ← **MASSIVE DROP-OFF** |
| FUB Connected | 0 | 0% | 0% | Core feature disabled |
| SMS Verified | 0 | 0% | 0% | No one using product |
| **Paid** | **0** | **0%** | **0%** | **CONVERSION FAIL** |

### 1.2 Onboarding Bottleneck

- **All 367 trial users are stuck at `onboarding_step = 0`**
- Onboarding status: `status = 'onboarding'` (never progresses)
- Last onboarding update: 2026-03-15 (5+ days ago, no recent activity)
- No motion in onboarding wizard

**Why:** The post-signup onboarding flow is either:
1. Not rendering (redirect broken)
2. Not persisting user progress (step counter not updating)
3. Blocking users (UX friction, missing required fields)
4. Not tracking completion (telemetry issue)

### 1.3 Product Readiness Status

| Component | Status | Evidence |
|-----------|--------|----------|
| Signup Flow | ✅ Works | 384 accounts created |
| Onboarding Wizard | 🔴 **BROKEN** | 0 users past step 0 |
| FUB Integration | ✅ Ready | UC-6 marked complete |
| SMS Integration | ✅ Ready | Twilio verified working |
| Dashboard | ✅ Accessible | No auth failures reported |
| Trial Timer | 🟡 Uncertain | Tables exist, no expiration logic seen |
| Conversion CTA | 🟡 Unclear | Unclear when/how trial → paid flow triggers |

---

## 2. Revenue Impact Analysis

### 2.1 The Gap

**Target (Day 46):** $20,000 MRR  
**Current:** $0 MRR  
**Gap:** -$20,000 (-100%)  
**Days to Target:** 46 days remaining  

To reach $20K MRR in 46 days, need:
- **~135 Pro users @ $149/mo = $20,115 MRR**, OR
- **~50 Pro + 30 Team = $19,450 MRR**, OR
- Mix of tiers to hit $20K

### 2.2 Conversion Requirement

Starting position: 367 trial users in funnel

**If onboarding works and converts at industry benchmarks:**
- 30% → onboarding complete = 110 users
- 10% → FUB connected = 11 users
- 5% → purchase = 6 users in next 30 days

**Current trajectory:** 0 users will convert.

**Path to $20K:**
1. Fix onboarding (enable 80%+ completion) → 294 ready to convert
2. Show trial expiration countdown → ~15% purchase before expiration
3. Convert ~45 trial users to paid in next 46 days
4. Average purchase mix hits $20K MRR

---

## 3. Root Cause: Broken Onboarding Wizard

### 3.1 Symptoms

1. **No step progression** — `onboarding_step` stuck at 0 for 367 users
2. **No time-based updates** — Last update 2026-03-15, 5+ days with no activity
3. **100% drop at first step** — 5 "complete" accounts but none progressed past step 0
4. **No product engagement** — 0 FUB connections, 0 SMS verifications

### 3.2 Suspected Issues

**Likely causes (order of probability):**

1. **Post-signup redirect missing or broken** — Users don't reach `/dashboard/onboarding` after email confirmation
2. **Wizard component not rendering** — Page exists but wizard never loads
3. **Step submission endpoint broken** — POST requests to advance step fail silently
4. **Missing auth/session** — Users logged out or cookies not persisting
5. **Database updates failing** — Step advances computed but not persisted

### 3.3 Impact

Every day the onboarding is broken:
- ~7-8 new trial signups convert → onboarding step 0 → stuck
- 0 → conversion → $0 MRR momentum
- **14-day trial window passes** → users expire without ever using product

---

## 4. Use Cases to Close the Gap (Prioritized)

### P0: Onboarding Restoration (BLOCKER)

**UC-ONBOARDING-RESTORE-001: Fix Post-Signup Onboarding Wizard**

- **Owner:** Dev
- **Priority:** P0
- **Objective:** 80%+ of trial users progress past step 0 within 3 days
- **Acceptance Criteria:**
  - [ ] Post-signup email contains correct `/dashboard/onboarding` link
  - [ ] Users redirected to onboarding wizard after email verification
  - [ ] Step 1 (FUB connection) loads without error
  - [ ] Step submission (Next/Back buttons) works and persists `onboarding_step`
  - [ ] At least 50% of new signups reach step 1+ within 24h
  - [ ] Smoke test passes: signup → email verify → wizard loads
- **Test Spec:**
  - Signup with new email
  - Verify email (click link)
  - Assert page redirects to `/dashboard/onboarding`
  - Assert wizard renders with step indicator
  - Click "Connect FUB" → assert step advances
  - Verify `onboarding_step = 1` in DB
- **Success Metric:** 250+ existing trial users auto-advance to step 1+

---

### P1: Trial Expiration & Conversion Path

**UC-TRIAL-COUNTDOWN-001: Dashboard Trial Expiration Countdown**

- **Objective:** Users see "Your trial expires in X days" + upgrade CTA
- **Acceptance Criteria:**
  - [ ] Trial countdown badge shows on dashboard
  - [ ] For users < 3 days left: bold red, "Upgrade now" button
  - [ ] Clicking button → `/pricing?plan=pro&upgrade=true`
  - [ ] Works for all plan tiers in trial
- **Test Spec:** Sign up for trial, count remaining days, assert badge rendered
- **Success Metric:** Drives 5-10% trial → paid conversion

---

### P2: Trial → Paid Conversion Email Sequence

**UC-TRIAL-EMAIL-SEQUENCE-002: Automated Conversion Emails**

- **Objective:** Send conversion prompts: Day 3 ("See your first leads"), Day 7 ("Last week of trial"), Day 12 ("Trial expires tomorrow")
- **Acceptance Criteria:**
  - [ ] Email 1 sent Day 3 of trial (with test lead)
  - [ ] Email 2 sent Day 7 of trial (social proof + urgency)
  - [ ] Email 3 sent Day 12 of trial (final offer)
  - [ ] Each email has direct upgrade link
  - [ ] Unsubscribe & tracking working
- **Test Spec:** Create trial account, verify emails arrive on correct days
- **Success Metric:** 5-8% email click-through rate to pricing

---

### P3: Pricing Page Conversion Optimization

**UC-PRICING-CONVERSION-003: Trial User Upgrade Experience**

- **Objective:** When trial user clicks "Upgrade" → see Pro plan as default, show annual discount
- **Acceptance Criteria:**
  - [ ] Pricing page loads with `?trial=true` parameter
  - [ ] Pro plan highlighted/recommended
  - [ ] Annual billing option shown ("Save 20%")
  - [ ] CTA text: "Continue as Pro" (not "Start Trial")
  - [ ] No credit card required messaging removed
- **Test Spec:** Visit `/pricing?trial=true`, assert Pro highlighted
- **Success Metric:** Improves trial-to-paid conversion by 10-20%

---

## 5. Launch Sequence (46 Days)

### Week 1 (Days 1-7)
- **P0:** Fix onboarding wizard
- **Success:** 200+ trial users advance past step 0
- **Metric:** onboarding_step distribution shifts to 1+

### Week 2-3 (Days 8-21)
- **P1:** Launch trial countdown + email sequence
- **Success:** Emails sending, 5% click-through to pricing
- **Metric:** First 10 trial → paid conversions

### Week 4-6 (Days 22-46)
- **P2:** Pricing page optimization
- **Success:** Ramp to 35-45 paid customers
- **Metric:** $20K MRR achieved

---

## 6. Success Metrics & KPIs

### Conversion Funnel Targets (46 days)

| Metric | Current | Target | Owner |
|--------|---------|--------|-------|
| Trial Signup/Day | 8 | 10+ | Marketing |
| Onboarding Complete Rate | 1.4% | 75%+ | Dev (UC-ONBOARDING-RESTORE-001) |
| FUB Connections | 0 | 50+ | Orchestrator (depends on onboarding) |
| Trial → Paid Conversion Rate | 0% | 10%+ | Product (pricing + emails) |
| **Paid Customers** | **0** | **45+** | **All** |
| **MRR** | **$0** | **$20K** | **All** |

### Weekly Dashboard Reporting

1. **Onboarding completion rate** — % of trial users at step 1+
2. **FUB connection rate** — % who complete step 2+
3. **Trial → paid conversion** — % of trial users who upgrade
4. **MRR and customer mix** (Pro/Team/Pilot/Brokerage)
5. **Trial cohort retention** — % active by day 7/14

---

## 7. Dependencies & Risks

### Critical Dependencies

1. **Onboarding wizard must work** — blocks all downstream conversion
2. **Email delivery (Resend)** — conversion sequence requires working email
3. **Stripe checkout** — must handle trial user → paid customer transition
4. **Cal.com integration** — no SMS without booking capability

### Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Onboarding takes >7 days to fix | Lose 7 days of funnel | Parallel: do marketing prep |
| Users still don't connect FUB | Can't send SMS | Redesign FUB step 2 for clarity |
| Trial expiration doesn't trigger | Users confused when access revoked | Pre-emptively warn at Day 10 |
| Email delivery still broken | No conversion sequence | Verify Resend env vars in Vercel |

---

## 8. Acceptance Criteria (Complete PRD)

**This PRD is complete when:**

- [ ] UC-ONBOARDING-RESTORE-001 is implemented & tested
  - New trial users (100%) progress past step 0
  - Existing 367 trial users can manually retry onboarding
- [ ] UC-TRIAL-COUNTDOWN-001 deployed to production
  - Dashboard shows countdown for all trials
  - 10+ trial users see expiration warning
- [ ] UC-TRIAL-EMAIL-SEQUENCE-002 activated
  - 50+ trial users receive Day 3, Day 7, Day 12 emails
  - Click tracking shows conversion intent
- [ ] First paid customer converts (proof of concept)
  - One trial user upgrades to Pro
  - Stripe charge processed successfully
  - Conversion path verified end-to-end
- [ ] Baseline metrics locked in
  - Week 1 onboarding completion % reported
  - Conversion % calculated
  - MRR trend toward $20K visible

---

## 9. Revenue Math & Timeline

### Current Trajectory (Broken Onboarding)
- 8 signups/day × 46 days = 368 new trial users
- 0 conversions
- **MRR: $0**
- **Outcome: MISS TARGET**

### Target Trajectory (All UCs Deployed)

**Week 1 (Days 1-7):** Onboarding fixed
- 56 new trial signups
- 45 reach step 1+ (80% conversion)
- **Paid customers: 0** (too early for conversions)

**Week 2 (Days 8-14):** Email sequence launches
- 56 new signups + 45 from Week 1
- **First conversions appear** (day 7-8 emails trigger)
- 3-5 trial → paid conversions estimated
- **MRR: ~$450-750** (5 × $149 Pro)

**Week 3-4 (Days 15-28):** Conversion accelerates
- 80 conversions in-motion (2 weeks + new weekly cohort)
- Day 7 email hits full Week 2 cohort
- 10-15 trial → paid conversions
- **MRR: ~$3,000-4,000** (25 × $149 Pro)

**Week 5-6 (Days 29-46):** Ramp to target
- Full pipeline active (3 weekly cohorts converting)
- Pricing optimization deployed
- 30-40 trial → paid conversions (last 2 weeks)
- **Target: $20K MRR** (estimated 130+ Pro customers)

---

## 10. What This PRD Covers

✅ **Specification:** Post-signup onboarding wizard restoration  
✅ **Specification:** Trial countdown UX  
✅ **Specification:** Conversion email sequence  
✅ **Specification:** Pricing page trial optimization  
✅ **Acceptance Criteria:** All UCs defined with verifiable tests  
✅ **Timeline:** 46-day path to $20K MRR  
✅ **Revenue Impact:** $0 → $20K breakdown  
✅ **Metrics:** Funnel, weekly reporting, KPIs  

❌ **Not in this PRD:** Code implementation, design mockups, copy  
❌ **Not in this PRD:** Stretch goals beyond $20K MRR  

---

## 11. Next Steps

1. **Dev reads UC-ONBOARDING-RESTORE-001** — diagnose why onboarding_step isn't advancing
2. **QC prepares test suite** — smoke test for post-signup flow
3. **Product monitors conversion** — daily MRR tracking during implementation
4. **Marketing waits** — don't launch new campaigns until conversion works

**Timeline to first fix:** Target deployment by Day 3-4 (2026-04-03 to 04-04)

---

## Document Metadata

- **Authored by:** Product Manager
- **Last Updated:** 2026-03-31
- **Status:** Ready for Dev Assignment
- **Version:** 1.0
- **Related UCs:** UC-ONBOARDING-RESTORE-001, UC-TRIAL-COUNTDOWN-001, UC-TRIAL-EMAIL-SEQUENCE-002, UC-PRICING-CONVERSION-003
