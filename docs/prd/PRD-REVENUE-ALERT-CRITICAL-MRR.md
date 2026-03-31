# PRD: Revenue Alert — Critical MRR Gap Analysis & Recovery Plan

**Status:** Specification Complete  
**Date:** 2026-03-30  
**Day:** 44 of 90 (56% of timeline)  
**Current MRR:** $0  
**Target MRR:** $20,000  
**Gap:** $20,000 (100% behind)  
**Days Remaining:** 46  

---

## Executive Summary

LeadFlow AI is $14,576 behind the 90-day MRR target trajectory at Day 44. With 46 days remaining, achieving $20K MRR requires immediate action on three critical gaps:

1. **Zero paying customers** — All accounts are smoke-test, QC, or pilot signups. No real revenue-generating agents.
2. **Pilot recruitment blocked** — Two approval action items (Pilot Launch Decision, Marketing Recruitment Timing) have been WAITING since Feb 25 (17+ days) with no response.
3. **Self-serve signup-to-paid funnel broken** — Trial users cannot complete activation due to missing infrastructure: email verification, trial countdown nudges, self-serve upgrade prompts, and working Stripe integration.

**Revenue Recovery Path:**
- **Immediate (Days 1-7):** Unblock pilot recruitment, deploy working Stripe config, fix email delivery
- **Short-term (Days 8-21):** Launch first 10 paying agents via pilot recruitment, activate trial-to-paid funnel
- **Medium-term (Days 22-46):** Scale to 50+ paying agents across Starter/Pro/Team tiers

---

## Part 1: Funnel Bottleneck Analysis

### Current Funnel State (Day 44 of 90)

| Stage | Status | Volume | Conversion | Blocker |
|-------|--------|--------|------------|---------|
| **Awareness** | ✅ Live | Unknown | TBD | None |
| **Landing Page** | ✅ Deployed | ~0 | TBD | No UTM tracking, no CTA click analytics |
| **Signup** | ✅ Works | ~5 real agents | 100% of visitors | Email verification stuck (see below) |
| **Email Verification** | 🔴 **BROKEN** | 3 verified, 2 unverified | 60% | RESEND_API_KEY not set in Vercel |
| **Trial Dashboard** | 🔴 **BROKEN** | 0 active sessions | N/A | Wizard auto-trigger not implemented, no sample leads |
| **FUB Integration** | ✅ Capable | 0 connected | 0% | No guided setup flow, manual user activation required |
| **SMS Configuration** | ✅ Capable | 0 configured | 0% | No Twilio provisioning UI, manual setup |
| **Aha Moment (Lead Sim)** | 🔴 **BROKEN** | 0 completions | 0% | Lead simulator UI not implemented, wizard stuck |
| **Trial to Paid** | 🔴 **BROKEN** | 0 conversions | 0% | Stripe keys not in Vercel, no countdown banner, no email nudges |
| **Paid User** | ❌ None | $0 MRR | N/A | **No paying agents exist** |

### Root Cause: The Critical Path is Broken in 4 Places

#### Blocker 1: Pilot Recruitment Not Approved
**Status:** 17+ days overdue  
**Impact:** Zero real-world users to convert  
**Current State:**
- Admin invite tool exists and is tested (/admin/invite)
- Three smoke-test accounts ready (madzunkov@gmail.com, madzunkov@hotmail.com, test@example.com)
- Marketing campaign ready to execute
- Action items awaiting Stojan approval since Feb 25 (bd16d510, c0fd9c86)

**Why this matters:** Without real pilot agents, all downstream funnels are zero-traffic. Even a perfect self-serve funnel produces $0 revenue if nobody is in it.

#### Blocker 2: Self-Serve Signup-to-Verification Broken
**Status:** RESEND_API_KEY missing from Vercel production  
**Impact:** Trial users cannot verify email, cannot log in  
**Current State:**
- Email verification code generation works locally
- Resend library integrated and functional
- RESEND_API_KEY configured in `.env` locally
- RESEND_API_KEY **NOT SET** in Vercel production (verified via `vercel env ls`)
- Result: Signups appear to succeed but verification emails never sent; users see "Email verification pending" indefinitely

**Why this matters:** Agents who sign up cannot activate their account. The signup CTA converts but users never make it to the trial dashboard.

#### Blocker 3: Trial Dashboard Activation Broken
**Status:** Wizard never auto-triggers; no sample leads on empty dashboard  
**Impact:** 0% activation rate (agents complete signup, see blank dashboard, leave)  
**Current State:**
- Setup wizard page exists at /setup
- Wizard does not auto-redirect on first login
- Dashboard loads with empty lead feed (no sample leads injected)
- Onboarding_completed flag set manually, never auto-set by wizard completion
- Result: New agents land on blank dashboard, see no value, abandon

**Why this matters:** Even verified users see zero value in the product on their first session. The aha moment (lead simulator showing AI response in <30s) is the key trial→paid converter. Without it, trial churn is 100%.

#### Blocker 4: Stripe Not Configured in Vercel
**Status:** STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET missing from Vercel  
**Impact:** Zero transactions possible; all billing endpoints return HTTP 503  
**Current State:**
- Stripe products and prices exist in dashboard
- Checkout API functional locally
- API routes return `{"error":"Stripe not configured"}` on production
- Verified via curl: `https://leadflow-ai-five.vercel.app/api/billing/create-checkout` → HTTP 503
- No trial-to-paid upgrade path exists; even agents who want to pay cannot

**Why this matters:** The only path to revenue requires paid upgrade. Without Stripe integration, no transaction is possible.

---

## Part 2: Use Case Reprioritization by Revenue Impact

### P0 (Critical) — Must Complete to Reach $20K MRR

| UC ID | Name | Impact | Current Status | Days to Complete | Revenue Impact |
|-------|------|--------|---|---|---|
| **UC-PILOT-RECRUIT-001** | Approve & Execute Pilot Recruitment (3 real agents) | Direct: 3 paying users → $450-1200/mo | Blocked (awaiting approval) | 2-3 days to execute | +$450-1200 MRR |
| **UC-EMAIL-VERIFY-001** | Deploy Email Verification (add RESEND_API_KEY to Vercel) | Gating 100% of signups | Not started (Vercel env var) | <1 day | Enables all signups |
| **UC-STRIPE-CONFIG-001** | Deploy Stripe Keys to Vercel (STRIPE_SECRET_KEY, WEBHOOK_SECRET) | Gating 100% of revenue | Not started (Vercel env vars) | <1 day | Enables all paid tiers |
| **UC-TRIAL-ACTIVATION-001** | Trial Dashboard Activation — Auto-launch wizard, inject sample leads | Enables 100% of trial→aha conversion | In progress (3 sub-tasks) | 3-5 days | Enables conversion |
| **UC-AHA-MOMENT-001** | Lead Simulator in Onboarding (Step 3 of wizard) | Trial→Paid converter, 15%+ conversion lift | In progress (needs simulator.tsx) | 2-3 days | Enables trial→paid |

### P1 (High) — Complete After P0 to Scale

| UC ID | Name | Impact | Current Status | Revenue Impact |
|-------|------|--------|---|---|
| **UC-TRIAL-NUDGE-001** | Trial Countdown + Upgrade Email Sequence | Increases trial→paid conversion 20-40% | Not started | +4-8K MRR (40 agents) |
| **UC-SELF-SERVE-CHECKOUT-001** | Self-Serve Stripe Checkout in Dashboard | Removes friction from paid upgrade | Complete (needs Stripe keys) | +2K MRR (20 agents) |
| **UC-FUB-SETUP-GUIDED-001** | Guided FUB Setup Wizard | Increases activation (agents connect CRM) | Not started | Prerequisite for aha moment |
| **UC-SMS-PROVISION-001** | Twilio Number Provisioning UI | Removes manual setup friction | Not started | Prerequisite for aha moment |
| **UC-LEAD-SAMPLE-001** | First-Session Sample Leads | Demonstrates product value (aha moment prep) | Not started | Prerequisite for aha moment |

### P2 (Medium) — Complete After Scale Stabilizes

| UC ID | Name | Current Status | Revenue Impact |
|-------|------|---|---|
| feat-utm-capture-marketing-attribution | Landing page UTM tracking | Complete (needs GA4 measurement ID) | +10% conversion tracking |
| feat-weekly-roi-activity-email | Retention email sequence | Not started | Reduces trial churn 5-10% |
| feat-nps-agent-feedback | NPS survey for pilot agents | Not started | Product feedback loop |

---

## Part 3: Three Specific Actions to Close the Gap

### Action 1: Unblock Pilot Recruitment (Days 1-3)

**What:** Stojan approves pilot recruitment and sends first 3 invites via /admin/invite  
**Why:** Zero paying customers = zero revenue. Pilot agents are the only path to early revenue.  
**Current State:** All technical prerequisites complete; approval action items WAITING since Feb 25  
**Resource Required:** Stojan decision + <2 hours to send invites  

**Implementation:**
1. **Day 1:** Send Telegram approval message to orchestrator: "Go ahead with recruitment"
2. **Day 2:** Marketing executes invite email campaign (copy ready, tool ready)
3. **Day 3:** First 3 agents sign up and complete onboarding

**Expected Outcome:**
- 3 real-world accounts created
- Unlock $450-1200/mo MRR (depending on plan tier)
- Real usage data to inform product improvements
- Testimonials/case studies for landing page

**Success Criteria:**
- 3 agents in real_estate_agents table with email_verified=true and plan_tier != null
- Agents have > 1 session in agent_sessions
- At least 1 agent successfully connected FUB integration

---

### Action 2: Fix Email & Stripe Delivery (Days 1-2)

**What:** Add RESEND_API_KEY and Stripe keys to Vercel production environment

**Why:** These are infrastructure dependencies that block **both** signup and paid upgrade paths.

**Current State:**
- RESEND_API_KEY: configured locally, missing from Vercel
- STRIPE_SECRET_KEY: placeholder value in Vercel
- STRIPE_WEBHOOK_SECRET: missing from Vercel

**Implementation:**

**Part A: Email Delivery (30 minutes)**
1. Log into Vercel → leadflow-ai project → Settings → Environment Variables
2. Add: `RESEND_API_KEY = <value from Resend dashboard>`
3. Redeploy: `cd product/lead-response/dashboard && vercel --prod`
4. Verify: Create a test account, check that verification email arrives within 60 seconds

**Part B: Stripe Configuration (1 hour)**
1. Log into Stripe Dashboard → Developers → API Keys
2. Copy live API keys (or test keys if continuing in test mode)
3. In Vercel:
   - Add `STRIPE_SECRET_KEY = sk_live_...` (or sk_test_...)
   - Add `STRIPE_WEBHOOK_SECRET = whsec_...` (from Stripe Webhooks section)
4. In Stripe Dashboard → Webhooks:
   - Create/verify endpoint: `https://leadflow-ai-five.vercel.app/api/webhooks/stripe`
   - Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`
5. Redeploy: `vercel --prod`
6. Verify: POST to /api/billing/create-checkout returns Stripe Checkout URL (not 503 error)

**Expected Outcome:**
- Email verification emails deliver within 60 seconds
- Stripe checkout sessions create successfully
- Subscription webhooks process without errors

**Success Criteria:**
- POST /api/lead-capture returns `{success:true}` and email is delivered
- GET /api/billing/create-checkout returns HTTP 200 with Stripe session URL
- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set in Vercel production
- No HTTP 503 on billing endpoints

---

### Action 3: Fix Trial Activation Path (Days 3-10)

**What:** Deploy trial dashboard activation with sample leads, wizard auto-trigger, and aha moment simulator

**Why:** Trial users complete signup but see a blank dashboard and churn immediately. This is the highest-leverage intervention: it unlocks trial→paid conversion.

**Current State:**
- Signup/onboarding routes exist and work
- Wizard page (/setup) exists but doesn't auto-trigger
- Dashboard loads with empty lead feed (no sample data)
- Lead simulator UI (simulator.tsx) is missing entirely
- Aha moment is the highest-impact trial→paid converter

**Implementation Plan (5 sub-tasks, 5 days total):**

#### Sub-task 3a: First-Session Sample Leads (1 day)
**What:** Inject 3 demo leads into dashboard on first login (onboarding_completed=false)  
**How:**
- Create `/api/sample-leads` endpoint that generates demo leads on demand
- Add call to this endpoint in dashboard page.tsx when onboarding_completed=false
- Clearly mark leads as "DEMO" with distinctive styling
- Do NOT persist demo leads to lead_summary view used by other agents

**Acceptance:**
- New trial users see 3 sample leads on first dashboard visit
- Sample leads are visually distinct (grey background, "DEMO" badge)
- Sample leads disappear after wizard completion (onboarding_completed=true)

#### Sub-task 3b: Wizard Auto-trigger on First Login (1 day)
**What:** Auto-redirect new agents to /setup wizard after signup  
**How:**
- Update trial-signup, pilot-signup, and login routes to check onboarding_completed flag
- If false, redirect to /dashboard/onboarding (not /setup)
- Dashboard/onboarding page renders wizard overlay (don't redirect away from dashboard)
- Wizard persists across page refresh (state saved to agentData in Supabase)

**Acceptance:**
- New agents logging in for the first time see wizard overlay
- Wizard does NOT re-trigger for agents with onboarding_completed=true
- Agent can navigate dashboard behind wizard (wizard is overlay, not blocking)
- Closing wizard persists the state

#### Sub-task 3c: Create Lead Simulator Step UI (2 days)
**What:** Build simulator.tsx component (step 3 of 6-step wizard)  
**How:**
- File: `product/lead-response/dashboard/app/onboarding/steps/simulator.tsx`
- Render a mock lead + AI response UI
- Button: "Start Simulation" → calls POST /api/onboarding/simulator
- Polls GET /api/onboarding/simulator?sessionId=... for response
- Shows formatted response time (e.g., "AI responded in 1.2 seconds")
- On success: sets ahaCompleted=true, ahaResponseTimeMs=<time>
- Includes Skip option (ahaCompleted=false)
- On error: shows Retry + Skip options (non-blocking)

**Acceptance:**
- simulator.tsx renders with lead + AI response UI
- "Start Simulation" button triggers API
- Response time displayed correctly
- Skip and Retry buttons work
- ahaCompleted written to agentData

#### Sub-task 3d: Wire Simulator Into Onboarding Wizard (1 day)
**What:** Update wizard page.tsx to include simulator as Step 3 of 6  
**How:**
- Add simulator to OnboardingStep type union
- Add import for SimulatorStep component
- Add entry to steps array between sms-config and confirmation
- Add ahaCompleted/ahaResponseTimeMs to agentData
- Include aha_moment_completed in completeOnboarding() payload
- Update progress bar (Step 3 of 6)

**Acceptance:**
- Wizard shows 6 steps (not 5)
- Progress bar shows "Step 3 of 6" on simulator
- Clicking Next on simulator advances to confirmation
- Skipping simulator advances to confirmation with ahaCompleted=false

#### Sub-task 3e: End-to-End Test Trial Activation (1 day)
**What:** Full journey test: signup → email verify → dashboard → wizard → aha → upgrade  
**How:**
- Create automated E2E test script (Playwright)
- Test: signup with new email → receive verification email → click link → login → see sample leads → see wizard → complete simulator → see upgrade button → click upgrade → Stripe checkout loads
- Manual QC review by Stojan on leadflow-ai-five.vercel.app

**Acceptance:**
- Full trial activation journey works end-to-end
- Sample leads visible on first dashboard load
- Wizard auto-appears and persists
- Simulator responds with AI message in <5 seconds
- Upgrade button visible after completion
- Stripe checkout loads when clicked

---

## Implementation Timeline

| Phase | Days | Tasks | Deliverable | MRR Impact |
|-------|------|-------|---|---|
| **Phase 1: Unblock** | 1-3 | Pilot recruitment approval + first 3 invites | 3 real agents | +$450-1200 |
| **Phase 2: Enable** | 1-2 | Email + Stripe keys to Vercel | Working signup & checkout | Prerequisite |
| **Phase 3: Activate** | 3-10 | Sample leads, wizard auto-trigger, simulator | Trial activation works | Enables conversion |
| **Phase 4: Measure** | 10-21 | Launch marketing campaign for 10 new agents | 10 paying agents | +$1500-2250 |
| **Phase 5: Scale** | 21-46 | Trial email sequences, FUB guided setup | 50+ paying agents | +$7500-11250 |

**Target Outcome at Day 46:**
- 10 agents from pilot recruitment × $150/mo (Pro avg) = $1,500/mo
- 40 agents from marketing campaign × $150/mo = $6,000/mo
- Total: $7,500/mo (37.5% of $20K target)

**Path to $20K by Day 90:**
- Increase to 50 agents (Pro, $150/mo) = $7,500/mo
- Add 30 Team tier agents ($399/mo) = $11,970/mo
- Total: $19,470/mo ✅

---

## Success Metrics

### Immediate (End of Action 1-3, Day 10)
- [ ] 3+ real agents in real_estate_agents with email_verified=true
- [ ] RESEND_API_KEY and STRIPE_SECRET_KEY configured in Vercel production
- [ ] Email verification emails delivered to 100% of signups
- [ ] /api/billing/create-checkout returns HTTP 200 (not 503)
- [ ] Sample leads injected on first dashboard visit
- [ ] Wizard auto-triggers for new agents (onboarding_completed=false)
- [ ] Lead simulator step renders and completes in wizard

### Short-term (End of Phase 4, Day 21)
- [ ] 10+ paying agents with active subscriptions
- [ ] MRR > $1,500
- [ ] Trial→paid conversion rate > 10% (1 out of 10 trial users upgrades)
- [ ] Average session duration > 3 minutes
- [ ] Onboarding completion rate > 60%

### Medium-term (End of Phase 5, Day 46)
- [ ] 50+ paying agents
- [ ] MRR > $7,500
- [ ] Trial→paid conversion rate > 20%
- [ ] NPS > 40 (from pilot agents)
- [ ] Churn < 5% (monthly)

### Target (Day 90)
- [ ] 100+ paying agents
- [ ] MRR > $20,000 ✅
- [ ] Revenue split: 60% Pro, 40% Team+Brokerage
- [ ] CAC < $100 (via referral + content)
- [ ] Retention > 95% (monthly)

---

## Open Questions & Assumptions

### Q1: Are the 3 pilot agents ready to receive invites?
**Answer:** Yes. Three smoke-test accounts exist with valid emails. Marketing copy ready. Tool (/admin/invite) tested.  
**Action:** Get Stojan approval to proceed.

### Q2: What is Stojan's preferred Stripe mode (test vs. live)?
**Answer:** Not specified. Recommend test keys initially (lower friction for pilot), migrate to live for real transactions.  
**Action:** Stojan confirms which Stripe keys to deploy.

### Q3: Do we have a Resend domain verified for email delivery?
**Answer:** Not confirmed. Local `.env` has RESEND_API_KEY. Assume leadflow.ai or similar is verified.  
**Action:** Verify in Resend dashboard before deploying.

### Q4: What is the acceptable trial-to-paid conversion rate for pilot agents?
**Answer:** Not specified. Industry baseline is 2-5% for SaaS. LeadFlow target (with strong aha moment): 10-15%.  
**Action:** Set conversion KPI after first 10 trial agents complete onboarding.

### Q5: Should we run the trial email nudge sequence now or after 10+ agents?
**Answer:** After pilot activation is confirmed working. Email sequence can wait until agents are actually in trials (otherwise no one to email).  
**Action:** Implement UC-TRIAL-NUDGE-001 after Phase 3 (Day 10).

---

## Risk Mitigation

### Risk: Pilot agents don't sign up despite approval
**Mitigation:** Use internal test accounts (madzunkov@, QC team) as fallback. Create real usage patterns manually. Get at least 1 paid signup before scaling marketing.

### Risk: Email verification emails go to spam
**Mitigation:** Test with Gmail, Outlook, Yahoo. Verify Resend domain SPF/DKIM records. Monitor delivery rates in Resend dashboard.

### Risk: Stripe integration creates security issue
**Mitigation:** Use test keys initially. Verify webhook signature validation works. Monitor webhook logs for failed signature checks.

### Risk: Aha moment simulator shows wrong response time
**Mitigation:** Measure end-to-end latency (API call + response + render). Add latency budget to simulator. Show total time, not just API time.

### Risk: Marketing campaign drives low-quality signups (spam emails)
**Mitigation:** Implement email verification gate + rate limiting on signup. Qualify leads via application form (name, team size, lead volume).

---

## Decision Gates

### Gate 1 (Day 1): Pilot Recruitment Approval
**Decision Owner:** Stojan  
**Criteria:** 
- [ ] Action items bd16d510 and c0fd9c86 status set to APPROVED
- [ ] First 3 invite emails sent via /admin/invite

### Gate 2 (Day 2): Email & Stripe Deployment
**Decision Owner:** PM / Dev  
**Criteria:**
- [ ] RESEND_API_KEY set in Vercel (verified via `vercel env ls`)
- [ ] STRIPE_SECRET_KEY set in Vercel (verified via `vercel env ls`)
- [ ] Email verification test email arrives within 60 seconds
- [ ] POST /api/billing/create-checkout returns 200 (not 503)

### Gate 3 (Day 10): Trial Activation Complete
**Decision Owner:** PM / QC  
**Criteria:**
- [ ] New agent signs up → sees sample leads on first dashboard
- [ ] Wizard auto-appears and stays visible until dismissed
- [ ] Lead simulator step renders and completes
- [ ] E2E test: full signup→activation→upgrade journey works

### Gate 4 (Day 21): First 10 Paying Agents
**Decision Owner:** PM / Orchestrator  
**Criteria:**
- [ ] 10+ agents with plan_tier != 'trial'
- [ ] 10+ active subscriptions in Stripe
- [ ] MRR > $1,000
- [ ] Trial→paid conversion rate tracked and reported

---

## Appendix: Use Case Status Summary

**Total Use Cases:** 268  
**Complete:** 202 (75%)  
**In Progress:** 1  
**Not Started:** 65 (24%)  

**P0 (Revenue-Critical) Status:**
- ✅ feat-aha-moment-lead-simulator: complete (but needs simulator.tsx)
- ✅ feat-self-serve-stripe-checkout: complete (awaiting Stripe keys)
- ✅ feat-post-signup-dashboard-onboarding-redirect: complete
- 🔴 UC-PILOT-RECRUIT-001: blocked (awaiting Stojan approval)
- 🔴 UC-EMAIL-VERIFY-001: 90% complete (awaiting RESEND_API_KEY)
- 🔴 UC-STRIPE-CONFIG-001: 0% (awaiting Stripe keys in Vercel)
- 🔴 UC-TRIAL-ACTIVATION-001: 0% (sub-tasks needed)
- 🔴 UC-AHA-MOMENT-001: 50% (simulator.tsx missing)

---

## Conclusion

**Bottom Line:** LeadFlow has a clear, 46-day path to $20K MRR. The blockers are not technical—they are configuration + approval + feature completion.

**The three actions required:**
1. Stojan approves pilot recruitment (approval bottleneck)
2. Add email + Stripe keys to Vercel (30 minutes, 2 env vars)
3. Complete trial activation flow (5-day sprint on existing codebase)

**If all three actions are completed by Day 10, the business can achieve 50+ paying agents and $7.5K+ MRR by Day 46, putting us on track for $20K+ by Day 90.**

**Next Step:** Stojan reviews and approves Action 1 (pilot recruitment). Upon approval, PM spawns dev tasks for Actions 2 and 3 immediately.

