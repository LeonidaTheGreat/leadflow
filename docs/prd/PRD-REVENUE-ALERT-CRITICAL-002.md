# PRD: Revenue Alert Critical — MRR Closure Plan

**PRD ID:** `prd-revenue-critical-002`  
**Date:** 2026-03-31  
**Status:** Active  
**Priority:** P1 — Blocker  
**Owner:** Product Manager  
**Target:** Close $20,000 MRR gap in 45 days (Day 45 of 90)

---

## Executive Summary

**Current State:**
- MRR: $0 (384 test/trial accounts, 0 paying customers)
- Days remaining: 45
- Target: $20,000 MRR
- Gap: -$20,000 (critical)

**Root Cause Analysis:**
1. **Pilot recruitment is stalled** — Stojan approval pending; no real agents in system
2. **Onboarding → conversion broken** — Pilot agents stuck at "onboarding" status, never reaching "paid"
3. **No paid tier activation path** — Transition from free trial to paid subscription is undefined
4. **No payment collection process** — Stripe integration exists but no real agent has triggered checkout
5. **Product not tested with real use case** — All 384 accounts are smoke tests; zero genuine leads processed

**Go/No-Go Decision Required:**
- **Proceed with white-glove pilot recruitment** with 3 real agents, OR
- **Pivot business model** (usage-based, lead-sharing model, etc.)

---

## Part 1: Immediate Actions (Days 1-7)

### 1.1 Unblock Pilot Recruitment

**Use Case:** `uc-pilot-recruitment-go-ahead`

**What:** Get Stojan's explicit approval to recruit 3 real estate agents for white-glove pilot.

**Why:** Without real agents, there is zero path to revenue. All 384 current "customers" are smoke tests.

**Acceptance Criteria:**
- [ ] Stojan approves "white-glove pilot" approach in writing
- [ ] Marketing has 3 qualified agent candidates identified (real estate agents, 10+ yrs experience, 20+ leads/month)
- [ ] Recruitment email draft reviewed and approved
- [ ] Start date confirmed (target: April 1)

**Owner:** Orchestrator + Marketing  
**Timeline:** Day 1-2

---

### 1.2 Define Trial → Paid Conversion Flow

**Use Case:** `uc-trial-to-paid-conversion-flow`

**What:** Spec the exact experience when a trial agent upgrades to Pro/Team tier.

**Why:** Without this, no trial agent has a path to payment.

**Current Gaps:**
- No "upgrade CTA" in dashboard
- No Stripe checkout integration in dashboard
- No email sequence triggered on day 14 of trial ("upgrade or lose access")
- No "Plan Comparison" page accessible from dashboard

**Acceptance Criteria (PRD only — Dev task separate):**
- [ ] Upgrade CTA placed on dashboard home (when trial expires in X days)
- [ ] Stripe checkout flow specified (which plan shown, price, features)
- [ ] Email sequence defined: day 7 (midpoint), day 14 (final), day 21 (churned)
- [ ] Success metric: 30%+ of trial agents who reach day 14 convert to paid

**Owner:** PM (spec), Dev (implement)  
**Timeline:** Day 3-5

---

## Part 2: Pilot Execution (Days 8-30)

### 2.1 White-Glove Onboarding for 3 Real Agents

**Use Case:** `uc-white-glove-pilot-3agents`

**What:** Recruit, onboard, and activate 3 real estate agents on Pro tier within 21 days.

**Success Definition:**
- 3 agents have FUB connected
- 3 agents have received + responded to 10+ real leads via SMS
- 3 agents have scheduled 5+ appointments via Cal.com integration
- 3 agents are paying $149/mo (Pro tier)

**Acceptance Criteria:**
- [ ] Day 8: 3 agents signed up and onboarded
- [ ] Day 12: FUB connected for all 3
- [ ] Day 15: First leads received and responded to (automated SMS)
- [ ] Day 21: Minimum 5 meetings booked, 3 paid subscriptions active
- [ ] Day 30: NPS score from 3 agents >= 40

**Critical Handoff:** This is NOT a smoke test. Marketing recruits real agents (not QC test accounts). Dev ensures onboarding is <15 minutes for real agent.

**Owner:** Marketing (recruitment), PM (success criteria), QC (validation)  
**Timeline:** Days 8-30

---

## Part 3: Scaling to $20K MRR (Days 31-90)

### 3.1 Conversion Funnel Target

**Path A: Conservative** (hit minimum)
- 100 Pro agents @ $149/mo = $14,900/mo
- 5 Team @ $399/mo = $1,995/mo
- **Total: ~$16,900/mo** ✓ (at minimum)

**Path B: Balanced** (target)
- 50 Pro agents @ $149/mo = $7,450/mo
- 25 Team @ $399/mo = $9,975/mo
- **Total: $17,425/mo** ✓

**Path C: Stretch** (go-to-market success)
- 150 Pro agents @ $149/mo = $22,350/mo
- **Total: $22,350/mo** ✓✓

### 3.2 Customer Acquisition Channels (Post-Pilot)

| Channel | Target Agents | CAC | Timeline |
|---------|---------------|-----|----------|
| Referral bonus ($100/agent) | 20 | $100 | Days 31-45 |
| Facebook Ads ("AI for realtors") | 30 | $75 | Days 31-60 |
| Reddit/r/realtors | 15 | $30 | Days 31-60 |
| FUB Marketplace listing | 25 | $0 | Days 31-90 |
| Webinar + email list | 20 | $50 | Days 46-90 |
| **Total target** | **110** | **$48/avg** | **By Day 60** |

### 3.3 Success Metrics (Rolling)

| Metric | Day 30 | Day 60 | Day 90 |
|--------|--------|--------|--------|
| **Signups** | 10 | 50 | 150 |
| **Conversions** (paid) | 3 | 20 | 75+ |
| **MRR** | ~$450 | $5,000 | $15,000+ |
| **Churn Rate** | <5% | <5% | <5% |
| **NPS** | 40+ | 45+ | 50+ |

---

## Part 4: Critical Product Dependencies

### 4.1 Blocker #1: Pilot Recruitment Approval

**Status:** WAITING  
**Trigger:** Stojan approval message  
**Blocker For:** Everything else (no revenue without real agents)

### 4.2 Blocker #2: Trial → Paid Conversion Flow

**Status:** NOT SPEC'D  
**Trigger:** PM PRD completion + Dev implementation  
**Blocker For:** Scaling beyond pilot

### 4.3 Blocker #3: Product Quality for Real Leads

**Status:** TESTING  
**Risk:** If product doesn't work (SMS fails, Cal.com booking fails), pilot agents churn

**Acceptance Check:**
- Smoke tests pass (9/9 confirmed working)
- QC validation on real FUB accounts (sample test)
- <30s response time SLA met

### 4.4 Blocker #4: Onboarding Friction

**Status:** NEEDS REVIEW  
**Risk:** Real agents drop off during FUB connection (historically 15-20% drop)

**Acceptance Check:**
- Onboarding <15 minutes for real agent
- FUB connection success rate >85%
- Email support response <2 hours

---

## Part 5: KPI Dashboard & Weekly Reviews

### 5.1 Weekly Pulse

| Week | Metric | Target | Owner |
|------|--------|--------|-------|
| **W1 (Day 1-7)** | Pilot recruitment approval + flow spec | Yes | PM + Orchestrator |
| **W2-3 (Day 8-21)** | 3 agents onboarded + FUB connected | 3/3 | Marketing + QC |
| **W4 (Day 22-30)** | 3 agents paying + 5 meetings booked | 3/3 | All |
| **W5-6 (Day 31-45)** | 20 total agents + $2K MRR | 20 | Marketing + Sales |
| **W7-8 (Day 46-60)** | 50 agents + $5K MRR | 50 | Marketing + Sales |
| **W9-13 (Day 61-90)** | 75+ agents + $15K+ MRR | 75 | All |

### 5.2 Weekly Review Cadence

**Every Monday at 10am (Stojan + PM + Marketing):**
1. Review pilot recruitment progress
2. Audit real agent onboarding (FUB, SMS test, booking test)
3. Check MRR tracker (real vs. projected)
4. Surface blockers immediately

---

## Part 6: Pivot Contingency

**If pilot recruitment stalls OR 3 pilot agents churn within 2 weeks:**

**Pivot Option A: Pre-funded Brokerage Partnerships**
- Partner with small brokerage (50-100 agents)
- Offer white-label at $50/agent wholesale cost
- Path: 100 agents @ $149/mo = $14,900/mo

**Pivot Option B: Usage-Based Pricing**
- $0.50 per qualified lead (instead of monthly tier)
- Lower friction for agents to try
- Higher LTV if agents process 100+ leads/month

**Pivot Option C: Lead-Sharing Model**
- LeadFlow provides the leads (from Zillow/Realtor.com)
- Agent pays 25-30% of commission
- Higher upside (80% margins) but requires lead sourcing partnership

**Decision Gate:** Day 30 (end of W4). If MRR < $300 and 3 agents not paying, escalate to Stojan for pivot decision.

---

## Part 7: Success Definitions

### Phase 1: Pilot (Days 1-30) — SUCCESS = 3 Paying Agents

- [ ] 3 real agents recruited and onboarded
- [ ] 3 FUB accounts connected
- [ ] 3 agents have processed 10+ leads via SMS
- [ ] 3 agents have booked 3+ appointments
- [ ] 3 agents paying Pro tier ($149/mo)
- [ ] MRR ≈ $450

### Phase 2: Scale (Days 31-60) — SUCCESS = $5K MRR

- [ ] 20 total agents acquired (17 new)
- [ ] 16+ paying (Pro + Team mix)
- [ ] MRR ≈ $5,000
- [ ] Churn rate < 5%
- [ ] Weekly signup rate: 5-7 new agents

### Phase 3: Growth (Days 61-90) — SUCCESS = $15K+ MRR

- [ ] 75 total agents acquired (55 new)
- [ ] 60+ paying
- [ ] MRR ≈ $15,000+
- [ ] Churn rate < 5%
- [ ] On pace for $20K+ by day 100

---

## Appendix A: Customer Acquisition Channels Detail

### Channel 1: Referral Program ($100 bonus per agent)

**How:** Existing agents get $100 Stripe credit for each successful referral.

**Why:** Cheapest CAC ($100 vs. $500 for paid ads), highest trust.

**Activation:**
- Day 15: Send email to pilot agents with referral link
- Landing page: `leadflow.ai/refer`
- Mechanic: Unique code → new agent signup → $100 credit to both

**Target:** 20 referrals by day 45 (assumed 1-2 per pilot agent/week)

### Channel 2: Facebook Ads

**Copy Theme:** "Respond to real estate leads in <30 seconds with AI"

**Audience:** Interests in Real Estate, FUB CRM users, Zillow, RE agents

**Budget:** $1,500 (days 31-45) at $50 CAC = 30 agents

**Landing Page:** New (design task separate) with proof points:
- Case study video from pilot agent
- "X meetings booked in first week" stat
- Pricing (Pro: $149/mo)
- Free trial CTA

### Channel 3: Reddit/r/realtors

**Approach:** Non-promotional value posts (not ads, organic)

**Content Ideas:**
- "The 35% of leads that never get responded to" (problem)
- "How to respond in <30 seconds" (solution + screenshot)
- AMA: "Ask us anything about AI lead response"

**CAC:** Very low ($30 target) because organic  
**Conversion Rate:** 5-10% (lower than paid but authentic)

### Channel 4: FUB Marketplace Listing

**Status:** Pending FUB integration partnership approval

**CAC:** $0 (organic traffic from FUB dashboard)  
**Reach:** 5,000+ FUB users who may discover LeadFlow

**Timeline:** Days 31-90 (requires FUB partnership finalization first)

---

## Appendix B: Product Quality Checklist

Before recruiting first real agent (Day 8), QC must validate:

- [ ] SMS sending <30 seconds from lead ingestion
- [ ] SMS includes agent name, qualification, call CTA
- [ ] Cal.com booking link works end-to-end
- [ ] FUB status updates correctly after booking
- [ ] Dashboard shows real-time lead count
- [ ] Unsubscribe mechanic compliant (TCPA)
- [ ] Error handling: no blank SMS, no 500 errors
- [ ] Mobile responsive (agents check phone)

**Owner:** QC  
**Deadline:** Day 7

---

## Appendix C: Onboarding Flow (Real Agent)

**Timeline Target: 12-15 minutes**

1. **Signup** (1 min)
   - Email + password
   - Phone number
   - State

2. **Email verification** (instant + click)
   - Verify inbox
   - Confirm phone (SMS code)

3. **FUB connection** (3 min)
   - "Connect your FUB account" CTA
   - OAuth redirect to FUB
   - Return to LeadFlow with FUB token

4. **SMS configuration** (2 min)
   - Twilio phone number assigned
   - Show: "Your SMS number: +1 (555) 123-4567"
   - Test: Send test SMS to agent phone

5. **Lead simulator / Aha moment** (5 min)
   - "Send yourself a test lead"
   - Agent receives SMS
   - Agent clicks booking link
   - Mock appointment created in FUB
   - Dashboard shows: "You got a meeting!"

6. **Activate subscription** (3 min)
   - Free trial active (14 days)
   - Show: "Pro ($149/mo) or Team ($399/mo)"
   - "Upgrade now" button (optional at signup)

**Exit Criteria:** Agent receives test SMS + sees lead in dashboard

**Owner:** Dev + Design  
**Timeline:** Already built (validate with real agent at Day 8)

---

## Appendix D: Revenue Modeling Formula

```
MRR = (# Pro agents × $149) + (# Team agents × $399) + (# Brokerage agents × $999)

Day 30 target: 3 Pro = $447
Day 60 target: 50 agents = $7,450 (40 Pro + 10 Team)
Day 90 target: 75 agents = $15,000 (50 Pro + 25 Team)
```

**Churn Assumption:** <5% monthly (industry standard for SaaS)

**CAC Payback:** ~$200 CAC → 3 months to recover

---

## Appendix E: Decision Tree

```
START: Day 1

├─ Pilot Recruitment Approved? 
│  └─ NO → Pivot decision (see Appendix D)
│  └─ YES → Continue to Day 8
│
├─ Day 8: 3 agents onboarded?
│  └─ NO → Escalate to Stojan
│  └─ YES → Continue
│
├─ Day 21: 3 agents paying + 5 meetings booked?
│  └─ NO → Product issue or onboarding friction → Fix immediately
│  └─ YES → Continue to scaling phase
│
├─ Day 30: MRR >= $300?
│  └─ NO → Evaluate pivot
│  └─ YES → Full scale phase 2 (acquire 17 more agents by day 60)
│
└─ Day 60: MRR >= $5,000?
   └─ NO → Escalate for pivot or acceleration
   └─ YES → On track for $15K+ by day 90 ✓
```

---

## Sign-Off

**PM Approval:** [Pending]  
**Orchestrator Review:** [Pending]  
**Developer Awareness:** [Design Handoff Needed]  

This PRD supersedes previous revenue alert docs. It is the single source of truth for closing the MRR gap.

**Next Step:** Stojan approval of white-glove pilot recruitment. Once approved, Marketing spawns 3 real agent recruitment task.
