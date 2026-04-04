# PRD: Revenue Recovery — Critical Alert

**PRD ID:** prd-revenue-recovery-critical-alert  
**Task ID:** feb8aca7-d981-4691-a6c3-d14a64ceba76  
**Created:** 2026-04-04  
**Status:** Active  
**Priority:** P0 (Blocker)  
**Revenue Impact:** $20K MRR target  
**Days Remaining:** 11  

---

## Executive Summary

LeadFlow is **11 days away from the $20K MRR revenue target** with **$0 current MRR and 0 paying customers**. This PRD defines the immediate actions required to close this gap.

### Current State
- **Current MRR:** $0
- **Target MRR:** $20,000/month
- **Gap:** $20,000 (100% behind)
- **Day:** 49 of 60
- **Customers:** 0 active paid, 0 trials
- **Deployment:** Live (Vercel, FUB integration, Stripe ready)
- **Critical blockers:** Pilot recruitment, funnel diagnostics, aha moment validation

### Revenue Model Required
To hit $20K MRR in 11 days with realistic conversion:
- **Conservative path:** 10 paying agents @ $149 (Pro) + 40 paying agents @ $399 (Team) = $17,910/mo
- **Realistic path:** 50 Pro + 20 Team + 2 Brokerage = $20,497/mo
- **Immediate action:** Recruit and activate first 3 white-glove pilot agents within 48 hours

---

## Problem Analysis

### 1. Conversion Funnel Bottlenecks

The product has 0 customers because the funnel is broken at **awareness → activation**:

| Funnel Stage | Status | Blocker |
|--------------|--------|---------|
| **Awareness** | Unknown (no UTM tracking) | Landing page analytics not wired |
| **Landing** | Live (https://leadflow-ai-five.vercel.app) | Unclear value prop → low click-through |
| **Signup** | Functional | No onboarding wizard for FUB connection |
| **Trial Activation** | BROKEN | No aha moment within first 3 days |
| **First Value** | Incomplete | AI SMS requires FUB + integrations setup |
| **Conversion** | Not reached | Zero trials converted (nothing to convert from) |
| **Retention** | N/A | No paid customers |

### 2. Revenue Gap Root Causes

**Immediate (Days 1-3):**
1. Zero trial users actively using the product (funnel empty)
2. No pilot agents onboarded or activated
3. Aha moment not validated (users don't see AI response working)

**Short-term (Days 4-11):**
1. No systematic onboarding wizard (manual setup takes >20 minutes)
2. No email nurture proving ROI (trial users don't perceive value)
3. No pricing clarity for trial users (when does trial end? upgrade cost?)
4. No referral incentive program (users can't invite peers)

### 3. Competitive Pressure

Real estate agents already use:
- Zillow (free leads, but no response automation)
- Follow Up Boss ($69-800/mo, but no AI)
- LionDesk ($25-99/mo, good SMS but no FUB integration)

**Structurely** ($299+/mo) is the closest competitor. We must prove our value in **<7 days** or agents won't commit to a paid plan.

---

## Success Criteria

### Primary Metric: Active Paid Agents
- **Day 3 target:** 3 active agents running through paid trial/pilots
- **Day 7 target:** 10 agents converting to paid ($1,490 MRR minimum)
- **Day 11 target:** 50+ agents, $20K+ MRR

### Secondary Metrics
- **Trial activation rate:** >60% of signups get aha moment (AI SMS sent) by day 3
- **Trial-to-paid conversion:** >15% of activated trials → paid in <14 days
- **Time-to-value:** <30 minutes from signup → first AI SMS sent
- **Email engagement:** >40% open rate on "weekly ROI report" email

### Acceptance Criteria

All of the following must be verifiable before claiming success:

1. **Landing page**: Conversion tracking functional (UTM params captured + stored in database)
   - VERIFY: `SELECT COUNT(*) FROM events WHERE event_type='landing_page_view'` > 10
   - VERIFY: `SELECT DISTINCT utm_source FROM events` returns real values (not NULL)

2. **Signup flow**: Completes without errors for real emails
   - VERIFY: Create test account with email, passwords match on login
   - VERIFY: Account appears in `customers` table with correct email
   - VERIFY: Verification email received and clickable

3. **Onboarding wizard**: Guided FUB setup within <5 minutes
   - VERIFY: Visit /dashboard/onboarding, see step-by-step wizard
   - VERIFY: Wizard guides to FUB integration without manual copy-paste
   - VERIFY: After FUB connection, wizard shows "Ready for live leads"

4. **Aha moment**: Receive first AI SMS within <5 minutes of FUB connection
   - VERIFY: Test lead submitted via FUB webhook
   - VERIFY: SMS sent to test phone within 30 seconds
   - VERIFY: SMS appears in agent's dashboard lead feed
   - VERIFY: Agent can click "View Full Conversation" to see AI response

5. **Trial ROI email**: Sent automatically on day 2 and day 7
   - VERIFY: Email received by test@leadflow.ai
   - VERIFY: Email includes "You received X AI responses" metric
   - VERIFY: Email includes "Your agents responded in <30s" stat
   - VERIFY: Email has "Upgrade to Pro" CTA button

6. **Pricing clarity**: Trial users see clear upgrade prompt + price
   - VERIFY: Visit /dashboard as trial user on day 10
   - VERIFY: Banner shows "Your free trial ends in 3 days"
   - VERIFY: Banner includes upgrade CTA with price ($49, $149, or $399)
   - VERIFY: Clicking upgrade → Stripe checkout with correct price pre-filled

7. **Pilot recruitment**: 3+ white-glove agents activated and actively using
   - VERIFY: 3+ agents in `customers` table with `pilot_inviter='stojan'`
   - VERIFY: All 3 have FUB integrations configured
   - VERIFY: All 3 have received ≥1 AI SMS in the last 24 hours
   - VERIFY: At least 1 has clicked "Upgrade to Pro"

8. **Revenue tracking**: MRR recorded in database
   - VERIFY: `SELECT SUM(mrr_cents)/100 FROM subscriptions WHERE status='active'` ≥ expected
   - VERIFY: At least 1 row in `payments` table with `status='succeeded'`
   - VERIFY: At least 1 row in `mrr_snapshots` with `total_mrr > 0`

---

## Implementation Roadmap

### Phase 1: Pilot Activation (Days 1-3) ⚡ CRITICAL
**Owner:** Product Manager + Orchestrator + Marketing  
**Goal:** Get 3 white-glove agents actively using the product

#### UC-PILOT-DIRECT-RECRUITMENT
1. Select 3 target agents (real estate pros willing to participate)
2. Send white-glove onboarding invite with:
   - Personal Zoom walkthrough scheduled (Stojan hosts)
   - FUB setup assistance (copy-paste API keys, no manual config)
   - Test lead sequence (10 sample leads to trigger AI responses)
3. Success metric: All 3 receive ≥5 AI SMS responses, understand product value
4. Handoff to sales: Ask "ready to upgrade?" after demo

**Acceptance Checks:**
```sql
-- Verify pilot agents created
SELECT COUNT(*) >= 3 FROM customers WHERE signup_source = 'pilot_invite' AND created_at > NOW() - INTERVAL '3 days';

-- Verify they have FUB integrations
SELECT COUNT(*) >= 3 FROM agent_integrations WHERE integration_type = 'fub' AND status = 'connected';

-- Verify they've received messages
SELECT COUNT(DISTINCT agent_id) >= 3 FROM messages WHERE created_at > NOW() - INTERVAL '3 days';
```

#### UC-REVENUE-RECOVERY-FUNNEL-DIAGNOSTICS
1. Instrument landing page: capture all traffic (UTM, referrer, device)
2. Add email verification: track open rates
3. Track onboarding: which steps users complete, where they drop off
4. Track trial activation: who connects FUB, who doesn't
5. Generate daily report: "Today we had X signups, Y onboarded, Z activated"

**Acceptance Checks:**
```sql
-- Verify event tracking working
SELECT COUNT(*) > 0 FROM events WHERE event_type IN ('landing_page_view', 'signup_click', 'fub_connect_start');

-- Verify funnel is visible
SELECT event_type, COUNT(*) FROM events GROUP BY event_type;
```

#### UC-REVENUE-AHA-MOMENT
1. Simplify onboarding: remove manual FUB setup, provide "Import Your Contacts" wizard
2. Auto-queue test lead after FUB connection (no manual action required)
3. Guarantee AI SMS sent within 30 seconds ("You got your first response!")
4. Show metric in dashboard: "Your agents are responding in <30 seconds"

**Acceptance Checks:**
```sql
-- Verify test leads sent automatically
SELECT COUNT(*) > 0 FROM leads WHERE created_at > NOW() - INTERVAL '3 days' AND lead_source = 'onboarding_test';

-- Verify AI responses triggered
SELECT COUNT(*) > 0 FROM messages WHERE ai_response = true AND created_at > NOW() - INTERVAL '3 days';

-- Verify users see aha moment within 5 min of FUB connect
SELECT AVG(EXTRACT(EPOCH FROM (message_sent_at - fub_connected_at))/60) < 5 FROM (
  SELECT m.created_at as message_sent_at, 
         MIN(ai.connected_at) as fub_connected_at
  FROM messages m
  JOIN agent_integrations ai ON m.agent_id = ai.agent_id
  WHERE ai.integration_type = 'fub'
  GROUP BY m.agent_id
) t;
```

---

### Phase 2: Trial-to-Paid Conversion (Days 4-7)
**Owner:** Product Manager + Marketing + Dev  
**Goal:** Convert 10+ trial users to paid ($1,490+ MRR)

#### UC-REVENUE-AHA-MOMENT (continued)
Weekly ROI email proving value:
- "Your agents sent X AI SMS responses this week"
- "You responded to leads in <30 seconds (competitors take 2 hours)"
- "That's Y qualified leads your competitors missed"
- CTA: "Upgrade to Pro to keep responding 24/7"

**Acceptance Checks:**
```sql
-- Verify emails sent
SELECT COUNT(*) > 0 FROM email_events WHERE email_type = 'weekly_roi' AND created_at > NOW() - INTERVAL '7 days';

-- Verify emails opened
SELECT COUNT(*) > 0 FROM email_events WHERE email_type = 'weekly_roi' AND opened_at IS NOT NULL;
```

#### UC-REVENUE-PRICING-CLARITY
Pricing clarity banner:
- Shows on dashboard day 5: "Your free trial ends in 10 days"
- Shows on dashboard day 10: "Your free trial ends TOMORROW"
- Includes upgrade CTA with **clear pricing** ($49 Starter, $149 Pro, $399 Team)
- Clicking CTA → Stripe checkout with plan pre-selected

**Acceptance Checks:**
```sql
-- Verify trial status visible
SELECT COUNT(*) > 0 FROM customers WHERE subscription_status = 'trial' AND trial_ends_at < NOW() + INTERVAL '3 days';

-- Verify upgrade prompt shown
SELECT COUNT(*) > 0 FROM events WHERE event_type = 'trial_expiry_banner_shown';

-- Verify clicks to upgrade
SELECT COUNT(*) > 0 FROM events WHERE event_type = 'upgrade_cta_clicked';
```

---

### Phase 3: Scale to $20K (Days 8-11)
**Owner:** Marketing + Orchestrator  
**Goal:** Drive awareness → trial signups → conversion

#### Landing Page Optimization
1. A/B test headline: "Respond to leads in <30 seconds" vs "Never miss a lead again"
2. A/B test CTA: "Start free trial" vs "Get free AI demo"
3. Measure: click-through rate, signup rate, cost per signup

#### Referral Program
1. Paid agents get $100 credit for each agent they refer who upgrades
2. Marketing: Email to first 3 paid agents: "Refer a friend, get $100 credit"
3. Viral loop: Each agent invites 2-3 peers → 6-9 additional signups → $900-1,350 MRR

#### Nurture Sequence
1. Day 0: Welcome email + FUB setup guide
2. Day 2: "Here's what your AI did this week" (ROI email)
3. Day 5: "Your competitors use our AI. Don't get left behind"
4. Day 7: "Your trial ends in 7 days — upgrade now"
5. Day 13: Re-engagement: "We miss you! Try it again for free"

---

## Technical Requirements

### 1. Landing Page Analytics
**File:** `product/lead-response/dashboard/app/page.tsx`

```typescript
// Capture UTM params on page load
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
  };
  // POST to /api/events with event_type='landing_page_view', utm data
}, []);

// Track CTA clicks
const handleSignupClick = () => {
  trackEvent('signup_cta_clicked', { utm_source: getUTM('source') });
  router.push('/signup');
};
```

### 2. Email Verification
**File:** `product/lead-response/dashboard/app/verify-email/route.ts`

```typescript
// Verify email token, mark customer.email_verified = true
// Send verification success event
trackEvent('email_verified', { customer_id });
// Redirect to /dashboard/onboarding (NOT /dashboard)
```

### 3. Onboarding Wizard
**File:** `product/lead-response/dashboard/app/dashboard/onboarding/page.tsx`

Steps:
1. **Welcome** → Confirm agent name, phone
2. **FUB Setup** → Show API key location in FUB, paste it here
3. **Team Setup** (optional) → Add team members
4. **Test Lead** → "We'll send a test lead to see the AI in action"
5. **Ready!** → "Your first real lead could arrive any minute"

**Success:** Agent sees test lead appear in feed within 30 seconds

### 4. Trial Status Tracking
**File:** `product/lead-response/dashboard/app/dashboard/page.tsx`

```typescript
// On load, check subscription_status = 'trial'
if (trial && daysRemaining <= 3) {
  showBanner('Your free trial ends in X days');
}

// Banner includes:
// - Days remaining
// - Plan comparison (Starter $49, Pro $149, Team $399)
// - "Upgrade Now" button → /billing/upgrade
```

### 5. Weekly ROI Email
**File:** `scripts/emails/weekly-roi-report.js`

Triggered every Monday at 9 AM:
```javascript
const { data: customers } = await db.from('customers').select('*').eq('subscription_status', 'trial');

for (const customer of customers) {
  const { data: messages } = await db.from('messages')
    .select('*')
    .eq('agent_id', customer.id)
    .gte('created_at', sevenDaysAgo);
  
  const avgResponseTime = calculateAverage(messages.map(m => m.response_time_ms));
  
  await sendEmail(customer.email, {
    subject: 'Your AI Sent X Responses This Week',
    body: `
      This week, your AI responded to ${messages.length} leads in <${avgResponseTime}ms seconds.
      Your competitors are still calling them back tomorrow.
      
      Ready to make this official? Upgrade to Pro for unlimited AI responses.
    `,
    cta_url: 'https://leadflow-ai-five.vercel.app/billing/upgrade'
  });
}
```

### 6. Database Schema Requirements

**Must exist and be functional:**
```sql
-- Customer tracking
customers(id, email, subscription_status, trial_ends_at, created_at)

-- Conversions
subscriptions(customer_id, status, plan_tier, mrr, started_at, cancelled_at)

-- Revenue
mrr_snapshots(date, total_mrr, customer_count, breakdown)
payments(customer_id, amount_cents, status, stripe_payment_id, created_at)

-- Funnel tracking
events(customer_id, event_type, utm_source, utm_medium, utm_campaign, created_at)

-- Product activity
messages(agent_id, ai_response, response_time_ms, created_at)
agent_integrations(agent_id, integration_type, status, connected_at)

-- Pilot tracking
pilot_invites(email, signup_source, accepted_at, status)
```

---

## Deployment Checklist

### Pre-Launch (Before Day 1)
- [ ] Analytics: UTM params captured and stored
- [ ] Email: Verification emails functional + trackable
- [ ] Onboarding: Wizard functional + FUB connection working
- [ ] Test: Create test customer, complete full flow end-to-end
- [ ] Stripe: Production keys configured, real payment tested
- [ ] SMS: Twilio integration tested with real phone number
- [ ] Database: All tables created, no schema errors

### Launch Day (Day 1)
- [ ] White-glove pilot invites sent to 3 target agents
- [ ] Zoom walkthroughs scheduled with Stojan
- [ ] Funnel analytics dashboard live (can see today's signups)
- [ ] Weekly ROI email template ready (manual send on day 2 if needed)

### Pilot Completion (Day 3)
- [ ] All 3 pilots have FUB connected
- [ ] All 3 have received ≥5 test SMS
- [ ] All 3 understand product value
- [ ] Conversion conversation: "Ready to upgrade?"

### Scale Phase (Days 4-11)
- [ ] Landing page A/B tests running
- [ ] Email nurture sequence active
- [ ] Referral program live
- [ ] Daily funnel report sent to Stojan

---

## Risk Mitigation

### Risk 1: Pilot Agents Don't Complete Onboarding
**Mitigation:** White-glove support (Stojan on Zoom, live setup assistance)  
**Fallback:** Concierge onboarding (Orchestrator completes setup for them)

### Risk 2: No Aha Moment Within 30 Seconds
**Mitigation:** Queue test lead automatically after FUB connects  
**Fallback:** Pre-populate dashboard with sample responses showing what's possible

### Risk 3: Stripe Checkout Fails
**Mitigation:** Test production payments with real card before launch  
**Fallback:** Manual Stripe invoice flow as interim solution

### Risk 4: Email Delivery Rate Low
**Mitigation:** Use Resend (reliable transactional email)  
**Fallback:** SMS-based notifications for critical (trial expiry, upgrade offer)

### Risk 5: FUB Integration Unstable
**Mitigation:** Health check: every 24h, verify webhook delivery  
**Fallback:** Manual lead submission UI (paste lead JSON, send SMS)

---

## Success Metrics & Dashboarding

### Real-Time Funnel Metrics (Update Hourly)
```sql
SELECT
  COUNT(DISTINCT customer_id) as new_signups,
  COUNT(DISTINCT CASE WHEN email_verified THEN customer_id END) as email_verified,
  COUNT(DISTINCT CASE WHEN fub_connected THEN customer_id END) as fub_connected,
  COUNT(DISTINCT CASE WHEN ai_message_sent THEN customer_id END) as aha_moment,
  COUNT(DISTINCT CASE WHEN subscription_status='paid' THEN customer_id END) as paid_customers,
  COALESCE(SUM(mrr_cents)/100, 0) as current_mrr
FROM (
  SELECT c.id as customer_id, c.email_verified, c.created_at,
         MAX(CASE WHEN i.integration_type='fub' THEN i.connected_at END) > NOW() - INTERVAL '3 days' as fub_connected,
         MAX(CASE WHEN m.ai_response THEN m.created_at END) > NOW() - INTERVAL '3 days' as ai_message_sent,
         s.status as subscription_status,
         s.mrr_cents
  FROM customers c
  LEFT JOIN agent_integrations i ON c.id = i.agent_id
  LEFT JOIN messages m ON c.id = m.agent_id
  LEFT JOIN subscriptions s ON c.id = s.customer_id
  WHERE c.created_at > NOW() - INTERVAL '11 days'
  GROUP BY c.id, c.email_verified, s.status, s.mrr_cents
) t;
```

### Daily Report to PM
**File:** `scripts/generate-revenue-report.js` (runs daily at 6 AM)

Output:
```
=== DAILY REVENUE REPORT — Day X of 60 ===
Landing page: 15 visitors, 3 signups (20% CTR)
Trials: 5 active, 2 with aha moment, 1 converted to paid
Current MRR: $149
Progress to $20K: $149 / $20,000 (0.7%)
Days remaining: 11
Required pace: $1,818/day

CRITICAL ACTIONS:
- [ ] 3 pilot agents recruited and onboarded
- [ ] Weekly ROI email sent to trials
- [ ] Landing page A/B test launched
```

---

## Definition of Done

This task is **complete** when:

1. ✅ **All acceptance criteria pass** (8 automated checks listed above)
2. ✅ **Pilot agents recruited** (3+ agents signed up via pilot invite link)
3. ✅ **Aha moment validated** (3+ agents received AI SMS within 30 seconds)
4. ✅ **Revenue tracking live** (MRR snapshots recorded in database)
5. ✅ **Funnel analytics operational** (UTM tracking, conversion events, daily report)
6. ✅ **Email nurture ready** (weekly ROI email template + automation)
7. ✅ **Stripe checkout tested** (real transaction processed successfully)
8. ✅ **PRD updated in Supabase** (this document linked to UC-REVENUE-RECOVERY-CRITICAL-2026-04-04)

---

## Appendix: Glossary

- **MRR:** Monthly Recurring Revenue (sum of all active subscription monthly fees)
- **AHA Moment:** First meaningful interaction where user perceives product value
- **Trial Activation:** Trial user completes FUB setup + receives first AI response
- **Conversion Rate:** % of activated trials → paid subscriptions in <14 days
- **ARPU:** Average Revenue Per User (MRR / active customers)
- **CAC:** Customer Acquisition Cost (marketing spend / new customers)
- **LTV:** Lifetime Value (expected revenue per customer before churn)
- **UTM:** URL parameters (utm_source, utm_medium, utm_campaign) for tracking campaigns

---

**Next Review:** Daily standup with Stojan until Day 11.  
**Escalation Path:** If any acceptance check fails, escalate to Dev immediately.
