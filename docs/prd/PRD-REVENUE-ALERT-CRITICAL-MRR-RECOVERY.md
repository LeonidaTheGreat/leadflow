# PRD: Revenue Alert — Critical MRR Recovery Plan

**Date:** 2026-03-31  
**Status:** SPECIFICATION (NOT IMPLEMENTATION)  
**Owner:** Product Manager  
**Priority:** P1 — BLOCKER  
**Target:** Activate revenue funnel to reach $1K-3K MRR within 7 days (enable real agent conversions)  

---

## Executive Summary

**Current State:**
- **MRR: $0** (zero paying customers)
- **Real Agents: 0** (only smoke test accounts)
- **Day: 43 of 90** (47 days left to $20K target)
- **Gap: $9,890 below expected pace**

**Root Cause Analysis (NOT Implementation):**

The product MVP is **technically complete** (all UCs marked complete, E2E tests passing 12/12, zero codebase violations). However, revenue is blocked by **three non-code blockers**:

1. **Pilot Recruitment Frozen** (17+ days blocked)
   - Admin invite flow built and tested ✓
   - No real agents invited yet ✗
   - Awaiting human approval to send invites

2. **Stripe Not Deployed to Production** (blocking paid conversions)
   - STRIPE_SECRET_KEY missing from Vercel env ✗
   - STRIPE_WEBHOOK_SECRET missing from Vercel env ✗
   - All /api/billing/* endpoints return 503
   - Trial agents cannot convert to paid

3. **Onboarding UX Bugs** (preventing free → paid flow)
   - Trial signup form not on landing page (missing CTA)
   - Wizard doesn't auto-trigger post-signup
   - Multiple database table mismatches in SMS/email paths

**This PRD specifies the GO/NO-GO decisions and exact actions needed, NOT code changes.**

---

## Business Context

### Revenue Target
- **Minimum:** $20K MRR within 90 days (Day 60 is our critical checkpoint)
- **Current pace:** $0 MRR at Day 43 → we need to acquire **100 Pro agents ($149/mo) OR 40 Team customers ($399/mo)** in 47 remaining days
- **Realistic path:** 
  - Days 43-50 (1 week): Launch pilot, recruit 3 real agents → $150-450 MRR
  - Days 50-60 (1 more week): Scale pilot recruitment, close first 5-10 real agents → $1K-3K MRR
  - Days 60-90 (4 weeks): Scale to 50+ agents → $7K-15K MRR

### Why Now?
- **Competitive risk:** Agents using competing tools (Zillow AutoRespond, Chatsimple, Twilix) are closing deals now
- **Recruitment inertia:** Pilot agents who try the product by Day 50 have 40 days of usage history, making them more likely to convert to paid (vs agents trying on Day 80)
- **Market window:** Q2 (April-June) is peak lead season for real estate — agents are actively buying solutions now
- **Cost per acquisition:** The longer we wait without live agents, the fewer learning cycles we have to optimize trial → paid flow

---

## Success Definition (WHAT SUCCESS LOOKS LIKE)

### At End of Week 1 (Day 50)
✅ **3 real pilot agents** actively using LeadFlow  
✅ **Minimum 1 paid conversion** (1 agent upgraded from trial to Pro)  
✅ **$150+ MRR** (3 agents × $49/mo trial value OR 1 × $149/mo Pro)  
✅ **Onboarding completion rate** ≥50% (agents reach dashboard with sample leads)  
✅ **Zero blocker bugs** in the trial → paid flow  

### By Day 60 (Mid-Checkpoint)
✅ **10+ real agents** in pilot  
✅ **5+ paid conversions** (agents upgraded to Pro/Team)  
✅ **$1K+ MRR**  
✅ **Churn rate** = 0 (no agent cancelled)  
✅ **Feedback loop** active (NPS or satisfaction pings working)  

### By Day 90 (Final Target)
✅ **50+ agents** in system  
✅ **25+ paid agents**  
✅ **$20K MRR** (mix of Pro/$149 and Team/$399 tiers)  

---

## Critical Blocker Analysis

### Blocker 1: Pilot Recruitment Frozen

**Current State:**
- Admin invite flow ✅ (feature complete and deployed to Vercel)
- Invite API `/api/admin/invite-pilot` ✅ (tested, working)
- Magic link activation ✅ (agents can click link and activate account)
- First agent test ✅ (end-to-end flow confirmed working by QC)

**What's Missing:**
- **Human Decision** — Stojan approves sending first 3 real invites
- **Email List** — Who are the 3 target pilot agents?
- **Tracking** — How will we measure pilot performance? (signup → trial → paid conversion latency)
- **Support Plan** — Who helps agents with onboarding questions during pilot?

**Action Required (PM):**
- ✅ Confirm admin invite flow is ready (already done)
- ⏳ Get Stojan approval: "Go ahead with pilot?"
- ⏳ Provide email list of 3 target agents
- ⏳ Define success metrics for pilot cohort (see table below)

**Success Metrics for Pilot Cohort:**

| Agent | Email | Signup Date | Trial Ends | Conversion Date | Plan | MRR | Status |
|-------|-------|-------------|------------|-----------------|------|-----|--------|
| Agent 1 | stojan@pilot-1 | Day 43 | Day 57 | Day 50 | Pro | $149 | Target: Convert by Day 50 |
| Agent 2 | stojan@pilot-2 | Day 43 | Day 57 | TBD | - | - | Measure churn if no action |
| Agent 3 | stojan@pilot-3 | Day 43 | Day 57 | TBD | - | - | Measure churn if no action |

**Risk:** Each day of delay = 1 fewer days of usage history per agent = lower conversion likelihood.

---

### Blocker 2: Stripe Configuration in Vercel Production

**Current State:**
- Stripe account ✅ (connected, test API keys working locally)
- Stripe products ✅ (Starter $49, Pro $149, Team $399 created)
- Stripe price IDs ✅ (price_xxx... generated)
- Checkout API code ✅ (all endpoints deployed to Vercel)

**What's Missing:**
- **STRIPE_SECRET_KEY** in Vercel production environment ✗
- **STRIPE_WEBHOOK_SECRET** in Vercel production environment ✗
- **Webhook registration** in Stripe Dashboard pointing to Vercel ✗

**Current Impact:**
```
POST /api/billing/create-checkout-session
→ STRIPE_SECRET_KEY undefined
→ Stripe client throws error
→ Endpoint returns 503
→ Agent sees "Checkout Unavailable" or blank page
→ Cannot upgrade from trial to paid ✗
```

**Action Required (HUMAN):**
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy "Secret Key" (sk_live_...)
3. Go to Vercel Dashboard → leadflow-ai project → Settings → Environment Variables
4. Add variable: `STRIPE_SECRET_KEY` = sk_live_... (Production only)
5. Go to Stripe Dashboard → Webhooks → create new endpoint
   - URL: `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `invoice.paid`
   - Copy signing secret
6. Add variable: `STRIPE_WEBHOOK_SECRET` = signing_secret (Production only)
7. Redeploy: `cd product/lead-response/dashboard && vercel --prod`
8. Test: `curl https://leadflow-ai-five.vercel.app/api/billing/create-checkout-session` should return `{ sessionId: "cs_..." }` (not 503)

**Why This Is Critical:**
- Without STRIPE_SECRET_KEY, checkout buttons are non-functional
- Without STRIPE_WEBHOOK_SECRET, subscription events (checkout complete, subscription updated) silently fail
- Agents can sign up for free trial, but cannot convert to paid
- Revenue = 0

**Risk:** 50 agents on free trial with no path to paid = 100% churn risk

---

### Blocker 3: Onboarding UX Gaps

**Current State:**

| Component | Status | Issue |
|-----------|--------|-------|
| Landing page | ✅ Live | Missing "Start Free Trial" CTA in hero |
| Signup form | ✅ Built | Form works but not linked from landing page |
| Trial form | ✅ Built | Separate form at `/signup/trial` but landing page doesn't link to it |
| Post-signup redirect | ✅ Works | Redirects to `/dashboard/onboarding` |
| Onboarding wizard | ✅ Built | FUB/SMS/Aha flow ready |
| Auto-trigger wizard | ❌ BROKEN | Wizard must be manually navigated to; doesn't auto-launch |
| Sample leads | ✅ Built | FUB integration ready, sample leads seeded on signup |
| Checkout page | ✅ Built | Stripe checkout ready but STRIPE_SECRET_KEY missing |
| Pricing page | ✅ Built | All tiers and CTAs present |

**User Flow Gap Analysis:**

```
CURRENT BROKEN FLOW:
Landing Page (no CTA to trial) 
→ Agent must guess URL: /signup/trial
→ Fill form, create account
→ Redirected to /dashboard/onboarding
→ WIZARD NEVER AUTO-LAUNCHES
→ Agent lands on blank dashboard
→ Agent sees no prompts, no next steps
→ Agent closes browser
→ CHURN

DESIRED FLOW (NEEDS FIX):
Landing Page (visible "Start Free Trial" CTA)
→ Click CTA
→ /signup/trial form
→ Create account → trial_ends_at = 14 days out
→ /dashboard/onboarding (automatically redirects here)
→ WIZARD AUTO-LAUNCHES (required fix)
→ Agent sees: "Step 1: Connect FUB" form
→ Agent connects FUB (1 min)
→ "Step 2: Sample Leads" loads
→ Agent sees 3 sample leads in dashboard
→ Wizard shows "Your first SMS response in 30s" demo
→ Agent triggered to "Aha moment"
→ Onboarding telemetry shows completion
→ Agent sees: "Pro plan includes unlimited SMS and AI" + upgrade CTA
→ Agent clicks upgrade → Stripe checkout
→ CONVERSION
```

**Specific UX Bugs Blocking Conversion:**

1. **Landing page has no "Start Free Trial" CTA** (P1)
   - Hero section missing button
   - Features section missing call-to-action
   - Mid-page CTA missing
   - Result: Prospect doesn't know how to start trial

2. **Onboarding wizard doesn't auto-launch** (P1)
   - Agent redirected to `/dashboard/onboarding` post-signup
   - Page renders but wizard overlay never appears
   - Agent sees blank dashboard with no guidance
   - Result: Agent confused, closes browser, CHURN

3. **Multiple database mismatches in email/SMS paths** (P1)
   - `/api/agents/satisfaction-ping` queries wrong table
   - Webhook handler uses `agent_id` but schema expects `user_id`
   - Email delivery queries non-existent columns
   - Result: Email/SMS features silently fail, agent doesn't know product works

4. **Trial signup form layout issues** (P2)
   - Mobile viewport rendering broken
   - Email input field too wide
   - Result: Agent on mobile can't complete signup

**Action Required (PM):**
- Document exact CTA placement needed (hero, features, pricing sections)
- Specify wizard auto-trigger logic (condition: onboarding_completed = false)
- Validate database table references in all SMS/email paths
- Create E2E test for full signup → onboarding → wizard flow

**Risk:** Agents get past signup but drop off before reaching "aha moment" = low trial → paid conversion rate.

---

## Specification: Revenue Recovery Funnel

### Phase 1: Infrastructure Unblock (Days 43-44, ~1 day work)

**Goal:** Enable trial agents to convert to paid  

**Tasks (for Dev Agent):**

#### Task 1.1: Deploy Stripe Configuration to Vercel
- **What:** Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to Vercel production environment
- **Acceptance Criteria:**
  - `curl https://leadflow-ai-five.vercel.app/api/billing/create-checkout-session` returns `{ sessionId, clientSecret }` (HTTP 200)
  - Webhook endpoint registered in Stripe Dashboard returns HTTP 200 for test event
- **Test:** Agent can click "Upgrade to Pro" button and see Stripe checkout page (not 503 error)

#### Task 1.2: Wire "Start Free Trial" CTA to Landing Page
- **What:** Add visible "Start Free Trial" button to hero section (above fold) and link to `/signup/trial`
- **Acceptance Criteria:**
  - Hero section button visible at 1280px and 375px viewports
  - Clicking button navigates to `/signup/trial`
  - E2E test: Load landing page → click CTA → form appears (pass/fail)
- **Test:** Manually verify button is above fold and clickable on desktop and mobile

#### Task 1.3: Auto-Trigger Onboarding Wizard Post-Signup
- **What:** When agent lands on `/dashboard/onboarding`, automatically launch wizard overlay if `onboarding_completed = false`
- **Acceptance Criteria:**
  - New agent navigates to `/dashboard/onboarding` → wizard overlay appears within 1s
  - Wizard shows "Step 1: Connect FUB" form
  - Wizard can be closed and re-launched from dashboard menu
- **Test:** E2E: signup → trial form → onboarding page → wizard appears

#### Task 1.4: Fix Database Table Mismatches
- **What:** Fix all queries in SMS/email paths to use correct table (`real_estate_agents` not `agents`)
- **Routes to fix:**
  - `/api/agents/satisfaction-ping` — uses wrong table
  - `/api/cron/follow-up` — queries wrong table
  - `/api/webhooks/stripe` — uses `agent_id` instead of `user_id`
- **Acceptance Criteria:**
  - All routes return HTTP 200 (not 500)
  - SMS/email are delivered when triggered
  - No database errors in logs
- **Test:** Create test agent → trigger SMS send → verify logs show success

### Phase 2: Pilot Recruitment (Days 44-50, ~1 week)

**Goal:** Get 3 real agents into the system and measure trial → paid conversion  

**Tasks (for Marketing Agent):**

#### Task 2.1: Send Pilot Invites
- **What:** Use admin invite flow to send magic-link invites to 3 target real estate agents
- **Acceptance Criteria:**
  - 3 agents receive invitation emails
  - Agents can click magic link and activate accounts
  - 3 new records in `real_estate_agents` table with `plan_tier = trial`
  - Trial period: 14 days from signup
- **Test:** Manual verification — each agent receives email and can log in

#### Task 2.2: Onboarding Support & Monitoring
- **What:** Monitor pilot cohort as they onboard; provide live support for FUB connection and feature questions
- **Acceptance Criteria:**
  - Minimum 50% of agents complete onboarding (reach dashboard + sample leads visible)
  - Zero blocker bugs encountered during onboarding
  - Feedback documented for any UX friction points
- **Test:** Agent successfully connects FUB → sees sample leads → views AI SMS in dashboard

#### Task 2.3: Trial-to-Paid Conversion Campaign
- **What:** After agents hit "Aha moment" (see AI SMS response), send in-app prompt + email to upgrade to Pro
- **Acceptance Criteria:**
  - Minimum 1 agent converts to Pro or Team tier by Day 50
  - Stripe subscription created for converted agent
  - plan_tier updated in database to `pro` or `team`
  - MRR records updated to reflect new subscription
- **Test:** Agent upgrades → Stripe subscription created → plan_tier changes to `pro` → MRR = $149

### Phase 3: Instrumentation & Learning (Days 50-60)

**Goal:** Track conversion bottlenecks and iterate on onboarding  

**Tasks (for Analytics Agent):**

#### Task 3.1: Onboarding Telemetry Dashboard
- **What:** Build `/admin/funnel` page showing real-time progress of pilot agents through signup → onboarding → trial → paid
- **Acceptance Criteria:**
  - Dashboard shows: # agents at each step, % conversion rate, avg time to each step
  - Real-time updates (refresh every 30s)
  - Sortable by agent email and signup date
- **Metrics to track:**
  - Signup → Onboarding: % completed, avg time
  - Onboarding → Aha Moment: % reached, avg time
  - Aha Moment → Paid Conversion: % converted, avg time

#### Task 3.2: NPS & Satisfaction Feedback Loop
- **What:** Enable NPS survey on agent satisfaction to identify friction points
- **Acceptance Criteria:**
  - Agents see NPS popup on Day 3 of trial
  - Responses logged to database
  - Admin dashboard shows NPS score + open feedback
- **Metrics to track:**
  - NPS score (0-10)
  - Open feedback text from dissatisfied agents

---

## Acceptance Checks (Machine-Verifiable)

The following must be true for revenue recovery to be "complete":

```sql
UPDATE use_cases SET acceptance_checks = '[
  {
    "id": "stripe-secret-configured",
    "command": "curl -s https://leadflow-ai-five.vercel.app/api/billing/create-checkout-session | grep sessionId",
    "expected": "sessionId",
    "description": "Stripe API is accessible and returning checkout sessions"
  },
  {
    "id": "landing-page-cta-visible",
    "command": "curl -s https://leadflow-ai-five.vercel.app | grep -i 'start free trial'",
    "expected": "1",
    "description": "Landing page contains visible 'Start Free Trial' CTA"
  },
  {
    "id": "trial-form-accessible",
    "command": "curl -s https://leadflow-ai-five.vercel.app/signup/trial | grep -c 'email'",
    "expected": ">0",
    "description": "Trial signup form is deployed and accessible"
  },
  {
    "id": "onboarding-wizard-code-present",
    "command": "grep -r 'useEffect' product/lead-response/dashboard/app/dashboard/onboarding/page.tsx | grep -i wizard",
    "expected": "1",
    "description": "Wizard auto-trigger logic is implemented in onboarding page"
  },
  {
    "id": "real-agents-count",
    "command": "psql $LOCAL_PG_URL -c \"SELECT COUNT(*) FROM real_estate_agents WHERE email NOT LIKE '%@example.com' AND email NOT LIKE '%@leadflow-test.com' AND email NOT LIKE '%smoke-test%'\" | tail -1",
    "expected": ">=1",
    "description": "At least 1 real (non-test) agent in the system"
  },
  {
    "id": "paid-agents-count",
    "command": "psql $LOCAL_PG_URL -c \"SELECT COUNT(*) FROM real_estate_agents WHERE plan_tier IN ('pro', 'team', 'brokerage')\" | tail -1",
    "expected": ">=1",
    "description": "At least 1 agent has converted to paid tier"
  },
  {
    "id": "mrr-positive",
    "command": "psql $LOCAL_PG_URL -c \"SELECT SUM(mrr) FROM real_estate_agents WHERE plan_tier IN ('pro', 'team', 'brokerage')\" | tail -1",
    "expected": ">0",
    "description": "MRR is positive (at least 1 paid subscription exists)"
  }
]'::jsonb
WHERE id = 'uc-revenue-recovery-critical';
```

---

## Non-Actions (What PM Does NOT Do)

❌ **PM does NOT:**
- Write or review code
- Deploy to Vercel (that's Stojan's manual task)
- Send emails to pilot agents (that's Marketing's task)
- Build the wizard component (that's Dev's task)
- Configure Stripe credentials (that's Stojan's manual task)

✅ **PM DOES:**
- Define what success looks like (this document)
- Identify blockers and root causes
- Specify acceptance criteria (machine-verifiable)
- Create use cases in Supabase for Dev/Marketing/Analytics agents
- Monitor progress and flag risks

---

## Timeline & Milestones

| Date | Day | Milestone | Status |
|------|-----|-----------|--------|
| 2026-03-31 | 43 | PRD written, blockers identified | 🔵 In Progress (this PRD) |
| 2026-04-01 | 44 | Stripe configured in Vercel | ⏳ Awaiting |
| 2026-04-01 | 44 | Landing page CTA added + deployed | ⏳ Awaiting |
| 2026-04-02 | 45 | Wizard auto-trigger implemented | ⏳ Awaiting |
| 2026-04-02 | 45 | Database table mismatches fixed | ⏳ Awaiting |
| 2026-04-02 | 45 | **Infrastructure Unblocked** | ⏳ Awaiting |
| 2026-04-03 | 46 | Pilot invites sent to 3 agents | ⏳ Awaiting Stojan approval |
| 2026-04-07 | 50 | **First paid conversion** (target) | ⏳ Awaiting |
| 2026-04-17 | 60 | **$1K+ MRR, 10+ agents** (checkpoint) | ⏳ Awaiting |
| 2026-05-30 | 90 | **$20K MRR target** (final goal) | ⏳ Awaiting |

---

## Key Decisions for Stojan

### Decision 1: Pilot Recruitment Go-Ahead
**Question:** Approve sending magic-link invites to 3 real estate agents?  
**Current Status:** Admin invite flow is built and tested, ready to use  
**Impact:** If YES → revenue acquisition begins immediately, agent feedback begins flowing  
**Impact:** If NO → every day of delay = 1 fewer usage days per agent = lower conversion likelihood  
**Recommendation:** YES — launch pilot immediately (Day 44), don't wait  

### Decision 2: Stripe Configuration
**Question:** Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to Vercel production?  
**Current Status:** Stripe account ready, just need env var configuration  
**Impact:** If YES → trial agents can convert to paid → revenue possible  
**Impact:** If NO → all checkout attempts fail → $0 revenue guaranteed  
**Recommendation:** YES — do this immediately (1 minute task in Vercel Dashboard)  

### Decision 3: Pilot Target Agents
**Question:** Who are the 3 target agents to invite to pilot?  
**Current Status:** Admin invite flow ready, just need email list  
**Impact:** If high-quality agents → likelihood of conversion and referrals high  
**Impact:** If random agents → higher churn, slower feedback loop  
**Recommendation:** Select 3 agents with known lead volume and FUB setup already in place  

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Agents churn after 14-day trial | Medium | Lost conversion, zero LTV data | In-app/email prompts to upgrade before Day 14, same-day support for onboarding issues |
| Stripe webhook fails silently | Low | Subscription created but not recorded in DB | Add logging to webhook handler, QC agent tests webhook with mock events |
| Wizard launch fails for some agents | Medium | Agent skips onboarding, misses aha moment | E2E test covers auto-launch, fallback manual trigger in dashboard menu |
| Agent can't connect FUB | Medium | Can't see real leads, no aha moment | Pre-flight checklist on onboarding page, live support contact info |
| Product gets negative feedback | Low | Word-of-mouth damage, referrals dry up | Daily monitoring of NPS + feedback, quick fixes for confirmed bugs |

---

## Definition of Done

This PRD is **COMPLETE** when:

✅ All acceptance checks pass (8/8 green)  
✅ Stripe is configured and checkout works (Task 1.1 complete)  
✅ Landing page CTA is visible (Task 1.2 complete)  
✅ Wizard auto-launches (Task 1.3 complete)  
✅ Database queries are fixed (Task 1.4 complete)  
✅ 3 real agents have been invited (Task 2.1 complete)  
✅ At least 1 agent has converted to paid (Task 2.3 complete)  
✅ MRR > $0 (system is revenue-generating)  

---

## Version History

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | 2026-03-31 | PM | Initial revenue recovery specification |

