# PRD: Revenue Alert — Critical (MRR)

**PRD ID:** prd-revenue-alert-critical-mrr-2026-04-02  
**Status:** ready  
**Priority:** P0  
**Last Updated:** 2026-04-02  
**Assigned to:** Product Manager  
**Target Completion:** Day 52 (10 days)

---

## Executive Summary

**Current Status:** $0 MRR on Day 43 of 90-day pilot  
**Target:** $20,000 MRR by Day 90  
**Gap:** -52% vs expected Day 43 trajectory ($10,330 behind)  
**Days Remaining:** 47

Despite 386 trial signups and 40 lead magnet captures, **zero agents have converted to paid**. Root cause analysis reveals three critical blockers in the signup-to-payment funnel. This PRD defines the bottleneck analysis and three immediate actions to unblock conversion within 10 days.

---

## Problem Analysis

### Conversion Funnel (Current State)

```
Landing Page → Signup → Email Verification → Onboarding → Trial Dashboard → Aha Moment → Checkout → Paid
   40 org         386         ⚠️ BROKEN      ⚠️ STUCK at 0      0 complete        N/A         $0 MRR
  signups      trial + 11              ~369 blocked           (empty dashboard)
              pilot agents
```

### Root Causes by Stage

#### Stage 1: Email Verification (Blocker #1 — 95% of agents stuck)
- **Issue:** Email delivery non-functional; verification tokens table does not exist; agents cannot proceed past signup
- **Evidence:** 371/386 agents stuck at `onboarding_step = 0` (no email verification)
- **Impact:** If fixed, ~350 agents unlock access → funnel shifts to downstream bottlenecks
- **Effort:** 2 days (create DB table, configure Resend, send 350 verification emails)

#### Stage 2: Onboarding Wizard (Blocker #2 — No aha moment)
- **Issue:** Wizard never auto-triggers; agents land on empty dashboard; no sample leads; no aha moment demo
- **Evidence:** 0 agents complete onboarding; no `onboarding_completed = true` records
- **Impact:** Even verified agents see empty dashboard → no value demonstration → abandon
- **Effort:** 3 days (auto-trigger wizard, add lead simulator, integrate sample leads)

#### Stage 3: Trial-to-Paid Path (Blocker #3 — No conversion mechanism)
- **Issue:** No self-serve checkout; no trial countdown; no conversion email sequence
- **Evidence:** 0 subscriptions despite 386 trial agents; no Stripe integration in action
- **Impact:** Even if agents see value, no path to upgrade
- **Effort:** 4 days (self-serve checkout, trial countdown, email sequence)

---

## Conversion Targets (If All Three Fixed)

### Realistic Conservative Estimate
- **Unlock Stage 2:** Fix email verification → 300 agents verify emails → 50% complete wizard → 150 see aha moment
- **Unlock Stage 3:** Fix onboarding aha → 30% of 150 (45 agents) reach trial dashboard with value
- **Convert to Paid:** Fix checkout → 10% conversion rate (industry: 2-5% for SMB SaaS) → 4-5 paid agents
- **MRR Result:** 4 agents × Pro ($149/mo average) = ~$600 MRR by Day 52

### Aggressive Scenario (If Marketing Helps)
- Fix all three blockers + launch 5 email campaigns to pilot_signups list (40 people)
- Target: 5-10 new high-intent signups per day (50/week)
- By Day 59: 300 new signups + 150 existing → 450 qualified agents
- Conversion: 2% (10-15 agents) → $1,500-2,250 MRR by Day 59

---

## Three Critical Actions (10-Day Path to First Paid Customer)

### Action 1: Fix Email Verification Pipeline (Days 1-3)
**Goal:** Unlock all 386 trial agents to access their accounts  
**Scope:**
- Create `email_verification_tokens` table (migration)
- Configure RESEND_API_KEY in Vercel
- Auto-send verification emails to unverified agents
- Auto-activate trial on email verification

**Acceptance Criteria:**
1. Email verification tokens table exists with proper schema
2. RESEND_API_KEY is set in Vercel (leadflow-ai project)
3. All 386 agents with `email_verified = false` receive verification email within 1 hour
4. Clicking verification link sets `email_verified = true`
5. Dashboard becomes accessible post-verification (no 403 EMAIL_NOT_VERIFIED)
6. Trial period auto-activates on verification (14 days from signup date)
7. Smoke test validates verification flow end-to-end

**Definition of Done:**
- [ ] 340+ agents (88%) have `email_verified = true` 
- [ ] 0 agents locked out (no EMAIL_NOT_VERIFIED errors)
- [ ] Resend delivery rate >95%

---

### Action 2: Fix Onboarding Aha Moment Flow (Days 3-6)
**Goal:** Make every verified agent see AI responding to a lead in <30 seconds  
**Scope:**
- Auto-trigger onboarding wizard post-email verification (not manual click)
- Integrate lead simulator as final onboarding step
- Add 3 sample leads with AI responses to empty dashboard
- Track onboarding completion telemetry (`onboarding_events` table)

**Acceptance Criteria:**
1. Onboarding wizard auto-launches when agent logs in after email verification
2. Wizard steps: FUB Config → SMS Config → Email Verify → Aha Moment (lead simulator) → Confirmation
3. Lead simulator uses Claude API to generate realistic SMS responses
4. Simulator runs without requiring FUB connection (uses mock lead data)
5. Response time shows <30s prominently in UI
6. Aha moment completion tracked: `onboarding_events.step = 'aha_completed'`
7. Dashboard shows 3 sample leads until agent connects FUB
8. 50%+ of verified agents reach the aha moment step
9. Completion rate >25% (agents skip simulator but see sample leads)

**Definition of Done:**
- [ ] 150+ agents complete aha moment step
- [ ] Dashboard shows sample leads for first-time visitors
- [ ] Onboarding completion telemetry logged for analysis

---

### Action 3: Implement Trial-to-Paid Conversion Path (Days 6-10)
**Goal:** Convert trial agents to paid when they see value  
**Scope:**
- Implement self-serve Stripe checkout from dashboard
- Add trial countdown banner (days remaining)
- Deploy trial conversion email sequence (day 3, 10, 13, 14)
- Test end-to-end Stripe webhook → subscription creation

**Acceptance Criteria:**
1. "Upgrade to Pro" button visible in dashboard for trial agents
2. Clicking button opens Stripe Checkout session
3. Payment creates Stripe subscription and updates `plan_tier = 'pro'`
4. Webhook fires correctly and marks agent as `status = 'active'`
5. Trial countdown shows accurate remaining days
6. Email sequence triggers on day 10 and day 13
7. First upgrade goal: 1 paid customer by Day 52 ($149 MRR minimum)
8. Checkout can handle 100 concurrent sessions (load test)
9. Failed payments show friendly error messages

**Definition of Done:**
- [ ] 1+ agent successfully upgrades to paid tier
- [ ] Subscription appears in Stripe dashboard
- [ ] Stripe webhook processes successfully
- [ ] Agent sees "Pro" plan label in dashboard
- [ ] Smoke test validates checkout flow

---

## Technical Specifications by Action

### Action 1: Email Verification

#### Database Migration
```sql
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evt_token ON email_verification_tokens(token);
CREATE INDEX idx_evt_agent_id ON email_verification_tokens(agent_id);
CREATE INDEX idx_evt_expires_at ON email_verification_tokens(expires_at);
```

#### API Routes Required
- `POST /api/auth/resend-verification` — Generate token, send email
- `GET /api/auth/verify-email?token={token}` — Verify token, set `email_verified=true`
- `POST /api/auth/verify-email` — Alternative POST endpoint for form-based verification

#### Resend Configuration
- Set `RESEND_API_KEY` in Vercel (obtainable from Resend dashboard)
- Template: "Welcome to LeadFlow! Confirm your email to get started"
- Sender: `onboarding@imagineapi.org`
- Retry policy: Exponential backoff, max 3 attempts over 24h

#### Backfill Job
```sql
-- For accounts created before email verification feature (all except today's)
UPDATE real_estate_agents 
SET email_verified = TRUE 
WHERE email_verified = FALSE 
  AND created_at < NOW() - INTERVAL '2 days'
  AND email NOT LIKE '%smoke%'
  AND email NOT LIKE '%test%';
```

---

### Action 2: Onboarding Aha Moment

#### Wizard Orchestration
1. **Auto-trigger:** After `email_verified = true`, redirect to `/dashboard/onboarding` (not `/dashboard`)
2. **Persist state:** Query `/api/setup/status` on mount; resume from last incomplete step
3. **Steps array:**
   - Step 0: Welcome
   - Step 1: FUB Integration
   - Step 2: SMS Configuration
   - Step 3: Email Verification (may already be done)
   - Step 4: Lead Simulator (aha moment)
   - Step 5: Confirmation

#### Lead Simulator Implementation
- **API:** `POST /api/setup/start-simulation` — generates Claude response
- **Claude prompt:** "Generate a professional SMS response (max 160 chars) from a real estate agent {agent_name} to a lead {lead_name} interested in {property_details}. Tone: friendly, brief, actionable."
- **Mock lead data:** 3 sample leads (name, property details, timeline) hardcoded
- **UI:** Conversation view (lead messages left, AI responses right), response time badge
- **Success state:** "Your AI responded in 18 seconds" with prominent visual
- **Skip option:** Agents can skip simulator; still see sample leads on dashboard

#### Dashboard Sample Leads
- If `onboarding_completed = false`, dashboard queries `/api/sample-leads/{agentId}` 
- Returns 3 mock lead records (clearly marked DEMO)
- Each includes an AI-drafted response showing value prop
- Disappears after `onboarding_completed = true` or after 3 days

#### Telemetry
- `onboarding_events` table: logs each step with timestamp, metadata
- Example: `{ agent_id, step_name: 'aha_completed', status: 'success', response_time_ms: 1850, created_at }`
- Alert if agent stuck at step for >24h

---

### Action 3: Trial-to-Paid Conversion

#### Self-Serve Checkout
- **Trigger:** "Upgrade to Pro" button in dashboard (visible for `plan_tier = 'trial'`)
- **Route:** `POST /api/billing/create-checkout-session` with `{ agentId, tier: 'pro' }`
- **Response:** `{ sessionId, checkoutUrl }`
- **Checkout:** Uses existing Stripe products (SKU: leadflow-pro-monthly)
- **Success redirect:** `/dashboard?upgrade=success`
- **Cancel redirect:** `/dashboard?upgrade=cancelled`

#### Trial Countdown Widget
- **Location:** Dashboard header
- **Logic:** `Math.ceil((trial_expires_at - NOW()) / 86400000)` days remaining
- **Threshold:** Show urgency banner at 7 days, red at 3 days
- **CTA:** Direct to checkout

#### Email Sequence
**Email 1 (Day 10):**
- Subject: "Your trial is halfway through — see your ROI"
- Content: Personalized stats (leads received, avg response time, appointments booked if >0)
- CTA: "Upgrade to Pro Now" linking to checkout

**Email 2 (Day 13):**
- Subject: "3 days left on your free trial — lock in pricing"
- Content: FOMO ("Other agents are now paying for unlimited responses")
- CTA: "Upgrade Now" (same checkout link)

**Email 3 (Day 15, if not upgraded):**
- Subject: "Your trial has expired — here's how to reactivate"
- Content: "Upgrade to Pro to continue responding to leads"
- CTA: "Reactivate Your Account" (checkout link)

**Email 4 (Day 30, if still not upgraded):**
- Subject: "We miss you! Your leads are waiting."
- Content: "Come back and start your free trial again"
- CTA: "Restart Free Trial"

#### Stripe Webhook Handler
- **Event:** `checkout.session.completed`
- **Action:** Create `Subscription` record, update `real_estate_agents.plan_tier = 'pro'`, set `stripe_customer_id`, set `subscription_status = 'active'`
- **Idempotency:** Webhook idempotency key prevents duplicate subscriptions

---

## Success Metrics & Go/No-Go Checkpoints

### Checkpoint 1: Email Verification (Day 46)
- **Target:** 80%+ of 386 agents have `email_verified = true`
- **Go:** If >310 agents verified → proceed to Action 2
- **No-Go:** If <250 agents verified → escalate Resend config issue

### Checkpoint 2: Onboarding Completion (Day 49)
- **Target:** 20%+ of verified agents complete aha moment (50+ agents)
- **Go:** If funnel shows value → proceed to Action 3
- **No-Go:** If <10 agents complete aha → simplify wizard steps

### Checkpoint 3: First Paid Customer (Day 52)
- **Target:** 1+ agent upgrades to Pro plan
- **Go:** Revenue funnel unblocked; scale marketing
- **No-Go:** If 0 conversions by Day 52 → pivot to team-based selling (Stojan calls pilots manually)

---

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|-----------|
| Resend API misconfigured in Vercel | High | QC verifies in Vercel dashboard before deploy |
| Wizard doesn't auto-trigger | Medium | Add explicit redirect from login to `/dashboard/onboarding` |
| Claude API timeouts during aha moment | Medium | Fallback to template response if API fails (non-blocking) |
| Stripe webhook secret missing in Vercel | High | Manually verify STRIPE_WEBHOOK_SECRET in Vercel before deploy |
| Email sequence triggers twice | Medium | Add unique constraint on `agent_id + milestone_day` in email_logs |

---

## Dependencies & Blockers

- **Blocker 1 (If Exists):** Vercel env var secrets not accessible (check with Stojan)
- **Blocker 2:** Resend API key not obtained from Stojan
- **Blocker 3:** Stripe product IDs not configured for Pro/Team/Brokerage tiers

---

## Success Definition

**By Day 52, this PRD is complete if:**
1. ✅ Email verification fixed — 80%+ of agents can log in
2. ✅ Onboarding wizard auto-triggers and shows aha moment to 25%+ of agents
3. ✅ First paying customer converts via self-serve Stripe checkout
4. ✅ All three acceptance criteria met for each action
5. ✅ Smoke tests pass; no production errors

**MRR Impact by Day 52:** $149-300 (1-2 agents)  
**MRR Trajectory:** If pattern holds, 2-3 agents/week → ~$300-600/week → $1,200-2,400/month → **$4,800-9,600 by Day 90** (still below $20K, requires marketing acceleration)

---

## Next Steps (Day 0-1)

1. **PM (Day 1):** Load this PRD, identify dependencies, create three sub-tasks for Dev
2. **Dev (Days 1-10):** Execute Actions 1, 2, 3 in sequence with QC validation
3. **QC (Days 1-10):** Test each action, produce acceptance test results
4. **Marketing (Day 5+):** Begin email outreach to 40 pilot_signups + pilot agents

---

## Appendix: Funnel Math

### Current State (Day 43)
- Total trial signups: 386
- Email verified: ~17 (~4%)
- Onboarding complete: 0 (~0%)
- Paid subscriptions: 0 (~0%)
- MRR: $0

### Projected State (Day 52, If All Actions Complete)
- Total trial signups: 600 (assuming 54 new/day from organic + bot)
- Email verified: 480 (~80%)
- Onboarding complete: 120 (~20%)
- Aha moment completed: 60 (~10%)
- Paid subscriptions: 4-6 (~1-2%)
- MRR: $600-900

### Projected State (Day 90, If Marketing Accelerates)
- Total trial signups: 2,000+ (assuming 10+ new/day with campaigns)
- Email verified: 1,600 (~80%)
- Onboarding complete: 320 (~20%)
- Aha moment completed: 160 (~10%)
- Paid subscriptions: 32-48 (~2%)
- MRR: $4,800-7,200

**Gap at Day 90:** Still -$12,800 to -$15,200 below $20K target (requires additional channels or higher conversion rate)

---

**Status:** Ready for Dev assignment  
**Assigned to:** Dev > QC  
**Expected completion:** Day 52 (10 days from Day 42)
