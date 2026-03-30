# PRD: Revenue Recovery — Critical MRR Gap Analysis & Recovery Plan

**Document ID:** PRD-REVENUE-RECOVERY-V2  
**Status:** Active  
**Priority:** P1 (Blocker)  
**Owner:** Product Manager  
**Created:** 2026-03-30  
**Target Date:** 2026-04-30 (day 75 of 90)  
**Revision:** 2.0

---

## Executive Summary

LeadFlow is at **Day 43 of 90** with **$0 MRR** and **$9,670 gap** from day-proportional progress ($9,670 / $20,000 = 48% behind schedule).

**Root Cause:** No revenue generated because pilot agents have not been onboarded with real FUB integrations, and the product lacks sufficient signal of value (aha moment not consistently triggered during onboarding).

**Recovery Strategy:** 
1. **Immediate**: Onboard pilot agents with real FUB integrations within 7 days
2. **Short-term**: Fix onboarding funnel — guarantee aha moment (SMS delivery in <30s) within 5 days
3. **Medium-term**: Launch 10-agent cohort with fixed onboarding within 14 days
4. **Monetize urgently**: Move pilot agents to Pro tier ($149/mo) to start revenue

**Expected Outcome:** $1,470+ MRR within 21 days (10 pilot agents × $149), then scale to $20K+ by week 12.

---

## 1. Conversion Funnel Analysis

### Current State (Day 43)

| Stage | Target | Current | Conversion | Status |
|-------|--------|---------|------------|--------|
| **Awareness** | N/A | ✅ Landing page live | N/A | ✅ Ready |
| **Landing → Signup** | 10%+ | ? | ? | ⚠️ Unknown |
| **Signup → Trial Onboarding** | 60%+ | ? | ? | ⚠️ Unknown |
| **Trial Onboarding → Aha (SMS sent)** | 80%+ | 0% | **0%** | 🔴 **CRITICAL** |
| **Aha → Paid Conversion** | 20%+ | 0% | **0%** | 🔴 **CRITICAL** |
| **Paid → Retention (Day 30)** | 80%+ | N/A | N/A | ⏳ Not applicable yet |

### Critical Gaps Identified

#### Gap #1: Aha Moment Broken (HIGHEST PRIORITY)
- **Definition**: Agent sees first AI-generated SMS response within <30 seconds of entering dashboard
- **Current State**: Onboarding wizard does NOT automatically trigger lead simulator or connect to FUB
- **Impact**: Agents complete onboarding without proof of product value → zero activation → zero conversion
- **Fix Required**: 
  - Auto-trigger lead simulator in onboarding wizard (show 3 sample leads with AI responses)
  - OR auto-connect FUB if credentials available during signup
  - Make SMS delivery visible in dashboard within 30 seconds of onboarding complete

#### Gap #2: No Pilot Agent Revenue (CRITICAL)
- **Definition**: Pilot agents should move from free tier to Pro ($149/mo) to start generating MRR
- **Current State**: 3 pilot agents created but still in "free trial" mode, no billing configured
- **Impact**: Zero revenue despite product being deployable
- **Fix Required**:
  - Manually onboard 3 pilot agents with real FUB credentials within 7 days
  - Move each to Pro tier (billing configured) within 14 days
  - Expected: $447/mo from 3 agents alone

#### Gap #3: Onboarding Flow Lacks Conversion Signals
- **Definition**: Agents should feel compelling value during onboarding, not after
- **Current State**: Signup → login → settings → integrations → try to send SMS (no sample leads)
- **Impact**: 60%+ drop-off because agents don't know what the product does until they find a real lead
- **Fix Required**:
  - Add "Try AI response" button in onboarding with pre-loaded sample lead
  - Show SMS being sent and agent response in real-time
  - Measure: 80%+ should reach this "aha" step

#### Gap #4: Landing Page → Signup Conversion Unknown
- **Definition**: We don't know if landing page is converting visitors to signups
- **Current State**: No UTM tracking, no attribution, no cohort analysis
- **Impact**: Can't diagnose if marketing is working or product messaging is weak
- **Fix Required**:
  - Add Google Analytics 4 event tracking (signup, onboarding complete, first SMS sent, upgrade)
  - Add UTM parameter parsing from landing page CTAs
  - Measure daily: landing page visits → signups → aha moment → paid

---

## 2. Revenue Bottleneck Hierarchy

### Tier 1: MUST FIX (Blocks all revenue)
1. **Aha moment not triggered in onboarding** → Agents don't see product value → zero activation
2. **No paid tier assignment for pilot agents** → No revenue despite ready product
3. **Onboarding wizard doesn't auto-advance past integrations step** → Agents stuck, confused

### Tier 2: HIGH IMPACT (Converts 30-40% more trial → paid)
1. **No conversion signal dashboard** (calls to action for upgrade in dashboard)
2. **Trial limits not visible** (agents don't know they're running out of SMS)
3. **Billing portal not intuitive** (upgrade path is confusing)

### Tier 3: NICE TO HAVE (Improves NPS, not revenue)
1. **Lead source attribution** (what type of leads convert best)
2. **Team collaboration features** (secondary use case)
3. **Advanced analytics** (nice to have for Pro tier)

---

## 3. Recommended Recovery Actions (2-3 Week Sprint)

### Action 1: Onboarding Aha Moment Fix (Days 1-5)
**Owner:** Dev  
**Scope:** Self-serve + concierge support  
**Acceptance Criteria:**
- [ ] Onboarding wizard auto-triggers lead simulator on step 2 (after FUB connection)
- [ ] Agent sees 3 pre-loaded sample leads with AI-generated SMS responses
- [ ] Agent can click "Send sample SMS" and see it delivered in <5 seconds
- [ ] Aha step is marked complete in database (onboarding_telemetry table)
- [ ] 80%+ of signups should reach aha step within onboarding flow

**Expected Impact:** Turn 0% aha conversion to 80%+ (assume 5 more signups this week, 4 convert to trial)

---

### Action 2: Pilot Agent Real-Data Onboarding (Days 1-7)
**Owner:** Product Manager + Orchestrator  
**Scope:** Manual onboarding of 3 free pilot agents with real FUB integrations  
**Acceptance Criteria:**
- [ ] 3 pilot agents have FUB API keys configured (from Stojan)
- [ ] Webhook receives first real lead from FUB within 7 days
- [ ] Dashboard shows lead + AI response + SMS sent status
- [ ] Each agent moves to Pro tier ($149/mo) within 14 days (manual or self-serve)

**Expected Impact:** $447/mo baseline MRR from 3 pilot agents (day 21)

---

### Action 3: Revenue Conversion Dashboard (Days 5-14)
**Owner:** Dev + Marketing Analytics  
**Scope:** Add conversion signals and upgrade CTAs to dashboard  
**Acceptance Criteria:**
- [ ] Dashboard shows trial SMS limit (e.g., "50 SMS remaining in free trial")
- [ ] "Upgrade to Pro" button visible in 3 locations: dashboard header, after SMS limit reached, settings
- [ ] Pricing tiers shown with clear comparison table
- [ ] Stripe checkout integrated in dashboard (no redirect)
- [ ] Track upgrade clicks and completed checkouts in analytics

**Expected Impact:** Convert 20%+ of trial users who reach aha moment

---

## 4. Reprioritized Use Case List (Revenue-Ordered)

### P0: MUST DO (Revenue blockers)
| UC ID | Name | Phase | Days | Est MRR Impact |
|-------|------|-------|------|----------------|
| fix-onboarding-aha-simulator | Fix Aha Moment Lead Simulator in Onboarding | Phase 1 | 3-5 | +$300/mo (5 agents) |
| feat-pilot-real-fub-integration | Pilot Agents: Real FUB Data Integration | Phase 1 | 3-7 | +$447/mo (3 agents × $149) |
| feat-dashboard-upgrade-cta | Dashboard: Add Upgrade CTA + Trial Limits | Phase 1 | 2-3 | +$200/mo (2-3 agents) |

### P1: URGENT (Improves conversion 30-40%)
| UC ID | Name | Phase | Days | Est MRR Impact |
|-------|------|-------|------|----------------|
| feat-analytics-google-ga4 | Analytics: GA4 Event Tracking + UTM Parameters | Phase 2 | 3-5 | +$500/mo (visibility → fixes) |
| fix-trial-limit-enforcement | Trial Limit Enforcement + Warning Messaging | Phase 1 | 2-3 | +$200/mo |
| feat-self-serve-upgrade-checkout | Self-Serve Billing: Frictionless Checkout | Phase 1 | 5-7 | +$300/mo |

### P2: MEDIUM (Nice to have, can follow after P0/P1)
| UC ID | Name | Phase | Days | Est MRR Impact |
|-------|------|-------|------|----------------|
| feat-team-lead-routing | Team: Lead Distribution & Routing | Phase 3 | 10-15 | +$800/mo (upsell to team tier) |
| feat-advanced-analytics | Advanced Analytics: Lead Source Attribution | Phase 3 | 7-10 | +$200/mo (Pro→Team upsell) |

### P3: DEPRIORITIZE (Until revenue is flowing)
| UC ID | Name | Reason |
|-------|------|--------|
| feat-vapi-voice-calls | Voice call integration | Secondary product, not critical path |
| feat-ai-refinement-agent-edit | Agent-side SMS editing | Nice to have, not revenue-blocking |
| feat-team-collaboration | Team collaboration features | Requires Team tier adoption first |

---

## 5. Financial Model: Path to $20K MRR

### Week 1-2 (Days 44-58) — Pilot Phase Launch
- Actions: Aha fix (day 5) + Pilot agents real FUB (day 7)
- Expected signups: 5-10 new agents
- Paid conversions: 3 pilot agents → Pro ($149 × 3 = $447/mo)
- Additional: 2-3 new agents convert to Pro ($300-450/mo)
- **Week 2 MRR: $750-900**

### Week 3 (Days 58-75) — Scaling Pilot Cohort
- Continued signups: 15-20 new agents
- Paid conversions: 30-40% of active trial users (5-8 agents at $149/mo)
- Projected: $750 + $750-1200 = **$1,500-1,950/mo**

### Week 4 (Days 75-90) — Production Scale
- Signups: 30-40 new agents
- Paid conversions: 30-40% of trial cohort (10-15 agents)
- Additional Team tier adoption: 2-3 teams at $399/mo
- Projected: $1,500 + $1,500-2,250 + $800-1,200 = **$3,800-5,150/mo**

### Shortfall Analysis
- **Target:** $20,000 MRR by day 90
- **This plan yields:** $4,000-5,000 by day 90 (25% of target)
- **Gap:** This 3-action plan is insufficient alone

### Additional Levers Required (Post-Week 1)
1. **Paid marketing**: $1,000/week spend to add 20-30 signups/week (ROI breakeven at week 4-5)
2. **Pricing optimization**: Test $99 Starter tier to increase trial-to-paid conversion from 30% to 50%
3. **Team tier GTM**: Target broker owners (2-3 agents minimum) → $399/mo = $4-6K MRR opportunity
4. **Referral program**: $100 per successful agent referral (incentivize viral growth from early users)

### Revised Path (with marketing + pricing tweaks)
- Week 2: $1,000-1,500 MRR (pilot + organic)
- Week 3: $3,000-5,000 MRR (paid marketing + product fixes)
- Week 4: $8,000-12,000 MRR (scale + Team tier)
- **Target hit likelihood: 40-50% by day 90**

---

## 6. Success Metrics & Milestones

### Immediate (Days 44-50)
- [ ] Aha moment simulator deployed and tested (acceptance checks: 80%+ trial users reach aha step)
- [ ] 3 pilot agents configured with real FUB credentials
- [ ] First real lead received and processed (verification: dashboard shows lead + AI response + SMS sent)

### Short-term (Days 50-65)
- [ ] 3 pilot agents move to Pro tier ($149/mo) — **$447/mo MRR baseline**
- [ ] 5-10 additional signups from organic + referral
- [ ] 30%+ conversion rate from trial to paid (**$300-450/mo from new agents**)
- [ ] Dashboard upgrade CTAs deployed and tested (**track 50%+ click-through on CTA buttons**)
- [ ] Analytics tracking live (GA4 events firing for signup, aha, upgrade, paid)

### Medium-term (Days 65-75)
- [ ] 15-20 new agents in active trial phase
- [ ] 5-8 trial agents convert to paid (**$750-1,200/mo**)
- [ ] At least 1 team tier signup (2-5 agents, $399/mo)
- [ ] Marketing spend approved and live (**$1,000/week on Facebook + Reddit**)
- [ ] Pricing test results analyzed (A/B test $99 vs $49 Starter tier)

### Long-term (Days 75-90)
- [ ] $3,800-5,000 MRR from organic + pilot + early marketing
- [ ] 30-40 agents active in trial
- [ ] 2-3 Team tier accounts active (**$800-1,200/mo**)
- [ ] Paid marketing delivering 3:1 ROI (customers are $300+ LTV, CAC is $80-100)

---

## 7. Implementation Roadmap (Next 7 Days)

### Day 1 (Mon 3/31)
- PM: Finalize aha moment UX specs + acceptance criteria
- Dev: Estimate lead simulator onboarding integration (should be 1-2 days)
- Orchestrator: Schedule pilot agent real-FUB integration calls with Stojan

### Day 2-3 (Tue-Wed 4/1-2)
- Dev: Build lead simulator step in onboarding (AC: sample leads visible + SMS preview)
- QC: Test aha moment flow end-to-end
- PM: Prepare analytics GTM plan (GA4 + UTM setup)

### Day 4-5 (Thu-Fri 4/3-4)
- Dev: Deploy aha moment fix to production
- Orchestrator: First pilot agent real-FUB integration (email FUB credentials, test webhook)
- QC: Smoke test: signup → aha moment → end-to-end flow

### Day 6-7 (Sat-Sun 4/5-6)
- PM: Analyze aha moment telemetry (% users reaching aha step)
- Dev: Start dashboard upgrade CTA feature
- Orchestrator: Plan paid marketing cohort (budget, channels, messaging)

---

## 8. Risk Factors & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Aha moment takes >7 days to fix** | Medium | High | Start with "try sample SMS" button only, expand later |
| **Pilot agents' FUB credentials invalid or integration fails** | Medium | High | Stojan provides credentials + Orchestrator validates before onboarding |
| **Trial-to-paid conversion still <10% after aha fix** | Medium | High | Implement $99 Starter tier + free 30 SMS bonus to reduce friction |
| **Paid marketing doesn't convert** | Medium | Medium | Run $200 pilot on Facebook + Reddit first, analyze before scaling to $1K/week |
| **Competitor launches similar product** | Low | High | Speed to revenue is our only moat right now — act urgently |

---

## 9. Definition of Done (Acceptance Criteria)

**This PRD is complete when:**
1. ✅ Aha moment lead simulator deployed to production (80%+ of signups reach this step)
2. ✅ 3 pilot agents have real FUB integrations + have received 1+ real leads
3. ✅ 3 pilot agents billing configured, Pro tier active, $447/mo MRR flowing
4. ✅ Dashboard shows trial SMS limit + upgrade CTA in 3+ locations
5. ✅ GA4 event tracking live for signup, aha, upgrade, paid conversion
6. ✅ At least 1 new agent converted to Pro from self-serve flow ($149/mo)
7. ✅ Paid marketing strategy approved and launch plan created

**Completion target:** Day 65 (May 9, 2026) — 25 days from now

---

## 10. Related Documents
- `PMF.md` — pricing strategy, ICP, GTM plan
- `USE_CASES.md` — all product use cases (auto-generated from Supabase)
- `E2E_MAPPINGS.md` — detailed test specs for each UC
- `DASHBOARD.md` — real-time task queue + MRR tracking

---

*This PRD will be reviewed weekly. Update as recovery actions are completed and new data becomes available.*
