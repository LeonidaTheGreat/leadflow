# PRD: Revenue Recovery — Bottleneck Analysis & Reprioritization

**Document ID:** PRD-REVENUE-RECOVERY-001  
**Status:** Active  
**Priority:** P0 (Blocker)  
**Owner:** Product Manager  
**Last Updated:** 2026-03-30  
**Timeline:** Days 43-47 of 90-day pilot (Critical path)

---

## Executive Summary

LeadFlow is **$9,670 behind** its $20K MRR target for day 47. Current MRR: **$0**.

Root cause analysis reveals a **multi-stage conversion funnel collapse**:
- 205 total signups, but **91% are test accounts** (only 19 real agents)
- Email verification gap: **39.5%** of real signups don't verify email
- Onboarding completion gap: **89.5%** of verified agents drop out before step 1
- **Zero conversion to paid** — not a single paying customer

**Critical Decision:** The product is not currently testable in production because we have no paying customers to validate the core hypothesis: *"Real estate agents will pay $49-149/month for <30s lead response."*

**Recommended Actions (Priority Order):**
1. **IMMEDIATE (Next 24h):** Fix email verification funnel — 40% of real signups never see onboarding
2. **URGENT (Next 3 days):** Implement frictionless onboarding for mobile (89.5% drop-off detected)
3. **HIGH (Next 7 days):** Recruit 5-10 real pilot agents via direct outreach — test paid conversion with living, breathing humans
4. **CONCURRENT:** Design and deploy landing page redesign for organic acquisition

---

## 1. Current Funnel Analysis

### 1.1 Overall Conversion Metrics (90-day window)

| Stage | Count | Conversion Rate | Change |
|-------|-------|-----------------|--------|
| **Signups** | 205 | 100% | N/A |
| **Real Agents** (non-test) | 19 | 9.3% | ⚠️ Critical |
| **Email Verified** (of real) | 14 | 73.7% | ⚠️ Missing 26.3% |
| **Onboarding Complete** | 2 | 1.0% (of real) | ⚠️ Critical |
| **Paying Customers** | 0 | 0.0% | 🚨 Blocker |
| **Active Subscriptions** | 0 | 0.0% | 🚨 Blocker |

### 1.2 Test Account Pollution

**Problem:** E2E smoke tests + QC tests are flooding signup analytics.

| Account Type | Count | % of Total | Impact |
|--------------|-------|-----------|--------|
| Real agents | 19 | 9.3% | **Signal lost** |
| Test: e2e-flow | 62 | 30.2% | Noise |
| Test: qc-* | 12 | 5.9% | Noise |
| Test: invite-* | 5 | 2.4% | Noise |
| Test: other (test@, smoke@, etc) | 107 | 52.2% | Noise |
| **Total noise** | **186** | **90.7%** | **⚠️ Hides real signal** |

**Impact:** Real conversion metrics are obscured by 9:1 noise ratio. Any funnel analysis or A/B test is unreliable until we:
- Isolate real agent signups from test accounts
- Stop test accounts from polluting conversion tracking
- Re-baseline all KPIs using real-agent-only cohorts

### 1.3 Email Verification Gap

**26.3% of real agents never verify email.** This is a **hard blocker** for onboarding.

```
Verified emails from real agents: 14/19 = 73.7%
Unverified: 5 agents — never entered onboarding
```

**Root Causes to Investigate:**
- Email delivery failure (Resend API down, rate-limited, or credentials wrong)?
- Email link broken or expired?
- Spam folder classification?
- UX: users don't understand they need to verify?

**Impact:** Lost 5 real agents (~26%) who could have paid $49-149/mo = **$120-750/month revenue opportunity lost**.

### 1.4 Onboarding Completion Gap

**89.5% drop-off between email verified and onboarding completion.**

```
Real agents who verified: 14
Real agents who completed onboarding: 2
Drop-off rate: 85.7% (12 of 14 agents)
```

Of the 2 who completed: both are internal test accounts (`madzunkov@gmail.com`, `madzunkov@hotmail.com`).

**Zero organic agents completed onboarding.**

**Root Causes to Investigate:**
- Onboarding flow broken on mobile (most agents access on phone)?
- FUB connection step too complex?
- Required fields confusing (business info, lead sources)?
- Timeout/session expiry issues?
- Missing "aha moment" — agents don't understand the product until halfway through?
- API integration failures (FUB, Cal.com, Stripe)?

**Impact:** Lost 14 agents × $50-150/mo average = **$700-2,100/month opportunity lost**.

### 1.5 Zero Paying Customers

No agents have completed the conversion to paid (Stripe checkout).

**This means:**
- The core revenue model is untested
- No product-market fit signal yet
- No validation that agents will actually pay
- All UCs related to "paid usage" are blocked until at least 1 agent converts

---

## 2. Funnel Bottleneck Ranking

| Rank | Bottleneck | Agents Lost | Revenue Lost | Fix Complexity | Impact (P0/P1/P2) |
|------|-----------|-------------|--------------|-----------------|-------------------|
| 🔴 **#1** | **Organic signups** (only 19 real in 90 days) | 186/205 | **All of it** | Low | **P0** |
| 🔴 **#2** | **Email verification** (26% unverified) | ~5 agents | $120-750/mo | Medium | **P0** |
| 🔴 **#3** | **Onboarding completion** (86% drop-off) | ~12 agents | $700-2,100/mo | High | **P0** |
| 🟠 **#4** | **Paid conversion** (0 customers) | ~2 agents | $100-300/mo | Medium | **P1** |

---

## 3. Root Cause: The Real Problem

We don't know if agents will pay because **we haven't onboarded any real agents to the point where they can try the product.**

The funnel is broken at **Step 2 (Email)** and **Step 3 (Onboarding)**, not at Step 5 (Pricing).

**If we fix #2 and #3, we'll have real data on #4 and #5.**

---

## 4. Recommended Action Plan

### Phase 1: Emergency Stabilization (Days 43-45)

**Goal:** Fix the email + onboarding funnel to unblock real testing.

#### UC-4.1: Isolate Real Agents from Test Accounts
- **What:** Create a flag in `real_estate_agents.account_type` (enum: 'real' | 'test')
- **Why:** Stop pollution of analytics. Real metrics are untrustworthy.
- **Acceptance:** All real-agent-only reports use account_type filter; test accounts excluded from retention/churn calculations
- **Timeline:** 24h (Dev)
- **Priority:** P0 (Blocker for all other analysis)

#### UC-4.2: Fix Email Delivery Pipeline
- **What:** Diagnose and fix email verification delivery (Resend integration)
- **Why:** 26% of real agents never get the verification email
- **Acceptance:** All new signups receive verification email within 30s; verification link works 100%; agents land on onboarding after click
- **Timeline:** 48h (Dev)
- **Priority:** P0

#### UC-4.3: Simplify Onboarding Flow (Mobile-First)
- **What:** Redesign onboarding UX for mobile (currently 100% drop-off on non-Madzunkov accounts)
- **Why:** Most agents use phones; current flow likely has UX/API issues on mobile
- **Acceptance:** 
  - Mobile UX audit passed by Design
  - API calls tested on 2G/4G network conditions
  - Form validation clear (no silent failures)
  - FUB connection shows real-time status (not spinning indefinitely)
  - Time to "Aha Moment" <5 minutes
- **Timeline:** 3 days (Design + Dev)
- **Priority:** P0

#### UC-4.4: Implement Aha Moment Demo (In-App)
- **What:** Show agents a live demo of AI responding to a sample lead (they don't need to connect FUB yet)
- **Why:** Onboarding completion drops to 0% when agents must connect FUB first — too much friction
- **Acceptance:** 
  - Agents see simulated lead response within 30s of account creation
  - Demo doesn't require FUB connection
  - Option to "try it with your leads" (optional FUB step)
- **Timeline:** 2 days (Dev)
- **Priority:** P1 (high)

### Phase 2: Direct Pilot Recruitment (Days 45-47)

**Goal:** Get 5-10 real, motivated agents on paid trial → convert to paid.

#### UC-4.5: Activate Direct Outreach Pilot
- **What:** Stojan recruits 5-10 target agents from personal network + real estate Facebook groups
- **Why:** Organic funnel is too slow (19 in 90 days). Pilot needs validation agents NOW.
- **Who:** Agents must match ICP:
  - 12-24 deals/year (solo agents)
  - Currently use Follow Up Boss
  - Pain: losing leads to slow response
- **Acceptance:** 
  - 5 agents successfully onboarded (email → aha moment)
  - 3 agents converting to paid (started $49 trial)
  - Testimonial/feedback from at least 1 agent
- **Timeline:** 3 days (Marketing + PM)
- **Priority:** P0 (revenue blocker)

#### UC-4.6: Personalized Onboarding for Pilot Agents
- **What:** PM + Dev provide white-glove onboarding for first 5 pilot agents (calls, Slack support, etc.)
- **Why:** Remove friction. Validate that product works with real-world lead flows.
- **Acceptance:** 
  - All 5 agents complete onboarding
  - At least 1 agent sends a real lead through system
  - AI responds correctly (< 30s, correct qualification)
- **Timeline:** 3 days (PM + Dev support)
- **Priority:** P0

### Phase 3: Organic Growth Activation (Days 47+)

**Goal:** Fix landing page + marketing to turn organic signups into conversions.

#### UC-4.7: Landing Page Redesign (Conversion-Optimized)
- **What:** Replace marketing landing page with high-converting variant
- **Why:** Current page has no strong CTA, doesn't lead to signup flow
- **Acceptance:** 
  - Design passes PMF principles (ICP-focused, benefit-driven copy)
  - A/B test active (variant vs current)
  - Minimum 40% CTR to signup page
- **Timeline:** 5 days (Design + Marketing + Dev)
- **Priority:** P1

---

## 5. Use Cases to Create/Reprioritize

### NEW Use Cases (to be inserted into `use_cases` table)

| UC ID | Title | Phase | Priority | Owner | Est. Effort |
|-------|-------|-------|----------|-------|-------------|
| UC-ACCOUNT-TYPE | Isolate Real Agents from Test Accounts | Stabilization | P0 | Dev | 4h |
| UC-EMAIL-FIX | Fix Email Delivery Pipeline | Stabilization | P0 | Dev | 8h |
| UC-ONBOARDING-MOBILE | Mobile-First Onboarding Redesign | Stabilization | P0 | Design + Dev | 16h |
| UC-AHA-DEMO | Implement Aha Moment Demo | Stabilization | P1 | Dev | 8h |
| UC-PILOT-DIRECT | Direct Outreach Pilot Recruitment | Pilot | P0 | Marketing + PM | 12h |
| UC-PILOT-WG | White-Glove Pilot Onboarding | Pilot | P0 | PM + Dev | 8h |
| UC-LANDING-V2 | Landing Page Redesign (V2) | Growth | P1 | Design + Marketing + Dev | 20h |

### EXISTING Use Cases to Reprioritize

The following UCs should move DOWN in priority (they're pre-revenue polish):

- `feat-admin-nps-page` → P2 (NPS matters after 5+ paying agents)
- `feat-advanced-lead-filtering` → P2 (advanced features after PMF)
- `feat-sms-reply-threading` → P2 (feature depth after PMF)
- `feat-white-label-admin` → P2 (brokerage tier is Phase 3)

---

## 6. Key Metrics to Track (Next 47 Days)

### Leading Indicators (Daily)

| Metric | Target | Current | Owner |
|--------|--------|---------|-------|
| Real agent signups/day | 5+ | 0.2 | Marketing |
| Email verification rate | >85% | 73.7% | Dev |
| Onboarding completion rate | >50% | 1.0% | Design + Dev |
| Aha moment trigger rate | >70% | 0% | Dev |
| Days to first real conversion | <7 | N/A | PM |

### Success Criteria (Day 47)

- **At least 5 real agents onboarded** (email → aha moment)
- **At least 1 paying customer** (any tier)
- **Email verification rate >90%**
- **Onboarding completion rate >40%**
- **MRR >$49** (proof of concept)

---

## 7. Go/No-Go Decision Point

### If we hit success criteria by Day 47:
→ Scale organic acquisition: invest in paid marketing, SEO, partnerships

### If we miss criteria by Day 47:
→ Pivot decision (see PMF.md Pivot Triggers):
- Issue is pricing (add $29 tier, test payment plans)
- Issue is product (demo didn't resonate, not solving real pain)
- Issue is market (wrong ICP, wrong channel)

---

## 8. Specification

### Current Product State (Testable?)
- ❌ **NOT testable in production** — zero paying customers, no real workflows validated
- ✅ Testable on staging/local — all technical features built
- ⚠️ Risk: May discover critical product issues once real agents try it

### What Needs to Ship by Day 45
1. Account type isolation (internal)
2. Email delivery working 100% (user-facing)
3. Mobile-first onboarding (user-facing)
4. Aha moment demo (user-facing)

### What Needs to Ship by Day 47
5. Landing page V2 (marketing)
6. First 5 direct pilot agents recruited (recruiting)

---

## Acceptance Criteria

This PRD is complete when:

- [ ] All 7 new UCs created in Supabase `use_cases` table
- [ ] E2E test specs defined for UCs 1-4 (critical path)
- [ ] Reprioritization reflected in `use_cases.priority` updates
- [ ] Dev team has clear ticket list for stabilization phase
- [ ] PM has outreach list for 5-10 target pilot agents
- [ ] Design team has mobile audit checklist ready

---

## References

- `PMF.md` — ICP, pricing, GTM strategy
- `DASHBOARD.md` — Live KPI tracking
- `CLAUDE.md` — Tech stack, deployment
- Supabase `use_cases`, `prds`, `e2e_test_specs` tables

---

**Document Status:** Ready for Orchestrator Handoff  
**Next Step:** PM uploads use case definitions → Orchestrator spawns Dev/Design tasks → Begin stabilization phase
