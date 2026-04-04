# PRD: P0 Implementation Specifications — Revenue Recovery Actions

**PRD ID:** prd-p0-implementation-specs  
**Status:** active  
**Created:** 2026-03-31  
**Estimated Dev Time:** 3.5 days  
**Expected Revenue Impact:** +$300-450 MRR in Week 1, +$1,000-2,000 by Week 2

---

## Overview

This document contains detailed technical specs for the 5 P0 use cases that directly unblock revenue. Each spec includes acceptance criteria that QC can verify without ambiguity.

---

## UC-1: Fix Email Verification — Enable Trial Activation

**Owner:** Dev  
**Priority:** P0 (Blocks 40% of pipeline)  
**Timeline:** 1 day  
**Success Metric:** 90% of trial signups complete email verification

### Problem Statement

Currently:
- 5 agents have signed up for trial
- Only ~2 have verified their email (34% completion rate)
- 3 agents are stuck at "Please verify your email" screen
- Root causes: (1) Resend API key not configured in Vercel → emails not sending, (2) UI doesn't clearly explain what to do

### Solution

#### Step 1: Fix Email Infrastructure (0.25 day)

**What:** Add RESEND_API_KEY to Vercel leadflow-ai project environment

**How:**
1. Get API key from Resend dashboard (Stojan has access)
2. Go to Vercel → leadflow-ai project → Settings → Environment Variables
3. Add: `RESEND_API_KEY = [key]`
4. Also add: `FROM_EMAIL = noreply@leadflow-ai.com` (or whatever sender domain)
5. Redeploy: `cd product/lead-response/dashboard && vercel --prod`

**QC Acceptance:**
- [ ] POST to `/api/lead-capture` with email → receives response with `{ "success": true }`
- [ ] Email arrives in test mailbox within 60 seconds
- [ ] Email contains working verification link

#### Step 2: Improve Email Verification UI (0.25 day)

**File:** `product/lead-response/dashboard/app/(auth)/verify-email/page.tsx`

**Current State:** Plain text message "Check your email for a verification link"

**New State:** Clear visual hierarchy with:
1. Large checkmark icon (✓)
2. Headline: "Check Your Email"
3. Subheading: "We sent a verification link to [email]"
4. Call-to-Action: "Click the button in the email to verify and start using LeadFlow"
5. Secondary action: "Didn't receive the email?" link → "Resend" button
6. Tertiary action: "Wrong email?" link → "Change email" (optional, can skip)

**Code Changes:**
- Update page.tsx to render Resend form component (styled, modern, mobile-responsive)
- Add countdown timer: "Resend available in 30 seconds" (after first send)
- Update email template in `lib/email-service.ts` to include big button with background color

**QC Acceptance:**
- [ ] Verify email page loads without errors
- [ ] "Resend" button appears and works
- [ ] Email arrives on second attempt
- [ ] Page is mobile-responsive (375px viewport)
- [ ] No horizontal scrolling

#### Step 3: Update Email Template (0.25 day)

**File:** `lib/email-templates/verification-email.ts`

**Current:** Plain text, hard to spot the verification link

**New:** HTML email with:
1. LeadFlow logo + branding
2. Personalized greeting: "Hi [name],"
3. Body text: "Welcome to LeadFlow AI! To start using your free trial, verify your email by clicking the button below."
4. **Large CTA button** (not a link): "Verify Email" with background color and padding
5. Fallback link text: "Or copy this link: [verification_url]"
6. Footer with support email

**Template Code Example:**
```html
<body style="font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1>Verify Your Email</h1>
    <p>Hi {{name}},</p>
    <p>Welcome to LeadFlow AI! To start your free trial, verify your email by clicking the button below.</p>
    
    <a href="{{verification_url}}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      Verify Email Address
    </a>
    
    <p style="margin-top: 20px; color: #666;">
      Or copy this link: <code>{{verification_url}}</code>
    </p>
  </div>
</body>
```

**QC Acceptance:**
- [ ] Email template renders in Gmail without issues
- [ ] Email template renders in Outlook
- [ ] Email template renders on mobile (375px)
- [ ] CTA button is clearly clickable (not underlined like a link)

### Acceptance Criteria (Full UC)

- [ ] AC-1: RESEND_API_KEY environment variable set in Vercel
- [ ] AC-2: Verification email arrives within 60 seconds of signup
- [ ] AC-3: Email template contains prominent "Verify Email" button (not link)
- [ ] AC-4: Verify Email page shows "Resend" button with 30-second cooldown
- [ ] AC-5: Test signup flow: create account → receive email → click link → verify → land on dashboard
- [ ] AC-6: All 3 stuck agents can verify with their existing tokens
- [ ] AC-7: Mobile experience is smooth (no horizontal scroll, readable text)

### Risk & Mitigation

**Risk:** Email still not sending after adding API key (integration broken)  
**Mitigation:** QC must test Resend API directly before marking done. Check Resend dashboard for bounce/error logs.

---

## UC-2: Wire Aha Moment Simulator into Onboarding Wizard

**Owner:** Dev  
**Priority:** P0 (Drives trial-to-paid conversion)  
**Timeline:** 1 day  
**Success Metric:** 100% of new agents see lead simulator during onboarding; >80% complete it

### Problem Statement

- Lead Experience Simulator component exists (`/admin/simulator`)
- BUT it's not integrated into the onboarding wizard that new agents see
- New agents skip straight from "SMS setup" to "congratulations" without ever seeing the aha moment
- Result: Agents don't understand how LeadFlow responds to leads → kill conversion

### Solution

#### Step 1: Create Simulator Step Component (0.25 day)

**File:** Create `product/lead-response/dashboard/app/onboarding/steps/simulator.tsx`

**Component Structure:**
```tsx
export default function SimulatorStep({ 
  onStepComplete, 
  onSkip,
  agentData 
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const startSimulation = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/simulator/start', {
        method: 'POST',
        body: JSON.stringify({ agentId: agentData.id })
      });
      const { sessionId: sid, conversation: conv } = await response.json();
      setSessionId(sid);
      setConversation(conv);
      
      // Poll for response
      pollForResponse(sid);
    } catch (err) {
      setError('Failed to start simulation. Please try again.');
    }
  };
  
  const pollForResponse = async (sid: string) => {
    // Poll /api/simulator/status until response_complete = true
    // Update conversation array as messages arrive
    // When complete, show success state with response_time_ms
  };
  
  return (
    <div className="simulator-container">
      <h2>See LeadFlow in Action</h2>
      <p>Let's run a quick simulation to show you how LeadFlow responds to leads.</p>
      
      {!completed && !error && (
        <button onClick={startSimulation} disabled={loading}>
          {loading ? 'Starting simulation...' : 'Start Simulation'}
        </button>
      )}
      
      {conversation.length > 0 && (
        <ConversationViewer messages={conversation} />
      )}
      
      {completed && (
        <SuccessState responseTimeMs={agentData.ahaResponseTimeMs} />
      )}
      
      {error && (
        <ErrorState error={error} onRetry={startSimulation} />
      )}
      
      <button onClick={onSkip}>Skip for now</button>
    </div>
  );
}
```

**Key Features:**
- No setup required (uses existing agentId)
- Shows conversation in real-time as AI responds
- Displays response time in milliseconds (proves <30 second claim)
- "Skip" option for agents who don't want to see it
- Capture `ahaCompleted` and `ahaResponseTimeMs` for analytics

#### Step 2: Wire Into Onboarding Wizard (0.25 day)

**File:** `product/lead-response/dashboard/app/onboarding/page.tsx`

**Current:**
```tsx
type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'confirmation';
```

**New:**
```tsx
type OnboardingStep = 'welcome' | 'agent-info' | 'calendar' | 'sms' | 'simulator' | 'confirmation';

// In steps array:
const STEPS: OnboardingStep[] = ['welcome', 'agent-info', 'calendar', 'sms', 'simulator', 'confirmation'];

// Add import:
import SimulatorStep from './steps/simulator';

// In renderer:
case 'simulator':
  return <SimulatorStep 
    agentData={agentData}
    onStepComplete={() => nextStep()}
    onSkip={() => nextStep()}
  />;
```

**Update completeOnboarding() payload:**
```tsx
const payload = {
  // ... existing fields
  aha_completed: agentData.ahaCompleted,
  aha_response_time_ms: agentData.ahaResponseTimeMs,
};
```

#### Step 3: Add Sample Leads to Empty Dashboard (0.25 day)

**Problem:** New agents see empty dashboard because they haven't received any real leads yet.

**Solution:** Auto-generate 3 sample leads on first login

**File:** `product/lead-response/dashboard/app/dashboard/page.tsx`

**Implementation:**
```tsx
// On first dashboard load for new agents
const response = await fetch('/api/leads/init-samples', {
  method: 'POST',
  body: JSON.stringify({ agentId })
});
// Creates 3 demo leads with AI responses
```

**Backend:** Create `/api/leads/init-samples/route.ts`
```ts
export async function POST(req: Request) {
  const { agentId } = await req.json();
  
  // Check if agent already has sample leads
  const existing = await db.from('leads')
    .select('id')
    .eq('agent_id', agentId)
    .eq('is_demo', true);
  
  if (existing.length > 0) return { success: true };
  
  // Create 3 sample leads
  const samples = [
    { name: 'John Smith', property: '123 Main St', source: 'Zillow', is_demo: true },
    { name: 'Sarah Johnson', property: '456 Oak Ave', source: 'Zillow', is_demo: true },
    { name: 'Mike Chen', property: '789 Pine Rd', source: 'Zillow', is_demo: true },
  ];
  
  await db.from('leads').insert(samples.map(s => ({
    agent_id: agentId,
    ...s,
    sms_message: `Hi ${s.name}, I'm ${agent.name} from ReMax. I found a property at ${s.property} that matches your criteria...`,
    sms_status: 'delivered',
    created_at: new Date(),
  })));
  
  return { success: true };
}
```

#### Step 4: Update Confirmation Page (0.25 day)

**File:** `product/lead-response/dashboard/app/onboarding/steps/confirmation.tsx`

**Add Aha Moment Status Row:**
```tsx
<div className="status-item">
  <span className="label">✓ Aha Moment Completed</span>
  <span className="time">{agentData.ahaResponseTimeMs}ms</span>
</div>
```

### Acceptance Criteria (Full UC)

- [ ] AC-1: simulator.tsx exists at exact path
- [ ] AC-2: OnboardingStep type includes 'simulator'
- [ ] AC-3: Simulator appears as step 5 of 6 in wizard progress bar
- [ ] AC-4: Starting simulation calls /api/simulator/start with agentId
- [ ] AC-5: Conversation renders as messages arrive (lead left, AI response right)
- [ ] AC-6: Success state shows response time (e.g., "AI responded in 2.3 seconds")
- [ ] AC-7: ahaCompleted=true and ahaResponseTimeMs are captured
- [ ] AC-8: Skip button allows continuing without completing simulator
- [ ] AC-9: Sample leads auto-generate on first dashboard login
- [ ] AC-10: Dashboard shows 3 demo leads marked with "DEMO" badge
- [ ] AC-11: Demo leads disappear when real FUB leads arrive
- [ ] AC-12: Confirmation page shows "Aha Moment Completed" with checkmark

---

## UC-3: Self-Serve Upgrade to Pro

**Owner:** Dev  
**Priority:** P0 (Unlocks revenue)  
**Timeline:** 1 day  
**Success Metric:** 1st trial agent upgrades to Pro within 3 days of starting trial

### Problem Statement

- Pilot agents get free access indefinitely (no expiration)
- Trial agents get 14 days free but no upgrade path
- Currently: Stojan manually creates Stripe subscription (doesn't scale)
- Result: $0 MRR, no conversion loop

### Solution

#### Step 1: Add Upgrade Button to Dashboard (0.25 day)

**File:** `product/lead-response/dashboard/app/dashboard/layout.tsx`

**Add to header/top bar:**
```tsx
{(agentData.plan_tier === 'trial' || agentData.plan_tier === 'pilot') && (
  <UpgradeButton 
    currentPlan={agentData.plan_tier} 
    onClick={() => router.push('/upgrade')}
  />
)}
```

**UpgradeButton Component:**
```tsx
export default function UpgradeButton({ currentPlan, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
    >
      {currentPlan === 'trial' ? 'Upgrade to Pro' : 'Join as Paying Partner'}
    </button>
  );
}
```

#### Step 2: Create Upgrade Flow Page (0.25 day)

**File:** Create `product/lead-response/dashboard/app/upgrade/page.tsx`

**Content:**
1. Header: "Choose Your Plan"
2. Plan cards (Starter $49, Pro $149, Team $399) with feature comparison
3. Selected plan highlighted
4. "Get Started" button calls `/api/billing/create-checkout-session`

```tsx
export default function UpgradePage() {
  const plans = [
    { id: 'starter', name: 'Starter', price: 49, features: [...] },
    { id: 'pro', name: 'Pro', price: 149, features: [...], recommended: true },
    { id: 'team', name: 'Team', price: 399, features: [...] },
  ];
  
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [loading, setLoading] = useState(false);
  
  const handleCheckout = async () => {
    setLoading(true);
    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ tier: selectedPlan })
    });
    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe
  };
  
  return (
    <div>
      <h1>Choose Your Plan</h1>
      <div className="plans-grid">
        {plans.map(plan => (
          <PlanCard 
            key={plan.id}
            plan={plan}
            selected={selectedPlan === plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            recommended={plan.recommended}
          />
        ))}
      </div>
      <button onClick={handleCheckout} disabled={loading}>
        {loading ? 'Processing...' : `Get Started with ${plans.find(p => p.id === selectedPlan).name}`}
      </button>
    </div>
  );
}
```

#### Step 3: Verify Stripe Webhook Updates Plan Tier (0.25 day)

**File:** `product/lead-response/dashboard/app/api/webhooks/stripe/route.ts`

**Ensure this exists and works:**
```ts
// On checkout.session.completed:
await db.from('real_estate_agents')
  .update({
    plan_tier: planNameToTier(session.metadata.tier),
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscription.id,
    plan_activated_at: new Date(),
    status: 'active'
  })
  .eq('id', agentId);
```

**QC Test:**
1. Create trial account
2. Click "Upgrade to Pro"
3. Use Stripe test card: 4242 4242 4242 4242
4. Webhook fires and updates agent record
5. Dashboard shows "Pro plan active"

#### Step 4: Show Paid Status in Dashboard (0.25 day)

**File:** `product/lead-response/dashboard/app/dashboard/layout.tsx`

**Update header to show:**
```tsx
{agentData.plan_tier === 'pro' && (
  <span className="badge badge-success">Pro Plan Active</span>
)}
```

### Acceptance Criteria (Full UC)

- [ ] AC-1: "Upgrade to Pro" button visible in dashboard for trial agents (not for pro/team agents)
- [ ] AC-2: Button is prominent and easy to find (header, top-right area)
- [ ] AC-3: Clicking button navigates to `/upgrade` page
- [ ] AC-4: Plan selection page shows all 3 tiers with correct prices ($49, $149, $399)
- [ ] AC-5: Pro plan is pre-selected and marked as "Most Popular"
- [ ] AC-6: "Get Started" button opens Stripe Checkout session
- [ ] AC-7: Checkout session has correct price_id and amount
- [ ] AC-8: Stripe webhook receives checkout.session.completed event
- [ ] AC-9: real_estate_agents.plan_tier updates to 'pro' after payment
- [ ] AC-10: Dashboard shows "Pro Plan Active" badge
- [ ] AC-11: Webhook is idempotent (same webhook fired 2x doesn't double-charge)
- [ ] AC-12: Test: Create trial account → Upgrade to Pro → Verify in Stripe Dashboard

---

## UC-4: Trial Countdown Timer in Dashboard

**Owner:** Dev + Design  
**Priority:** P0 (Creates urgency for conversion)  
**Timeline:** 0.5 day  
**Success Metric:** 80% of trial agents see countdown before expiry

### Problem Statement

- Trial agents don't know when their free trial expires (default 14 days)
- No visual urgency → low conversion rate
- Result: Agents silently stop using product after trial ends without upgrading

### Solution

**File:** `product/lead-response/dashboard/app/dashboard/layout.tsx`

**Add to dashboard header:**
```tsx
{agentData.plan_tier === 'trial' && agentData.trial_ends_at && (
  <TrialCountdownBanner expiresAt={agentData.trial_ends_at} />
)}
```

**TrialCountdownBanner Component:**
```tsx
export default function TrialCountdownBanner({ expiresAt }) {
  const daysRemaining = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));
  
  const bgColor = daysRemaining <= 3 ? 'bg-red-100' : 
                 daysRemaining <= 7 ? 'bg-yellow-100' : 
                 'bg-blue-100';
  
  const textColor = daysRemaining <= 3 ? 'text-red-900' : 
                   daysRemaining <= 7 ? 'text-yellow-900' : 
                   'text-blue-900';
  
  return (
    <div className={`${bgColor} ${textColor} p-4 rounded-lg mb-4 flex justify-between items-center`}>
      <div>
        <p className="font-bold">Your trial expires in {daysRemaining} days</p>
        <p className="text-sm opacity-75">Upgrade to Pro to keep using LeadFlow</p>
      </div>
      <button 
        onClick={() => router.push('/upgrade')}
        className="btn btn-primary"
      >
        Upgrade Now
      </button>
    </div>
  );
}
```

**Styling:**
- Red background when <3 days left
- Yellow background when <7 days left
- Blue background otherwise
- Always visible at top of dashboard
- Mobile responsive (stack button on small screens)

### Acceptance Criteria

- [ ] AC-1: Timer appears in dashboard header for trial agents
- [ ] AC-2: Timer shows correct number of days remaining
- [ ] AC-3: Timer color changes: blue (normal) → yellow (<7 days) → red (<3 days)
- [ ] AC-4: Timer updates daily
- [ ] AC-5: Timer hidden for paid agents (pro/team/brokerage)
- [ ] AC-6: Timer hidden for pilot agents (no expiry)
- [ ] AC-7: "Upgrade Now" button navigates to `/upgrade`

---

## UC-5: Trial Expiry Email Sequence

**Owner:** Dev  
**Priority:** P0 (Last-mile conversion)  
**Timeline:** 0.5 day  
**Success Metric:** 50%+ of trial agents open emails; 15%+ click upgrade link

### Problem Statement

- Trial agents receive no reminders before trial expires
- On day 15, trial silently expires and SMS stops working
- Agent gets confused: "Why doesn't LeadFlow work anymore?"
- Result: Churn without attempting upgrade

### Solution

**Cron Job:** Daily check for approaching trial expirations

**File:** Create `routes/cron/trial-expiry-email.js`

**Logic:**
```ts
export async function POST(req: Request) {
  // Query: real_estate_agents where plan_tier = 'trial' and trial_ends_at is approaching
  
  const MILESTONE_DAYS = [10, 13, 14];
  
  for (const days of MILESTONE_DAYS) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // Agents expiring in exactly `days` days
    const agents = await db.from('real_estate_agents')
      .select('*')
      .eq('plan_tier', 'trial')
      .gte('trial_ends_at', targetDate)
      .lt('trial_ends_at', nextDate);
    
    for (const agent of agents) {
      // Check if email already sent for this milestone
      const sent = await db.from('agent_email_logs')
        .select('id')
        .eq('agent_id', agent.id)
        .eq('type', `trial_expiry_day_${days}`)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000));
      
      if (sent.length > 0) continue; // Already sent in last 24h
      
      // Send appropriate email
      if (days === 10) {
        await sendTrialDay10Email(agent);
      } else if (days === 13) {
        await sendTrialDay13Email(agent);
      } else if (days === 14) {
        await sendTrialDay14Email(agent);
      }
      
      // Log the send
      await db.from('agent_email_logs').insert({
        agent_id: agent.id,
        type: `trial_expiry_day_${days}`,
        status: 'sent',
      });
    }
  }
}
```

**Email Templates:**

**Day 10 — "Your Trial is Working"**
- Subject: "Your LeadFlow trial is working perfectly"
- Body: "You've seen X leads, Y messages sent, Z bookings. Here's what you could do with Pro..."
- CTA: "Upgrade to Pro ($149/mo)" with one-click link

**Day 13 — "Time to Upgrade"**
- Subject: "You have 1 day left on your trial"
- Body: "Your trial expires tomorrow. Upgrade now to keep using LeadFlow"
- CTA: "Upgrade to Pro before trial expires"

**Day 14 — "Last Chance"**
- Subject: "Your LeadFlow trial expires today"
- Body: "After today, SMS responses will stop. Keep using LeadFlow — upgrade now"
- CTA: "Upgrade to Pro (restore full access)"

**One-Click Upgrade Links:**
```
https://leadflow-ai-five.vercel.app/upgrade?plan=pro&email=[encoded_agent_email]&token=[jwt_token]
```

The `/upgrade` page checks the token and pre-selects the plan.

### Acceptance Criteria

- [ ] AC-1: Cron job scheduled to run daily
- [ ] AC-2: Day 10 email sent to agents expiring in 10 days
- [ ] AC-3: Day 13 email sent to agents expiring in 3 days
- [ ] AC-4: Day 14 email sent to agents expiring tomorrow
- [ ] AC-5: Each email contains one-click upgrade link
- [ ] AC-6: Upgrade link pre-selects Pro plan
- [ ] AC-7: No duplicate emails sent within 24h window
- [ ] AC-8: Emails stop if agent upgrades before expiry
- [ ] AC-9: Email sent within 1h of target day (e.g., day 10 ± 1 hour)
- [ ] AC-10: All emails render correctly in Gmail/Outlook

---

## Implementation Checklist

### Before Starting Dev Work

- [ ] QC confirms all 5 UCs are in READY state (all specs complete, no ambiguity)
- [ ] Dev confirms build environment is stable (no TypeScript errors)
- [ ] Stojan confirms RESEND_API_KEY will be provided

### Dev Phase (Days 1-3)

- [ ] UC-1: Email infrastructure (RESEND_API_KEY + template)
- [ ] UC-1: Email verification UI
- [ ] UC-2: Simulator step component
- [ ] UC-2: Wire into wizard
- [ ] UC-2: Sample leads init
- [ ] UC-3: Upgrade button
- [ ] UC-3: Upgrade page
- [ ] UC-3: Stripe webhook (verify exists)
- [ ] UC-4: Countdown timer
- [ ] UC-5: Cron job + email templates

### QC Phase (Day 4)

- [ ] Test email delivery end-to-end
- [ ] Test onboarding flow with simulator
- [ ] Test upgrade flow with Stripe test card
- [ ] Test countdown timer updates
- [ ] Test email sends at correct milestones
- [ ] Manual testing with real accounts
- [ ] Responsive design on mobile

### Deployment (End of Day 4)

- [ ] All code merged to main
- [ ] Vercel deployment successful
- [ ] All smoke tests passing
- [ ] Manual regression testing by PM
- [ ] Announce to Stojan: "Ready for pilot recruitment"

---

## Success Metrics (After Deployment)

**Day 5-7 (First 72 hours):**
- ✅ 3+ signups complete full onboarding
- ✅ 1+ trial user clicks upgrade link
- ✅ 0 email delivery failures

**Day 8-15 (First 2 weeks):**
- ✅ 10+ signups (with new marketing, if activated)
- ✅ 3+ trial users upgrade to Pro
- ✅ $500+ MRR
- ✅ <20% dropout at email verification

**Day 16-45 (Remaining 30 days):**
- ✅ 50+ total signups
- ✅ 10+ paid customers
- ✅ $1,500+ MRR
- ✅ On track for $20K by Day 90

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-31  
**Next Review:** After dev completion (2026-04-04)
