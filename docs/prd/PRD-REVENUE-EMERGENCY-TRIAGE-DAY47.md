# PRD: Revenue Emergency Triage — Activation Blockage Analysis (Day 47)

**PRD ID:** prd-revenue-emergency-triage-day47  
**Status:** ready  
**Priority:** P0 (Critical)  
**Last Updated:** 2026-04-02  
**Assigned to:** Product Manager (triage & reprioritization)  
**Target Completion:** Immediate (triage complete, spec ready for dev)  
**Revenue Impact:** -$10,330 MRR gap (target $10,330, actual $0)

---

## EXECUTIVE SUMMARY

LeadFlow has **zero paying customers** on Day 47 of 90, despite 369 trial signups and a fully deployed product. The root cause is not technical — it is **product activation**.

The funnel is broken at the **first value delivery step**: onboarding. We are losing 96% of agents before they experience the aha moment (AI response in <30 seconds).

### Current Funnel State (2026-04-02 snapshot)

```
Signup → Email Verify → Onboarding → Aha Moment → Checkout → Paid
  369        244           0            0           0        $0
 100%        66%          0%           0%          0%       $0 MRR
   ↓          ↓            ↓            ↓           ↓         ↓
success    STUCK        BLOCKED       N/A         N/A      CRITICAL
```

### Critical Metrics

| Metric | Current | Target | Gap | Status |
|--------|---------|--------|-----|--------|
| Total Signups | 369 | — | — | ✅ |
| Email Verified | 244 | 369 | -125 | ❌ |
| Onboarding Completed | 0 | 244+ | -244 | 🔴 CRITICAL |
| Aha Moment Seen | 0 | 200+ | -200 | 🔴 CRITICAL |
| Paying Customers | 0 | 10+ | -10 | 🔴 CRITICAL |
| MRR | $0 | $10,330 | -$10,330 | 🔴 CRITICAL |

---

## PROBLEM DIAGNOSIS

### THE ACTIVATION WALL: Onboarding Completed = 0

The database shows:
```sql
SELECT COUNT(*) FROM real_estate_agents 
WHERE onboarding_completed = true
-- Result: 0
```

**This is not acceptable.** We have 244 verified agents and **not one has completed onboarding**.

### Why This Happened

1. **Onboarding wizard is built** but not auto-triggered on first login
   - Agents land on empty dashboard
   - See "No messages yet"
   - No call-to-action to start wizard
   - Abandon after 2-3 minutes

2. **Sample leads are not auto-populated**
   - Even agents who find the wizard see empty lead list
   - Cannot experience aha moment (AI response in <30 seconds)
   - Dashboard is useless

3. **Trial metrics are invisible**
   - No countdown timer showing "14 days remaining"
   - No urgency to try product
   - No upgrade CTA visible
   - Agents forget they exist

4. **Post-onboarding flow is missing**
   - No email sequence to encourage usage
   - No check-ins
   - Agents disappear into silence

---

## ROOT CAUSE: Onboarding is Optional, Not Mandatory

The product experience **requires** the onboarding wizard to deliver value. But the system treats it as optional.

**Fix:** Make onboarding **mandatory and automatic** on first login.

---

## REPRIORITIZED USE CASES (REVENUE-CRITICAL ORDER)

### P0: ACTIVATION BLOCKERS (MUST COMPLETE BY DAY 50)

**These four UCs directly control whether agents see value.**

| UC Priority | UC Name | Current Status | Why P0 | Dev Effort | Impact |
|-------------|---------|----------------|--------|------------|--------|
| **P0-1** | Auto-Trigger Onboarding Wizard on First Login | not_started | 244 agents stuck on empty dashboard | 2-4 hours | 244 agents → aha moment |
| **P0-2** | Auto-Populate Sample Leads (5 per agent) | not_started | Aha moment impossible without sample data | 2-4 hours | Enables value demo |
| **P0-3** | Dashboard: Trial Countdown & Upgrade CTA | not_started | No urgency, no conversion path visible | 2-4 hours | 30% → 50% checkout click rate |
| **P0-4** | First-Login Welcome Email Sequence | not_started | Agents never reminded to use product | 4-8 hours | Re-engagement after onboarding |

**Combined effort:** 2-3 days  
**Expected outcome by Day 50:** 200+ agents complete onboarding, 50+ see aha moment, 5-10 click upgrade

---

### P1: CONVERSION PATH (MUST COMPLETE BY DAY 52)

**These UCs enable agents to convert to paid.**

| UC Priority | UC Name | Current Status | Why P1 | Dev Effort | Impact |
|-------------|---------|----------------|--------|------------|--------|
| **P1-1** | Self-Serve Stripe Checkout (In-Dashboard) | complete? | Verify upgrade flow works end-to-end | 2-4 hours | Unlocks conversion |
| **P1-2** | Trial Expiration Email Sequence | not_started | Remind agents before trial ends | 4-8 hours | 5-10% convert on reminder |
| **P1-3** | Payment Success Confirmation & Onboarding | not_started | Agents need post-payment guidance | 2-4 hours | Reduces churn |

**Combined effort:** 2-4 days  
**Expected outcome by Day 52:** 10-15 agents convert to paid (Pro tier), MRR = $1,490-2,235

---

### P2: EXPANSION (IF P0/P1 SUCCEED)

**After activation and conversion are working, these UCs drive growth.**

| UC Priority | UC Name | Current Status | Why P2 |
|-------------|---------|----------------|--------|
| **P2-1** | Weekly Performance Email (prove ROI) | not_started | Drives upgrades & retention |
| **P2-2** | Referral Program ($100/agent) | not_started | Viral growth |
| **P2-3** | In-App NPS & Feedback Loop | not_started | Product improvements |

---

## THE CRITICAL INSIGHT: You Can't Convert What You Haven't Activated

**Current conversion funnel:**
```
Signup (369) → Email Verify (244) → Onboarding (0) → Aha Moment (0) → Checkout (0) → Paid (0)
```

**This waterfall is broken at step 3.** Every agent who could see the aha moment has not.

**You cannot achieve $20K MRR if zero agents experience the product.**

---

## SPECIFIC ACTIONS FOR NEXT 3 DAYS (Days 47-50)

### Day 47-48: Activate (Onboarding + Sample Leads)

**Goal:** 200+ agents start & complete onboarding wizard by EOD Day 48

**Actions:**

1. **UC: Auto-Trigger Onboarding Wizard**
   - Add route handler: on first login, redirect to `/dashboard/onboarding` if `onboarding_completed = false`
   - Acceptance: ✅ All 244 verified agents see wizard on next login
   - Test: Manual QC with 5 test accounts
   - E2E: Verify redirect works for new verified agent

2. **UC: Auto-Populate Sample Leads**
   - Seed script: on agent creation, insert 5 sample leads (past FUB webhook format)
   - Leads should span past 24h, past 7d, past 30d (realistic distribution)
   - Acceptance: ✅ All 244 verified agents have 5+ sample leads in `leads` table
   - Test: QC verify dashboard shows leads, AI responds with aha message
   - E2E: Confirm "AI responded in 23 seconds" message appears

3. **UC: Trial Countdown Widget**
   - Add component to dashboard header: "Your 14-day trial expires on [DATE]"
   - Add upgrade CTA: "Upgrade Now" button → Stripe checkout
   - Acceptance: ✅ Widget visible on all agent dashboards
   - Test: Manual QC verify dates are correct for agents created on different days
   - E2E: Click "Upgrade Now" → confirm Stripe checkout appears

### Day 48-50: Convert (Checkout Path + Emails)

**Goal:** Enable conversion path, send first conversion email wave

**Actions:**

4. **UC: Verify Self-Serve Stripe Checkout (E2E)**
   - QC: Complete full flow — login as agent, click "Upgrade to Pro", enter test Stripe card, see success
   - Acceptance: ✅ Successful test transaction completes and creates subscription
   - Test: Try all three tiers (Starter $49, Pro $149, Team $399)
   - E2E: Verify `real_estate_agents.plan_tier` updates from `trial` → `pro`

5. **UC: First-Login Email Sequence**
   - Trigger: When agent first logs in AND `email_verified = true`
   - Content: "Welcome! Your AI is ready. See it respond to leads in 30 seconds."
   - Links: Dashboard onboarding, sample leads, demo video
   - Acceptance: ✅ Email sent to all 244 verified agents within 24h
   - Test: Verify email arrives in test inbox
   - E2E: Click through links to dashboard (verify auth works)

6. **UC: Trial Expiration Reminder Email (Day 10 of 14)**
   - Trigger: When agent's trial has 4 days remaining
   - Content: "Your free trial expires in 4 days. Upgrade now for unlimited AI responses."
   - CTA: "Upgrade to Pro ($149/month)" button → Stripe checkout
   - Acceptance: ✅ Email sent at correct time (day 10 of 14-day trial)
   - Test: Manual trigger for test account
   - E2E: Click upgrade link, verify Stripe session opens

---

## SUCCESS METRICS (Days 47-52)

If actions above are completed by Day 50:

| Metric | Day 47 Baseline | Day 50 Target | Day 52 Target |
|--------|-----------------|---------------|---------------|
| Agents with Onboarding Completed | 0 | 150-200 | 200-244 |
| Agents who Saw Aha Moment | 0 | 100-150 | 150-200 |
| Agents who Started Checkout | 0 | 30-50 | 50-100 |
| **Paying Customers** | **0** | **2-5** | **10-15** |
| **MRR** | **$0** | **$300-750** | **$1,490-2,235** |

**Trajectory:** If this works, we can hit $5K MRR by Day 60 and $20K by Day 90.

---

## ACCEPTANCE CRITERIA FOR THIS TRIAGE

This PRD is complete when:

1. ✅ Funnel analysis confirmed (244 verified, 0 onboarded)
2. ✅ Four P0 UCs are created in Supabase with acceptance criteria
3. ✅ P0 UCs are linked to dev tasks (not PM responsibility, but must be actionable)
4. ✅ E2E test specs are defined for each UC
5. ✅ Priority is set: P0 UCs BLOCK all P2+ work until complete
6. ✅ Timeline is clear: Days 47-50 for onboarding + checkout, Day 52 for email sequences

---

## WHAT THIS PRD IS NOT

- **Not a blame assessment.** Onboarding is hard. All the code is there. It just isn't wired together.
- **Not a pivot decision.** The product is sound. We just haven't let agents experience it.
- **Not a rebuild.** These are 2-3 day pieces of work using existing code.

---

## WHAT THIS PRD IS

- **Diagnosis:** Onboarding = 0, therefore activation is impossible.
- **Triage:** Four sequential UCs that cascade value.
- **Timeline:** 5 days to achieve first $2K MRR, then 35 days to hit $20K.
- **Accountability:** Clear acceptance criteria, testable, measurable.

---

## NEXT STEP: UPDATE USE_CASES TABLE

Create/update these UCs in Supabase `use_cases` table:

```javascript
const ucsToCreate = [
  {
    id: 'uc-onboarding-mandatory-auto-trigger',
    name: 'Auto-Trigger Onboarding Wizard on First Login',
    phase: 'Phase 3',
    status: 'ready',
    priority: 1,
    prd_id: 'prd-revenue-emergency-triage-day47',
    description: 'Redirect verified agents to /dashboard/onboarding on first login if onboarding_completed = false',
    acceptance_criteria: [
      'Wizard auto-triggers for all agents with email_verified=true and onboarding_completed=false',
      'Sample leads are visible in wizard',
      'Wizard completion sets onboarding_completed=true',
      '244 verified agents receive redirect on next login'
    ]
  },
  {
    id: 'uc-sample-leads-auto-populate',
    name: 'Auto-Populate Sample Leads (5 per Agent)',
    phase: 'Phase 3',
    status: 'ready',
    priority: 1,
    prd_id: 'prd-revenue-emergency-triage-day47',
    description: 'Seed script to insert 5 realistic sample leads per agent on account creation',
    acceptance_criteria: [
      'All 244 verified agents have 5+ sample leads in leads table',
      'Leads span past 24h, 7d, 30d (realistic distribution)',
      'Dashboard shows leads with AI responses',
      'Aha message appears: "AI responded in 23 seconds"'
    ]
  },
  {
    id: 'uc-trial-countdown-widget',
    name: 'Dashboard: Trial Countdown & Upgrade CTA',
    phase: 'Phase 3',
    status: 'ready',
    priority: 1,
    prd_id: 'prd-revenue-emergency-triage-day47',
    description: 'Add countdown timer and upgrade button to dashboard header',
    acceptance_criteria: [
      'Widget shows "Your 14-day trial expires on [DATE]"',
      '"Upgrade Now" button visible on all dashboards',
      'Clicking button opens Stripe checkout',
      'Countdown timer is accurate for all agents'
    ]
  },
  {
    id: 'uc-trial-activation-email-sequence',
    name: 'First-Login Welcome Email Sequence',
    phase: 'Phase 3',
    status: 'ready',
    priority: 1,
    prd_id: 'prd-revenue-emergency-triage-day47',
    description: 'Send welcome email when verified agent first logs in',
    acceptance_criteria: [
      'Email sent within 1 minute of first login',
      'Sent to all 244 verified agents',
      'Links work: dashboard, sample leads, demo video',
      'Auth preserved for dashboard link'
    ]
  }
];
```

---

## PREVIOUS WORK (REFERENCE)

Earlier PRDs identified the same three blockers:
- `PRD-REVENUE-RECOVERY-CRITICAL-DAY47.md` (Apr 2)
- `PRD-REVENUE-ALERT-CRITICAL-MRR.md` (Mar 31)

This PRD **consolidates and reprioritizes** based on actual funnel data: **onboarding = 0 is the blocker**.

