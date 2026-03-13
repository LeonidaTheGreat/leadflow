# Stripe Customer Portal Configuration

## Overview

The LeadFlow Stripe Customer Portal provides a secure, pre-built UI for customers to manage their subscriptions, payment methods, and view invoice history. This module extends the existing billing system with customer self-service capabilities.

## Features

### 1. Portal Settings & Branding Configuration

The portal is fully customizable with LeadFlow branding:

```javascript
// Branding configuration (configurable via environment variables)
{
  primary_color: '#0066FF',      // STRIPE_PORTAL_PRIMARY_COLOR
  secondary_color: '#00D4AA',    // STRIPE_PORTAL_SECONDARY_COLOR
  accent_color: '#FF6B35',       // STRIPE_PORTAL_ACCENT_COLOR
  logo_url: 'https://leadflow.ai/logo.png',
  icon_url: 'https://leadflow.ai/icon.png',
  favicon_url: 'https://leadflow.ai/favicon.ico'
}
```

**Environment Variables:**
- `STRIPE_PORTAL_PRIMARY_COLOR` - Primary brand color
- `STRIPE_PORTAL_SECONDARY_COLOR` - Secondary color
- `STRIPE_PORTAL_ACCENT_COLOR` - Accent/highlight color
- `STRIPE_PORTAL_LOGO_URL` - Logo URL
- `STRIPE_PORTAL_ICON_URL` - Icon URL
- `STRIPE_PORTAL_FAVICON_URL` - Favicon URL
- `STRIPE_PORTAL_BUSINESS_NAME` - Business name displayed in portal
- `STRIPE_PORTAL_PRIVACY_URL` - Privacy policy URL
- `STRIPE_PORTAL_TERMS_URL` - Terms of service URL
- `STRIPE_PORTAL_RETURN_URL` - Default return URL after portal session

### 2. Subscription Management UI

Customers can:
- View current subscription details
- Upgrade/downgrade plans
- Update subscription quantity
- Cancel subscriptions (with feedback)
- View billing cycle and renewal dates

**Configuration:**
```javascript
{
  enabled: true,
  allowPlanChanges: true,
  allowQuantityUpdates: true,
  cancellationMode: 'at_period_end',
  cancellationReasons: [
    { value: 'too_expensive', label: 'Too expensive' },
    { value: 'missing_features', label: 'Missing features I need' },
    { value: 'switched_service', label: 'Switched to a different service' },
    { value: 'unused', label: "I don't use it enough" },
    { value: 'customer_service', label: 'Customer service issues' },
    { value: 'too_complex', label: 'Too complicated to use' },
    { value: 'low_quality', label: "Quality didn't meet expectations" },
    { value: 'other', label: 'Other reason' }
  ],
  prorationBehavior: 'create_prorations'
}
```

### 3. Payment Method Management

Customers can:
- View saved payment methods
- Add new payment methods
- Set default payment method
- Remove payment methods

**Configuration:**
```javascript
{
  enabled: true,
  allowedTypes: ['card', 'bank_transfer'],
  allowMultipleMethods: false,
  requireDefault: true,
  allowRemoval: true
}
```

### 4. Invoice History View

Customers can:
- View past invoices
- Download PDF invoices
- Resend invoices via email
- View payment status

**Configuration:**
```javascript
{
  enabled: true,
  allowDownload: true,
  allowEmailResend: true,
  maxHistoryMonths: 24
}
```

## API Endpoints

### Portal Session

**POST /api/billing/portal/session**
Create a customer portal session.

Request:
```json
{
  "customerId": "cus_1234567890",
  "returnUrl": "https://leadflow.ai/dashboard",
  "locale": "en"
}
```

Response:
```json
{
  "success": true,
  "url": "https://billing.stripe.com/session/test_...",
  "sessionId": "bps_1234567890",
  "customerId": "cus_1234567890"
}
```

### Portal Configuration

**GET /api/billing/portal/config**
Get current portal configuration.

Response:
```json
{
  "success": true,
  "config": {
    "branding": { ... },
    "business": { ... },
    "features": { ... }
  }
}
```

**POST /api/billing/portal/configure**
Configure/update the Stripe Customer Portal (admin only).

Response:
```json
{
  "success": true,
  "configurationId": "bpc_1234567890"
}
```

### Customer Data

**GET /api/billing/portal/subscriptions/:customerId**
Get customer's subscriptions.

**GET /api/billing/portal/invoices/:customerId**
Get customer's invoice history.

Query params:
- `limit` - Number of invoices to return (default: 24)
- `startingAfter` - Pagination cursor

**GET /api/billing/portal/payment-methods/:customerId**
Get customer's payment methods.

## Usage

### From Billing Module

```javascript
const billing = require('./lib/billing');

// Create portal session
const session = await billing.createPortalSession('cus_123', {
  returnUrl: 'https://leadflow.ai/dashboard'
});

// Redirect customer to portal
res.redirect(session.url);
```

### Direct Portal Module

```javascript
const portal = require('./lib/stripe-portal');

// Get portal configuration
const config = portal.getPortalConfig();

// Update branding
portal.updatePortalBranding({
  primary_color: '#FF0000',
  logo_url: 'https://example.com/logo.png'
});

// Get subscription management config
const subConfig = portal.getSubscriptionManagementConfig();

// Get customer data
const subscriptions = await portal.getCustomerSubscriptions('cus_123');
const invoices = await portal.getCustomerInvoices('cus_123');
const paymentMethods = await portal.getCustomerPaymentMethods('cus_123');
```

## Testing

Run the portal tests:

```bash
# Portal module tests
node integration/test-stripe-portal.js

# Billing & portal integration tests
node integration/test-billing-portal-integration.js

# All billing tests
node integration/test-billing.js
```

## Integration with Existing Billing

The portal module is fully integrated with the existing billing system:

1. **Customer Creation**: Portal sessions are linked to Stripe customers created via `createCustomer()`
2. **Subscriptions**: Portal shows subscriptions created via `createSubscription()`
3. **Payment Methods**: Portal manages payment methods attached via `attachPaymentMethod()`
4. **Invoices**: Portal displays invoices generated from webhook events

## Security Considerations

1. **Customer ID Validation**: Always validate customer IDs belong to the authenticated user
2. **Session Expiration**: Portal sessions expire after a short time (configurable in Stripe Dashboard)
3. **Webhook Verification**: Ensure webhook signatures are verified before processing
4. **Access Control**: Only allow customers to access their own portal sessions

## Error Handling

The module provides graceful fallbacks when Stripe is not configured:

```javascript
// Mock mode (no STRIPE_SECRET_KEY)
{
  mock: true,
  url: 'https://leadflow.ai/dashboard',
  customerId: 'cus_123'
}
```

Error responses:

```json
{
  "error": "Failed to create portal session",
  "message": "Customer ID is required"
}
```

## File Structure

```
lib/
├── billing.js              # Main billing module (updated)
└── stripe-portal.js        # Portal configuration module

routes/
├── billing.js              # Billing API routes (updated)
└── portal.js               # Portal-specific routes

integration/
├── test-billing.js         # Original billing tests
├── test-stripe-portal.js   # Portal module tests
└── test-billing-portal-integration.js  # Integration tests
```

## Next Steps

1. Set up environment variables in production
2. Configure portal in Stripe Dashboard
3. Implement frontend redirect to portal
4. Add authentication middleware to protect portal endpoints
5. Set up webhook endpoint for subscription changes
