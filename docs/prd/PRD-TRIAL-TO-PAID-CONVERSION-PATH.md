# PRD: Trial-to-Paid Conversion Path

**PRD ID:** prd-trial-to-paid-conversion-path  
**Status:** ready  
**Priority:** P1 (Blocker)  
**Use Case:** uc-trial-to-paid-conversion-path  
**Owner:** Product Manager (spec) → Dev → QC  
**Effort Estimate:** 2 days (Dev) + 1 day (QC)  
**Target Completion:** Day 51 of 90-day pilot  
**Revenue Impact:** +$149–600 MRR (1–3 paying agents)  
**Last Updated:** 2026-04-04  

---

## Executive Summary

The trial-to-paid conversion mechanism is **missing** — 11 agents have completed onboarding and seen value but have **no path to upgrade** from a free 30-day trial to a paid plan. There is no:
- Trial countdown timer on the dashboard
- Upgrade button or CTA
- Stripe checkout integration in the frontend
- Trial-ending email reminders

This PRD specifies **exactly what Dev must build** to enable agents to convert from trial to paid. The implementation is straightforward: add UI components, wire Stripe checkout, send trial-expiry emails via Resend.

**Expected Outcome:** By Day 51, agents see a countdown timer on their dashboard, can click "Upgrade Now," and complete a Stripe checkout to convert to Pro or Team tiers.

---

## 1. Product Requirements

### 1.1 User Story

```
As a trial agent nearing the end of my 30-day free trial,
I need to see a countdown timer and an "Upgrade Now" button,
So that I can seamlessly convert to a paid plan without losing access to my leads.
```

### 1.2 Problem Statement

**Current State (Day 47):**
- 11 agents completed onboarding and saw AI demo (aha moment achieved)
- These agents have been using the product for 3–7 days
- Their trial will expire on Day 30 (7–23 days from now)
- **No UI exists to upgrade**
- **No emails remind them to upgrade**
- **Stripe checkout is configured but not wired to the frontend**
- **Result:** Agents will lose access and churn

**Root Cause:**
The MVP focused on getting agents signed up and seeing value. The monetization flow was left unfinished. The gap is between "product works" and "product converts to revenue."

**Why This Matters:**
- **Day 47 MRR:** $0
- **First paying agent = $149 MRR** (Pro plan)
- **3 paying agents = $447–600 MRR** (mix of Pro + Team)
- **This is the revenue blocker.** We have proven the product works; now we need to prove agents will pay.

---

## 2. Detailed Specification

### 2.1 Trial Countdown Banner

**Location:** Dashboard (all authenticated pages)  
**Visibility Rule:** Show if `subscription_status = 'trial'` AND `trial_days_remaining > 0`

#### Component: TrialCountdownBanner

```jsx
<TrialCountdownBanner>
  <Icon>⏰</Icon>
  <Text>Your trial ends in <Highlight>{daysRemaining}</Highlight> days</Text>
  <Button href="/dashboard/upgrade" variant="cta">Upgrade Now</Button>
  <Button href="#" onClick={dismissBanner}>Dismiss</Button>
</TrialCountdownBanner>
```

**Styling:**
- Background: Gold/warning color (#FFC300 or similar)
- Position: Top of dashboard, full-width banner
- Fonts: Bold, centered, 18px
- Button: Primary CTA, right-aligned, 16px padding
- Dismiss: Subtle X, top-right corner

**Logic:**
- Calculate `trial_days_remaining = trial_end_date - TODAY()`
- If `daysRemaining <= 0`: hide banner, show "Trial Expired" message instead
- If `daysRemaining > 30`: don't show banner (trial just started)
- If `subscription_status != 'trial'`: don't show (user already paid or canceled)
- Persist banner dismissal per agent (use `localStorage` or DB flag `trial_banner_dismissed`)

**Copy Variants by Days Remaining:**
- Day 30: "Your trial ends in 30 days"
- Days 7–14: "Your trial ends in X days — upgrade to keep your leads flowing"
- Days 1–6: "Your trial ends in X days — upgrade now to avoid losing leads" (urgency)
- Day 0: "Your trial expires today — upgrade now"

---

### 2.2 Upgrade Page & Stripe Checkout

**Route:** `GET /dashboard/upgrade`  
**Authentication:** Must be logged in  
**Visibility:** Only for agents with `subscription_status = 'trial'`

#### Layout

```
┌─────────────────────────────────────────┐
│   Header: "Choose Your Plan"            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────┐  │
│  │ Starter  │  │   Pro    │  │ Team │  │
│  │  $49/mo  │  │ $149/mo  │  │$399/mo  │
│  │    ↓     │  │    ↓     │  │  ↓    │  │
│  │ [Upgrade]│  │ [Upgrade]│  │[Upgrade] │
│  │          │  │ ← Popular│  │        │  │
│  └──────────┘  └──────────┘  └──────┘  │
│                                         │
│  [Or cancel trial and log out]          │
└─────────────────────────────────────────┘
```

#### Pricing Cards

**Card 1: Starter ($49/mo)**
- 100 SMS/month
- Basic AI (lead responses)
- Email support
- [Upgrade Button] → Stripe checkout for Starter

**Card 2: Pro ($149/mo) ← RECOMMENDED**
- Unlimited SMS
- Full AI (lead responses + appointment booking assist)
- Priority email + SMS support
- [Upgrade Button] → Stripe checkout for Pro

**Card 3: Team ($399/mo)**
- Everything in Pro
- Up to 5 agents
- Team management dashboard
- Dedicated Slack support
- [Upgrade Button] → Stripe checkout for Team

---

### 2.3 Stripe Checkout Flow

**Technology:** Stripe Payment Element (not Stripe Checkout hosted page — use Stripe's client SDK for in-dashboard experience)

**Trigger:** Click "Upgrade" on any pricing card

**Flow:**

1. **User clicks "Upgrade" on Pro card**
   - Frontend sends POST to `/api/billing/create-payment-intent`
   - Body: `{ plan_tier: 'pro', agent_id: <current_agent_id> }`

2. **Backend creates Stripe PaymentIntent**
   ```javascript
   // POST /api/billing/create-payment-intent
   const intent = await stripe.paymentIntents.create({
     amount: 14900, // $149.00 in cents
     currency: 'usd',
     customer: agent.stripe_customer_id, // Create if doesn't exist
     metadata: {
       agent_id: agent.id,
       plan_tier: 'pro',
       agent_email: agent.email
     },
     statement_descriptor: 'LeadFlow AI - Pro'
   });
   
   return { clientSecret: intent.client_secret };
   ```

3. **Frontend displays Stripe Payment Element (embedded)**
   ```jsx
   <StripePaymentElement />
   <Button onClick={confirmPayment}>Pay $149/month</Button>
   ```

4. **User enters card details, clicks Pay**
   - Stripe validates card
   - Payment processes

5. **On Success:**
   - Stripe sends webhook to `/api/webhooks/stripe`
   - Backend listens for `payment_intent.succeeded`
   - Backend updates agent record:
     ```sql
     UPDATE real_estate_agents SET
       subscription_status = 'active',
       plan_tier = 'pro',
       mrr = 149,
       stripe_subscription_id = <sub_id>,
       subscription_start_date = NOW(),
       trial_end_date = NULL
     WHERE id = agent_id;
     ```
   - Backend sends confirmation email (see section 2.5)
   - Frontend shows success message, redirects to `/dashboard`

6. **On Failure:**
   - Show error message: "Payment failed. Please try again or contact support."
   - Allow user to re-enter card

**Edge Cases:**
- If agent already has `stripe_customer_id`, use it; else create one
- If Stripe API fails, return 500 with retry button
- If webhook doesn't fire, have a fallback: check Stripe API for successful payment on next dashboard load

---

### 2.4 Trial Duration & Expiry Logic

**Trial Duration:** 30 days from account creation

**Calculation:**
```sql
trial_end_date = created_at + INTERVAL '30 days'
trial_days_remaining = EXTRACT(DAY FROM (trial_end_date - NOW()))
```

**Expiry Behavior:**
- On Day 30, set `subscription_status = 'trial_expired'`
- Agent can no longer access `/dashboard` (redirect to `/dashboard/trial-expired`)
- Agent can still log in but see "Trial expired — upgrade to continue"
- Agent can upgrade even after trial expires (no hard block, just UX friction)

**Database Columns Required:**
- `trial_end_date` (timestamp) — calculated at signup as `created_at + 30 days`
- `subscription_status` (enum: 'trial', 'active', 'past_due', 'canceled')
- `plan_tier` (enum: 'starter', 'pro', 'team', 'pilot')
- `mrr` (numeric) — monthly recurring revenue for this agent

---

### 2.5 Trial-Ending Email Sequence (Resend)

**Mechanism:** Daily cron job that checks for agents approaching key milestones

**Schedule:** Run daily at 9 AM ET (via node-schedule or similar)

**Logic:**
```javascript
// Check for agents at Day 24 (6 days remaining)
const agentsAt6DaysLeft = await db.query(`
  SELECT * FROM real_estate_agents
  WHERE subscription_status = 'trial'
  AND EXTRACT(DAY FROM (trial_end_date - NOW())) = 6
  AND trial_email_day6_sent = false
`);

// Check for agents at Day 27 (3 days remaining)
const agentsAt3DaysLeft = await db.query(`
  SELECT * FROM real_estate_agents
  WHERE subscription_status = 'trial'
  AND EXTRACT(DAY FROM (trial_end_date - NOW())) = 3
  AND trial_email_day3_sent = false
`);

// Check for agents at Day 29 (1 day remaining)
const agentsAt1DayLeft = await db.query(`
  SELECT * FROM real_estate_agents
  WHERE subscription_status = 'trial'
  AND EXTRACT(DAY FROM (trial_end_date - NOW())) = 1
  AND trial_email_day1_sent = false
`);

// Send emails to each group
```

#### Email 1: Day 6 (24 days remaining)

**Subject:** "Your LeadFlow AI trial expires in 6 days"  
**Template:** `trial-email-day6`

```
Hi {{agent_name}},

Your LeadFlow AI trial expires in 6 days ({{trial_end_date}}).

You've already seen it work:
- {{leads_responded_count}} leads responded in <30 seconds
- {{avg_response_time}} second average response time
- {{appointments_booked}} appointments scheduled

Ready to keep the leads flowing? Upgrade to Pro for just $149/month.

[Upgrade Now] → https://leadflow-ai-five.vercel.app/dashboard/upgrade?plan=pro

Questions? Reply to this email or contact support@leadflow.ai

— The LeadFlow Team
```

**Tracking:**
- Set `trial_email_day6_sent = true`
- Log send attempt in `agent_email_logs` (timestamp, template, status)

#### Email 2: Day 3 (27 days remaining)

**Subject:** "{{agent_name}}, your trial ends in 3 days — upgrade now"  
**Template:** `trial-email-day3`

```
Hi {{agent_name}},

Your LeadFlow AI trial expires in 3 days.

Don't lose your leads. Upgrade to Pro ($149/month) and keep responding to every lead automatically.

Pro agents are converting {{upgrade_conversion_rate}}% of their leads to appointments.

[Upgrade to Pro →] https://leadflow-ai-five.vercel.app/dashboard/upgrade?plan=pro

[Or try Team] ({{team_agents_count}} agents max) → https://leadflow-ai-five.vercel.app/dashboard/upgrade?plan=team

— LeadFlow AI
```

**Tracking:** Set `trial_email_day3_sent = true`

#### Email 3: Day 1 (29 days remaining)

**Subject:** "Last day to upgrade, {{agent_name}}"  
**Template:** `trial-email-day1`

```
Hi {{agent_name}},

Your LeadFlow AI trial expires TOMORROW at {{trial_end_date_time}}.

You've responded to {{leads_responded_count}} leads. Don't leave money on the table.

[Upgrade Now →] https://leadflow-ai-five.vercel.app/dashboard/upgrade?plan=pro

We'll disable your account at midnight if you don't upgrade. You can re-enable anytime by paying.

— LeadFlow
```

**Tracking:** Set `trial_email_day1_sent = true`

#### Email 4: Day 0 (Email after trial expires)

**Subject:** "Your LeadFlow trial has expired"  
**Template:** `trial-email-expired`

```
Hi {{agent_name}},

Your LeadFlow AI trial ended today. You still have {{days_since_expiry}} days to upgrade and restore your account.

[Reactivate with Pro] → https://leadflow-ai-five.vercel.app/dashboard/upgrade?plan=pro

All your leads and settings are saved and ready to go.

— LeadFlow
```

**Tracking:** Set `trial_email_expired_sent = true`

---

### 2.6 Database Schema Updates

**New/Updated Columns on `real_estate_agents` table:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `trial_end_date` | TIMESTAMP | `created_at + 30 days` | When trial expires |
| `subscription_status` | ENUM | 'trial' | Status: trial, active, past_due, canceled |
| `plan_tier` | ENUM | 'starter' | Tier: starter, pro, team, pilot |
| `stripe_customer_id` | VARCHAR(255) | NULL | Stripe customer ID |
| `stripe_subscription_id` | VARCHAR(255) | NULL | Stripe subscription ID |
| `mrr` | NUMERIC(10,2) | 0 | Monthly recurring revenue ($) |
| `subscription_start_date` | TIMESTAMP | NULL | When paid subscription started |
| `trial_banner_dismissed` | BOOLEAN | false | Whether agent dismissed the banner |
| `trial_email_day6_sent` | BOOLEAN | false | Email sent at day 24 |
| `trial_email_day3_sent` | BOOLEAN | false | Email sent at day 27 |
| `trial_email_day1_sent` | BOOLEAN | false | Email sent at day 29 |
| `trial_email_expired_sent` | BOOLEAN | false | Email sent after expiry |

**New Table: `agent_email_logs`**

```sql
CREATE TABLE agent_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES real_estate_agents(id),
  email_type VARCHAR(50) NOT NULL, -- 'trial_day6', 'trial_day3', 'trial_day1', 'trial_expired'
  email_address VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'delivered', 'bounced', 'opened', 'clicked'
  stripe_link_clicked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Acceptance Criteria

### Development Acceptance Criteria

- [ ] **Trial Countdown Banner**
  - Banner appears on all dashboard pages when `subscription_status = 'trial'`
  - Timer updates in real-time (or on page refresh)
  - Banner is dismissable (localStorage-persisted)
  - Banner disappears when subscription moves to 'active'
  - Copy updates based on days remaining

- [ ] **Upgrade Page**
  - Route `/dashboard/upgrade` exists and is protected (login required)
  - Three pricing cards display (Starter, Pro, Team)
  - Each card shows price, features, and "Upgrade" button
  - Styling matches dashboard design
  - Mobile-responsive (no overflow, stacks cards on <768px)

- [ ] **Stripe Checkout Integration**
  - POST `/api/billing/create-payment-intent` endpoint exists
  - Endpoint accepts `{ plan_tier, agent_id }` and returns `{ clientSecret }`
  - Stripe Payment Element renders correctly
  - Payment submission works (test with Stripe test card 4242 4242 4242 4242)
  - On success: agent record updated with subscription_status = 'active'
  - On failure: user sees error message and can retry
  - Stripe webhook handler logs payment success/failure

- [ ] **Database Updates**
  - All new columns exist on `real_estate_agents` table
  - All migration scripts execute without errors
  - Default values set correctly (trial_end_date, subscription_status = 'trial')
  - `agent_email_logs` table created and queryable

- [ ] **Trial Email Sequence**
  - Cron job runs daily and detects agents at key milestones
  - Emails send via Resend API (use RESEND_API_KEY)
  - Email templates use correct variables ({{agent_name}}, {{trial_end_date}}, etc.)
  - Email flags update (trial_email_day6_sent, etc.) to prevent duplicates
  - Stripe upgrade links include `?plan=pro` UTM parameter for tracking
  - No emails sent if agent has already paid (subscription_status = 'active')

- [ ] **Error Handling**
  - If Stripe API unreachable: show user-friendly message, allow retry
  - If Resend API fails: log error, retry in next cron run
  - If payment succeeds but DB update fails: webhook handler retries
  - No broken redirects or dead links

---

## 4. E2E Test Specification

### Test 1: Trial Countdown Banner Displays

**Precondition:** Agent is logged in, subscription_status = 'trial', trial_end_date = 5 days from now

**Steps:**
1. Navigate to `/dashboard`
2. Verify banner appears with text "Your trial ends in 5 days"
3. Verify "Upgrade Now" button is clickable
4. Click "Upgrade Now"
5. Verify redirect to `/dashboard/upgrade`

**Expected Result:** ✅ Banner renders, upgrade button works

---

### Test 2: Upgrade from Trial to Pro

**Precondition:** Agent logged in, trial active, at `/dashboard/upgrade`

**Steps:**
1. On upgrade page, see three pricing cards
2. Click "Upgrade" on Pro card ($149/mo)
3. Stripe Payment Element loads
4. Enter test card: 4242 4242 4242 4242
5. Enter expiry: 12/26
6. Enter CVC: 123
7. Click "Pay $149/month"
8. Wait for payment processing
9. Verify redirect back to `/dashboard`
10. Verify dashboard shows "Subscription Active" (not trial banner)
11. Query DB: verify `subscription_status = 'active'`, `plan_tier = 'pro'`

**Expected Result:** ✅ Payment succeeds, agent upgraded, DB updated

---

### Test 3: Trial Email at Day 6

**Precondition:** Agent created 24 days ago (trial_end_date = 6 days away)

**Steps:**
1. Run daily email cron job manually: `node scripts/trial-email-cron.js`
2. Check Resend logs / email inbox
3. Verify email sent to agent
4. Verify email subject: "Your LeadFlow AI trial expires in 6 days"
5. Verify email contains upgrade link
6. Query DB: verify `trial_email_day6_sent = true`
7. Run cron again
8. Verify duplicate email NOT sent (idempotent)

**Expected Result:** ✅ Email sent once, flag set, no duplicates

---

### Test 4: Trial Expiry Blocks Dashboard Access

**Precondition:** Agent trial_end_date = TODAY (trial expired)

**Steps:**
1. Agent tries to access `/dashboard`
2. Verify redirect to `/dashboard/trial-expired`
3. Show message: "Your trial has ended. Upgrade to Pro to continue."
4. Verify "Upgrade Now" button links to `/dashboard/upgrade`
5. Verify agent CAN still access upgrade page and pay

**Expected Result:** ✅ Expired trial redirects but doesn't hard-block upgrades

---

### Test 5: Payment Failure Handling

**Precondition:** Agent at stripe payment element

**Steps:**
1. Enter invalid card: 4000 0000 0000 0002 (test decline)
2. Click "Pay"
3. Verify error message displays: "Payment failed. Please try again."
4. Verify user remains on payment element (not redirected)
5. Allow retry with valid card

**Expected Result:** ✅ Error shown, no redirect, user can retry

---

## 5. Deployment Checklist

- [ ] **Environment Variables (Vercel + local .env)**
  - `STRIPE_SECRET_KEY` ✅ (already configured)
  - `STRIPE_PUBLIC_KEY` ✅ (already configured)
  - `STRIPE_WEBHOOK_SECRET` ✅ (already configured)
  - `RESEND_API_KEY` ✅ (already configured)

- [ ] **Database Migration**
  - Run migration script to add new columns
  - Verify schema with `\d real_estate_agents`
  - Backfill `trial_end_date` for existing agents: `UPDATE real_estate_agents SET trial_end_date = created_at + INTERVAL '30 days' WHERE trial_end_date IS NULL;`

- [ ] **Stripe Configuration**
  - Verify webhook endpoint in Stripe Dashboard points to `/api/webhooks/stripe`
  - Verify webhook events subscribed: `payment_intent.succeeded`, `payment_intent.payment_failed`

- [ ] **Email Templates**
  - All four Resend email templates created and tested
  - Variables embedded correctly

- [ ] **Frontend Deployment**
  - Test locally: `npm run dev`
  - Build succeeds: `npm run build`
  - No console errors
  - Stripe Payment Element loads correctly
  - Deploy to Vercel: `cd product/lead-response/dashboard && vercel --prod`

- [ ] **QC Testing**
  - All E2E tests pass (5 test scenarios)
  - Manual smoke test with real card (use Stojan's test card)
  - Monitor Stripe logs for 24 hours post-deployment
  - Monitor email delivery (Resend dashboard)

---

## 6. Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Stripe API fails during payment | Medium | High | Have fallback: manual payment via invoice until fixed |
| Email delivery fails (Resend down) | Low | Medium | Retry cron daily; add manual email send endpoint for support |
| Payment succeeds but DB update fails | Low | High | Webhook handler includes retry logic + manual reconciliation script |
| Users can't find upgrade page | Medium | Medium | Trial banner clearly links to `/dashboard/upgrade` |
| Timezone issues in email cron | Low | Medium | Use UTC everywhere; document timezone handling |

---

## 7. Success Metrics (KPIs)

**By Day 51 (5 days after deployment):**

- ✅ First paying agent converts (1+ MRR)
- ✅ Trial-to-paid conversion rate: ≥10% of onboarded agents
- ✅ Email open rate: ≥30% (for trial reminder emails)
- ✅ Email CTR (upgrade link clicks): ≥5%
- ✅ Stripe payment success rate: ≥90%
- ✅ Zero payment-related support tickets

**By Day 59 (end of first agent's trial):**

- Target: 1–3 agents upgraded to paid
- Target: +$149–600 MRR
- Target: $20K MRR trajectory visible

---

## 8. Definition of Done

This PRD is **complete** when:

1. ✅ Dev has read this spec and confirmed effort estimate (2 days)
2. ✅ QC has reviewed E2E test specs and prepared test environment
3. ✅ Database migration script is ready
4. ✅ Stripe webhook handler is ready
5. ✅ All environment variables are configured (Vercel + local)
6. ✅ Email templates are created in Resend
7. ✅ Dev begins implementation on Day 48

**Next Step:** Dev takes over → creates PR → QC tests → merge to main → deploy to Vercel

---

## 9. Supporting Documents

- **Use Case:** `uc-trial-to-paid-conversion-path` (in Supabase)
- **Related PRDs:**
  - `PRD-REVENUE-RECOVERY-CRITICAL-DAY47.md` (full funnel context)
  - `PRD-REVENUE-RECOVERY-007-CRITICAL-ACTIONS.md` (7-day action plan)
- **Pricing:** `PMF.md` (pricing tiers, $149 Pro, $399 Team)
- **Architecture:** `CLAUDE.md` → Tech Stack, Routes, Integrations

---

## 10. Notes for Implementation

### 10.1 Stripe Customer Creation

When an agent attempts to pay, check if they have a `stripe_customer_id`. If not, create one:

```javascript
if (!agent.stripe_customer_id) {
  const customer = await stripe.customers.create({
    email: agent.email,
    name: agent.name || 'Agent'
  });
  // Save customer.id to agent.stripe_customer_id
}
```

### 10.2 Cron Job Scheduling

Use `node-schedule` (already in dependencies) to run the email job daily at 9 AM ET:

```javascript
const schedule = require('node-schedule');

schedule.scheduleJob('0 9 * * *', async () => {
  // Run daily email logic
  await checkAndSendTrialEmails();
});
```

### 10.3 Stripe Test Cards

For development/testing:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Require 3D Secure: `4000 2500 0000 3010`

All expiry dates work: use `12/26` and any CVC.

### 10.4 Mobile Payment Element

The Stripe Payment Element is mobile-responsive by default. Test on iPhone 12/375px viewport to ensure it works.

### 10.5 Redirect After Payment

On successful payment, redirect to `/dashboard` (not `/dashboard/upgrade`). The dashboard will detect `subscription_status = 'active'` and hide the trial banner.

---

## Appendix: Copy Library

Use this copy for UI elements:

**Trial Banner:**
- "Your trial ends in {{daysRemaining}} days"
- "Your trial ends in {{daysRemaining}} days — upgrade to keep your leads flowing"
- "Your trial ends in {{daysRemaining}} days — upgrade now to avoid losing leads"
- "Your trial expires today — upgrade now"

**Upgrade Page Heading:**
- "Choose Your Plan"
- "Your trial ends in {{daysRemaining}} days. Upgrade now to keep using LeadFlow."

**Pricing Cards:**
- Starter: "100 SMS/month | Basic AI | Email support | $49/month"
- Pro: "Unlimited SMS | Full AI | Priority support | $149/month | ← Most Popular"
- Team: "Everything in Pro | Up to 5 agents | Team dashboard | Dedicated support | $399/month"

**Email Subject Lines:**
- Day 6: "Your LeadFlow AI trial expires in 6 days"
- Day 3: "{{agent_name}}, your trial ends in 3 days — upgrade now"
- Day 1: "Last day to upgrade, {{agent_name}}"
- Expired: "Your LeadFlow trial has expired"

**Button Text:**
- "Upgrade Now"
- "Pay {{amount}}/month"
- "Upgrade to {{plan_name}}"

---

**PRD Author:** Product Manager  
**Date:** 2026-04-04  
**Status:** Ready for Development  
