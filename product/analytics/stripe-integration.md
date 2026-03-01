# Stripe Integration Plan
## AI Lead Response System — Subscription & Revenue Tracking

---

## 1. Pricing Tier Structure

### Tier Overview

| Tier | Monthly | Annual (2 months free) | Target Customer |
|------|---------|------------------------|-----------------|
| **Starter** | $497/mo | $4,970/yr | Individual agents, < 50 leads/mo |
| **Professional** | $997/mo | $9,970/yr | Teams, 50-150 leads/mo |
| **Enterprise** | $1,997/mo | $19,970/yr | Brokerages, 150+ leads/mo |

### Feature Breakdown

**Starter ($497/mo)**
- Up to 50 leads/month
- AI SMS/email responses
- Basic qualification
- Calendar integration (1 agent)
- Standard support (email)
- Basic analytics dashboard

**Professional ($997/mo)** — *Recommended for most*
- Up to 150 leads/month
- AI SMS/email + voice responses
- Advanced qualification scoring
- Calendar integration (5 agents)
- Priority support (chat + email)
- Advanced analytics + API access
- Team collaboration features
- Custom AI training

**Enterprise ($1,997/mo)**
- Unlimited leads
- Multi-channel AI (SMS/email/voice/chat)
- Custom qualification workflows
- Calendar integration (unlimited)
- Dedicated account manager
- White-label options
- SLA guarantees (99.9% uptime)
- Custom integrations
- Onboarding specialist

### Add-Ons

| Add-On | Price | Description |
|--------|-------|-------------|
| Extra lead pack (100) | $200/mo | Additional leads beyond tier limit |
| Additional phone number | $25/mo | Extra dedicated line |
| Custom AI persona | $500 setup | Personalized AI voice/character |
| Advanced reporting | $150/mo | Custom dashboards, exports |

---

## 2. Subscription Setup

### Stripe Product Structure

```javascript
// Products in Stripe
const products = {
  starter: {
    id: 'prod_starter_001',
    name: 'AI Lead Response - Starter',
    metadata: {
      tier: 'starter',
      lead_limit: 50,
      annual_discount: '2_months'
    }
  },
  professional: {
    id: 'prod_professional_001', 
    name: 'AI Lead Response - Professional',
    metadata: {
      tier: 'professional',
      lead_limit: 150,
      recommended: 'true'
    }
  },
  enterprise: {
    id: 'prod_enterprise_001',
    name: 'AI Lead Response - Enterprise',
    metadata: {
      tier: 'enterprise',
      lead_limit: 'unlimited',
      sla: '99.9'
    }
  }
};

// Prices (per tier)
const prices = {
  starter_monthly: { id: 'price_starter_mo', amount: 49700, interval: 'month' },
  starter_annual: { id: 'price_starter_yr', amount: 497000, interval: 'year' },
  professional_monthly: { id: 'price_prof_mo', amount: 99700, interval: 'month' },
  professional_annual: { id: 'price_prof_yr', amount: 997000, interval: 'year' },
  enterprise_monthly: { id: 'price_ent_mo', amount: 199700, interval: 'month' },
  enterprise_annual: { id: 'price_ent_yr', amount: 1997000, interval: 'year' }
};
```

### Checkout Flow

```javascript
// Stripe Checkout Session
const session = await stripe.checkout.sessions.create({
  customer_email: agent.email,
  billing_address_collection: 'required',
  payment_method_types: ['card'],
  line_items: [{
    price: 'price_prof_mo',  // Selected tier
    quantity: 1
  }],
  mode: 'subscription',
  subscription_data: {
    trial_period_days: 14,    // 14-day free trial
    metadata: {
      agent_id: agent.id,
      source: 'onboarding_flow',
      utm_campaign: 'launch_2026'
    }
  },
  success_url: `${BASE_URL}/onboarding/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing?canceled=true`,
  automatic_tax: { enabled: true },
  tax_id_collection: { enabled: true }
});
```

### Trial Configuration

- **Duration**: 14 days
- **Features**: Full Professional tier access
- **Lead limit**: 25 leads during trial
- **Credit card**: Required upfront (authorize $1)
- **Conversion**: Auto-converts to paid unless cancelled

---

## 3. Webhook Handling

### Webhook Endpoint Setup

```javascript
// Express webhook handler
app.post('/webhooks/stripe', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`Webhook signature verification failed:`, err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle events
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleCancellation(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  }
);
```

### Critical Event Handlers

```javascript
// 1. New subscription created
async function handleCheckoutComplete(session) {
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const agentId = subscription.metadata.agent_id;
  
  // Activate account
  await db.agents.update(agentId, {
    status: 'active',
    stripe_customer_id: session.customer,
    stripe_subscription_id: session.subscription,
    plan_tier: getTierFromPrice(subscription.items.data[0].price.id),
    mrr: calculateMRR(subscription),
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
  });
  
  // Track in PostHog
  posthog.capture('subscription_created', {
    distinct_id: agentId,
    plan: subscription.metadata.plan,
    mrr: calculateMRR(subscription),
    is_trial: !!subscription.trial_end,
    trial_end_date: subscription.trial_end
  });
  
  // Send welcome email
  await sendWelcomeEmail(agentId);
}

// 2. Successful payment (MRR tracking)
async function handleInvoicePaid(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const agentId = subscription.metadata.agent_id;
  const amount = invoice.amount_paid / 100; // Convert from cents
  
  // Record revenue
  await db.revenue.insert({
    agent_id: agentId,
    invoice_id: invoice.id,
    amount: amount,
    currency: invoice.currency,
    period_start: new Date(invoice.period_start * 1000),
    period_end: new Date(invoice.period_end * 1000),
    status: 'paid',
    recorded_at: new Date()
  });
  
  // Update MRR in analytics
  const mrr = calculateMRR(subscription);
  await updateMRRMetrics(agentId, mrr);
  
  // Track event
  posthog.capture('invoice_paid', {
    distinct_id: agentId,
    amount: amount,
    mrr: mrr,
    is_recurring: invoice.billing_reason === 'subscription_cycle'
  });
}

// 3. Payment failed (churn risk)
async function handlePaymentFailed(invoice) {
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const agentId = subscription.metadata.agent_id;
  const attemptCount = invoice.attempt_count;
  
  // Alert account at risk
  await db.agents.update(agentId, {
    payment_status: 'past_due',
    payment_retry_count: attemptCount
  });
  
  // Send dunning email
  if (attemptCount === 1) {
    await sendPaymentRetryEmail(agentId, invoice);
  } else if (attemptCount >= 3) {
    await sendFinalNoticeEmail(agentId);
  }
  
  posthog.capture('payment_failed', {
    distinct_id: agentId,
    attempt: attemptCount,
    amount_due: invoice.amount_due / 100
  });
}

// 4. Subscription cancelled (churn)
async function handleCancellation(subscription) {
  const agentId = subscription.metadata.agent_id;
  const cancellationDetails = subscription.cancellation_details;
  
  // Record churn
  await db.churn.insert({
    agent_id: agentId,
    subscription_id: subscription.id,
    cancelled_at: new Date(subscription.canceled_at * 1000),
    reason: cancellationDetails?.reason || 'unknown',
    comment: cancellationDetails?.comment || null,
    mrr_lost: calculateMRR(subscription)
  });
  
  // Update agent status
  await db.agents.update(agentId, {
    status: 'cancelled',
    mrr: 0,
    cancelled_at: new Date()
  });
  
  // Churn survey email
  await sendChurnSurvey(agentId, cancellationDetails);
  
  posthog.capture('subscription_cancelled', {
    distinct_id: agentId,
    reason: cancellationDetails?.reason,
    tenure_days: calculateTenure(subscription),
    mrr_lost: calculateMRR(subscription)
  });
}

// 5. Subscription upgraded/downgraded
async function handleSubscriptionUpdate(subscription) {
  const agentId = subscription.metadata.agent_id;
  const previousAttributes = subscription.cancel_at_period_end ? 
    { cancel_at_period_end: false } : {};
  
  // Detect upgrade/downgrade
  const newTier = getTierFromPrice(subscription.items.data[0].price.id);
  const oldTier = await db.agents.getTier(agentId);
  
  if (newTier !== oldTier) {
    const direction = isUpgrade(oldTier, newTier) ? 'upgrade' : 'downgrade';
    
    await db.subscriptions.logChange({
      agent_id: agentId,
      type: direction,
      from_tier: oldTier,
      to_tier: newTier,
      new_mrr: calculateMRR(subscription),
      effective_date: new Date(subscription.current_period_start * 1000)
    });
    
    posthog.capture(`subscription_${direction}`, {
      distinct_id: agentId,
      from_tier: oldTier,
      to_tier: newTier,
      mrr_delta: calculateMRRDelta(oldTier, newTier)
    });
  }
}
```

---

## 4. MRR Tracking System

### MRR Calculation Logic

```javascript
function calculateMRR(subscription) {
  const item = subscription.items.data[0];
  const price = item.price;
  const amount = price.unit_amount / 100; // cents to dollars
  
  if (price.recurring.interval === 'month') {
    return amount * item.quantity;
  } else if (price.recurring.interval === 'year') {
    return (amount * item.quantity) / 12;
  }
  return 0;
}

// Daily MRR snapshot
async function snapshotMRR() {
  const activeSubscriptions = await stripe.subscriptions.list({
    status: 'active',
    limit: 100
  });
  
  let totalMRR = 0;
  const breakdown = { starter: 0, professional: 0, enterprise: 0 };
  
  for (const sub of activeSubscriptions.data) {
    const mrr = calculateMRR(sub);
    totalMRR += mrr;
    
    const tier = getTierFromSubscription(sub);
    breakdown[tier] += mrr;
  }
  
  // Store in analytics DB
  await db.mrr_snapshots.insert({
    date: new Date(),
    total_mrr: totalMRR,
    breakdown: breakdown,
    customer_count: activeSubscriptions.data.length,
    arr: totalMRR * 12
  });
  
  return { totalMRR, breakdown };
}
```

### MRR Metrics to Track

| Metric | Formula | Target |
|--------|---------|--------|
| Total MRR | Sum of all active subscriptions | $20K by day 60 |
| New MRR | MRR from new customers this month | $5K/month |
| Expansion MRR | MRR from upgrades | Positive |
| Contraction MRR | MRR from downgrades | < 5% of MRR |
| Churned MRR | MRR lost to cancellations | < 5% monthly |
| Net MRR Growth | New + Expansion - Churned | > 10% monthly |

---

## 5. Revenue Recognition

### Monthly Close Process

```javascript
// Run on 1st of each month
async function monthlyRevenueClose() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const endOfMonth = new Date(startOfMonth);
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  
  // Calculate recognized revenue
  const revenue = await db.revenue.aggregate({
    where: {
      period_start: { $gte: startOfMonth },
      period_end: { $lt: endOfMonth },
      status: 'paid'
    },
    sum: 'amount'
  });
  
  // Calculate churn
  const churned = await db.churn.count({
    where: {
      cancelled_at: { $gte: startOfMonth, $lt: endOfMonth }
    }
  });
  
  const totalCustomers = await db.agents.count({ status: 'active' });
  
  return {
    month: startOfMonth.toISOString().slice(0, 7),
    recognized_revenue: revenue,
    mrr_end_of_month: await getCurrentMRR(),
    churn_rate: churned / (totalCustomers + churned),
    customer_count: totalCustomers
  };
}
```

---

## 6. Dunning & Retention

### Dunning Sequence

| Day | Action | Channel |
|-----|--------|---------|
| 0 | Payment fails | - |
| 0 | Retry #1 | Automated |
| 1 | Email: "Update payment method" | Email |
| 3 | Retry #2 | Automated |
| 3 | Email: "Your account will be suspended" | Email |
| 5 | Retry #3 | Automated |
| 5 | SMS notification | SMS |
| 7 | Account suspended | In-app |
| 14 | Data deletion warning | Email |
| 30 | Account cancellation | System |

### Cancellation Win-Back

```javascript
async function handleCancellationWinback(agentId, reason) {
  const offers = {
    'too_expensive': { discount: 20, message: '20% off for 3 months' },
    'not_using': { discount: 50, message: '50% off for 2 months + training call' },
    'missing_features': { action: 'schedule_call', message: 'Free feature request call' },
    'switched_competitor': { action: 'competitive_offer', message: 'Price match guarantee' }
  };
  
  const offer = offers[reason] || offers['not_using'];
  
  await sendWinbackEmail(agentId, offer);
  await db.winback_campaigns.insert({ agent_id: agentId, offer: offer });
}
```

---

## 7. Implementation Checklist

### Phase 1: Core Setup (Week 1)
- [ ] Create Stripe account
- [ ] Configure products & prices
- [ ] Set up webhook endpoint
- [ ] Implement checkout flow
- [ ] Test payment flow end-to-end

### Phase 2: Webhooks (Week 1-2)
- [ ] Deploy webhook handlers
- [ ] Set up webhook signature verification
- [ ] Implement all event handlers
- [ ] Configure retry logic
- [ ] Add webhook monitoring

### Phase 3: Analytics (Week 2)
- [ ] Connect MRR to PostHog
- [ ] Build revenue dashboard
- [ ] Set up churn alerts
- [ ] Configure dunning sequence

### Phase 4: Optimization (Week 3+)
- [ ] A/B test pricing page
- [ ] Implement win-back campaigns
- [ ] Set up revenue forecasting
- [ ] Configure tax collection

---

## 8. Security Considerations

- **Webhook secrets**: Rotate quarterly
- **API keys**: Store in environment variables, never commit
- **PCI compliance**: Never store raw card data (Stripe handles this)
- **Audit logging**: Log all subscription changes
- **Rate limiting**: Protect webhook endpoints

---

## 9. Testing Strategy

```bash
# Test webhook handlers with Stripe CLI
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```
