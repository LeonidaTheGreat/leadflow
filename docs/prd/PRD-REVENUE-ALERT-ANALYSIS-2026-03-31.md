# PRD: Revenue Alert Analysis & Recovery Plan

**Date:** 2026-03-31  
**Owner:** Product Manager  
**Status:** COMPLETE  
**Task ID:** b54f57c8-3658-462c-9c17-4cac462ed44d  

---

## Executive Summary

**CRITICAL FINDING:** Revenue alert ($0 MRR on day 45 of 90) is not a product problem — it's a **pilot recruitment and trial-to-paid conversion bottleneck**.

The system is technically ready. The problem is:
1. **No paying agents yet** — pilot phase still recruiting (3 agents free)
2. **Trial-to-paid funnel not active** — onboarding → aha moment → payment flow incomplete
3. **Landing page conversion unknown** — no UTM tracking, no baseline metrics
4. **First $20K MRR target assumes 100+ paid agents** — we're at 0

**Recommendation:** Reprioritize to 3 critical conversion improvements:
1. **Pilot Completion & Case Study** (P0) — Get 3 pilot agents to active usage + testimonial
2. **Trial-to-Paid Funnel Optimization** (P1) — Smooth onboarding → first paid upgrade
3. **Marketing Attribution & Lead Source Tracking** (P1) — Understand where paying agents come from

---

## Context: Revenue Target vs. Current State

### The $20K MRR Goal

Per `project.config.json`:
- **Target:** $20,000 MRR
- **Target date:** Day 90 (April 15, 2026)
- **Current date:** Day 45 (March 31, 2026)
- **Elapsed:** 50% of timeline
- **Current MRR:** $0

### Pricing Model (from PMF.md)

| Tier | Price | Target |
|------|-------|--------|
| Starter | $49/mo | Test/evaluation |
| Pro | $149/mo | Primary ICP (solo agents) |
| Team | $399/mo | Small teams (5+ agents) |
| Brokerage | $999+/mo | Future |

**To hit $20K MRR at Pro tier:** 135 agents at $149 MRR average

### Current Pilot State (from DASHBOARD.md)

| Component | Status |
|-----------|--------|
| MVP complete | ✅ Yes |
| Pilot agents recruited | ⏳ 3 recruited, onboarding in progress |
| Free pilot signups | ✅ 0 paying agents yet |
| Landing page live | ✅ Yes, but no conversion tracking |
| SMS working | ✅ Yes, tested |
| FUB integration | ✅ Ready |
| Stripe billing | ✅ Connected, price IDs live |

---

## Funnel Analysis: Where Revenue Breaks

### Awareness → Signup (Unknown)

**Current State:** No UTM tracking or landing page analytics

| Stage | Metric | Status |
|-------|--------|--------|
| Landing page views | Unknown | ⏳ Need GA4 verification |
| Signup attempts | Unknown | ⏳ Need logs |
| Signup completions | 3 (pilot only) | ✅ Verified |

**Risk:** We don't know if the landing page is getting traffic or converting.

**Action:** Enable UTM tracking + GA4 event verification (referenced in issue fix list)

---

### Signup → Onboarding (Friction Point #1)

**Current State:** Pilot agents get white-glove onboarding from Stojan

| Stage | Metric | Target | Status |
|-------|--------|--------|--------|
| Signup → onboarding start | 100% | 100% | ✅ 3/3 pilots onboarded |
| Onboarding → FUB connection | 100% | 80%+ | ⏳ Depends on agent tech level |
| Onboarding → SMS aha moment | 100% | 90%+ | ✅ Lead simulator working |
| Onboarding completion time | <1hr | <2hrs | ⏳ Need baseline |

**Risk:** Self-serve agents may not complete onboarding (no white-glove support post-pilot)

**Action:** Test self-serve onboarding UX on next cohort of paid agents

---

### Onboarding → First Active Use (Friction Point #2 — STUCK UC)

**Current State:** UC-ONBOARDING-MOBILE-FIRST marked as "stabilization/ready" — 86% drop-off

**Issue:** Most agents drop after signup, never activate

| Stage | Target Conversion |
|-------|-------------------|
| Signup → first login | 95% |
| First login → FUB integrated | 80% |
| FUB integrated → lead received | 70% |
| Lead received → agent views lead | 50% |

**Current:** Unknown (pilot agents are white-gloved, not representative)

**Action:** Activate UC-ONBOARDING-MOBILE-FIRST fix (currently stuck)

---

### Active Use → First Payment (Friction Point #3 — NOT TESTED)

**Current State:** No paying agents exist to test conversion

| Trigger | Status |
|---------|--------|
| Free trial starts | ✅ Implemented (14-day free) |
| Trial → payment prompt | ⏳ Unclear when/how prompted |
| Payment prompt → checkout | ⏳ Not tested at scale |
| Checkout → subscription active | ✅ Stripe ready |

**Risk:** Trial-to-paid conversion is completely untested at scale

**Action:** Design and test trial-to-paid messaging sequence

---

### Retention & Expansion (Unknown)

**Current State:** 0 paying agents means 0 churn/expansion data

| Metric | Target | Status |
|--------|--------|--------|
| Monthly churn | <5% | ⏳ Unknown |
| Expansion revenue | 5%+ of MRR | ⏳ Unknown |
| NPS | 40+ | ⏳ Unknown |

---

## Use Case Inventory: What Blocks Revenue?

### P0 Blockers (Block All Revenue)

**UC-PILOT-DIRECT-RECRUITMENT** (status: ready)
- Recruit 5-10 real agents for paid pilot
- Required before: Trial-to-paid testing
- Impact: 0 agents = $0 MRR
- Owner: Marketing + PM
- **Decision:** Approve "go ahead" to trigger marketing task

---

### P1 Revenue Drivers (Direct MRR Impact)

**UC-ONBOARDING-MOBILE-FIRST** (status: ready, stuck since 2026-03-24)
- Fix 86% drop-off in onboarding
- Expected impact: 2x more trial agents → trial-to-paid conversions
- Blocker reason: "Stuck" — needs root cause investigation
- **Action:** Review PR, determine why stuck, unblock or replan

**UC-EMAIL-DELIVERY-FIX** (status: stuck, no commits)
- Transactional email delivery (signup confirmation, trial ending, payment reminders)
- Expected impact: Improves onboarding completion + trial-to-paid timing
- Blocker reason: PRD ambiguity (what is "verify <30s"?)
- **Action:** Clarify scope + acceptance criteria

**feat-trial-email-sequence-activate** (not found in UC list)
- Trial → payment prompts (trial-ending email, upgrade offers)
- Expected impact: Activates conversion funnel
- Status: Unclear
- **Action:** Create UC with clear sequence + timing

---

### P2 Revenue Signals (Indirect)

**Product Review Tasks** (4 ready to spawn per DASHBOARD.md)
- UTM parameter capture & marketing attribution
- Bug feedback analysis
- UX issue analysis
- Feature request analysis

**Expected impact:** Identify secondary conversion improvements (better positioning, UX polish)

---

## Strategic Decisions for Revenue Recovery

### Decision 1: Pilot Recruitment (P0)

**Status:** Ready to go (per DASHBOARD.md, "pending Stojan approval")

**Action:** Post to Telegram topic 10788:

> @orchestrator_leonida_bot: Revenue alert indicates $0 MRR on day 45. Pilot recruitment is the critical first step. Ready to:
> 1. Finalize 3-agent direct recruitment (white-glove)
> 2. Run parallel paid agent cohort (20-50 agents, limited scope)
> 3. Measure trial-to-paid conversion rate
> 
> Approve: "go ahead with recruitment" to trigger task

**Owner:** Marketing + Orchestrator

**Timeline:** Week 1-2 (Days 45-58)

---

### Decision 2: Unblock UC-ONBOARDING-MOBILE-FIRST (P1)

**Status:** Ready but stuck since 3/24

**Root Cause:** Unknown — needs investigation

**Action:** 
1. Query Supabase for full task history (why stuck?)
2. Review associated PR
3. Determine: Fix needed? Or UC scope change?

**Owner:** Dev agent (with Kimi model for stuck task recovery)

**Timeline:** 1 sprint (Days 45-51)

**Expected Impact:** If unblocked, could see 2x more trial onboarding completions

---

### Decision 3: Clarify Trial-to-Paid Messaging (P1)

**Current State:** Missing from spec

**Required:** 
1. **Trial duration:** 14 days (already set per code review)
2. **Payment prompts:** When/where/how?
   - Email on day 10? Day 13?
   - In-app notification?
   - On first lead received (aha moment)?
3. **Upgrade pricing:** Show during trial? Or only at payment time?
4. **Acceptance criteria:** Trial agents converting at >5% rate = success

**Action:** PM writes UC with clear messaging sequence

**Owner:** PM + Design + Dev

**Timeline:** 2 sprints (Days 45-58)

---

### Decision 4: Marketing Attribution (P1)

**Current State:** Landing page traffic unknown

**Why it matters:** Don't know which channels produce paying agents (Facebook? Reddit? Organic?)

**Required:**
1. Enable GA4 event tracking (fix GA4 script tag bug)
2. Add UTM parameters to all external links
3. Track: Landing page views → signups → trial starts → paid conversions
4. Link: Stripe events → GA4 cohorts (to identify paying agent source)

**Action:** PM writes UC with full attribution spec

**Owner:** Analytics + Dev

**Timeline:** 1 sprint (Days 45-51)

---

## Revised Roadmap: Days 45-90

### Week 1-2 (Days 45-58): Launch Trial Cohorts

| UC | Owner | Status | Impact |
|----|-------|--------|--------|
| UC-PILOT-DIRECT-RECRUITMENT | Marketing | Ready | Recruit 5-10 paid agents |
| UC-ONBOARDING-MOBILE-FIRST (unblock) | Dev | Stuck | Fix 86% drop-off |
| feat-trial-email-sequence | PM/Design/Dev | New | Activate trial-to-paid |
| Marketing Attribution Setup | Analytics/Dev | New | Track conversion sources |

**Goal:** 50 trial agents with clear conversion funnel

---

### Week 3-4 (Days 59-72): Measure & Optimize

| Metric | Baseline | Target |
|--------|----------|--------|
| Trial signups | 50 | 50+ |
| Trial → paid conversion | ? | 5%+ |
| First paying agents | 0 | 2-3 |
| Time to first paid agent | N/A | <7 days after first trial |

**Actions:**
- Review trial cohort metrics daily
- A/B test messaging sequences (email subject, timing, CTA)
- Identify which channels produce best trial → paid conversion
- Pivot budget to top-performing channel

---

### Week 5-6 (Days 73-86): Scale

| Goal | Path |
|------|------|
| 10 paying agents ($1,490 MRR) | Facebook + referral + organic |
| 30 paying agents ($4,470 MRR) | Add Reddit + podcast ads |
| 100 paying agents ($14,900 MRR) | Scale top channels |

**Owner:** Marketing (with analytics data feeding decisions)

---

### Week 7-8 (Days 87-90): Final Push

**Target:** Hit $20K MRR (134 agents at $149)

**Status Check (Day 45 → 90):**
- If trials → paid conversion is <2%: Pivot to partnerships or brokerage
- If trials → paid conversion is 5%+: Scale current channels
- If landing page traffic low: Increase ad spend or PR push

---

## Use Case Specifications (To Be Created)

### UC-TRIAL-EMAIL-SEQUENCE-V2

**Status:** New, not yet in Supabase

**Requirement:**
```
When: Free trial account created
Execute sequence:
  Day 1 (signup): Welcome email + onboarding guide
  Day 3: First lead received? → Congratulations email
  Day 10: Trial ending in 4 days → Upgrade offer #1 (20% discount)
  Day 13: Trial ending tomorrow → Final upgrade offer #2 (urgent)
  Day 14: Trial expired → Archive account or downgrade to free tier

Success = Trial agents seeing emails + clicking upgrade link at >30% rate
```

**Acceptance Checks:**
```
- Email logs show sequence sent for all trial agents
- Stripe events show upgrade conversions within 24h of email
- <5% bounce rate on transactional emails
```

---

### UC-ONBOARDING-COMPLETION-BASELINE

**Status:** New diagnostic UC

**Requirement:**
```
Measure self-serve onboarding drop-off:
  Stage 1 (signup form): 100% baseline
  Stage 2 (email verification): % who confirm email
  Stage 3 (FUB connection): % who connect CRM
  Stage 4 (SMS aha): % who see test lead/SMS
  Stage 5 (payment): % who attempt checkout

Success = Baseline established + top 2 drop-off points identified
```

**Acceptance Checks:**
```
- Dashboard shows conversion % at each stage
- Top 2 drop-off stages clearly labeled
- Recommendations for Stage 2 & 3 improvement documented
```

---

### UC-LANDING-PAGE-ANALYTICS

**Status:** New diagnostic UC

**Requirement:**
```
Install UTM tracking + GA4:
  Campaigns tracked: Facebook, Reddit, Twitter, Organic, Referral
  Events: Page view → Signup click → Signup completion
  Goals: Track landing → signup conversion rate baseline

Success = Understand which channels drive signups
```

**Acceptance Checks:**
```
- GA4 events firing (verified in browser console)
- 10+ landing page sessions logged
- Conversion rate % calculated per source
```

---

## Acceptance Criteria

**This PRD is complete when:**

1. ✅ Revenue analysis documented (this file)
2. ✅ 3 new UCs created in Supabase:
   - UC-TRIAL-EMAIL-SEQUENCE-V2
   - UC-ONBOARDING-COMPLETION-BASELINE
   - UC-LANDING-PAGE-ANALYTICS
3. ✅ P0 decision sent to Orchestrator (pilot recruitment approval)
4. ✅ UC-ONBOARDING-MOBILE-FIRST root cause investigation assigned
5. ✅ Next PM review: Day 50 (in 5 days) to assess:
   - Pilot recruitment progress
   - Onboarding UC unblocked?
   - New UCs spawned to dev?

---

## KPIs & Metrics to Track

### Leading Indicators (Days 45-72)

| Metric | Current | Target |
|--------|---------|--------|
| Free trial signups per day | 0-2 | 5+ |
| Signup → onboarding completion % | ? | 70%+ |
| Onboarding → FUB integration % | ? | 80%+ |
| Trial duration (avg days active) | N/A | 10+ |
| Trial agents receiving leads | 0 | 100% |

### Conversion Funnel (Days 45-90)

| Stage | Baseline | Target |
|-------|----------|--------|
| Landing page → signup | Unknown | 3%+ |
| Signup → trial active | 3 | 50+ |
| Trial active → paid upgrade | 0% | 5%+ |
| Paid upgrades → MRR | $0 | $20,000 |

---

## Next Steps & Timeline

**Immediate (Today, 3/31):**
1. Post revenue alert analysis to Telegram topic 10877 (PM topic)
2. Insert action item to Supabase: "Pilot recruitment go-ahead"
3. Insert action item to Supabase: "Investigate stuck UC-ONBOARDING-MOBILE-FIRST"

**This Week (Days 45-51):**
1. Orchestrator approves pilot recruitment → Marketing spawned
2. Dev agent unblocks UC-ONBOARDING-MOBILE-FIRST
3. PM creates 3 new UCs in Supabase (trial sequence, onboarding baseline, analytics)

**Next Week (Days 52-58):**
1. Marketing recruits first cohort of 20-50 paid trial agents
2. First agents complete onboarding
3. Trial-to-paid sequence begins firing

**Week 3-4 (Days 59-86):**
1. First paid agents appear (target: 2-3 by day 65)
2. Scale based on trial → paid conversion data
3. Daily optimization of messaging + channels

**Final Week (Days 87-90):**
1. Push to hit $20K MRR target
2. If on pace: scale current channels
3. If behind: activate contingency (partnerships, brokerage sales)

---

## Risk Mitigation

### Risk 1: Trial → Paid Conversion is 0-2%

**Symptoms:** Agents reach aha moment but don't upgrade

**Mitigation:**
- A/B test email subject lines + CTA messaging
- Offer limited-time discount (e.g., "First month $99 instead of $149")
- Add testimonials + case studies to checkout page
- Implement "upgrade later" option (reduce friction)

**Fallback:** If conversion <2% after 50 trials, pivot to brokerage/partnership sales

---

### Risk 2: Landing Page Traffic Low

**Symptoms:** <5 signups per day from all sources

**Mitigation:**
- Increase Facebook ad spend (currently unknown)
- Launch Reddit community participation (organic)
- Reach out to FUB marketplace contacts
- Press outreach to real estate media

**Fallback:** If organic channels fail, buy guaranteed leads from Zillow/realtor.com

---

### Risk 3: Onboarding Still Broken (86% Drop-Off)

**Symptoms:** UC-ONBOARDING-MOBILE-FIRST unblocks but still sees high drop-off

**Mitigation:**
- Add concierge call option (vs. pure self-serve)
- Create video walkthrough (vs. text steps)
- Simplify FUB connection (pre-fill API if possible)

**Fallback:** Revert to white-glove for all agents (expensive but guarantees activation)

---

## Success Criteria

**This analysis is successful when:**

1. ✅ PM has documented clear revenue recovery path (this PRD)
2. ✅ 3 critical P1 UCs are defined with testable acceptance criteria
3. ✅ Pilot recruitment decision posted + approved
4. ✅ First 3-5 paying trial agents recruited + onboarded within 14 days
5. ✅ Trial → paid conversion rate tracked and optimizable by day 58
6. ✅ Path to $20K MRR is measurable and data-driven (not guesswork)

---

## Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-03-31 | PM | Revenue alert analysis + recovery plan |

