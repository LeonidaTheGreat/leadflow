# PRD: Revenue Recovery Plan — Critical MRR Gap Closure

**PRD ID:** PRD-REVENUE-RECOVERY-001  
**Status:** Approved  
**Version:** 1.0  
**Date:** 2026-03-06  
**Project:** LeadFlow AI  

---

## 1. Executive Summary

**Situation:** Day 20 of 60-day sprint. $0 MRR vs $5,085 expected (25% behind trajectory). 44 days remaining to hit $20K MRR target.

**Root Cause Analysis:**
1. **Conversion funnel blocked** — Signup flow broken due to agents table schema collision (fix-onboarding-500-error stuck)
2. **Core value delivery compromised** — Twilio SMS still mocked, not sending real messages (implement-twilio-sms-integration stuck)
3. **Zero inbound traffic** — Marketing landing page not started (UC-LANDING-MARKETING-001), blocking all prospect acquisition

**Revenue Impact:** These 3 blockers prevent ALL revenue generation. Without them, no customer can complete signup or receive the core product value.

---

## 2. Conversion Funnel Analysis

### Current State (Broken)

```
Traffic → Landing Page → Signup → Onboarding → Payment → Activation → Retention
   0    →   ❌ NONE   →  N/A   →   ❌ 500    →   N/A   →   N/A    →   N/A
```

**Funnel breakage points:**
| Stage | Status | Blocker | Revenue Impact |
|-------|--------|---------|----------------|
| Traffic | 🔴 ZERO | No marketing landing page | No prospects entering funnel |
| Signup | 🔴 BROKEN | Onboarding 500 error | Cannot create accounts |
| Activation | 🔴 MOCKED | Twilio SMS not real | Product doesn't deliver value |

### Target State (Fixed)

```
Traffic → Landing Page → Signup → Onboarding → Payment → Activation → Retention
 100/mo →   ✅ LIVE   →  10%   →   ✅ WORKS  →  50%   →   80%    →   95%
```

**Target metrics:**
- 100 visitors/month from content + organic
- 10% visitor-to-signup conversion
- 50% signup-to-payment conversion
- 80% activation (first SMS sent)
- 95% monthly retention

---

## 3. Recovery Actions (Prioritized)

### Action 1: Fix Signup Flow (P0 — Unblocks All Revenue)
**Task:** fix-onboarding-500-error  
**Status:** Stuck — needs rescue  
**Revenue Impact:** CRITICAL — Without this, zero customers can sign up  
**Acceptance Criteria:**
- Root cause documented (agents table schema collision)
- Product agents table renamed to `customers`
- All FK references updated (leads.agent_id → leads.customer_id, etc.)
- Onboarding endpoint returns 200, creates user + customer record
- Full E2E test: landing → signup → payment → dashboard

**Why stuck:** Schema migration complexity + FK cascade updates  
**Rescue strategy:** Break into smaller tasks: (1) migration script, (2) API updates, (3) dashboard queries, (4) E2E test

---

### Action 2: Implement Real Twilio SMS (P0 — Core Value Delivery)
**Task:** implement-twilio-sms-integration  
**Status:** Stuck — needs rescue  
**Revenue Impact:** CRITICAL — Product promises AI SMS, delivers console.log  
**Acceptance Criteria:**
- Twilio SDK installed, env vars configured
- sendSmsViaTwilio() calls real twilio.messages.create()
- Message SID stored, delivery status tracked
- Failed sends retry with exponential backoff
- Test: Submit lead → Receive actual SMS on phone

**Why stuck:** A2P 10DLC compliance concerns + testing complexity  
**Rescue strategy:** Implement with test credentials first, compliance in parallel

---

### Action 3: Launch Marketing Landing Page (P0 — Traffic Acquisition)
**Task:** UC-LANDING-MARKETING-001  
**Status:** Not started  
**Revenue Impact:** CRITICAL — No landing page = no prospects  
**Acceptance Criteria:**
- Hero with headline "Never Lose a Lead to Slow Response Again"
- Stats bar: <30s, 78%, 35%, 24/7
- Problem section: "Cold leads, busy agents, wasted ad spend"
- How It Works: 4-step visual process
- Pricing: Starter $49, Pro $149 (Most Popular), Team $399
- CTA buttons linking to /onboarding
- Responsive, Lighthouse ≥90, SEO optimized

**Dependencies:** None — can build in parallel with fixes  
**Timeline:** 3-5 days (Design → Dev → QC)

---

## 4. Use Case Reprioritization

### Updated Priorities (Revenue-First)

| UC | Name | Old Priority | New Priority | Revenue Impact | Action |
|----|------|--------------|--------------|----------------|--------|
| fix-onboarding-500-error | Fix Onboarding | 1 | **0** | Critical | Rescue immediately |
| implement-twilio-sms-integration | Real Twilio SMS | 1 | **0** | Critical | Rescue immediately |
| UC-LANDING-MARKETING-001 | Marketing Landing Page | 0 | **0** | Critical | Start immediately |
| UC-AUTH-FIX-001 | Auth Flow | 0 | 1 | Critical | Depends on onboarding fix |
| UC-9 | Customer Sign-Up Flow | 1 | 1 | High | Depends on onboarding fix |

### Use Cases to Deprioritize

These are complete but not revenue-blocking. Pause new work here:
- UC-12 MRR Reporting (analytics, not acquisition)
- feat-auto-sync-deployed-pages (internal tooling)
- UC-7 Dashboard Manual SMS (feature, not core value)

---

## 5. 44-Day Recovery Timeline

### Week 1 (Days 20-26): Unblock
- [ ] Rescue fix-onboarding-500-error (split into 3 subtasks)
- [ ] Rescue implement-twilio-sms-integration (test credentials first)
- [ ] Start UC-LANDING-MARKETING-001 (Design + Marketing)

### Week 2 (Days 27-33): Launch
- [ ] Onboarding fix deployed → test signup flow
- [ ] Twilio SMS live → test real message delivery
- [ ] Landing page deployed → start traffic acquisition
- [ ] Recruit 3 pilot agents (manual outreach)

### Week 3-4 (Days 34-47): Validate
- [ ] Pilot agents onboarded, first SMS sent
- [ ] Collect testimonials, case studies
- [ ] Iterate on landing page conversion
- [ ] Target: 10 paying agents ($1,490 MRR)

### Week 5-6 (Days 48-60): Scale
- [ ] Content marketing campaign launch
- [ ] Facebook Groups, Reddit outreach
- [ ] Referral program active
- [ ] Target: 50 paying agents ($7,450 MRR) — 37% of goal

**Revised $20K MRR target:** Given 44 days remaining and current blockers, the realistic target is $7,500 MRR by day 60, with a path to $20K by day 90.

---

## 6. Success Metrics

### Weekly KPIs
| Metric | Week 1 | Week 2 | Week 3 | Week 4 |
|--------|--------|--------|--------|--------|
| Signup success rate | 0% | 80% | 90% | 95% |
| SMS delivery rate | 0% | 95% | 99% | 99% |
| Landing page visits | 0 | 50 | 100 | 200 |
| New signups | 0 | 3 | 5 | 10 |
| Paying customers | 0 | 3 | 8 | 15 |
| MRR | $0 | $447 | $1,192 | $2,235 |

### Definition of Done (This PRD)
- [ ] fix-onboarding-500-error resolved and deployed
- [ ] implement-twilio-sms-integration live and tested
- [ ] UC-LANDING-MARKETING-001 deployed and converting
- [ ] 3 pilot agents successfully onboarded
- [ ] First real revenue collected

---

## 7. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Onboarding fix fails again | Medium | Critical | Split into 3 smaller tasks, parallel workstreams |
| Twilio A2P 10DLC delays | Medium | High | Use test credentials, apply for production in parallel |
| Landing page low conversion | Medium | High | A/B test headlines, add social proof, video demo |
| Pilot agents churn | Low | Medium | Weekly check-ins, concierge onboarding |

---

## 8. E2E Test Specifications

### Test: Signup Flow Recovery
```
Test ID: E2E-SIGNUP-RECOVERY-001
Prerequisites: fix-onboarding-500-error deployed
Steps:
  1. Navigate to landing page
  2. Click "Start Free Trial" CTA
  3. Complete onboarding form (email, password, profile)
  4. Select Pro plan ($149/mo)
  5. Complete Stripe checkout with test card
  6. Verify redirect to dashboard
  7. Verify customer record created in Supabase
Expected: 200 OK, user authenticated, dashboard accessible
```

### Test: Real SMS Delivery
```
Test ID: E2E-SMS-DELIVERY-001
Prerequisites: implement-twilio-sms-integration deployed
Steps:
  1. Create test lead via FUB webhook
  2. Verify lead appears in dashboard
  3. Trigger welcome SMS
  4. Verify Twilio API call succeeds
  5. Verify message SID stored in database
  6. Check test phone for actual SMS receipt
Expected: SMS received within 30 seconds, status = delivered
```

### Test: Landing Page Conversion
```
Test ID: E2E-LANDING-CONVERSION-001
Prerequisites: UC-LANDING-MARKETING-001 deployed
Steps:
  1. Navigate to root route (/)
  2. Verify hero section loads with headline
  3. Scroll to pricing section
  4. Click "Get Started" on Pro tier
  5. Verify navigation to /onboarding
Expected: Page loads <2s, CTA clicks track in analytics
```

---

## 9. Appendices

### A. Current Blocker Details

**fix-onboarding-500-error:**
- Root cause: Schema collision between orchestrator `agents` table and product `agents` table
- Orchestrator table: (project_id, agent_name, agent_type, status)
- Product table: (email, name, phone, fub_id, stripe_customer_id)
- Solution: Rename product table to `customers`, update all references

**implement-twilio-sms-integration:**
- Current: `console.log("[MOCK] Sending SMS...")`
- Required: `twilio.messages.create({ to, from, body })`
- Blocker: A2P 10DLC registration for production
- Workaround: Use test credentials for development/pilot

### B. Revenue Model Reference

| Tier | Price | Target Mix | MRR Contribution |
|------|-------|------------|------------------|
| Starter | $49/mo | 20% | $980 (20 agents) |
| Pro | $149/mo | 60% | $8,940 (60 agents) |
| Team | $399/mo | 20% | $7,980 (20 agents) |
| **Total** | | **100** | **$17,900** |

Path to $20K: 75 Pro + 25 Team = $21,100 MRR

---

*This PRD is the single source of truth for revenue recovery. All other work is secondary until these three blockers are resolved.*
