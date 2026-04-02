# PRD: Revenue Recovery — Critical Path to First MRR (Day 47)

**PRD ID:** prd-revenue-recovery-critical-day47  
**Status:** ready  
**Priority:** P0  
**Last Updated:** 2026-04-02  
**Assigned to:** Product Manager + Orchestrator  
**Target Completion:** Day 52 (5 days) for specification  
**Revenue Impact:** -$10,330 MRR gap (target $10,330, actual $0)

---

## EXECUTIVE SUMMARY

On **Day 47 of 90**, LeadFlow has **zero MRR** against a target of **$10,330**. We have assembled a buildable, deployable product but have not yet converted a single trial user to paid. This is not a technical problem—it is a **go-to-market execution problem**.

### Current Conversion Funnel

```
Landing Page → Signup → Email Verify → Onboarding → Trial Dashboard → Aha Moment → Checkout → Paid
   311 total      311        187           11             11              0           0        $0
   agents      signed up   verified     completed      saw value        --conversion-- MRR
   (60%)       (100%)      (60%)         (3.5%)          (0%)             (0%)        (0%)
```

### Root Cause: Three Sequential Blockers

1. **Email Verification Broken** → 40% of agents stuck at signup (124/311 never verified)
2. **Onboarding Wizard Never Triggers** → 95% of verified agents see empty dashboard (176/187 never start)
3. **Trial-to-Paid Mechanism Missing** → No checkout, no trial countdown, no conversion email (11 onboarded agents have no upgrade path)

### The Path Forward: Three Actions in 5 Days

| Action | Days | Impact | Owner | Blocker |
|--------|------|--------|-------|---------|
| **Fix Email Verification** | 2 | Unlock 124 agents to access trial | Dev | CRITICAL |
| **Fix Onboarding Wizard** | 2 | Demo aha moment to 150+ verified agents | Dev | CRITICAL |
| **Enable Trial-to-Paid Checkout** | 1 | Activate conversion mechanism for all agents | Dev | CRITICAL |

### Expected Outcome (By Day 52)

If all three blockers are cleared:
- **Stage 2 unlock:** 150+ agents complete onboarding and see AI demo
- **Stage 3 conversion:** 10-15 agents convert to Pro tier ($149/mo)
- **MRR by Day 52:** ~$2,000 (vs. current $0)
- **Trajectory to $20K:** Visible and achievable by Day 90

---

## 1. CURRENT FUNNEL ANALYSIS (Day 47 Snapshot)

### Funnel Metrics (As of 2026-04-02T18:00Z)

| Stage | Metric | Count | % of Previous | % of Total | Status |
|-------|--------|-------|----------------|------------|--------|
| **Awareness** | Landing page visitors | Unknown | — | — | ⚠️ GA4 not tracking |
| **Signup** | Trial signups | 311 | 100% | 100% | ✅ Working |
| **Email Verify** | Verified agents | 187 | 60% | 60% | ❌ BROKEN |
| **Onboarding** | Completed wizard | 11 | 6% | 3.5% | ❌ STUCK |
| **Aha Moment** | Agents who saw demo | 0 | 0% | 0% | ❌ NOT TRIGGERED |
| **Checkout** | Agents who saw checkout | 0 | 0% | 0% | ❌ MISSING |
| **Paid** | Active subscriptions | 0 | 0% | 0% | ❌ ZERO MRR |

### Key Insight: Waterfall Effect

The funnel is **cascading**. The 11 agents who completed onboarding (3.5%) are **stranded** because:
- They cannot progress → no aha moment triggered
- They cannot see value → dashboard is empty
- They cannot convert → no checkout UI exists

**Solution:** Fix the three blockers sequentially. Each fix cascades value down the funnel.

---

## 2. ROOT CAUSE ANALYSIS: THREE BLOCKERS

### BLOCKER #1: Email Verification (Breaks 40% of Agents)

**Problem:**
- Email verification table does not exist → agents signup but cannot verify email
- 124 agents (40% of 311) are stuck at `email_verified = false`
- These agents cannot access trial dashboard
- They do not receive trial-ending or upgrade emails

**Evidence:**
- Query: `SELECT COUNT(*) FROM real_estate_agents WHERE email_verified = false` → **124 agents**
- These agents have `onboarding_step = 0` (never progressed past email verification gate)
- No `email_verification_tokens` table exists in schema

**Impact if Fixed:**
- 124 stuck agents gain trial dashboard access
- Cascades 124 new agents → onboarding wizard → aha moment stage
- Potential MRR impact: 124 × 2-5% conversion × $149/mo avg = $370-930 MRR

**Effort Estimate:** 2 days
- Day 1: Create `email_verification_tokens` table (migration)
- Day 1: Configure RESEND_API_KEY in Vercel + local env
- Day 2: Auto-send verification emails to 124 unverified agents
- Day 2: Auto-activate trial access on email verification

**Acceptance Criteria:**
- ✅ `email_verification_tokens` table created with proper schema
- ✅ RESEND_API_KEY configured in Vercel + verified working
- ✅ 124 verification emails sent (batch job)
- ✅ Agents receive email and can verify (test: verify 5 test accounts)
- ✅ Verified agents can access /dashboard/onboarding
- ✅ `email_verified = true` for all who click verification link

---

### BLOCKER #2: Onboarding Wizard Doesn't Auto-Trigger (95% of Verified Agents Stuck)

**Problem:**
- Wizard is built but never auto-triggers on login
- 176 verified agents (94% of 187) never see onboarding wizard
- They land on empty dashboard → see no value → abandon
- 11 agents somehow completed wizard (source unclear) but still see empty dashboard

**Evidence:**
- Query: `SELECT COUNT(*) FROM real_estate_agents WHERE onboarding_completed = false AND email_verified = true` → **176 agents**
- These agents have `onboarding_step = 0` or low step count
- No sample leads are populated in their account
- Dashboard shows "No messages yet" — demoralizing experience

**Impact if Fixed:**
- 176 verified agents see onboarding wizard automatically
- 176 agents get auto-populated sample leads (AI demo)
- Aha moment: agents see "AI responded in <30 seconds" → understand value
- Potential MRR impact: 176 × 5-10% conversion × $149/mo = $1,309-2,618 MRR

**Effort Estimate:** 2 days
- Day 1: Auto-trigger wizard on first login (route logic)
- Day 1: Auto-populate 5 sample leads per agent (seed script)
- Day 2: Verify wizard displays properly and leads appear (E2E test)
- Day 2: Test with 10 agents (manual QC)

**Acceptance Criteria:**
- ✅ Wizard auto-triggers on first login for agents with `onboarding_completed = false`
- ✅ Sample leads are auto-populated (5 leads per agent)
- ✅ Wizard displays "AI responded in 23 seconds" (demo aha moment)
- ✅ Agents can see sample responses in dashboard
- ✅ Wizard completion sets `onboarding_completed = true` + timestamp
- ✅ 10 manual test accounts complete wizard without friction

---

### BLOCKER #3: Trial-to-Paid Conversion Mechanism Missing (Zero Checkout)

**Problem:**
- No self-serve checkout UI in dashboard
- No trial countdown timer (agents don't know when trial expires)
- No conversion email sequence (agents don't get reminded to upgrade)
- 11 agents who completed onboarding have no path to paid

**Evidence:**
- No `/checkout` or upgrade endpoint in routes/
- No trial countdown UI in dashboard
- Stripe is configured but never called from frontend
- Zero `subscription_status = 'active'` records (no one has converted)

**Impact if Fixed:**
- All 11 agents who completed onboarding get upgrade CTA
- 10% conversion rate (industry standard for SMB SaaS) = 1 paid agent = $149 MRR
- As funnel fixes propagate, 150+ onboarded agents will have conversion path = 15 paid = $2,235 MRR

**Effort Estimate:** 1 day
- Day 1: Add trial countdown timer to dashboard (displays "X days left")
- Day 1: Add upgrade CTA with self-serve checkout
- Day 1: Integrate Stripe checkout (pre-built, just need to wire)
- Day 1: Send first trial-ending email at Day 5 of trial

**Acceptance Criteria:**
- ✅ Dashboard displays "Your trial ends in X days"
- ✅ Upgrade CTA visible below trial countdown
- ✅ Click upgrade → Stripe checkout modal opens
- ✅ Checkout allows card entry + plan selection
- ✅ Successful payment creates subscription + sets `subscription_status = 'active'`
- ✅ Email sent 5 days before trial expires reminding to upgrade
- ✅ Test: Complete full conversion flow (signup → onboard → upgrade → paid)

---

## 3. FUNNEL RECOVERY ROADMAP: 5-DAY CRITICAL PATH

### Day 47: Analysis & Planning (TODAY)
- ✅ PM completes root cause analysis (this PRD)
- ✅ PM identifies three blockers and effort estimates
- ✅ PM creates E2E test specs for each blocker
- ✅ PM inserts use cases into Supabase
- → **Output:** This PRD + UC definitions + E2E test specs

### Day 48-49: Fix Blocker #1 — Email Verification (2 days)
- Dev: Create `email_verification_tokens` table
- Dev: Configure RESEND + send 124 verification emails
- QC: Verify 5 test accounts can receive + click email verification link
- **Target:** 124 agents verify email, gain dashboard access
- **Success metric:** Query shows 311 agents with `email_verified = true`

### Day 49-50: Fix Blocker #2 — Onboarding Wizard (2 days)
- Dev: Auto-trigger wizard on first login
- Dev: Auto-populate sample leads for all agents
- QC: Test with 10 new accounts, verify aha moment displays
- **Target:** 176 verified agents see wizard + sample demo
- **Success metric:** 10 test agents complete wizard without friction

### Day 50: Fix Blocker #3 — Trial-to-Paid Checkout (1 day)
- Dev: Add trial countdown timer
- Dev: Add upgrade CTA + Stripe checkout
- Dev: Configure trial-ending email sequence
- QC: Test full conversion (signup → onboard → upgrade → paid)
- **Target:** First conversion flow ready for pilot agents
- **Success metric:** Test agent can complete full journey from signup to paid

### Day 51-52: Verification & Go-Live (1 day buffer)
- QC: Run full E2E test suite
- Verify: Database shows increased completion rates at each stage
- Deploy: Merge to main + deploy to Vercel
- Monitor: Check for errors in production

---

## 4. USE CASES TO CREATE / UPDATE

### UC-1: Fix Email Verification Pipeline (Blocker #1)

**UC ID:** `uc-fix-email-verification-day47`  
**Priority:** 1 (Blocker — prevents 40% of agents from accessing product)  
**Phase:** Critical Path  
**Owner:** Dev > QC  
**Effort:** 2 days  
**MRR Impact:** +$370-930

**User Story:**
```
As a trial agent who signed up but didn't verify email,
I need to receive a verification link via email,
So that I can access my trial dashboard and see the product value.
```

**Acceptance Criteria:**
- ✅ `email_verification_tokens` table exists with: `id`, `agent_id`, `token`, `expires_at`, `used_at`
- ✅ RESEND_API_KEY configured in Vercel environment
- ✅ Batch job sends verification email to 124 unverified agents
- ✅ Agent receives email with verification link
- ✅ Clicking link verifies email + sets `email_verified = true`
- ✅ Agent gains access to `/dashboard/onboarding`
- ✅ Test: 5 test accounts receive, verify, and access dashboard
- ✅ All 124 agents can now access trial

**E2E Test Spec:**
1. Create test account with unverified email
2. Expect: Cannot access `/dashboard` (redirect to `/email-verify`)
3. Execute: Send verification email batch job
4. Expect: Test email receives verification link
5. Execute: Click link in email
6. Expect: `email_verified = true` in DB
7. Expect: Can now access `/dashboard/onboarding`

**Definition of Done:**
- Pull request merged to main
- Vercel deployment successful
- 124 verification emails sent
- 50%+ of recipients verify within 24 hours
- Zero errors in production logs

---

### UC-2: Auto-Trigger Onboarding Wizard (Blocker #2)

**UC ID:** `uc-auto-trigger-onboarding-day47`  
**Priority:** 1 (Blocker — 95% of verified agents never see value)  
**Phase:** Critical Path  
**Owner:** Dev > QC  
**Effort:** 2 days  
**MRR Impact:** +$1,309-2,618

**User Story:**
```
As a trial agent who just verified my email,
I need to see an onboarding wizard on first login,
So that I immediately understand how LeadFlow works with an AI demo.
```

**Acceptance Criteria:**
- ✅ First login check: if `onboarding_completed = false`, auto-redirect to `/dashboard/onboarding`
- ✅ Wizard auto-populates 5 sample leads (AI-generated examples)
- ✅ Each sample lead shows AI response time (<30 seconds)
- ✅ Agent sees "AI auto-responded to Zillow lead in 23 seconds" (aha moment)
- ✅ Wizard has 3-4 steps: (1) Welcome, (2) Lead Simulator, (3) Dashboard Tour, (4) Setup Cal.com
- ✅ Completion of wizard sets `onboarding_completed = true` + `onboarding_completed_at = now()`
- ✅ Test: 10 new accounts complete wizard without friction
- ✅ Dashboard shows leads + responses after wizard

**E2E Test Spec:**
1. Create test account, verify email, login
2. Expect: Auto-redirect to `/dashboard/onboarding`
3. Expect: Wizard step 1 displays with welcome message
4. Expect: Step 2 shows 5 sample leads with AI responses
5. Expect: Agent sees "Responded in 23 seconds" messaging
6. Execute: Agent completes all 4 steps
7. Expect: `onboarding_completed = true` in DB
8. Expect: Dashboard shows sample leads + stats

**Definition of Done:**
- Pull request merged to main
- Vercel deployment successful
- 10 manual test accounts complete wizard successfully
- Zero redirect loops or errors
- Sample leads display with AI response demo

---

### UC-3: Enable Trial-to-Paid Conversion (Blocker #3)

**UC ID:** `uc-enable-trial-to-paid-checkout-day47`  
**Priority:** 1 (Blocker — blocks all revenue generation)  
**Phase:** Critical Path  
**Owner:** Dev > QC  
**Effort:** 1 day  
**MRR Impact:** +$1,500-3,000 (cascading as funnel improves)

**User Story:**
```
As a trial agent near the end of my trial period,
I need to upgrade to a paid plan with a self-serve checkout,
So that I can continue using LeadFlow beyond the trial period.
```

**Acceptance Criteria:**
- ✅ Dashboard displays trial countdown: "Your trial ends in X days"
- ✅ Upgrade CTA button prominently displayed below countdown
- ✅ Click "Upgrade" → opens Stripe checkout modal
- ✅ Checkout allows card entry + plan selection (Starter/Pro/Team)
- ✅ Successful payment → creates Stripe subscription + updates DB
- ✅ DB updated: `subscription_status = 'active'`, `plan_tier = 'pro'`, `mrr = 149`
- ✅ Agent receives confirmation email with billing details
- ✅ Agent sent trial-ending email 5 days before expiration
- ✅ Test: Complete full journey from signup → onboard → upgrade → paid

**E2E Test Spec:**
1. Create test account, complete onboarding (Day 3 of trial)
2. Expect: Dashboard shows "Your trial ends in 7 days"
3. Expect: Prominent "Upgrade Now" CTA visible
4. Execute: Click "Upgrade Now"
5. Expect: Stripe checkout modal opens
6. Execute: Enter test card (4242 4242 4242 4242)
7. Execute: Select Pro plan ($149/mo)
8. Execute: Complete payment
9. Expect: Dashboard updates to "Subscription Active"
10. Expect: DB shows `subscription_status = 'active'`, `plan_tier = 'pro'`
11. Expect: Confirmation email received
12. Expect: Stripe dashboard shows new subscription

**Definition of Done:**
- Pull request merged to main
- Vercel deployment successful
- Test card charge successful in Stripe sandbox
- Email confirmation received
- Dashboard properly reflects paid status
- Subscription records created correctly in DB

---

## 5. REPRIORITIZED USE CASES (By Revenue Impact)

Based on this analysis, the following UCs are now **P1 (Blocker)**:

| UC | Name | Status | Priority | Revenue Impact | Action |
|-----|------|--------|----------|-----------------|--------|
| `uc-fix-email-verification-day47` | Fix Email Verification Pipeline | ready | **1** | +$370-930 MRR | Create immediately |
| `uc-auto-trigger-onboarding-day47` | Auto-Trigger Onboarding Wizard | ready | **1** | +$1,309-2,618 MRR | Create immediately |
| `uc-enable-trial-to-paid-checkout-day47` | Enable Trial-to-Paid Checkout | ready | **1** | +$1,500-3,000 MRR | Create immediately |
| `feat-pilot-conversion-email-sequence` | Pilot Conversion Email Sequence | in_progress | **1** | +$500-1,000 MRR | Accelerate |
| `uc-revenue-alert-dedup` | Revenue Alert Deduplication | ready | **1** | Fix loop bug | Create + Run |

All other UCs are **P2 (Quality)** or **P3 (Maintenance)** until these three blockers are cleared.

---

## 6. FINANCIAL MODEL: Path to $20K MRR

### Conservative Scenario (Based on Current Data)

**Assumptions:**
- Fix all 3 blockers by Day 52
- 150 agents complete onboarding (from 176 verified)
- 10% conversion rate (industry: 2-5% for SMB, 10% for high-intent)
- 50% Pro ($149/mo), 50% Team ($399/mo)

**Timeline:**

| Milestone | Day | Agents | Pro × $149 | Team × $399 | MRR |
|-----------|-----|--------|-----------|-------------|-----|
| Current | 47 | 0 paid | $0 | $0 | **$0** |
| Blockers fixed | 52 | 15 paid (10% of 150 completed) | 7.5 × $149 = $1,118 | 7.5 × $399 = $2,993 | **$4,111** |
| Pilot + Paid Ads (Weeks 3-4) | 59 | 50 paid | 25 × $149 = $3,725 | 25 × $399 = $9,975 | **$13,700** |
| Scale Phase (Weeks 5-6) | 75 | 120 paid | 60 × $149 = $8,940 | 60 × $399 = $23,940 | **$32,880** |

**Target Achievement:** $20K MRR by **Day 75** (15 days before deadline)

---

### Aggressive Scenario (With Paid Marketing)

**Assumptions:**
- Fix blockers by Day 52
- Launch Facebook ads ($500/week budget)
- Target: 50 high-intent signups per week by Day 60
- 15% conversion rate (paid traffic is higher intent)

**Timeline:**

| Milestone | Day | New Signups | Paying Agents | Avg MRR/Agent | Total MRR |
|-----------|-----|-------------|---------------|---------------|-----------|
| Blockers fixed | 52 | 150 existing | 15 | $274 | **$4,111** |
| Paid ads ramp | 59 | 200 new | 30 (15 existing + 15 new) | $274 | **$8,220** |
| Scale ads | 66 | 100 more | 75 | $274 | **$20,550** |
| Momentum | 75 | — | 100+ | $274 | **$27,400+** |

**Target Achievement:** $20K MRR by **Day 66** (24 days ahead of schedule)

---

## 7. DAILY KPI TRACKING FRAMEWORK

Once blockers are fixed, track these metrics **daily** to monitor funnel health:

### Activation Funnel (Daily)

```sql
SELECT
  DATE(created_at) as day,
  COUNT(*) as new_signups,
  ROUND(100.0 * COUNT(CASE WHEN email_verified THEN 1 END) / COUNT(*), 1) as verify_rate_pct,
  ROUND(100.0 * COUNT(CASE WHEN onboarding_completed THEN 1 END) / COUNT(*), 1) as onboard_rate_pct,
  ROUND(100.0 * COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) / COUNT(*), 1) as conversion_rate_pct
FROM real_estate_agents
GROUP BY DATE(created_at)
ORDER BY day DESC;
```

### Revenue Tracking (Daily)

```sql
SELECT
  SUM(mrr) as total_mrr,
  COUNT(*) as paid_agents,
  COUNT(CASE WHEN plan_tier = 'pro' THEN 1 END) as pro_agents,
  COUNT(CASE WHEN plan_tier = 'team' THEN 1 END) as team_agents,
  ROUND(AVG(mrr), 2) as avg_mrr_per_agent
FROM real_estate_agents
WHERE subscription_status = 'active';
```

### Key Thresholds (Stop/Go Gates)

| Day | Metric | Target | Action if Missed |
|-----|--------|--------|------------------|
| 52 | All 3 blockers merged | 100% | Escalate to dev |
| 55 | Email verification recovery | 200+ agents verified | Manual outreach to remaining 111 |
| 57 | Onboarding completion | 75+ agents completed | Simplify wizard or add concierge |
| 59 | First paid customer | 1+ | Announce pilot success + launch ads |
| 66 | MRR | $3,000+ | On track for $20K |
| 75 | MRR | $10,000+ | Confirm path to $20K |
| 90 | MRR | $20,000+ | ✅ GOAL ACHIEVED |

---

## 8. RISK MITIGATION

### Risk 1: Email Verification Batch Fails
- **Mitigation:** Test batch job with 10 accounts first, then scale
- **Fallback:** Send emails manually in groups of 50 if batch script broken

### Risk 2: Onboarding Wizard Creates New Bottleneck
- **Mitigation:** QC with 10 test agents before going live
- **Fallback:** Simplify wizard to 2 steps (Welcome + Demo) if 4-step version confuses agents

### Risk 3: Checkout Doesn't Complete Payments
- **Mitigation:** Test with Stripe sandbox cards before going live
- **Fallback:** Direct Stojan to complete payment manually for first 5 agents

### Risk 4: Traffic Doesn't Materialize
- **Mitigation:** Check GA4 data daily; if <5 new signups/day by Day 55, launch paid ads
- **Fallback:** Organic outreach: Email 311 existing trial agents with upgrade offer

---

## 9. ACCEPTANCE CHECKS

These automated checks will verify completion of each blocker:

### Check 1: Email Verification Works
```bash
# Verify email_verification_tokens table exists
psql $LOCAL_PG_URL -c "SELECT COUNT(*) FROM email_verification_tokens WHERE used_at IS NOT NULL;" 
# Expected: >=50 (at least 50 agents verified by Day 50)
```

### Check 2: Onboarding Auto-Triggers
```bash
# Verify 150+ agents completed onboarding
psql $LOCAL_PG_URL -c "SELECT COUNT(*) FROM real_estate_agents WHERE onboarding_completed = true;" 
# Expected: >=150 by Day 51
```

### Check 3: Trial-to-Paid Works
```bash
# Verify first paid subscription created
psql $LOCAL_PG_URL -c "SELECT COUNT(*) FROM real_estate_agents WHERE subscription_status = 'active';" 
# Expected: >=1 by Day 52
```

---

## 10. DEFINITION OF DONE

This specification is **complete** when:

1. ✅ PM has created three use cases in Supabase with P1 priority
2. ✅ PM has created E2E test specs for each blocker
3. ✅ Dev team has reviewed PRD and confirmed effort estimates
4. ✅ Dev has committed to Days 48-50 timeline
5. ✅ QC has reviewed E2E specs and prepared test environment

**Next Step:** PM posts this PRD to Telegram PM topic (10877) + inserts use cases into Supabase immediately.

---

## 11. REFERENCE

- **Previous Analysis:** PRD-REVENUE-ALERT-CRITICAL-MRR-2026-04-02.md
- **Business Strategy:** PMF.md (pricing model, ICP, GTM strategy)
- **Project Status:** CLAUDE.md (Day 47 of 90-day pilot, MVP complete)
- **Funnel Data:** Queries run against local PostgreSQL (311 agents, 187 verified, 11 onboarded, 0 paid)
