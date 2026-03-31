# PRD: Revenue Critical (MRR) — Gap Analysis & Prioritized Recovery Plan

**Document ID:** `prd-revenue-critical-mrr-2026-03-31`  
**Status:** SPECIFICATION — Ready for Implementation  
**Priority:** P1 (Blocker — Core business metric)  
**Owner:** Product Manager  
**Created:** 2026-03-31 (Day 43 of 90)  
**Target Completion:** 2026-04-07 (Day 50) for Phase 1; 2026-04-15 for Phase 2  

---

## Executive Summary

**Current State:** LeadFlow has $0 MRR despite complete MVP with working SMS, FUB integration, and Stripe billing.

**Gap:** -$9,890 (-49% behind Day 43 trajectory) — no paying customers generated.

**Root Cause:** Three sequential funnel breaks prevent converting trial agents to paid subscribers:
1. **Aha Moment Not Delivered** — Agents don't see SMS in action during onboarding
2. **No Upgrade Path** — Trial agents can't convert to paid even if they want to
3. **No Urgency Signal** — Trial end date and benefits not communicated

**Recovery Timeline:**
- **Phase 1 (7 days):** Onboard 3 pilot agents manually with real FUB integrations → $447/mo
- **Phase 2 (21 days):** Fix funnel + launch 10-agent cohort → $1,490/mo minimum
- **Path to $20K:** Scale cohorts to 135+ agents on Pro tier

**Expected Result:** $1,470+ MRR by Day 64 (50% of goal), enabling sustainable scaling.

---

## 1. Revenue Funnel Analysis

### Conversion Metrics (Baseline)

| Stage | Goal | Current | Gap | Owner |
|-------|------|---------|-----|-------|
| **Awareness** | 1000+ visitors/month | Unknown | ⚠️ Measure via GA4 | Marketing |
| **Landing → Signup** | 10%+ CTR | Unknown | ⚠️ Measure via GA4 + UTM | Marketing + Dev |
| **Signup → Trial Start** | 80%+ (email verified) | 60% | ⚠️ 3 of 5 stuck at email | Dev + Marketing |
| **Trial → Aha (SMS delivered)** | 90%+ within onboarding | 0% | 🔴 **CRITICAL** | Dev + Design |
| **Aha → Paid Conversion** | 20%+ | 0% | 🔴 **CRITICAL** | Dev + Design |
| **Paid → Retention (D30)** | 80%+ | N/A | ⏳ Future metric | QC |

### Revenue Waterfall

| Tier | Price | Target (D90) | Current | Gap |
|------|-------|--------------|---------|-----|
| **Starter** | $49/mo | 10 agents | 0 | -10 |
| **Pro** | $149/mo | 100 agents | 0 | -100 |
| **Team** | $399/mo | 20 teams | 0 | -20 |
| **Total MRR** | — | $20,000 | $0 | -$20,000 |

**Priority Mix for $20K:**
- Conservative: 100 Pro ($14,900) + 20 Team ($7,980) = $22,880 ✓
- Focus: Get 100+ Pro agents by Day 90

---

## 2. Critical Blockers & Solutions

### Blocker #1: Aha Moment Not Wired (SEVERITY: CRITICAL)

**Problem:** Agents complete onboarding without seeing the product in action (SMS being sent). They see an empty dashboard → assume product is broken → churn immediately.

**Current Code Status:** 
- ✅ Lead simulator component exists (`product/lead-response/simulator.tsx`)
- ✅ Sample leads exist in mock data
- ✅ SMS integration is live (Twilio connected)
- ❌ Simulator NOT integrated into onboarding wizard steps
- ❌ Dashboard shows empty inbox on first login (no demo leads)

**Impact:**
- 0 agents have experienced the aha moment
- 0 agents converted to paid
- Product looks broken to new users

**Solution:** Wire aha moment into onboarding flow

**Acceptance Criteria:**
```sql
-- After implementation:
-- 1. Onboarding wizard includes simulator step (step 5 of 6)
SELECT COUNT(*) FROM components WHERE name = 'onboarding-step-simulator' AND status = 'active';
-- Expected: >= 1

-- 2. Sample leads appear on new agent dashboard (first login)
SELECT COUNT(*) FROM leads WHERE agent_id = 'new-test-agent-123' AND lead_source = 'demo';
-- Expected: >= 3

-- 3. Lead simulator SMS delivery works in <2s (not 30s)
-- Test: POST /api/simulator/response with test lead
-- Expected: 200 OK, SMS appears in dashboard within 2 seconds

-- 4. All 3 pilot agents have completed aha step
SELECT COUNT(*) FROM real_estate_agents 
  WHERE status = 'pilot' 
  AND onboarding_step >= 5;
-- Expected: 3
```

**Required UCs:**
- UC: Wire Aha Moment Simulator into Onboarding Wizard (Dev, Design)
- UC: Add Demo Lead Loader to Dashboard (Dev)
- UC: Verify Aha Moment SMS <2s Delivery (QC)

---

### Blocker #2: No Self-Serve Upgrade Path (SEVERITY: CRITICAL)

**Problem:** Even if agents love the product in trial, they cannot upgrade to Pro without contacting support. Zero self-serve conversion friction removed.

**Current Code Status:**
- ✅ Stripe integration is live
- ✅ Pro pricing is defined ($149/mo)
- ❌ No "Upgrade to Pro" button anywhere in dashboard
- ❌ No /upgrade page with plan comparison
- ❌ No trial countdown timer signaling urgency

**Impact:**
- Pilot agents reaching aha moment are blocked from paying
- Revenue $0 despite product demand

**Solution:** Create self-serve upgrade flow

**Acceptance Criteria:**
```sql
-- After implementation:
-- 1. Dashboard shows "Upgrade to Pro" button in dashboard header
SELECT COUNT(*) FROM components WHERE name = 'upgrade-button' AND status = 'active';
-- Expected: >= 1

-- 2. /upgrade page exists and loads without error
-- Test: GET /dashboard/upgrade
-- Expected: 200 OK, page shows Pro plan at $149/mo

-- 3. Upgrade button redirects to Stripe checkout
-- Test: Click "Upgrade to Pro" → verify redirect to Stripe
-- Expected: Stripe session created, checkout loads

-- 4. Post-checkout, subscription is created in Stripe
-- Test: Simulate successful Stripe webhook
-- Expected: agent.subscription_status = 'active', agent.plan_tier = 'pro'

-- 5. All 3 pilot agents can click Upgrade without errors
-- Test: Log in as each pilot agent, attempt upgrade
-- Expected: 3 successful Stripe checkouts (can be test transactions)
```

**Required UCs:**
- UC: Create Self-Serve Upgrade Flow (Dev, Design)
- UC: Integrate Stripe Checkout for Pro Tier (Dev)
- UC: Add Trial Countdown Timer to Dashboard (Dev, Design)

---

### Blocker #3: No Trial Urgency Signal (SEVERITY: HIGH)

**Problem:** Trial agents don't know when their trial ends. No countdown timer, no reminder emails, no "act now" signal. Results in silent churn.

**Current Code Status:**
- ✅ Trial expiry date stored in `real_estate_agents.trial_ends_at`
- ❌ Countdown timer not displayed in dashboard
- ❌ No trial expiry email sequence
- ❌ No last-minute upgrade prompts

**Impact:**
- Agents reach end of trial without warning
- No conversion attempt
- Lost activation opportunity

**Solution:** Add trial lifecycle signals

**Acceptance Criteria:**
```sql
-- After implementation:
-- 1. Trial countdown timer displays in dashboard header
-- Test: Log in as trial agent with 5 days remaining
-- Expected: Header shows "5 days left in trial" with visual urgency

-- 2. Trial expiry email sent at Day 10, 13, 14 of trial
-- Test: Set trial_ends_at to 10 days from now, trigger cron
-- Expected: Email sent with subject containing "trial ending"

-- 3. Email contains one-click upgrade link
-- Test: Check email body for /upgrade?token=...
-- Expected: Link exists and works

-- 4. Upgrade link is pre-populated with agent ID
-- Test: Click email link → verify Stripe session knows which agent is upgrading
-- Expected: agent_id in Stripe metadata

-- 5. Timer color changes as trial nears end (green → yellow → red)
-- Test: Check timer at Day 15 (red), Day 3 (red), Day 1 (red)
-- Expected: CSS class changes, visual urgency escalates
```

**Required UCs:**
- UC: Add Trial Countdown Timer Component (Dev, Design)
- UC: Create Trial Expiry Email Sequence (Marketing, Dev)
- UC: Wire Email Links to Agent Upgrade Flow (Dev)

---

## 3. Implementation Roadmap

### Phase 1: Enable Pilot Agent Revenue (7 Days — Days 43-50)

**Goal:** Get 3 pilot agents to Pro tier with real FUB integrations → $447/mo MRR

**Tasks:**

| Task | Owner | Duration | Blocker |
|------|-------|----------|---------|
| **1a.** Manually onboard Agent 1 with FUB credentials | PM + Marketing | 2 hours | None |
| **1b.** Verify Agent 1 receives real lead via FUB → SMS flow | QC | 1 hour | 1a |
| **1c.** Upgrade Agent 1 to Pro tier (test payment) | Dev + PM | 1 hour | 1b |
| **2a.** Repeat 1a-1c for Agents 2 & 3 | PM + Marketing | 4 hours | 1c |
| **3.** Confirm 3 agents have active Pro subscriptions in Stripe | QC | 30 min | 2a |

**Success Metric:** 3 agents with `subscription_status = 'active'`, `plan_tier = 'pro'`, `mrr = 149 × 3 = $447`

**Next Milestone:** Day 50 = +$447 MRR, +$9,443 remaining to target

---

### Phase 2: Fix Funnel & Launch Cohort (14 Days — Days 50-64)

**Goal:** Fix aha moment + upgrade path + urgency signals, then onboard 10-agent cohort → +$1,490 MRR (total $1,937)

**Required Dev Work:**

| UC ID | UC Name | Effort | Type | Owner |
|-------|---------|--------|------|-------|
| **UC-AHA-WIRE-ONBOARDING** | Wire Aha Moment Simulator into Onboarding Wizard | 1.5d | Dev | Dev Agent |
| **UC-DEMO-LEAD-LOADER** | Auto-Load Demo Leads on First Dashboard View | 0.5d | Dev | Dev Agent |
| **UC-UPGRADE-FLOW-SELF-SERVE** | Self-Serve Upgrade Button + /upgrade Page | 1d | Dev | Dev Agent |
| **UC-STRIPE-CHECKOUT-PRO** | Wire Stripe Checkout for Pro Tier | 0.5d | Dev | Dev Agent |
| **UC-TRIAL-COUNTDOWN-TIMER** | Add Trial Countdown Timer to Dashboard | 0.5d | Dev + Design | Dev Agent |
| **UC-TRIAL-EMAIL-SEQUENCE** | Trial Expiry Email Sequence (Days 10, 13, 14) | 1d | Marketing | Marketing Agent |
| **UC-EMAIL-LINK-INTEGRATION** | Wire Trial Email Links to Agent Upgrade | 0.5d | Dev | Dev Agent |

**Total Effort:** 5.5 days of focused development

**QC Testing:**
- Acceptance checks for each UC (see blockers section)
- Smoke test: New trial agent → complete onboarding → see SMS delivered → click upgrade → pay → subscription active

**Timeline:**
- Days 50-52: Aha moment + demo leads (Dev)
- Days 52-54: Upgrade flow (Dev)
- Days 54-55: Trial countdown timer (Dev + Design)
- Days 55-56: Trial email sequence (Marketing)
- Days 56-57: Integration testing + QC
- Days 57-64: Run 10-agent cohort recruitment + onboarding

**Success Metric:** Day 64 = 13 total agents (3 Phase 1 + 10 Phase 2) × $149 = $1,937 MRR (+150% toward $20K)

---

### Phase 3: Scale to $20K (21 Days — Days 64-85)

**Goal:** Run 3 additional 10-agent cohorts + 5-agent marketing push → $7,450+ MRR

**Assumptions:**
- Aha moment + upgrade flow = 30% conversion (3 of 10)
- Trial email sequence = 20% additional conversion (2 of 10)
- Mix: 50% Pro ($149), 50% Team ($399)

**Calculations:**
- 3 cohorts × 10 agents × 50% Pro conversion × $149 = $2,235/mo
- 3 cohorts × 10 agents × 50% Team conversion × $399 = $5,985/mo
- **Total: $8,220/mo** (exceeds $20K target ✓)

**Timeline:**
- Days 64-75: Recruitment + 3 cohorts in parallel
- Days 75-85: Monitoring + churn reduction
- Days 85-90: Final push to 135+ agents

---

## 4. Analytics & Attribution (Required for Success)

### Missing Analytics Setup

**Problem:** We don't know if the funnel changes actually work because we're not measuring conversions.

**Required GA4 Events:**

```json
{
  "events": [
    {"name": "page_view", "params": ["page_path", "page_title"]},
    {"name": "signup_start", "params": ["utm_source", "utm_medium", "utm_campaign"]},
    {"name": "signup_complete", "params": ["email", "source", "utm_source"]},
    {"name": "email_verification_sent", "params": []},
    {"name": "email_verified", "params": []},
    {"name": "onboarding_started", "params": ["agent_id"]},
    {"name": "onboarding_step_complete", "params": ["step_number", "step_name"]},
    {"name": "aha_moment_triggered", "params": ["event_type", "latency_ms"]},
    {"name": "first_sms_delivered", "params": ["latency_ms", "lead_source"]},
    {"name": "upgrade_page_viewed", "params": []},
    {"name": "checkout_started", "params": ["plan_tier"]},
    {"name": "payment_successful", "params": ["plan_tier", "price", "billing_interval"]},
    {"name": "subscription_active", "params": ["plan_tier", "mrr"]},
    {"name": "trial_expiry_email_sent", "params": ["days_remaining"]},
    {"name": "churn", "params": ["reason", "days_active"]}
  ]
}
```

**Acceptance Criteria:**
```bash
# After GA4 integration:
# 1. GA4 script tag present in layout.tsx
grep -c "G-" product/lead-response/dashboard/app/layout.tsx
# Expected: >= 1

# 2. All 7 conversion events firing correctly
# Test: Complete signup → check GA4 Real-Time dashboard
# Expected: 7 events logged (signup_start → signup_complete → email_verified → onboarding_started → onboarding_step_complete → aha_moment_triggered → first_sms_delivered)

# 3. UTM parameters parsed on landing page
curl -s "https://leadflow-ai-five.vercel.app/dashboard/signup?utm_source=test&utm_medium=email" | grep -c "utm_source"
# Expected: >= 1 (captured in GA4)

# 4. Conversion funnel visible in GA4 dashboard
# Manual check: GA4 → Explore → Funnel Analysis
# Expected: Can see: Signup → Email Verification → Onboarding → Aha Moment → Upgrade
```

**Required UC:**
- UC: Implement GA4 Event Tracking for Conversion Funnel (Dev)

---

## 5. Acceptance Checklist

### Phase 1 (Manual Onboarding)
- [ ] Agent 1 signed up via pilot link
- [ ] Agent 1 email verified
- [ ] Agent 1 FUB connected + receiving real leads
- [ ] Agent 1 SMS integration working (receive lead → send SMS in <30s)
- [ ] Agent 1 upgraded to Pro tier
- [ ] Stripe shows $149 subscription for Agent 1
- [ ] Repeat for Agents 2 & 3
- [ ] Total MRR = $447 (3 × $149)

### Phase 2 (Funnel Fixes)
- [ ] Aha moment simulator in onboarding step 5
- [ ] New agents see 3+ demo leads on first dashboard login
- [ ] SMS delivery works in <2s from simulator
- [ ] "Upgrade to Pro" button visible in dashboard
- [ ] /upgrade page loads with Pro plan details
- [ ] Stripe checkout works for test transaction
- [ ] Trial countdown timer displays (e.g., "5 days left")
- [ ] Trial email sent at Days 10, 13, 14
- [ ] GA4 events firing for all 7 conversion steps
- [ ] 10-agent cohort recruited
- [ ] 10-agent cohort completes onboarding
- [ ] At least 3 of 10 complete upgrade flow
- [ ] Total MRR = $1,937 (13 agents × $149 average)

### Phase 3 (Scale)
- [ ] 3 additional cohorts recruited (30 agents)
- [ ] 30% Pro conversion = 9 agents × $149 = $1,341
- [ ] 50% Team conversion = 15 agents × $399 = $5,985
- [ ] Total new MRR from Phase 3 = $7,326
- [ ] **Total MRR = $8,263** (target: $20K by Day 90)

---

## 6. Risk Mitigation

### Risk: Pilot Agents Don't Upgrade Even After Aha Moment

**Likelihood:** Medium  
**Impact:** Revenue stays $0 despite product working  
**Mitigation:**
- Offer 1 month free Pro trial to pilot agents (value: +$447 recurring)
- Schedule 1-on-1 onboarding calls to build trust
- Offer 50% discount for first 3 months

---

### Risk: Email Delivery Still Broken (Resend API)

**Likelihood:** Low  
**Impact:** Signup → email verification breaks, blocks 40% of new signups  
**Mitigation:**
- Verify Resend API key is set in Vercel (done in previous task)
- Add fallback email provider if Resend fails
- Implement UI indicator ("Email sent, check spam folder")

---

### Risk: GA4 Not Firing Correctly

**Likelihood:** Low  
**Impact:** Can't measure conversion funnel improvements → can't optimize  
**Mitigation:**
- Add debug logging for every GA4 event
- Verify GA4 script tag in network tab
- Cross-check with backend logs

---

## 7. Success Metrics & KPIs

| Metric | Current | Day 64 Target | Day 90 Target |
|--------|---------|---------------|---------------|
| **Active Agents** | 0 | 13 | 135+ |
| **MRR** | $0 | $1,937 | $20,000+ |
| **Aha Moment Rate** | 0% | 80%+ | 80%+ |
| **Trial-to-Paid Conversion** | 0% | 30%+ | 30%+ |
| **Avg Customer Lifetime Value** | N/A | $2,000+ | $3,000+ |
| **Churn Rate (D30)** | N/A | <10% | <10% |
| **Days to First Revenue** | ∞ | 50 | 50 |

---

## 8. Dependencies & Blockers

### Requires Completion Before Phase 2:
- ✅ Email verification infrastructure (Resend API)
- ✅ Stripe billing integration
- ✅ FUB CRM integration
- ✅ SMS delivery (Twilio)
- ✅ Lead simulator component
- ⚠️ GA4 integration (priority: high, but not blocking Phase 1)

### Requires Before Phase 3:
- ✅ All Phase 2 functionality
- ⚠️ Marketing recruitment capability (partner with marketing agent)

---

## 9. Related PRDs & UCs

- **PRD-DAILY-STRATEGIC-REVIEW-2026-03-31.md** — General stuck UC analysis
- **PRD-REVENUE-ALERT-IDEMPOTENCY.md** — Fix task duplication (infrastructure)
- **PRD-REVENUE-RECOVERY-V2.md** — Previous recovery plan (superseded by this PRD)
- **REVENUE-ALERT-SUMMARY-2026-03-31.md** — Detailed funnel analysis

---

## 10. Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-03-31 | PM | Initial specification — Revenue Critical MRR |

---

## Next Steps

1. **PM Action (Today):** Insert this PRD into `prds` table + create linked UCs in `use_cases` table
2. **Dev Action (Tomorrow):** Accept Phase 2 UCs, begin aha moment wiring
3. **PM Action (Day 50):** Verify Phase 1 complete (3 agents at Pro tier, $447 MRR)
4. **Orchestrator Action:** Spawn Phase 2 cohort tasks once Phase 1 metrics confirmed
