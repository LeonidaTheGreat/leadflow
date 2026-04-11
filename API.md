<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat by generate-api-docs.js. -->
# LeadFlow API Reference

> Generated: 2026-04-11T13:00:51.843Z | Source: `routes/` | 30 endpoints across 5 route files

Auto-generated from source. Edit source files, not this document.

## Endpoint Summary

| Method | Path | Service Calls | File |
|--------|------|--------------|------|
| `GET` | `/` | — | `server.js` |
| `GET` | `/admin/activation-outreach/api/admin/activation-list` | — | `admin/activation-outreach.js` |
| `POST` | `/admin/activation-outreach/api/admin/send-activation-email` | — | `admin/activation-outreach.js` |
| `GET` | `/billing/analytics/:userId` | `billingService.getSubscriptionAnalytics()` | `billing.js` |
| `POST` | `/billing/cancel-subscription` | `billingService.cancelSubscription()` | `billing.js` |
| `POST` | `/billing/create-customer` | `billingService.createCustomer()` | `billing.js` |
| `POST` | `/billing/create-subscription` | `billingService.createSubscription()` | `billing.js` |
| `GET` | `/billing/portal/config` | `billingService.getPortalConfig()` | `billing.js` |
| `GET` | `/billing/portal/invoices/:customerId` | `billingService.getCustomerInvoices()` | `billing.js` |
| `GET` | `/billing/portal/payment-methods/:customerId` | `billingService.getCustomerPaymentMethods()` | `billing.js` |
| `POST` | `/billing/portal/session` | `billingService.createPortalSession()` | `billing.js` |
| `GET` | `/billing/portal/subscriptions/:customerId` | `billingService.getCustomerSubscriptions()` | `billing.js` |
| `POST` | `/billing/setup-intent` | `billingService.createSetupIntent()` | `billing.js` |
| `GET` | `/billing/status` | `billingService.initializeBilling()` | `billing.js` |
| `GET` | `/billing/subscription/:subscriptionId` | `billingService.getSubscriptionStatus()` | `billing.js` |
| `POST` | `/billing/subscriptions` | `billingService.createCompleteSubscription()` | `billing.js` |
| `POST` | `/billing/subscriptions/:subscriptionId/cancel` | `billingService.cancelManagedSubscription()` | `billing.js` |
| `POST` | `/billing/subscriptions/:subscriptionId/change` | `billingService.changePlan()` | `billing.js` |
| `GET` | `/billing/subscriptions/:subscriptionId/cycle` | `billingService.getBillingCycleInfo()` | `billing.js` |
| `POST` | `/billing/subscriptions/:subscriptionId/preview-change` | `billingService.previewPlanChange()` | `billing.js` |
| `POST` | `/billing/subscriptions/:subscriptionId/reactivate` | `billingService.reactivateSubscription()` | `billing.js` |
| `GET` | `/billing/subscriptions/:subscriptionId/renewals` | `billingService.getRenewalHistory()` | `billing.js` |
| `GET` | `/billing/subscriptions/:userId` | `billingService.getUserSubscriptionStatus()` | `billing.js` |
| `POST` | `/billing/sync` | `billingService.syncAllSubscriptions()` | `billing.js` |
| `GET` | `/billing/upcoming-renewals` | `billingService.getUpcomingRenewals()` | `billing.js` |
| `POST` | `/billing/webhooks` | `billingService.verifyWebhookSignature()`, `billingService.handleWebhook()` | `billing.js` |
| `GET` | `/check-stuck-pilots/api/cron/check-stuck-pilots` | `stuckPilotsService.checkAndAlertStuckPilots()` | `check-stuck-pilots.js` |
| `GET` | `/health` | — | `server.js` |
| `GET` | `/weekly-performance/api/cron/weekly-performance` | `weeklyPerformanceService.runWeeklyReportSequence()` | `weekly-performance.js` |
| `GET` | `/weekly-performance/api/cron/weekly-performance/preview` | `weeklyPerformanceService.getPreviewData()` | `weekly-performance.js` |

---

## Routes by File

### `server.js`

#### `GET /`

Health check

#### `GET /health`

### `admin/activation-outreach.js`

#### `GET /admin/activation-outreach/api/admin/activation-list`

─── GET /api/admin/activation-list ───────────────────────────────────────────

#### `POST /admin/activation-outreach/api/admin/send-activation-email`

─── POST /api/admin/send-activation-email ────────────────────────────────────

### `billing.js`

#### `POST /billing/create-customer`

Returns: success, customerId, mock

**Calls:** `billingService.createCustomer()`

#### `POST /billing/create-subscription`

**Calls:** `billingService.createSubscription()`

#### `POST /billing/setup-intent`

Returns: success, clientSecret, mock

**Calls:** `billingService.createSetupIntent()`

#### `GET /billing/subscription/:subscriptionId`

Returns: success

**Calls:** `billingService.getSubscriptionStatus()`

#### `POST /billing/cancel-subscription`

Returns: success, status, cancelAtPeriodEnd

**Calls:** `billingService.cancelSubscription()`

#### `POST /billing/subscriptions`

**Calls:** `billingService.createCompleteSubscription()`

#### `GET /billing/subscriptions/:userId`

**Calls:** `billingService.getUserSubscriptionStatus()`

#### `POST /billing/subscriptions/:subscriptionId/change`

**Calls:** `billingService.changePlan()`

#### `POST /billing/subscriptions/:subscriptionId/preview-change`

**Calls:** `billingService.previewPlanChange()`

#### `POST /billing/subscriptions/:subscriptionId/cancel`

**Calls:** `billingService.cancelManagedSubscription()`

#### `POST /billing/subscriptions/:subscriptionId/reactivate`

**Calls:** `billingService.reactivateSubscription()`

#### `GET /billing/subscriptions/:subscriptionId/cycle`

**Calls:** `billingService.getBillingCycleInfo()`

#### `GET /billing/subscriptions/:subscriptionId/renewals`

**Calls:** `billingService.getRenewalHistory()`

#### `GET /billing/upcoming-renewals`

**Calls:** `billingService.getUpcomingRenewals()`

#### `GET /billing/portal/config`

Returns: success, config

**Calls:** `billingService.getPortalConfig()`

#### `POST /billing/portal/session`

Returns: success

**Calls:** `billingService.createPortalSession()`

#### `GET /billing/portal/subscriptions/:customerId`

Returns: success

**Calls:** `billingService.getCustomerSubscriptions()`

#### `GET /billing/portal/invoices/:customerId`

Returns: success

**Calls:** `billingService.getCustomerInvoices()`

#### `GET /billing/portal/payment-methods/:customerId`

Returns: success

**Calls:** `billingService.getCustomerPaymentMethods()`

#### `POST /billing/webhooks`

**Calls:** `billingService.verifyWebhookSignature()`, `billingService.handleWebhook()`

#### `GET /billing/analytics/:userId`

**Calls:** `billingService.getSubscriptionAnalytics()`

#### `POST /billing/sync`

**Calls:** `billingService.syncAllSubscriptions()`

#### `GET /billing/status`

**Calls:** `billingService.initializeBilling()`

### `check-stuck-pilots.js`

#### `GET /check-stuck-pilots/api/cron/check-stuck-pilots`

GET /api/cron/check-stuck-pilots

**Calls:** `stuckPilotsService.checkAndAlertStuckPilots()`

### `weekly-performance.js`

#### `GET /weekly-performance/api/cron/weekly-performance`

GET /api/cron/weekly-performance

**Calls:** `weeklyPerformanceService.runWeeklyReportSequence()`

#### `GET /weekly-performance/api/cron/weekly-performance/preview`

Preview endpoint: returns the email HTML for a given agent (or demo agent if agentId is omitted).

**Calls:** `weeklyPerformanceService.getPreviewData()`

