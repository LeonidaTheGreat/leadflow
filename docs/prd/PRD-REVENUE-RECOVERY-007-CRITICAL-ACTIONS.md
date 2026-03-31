# PRD: Revenue Recovery — 7-Day Critical Action Plan

**Status:** Specification Ready for Execution  
**Version:** 007 (Simplified Action-Focused)  
**Date:** 2026-03-30  
**Day:** 47 of 90 (52% complete)  
**Current MRR:** $0  
**Revenue Goal:** $20,000 MRR  
**Gap:** $9,670 behind expected trajectory ($10,000 target - $0 actual)  
**Days Remaining:** 43  

---

## Executive Summary

LeadFlow is critically behind revenue target with 43 days to reach $20K MRR. The product is technically complete but **three environmental blockers prevent any revenue from flowing**:

1. **Pilot recruitment not executed** (waiting 17+ days for approval)
2. **Email verification broken** in production (RESEND_API_KEY missing from Vercel)
3. **Stripe payment processing broken** in production (API keys missing from Vercel)

**This PRD defines THREE executable actions (Days 1-7) that collectively unlock revenue**. Each action is a Vercel environment variable update, admin approval, or 2-hour implementation task. No architectural changes needed.

---

## The Revenue Bottleneck: What We Know

### Funnel Conversion Rates (Current State)

| Stage | Status | Current Volume | Target | Gap | Why |
|-------|--------|---|---|---|---|
| **Awareness** | ✅ | TBD | N/A | N/A | Landing page deployed |
| **Landing → Signup** | ✅ | ~5 (all test) | 10/week | 0 | No real traffic sources yet |
| **Signup → Email Verify** | 🔴 | 3/5 verified | 100% | 40% | Email delivery broken |
| **Verify → Trial Dashboard** | 🔴 | 0 activated | 100% | 100% | Wizard doesn't auto-trigger |
| **Trial → Paid Conversion** | 🔴 | 0/3 → paid | 20%+ | 0 | Stripe broken + no nudges |
| **Paying Customers** | ❌ | 0 | 10-20 by D47 | 100% | **CRITICAL** |

### Why No Revenue Yet

- **No real pilot agents recruited** — The admin invite tool exists but hasn't been executed. All 5 signup attempts are internal QC or test accounts.
- **Email verification gates 40% of signups** — Trial signups complete but can't verify email (RESEND_API_KEY not in Vercel production). These agents are stuck at "email verification pending."
- **Trial dashboard shows zero value** — Agents who do verify see an empty dashboard with no sample data and no auto-triggered setup wizard. They abandon immediately.
- **Stripe checkout blocked** — STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET not in Vercel production. All billing endpoints return HTTP 503. Even agents who want to pay cannot.

---

## Three Critical Actions (Days 1-7)

### ACTION 1: Approve Pilot Recruitment (Day 1, <1 hour decision time)

**Responsibility:** Stojan (decision maker)  
**Effort:** <1 hour to approve + execute  
**Expected Outcome:** 3 real pilot agents onboarded  
**Revenue Impact:** +$450-1,200/mo  

#### What
Stojan approves pilot recruitment and sends first 3 invite emails via the existing /admin/invite tool to real estate agents. These become the first real-world users.

#### Current State
- ✅ Admin invite tool built and tested (/admin/invite endpoint)
- ✅ Marketing campaign copy ready
- ✅ Email template ready (Resend)
- ✅ Pilot agents tracked in pilot_invites table
- ❌ **No decision made** — action items waiting since Feb 25 (17+ days)

#### Implementation
1. **Stojan decision:** Message to orchestrator: "Go ahead with pilot recruitment"
2. **Day 1-2:** Marketing sends invite emails to 3 real estate agents
   - Invites go to: agent@example.com (use real contacts)
   - Email includes: personalized invite, "You're invited to join the LeadFlow AI pilot," link to /pilot-invite?token=...
   - Each agent receives a 7-day magic link (no password required initially)
3. **Day 2-3:** Agents click invite link, auto-login to /dashboard/onboarding
4. **Day 3-7:** Agents complete wizard, connect FUB, get first SMS responses

#### Success Criteria
- [ ] 3+ real_estate_agents records created (not test emails)
- [ ] email_verified = true for all 3
- [ ] All 3 agents have plan_tier = 'pilot'
- [ ] All 3 agents logged in at least once (agent_sessions table)
- [ ] At least 1 agent completed FUB integration step

#### If Approved
Once approved, **this action has no further blockers**. All tools exist. Marketing can execute immediately. The product will have real users for the first time.

#### Revenue Math
- Tier: Pilot (free for 60 days, then convert to paid)
- Expected conversion: 60% → 2 agents convert to Pro ($149/mo) or Team ($399/mo)
- Conservative: 2 agents × $149 = +$298/mo
- Optimistic: 2 agents × $399 = +$798/mo
- Expected: +$450-600/mo within 30 days of pilot start

---

### ACTION 2: Fix Email Delivery in Vercel (Day 1-2, <1 hour)

**Responsibility:** Dev + Stojan (Vercel access)  
**Effort:** 30 minutes to execute  
**Expected Outcome:** All signup confirmation emails deliver  
**Blocks:** None (standalone fix)  

#### What
Add `RESEND_API_KEY` environment variable to Vercel production. This enables email delivery for signup confirmation, password reset, and trial-to-paid conversion sequences.

#### Current State
- ✅ Resend library integrated into product
- ✅ RESEND_API_KEY configured in `.env` (local works)
- ✅ All email templates ready (signup, verify, password reset, trial alerts)
- ❌ **RESEND_API_KEY NOT set in Vercel production**
- Result: All email operations silently fail; agents see "check your email" but nothing arrives

#### Why This Matters
Email verification gates signup completion. **40% of current signups are stuck** because they cannot receive verification emails.

#### Implementation (Dev + Stojan, 30 minutes)
1. **Step 1: Get the API key (5 min)**
   - Stojan: Log into Resend dashboard (resend.io)
   - Copy the live API key (starts with `re_`)
   
2. **Step 2: Add to Vercel (10 min)**
   - Stojan: Open Vercel dashboard → leadflow-ai project → Settings → Environment Variables
   - Add new variable:
     - **Key:** `RESEND_API_KEY`
     - **Value:** `re_[your-api-key]`
     - **Environments:** Select "Production"
   - Also verify:
     - `FROM_EMAIL`: Should be an authenticated sender domain (e.g., `hello@leadflow-ai.com`)
     - Add if not present: `FROM_EMAIL = noreply@leadflow-ai.com`

3. **Step 3: Redeploy (10 min)**
   - In terminal:
     ```bash
     cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard
     vercel --prod --yes
     ```
   - Wait for deployment to complete (~2 minutes)

4. **Step 4: Test (5 min)**
   - **Manual test:** Sign up with a real email address (e.g., stojan@example.com)
   - Check email inbox for verification email
   - Click link, verify email in dashboard
   - Verify success: `real_estate_agents.email_verified = true` in Supabase

#### Success Criteria
- [ ] RESEND_API_KEY is set in Vercel production environment
- [ ] FROM_EMAIL is set (verified Resend sender)
- [ ] New signup receives verification email within 30 seconds
- [ ] Verification email link works (email_verified flag flips to true)
- [ ] No /api/lead-capture 500 errors related to email

#### Impact
- **Unblocks 40% of stuck signups** (agents now complete email verification)
- **Enables pilot conversion emails** (trial-to-paid nudge sequence depends on working email)
- **Enables password reset flow** (agents can recover access)

---

### ACTION 3: Fix Stripe Payment Processing in Vercel (Day 2-3, <1 hour)

**Responsibility:** Dev + Stojan (Stripe/Vercel access)  
**Effort:** 45 minutes to execute  
**Expected Outcome:** All checkout and subscription operations work  
**Blocks:** None (standalone fix)  

#### What
Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Vercel production. This enables real transaction processing for paid plans (Starter $49, Pro $149, Team $399).

#### Current State
- ✅ Stripe account and products created (verified in Stripe Dashboard)
- ✅ Checkout API functional locally
- ✅ Webhook handler functional locally
- ❌ **STRIPE_SECRET_KEY NOT set in Vercel production**
- ❌ **STRIPE_WEBHOOK_SECRET NOT set in Vercel production**
- Result: All billing endpoints return HTTP 503 `{"error":"Stripe not configured"}`; zero transactions possible

#### Why This Matters
Without Stripe keys, **no revenue is possible**. Even agents who complete trial and want to upgrade cannot pay.

#### Implementation (Dev + Stojan, 45 minutes)

##### Part A: Get Stripe Keys (10 min)
1. **Stojan:** Log into Stripe Dashboard (stripe.com)
2. **For STRIPE_SECRET_KEY:**
   - Go to: Developers → API Keys
   - Copy: Secret Key (starts with `sk_live_` or `sk_test_`)
   - Note: Use **live keys** for production transactions, **test keys** for testing
3. **For STRIPE_WEBHOOK_SECRET:**
   - Go to: Developers → Webhooks
   - Find the endpoint URL: `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`
   - Copy the Signing Secret (starts with `whsec_`)
   - **If endpoint doesn't exist, create it:**
     - Click "Add endpoint"
     - URL: `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`
     - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
     - Copy the Signing Secret that is generated

##### Part B: Add to Vercel (15 min)
1. **Stojan:** Open Vercel dashboard → leadflow-ai project → Settings → Environment Variables
2. **Add variables:**
   - **Key:** `STRIPE_SECRET_KEY` | **Value:** `sk_live_...` | **Environment:** Production
   - **Key:** `STRIPE_WEBHOOK_SECRET` | **Value:** `whsec_...` | **Environment:** Production
3. **Verify existing variables:**
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` should exist and be valid
   - All `STRIPE_PRICE_*` variables should exist (price IDs, e.g., `price_1A...`)
   - Check against Stripe Dashboard → Products to ensure IDs match

##### Part C: Redeploy (10 min)
```bash
cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard
vercel --prod --yes
```

##### Part D: Test (10 min)
1. **Test checkout creation:**
   - Curl or Postman:
     ```
     POST https://leadflow-ai-five.vercel.app/api/billing/create-checkout
     Headers: { "Content-Type": "application/json" }
     Body: { "agentId": "test-agent-uuid", "tier": "pro", "email": "stojan@test.com" }
     ```
   - Expected: HTTP 200 with `{ "sessionId": "...", "url": "https://checkout.stripe.com/..." }`
   - If 503, Stripe keys are still missing

2. **Test webhook processing:**
   - Stripe Dashboard → Webhooks → Events
   - Send a test `checkout.session.completed` event
   - Check Vercel logs: event should be processed (no signature errors)
   - Check Supabase: `subscriptions` table should have a new row (if webhook succeeds)

#### Success Criteria
- [ ] STRIPE_SECRET_KEY is set in Vercel production
- [ ] STRIPE_WEBHOOK_SECRET is set in Vercel production
- [ ] POST /api/billing/create-checkout returns HTTP 200 with valid Stripe session URL (not 503)
- [ ] Stripe test card (4242 4242 4242 4242) processes successfully in checkout
- [ ] Webhook endpoint in Stripe Dashboard shows successful deliveries (green checkmarks)
- [ ] No HTTP 503 errors on /api/stripe/* endpoints

#### Impact
- **Enables all paid tiers** (Starter, Pro, Team, Brokerage)
- **Unblocks trial→paid conversion** (agents can now upgrade)
- **Enables billing portal** (agents can manage subscriptions, update payment methods)
- **Enables revenue tracking** (MRR, churn, expansion revenue)

---

## Secondary Actions (Days 8-21): Trial Activation Sequence

Once Actions 1-3 are complete, the following tasks unlock trial→paid conversion:

### Action 4: Trial Activation (5 days) — AUTO-TRIGGER WIZARD + SAMPLE LEADS
- **What:** Make trial dashboard show sample leads + auto-launch setup wizard
- **Why:** Trial users currently land on empty dashboard and abandon
- **Tasks:**
  - Add 3 demo leads to trial dashboard on first login
  - Auto-redirect new agents to /dashboard/onboarding wizard
  - Build simulator.tsx (the aha moment UI)
  - Test end-to-end trial activation flow
- **Expected:** Trial users see value in <2 min, activation rate increases 50%+

### Action 5: Trial Nudge Sequence (3 days) — EMAIL + IN-APP COUNTDOWN
- **What:** Send automated emails at day 10, 13, 14 of trial + in-app countdown banner
- **Why:** Email increases trial→paid conversion 20-40% (industry standard)
- **Tasks:**
  - Create trial countdown email templates
  - Create cron job to send emails at key milestones
  - Add countdown banner to dashboard
  - Verify email delivery and link tracking
- **Expected:** 20%+ of trial users convert to paid

### Action 6: Self-Serve Upgrade CTA (2 days) — DASHBOARD UPGRADE BUTTON
- **What:** Add prominent "Upgrade to Pro" button on trial dashboard
- **Why:** Removes friction from trial→paid upgrade path
- **Tasks:**
  - Add upgrade button to dashboard header
  - Wire button to POST /api/billing/create-checkout
  - Verify Stripe checkout loads on click
- **Expected:** Upgrade CTA reduces friction by 50%

---

## Implementation Order & Timeline

### Days 1-7 (Critical Path)
| Day | Action | Owner | Effort | Status |
|-----|--------|-------|--------|--------|
| **1** | Pilot Recruitment Approval | Stojan | <1h decision | BLOCKER |
| **1-2** | Email Delivery (Vercel env var) | Dev + Stojan | 30 min | INDEPENDENT |
| **2-3** | Stripe Keys (Vercel env var) | Dev + Stojan | 45 min | INDEPENDENT |
| **3-7** | Marketing Executes Invites | Marketing | 2 hours | Awaits Stojan approval |
| **3-7** | QC Tests All Flows | QC | 4 hours | Awaits Actions 1-3 |

### Days 8-21 (Enablement Path)
| Phase | Days | Task | Expected MRR Impact |
|-------|------|------|---|
| Trial Activation | 8-12 | Sample leads + wizard auto-trigger + simulator | Enables conversion |
| Email Sequence | 13-16 | Trial countdown + upgrade nudges | +2-4K MRR (20-40 agents) |
| Upgrade CTA | 17-21 | Dashboard upgrade button + marketing campaign | +3-5K MRR (30-50 agents) |

---

## Definition of Done

Each action is **complete** when:

### Action 1 (Pilot Recruitment)
- [ ] Stojan sends approval message: "Go ahead with pilot recruitment"
- [ ] Marketing sends 3+ invite emails
- [ ] 3+ real_estate_agents records created with email_verified=true
- [ ] At least 1 agent completes first login

### Action 2 (Email Delivery)
- [ ] RESEND_API_KEY is set in Vercel production environment
- [ ] New signup receives verification email within 30 seconds
- [ ] Email verification link works (agent can verify email)
- [ ] No /api/lead-capture 500 errors from email service

### Action 3 (Stripe Payment)
- [ ] STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set in Vercel
- [ ] POST /api/billing/create-checkout returns HTTP 200 (not 503)
- [ ] Stripe test checkout succeeds with test card
- [ ] Webhook processes checkout.session.completed without signature errors

---

## Revenue Math: Path to $20K MRR

### Conservative Scenario (Days 7-47)
| Milestone | Timing | Agents | Avg Tier | MRR | Total |
|-----------|--------|--------|----------|-----|-------|
| Pilot agents convert | Day 10 | 2 | Pro ($149) | $298 | $298 |
| First marketing cohort (10 agents) | Day 21 | 10 | Starter ($49) | $490 | $788 |
| Second marketing cohort (15 agents) | Day 35 | 15 | Pro ($149) | $2,235 | $3,023 |
| Third cohort + word-of-mouth (25 agents) | Day 47 | 25 | Team avg ($250) | $6,250 | $9,273 |
| **Total at Day 47** | | **52 agents** | | | **$9,273** |

**Gap:** $20,000 - $9,273 = $10,727 (still short, but momentum building)  
**Path to $20K:** Requires 80-100 agents by Day 60, achievable with marketing + word-of-mouth

### Aggressive Scenario (Days 7-47)
| Milestone | Timing | Agents | Avg Tier | MRR | Total |
|-----------|--------|--------|----------|-----|-------|
| Pilot agents (3 agents, 100% convert) | Day 10 | 3 | Team avg ($350) | $1,050 | $1,050 |
| First marketing push (20 agents) | Day 21 | 20 | Pro ($149) | $2,980 | $4,030 |
| Second cohort (30 agents) | Day 35 | 30 | Pro/Team ($250) | $7,500 | $11,530 |
| Third cohort (20 agents) | Day 47 | 20 | Team ($399) | $7,980 | $19,510 |
| **Total at Day 47** | | **73 agents** | | | **$19,510** |

**Outcome:** Within 10% of $20K goal, full achievement likely by Day 50-55

---

## Success Criteria (Acceptance Criteria)

This PRD is **complete** when:

1. ✅ **Pilot recruitment approved** (Stojan sends "go ahead" message)
2. ✅ **Email delivery working** (signup emails deliver, email_verified flag flips to true)
3. ✅ **Stripe payment processing** (checkout creates sessions, webhooks process subscriptions)
4. ✅ **First 3 pilot agents onboarded** (plan_tier != null, at least 1 session, > 0 leads processed)
5. ✅ **MRR tracker shows >$0** (subscriptions table has rows, MRR calculation > $0)

---

## Appendix: Quick Reference for Execution

### RESEND_API_KEY
- **Where:** Resend.io dashboard
- **What:** Copy API key (starts with `re_`)
- **Where to add:** Vercel → leadflow-ai project → Settings → Environment Variables
- **Redeploy:** `cd product/lead-response/dashboard && vercel --prod --yes`

### STRIPE_SECRET_KEY
- **Where:** Stripe.com dashboard → Developers → API Keys
- **What:** Copy Secret Key (starts with `sk_live_` or `sk_test_`)
- **Where to add:** Vercel → leadflow-ai project → Settings → Environment Variables
- **Redeploy:** `cd product/lead-response/dashboard && vercel --prod --yes`

### STRIPE_WEBHOOK_SECRET
- **Where:** Stripe.com dashboard → Developers → Webhooks
- **What:** Copy Signing Secret for endpoint `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`
- **Where to add:** Vercel → leadflow-ai project → Settings → Environment Variables
- **Redeploy:** `cd product/lead-response/dashboard && vercel --prod --yes`

### Test Commands
```bash
# Test email delivery (after RESEND_API_KEY added)
curl -X POST https://leadflow-ai-five.vercel.app/api/lead-capture \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","firstName":"Test"}'

# Test Stripe checkout (after STRIPE_SECRET_KEY added)
curl -X POST https://leadflow-ai-five.vercel.app/api/billing/create-checkout \
  -H "Content-Type: application/json" \
  -d '{"agentId":"test-uuid","tier":"pro","email":"test@example.com"}'
# Expected response: { "sessionId": "...", "url": "https://checkout.stripe.com/..." }
```

---

## Notes for Orchestrator

- **This PRD consolidates previous analysis** into 3 focused, executable actions
- **No architectural changes** — only environment variable updates and deployment
- **All blockers are non-technical** — approval (pilot recruitment) and configuration (Vercel env vars)
- **Parallel execution recommended** — Actions 2-3 can execute simultaneously while waiting for Action 1 approval
- **QC validation required** — After each action, QC should verify the success criteria above
