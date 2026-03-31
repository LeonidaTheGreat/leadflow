# PRD: Revenue Alert — Critical Root Cause & Recovery Plan

**Date:** 2026-03-31  
**Priority:** P0 (Blocker)  
**Status:** SPECIFICATION  
**Owner:** Product Manager  
**Goal:** Identify why MRR is $0 and define 3 immediate actions to close the gap

---

## Executive Summary

**Current State:** $0 MRR (actual) vs. $20,000 target (day 45 of 60)  
**Gap:** $20,000 (100% below target)  
**Root Cause:** Broken funnel at email verification (0% verified of 384 signups)  
**Immediate Actions:** 3 priority fixes + 2 marketing strategies

**Impact:** Without fixing email verification, conversion is mathematically impossible. This is a **prerequisite blocker** for all revenue work.

---

## I. Funnel Analysis (Current State)

### Measurement — Raw Data from real_estate_agents Table

| Stage | Count | % of Signups | Status |
|-------|-------|-------------|--------|
| **Signups (all time)** | 384 | 100% | ✅ |
| **Email Verified** | 0 | 0% | 🔴 BROKEN |
| **Onboarding Completed** | 5 | 1.3% | 🔴 BROKEN |
| **Trial Started** | 0 | 0% | 🔴 BROKEN |
| **Paid (active subscription)** | 0 | 0% | 🔴 BROKEN |
| **MRR** | $0 | 0% | 🔴 BROKEN |

### Breakdown by Plan Tier (attempted signups)

| Tier | Count | Status |
|------|-------|--------|
| pilot | 11 | QC/test accounts (not real customers) |
| trial | 367 | **Stuck at inactive — never verified email** |
| (other) | 6 | Unclear status |

### Key Insight

**The email verification step is a complete blocker.** No agents have verified their email. This means:
- They cannot access the dashboard
- They cannot start the onboarding wizard
- They cannot connect FUB or Twilio
- They cannot see leads or send SMS
- They cannot convert to paid

**Without email verification, the funnel collapses at step 1.**

---

## II. Root Cause Analysis

### Why is email verification failing?

#### A. Email Delivery Pipeline Issues (Likely Root)

**Hypothesis:** Emails are not being sent or are being dropped.

**Evidence:**
- `email_verified = false` for 384 agents
- No error logs in dashboard
- Resend API was previously misconfigured in Vercel

**Sub-causes to investigate:**
1. **RESEND_API_KEY** — Is it set in Vercel production?
2. **Email provider** — Is Resend still the service, or changed?
3. **Email template** — Is verification link being generated correctly?
4. **Database writes** — Is `email_verified` column being updated when verification link is clicked?
5. **Email logs** — Are sent emails logged somewhere we can query?

#### B. Verification Link Issues (Less Likely but Possible)

**Hypothesis:** Emails send, but verification link doesn't work.

**Sub-causes:**
1. **Link format** — Does `/api/verify-email?token=xyz` exist and work?
2. **Token generation** — Are tokens being stored in `email_verification_tokens` table?
3. **Token expiration** — Are tokens expiring before user clicks?
4. **Database row update** — After clicking link, does the code update `email_verified = true`?

#### C. User Behavior (Least Likely)

**Hypothesis:** Emails send and links work, but users aren't clicking.

**Why this is unlikely:**
- 384 signups and 0 verified = 0% verification rate
- Even normal email open rates are 20-40%
- Combined with link clicks, we'd expect at least 1-2% verification
- 0% suggests systematic failure, not user behavior

---

## III. Immediate Action 1: Verify Email Delivery Pipeline

### Task 1a: Verify Vercel Environment Variables

**What to check:**
1. Is `RESEND_API_KEY` set in Vercel leadflow-ai project?
2. Is the key active in Resend dashboard?
3. Are there send logs in Resend dashboard from last 7 days?

**Success criteria:**
- [ ] Resend dashboard shows at least 1 successful email send in past 7 days
- [ ] Vercel env var is set and is a valid Resend key
- [ ] At least 1 verification email appears in Resend logs

**Owner:** Dev Agent  
**Time estimate:** 15 min  
**Acceptance check command:**
```bash
# In production logs, count verification emails sent in last 7 days
grep -c "verification_email_sent" /path/to/logs | [ $? -eq 1 ] && echo "0" || true
```

### Task 1b: Verify Email Delivery via Smoke Test

**What to do:**
1. Create a new test signup at vercel URL
2. Check Resend dashboard for the email
3. If email arrives, click the verification link
4. Check if `email_verified` column updates in database
5. Try logging in — should work if verified

**Success criteria:**
- [ ] Test email arrives in Resend within 5 seconds
- [ ] Verification link in email is clickable
- [ ] Clicking link updates `email_verified = true` in DB
- [ ] Dashboard login works after verification

**Owner:** QC Agent  
**Time estimate:** 10 min  
**Deliverable:** Test report with screenshots

### Task 1c: Query Email Verification Logs

**What to do:**
1. Check `/api/auth/signup` route for email sending code
2. Verify the code is being executed (add logging if needed)
3. Check if `email_verification_tokens` table has recent entries
4. Count tokens created vs. verified

**Success criteria:**
- [ ] Signup route logs email send attempt
- [ ] Database has email_verification_tokens from last 7 days
- [ ] At least 1 token has been "used" (verified)

**Owner:** Dev Agent  
**Time estimate:** 20 min

---

## IV. Immediate Action 2: Fix Email Verification UX Flow

**If email delivery is working but verification is broken:**

### Task 2a: Verify `email_verified` Column Logic

**What to check:**
1. After verification link is clicked, does code update `email_verified = true`?
2. Is the verification link format correct?
3. Does the route `/api/verify-email` exist and work?
4. Are there any type errors or missing middleware?

**Success criteria:**
- [ ] Route exists: `/api/verify-email` (or equivalent)
- [ ] Route accepts token parameter
- [ ] Route updates `email_verified = true`
- [ ] Route redirects to dashboard on success

**Owner:** Dev Agent  
**Time estimate:** 20 min

### Task 2b: Fix Token Expiration

**What to check:**
1. When is the verification token created?
2. When does it expire?
3. Is expiration time long enough (24-48 hours minimum)?

**Success criteria:**
- [ ] Tokens expire after at least 24 hours
- [ ] Expired tokens return clear error message
- [ ] User can request new token if expired

**Owner:** Dev Agent  
**Time estimate:** 15 min

### Task 2c: Add Email Verification Prompt to Onboarding Wizard

**Why:** Even if email verification works, users don't know they need to do it first.

**What to do:**
1. On `/dashboard/onboarding`, show modal: "Verify your email to continue"
2. If `email_verified = false`, block all wizard steps
3. Show verification email resend option

**Success criteria:**
- [ ] Unverified users see verification prompt on dashboard
- [ ] Can request email resend
- [ ] After verification, wizard unlocks

**Owner:** Dev + Design Agent  
**Time estimate:** 2h

---

## V. Immediate Action 3: Unblock Trial Signup → Onboarding

**Once email verification is fixed:**

### Task 3a: Verify Trial Expiration Logic

**What to check:**
1. Do trial agents have `trial_ends_at` set correctly?
2. Does dashboard show trial countdown?
3. Does trial expiration trigger email alert?

**Success criteria:**
- [ ] Trial start: `trial_ends_at` = 14 days from signup
- [ ] Dashboard shows days remaining
- [ ] Day 12: send "Trial ending soon" email
- [ ] Day 14: block access, show upgrade prompt

**Owner:** Dev Agent  
**Time estimate:** 1h

### Task 3b: Verify Upgrade Path from Trial → Paid

**What to check:**
1. Can trial users click "Upgrade" on dashboard?
2. Does it redirect to Stripe checkout?
3. Does Stripe webhook update `subscription_status` to "active"?
4. Does paid access unlock (remove trial expiration)?

**Success criteria:**
- [ ] Trial user can click upgrade button
- [ ] Stripe checkout loads with correct pricing
- [ ] After payment, dashboard unlocks paid features
- [ ] No error logs in API routes

**Owner:** Dev Agent  
**Time estimate:** 1.5h

---

## VI. Recovery Strategy: 2 Marketing Actions (Parallel)

**While dev team fixes the funnel, Marketing should:**

### Marketing Action 1: Direct Recruitment (White-Glove)

**Why:** Don't rely on organic conversion until funnel is proven.

**What to do:**
1. Manually recruit 5-10 real agents from your network
2. Personal email + phone call (not automated signup)
3. White-glove onboarding: "I'll walk you through"
4. Remove friction: manually verify email, skip wizard steps if needed
5. Track: did they reach "lead simulator" (aha moment)?

**Success criteria:**
- [ ] 5 agents start trial
- [ ] At least 2 reach aha moment (see lead simulator)
- [ ] At least 1 upgrades to paid
- [ ] Capture feedback: what worked? what was confusing?

**Owner:** Marketing Agent  
**Urgency:** IMMEDIATE (start today)  
**Time estimate:** 3-5 days

**Why this matters:** If 1 out of 5 white-glove recruits converts to paid, you have a signal. If 0 do, the product itself has issues (not funnel).

### Marketing Action 2: Landing Page → Quick Signup

**Why:** Current landing page doesn't clearly send traffic to signup.

**What to do:**
1. Add "Start Free Trial" button above the fold
2. Remove API docs / technical sections (confusing for agents)
3. Add social proof: testimonials from 3 agents (or sample testimonials)
4. Add urgency: "14-day free trial, no credit card"
5. Track: clicks on CTA buttons

**Success criteria:**
- [ ] CTA button visible without scroll
- [ ] Signup form loads within 2 seconds
- [ ] Form has email + password only (no extra fields)
- [ ] GA4 tracks CTA clicks and form submissions

**Owner:** Marketing + Design Agent  
**Urgency:** MEDIUM (do after email verification is fixed)  
**Time estimate:** 1 day

---

## VII. Success Metrics & Acceptance Criteria

### Email Verification Fix (Action 1)

**Machine-verifiable checks:**
```sql
-- Should return count > 0 after fix
SELECT COUNT(*) FROM real_estate_agents WHERE email_verified = true AND created_at > NOW() - INTERVAL '7 days';
```

**Pass criteria:** At least 3 agents with `email_verified = true` created in last 7 days

### Onboarding Flow Fix (Action 2)

**Machine-verifiable checks:**
```sql
-- Should return count > 10% after fix
SELECT 
  COUNT(CASE WHEN onboarding_completed = true THEN 1 END) * 100.0 / COUNT(*) AS completion_rate
FROM real_estate_agents 
WHERE subscription_status IN ('trial', 'active');
```

**Pass criteria:** At least 10% of trial/active agents have completed onboarding

### Trial-to-Paid Conversion (Action 3)

**Machine-verifiable checks:**
```sql
-- Should return count > 0 after fix
SELECT COUNT(*) FROM real_estate_agents WHERE subscription_status = 'active';
```

**Pass criteria:** At least 1 agent with active paid subscription

### White-Glove Recruitment (Marketing Action 1)

**Pass criteria:**
- 5+ agents recruited
- 2+ reach aha moment
- 1+ converts to paid (any tier)

---

## VIII. Timeline & Milestones

| Stage | Owner | Effort | Timeline | Blocker |
|-------|-------|--------|----------|---------|
| **Email verification audit** | Dev | 1h | Today | None — must complete first |
| **Email delivery fix (if needed)** | Dev | 2-4h | Today-Tomorrow | Blocks all downstream |
| **Trial → Paid path verification** | Dev | 2h | Tomorrow | Blocks conversion test |
| **White-glove recruitment (parallel)** | Marketing | 3-5d | Start today | Not blocked by dev work |
| **Landing page refresh** | Marketing + Design | 1d | After email fix | Nice-to-have |

**Go/No-Go Decision Point:** After email verification audit results, decide: can we fix today, or do we need to pivot approach?

---

## IX. If Email Verification Cannot Be Fixed Today

### Fallback: Bypass Email Verification for Pilot

**Why:** If email provider is fundamentally broken, we need to test product with real agents NOW.

**What to do:**
1. Temporarily set `email_verified = true` for pilot agents (manually in DB)
2. Manually send them the dashboard URL
3. Have them complete onboarding and reach aha moment
4. Get feedback: does product work?
5. THEN fix email verification as a separate ticket

**Acceptance criteria:**
- [ ] At least 1 pilot agent sees leads in dashboard
- [ ] At least 1 pilot agent receives SMS from AI system
- [ ] Get verbal feedback on UX: was it clear? what was confusing?

**Timeline:** 2-4 hours (manual work)

**Risk:** Not a sustainable solution — we need email verification before public launch.

---

## X. Prioritization Decision

**Current Priority Ranking (for dev resource):**

1. **🔴 P0: Email Verification Audit** — Understand what's broken (1h, unblock all else)
2. **🔴 P0: Email Delivery Fix** — If emails not sending, fix Resend setup (2-4h)
3. **🔴 P0: Email Verification Link Fix** — If link doesn't work, fix route + logic (2h)
4. **🟠 P1: Verification UX Prompt** — Block dashboard until verified (1-2h)
5. **🟠 P1: Trial Countdown Logic** — Show countdown + expiration (1h)
6. **🟠 P1: Trial → Paid Conversion** — Stripe flow + subscription update (1.5h)
7. **🟡 P2: Landing Page Refresh** — After product conversion is proven (1d)

**Total dev effort to get 1 first-paying customer:** 6-8 hours (if email fix is quick) or 2 days (if major rebuild needed)

---

## XI. Owner & Handoff

**Product Manager:** 
- Wrote this specification
- Identified root cause (email verification as blocker)
- Will monitor metrics from Supabase
- Will make go/no-go pivot decision

**Dev Agent:**
- Execute email verification audit (high confidence)
- Fix critical email delivery / link issues
- Verify trial → paid conversion works

**Marketing Agent:**
- Start white-glove recruitment today (no blockers)
- Prepare landing page improvements

**QC Agent:**
- Test email delivery end-to-end
- Verify trial-to-paid flow
- Test white-glove onboarding with real agents

---

## XII. Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-03-31 | PM | Initial root-cause analysis + recovery plan |
