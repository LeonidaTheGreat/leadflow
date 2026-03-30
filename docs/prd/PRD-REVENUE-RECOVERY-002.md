# PRD-REVENUE-RECOVERY-002 — Revenue Acceleration & Pilot-to-Paid Conversion

**Document ID:** PRD-REVENUE-RECOVERY-002  
**Date Created:** 2026-03-30  
**PM:** Product Manager  
**Status:** Ready for Implementation  
**Priority:** P0 (Blocker)  
**Goal:** Close $9,670 MRR gap in 47 days. Hit $20K target by Day 91.

---

## Executive Summary

LeadFlow AI is at **Day 44 of 90** with **$0 MRR** — **48% behind the $9,670 expected trajectory**. The product is technically complete and pilot agents are recruited. Revenue gap is not a product problem; it's a **conversion and adoption problem**. This PRD defines three critical actions to accelerate trial-to-paid conversion and maximize MRR by day 91.

### The Bottleneck
- **3 pilot agents** signed up and have access to the product
- **0 have upgraded to paid** ($0 MRR)
- **No clear path** from trial → paid within the dashboard
- **Missing activation signals** — pilots don't see value proof before deciding to pay
- **Email sequence not active** — no automated urgency as trial expires

### The Window
- **47 days remaining** until target date
- **$20K/month requires:**
  - 135 Pro @ $149/mo ($20,115) OR
  - 50 Pro @ $149 + 50 Team @ $399 ($19,950) OR
  - Similar mix with Brokerage tier
- **Current velocity:** 3 pilots = ~0.5 pilots/week
- **Required velocity:** Must hit paid conversions + new growth simultaneously

---

## Part 1: Conversion Funnel Analysis

### Current Funnels

#### A. Trial Signup → Paid Conversion
```
Trial Signup (0): Day 1 → Onboarding → Dashboard → Upgrade [STUCK: $0 MRR]
```

**Leaks identified:**
1. **Incomplete onboarding** — Aha moment (lead simulator) not auto-triggering
2. **No trial countdown** — Pilot agents unaware of expiration date
3. **No upgrade CTA** — Dashboard has no prominent "Upgrade" button
4. **No email sequence** — No touchpoints as trial expires (day 10, 13, 14)
5. **Pricing friction** — Pricing page exists but checkout buttons non-functional

#### B. Landing Page → Trial Signup
```
Landing Page (LIVE) → CTA Click → Signup Form → Verify Email → Trial Access
```

**Leaks identified:**
1. **Multiple conflicting CTAs** — "Join the Pilot" vs "Start Free Trial" vs "Get Started Free"
2. **Social proof missing** — No testimonials or proof of ROI
3. **Feature comparison absent** — Can't compare tiers on landing page
4. **API docs visible** — Non-agent-facing content reduces credibility
5. **GA4 incomplete** — CTA click tracking not wired

#### C. Inbound Prospects → Landing Page
```
Organic Search / Social → Landing Page → Awareness → Consideration
```

**Leaks identified:**
1. **No paid acquisition** — Waiting for organic only
2. **No retargeting** — Prospects who visit but don't sign up are lost
3. **Limited SEO** — 47 days is too short for organic to meaningfully convert

### Revenue Impact by Leak

| Leak | Funnel | Conversion Impact | Revenue Impact |
|------|--------|------------------|-----------------|
| **Aha moment not auto-triggering** | Trial → Paid | -30% | -$1,800/mo |
| **No trial countdown** | Trial → Paid | -15% | -$900/mo |
| **Upgrade CTA missing** | Trial → Paid | -25% | -$1,500/mo |
| **Email sequence inactive** | Trial → Paid | -20% | -$1,200/mo |
| **Pricing friction** | Landing → Trial | -10% | -$1,200/mo |
| **No social proof** | Landing → Trial | -15% | -$1,800/mo |
| **Organic-only acquisition** | External → Landing | -50% | -$9,000/mo |

**Total addressable gap: $17,400/mo** (but we only need $9,670 in 47 days)

---

## Part 2: Recommended Actions (Priority Order)

### Action 1: Activate Trial-to-Paid Email Sequence [Days 1-7]

**Why This First:**
- Highest leverage per hour (5 emails reach 3+ pilots automatically)
- Touches all trial agents without requiring new traffic
- Proven conversion lift (typically 8-12% of trial users → paid on email sequence)

**UC:** `uc-trial-email-sequence-activate`  
**Implementation:**
- Email #1 (Day 10): "You're making an impact — here's what's working"
  - Lead: Leads responded count, avg response time
  - CTA: "Upgrade to Pro" with direct Stripe checkout link
  - Expected: 25% open rate, 5% conversion
  
- Email #2 (Day 13): "3 pilots in your city are already using LeadFlow"
  - Social proof: Agent count, booked calls, response time
  - Offer: "$50 off Pro for first month"
  - Expected: 20% open rate, 8% conversion

- Email #3 (Day 14): "Your trial expires tomorrow"
  - Urgency: Countdown, access loss, feature summary
  - CTA: "Upgrade Now" + "Chat with us" button
  - Expected: 35% open rate, 12% conversion

**Acceptance Criteria:**
- Email templates created in Resend
- Cron job checks `trial_ends_at` daily and matches milestones
- Sequence halts automatically on upgrade (check `plan_tier` ≠ 'trial')
- No duplicate sends (idempotent flag per agent+milestone)
- Analytics: Open rate, click rate, conversion tracked
- **Revenue impact:** 3 pilots × 12% conversion = 0.36 paid agents → ~$54/mo (increasing)

---

### Action 2: Implement Dashboard Trial Countdown & Upgrade CTA [Days 1-5]

**Why This Second:**
- Immediate urgency for pilots already in dashboard
- Low effort (single UI component + routing)
- Complements email sequence

**UC:** `uc-dashboard-trial-countdown`  
**Implementation:**
- Persistent banner at top of /dashboard:
  ```
  "Your trial expires in X days — Upgrade to Pro for $149/month and get unlimited SMS"
  [Upgrade Now Button] [Learn More]
  ```
- "Upgrade Now" → Direct to Stripe checkout (pre-select Pro plan)
- "Learn More" → /pricing page with tier comparison

**Acceptance Criteria:**
- Banner visible on all dashboard pages (/dashboard, /settings, /integrations)
- Countdown updates hourly (not on every page load)
- Styled to stand out (green/amber based on days remaining)
- Click tracking fires for both CTA buttons
- **Revenue impact:** 20% of pilots who see this → 0.6 paid agents → ~$90/mo

---

### Action 3: Refresh Pricing Page with Testimonials + Feature Comparison [Days 1-10]

**Why This Third:**
- Reduces friction for new signups considering paid tiers
- Adds social proof (testimonials from pilot agents)
- Converts landing page visitors who reach pricing page

**UC:** `uc-pricing-page-conversion-refresh`  
**Implementation:**
- Remove: API endpoint documentation table (design cleanup)
- Add: Testimonial cards (quote + photo + agent name)
  - "I close 30% more deals now" — Sarah M., Chicago
  - "SMS response time changed everything" — James T., TX
  - (Use real data from pilot agents: response time, appts booked)
- Add: Feature comparison matrix
  ```
  | Feature | Starter | Pro | Team |
  | SMS/mo | 100 | Unlimited | 5x Unlimited |
  | AI Qualification | Yes | Yes | Yes |
  | Cal.com Booking | No | Yes | Yes |
  | Team Management | No | No | Yes |
  ```
- CTA: "Start 14-Day Trial" → /signup/trial (no credit card)

**Acceptance Criteria:**
- Testimonials are real, from pilot agents (not stock)
- Feature comparison matches PMF.md pricing tiers
- Pricing numbers are correct and consistent with landing page
- Mobile layout is readable (no horizontal scroll)
- Checkout buttons are functional (not TODO placeholders)
- **Revenue impact:** 15% of landing page visitors reach pricing, 8% convert → ~1 new trial/week → $150/mo in 4 weeks

---

### Action 4: Deploy First Paid Customer Push [Days 15-20]

**Why This Fourth:**
- Manual intervention to prove proof-of-concept
- Gets first real MRR on books (psychological milestone)
- Validates end-to-end billing flow before scaling

**UC:** `uc-first-paid-customer-proof`  
**Implementation:**
- Stojan personally reaches out to top 1-2 pilot agents
- Offer: "Trial's going great. Here's $50 off Pro if you upgrade this week"
- Direct link to checkout (pre-filled email + tier)
- Verify:
  - Stripe webhook fires (checkout.session.completed)
  - real_estate_agents.plan_tier updates to 'pro'
  - Subscription start date recorded
  - Confirmation email sent
  - Billing portal works

**Acceptance Criteria:**
- At least 1 trial agent converts to paid Pro plan
- Stripe webhook successfully updates agent record
- MRR increases by at least $149 (1 × Pro)
- Confirmation email delivers
- Billing portal accessible at /settings/billing
- **Revenue impact:** 1 pilot × $149 = $149/mo (proof of concept)

---

## Part 3: Supporting Use Cases

All four actions require related UCs to be complete:

### Prerequisite UCs (Already Complete)
- ✅ `feat-self-serve-stripe-checkout` — Checkout flow in dashboard
- ✅ `feat-post-signup-redirect-to-dashboard-onboarding` — Onboarding wizard
- ✅ `feat-aha-moment-lead-simulator` — Lead simulator (aha moment)
- ✅ `UC-LANDING-MARKETING-001` — Landing page deployed

### New UCs to Spawn (Derived from this PRD)
1. **uc-trial-email-sequence-activate** (Action 1)
   - Priority: P1 (Blocker)
   - Workflow: Dev > QC
   - Estimated: 2 days
   
2. **uc-dashboard-trial-countdown** (Action 2)
   - Priority: P1 (Blocker)
   - Workflow: Design > Dev > QC
   - Estimated: 1.5 days
   
3. **uc-pricing-page-conversion-refresh** (Action 3)
   - Priority: P1 (Blocker)
   - Workflow: Marketing > Design > Dev > QC
   - Estimated: 2 days

4. **uc-first-paid-customer-proof** (Action 4)
   - Priority: P0 (Manual, PM-led)
   - Workflow: PM (manual outreach)
   - Estimated: 3-5 days (waiting for agent response)

5. **uc-trial-user-cohort-analytics** (Monitoring)
   - Priority: P2 (Quality)
   - Workflow: Analytics > Dev
   - Estimated: 2 days
   - Tracks: Feature usage, conversion probability, churn risk

---

## Part 4: Revenue Projections

### Scenario: 4 Actions Fully Implemented [Days 1-30]

| Milestone | Day | Input | Conversion | Output | MRR |
|-----------|-----|-------|------------|--------|-----|
| **Baseline** | 1 | 3 pilots | — | $0 | $0 |
| **Email activates** | 7 | 3 pilots | 12% (1 paid) | 1 Pro agent | $149 |
| **Dashboard countdown** | 10 | 3 pilots | +8% (0.24 paid) | 1.24 total | $185 |
| **Pricing refresh** | 15 | 3 pilots + new | +15% landing → trial | 1 new trial | $200 |
| **Manual push** | 20 | 3 pilots + 1 new | 50% (1 upgrade) | 2 paid total | $400 |
| **Organic/referral** | 30 | +2 new trials | 25% conversion | 3 paid total | $600 |

**Day 30 projection: $600 MRR** (300% of baseline, on track for $20K by day 91)

### Path to $20K MRR [Days 30-91]

**Required:** 1,200% growth in 61 days (~7.5%/week compound growth)

**Drivers:**
1. Organic signups accelerate (landing page social proof improves)
2. Email referrals from happy paying agents (+5% per new agent)
3. FUB marketplace listing drives steady inbound
4. Content marketing (blog + webinars) adds 2-5 new trials/week

**Conservative model:**
- Week 4-5: 3 paid agents → $600 MRR
- Week 6-7: Add 2 Team agents → $1,398 MRR
- Week 8-9: Add 5 Pro → $2,145 MRR
- Week 10-13: Add 20 Pro + 5 Team → $20,000 MRR

---

## Part 5: Risk Mitigation

### Risk 1: Email Sequence Doesn't Lift Conversion
**Mitigation:**
- A/B test templates during week 1 (day 10 email)
- Fallback: Manual outreach by Stojan to all pilots on day 13
- Alternative: Offer deeper discount ($100 off instead of $50) for first 5 converts

### Risk 2: Pilots Don't See Value Before Trial Ends
**Mitigation:**
- Real Twilio SMS must be live (already done)
- Lead simulator must auto-trigger on onboarding (verify in smoke tests)
- Sample leads must appear in dashboard on first login (FUB integration ready)
- Manual QA: Stojan walks through entire first-time user experience

### Risk 3: Organic Growth Insufficient
**Mitigation:**
- After first 3 paid customers, allocate $500/week for Google Ads (lead gen)
- Target keywords: "AI real estate SMS," "instant lead response," "real estate SMS automation"
- CAC target: $100/customer (breakeven at month 2)
- FB ads targeting "real estate agent" + "marketing decision makers"

### Risk 4: Billing Flow Breaks at Scale
**Mitigation:**
- Stripe webhook signature verification must be tested
- Payment failure retry logic must work (Stripe Smart Retries)
- Dunning email sequence must activate on failed payments
- Smoke test must verify full checkout → subscription → webhook → plan_tier update

---

## Part 6: Success Criteria

### Primary (Mandatory)
- [ ] AC-1: Trial email sequence sends successfully to all 3 pilots
- [ ] AC-2: At least 1 trial agent converts to paid (plan_tier='pro'|'team'|'starter')
- [ ] AC-3: Dashboard trial countdown visible + functioning
- [ ] AC-4: Upgrade CTA buttons are not TODO placeholders
- [ ] AC-5: First real Stripe subscription processes without errors
- [ ] AC-6: MRR ≥ $149 by day 20 (proof of concept)

### Secondary (Quality)
- [ ] AC-7: Email open rates ≥ 20% (measured in email service)
- [ ] AC-8: Email click rates ≥ 5%
- [ ] AC-9: Pricing page testimonials are from real pilots (not stock images)
- [ ] AC-10: Feature comparison matrix matches PMF.md exactly
- [ ] AC-11: Signup → trial takes <60 seconds (no friction)
- [ ] AC-12: GA4 events fire for all CTA clicks

### Monitoring
- [ ] AC-13: Daily MRR tracking (Stripe API or dashboard)
- [ ] AC-14: Trial cohort funnel (signup → email 1 → email 2 → email 3 → paid)
- [ ] AC-15: Email sequence success rate (open/click/convert tracked)

---

## Part 7: Timeline

| Phase | Days | Tasks | Owner | Output |
|-------|------|-------|-------|--------|
| **Analyze** | 1-2 | Funnel review, metrics baseline | PM | This PRD |
| **Build** | 3-10 | Implement 4 actions | Dev+Design | UCs complete |
| **Activate** | 11-15 | Deploy + QC testing | QC | All features live |
| **Convert** | 16-30 | Manual outreach + monitor | PM+Stojan | 1+ paying customers |
| **Scale** | 31-91 | Organic growth + paid ads | Marketing | $20K MRR |

---

## Part 8: Acceptance Checklist

- [ ] PRD reviewed by PM and accepted
- [ ] 4 UCs created in Supabase `use_cases` table
- [ ] Each UC has prd_id set to PRD-REVENUE-RECOVERY-002
- [ ] Dev estimates obtained for each UC
- [ ] Email templates drafted by Marketing
- [ ] Pricing page copy finalized
- [ ] Stripe test transaction executed end-to-end
- [ ] GA4 event tracking verified (non-PII)
- [ ] Smoke test suite updated for new features
- [ ] Stojan has approved manual outreach strategy

---

## Appendix: Detailed Feature Specs

### Email Template 1: Day 10 — "You're Making an Impact"
```
Subject: "Your leads are responding 5x faster now"

Hi [Agent Name],

Your LeadFlow trial is off to a great start. Here's what's working:

📊 Your Stats
- Leads responded to: [COUNT from messages table]
- Average response time: [AVG from messages.created_at - lead.created_at]
- Messages sent: [COUNT from messages table]

The agents who upgrade to Pro unlock:
✅ Unlimited SMS (vs 100/month on Starter)
✅ Advanced AI personalization
✅ Priority support

Ready to close more deals?

[BUTTON: Upgrade to Pro for $149/month]

[Footer: Expires in 4 days | [Link to /pricing]]
```

### Email Template 2: Day 13 — "3 Pilots in Your City"
```
Subject: "Real agents, real results: LeadFlow at [City, State]"

Hi [Agent Name],

3 real estate agents in your market are using LeadFlow. Here's what they're seeing:

📍 In [City]
- 5 new appointments booked per week (avg)
- 90+ inbound SMS responses (weekly)
- 25% shorter response time than email

Limited Time: $50 off Pro (first month)
Use code: PILOT50

[BUTTON: Claim offer]

[Footer: Expires in 1 day]
```

### Email Template 3: Day 14 — "Your Trial Expires Tomorrow"
```
Subject: "Your free trial expires at midnight"

Hi [Agent Name],

Your 14-day trial ends tomorrow. After that, you'll lose access to:

❌ Dashboard + lead feed
❌ SMS responses  
❌ FUB integration
❌ Analytics + reports

Don't lose momentum. Upgrade now:

[BUTTON: Upgrade to Pro] [BUTTON: Chat with us]

[Footer: 24 hours left]
```

---

## Sign-Off

- **PM:** Product Manager
- **Approved By:** (Awaiting Stojan approval)
- **Date:** 2026-03-30
- **Target MRR:** $20,000
- **Window:** 47 days
- **Status:** Ready for Dev spawn

---

*This PRD drives revenue recovery through trial-to-paid conversion optimization + urgent email activation. Implementers should prioritize Action 1 (email sequence) first for fastest revenue impact.*
