# PRD: Revenue Alert — Critical MRR Recovery Action Plan

**PRD ID:** prd-revenue-alert-critical-2026-04-04  
**Date:** 2026-04-04  
**Status:** Ready for Prioritization  
**Priority:** P1 (Blocker — prevents business survival)  
**Severity:** Critical (Revenue at $0 / $20K target)

---

## Executive Summary

LeadFlow is at **Day 50 of 90** toward a $20K MRR goal with **$0 current MRR** and **ZERO paying customers**. The product has 386 trial signups but a collapsed funnel at email verification → onboarding.

### Key Metrics (as of 2026-04-04)
| Metric | Value | Status |
|--------|-------|--------|
| Total Signups | 386 agents | ✅ Acquisition working |
| Email Verified | 260 agents (67%) | ✅ Verification fixed |
| **Onboarding Started** | **5 agents (1.3%)** | 🔴 CRITICAL LEAK |
| Onboarding Completed | 5 agents (1.3%) | 🔴 CRITICAL LEAK |
| FUB Connected | 0 agents (0%) | 🔴 ZERO |
| Converted to Paid | 0 agents (0%) | 🔴 ZERO |
| **MRR** | **$0 / $20,000** | 🔴 CRITICAL |
| **Agents Needed to Target** | 135 @ $149/mo avg | — |

---

## The Funnel Breakdown

### Current State (Real Data from Supabase)
```
Signup (386)
    ↓ 67% verify email
Email Verified (260)
    ↓ 2% enter onboarding
Onboarding Started (5) ← MAIN LEAK: 255 agents lost here
    ↓ 100% complete (5/5)
Onboarding Completed (5)
    ↓ 0% connect FUB
FUB Connected (0) ← SECONDARY LEAK
    ↓ 0% reach aha moment
Aha Moment (0)
    ↓ 0% convert to paid
Paid (0) ← REVENUE BLACKHOLE
```

### Root Cause Analysis

#### Primary Leak: Email Verified → Onboarding (255 agents, 98% loss)
**Problem:** 260 agents complete email verification but never see the onboarding wizard.

**Evidence:**
- 260 agents have `email_verified = true`
- Only 5 have `onboarding_step > 0`
- 255 agents are stuck at verification with no progression
- Ages range from 3 days to 24 days old

**Likely Causes:**
1. **No auto-trigger:** Post-verification email does NOT prompt agents to enter onboarding
2. **Missing link in flow:** No clear CTA or redirect after email verification
3. **UX friction:** Onboarding may require explicit click/navigation (agents don't discover it)
4. **Technical issue:** Onboarding wizard may be broken or inaccessible

**Impact:** This single gap eliminates 98% of trial users from reaching aha moment or conversion.

---

## Business Case for Each Action

### Action 1: Auto-Trigger Onboarding After Email Verification (IMMEDIATE)
**Goal:** Get the 255 verified agents into onboarding wizard  
**Mechanism:** Send email immediately after verification with "Start Now" CTA + auto-redirect to `/dashboard/onboarding`  
**Expected Outcome:** 20-30% of 255 agents attempt onboarding = 50–77 new onboarding starts  
**Impact on Revenue:** High (opens the funnel)  
**Timeline:** 1–2 days

**Success Criteria:**
- Email is sent within 60 seconds of email verification
- Email contains direct link to `/dashboard/onboarding`
- OR: Auto-redirect happens on next login after verification
- Acceptance Check: `SELECT COUNT(*) FROM real_estate_agents WHERE email_verified=true AND onboarding_step > 0` → ≥ 50 agents

---

### Action 2: Fix Onboarding Wizard UX — Make Aha Moment Instant (HIGH PRIORITY)
**Goal:** Close the gap from "onboarding started" to "aha moment"  
**Current State:** 5 agents completed onboarding, 0 have aha moment  
**Problem:** Onboarding is incomplete or not delivering the product demo/aha moment  

**Issues to Fix:**
1. **Lead simulator not in wizard?** — Agents should see live lead response in <30 seconds
2. **FUB connection is blocking?** — Agents can't progress without FUB integration
3. **Missing steps?** — Onboarding wizard might have gaps (e.g., phone config, SMS setup)
4. **Phone/SMS verification broken?** — 5 completed onboarding but 0 configured phone or verified SMS

**Success Criteria:**
- ✅ Onboarding wizard has live lead simulator integrated
- ✅ Agents can skip FUB for trial and complete onboarding without it
- ✅ Phone & SMS config is optional (not required to reach aha moment)
- ✅ Completion time: <5 minutes from start to "see first AI response"

**Acceptance Check:**
```sql
-- Should find agents with completed onboarding AND aha moment signal
SELECT COUNT(*) FROM real_estate_agents 
WHERE onboarding_completed=true AND phone_configured=true 
HAVING COUNT(*) >= 5
```

---

### Action 3: Implement Trial-to-Paid Conversion Sequence (HIGH PRIORITY)
**Goal:** Convert at least 5 agents (currently stuck at onboarding) to paid  
**Current Blocker:** No trial → paid flow exists  
**What's needed:**
1. Trial expiration email sequence (Days 3, 7, 14 before expiry)
2. In-dashboard trial countdown + upgrade CTA
3. Stripe checkout flow that works end-to-end
4. Post-payment confirmation email

**Success Criteria:**
- Agents see trial countdown in dashboard by Day 3 of trial
- Upgrade CTA buttons work and load Stripe checkout
- Checkout completes successfully and creates subscription in Supabase
- Agent is immediately upgraded to paid plan
- Stripe webhook processes `subscription.created` event

**Acceptance Check:**
```sql
-- After test conversion, should see:
SELECT COUNT(*) FROM real_estate_agents 
WHERE subscription_status='active' AND mrr > 0
HAVING COUNT(*) >= 1  -- At least 1 test conversion successful
```

---

## Use Cases (Ordered by Revenue Impact)

### UC-1: Auto-Trigger Onboarding Wizard (Revenue Impact: HIGH)
**ID:** uc-auto-trigger-onboarding-post-verify  
**Phase:** Stabilization (fix immediate leak)  
**Priority:** 1 (Blocker)  

**Requirements:**
1. When agent verifies email via link in `/verify?token=X`, redirect to `/dashboard/onboarding`
2. OR: Send "You're verified! Start onboarding" email with CTA that redirects to onboarding
3. Onboarding must be accessible **only after email verification**
4. Track: `onboarding_step` increments from 0 → 1 on first entry

**Acceptance Criteria:**
- Verified agents (email_verified=true) see onboarding wizard on next login or via email link
- `onboarding_step` is > 0 after entering wizard
- At least 50 of the 255 verified agents enter onboarding within 72 hours of email trigger
- No regression: Unverified agents cannot access onboarding

**Machines Can Verify:**
```sql
-- Check that verified agents are entering onboarding
SELECT COUNT(*) as onboarded_verified
FROM real_estate_agents
WHERE email_verified = true AND onboarding_step > 0
HAVING COUNT(*) >= 50
```

---

### UC-2: Fix Onboarding Wizard Aha Moment (Revenue Impact: HIGH)
**ID:** uc-fix-onboarding-aha-moment  
**Phase:** Stabilization  
**Priority:** 1 (Blocker)  

**Current State:** 5 agents completed onboarding, 0 have aha moment signal  
**Goal:** Every agent who completes onboarding has sent their first SMS to a lead

**Requirements:**
1. Embed lead simulator directly in onboarding step
2. Agent sees sample lead, clicks "Send SMS", gets AI-generated response in <30 seconds
3. This counts as `onboarding_completed = true` only after simulator interaction
4. FUB connection is OPTIONAL (not required to complete trial onboarding)
5. Phone and SMS config can be skipped initially

**Acceptance Criteria:**
- Onboarding wizard includes lead simulator as required step
- Agents can complete onboarding without FUB integration
- `onboarding_completed = true` only after simulator interaction
- At least 4 of 5 agents show aha moment evidence (FUB connected OR sample lead processed)
- Average time from start to aha moment: <5 minutes

**Machines Can Verify:**
```sql
-- Aha moment signal: onboarding completed + interaction evidence
SELECT COUNT(*) FROM real_estate_agents
WHERE onboarding_completed = true
  AND (fub_connected = true OR phone_configured = true)
HAVING COUNT(*) >= 4
```

---

### UC-3: Trial-to-Paid Email & In-App Conversion (Revenue Impact: CRITICAL)
**ID:** uc-trial-to-paid-conversion-flow  
**Phase:** Stabilization  
**Priority:** 1 (Blocker)  

**Current State:** 0 paid agents; trial-to-paid flow not implemented  
**Goal:** Convert at least 5 trial agents to paid by end of week

**Requirements:**

#### 3a: Trial Expiration Tracking
- Every new agent gets `trial_ends_at` set to 14 days from signup
- Dashboard shows countdown: "9 days left on trial"
- Countdown color changes (green → yellow → red) as expiry approaches

#### 3b: Pre-Expiry Email Sequence
- Day 3: "You have 11 days left — get your first lead response"
- Day 7: "Last week to try free — upgrade now for unlimited"
- Day 14 (morning of expiry): "Trial expires TODAY — upgrade to Pro for $149/mo"
- Each email has direct upgrade link to Stripe checkout

#### 3c: In-Dashboard Upgrade CTA
- Trial countdown banner on dashboard (persistent, dismissible)
- "Upgrade to Pro" button links to `/billing/upgrade`
- `/billing/upgrade` loads Stripe checkout with correct plan selected
- Post-payment: Agent is marked as paid, subscription created in Supabase

#### 3d: Stripe Integration Verification
- Webhook receives `customer.subscription.created` event
- Webhook updates agent: `subscription_status='active'`, `plan_tier='pro'`, `mrr=149`
- Agent sees upgrade confirmation in-app within 10 seconds of payment

**Acceptance Criteria:**
- Trial countdown appears on dashboard 14 days before expiry
- Pre-expiry emails are sent (3 per agent at days 3, 7, 14)
- Stripe checkout loads and completes without errors
- Post-checkout, agent is immediately marked as paid
- At least 1 real test conversion succeeds end-to-end
- No existing paid agents are affected

**Machines Can Verify:**
```sql
-- After implementing, should see at least 1 paid agent
SELECT COUNT(*) FROM real_estate_agents
WHERE subscription_status = 'active' AND mrr > 0 AND stripe_customer_id IS NOT NULL
HAVING COUNT(*) >= 1
```

---

### UC-4: Manual Pilot Onboarding (Revenue Impact: MEDIUM)
**ID:** uc-manual-pilot-white-glove  
**Phase:** Immediate (Stojan's manual recruitment)  
**Priority:** 1 (Blocker)  

**Current State:** 0 real agents recruited; admin invite flow exists but isn't used  
**Goal:** Recruit 5 paying pilot agents within 3 days

**Requirements:**
1. Stojan recruits 5 real estate agents (email addresses provided)
2. Send them admin invite emails (link to accept and create account)
3. Skip email verification for pilot agents (use demo accounts for testing)
4. Guide them through onboarding directly (white-glove: phone call + walkthrough)
5. Upgrade 2–3 of them to paid plan immediately (to validate Stripe flow)

**Success Criteria:**
- 5 pilot agents created and activated
- 2–3 pilot agents converted to paid (prove Stripe works with real customers)
- Gather feedback on UX/product fit
- Pilots start receiving leads within 24 hours

**Machines Can Verify:**
```sql
-- Should see paid pilot agents in DB
SELECT COUNT(*) FROM real_estate_agents
WHERE source='pilot' AND subscription_status='active' AND mrr > 0
HAVING COUNT(*) >= 2
```

---

## Prioritization & Timeline

### Immediate (Next 48 hours) — Actions 1 & 2
**Why:** Open the funnel. 255 verified agents are waiting. This is pure waste.

| Action | Owner | Est. Time | Impact |
|--------|-------|-----------|--------|
| **UC-1: Auto-Trigger Onboarding** | Dev + PM | 4–6 hours | Unlock 50–77 agents into onboarding |
| **UC-2: Fix Onboarding Aha Moment** | Dev + Design | 6–8 hours | Ensure aha moment is instant & clear |

**Expected Outcome:** By tomorrow, 50–77 agents in onboarding, 4–10 with aha moment signal  
**Revenue Impact:** Prep for conversion funnel below

---

### High Priority (Next 72 hours) — Action 3
**Why:** Without a conversion mechanism, even perfect onboarding doesn't matter.

| Action | Owner | Est. Time | Impact |
|--------|-------|-----------|--------|
| **UC-3: Trial-to-Paid Flow** | Dev + Marketing | 12–16 hours | Enable first real conversions |
| **Test with 5 agents** | QC | 4–6 hours | Validate Stripe + emails work |

**Expected Outcome:** By end of week, 5–10 paid agents (MRR: $745–1,490)  
**Revenue Impact:** First step toward $20K target

---

### Parallel (Next 7 days) — Action 4
**Why:** While product stabilizes, recruit real pilots to validate market fit.

| Action | Owner | Est. Time | Impact |
|--------|-------|-----------|--------|
| **UC-4: Manual Pilot Recruitment** | Marketing + Stojan | 8–12 hours | Get 2–3 real paid pilots |
| **White-glove onboarding** | Stojan | 2 hours/agent | Validate PMF + UX |

**Expected Outcome:** 5 pilots created, 2–3 paying (MRR: $300–450)  
**Revenue Impact:** Proof of product-market fit; feedback for refinement

---

## Success Metrics

### Weekly Checkpoint (End of Week 1: 2026-04-11)
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Agents in Onboarding | ≥ 50 | 5 | 🔴 10x improvement needed |
| Agents with Aha Moment | ≥ 20 | 0 | 🔴 New signal needed |
| Paid Agents | ≥ 5 | 0 | 🔴 Conversion needed |
| MRR | ≥ $750 | $0 | 🔴 First revenue signal |
| Pilot Agents | ≥ 3 | 0 | 🔴 Recruitment needed |

### Monthly Checkpoint (2026-05-04)
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Total Signups | 500+ | 386 | 🟡 Acquisition should continue |
| Paid Agents | 50+ | 0 | 🟡 Need conversion rates 10%+ |
| MRR | $7,500+ | $0 | 🟡 Pace: $149/agent avg |
| Trial Completion Rate | 20%+ | 1% | 🟡 Need 10x improvement |
| Conversion Rate (Trial→Paid) | 10%+ | 0% | 🟡 Target: $20K needs 135 agents |

---

## Risk & Assumptions

### Key Assumptions
1. ✅ Email verification is working (260 agents verified)
2. ✅ Signup flow is working (386 agents signed up)
3. ❓ Onboarding wizard is accessible but no auto-trigger
4. ❓ Stripe Checkout integration works (needs test)
5. ❓ Lead simulator is accurate/compelling for aha moment
6. ❓ Real agents will convert at 10%+ rates (FUB + SMS delivery is critical)

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Stripe checkout broken in production | Medium | 🔴 Zero revenue possible | Test UC-3 with real payment immediately |
| FUB integration not sending leads | High | 🔴 Aha moment unattainable | Verify FUB webhook + SMS delivery for pilots |
| Trial agents don't engage after onboarding | High | 🔴 Churn at aha moment | Add "First Lead in 1 Hour" guarantee + support |
| SMS delivery fails at scale | Medium | 🔴 Core value destroyed | Test with 100 sample leads before expanding |
| Agent drop-off due to complexity | High | 🟡 Low conversion | Simplify onboarding (target: <5 min) |

---

## Deliverables

### For Development
1. **UC-1 Implementation:** Auto-trigger + email after verification
2. **UC-2 Implementation:** Integrate lead simulator into onboarding, make FUB optional
3. **UC-3 Implementation:** Email sequence + dashboard countdown + Stripe checkout
4. **UC-4 Support:** Pilot account creation + white-glove support docs

### For PM/QC
1. **E2E Test Plan:** Full funnel test (signup → verify → onboarding → aha → conversion)
2. **Pilot Recruitment Brief:** Messaging, invite flow, success criteria
3. **Weekly Metrics Dashboard:** Track funnel at each stage daily
4. **Feedback Loop:** Collect pilot feedback daily, surface to dev for prioritization

### For Marketing
1. **Trial Expiry Email Templates:** 3 emails (days 3, 7, 14)
2. **In-App Messaging:** Upgrade CTA copy + countdown design
3. **Pilot Recruitment Copy:** Email invites for 5–10 real agents

---

## Success Criteria (Machine-Verifiable)

### UC-1: Auto-Trigger Onboarding
```sql
SELECT COUNT(*) as agents_onboarding
FROM real_estate_agents
WHERE email_verified = true AND onboarding_step > 0
HAVING COUNT(*) >= 50
-- Expected: TRUE (50+ agents entered onboarding)
```

### UC-2: Aha Moment Fixed
```sql
SELECT COUNT(*) as agents_with_aha
FROM real_estate_agents
WHERE onboarding_completed = true 
  AND (phone_configured = true OR fub_connected = true)
HAVING COUNT(*) >= 4
-- Expected: TRUE (4+ agents showed aha signal)
```

### UC-3: Trial-to-Paid Working
```sql
SELECT COUNT(*) as paid_agents
FROM real_estate_agents
WHERE subscription_status = 'active' AND mrr > 0
HAVING COUNT(*) >= 1
-- Expected: TRUE (at least 1 real paid agent)
```

### UC-4: Pilot Recruitment
```sql
SELECT COUNT(*) as paid_pilots
FROM real_estate_agents
WHERE source = 'pilot' AND subscription_status = 'active' AND mrr > 0
HAVING COUNT(*) >= 2
-- Expected: TRUE (2+ paid pilot agents)
```

---

## Decision Points

### Go/No-Go Decision 1 (End of Week 1)
**Question:** Are we seeing traction? (≥50 agents in onboarding, ≥1 paid agent)  
**If Go:** Continue to Week 2 scale-up (acquisition + optimization)  
**If No-Go:** Investigate root cause (is onboarding fundamentally broken? Is product not valuable? Is pricing wrong?)  
**Owner:** Stojan (PM decision)

### Go/No-Go Decision 2 (End of Week 2)
**Question:** Are paid agents staying? (Churn <10%, NPS >30)  
**If Go:** Scale acquisition + gradual price increases  
**If No-Go:** Pause acquisition, fix product (aha moment, value proof, follow-up sequences)  
**Owner:** Stojan (PM decision)

---

## Related Documents
- PMF.md — Pricing strategy, ICP, GTM plan
- CLAUDE.md — Technical architecture
- USE_CASES.md — Feature backlog (auto-generated)

---

## Approval & Tracking

**PRD Owner:** Product Manager  
**Created:** 2026-04-04  
**Last Updated:** 2026-04-04  
**Status:** Ready for Orchestrator Handoff  

**Next Steps:**
1. ✅ PM approves analysis
2. ⏳ Orchestrator creates Dev tasks for UC-1, UC-2, UC-3
3. ⏳ Stojan recruits pilots for UC-4
4. ⏳ QC validates each UC with acceptance criteria
5. ⏳ PM signs off on each UC completion before moving to next phase
