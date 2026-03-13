# PRD: Revenue Recovery Plan — Critical MRR Gap Closure

**Document ID:** PRD-REVENUE-RECOVERY-001  
**Version:** 1.0  
**Date:** March 6, 2026  
**Status:** Active — Critical Priority  
**Days Remaining:** 44 of 60

---

## 1. Situation Analysis

### Current State (Day ~16 of 60)
| Metric | Target | Current | Gap |
|--------|--------|---------|-----|
| **MRR** | $20,000 | $0 | -$20,000 |
| **Paying Agents** | 134 Pro tier | 0 | -134 |
| **Daily Revenue Trajectory** | $5085 by Day 16 | $0 | -$5085 |
| **Pilot Agents** | 3 active | 0 onboarded | -3 |

### Root Cause Analysis

#### 1.1 Conversion Funnel Bottlenecks
| Stage | Status | Blocker |
|-------|--------|---------|
| **Landing Page** | ❌ Not converting | UC-LANDING-MARKETING-001 not_started |
| **Signup Flow** | ⚠️ Broken | fix-onboarding-500-error stuck |
| **SMS Delivery** | ⚠️ Mock only | implement-twilio-sms-integration stuck |
| **Payment Processing** | ✅ Working | UC-9, UC-10, UC-11 complete |
| **Dashboard** | ✅ Functional | Core features complete |

#### 1.2 Use Case Status — Revenue Impact
| Priority | Use Case | Status | Revenue Impact |
|----------|----------|--------|----------------|
| P0 | UC-LANDING-MARKETING-001 (Marketing Landing) | not_started | **CRITICAL** — Blocks all inbound |
| P0 | fix-onboarding-500-error (Onboarding Fix) | stuck | **CRITICAL** — Blocks conversion |
| P0 | implement-twilio-sms-integration (Twilio SMS) | stuck | **HIGH** — Blocks value delivery |
| P1 | UC-9 (Customer Sign-Up) | complete | ✅ Working |
| P2 | UC-10 (Billing Portal) | complete | ✅ Working |
| P2 | UC-11 (Subscription Lifecycle) | complete | ✅ Working |

---

## 2. Revenue Recovery Strategy

### 2.1 Immediate Actions (Week 1-2) — Close the Gap

#### Action 1: Unblock Onboarding (CRITICAL)
**Problem:** 500 error prevents any new signups  
**Solution:** Fix agents table schema collision  
**Owner:** Dev  
**ETA:** 2 days  
**Revenue Impact:** Unlocks entire funnel

**Acceptance Criteria:**
- [ ] Root cause documented (agents table collision)
- [ ] Product agents table renamed to `customers`
- [ ] All foreign keys updated (leads, bookings, events, subscriptions)
- [ ] Onboarding endpoint returns 200
- [ ] End-to-end signup → login → dashboard works

#### Action 2: Deploy Converting Landing Page (CRITICAL)
**Problem:** No marketing page to drive traffic  
**Solution:** Implement UC-LANDING-MARKETING-001  
**Owner:** Marketing → Design → Dev  
**ETA:** 5 days  
**Revenue Impact:** Enables all marketing channels

**Acceptance Criteria:**
- [ ] Hero with compelling headline and CTA
- [ ] Stats bar (<30s, 78%, 35%, 24/7)
- [ ] Problem agitation section
- [ ] Features grid
- [ ] Pricing section (3 tiers)
- [ ] Signup form with validation
- [ ] Responsive design
- [ ] Analytics tracking

#### Action 3: Activate Real SMS (HIGH)
**Problem:** Mock SMS = no real value delivery  
**Solution:** Complete Twilio integration  
**Owner:** Dev  
**ETA:** 3 days  
**Revenue Impact:** Enables pilot testimonials

**Acceptance Criteria:**
- [ ] Twilio SDK integrated
- [ ] Real SMS sends to leads
- [ ] Delivery status tracking
- [ ] Error handling and retries
- [ ] A2P 10DLC compliance noted

### 2.2 Short-Term Actions (Week 3-4) — Drive Traffic

#### Action 4: Recruit 3 Pilot Agents (HIGH)
**Problem:** No testimonials or case studies  
**Solution:** Manual outreach to ICP agents  
**Owner:** PM + Marketing  
**ETA:** 2 weeks  
**Revenue Impact:** Social proof for scaling

**Tactics:**
- [ ] Identify 20 target agents (Facebook groups, LinkedIn)
- [ ] Personalized outreach with value prop
- [ ] Offer 30-day free trial (not 14)
- [ ] Concierge onboarding (manual setup help)
- [ ] Weekly check-ins during pilot

#### Action 5: Launch Content Marketing (MEDIUM)
**Problem:** Zero organic traffic  
**Solution:** Publish high-value content  
**Owner:** Marketing  
**ETA:** Ongoing  
**Revenue Impact:** Long-term CAC reduction

**Content Plan:**
- [ ] "5 Ways to Respond to Leads in Under 30 Seconds" (blog)
- [ ] "Why 35% of Real Estate Leads Never Get a Response" (blog)
- [ ] Reddit AMA in r/realtors
- [ ] Facebook group value posts

### 2.3 Medium-Term Actions (Week 5-8) — Scale

#### Action 6: Paid Acquisition Test (MEDIUM)
**Problem:** No paid traffic  
**Solution:** Facebook/Instagram ads  
**Owner:** Marketing  
**ETA:** Week 5-6  
**Revenue Impact:** Scalable acquisition

**Test Budget:** $500
- Target: Real estate agents, 25-55, US/Canada
- Creative: Problem/solution video
- CTA: Free 14-day trial
- Success: <$100 CAC

#### Action 7: Referral Program (MEDIUM)
**Problem:** No viral growth  
**Solution:** $100/agent referral bonus  
**Owner:** PM  
**ETA:** Week 6  
**Revenue Impact:** Lower CAC

---

## 3. Reprioritized Use Cases

### 3.1 Priority 0 — Revenue Critical (Do First)
| ID | Name | Current Status | New Priority | Action |
|----|------|----------------|--------------|--------|
| fix-onboarding-500-error | Fix Onboarding 500 Error | stuck | **P0-CRITICAL** | Dev unblocks immediately |
| UC-LANDING-MARKETING-001 | Marketing Landing Page | not_started | **P0-CRITICAL** | Marketing + Design + Dev |
| implement-twilio-sms-integration | Real Twilio SMS | stuck | **P0-HIGH** | Dev completes |

### 3.2 Priority 1 — Revenue Enabling (Do Next)
| ID | Name | Current Status | New Priority | Action |
|----|------|----------------|--------------|--------|
| UC-9 | Customer Sign-Up | complete | P1 | ✅ Maintain |
| UC-10 | Billing Portal | complete | P1 | ✅ Maintain |
| UC-11 | Subscription Lifecycle | complete | P1 | ✅ Maintain |
| gtm-pilot-recruitment | Pilot Agent Recruitment | not_started | **P1** | PM + Marketing |

### 3.3 Priority 2 — Revenue Accelerating (Do After)
| ID | Name | Current Status | New Priority | Action |
|----|------|----------------|--------------|--------|
| gtm-content-marketing | Content Marketing | complete | P2 | Continue |
| gtm-paid-ads | Paid Acquisition Test | not_started | **P2** | Marketing |
| gtm-referral-program | Referral Program | not_started | **P2** | PM |
| UC-12 | MRR Reporting | complete | P2 | ✅ Maintain |

### 3.4 Deprioritized — Post-Revenue Target
| ID | Name | Reason |
|----|------|--------|
| UC-8 | Follow-up Sequences | Nice-to-have, core SMS works |
| UC-6 | Cal.com Booking | Manual booking sufficient for pilot |
| UC-7 | Dashboard Manual SMS | Auto-response is core value |

---

## 4. Success Metrics & Tracking

### 4.1 Weekly KPIs
| Metric | Week 1 | Week 2 | Week 3 | Week 4 | Target (Week 8) |
|--------|--------|--------|--------|--------|-----------------|
| Landing Page Visits | 0 | 100 | 300 | 500 | 2000 |
| Signup Starts | 0 | 10 | 30 | 50 | 200 |
| Completed Onboardings | 0 | 2 | 5 | 10 | 50 |
| Paying Agents | 0 | 0 | 1 | 3 | 20 |
| MRR | $0 | $0 | $149 | $447 | $2,980 |

### 4.2 Daily Tracking
- Signup funnel conversion rate
- Onboarding completion rate
- SMS delivery success rate
- Support tickets (quality signal)

---

## 5. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Onboarding fix takes >3 days | Medium | Critical | Dev pair programming, escalate to Stojan |
| Landing page doesn't convert | Medium | High | A/B test headline, add social proof |
| Pilot agents churn | Medium | High | Concierge onboarding, weekly check-ins |
| A2P 10DLC delays SMS | High | Medium | Document workaround, use personal numbers |
| Competitor launches similar | Low | Medium | Speed to market, focus on FUB integration |

---

## 6. Go/No-Go Decision Points

### Day 20 (4 days from now)
**Criteria:** Onboarding 500 error fixed  
**If No-Go:** Escalate to Stojan for additional dev resources

### Day 25 (9 days from now)
**Criteria:** Landing page live + 100 visits  
**If No-Go:** Pivot to manual sales outreach

### Day 35 (19 days from now)
**Criteria:** 3 paying agents or clear path to 20 by Day 60  
**If No-Go:** Consider pricing/packaging changes

---

## 7. E2E Test Specs

### E2E-REV-001: End-to-End Revenue Funnel
**Given** a prospect visits the landing page  
**When** they complete signup and onboarding  
**Then** they can receive and respond to leads via SMS  
**And** they can upgrade to a paid plan  
**And** MRR increases by their plan amount

### E2E-REV-002: Pilot Agent Onboarding
**Given** a pilot agent is recruited  
**When** they complete the onboarding wizard  
**Then** their account is created successfully  
**And** they can connect FUB and Twilio  
**And** they receive a test lead within 5 minutes

### E2E-REV-003: SMS Value Delivery
**Given** a paying agent has active integration  
**When** a new lead arrives via FUB webhook  
**Then** SMS is sent within 30 seconds  
**And** lead receives actual text message  
**And** conversation is logged in dashboard

---

## 8. Workflow Handoff

| Step | Team | Status | ETA |
|------|------|--------|-----|
| 1 | PM (PRD) | ✅ Complete | Mar 6 |
| 2 | Dev (Onboarding Fix) | 🚨 CRITICAL | Mar 8 |
| 3 | Marketing (Landing Copy) | 🚨 CRITICAL | Mar 7 |
| 4 | Design (Landing Design) | 🚨 CRITICAL | Mar 9 |
| 5 | Dev (Landing + Twilio) | 🚨 CRITICAL | Mar 11 |
| 6 | PM + Marketing (Pilot Recruitment) | ⏳ Ready | Mar 13 |
| 7 | QC (E2E Testing) | ⏳ Ready | Mar 12 |

---

## 9. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Mar 6 | Prioritize onboarding fix over features | Without signup, no revenue |
| Mar 6 | Deprioritize UC-8, UC-6, UC-7 | Core SMS response is MVP |
| Mar 6 | Extend pilot to 30 days | Reduce friction, get testimonials |
| Mar 6 | Target 20 paying agents by Day 60 | Realistic given 44 days remaining |

---

*This PRD is a living document. Update weekly based on actual metrics and blockers.*
