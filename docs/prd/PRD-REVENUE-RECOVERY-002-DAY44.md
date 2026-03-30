# PRD: Revenue Recovery Alert — Day 44 Critical Status

**Document ID:** PRD-REVENUE-RECOVERY-002  
**Version:** 1.0  
**Date:** March 30, 2026  
**Status:** CRITICAL ALERT — Revenue at Risk  
**Days Remaining:** 47 of 90 (pilot day 44/60 extended window)  

---

## 1. Current Situation (Day 44)

### Critical Reality Check

| Metric | Target @ Day 44 | Current | Variance | Status |
|--------|-----------------|---------|----------|--------|
| **MRR** | $9,670 | $0 | **-$9,670 (-100%)** | 🔴 CRITICAL |
| **Paying Agents** | 50-65 | 0 | -50+ | 🔴 CRITICAL |
| **Trial Signups** | 100+ | TBD | ? | ⚠️ UNKNOWN |
| **Pilot Agents Recruited** | 3 active | ≤3 pending | -3 or complete | ⚠️ UNCLEAR |

**Analysis:** We are 28 days into 60-day pilot. MRR remains $0. If current trajectory continues, we will **hit $0 MRR at 90 days**. This is a complete revenue failure.

---

## 2. Root Cause Analysis — What Blocked Progress?

### 2.1 Technical Blockers (Should Have Been Resolved by Day 22)

Reviewing USE_CASES.md, these were P0-CRITICAL on Day 16:

| UC | Status | Days Elapsed | Expected | Reality |
|----|--------|--------------|----------|---------|
| **fix-onboarding-500-error** | complete | 28 days | Fixed by Day 18 | ✅ DONE |
| **UC-LANDING-MARKETING-001** | complete | 28 days | Deployed by Day 21 | ✅ DONE (live at leadflow-ai-five.vercel.app) |
| **implement-twilio-sms-integration** | complete | 28 days | SMS live by Day 19 | ✅ DONE |
| **UC-9 (Sign-Up)** | complete | 28 days | Pre-existing | ✅ DONE |
| **UC-10/11 (Billing)** | complete | 28 days | Pre-existing | ✅ DONE |

**Verdict:** All technical blockers ARE resolved. Product is buildable. This is NOT a tech problem.

### 2.2 Go-to-Market Blockers (Should Have Been Activated by Day 22)

| Activity | Status | Days Elapsed | Expected | Reality |
|----------|--------|--------------|----------|---------|
| **Pilot Agent Recruitment** | ? | 28 days | 3 agents onboarded by Day 25 | ❌ NOT VISIBLE |
| **Landing Page Traffic** | ? | 28 days | 100+ visits by Day 22 | ❌ NOT VISIBLE |
| **Email Sequences** | ? | 28 days | Conversion emails by Day 30 | ❌ NOT VISIBLE |
| **Paid/Organic Acquisition** | ? | 28 days | Tests launched by Day 28 | ❌ NOT VISIBLE |

**Verdict:** Go-to-market execution has stalled. The product is ready; distribution is missing.

### 2.3 Hypothesis: Why Revenue is $0

Based on dashboard status, the most likely cause is **Pilot Agent Recruitment Blocked**.

Two action items were WAITING since Feb 25 per DASHBOARD.md:
1. Marketing Recruitment Timing (approval needed)
2. Pilot Launch Decision (approval needed)

**Interpretation:** Stojan has not approved pilot recruitment. Without 3 paid/trial pilot agents, there are no conversion signals, testimonials, or use cases to market. **The loop is broken at the human decision layer, not the technical layer.**

---

## 3. Revenue Path Forward — 47 Days Remaining

### 3.1 Math to $20K MRR

**Minimum path (50 Pro agents):**
- 50 agents × $149/month = $7,450 MRR (only 37% of target)

**Better path (100 Pro + 20 Team):**
- 100 agents × $149 + 20 × $399 = $14,900 + $7,980 = **$22,880 MRR** ✅ TARGET

**Required conversions by Day 90:**
- Trial → Paid conversion rate: 10% is industry standard for SaaS
- To get 120 paid agents: need 1,200 trial signups
- To get 1,200 trials in 47 days: need **25 signups/day**

### 3.2 Bottleneck Analysis: Where Are We Losing?

| Stage | Assumption | Current Gap | Impact |
|-------|-----------|-------------|--------|
| **Awareness** (Landing page traffic) | 0 visits/day | Should be 50+/day | Lost opportunity |
| **Interest** (Trial signups) | 0/day | Should be 25/day | **CRITICAL** |
| **Activation** (Completed onboarding) | 0/day | Should be 15/day | **CRITICAL** |
| **Retention** (Active 7d+) | N/A | Should be 10/day | **CRITICAL** |
| **Revenue** (Paid conversion) | N/A | Should be 1-2/day | **CRITICAL** |

**Finding:** Without visible trial signups, we cannot measure the funnel at all. **This is either a visibility problem (data not being tracked) or a true customer acquisition problem (landing page has 0 traffic).**

---

## 4. Recommended Actions — 47 Days to Revenue

### Action 1: Validate Current Funnel State (Immediate — 1-2 days)

**Goal:** Understand if we have ANY traffic/signups.

**Execution:**
1. Check Vercel analytics: landing page unique visits (past 7 days)
2. Query real_estate_agents table: count where created_at > now() - 7 days AND email NOT LIKE '%smoke%' AND email NOT LIKE '%test%'
3. Check agent_sessions table: count where session_start > now() - 7 days
4. Review GA4: signup funnel, trial conversion, plan selection events
5. Check Stripe API: list all Stripe customers created in past 7 days

**Success Criteria:**
- Identify if traffic exists but is not converting (funnel problem)
- Identify if traffic is zero (acquisition problem)
- Identify if conversion data is missing (instrumentation problem)

**Outcome:** A clear picture of "we have X visits → Y signups → Z paid" or "we have zero traffic"

### Action 2: Unlock Pilot Agent Recruitment (Immediate — 1 day)

**Goal:** Get 3 real-world agents using the product by Day 50.

**Current Blocker:** Two action_items WAITING for Stojan approval since Feb 25 (35 days!)

**Execution:**
1. **Stojan action:** Explicitly approve or deny pilot recruitment via dashboard action_items
2. **If approved:** PM spawns marketing recruitment task immediately
3. **If denied:** Escalate to determine resource/timeline constraints

**Success Criteria:**
- 1st pilot agent recruited and onboarded by Day 47
- 2nd pilot agent recruited and onboarded by Day 50
- 3rd pilot agent recruited and onboarded by Day 52

**Outcome:** At least 1 real agent using product, generating real data/testimonial

### Action 3: Fix Root Cause of Missing Revenue (2-5 days)

**Based on Action 1 outcome, execute one of:**

#### Path A: If Traffic Exists But Doesn't Convert (Funnel Problem)
- **Root Cause:** Landing page converts at <1%, or signup flow has friction
- **Fixes:**
  - A/B test headline + CTA copy
  - Simplify signup (remove non-essential fields)
  - Add social proof / testimonials (or placeholder: "Join 100+ agents")
  - Fix any broken flows (email verification, payment processing)
  - Add guarantee: "No credit card required" banner
- **Owner:** PM + Marketing + Design
- **ETA:** 3-5 days

#### Path B: If Traffic is Zero (Acquisition Problem)
- **Root Cause:** No one visiting the landing page (no organic, no paid, no referral)
- **Fixes:**
  - Launch immediate paid acquisition: Facebook ads targeting real estate + mortgage agents
  - Budget: $500/week test budget
  - Creative: "Respond to leads in 30 seconds" video/carousel
  - CTA: "Start Free Trial — No Credit Card"
  - Target: <$10 CPC, 5% conversion to trial
- **Owner:** Marketing + PM
- **ETA:** 2-3 days to launch, 1 week to data

#### Path C: If Conversion Data is Missing (Instrumentation Problem)
- **Root Cause:** GA4, Stripe, Supabase tracking not wired correctly
- **Fixes:**
  - Verify GA4 Measurement ID is set in Vercel env
  - Verify GA4 events fire on signup, trial start, upgrade
  - Verify Stripe webhooks execute on checkout.session.completed
  - Verify agent_sessions and analytics_events tables are being populated
  - Add log monitoring: every 1h check if metrics are increasing
- **Owner:** Dev
- **ETA:** 1-2 days to verify, fixes same day once issues found

### Action 4: Accelerate Pilot Conversion (Days 47-60)

**Goal:** Convert first pilot agents to paid as proof-of-concept.

**Execution:**
- Stojan manually offers: "You've been using our free pilot. Here's $50 off Pro for the first month."
- Offer valid through Day 55 (only 8 days to create urgency)
- Accept both manual payment (PayPal) and self-serve Stripe if preferred
- Verify Stripe webhook fires and plan_tier updates correctly

**Success Criteria:**
- ≥1 pilot agent converts to paid by Day 55
- Stripe subscription created successfully
- MRR increases from $0 → $49-$149 range

**Outcome:** Proof that paid conversion flow works, testimonial for marketing

### Action 5: Scale to 20+ Paying Agents (Days 61-90)

**Goal:** Hit $3K-$5K MRR by Day 60, then scale to $20K by Day 90.

**Execution (if Actions 1-4 succeed):**
1. **Paid Ads:** Scale budget to $2K/week if CAC < $50
2. **Content:** Publish 2 case studies from pilot agents
3. **Referral:** Launch $100/agent referral bonus
4. **Email Sequences:** Activate pilot-to-paid email nurture
5. **Partnerships:** Reach out to mortgage brokers, title companies

**Success Criteria:**
- 50+ trial signups/week by Day 70
- 5+ paid conversions/week by Day 75
- $3K MRR by Day 60, $10K+ MRR by Day 75, $20K MRR by Day 90

---

## 5. Reprioritized Use Cases — Day 44 Status

### P0 — Revenue Blockers (Must Complete This Week)

| ID | Name | Current Status | Day 44 Action |
|----|------|----------------|--------------|
| **UC-LANDING-MARKETING-001** | Marketing Landing Page | complete | ✅ Maintain (verify GA4 working) |
| **UC-TRIAL-CONVERSION-V2** | Trial-to-Paid Conversion (Actions 1-4) | new | Create immediately |
| **uc-trial-email-sequence-activate** | Pilot-to-Paid Email Sequence | in_progress | Complete this week |
| **uc-first-paid-customer-proof** | First Paid Customer Proof of Concept | not_started | Activate immediately |

### P1 — Revenue Enabling (Complete by Day 60)

| ID | Name | Current Status | Day 44 Action |
|----|------|----------------|--------------|
| **feat-pilot-conversion-email-sequence** | Pilot Conversion Emails | complete | Verify sending, track delivery |
| **uc-dashboard-trial-countdown** | Dashboard Trial Countdown | not_started | Create (shows days remaining) |
| **uc-pricing-page-conversion-refresh** | Pricing Page Testimonials | not_started | Create using pilot agents |
| **uc-trial-user-cohort-analytics** | Trial User Analytics | not_started | Create to identify high-intent users |

### P2 — Revenue Accelerating (Complete by Day 75)

| ID | Name | Current Status | Day 44 Action |
|----|------|----------------|--------------|
| **gtm-content-marketing** | Case Studies & Content | complete | Leverage pilot agents |
| **gtm-paid-ads** | Facebook/Instagram Ads | not_started | Create $500 test campaign |
| **gtm-referral-program** | Referral Bonus ($100) | not_started | Create product & marketing |

---

## 6. Success Metrics (Next 47 Days)

### Week 1 (Days 44-50): Validation & Unlock
| Metric | Target | Acceptance |
|--------|--------|-----------|
| Funnel status validated | 100% | Clear picture of where revenue is leaking |
| Pilot recruitment approved | Yes | Action item resolved by Stojan |
| Pilot #1 onboarded | Day 50 | Real agent using product, one real lead received |
| Landing page GA4 verified | 100% | Events firing correctly in production |

### Week 2 (Days 50-57): Conversion Proof
| Metric | Target | Acceptance |
|--------|--------|-----------|
| Pilot #2 onboarded | Day 52 | Second agent in system |
| Pilot #3 onboarded | Day 55 | Third agent in system |
| First paid conversion | ≥$149 | 1 pilot agent upgrades to paid |
| MRR | ≥$149 | Stripe subscription active, webhook processed |

### Week 3 (Days 57-64): Scale Activation
| Metric | Target | Acceptance |
|--------|--------|-----------|
| Daily trial signups | ≥3/day | Top-of-funnel opening up |
| Paid conversions/week | ≥1 | Conversion funnel proven |
| MRR | ≥$500 | Multiple paying agents |
| Landing page visits | ≥500 cumulative | Traffic flowing to landing page |

---

## 7. Contingency Plans

### Scenario A: Pilot Recruitment Continues to Be Blocked
- **Decision Point:** Day 52 (if pilot agents = 0)
- **Action:** Pivot to paid ads for general audience (non-pilot path)
- **Trade-off:** Slower than pilot path, but unlocks traffic without Stojan decision
- **Budget Required:** $500 test budget

### Scenario B: Landing Page Exists But Gets Zero Organic Traffic
- **Decision Point:** Day 47 (if GA4 shows <10 visits/day)
- **Action:** Assume organic is not viable; launch paid ads immediately
- **Trade-off:** Higher CAC in short term, but gets data to optimize

### Scenario C: Trial Signups Exist But Conversion Rate is <1%
- **Decision Point:** Day 55 (if paid agents still = 0)
- **Action:** A/B test pricing, offer, and CTA copy
- **Trade-off:** Extends timeline by 1-2 weeks, but fixes root problem

### Scenario D: First Paid Agent Churns After Day 60
- **Decision Point:** Day 65
- **Action:** Reduce monthly price, offer support, activate retention email
- **Trade-off:** Lower MRR short-term, but prevents churn narrative

---

## 8. E2E Test Specs

### E2E-REV-002-A: Validate Funnel Instrumentation
**Given** a test user visits landing page and signs up  
**When** they complete onboarding  
**Then** GA4 captures: signup event, onboarding completion, plan selection  
**And** Supabase real_estate_agents table shows the new user  
**And** agent_sessions table logs their session  

### E2E-REV-002-B: End-to-End Trial-to-Paid Conversion
**Given** a trial agent completes onboarding  
**When** they connect FUB + Twilio + SMS settings  
**Then** they receive sample lead + AI SMS  
**And** they see upgrade CTA in dashboard  
**When** they click Upgrade → Pro  
**Then** Stripe Checkout opens  
**When** they submit payment (test card 4242...)  
**Then** Stripe webhook fires checkout.session.completed  
**And** real_estate_agents.plan_tier updates to 'pro'  
**And** real_estate_agents.stripe_customer_id is set  
**And** subscriptions table has new row  
**And** MRR increases by $149  
**And** Confirmation email sent to agent  

### E2E-REV-002-C: Pilot Agent Onboarding → First SMS
**Given** a pilot agent is recruited via admin invite  
**When** they accept invite and login  
**Then** onboarding wizard auto-triggers  
**When** they connect FUB API key  
**Then** FUB webhook is registered automatically  
**When** they configure Twilio  
**Then** SMS verification test sends successfully  
**When** they complete aha moment simulator  
**Then** They see sample lead + AI SMS in dashboard  
**And** Dashboard shows "SMS responding in <30 seconds"  

---

## 9. Workflow & Handoff

| Step | Owner | Dependency | ETA | Blocker? |
|------|-------|-----------|-----|----------|
| Action 1: Funnel Validation | Analytics/PM | None | Day 46 | CRITICAL |
| Action 2: Unlock Pilot Recruitment | PM | Stojan approval | Day 46 | CRITICAL |
| Action 3: Fix Root Cause (A/B/C) | Dev/Marketing | Action 1 outcome | Day 50 | HIGH |
| Action 4: First Paid Conversion | PM/Stojan | Pilot agent + working flow | Day 55 | HIGH |
| Action 5: Scale to 20+ | Marketing/PM | Actions 1-4 success | Days 61-90 | MEDIUM |

---

## 10. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 30 | Revenue is $0 = blocker, not optimization issue | Technical work is 95% complete; go-to-market is stalled |
| Mar 30 | Pilot recruitment is the critical path | Without pilot agents, no testimonials or conversion data to market |
| Mar 30 | Actions are time-boxed (1-5 days max) | 47 days remaining; cannot afford 2-week analyses |
| Mar 30 | Paid ads may be required by Day 50 | Organic path requires pilot proof; cannot wait indefinitely |
| Mar 30 | First paid customer by Day 55 is MUST-HAVE | Proves product-market fit before final 35 days |

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pilot recruitment blocked indefinitely | High (past 35 days) | CRITICAL | Escalate to Stojan, switch to paid ads if needed |
| Landing page has 0 traffic | Medium | HIGH | Launch paid ads immediately, don't wait for organic |
| Trial-to-paid conversion rate <1% | Medium | HIGH | Fix pricing/offer/UX, enable payment plan option |
| First paid agent churns | Medium | MEDIUM | Offer support, reduce price, activate retention |
| Can't reach $20K by Day 90 | Medium-High | Business failure | Pivot to lower initial target ($10K) or extend runway |

---

*This PRD is a critical recovery document. Update daily based on funnel metrics. Every day without revenue momentum is a day closer to failure.*

**Key Insight:** We have a buildable, deployable product. We do not have paying customers because we have not distributed it. The next 47 days are 100% go-to-market execution. Technical debt can wait.
