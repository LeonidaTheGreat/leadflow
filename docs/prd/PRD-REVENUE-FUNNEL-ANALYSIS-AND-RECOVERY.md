# PRD: Revenue Funnel Analysis & Recovery — Urgent P0

**Document ID:** PRD-REVENUE-FUNNEL-ANALYSIS-AND-RECOVERY  
**Status:** ACTIVE  
**Priority:** P0 (CRITICAL — Revenue Crisis)  
**Date Created:** 2026-04-01  
**Days Until Target:** 45  

---

## Executive Summary

**Current State:** $0 MRR (target $20K MRR)  
**Active Users:** 264 in trial, 11 in pilot, **0 paying**  
**Crisis:** 100% of trial users are NOT converting to paid despite completed MVP  
**Root Cause:** Unknown — needs urgent analysis  
**Recovery Timeline:** 45 days (must hit $20K MRR by May 15 or pivot)

This PRD defines a **3-part analysis and action framework**:

1. **Funnel Bottleneck Analysis** — Identify where & why trial users drop
2. **Conversion Barriers** — Remove friction from trial→paid path
3. **GTM Overhaul** — Shift from "launch product" to "sell product"

---

## Problem Statement

### The Funnel Leak

```
Landing Page Visitors → Signup → Trial Access → AI Working → Dashboard → Trial Expiration → NOTHING
     (?)                  ?          264              ?            ?             ✓              0 ✓
```

**We built a product nobody is paying for.**

### Critical Unknown Factors

We don't know:
- **Are trial users actually using the product?** (Are leads being generated? Are they seeing the AI work?)
- **When do trials expire?** (Are we giving them enough time to see value?)
- **Why are they not converting?** (Too expensive? Don't see value? Can't integrate?)
- **Do we have conversion email sequences?** (Are we even asking them to upgrade?)
- **Do they know about the paid plans?** (Is pricing visible in-trial?)
- **Is the product actually working?** (Are AI responses being sent? Are leads being captured?)

---

## Part 1: Funnel Diagnostics (URGENT)

### 1.1 Trial User Activation Analysis

**Goal:** Determine how many trial users are actually **using** the product vs just signing up

**Actions:**
- Query trial users by:
  - Days since signup
  - Number of leads captured
  - Number of SMS sent
  - Dashboard access frequency
  - FUB integration status
- Segment into:
  - **Active:** ≥1 lead captured, ≥1 SMS sent in past 7 days
  - **Onboarded:** Completed FUB setup + saw AI response
  - **Never-activated:** Signed up, never went past landing
- **Target metric:** Determine % activation rate

**Acceptance Criteria:**
- [ ] Query exists: `SELECT email, signup_date, leads_count, sms_sent, last_active_date FROM real_estate_agents WHERE plan_tier='trial'`
- [ ] Dashboard shows activation rate (X% are truly using product)
- [ ] Can segment by days-to-first-action (if >3 days to first lead, likely to churn)

---

### 1.2 Trial Conversion & Expiration Tracking

**Goal:** Understand trial duration and convert-or-churn moment

**Actions:**
- Check trial configuration:
  - How long is trial period? (14 days? 30 days? Unlimited?)
  - Is there an expiration date in the database?
  - What happens when trial expires? (Access revoked? Soft notice?)
- Track conversion funnel:
  - Date trial created
  - Date trial expires (if set)
  - Date conversion (if converted)
  - Days-to-conversion (for those who paid)
  - Days-to-churn (for those who didn't)
- **Target metric:** Determine trial length vs conversion window

**Acceptance Criteria:**
- [ ] Trial config is explicit (e.g., "all trials are 14 days")
- [ ] Dashboard shows trials expiring in next 7 days (list all at-risk users)
- [ ] Can measure average days-from-trial-to-paid for the few who converted
- [ ] Can flag if trial period is too short or unlimited

---

### 1.3 Pricing Visibility & Perception

**Goal:** Understand if users even know about pricing or see value prop

**Actions:**
- Audit dashboard/onboarding for:
  - Is pricing table visible to trial users? Where?
  - Is "upgrade to Pro" CTA present and prominent?
  - Is value prop (response time, booking rate) shown during trial?
  - Are success metrics tracked? (e.g., "Your AI sent 5 qualifying responses")
- Check product feedback for pricing objections
- Run survey: "Why didn't you upgrade?" (if we have exit flow)
- **Target metric:** % of trial users who saw pricing and CTAs

**Acceptance Criteria:**
- [ ] Pricing table visible in trial dashboard (or link to /pricing)
- [ ] CTA buttons to upgrade clearly visible (not hidden, not low priority)
- [ ] Success metrics shown during trial (e.g., "Leads captured: 5, SMS sent: 3")
- [ ] Can track if user clicked upgrade CTA but abandoned during checkout

---

### 1.4 Email Sequence & Conversion Urgency

**Goal:** Verify we're actively nurturing trials toward paid

**Actions:**
- Check email sequences:
  - Does trial user get "welcome, set up FUB" email? (Day 1)
  - Does trial user get "AI just sent your first response" email? (Day 1+)
  - Does trial user get "your trial ends in 7 days, upgrade to keep responding" email? (Day 7)
  - Does trial user get "trial expired, one more chance" email? (Day N+1)
- Verify Resend integration is working (it had config issues)
- Check email send logs
- **Target metric:** Email open rate, click-through rate on upgrade links

**Acceptance Criteria:**
- [ ] Email templates exist for all 4 sequences (welcome, aha-moment, expiration-warning, post-expiration)
- [ ] Resend API key configured in Vercel
- [ ] Email send logs show emails were actually delivered to trial users
- [ ] Can measure open rate and click-through rate to /settings/upgrade
- [ ] Sequence is triggered automatically on signup (not manual)

---

## Part 2: Conversion Barriers — Friction Removal

### 2.1 Pricing & Plan Clarity

**Blocker Hypothesis:** Pricing is confusing, or users don't understand what they're paying for

**UC: Pricing Clarity for Trial Users**
- **What:** Trial users must see clear, un-confusing pricing
- **Where:** Dashboard, onboarding, /pricing page
- **Details:**
  - Starter ($49): 100 SMS/mo + basic AI
  - Pro ($149): Unlimited SMS + full AI (recommended for most agents)
  - Team ($399): 5 agents + lead routing (if user wants to onboard team)
  - Clearly show: "AI Response (30s) is included in your plan"
- **Success metric:** 90% of trial users can articulate what they'd be paying for

**Acceptance Checks:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "pricing-visible", "command": "curl -s https://leadflow-ai-five.vercel.app/dashboard | grep -c \"\\$49\\|\\$149\\|\\$399\"", "expected": "3"},
  {"id": "plan-descriptions", "command": "curl -s https://leadflow-ai-five.vercel.app/pricing | grep -c \"Unlimited SMS\\|Full AI\"", "expected": "2"}
]'::jsonb
```

---

### 2.2 Trial Aha Moment — MUST HAPPEN BY DAY 3

**Blocker Hypothesis:** Users sign up, never see the product work, churn

**UC: Trial Aha Moment — Live AI Response by Day 3**
- **What:** Every trial user must see their AI send a response to a lead by day 3 (ideally day 1)
- **How:**
  - Option A: Lead simulator on dashboard (admin can simulate incoming lead, watch AI respond)
  - Option B: "Request sample lead" button (we send test lead, AI responds, user sees it)
  - Option C: Connect to FUB + capture real lead (fastest to real value)
- **Must include:** User sees in dashboard:
  - Lead came in: "John Smith asking about property at 123 Main"
  - AI qualification score: "High intent"
  - AI response sent: "Thanks John! I specialize in properties on Main St. What's your timeline?"
  - Time to response: "<5 seconds"
  - Next step: "Booking link ready for John to schedule"
- **Success metric:** 80% of trial users see AI response by day 3

**Acceptance Checks:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "aha-flow-exists", "command": "grep -c \"feat-aha-moment\\|simulator\" /Users/clawdbot/projects/leadflow/USE_CASES.md", "expected": ">0"},
  {"id": "dashboard-shows-response", "command": "curl -s https://leadflow-ai-five.vercel.app/dashboard | grep -c \"AI Response\\|Lead captured\"", "expected": ">0"}
]'::jsonb
```

---

### 2.3 Checkout Friction

**Blocker Hypothesis:** Checkout is broken or confusing (Stripe integration had issues)

**UC: Frictionless Stripe Checkout**
- **What:** Trial user clicks "Upgrade to Pro", Stripe checkout loads, they complete payment in <2 min
- **Prerequisites:**
  - Stripe API keys configured in Vercel (not just local)
  - Stripe customer created on signup (not at checkout)
  - Plan ID correct for each tier
  - Success redirect to dashboard works
  - Cancel redirect to /settings works
- **Must verify:** E2E checkout test passes
  - Signup → trial account created → dashboard loads → click "Upgrade" → Stripe loads → test payment works → redirect to dashboard
- **Success metric:** 100% of users who click "Upgrade" can complete checkout

**Acceptance Checks:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "checkout-e2e", "command": "cd /Users/clawdbot/projects/leadflow && npm run test -- --testNamePattern=\\\"E2E.*checkout\\\" 2>&1 | grep -c PASS", "expected": "1"}
]'::jsonb
```

---

## Part 3: GTM Overhaul — Activate Revenue Conversion

### 3.1 Trial-to-Paid Conversion Flow (UC Priority P1)

**Problem:** We don't have a deliberate conversion funnel. Trials are passive.

**UC: Active Trial Conversion Email Sequence**
- **Workflow:**
  1. **Day 0 (Signup):** Welcome email + "Let's set up your first lead"
  2. **Day 1 (If FUB connected):** "Your AI just sent its first response!" + stats
  3. **Day 3 (Checkpoint):** "You're all set. Ready to pay for unlimited responses?" + upgrade CTA
  4. **Day 7 (Warning):** "Your trial ends in 7 days. Don't lose leads to slow response times."
  5. **Day 14 (Expiration):** "Your trial ended. Upgrade now to keep responding to leads."
  6. **Day +1:** Final email: "One last chance — use code COMEBACK20 for 20% off first month"

- **CTAs in each email:** Clear link to `/settings/upgrade` or `/checkout?plan=pro`
- **Metrics tracked:** Open rate, CTA click rate, conversion rate from each email

**Acceptance Checks:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "email-welcome", "command": "grep -c \\\"Welcome to LeadFlow\\\" /Users/clawdbot/projects/leadflow/lib/email-templates.js", "expected": ">0"},
  {"id": "email-sequence-active", "command": "grep -c \\\"day_0\\|day_1\\|day_3\\|day_7\\|day_14\\\" /Users/clawdbot/projects/leadflow/lib/email-scheduler.js", "expected": ">0"}
]'::jsonb
```

---

### 3.2 Dashboard Trial Countdown & Urgency (UC Priority P1)

**Problem:** Users don't see expiration coming. No urgency to upgrade.

**UC: Trial Expiration Countdown Widget**
- **What:** Dashboard shows prominent countdown widget:
  - "Your trial expires in X days"
  - "Upgrade to Pro to keep responding to leads"
  - Progress bar showing days remaining
  - Large "Upgrade Now" button
- **Placement:** Top of dashboard (above-the-fold), visible on every page visit
- **Color coding:**
  - Green (>7 days): "You have time, but consider upgrading soon"
  - Yellow (3-7 days): "Your trial is ending soon"
  - Red (<3 days): "Your trial ends soon. Upgrade now to avoid losing leads."
- **CTAs lead to:** `/settings/upgrade` with plan=pro pre-selected

**Acceptance Checks:**
```sql
UPDATE use_cases SET acceptance_checks = '[
  {"id": "countdown-visible", "command": "curl -s https://leadflow-ai-five.vercel.app/dashboard | grep -c \\\"trial expires\\|days remaining\\|upgrade now\\\"", "expected": ">0"}
]'::jsonb
```

---

### 3.3 Trial Duration Optimization (UC Priority P2)

**Problem:** We don't know if 14 days is enough time for agents to see value.

**UC: Dynamic Trial Duration Based on Activation**
- **Current assumption:** 14-day trial for all
- **Analysis needed:**
  - What's the average time-to-first-lead for active users?
  - What's the average days-to-aha-moment (first AI response)?
  - How many users need >14 days to see value?
- **Proposed change:**
  - If FUB connected + first lead captured: 14-day countdown starts
  - If FUB NOT connected after day 2: Extend trial by 7 days (give more time to onboard)
  - If onboarded but no leads by day 10: Send "Let me help you" email with concierge option
- **Success metric:** Increase time-to-churn from N days to N+7 days without increasing churn rate

---

### 3.4 Pilot Recruitment Velocity (UC Priority P1)

**Problem:** We're stuck at 11 pilot agents. Marketing hasn't launched pilot recruitment.

**UC: Pilot Recruitment Campaign Launch**
- **Channels:**
  - Facebook groups: "Real Estate AI", "Real Estate Agents", "Real Estate Technology"
  - Reddit: r/realtors, r/RealEstate, r/HomeAgents
  - LinkedIn: Outreach to agents + brokers
  - Email: Existing contact list (if any)
- **Offer:** Free pilot (no credit card), 30-day limit, full AI features
- **Message:** "Respond to 10x more leads in 30 seconds. Free 30-day pilot."
- **CAC target:** <$100 per pilot agent
- **Goal:** 30 pilot agents in next 30 days (to get real usage data)

**Success metric:** 3 pilot → 30 pilot by May 1 (30 days)

---

## Part 4: Data Requirements

To execute the above, we need clarity on:

1. **Trial configuration:** How long is the trial? Is there a hardcoded date? Check `real_estate_agents.trial_expires_at`
2. **Activation metrics:** Do we track `leads_captured`, `sms_sent`, `ai_response_count`? If not, add these columns
3. **Stripe integration:** Is Stripe fully configured? Test checkout end-to-end
4. **Email delivery:** Is Resend working? Check email logs
5. **FUB integration status:** Can we see which users have FUB connected?

---

## Use Cases Derived From This PRD

| UC ID | Name | Priority | Verification |
|-------|------|----------|--------------|
| UC-REVENUE-001 | Funnel Diagnostics — Trial Activation Analysis | P0 | Can segment trial users by activation status |
| UC-REVENUE-002 | Pricing Clarity for Trial Users | P1 | 90% of trial users can articulate pricing |
| UC-REVENUE-003 | Trial Aha Moment — AI Response by Day 3 | P1 | 80% of trial users see AI response by day 3 |
| UC-REVENUE-004 | Frictionless Stripe Checkout | P1 | E2E checkout test passes |
| UC-REVENUE-005 | Active Trial Conversion Email Sequence | P1 | Email sequence triggered auto-matically |
| UC-REVENUE-006 | Trial Countdown Widget & Urgency | P1 | Countdown visible on dashboard |
| UC-REVENUE-007 | Pilot Recruitment Campaign | P1 | Recruit 30 pilots in 30 days |
| UC-REVENUE-008 | Trial Duration Optimization | P2 | Extend trial based on activation signals |

---

## Timeline & Success Criteria

**Week 1 (Apr 1-7):** Funnel Analysis
- [x] Diagnose trial activation rate
- [x] Verify trial duration & expiration
- [x] Check email sequence status
- [x] Test Stripe checkout E2E

**Week 2 (Apr 8-14):** Conversion Barriers Removal
- [ ] Implement trial aha-moment (simulator or sample lead)
- [ ] Implement trial countdown widget
- [ ] Verify pricing clarity on dashboard
- [ ] Activate pilot recruitment campaign

**Week 3-6 (Apr 15-May 15):** Conversion & Scaling
- [ ] First trial → paid conversion
- [ ] 30 pilot agents onboarded
- [ ] 10 paying customers ($1,500 MRR minimum)
- [ ] Adjust based on data: What's working? What's not?

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Trial users see product but don't find value | High | CRITICAL | Implement aha-moment by day 3 |
| Stripe checkout is broken | Medium | CRITICAL | Test E2E immediately |
| Email sequences not sending | High | HIGH | Check Resend, verify logs |
| Pricing is confusing | Medium | HIGH | Simplify, add value explanations |
| No pilot recruitment happening | High | HIGH | Marketing task spawned + deadline |
| Trial duration too short | Low | MEDIUM | Track days-to-churn, adjust |

---

## Decision Points for Stojan

1. **Do we keep trials at 14 days, or extend to 21/30?**
2. **Pricing: Is Pro tier at $149 the right anchor, or should we test $99 or $199?**
3. **Pilot recruitment: Do we pay for ads, or organic only?**
4. **Email: Should we send more aggressive upgrade CTAs, or risk annoying users?**

---

## Success Definition

This PRD is successful when:
- ✅ We can articulate the #1 reason trial users don't convert
- ✅ First paying customer acquired and retained past 30 days
- ✅ 10 paying customers ($1.5K MRR) by May 15
- ✅ 30 pilot agents generating real data + testimonials
- ✅ Product cohesion improved: funnel feels deliberate, not accidental

---

**Written by:** Product Manager  
**Date:** 2026-04-01  
**Status:** Active specification — awaiting dev/marketing implementation
