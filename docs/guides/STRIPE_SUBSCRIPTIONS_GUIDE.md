# Stripe Subscriptions Implementation Guide

Complete documentation for the LeadFlow Stripe Subscriptions system.

## Overview

The Stripe Subscriptions module provides complete lifecycle management for subscriptions including:

- **Subscription Creation**: Create and manage customer subscriptions
- **Plan Changes**: Handle upgrades/downgrades with automatic proration
- **Billing Cycles**: Manage renewal dates and billing periods
- **Webhook Processing**: Handle all subscription-related events
- **Customer Portal**: Self-service subscription management
- **Payment Handling**: Process payments, failures, and retries

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Stripe Subscriptions                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│  │ Billing Enhanced │  │ Subscription    │  │ Billing Cycle  │  │
│  │ Module           │  │ Service         │  │ Manager        │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬───────┘  │
│           │                    │                      │          │
│           └────────────────────┼──────────────────────┘          │
│                                │                                 │
│           ┌────────────────────┼──────────────────────┐          │
│           │                    │                      │          │
│  ┌────────▼────────┐  ┌────────▼─────────┐  ┌────────▼───────┐  │
│  │ Webhook        │  │ Stripe Portal    │  │ Database       │  │
│  │ Processor      │  │ Configuration    │  │ (Supabase)     │  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Module Structure

| File | Description |
|------|-------------|
| `lib/billing-enhanced.js` | Main module integrating all components |
| `lib/subscription-service.js` | Core subscription CRUD operations |
| `lib/billing-cycle-manager.js` | Billing cycles, renewals, proration |
| `lib/webhook-processor.js` | Comprehensive webhook event handling |
| `lib/stripe-portal.js` | Customer portal configuration |
| `routes/billing-enhanced.js` | API endpoints |
| `sql/stripe-subscriptions-schema.sql` | Database schema |

## Quick Start

### 1. Environment Setup

```bash
# Required environment variables
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PROFESSIONAL_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...

# Optional
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PROFESSIONAL_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
STRIPE_PORTAL_PRIMARY_COLOR=#0066FF
```

### 2. Initialize Billing Module

```javascript
const billing = require('./lib/billing-enhanced');

// Initialize on app startup
const status = await billing.initializeBilling();
console.log('Billing status:', status);
```

### 3. Create a Subscription

```javascript
const result = await billing.createCompleteSubscription({
  userId: 'user_123',
  tier: 'professional',  // starter | professional | enterprise
  interval: 'month',     // month | year
  trial: false,
  paymentMethodId: 'pm_123' // optional
});

if (result.requiresPayment) {
  // Use clientSecret with Stripe.js to confirm payment
  console.log('Client secret:', result.clientSecret);
}
```

## API Reference

### Subscription Lifecycle

#### Create Subscription
```http
POST /api/billing/subscriptions
Content-Type: application/json

{
  "userId": "user_123",
  "tier": "professional",
  "interval": "month",
  "trial": false
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_123",
    "stripeSubscriptionId": "sub_stripe_123",
    "status": "active",
    "tier": "professional",
    "interval": "month"
  },
  "requiresPayment": true,
  "clientSecret": "pi_123_secret_..."
}
```

#### Get Subscription Status
```http
GET /api/billing/subscriptions/:userId
```

**Response:**
```json
{
  "hasSubscription": true,
  "subscription": {
    "id": "sub_123",
    "tier": "professional",
    "status": "active",
    "currentPeriodEnd": "2024-03-01T00:00:00Z"
  },
  "billing": {
    "daysRemaining": 15,
    "nextBillingDate": "2024-03-01T00:00:00Z",
    "upcomingInvoice": { ... }
  },
  "portalUrl": "https://billing.stripe.com/..."
}
```

#### Change Plan (Upgrade/Downgrade)
```http
POST /api/billing/subscriptions/:subscriptionId/change
Content-Type: application/json

{
  "newTier": "enterprise",
  "newInterval": "month",
  "effectiveImmediately": true,
  "prorationBehavior": "create_prorations"
}
```

**Response:**
```json
{
  "success": true,
  "change": {
    "subscriptionId": "sub_123",
    "newTier": "enterprise",
    "status": "active"
  },
  "proration": {
    "charges": {
      "netProration": 250.00,
      "prorationCharge": 500.00,
      "prorationCredit": 250.00
    },
    "totalDue": 1247.00
  },
  "effective": "immediately"
}
```

#### Preview Plan Change
```http
POST /api/billing/subscriptions/:subscriptionId/preview-change
Content-Type: application/json

{
  "newTier": "enterprise"
}
```

**Response:**
```json
{
  "success": true,
  "immediateCharge": 450.00,
  "newRegularAmount": 997.00,
  "proration": { ... },
  "billing": { ... }
}
```

#### Cancel Subscription
```http
POST /api/billing/subscriptions/:subscriptionId/cancel
Content-Type: application/json

{
  "immediate": false,
  "reason": "too_expensive",
  "feedback": "Found a cheaper alternative"
}
```

**Response:**
```json
{
  "success": true,
  "cancelled": true,
  "immediate": false,
  "effectiveDate": "2024-03-01T00:00:00Z"
}
```

#### Reactivate Subscription
```http
POST /api/billing/subscriptions/:subscriptionId/reactivate
```

### Billing Cycle Management

#### Get Billing Cycle Info
```http
GET /api/billing/subscriptions/:subscriptionId/cycle
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "sub_123",
  "status": "active",
  "currentPeriod": {
    "start": "2024-02-01T00:00:00Z",
    "end": "2024-03-01T00:00:00Z",
    "elapsed": 1296000,
    "remaining": 1296000
  },
  "cycleProgress": 50,
  "daysRemaining": 15,
  "nextBillingDate": "2024-03-01T00:00:00Z"
}
```

#### Get Renewal History
```http
GET /api/billing/subscriptions/:subscriptionId/renewals
```

**Response:**
```json
{
  "success": true,
  "renewals": [
    {
      "date": "2024-02-01T00:00:00Z",
      "amount": 997.00,
      "status": "succeeded"
    }
  ],
  "totalRenewals": 1,
  "lifetimeValue": 997.00
}
```

#### Get Upcoming Renewals (Admin)
```http
GET /api/billing/upcoming-renewals?days=30
```

### Customer Portal

#### Create Portal Session
```http
POST /api/billing/portal/session
Content-Type: application/json

{
  "customerId": "cus_123",
  "returnUrl": "https://app.leadflow.ai/dashboard"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://billing.stripe.com/session/...",
  "sessionId": "bps_123"
}
```

## Webhook Events

The system handles all major Stripe webhook events:

### Subscription Events
| Event | Handler | Action |
|-------|---------|--------|
| `customer.subscription.created` | `handleSubscriptionCreated` | Create DB record, update agent |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Update status, sync data |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Mark cancelled, downgrade features |
| `customer.subscription.paused` | `handleSubscriptionPaused` | Pause access |
| `customer.subscription.resumed` | `handleSubscriptionResumed` | Resume access |
| `customer.subscription.trial_will_end` | `handleTrialWillEnd` | Send notification |

### Payment Events
| Event | Handler | Action |
|-------|---------|--------|
| `invoice.payment_succeeded` | `handlePaymentSucceeded` | Record payment, update MRR |
| `invoice.payment_failed` | `handlePaymentFailed` | Retry logic, notify user |
| `invoice.payment_action_required` | `handlePaymentActionRequired` | Notify for 3D Secure |
| `invoice.upcoming` | `handleInvoiceUpcoming` | Send upcoming invoice notice |

### Configure Webhook Endpoint

```javascript
// In your Express app - MUST be before express.json()
app.post('/api/billing/webhooks', 
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    const event = billing.verifyWebhookSignature(req.body, signature);
    const result = await billing.handleWebhook(event);
    res.json(result);
  }
);
```

## Proration

### How Proration Works

When a customer upgrades or downgrades:

1. **Immediate Changes**: Proration is calculated immediately
2. **Credit Applied**: Unused time on old plan becomes credit
3. **Charge Applied**: New plan prorated for remaining period
4. **Invoice Generated**: Net amount charged or credited

### Proration Behaviors

| Behavior | Description |
|----------|-------------|
| `create_prorations` | Default - create prorations, apply on next invoice |
| `always_invoice` | Create prorations and invoice immediately |
| `none` | No proration - full period charges |

### Example Proration

```javascript
// User upgrades from Starter ($297/month) to Professional ($997/month)
// 15 days into billing cycle

const preview = await billing.previewPlanChange({
  subscriptionId: 'sub_123',
  newTier: 'professional'
});

// Result:
// - Credit: $148.50 (unused Starter time)
// - Charge: $498.50 (Professional for remaining 15 days)
// - Net Due: $350.00
```

## Database Schema

### Core Tables

#### subscriptions
```sql
- id: UUID PRIMARY KEY
- user_id: UUID REFERENCES agents(id)
- stripe_customer_id: VARCHAR(255)
- stripe_subscription_id: VARCHAR(255)
- status: VARCHAR(50) - incomplete, active, past_due, canceled, paused, trialing
- tier: VARCHAR(50) - starter, professional, enterprise
- price_id: VARCHAR(255)
- interval: VARCHAR(20) - month, year
- current_period_start: TIMESTAMP
- current_period_end: TIMESTAMP
- trial_start: TIMESTAMP
- trial_end: TIMESTAMP
- cancel_at_period_end: BOOLEAN
- metadata: JSONB
```

#### subscription_events
```sql
- id: UUID PRIMARY KEY
- subscription_id: UUID REFERENCES subscriptions
- user_id: UUID REFERENCES agents
- stripe_event_id: VARCHAR(255)
- event_type: VARCHAR(100)
- stripe_event_data: JSONB
- processed_at: TIMESTAMP
```

#### payments
```sql
- id: UUID PRIMARY KEY
- subscription_id: UUID REFERENCES subscriptions
- stripe_invoice_id: VARCHAR(255)
- amount: DECIMAL(10,2)
- currency: VARCHAR(3)
- status: VARCHAR(50)
- period_start: TIMESTAMP
- period_end: TIMESTAMP
```

## Testing

### Run Unit Tests
```bash
npm test
```

### Run Integration Tests
```bash
node test/billing-api-integration.test.js
```

### Test Subscription Flow
```javascript
// Complete test flow
const testFlow = async () => {
  // 1. Create subscription
  const sub = await billing.createCompleteSubscription({
    userId: 'test_user',
    tier: 'starter',
    interval: 'month'
  });

  // 2. Upgrade
  await billing.changePlan({
    subscriptionId: sub.subscription.stripeSubscriptionId,
    newTier: 'professional'
  });

  // 3. Check billing cycle
  const cycle = await billing.billingCycleManager.getBillingCycleInfo(
    sub.subscription.stripeSubscriptionId
  );

  // 4. Cancel
  await billing.cancelSubscription({
    subscriptionId: sub.subscription.stripeSubscriptionId,
    immediate: false
  });
};
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `No price ID provided` | Missing STRIPE_PRICE_* env vars | Set price IDs in environment |
| `Customer not found` | Invalid customer ID | Check customer exists in Stripe |
| `Payment required` | Incomplete payment | Use clientSecret to confirm |
| `Webhook verification failed` | Invalid signature | Check webhook secret |

### Error Response Format
```json
{
  "error": "Failed to create subscription",
  "message": "No price ID provided and STRIPE_PRICE_BASIC not set",
  "code": "missing_price_id"
}
```

## Best Practices

### 1. Always Use the Client Secret
When `requiresPayment: true`, use the client secret with Stripe.js:

```javascript
const stripe = Stripe('pk_test_...');
const result = await stripe.confirmCardPayment(clientSecret, {
  payment_method: {
    card: cardElement,
    billing_details: { name: 'Customer Name' }
  }
});
```

### 2. Handle Webhook Failures Gracefully
Webhooks may fail - implement idempotency:

```javascript
// Check if event already processed
const { data } = await supabase
  .from('subscription_events')
  .select('id')
  .eq('stripe_event_id', event.id)
  .single();

if (data) {
  return { received: true, alreadyProcessed: true };
}
```

### 3. Sync Regularly
Run sync to ensure database consistency:

```javascript
// Daily sync job
await billing.syncAllSubscriptions();
```

### 4. Monitor Past Due Subscriptions
Set up alerts for `past_due` status:

```javascript
const pastDue = await supabase
  .from('subscriptions')
  .select('*')
  .eq('status', 'past_due');
```

## Migration Guide

### From Legacy Billing

```javascript
// Old way
const { createSubscription } = require('./lib/billing');
const sub = await createSubscription(customerId, priceId);

// New way
const billing = require('./lib/billing-enhanced');
const result = await billing.createCompleteSubscription({
  userId: 'user_123',
  tier: 'professional',
  interval: 'month'
});
```

The legacy routes are still available at `/api/billing/create-subscription` for backward compatibility.

## Support

For issues or questions:
1. Check the test suite for examples
2. Review webhook logs in database
3. Verify Stripe Dashboard for event details
4. Check environment variable configuration

## License

Part of LeadFlow - Internal Use Only
