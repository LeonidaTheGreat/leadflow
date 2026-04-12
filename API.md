<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from routes/. -->
# API Reference

> Generated: 2026-04-12T04:01:47.865Z | Source: `routes/`, `integration/`

**31 endpoints across 6 files**

## Summary

| Method | Path | Services | Auth | File |
|--------|------|----------|------|------|
| **GET** | `/api/admin/activation-list` | - | API key (admin) | `routes/admin/activation-outreach.js` |
| **POST** | `/api/admin/send-activation-email` | - | API key (admin) | `routes/admin/activation-outreach.js` |
| **POST** | `/create-customer` | `billingService` | None | `routes/billing.js` |
| **POST** | `/create-subscription` | `billingService` | None | `routes/billing.js` |
| **POST** | `/setup-intent` | `billingService` | None | `routes/billing.js` |
| **GET** | `/subscription/:subscriptionId` | `billingService` | None | `routes/billing.js` |
| **POST** | `/cancel-subscription` | `billingService` | None | `routes/billing.js` |
| **POST** | `/subscriptions` | `billingService` | None | `routes/billing.js` |
| **GET** | `/subscriptions/:userId` | `billingService` | None | `routes/billing.js` |
| **POST** | `/subscriptions/:subscriptionId/change` | `billingService` | None | `routes/billing.js` |
| **POST** | `/subscriptions/:subscriptionId/preview-change` | `billingService` | None | `routes/billing.js` |
| **POST** | `/subscriptions/:subscriptionId/cancel` | `billingService` | None | `routes/billing.js` |
| **POST** | `/subscriptions/:subscriptionId/reactivate` | `billingService` | None | `routes/billing.js` |
| **GET** | `/subscriptions/:subscriptionId/cycle` | `billingService` | None | `routes/billing.js` |
| **GET** | `/subscriptions/:subscriptionId/renewals` | `billingService` | None | `routes/billing.js` |
| **GET** | `/upcoming-renewals` | `billingService` | None | `routes/billing.js` |
| **GET** | `/portal/config` | `billingService` | Session | `routes/billing.js` |
| **POST** | `/portal/session` | `billingService` | Session | `routes/billing.js` |
| **GET** | `/portal/subscriptions/:customerId` | `billingService` | None | `routes/billing.js` |
| **GET** | `/portal/invoices/:customerId` | `billingService` | None | `routes/billing.js` |
| **GET** | `/portal/payment-methods/:customerId` | `billingService` | None | `routes/billing.js` |
| **POST** | `/webhooks` | `billingService` | None | `routes/billing.js` |
| **GET** | `/analytics/:userId` | `billingService` | None | `routes/billing.js` |
| **POST** | `/sync` | `billingService` | None | `routes/billing.js` |
| **GET** | `/status` | `billingService` | None | `routes/billing.js` |
| **GET** | `/api/cron/check-stuck-pilots` | - | Vercel cron | `routes/check-stuck-pilots.js` |
| **GET** | `/` | `systemStatusService` | None | `routes/system.js` |
| **GET** | `/health` | `systemStatusService` | None | `routes/system.js` |
| **GET** | `/api/cron/weekly-performance` | `WeeklyPerformanceService` | Vercel cron | `routes/weekly-performance.js` |
| **GET** | `/api/cron/weekly-performance/preview` | `weeklyPerformanceService` | Vercel cron | `routes/weekly-performance.js` |
| **POST** | `/webhook/fub` | `fubService` | None | `integration/fub-webhook-listener.js` |

---

## `routes/admin/activation-outreach.js`

### GET `/api/admin/activation-list`

- **Auth:** API key (admin)

### POST `/api/admin/send-activation-email`

- **Auth:** API key (admin)

---

## `routes/billing.js`

### POST `/create-customer`

- **Auth:** None
- **Services:** `billingService`

### POST `/create-subscription`

- **Auth:** None
- **Services:** `billingService`

### POST `/setup-intent`

- **Auth:** None
- **Services:** `billingService`

### GET `/subscription/:subscriptionId`

- **Auth:** None
- **Services:** `billingService`

### POST `/cancel-subscription`

- **Auth:** None
- **Services:** `billingService`

### POST `/subscriptions`

- **Auth:** None
- **Services:** `billingService`

### GET `/subscriptions/:userId`

- **Auth:** None
- **Services:** `billingService`

### POST `/subscriptions/:subscriptionId/change`

- **Auth:** None
- **Services:** `billingService`

### POST `/subscriptions/:subscriptionId/preview-change`

- **Auth:** None
- **Services:** `billingService`

### POST `/subscriptions/:subscriptionId/cancel`

- **Auth:** None
- **Services:** `billingService`

### POST `/subscriptions/:subscriptionId/reactivate`

- **Auth:** None
- **Services:** `billingService`

### GET `/subscriptions/:subscriptionId/cycle`

- **Auth:** None
- **Services:** `billingService`

### GET `/subscriptions/:subscriptionId/renewals`

- **Auth:** None
- **Services:** `billingService`

### GET `/upcoming-renewals`

- **Auth:** None
- **Services:** `billingService`

### GET `/portal/config`

- **Auth:** Session
- **Services:** `billingService`

### POST `/portal/session`

- **Auth:** Session
- **Services:** `billingService`

### GET `/portal/subscriptions/:customerId`

- **Auth:** None
- **Services:** `billingService`

### GET `/portal/invoices/:customerId`

- **Auth:** None
- **Services:** `billingService`

### GET `/portal/payment-methods/:customerId`

- **Auth:** None
- **Services:** `billingService`

### POST `/webhooks`

- **Auth:** None
- **Services:** `billingService`

### GET `/analytics/:userId`

- **Auth:** None
- **Services:** `billingService`

### POST `/sync`

- **Auth:** None
- **Services:** `billingService`

### GET `/status`

- **Auth:** None
- **Services:** `billingService`

---

## `routes/check-stuck-pilots.js`

### GET `/api/cron/check-stuck-pilots`

Stuck Pilots Cron Route

- **Auth:** Vercel cron

---

## `routes/system.js`

### GET `/`

- **Auth:** None
- **Services:** `systemStatusService`

### GET `/health`

- **Auth:** None
- **Services:** `systemStatusService`

---

## `routes/weekly-performance.js`

### GET `/api/cron/weekly-performance`

Weekly Performance Email Routes

- **Auth:** Vercel cron
- **Services:** `WeeklyPerformanceService`

### GET `/api/cron/weekly-performance/preview`

Preview endpoint: returns the email HTML for a given agent (or demo agent if agentId is omitted).

- **Auth:** Vercel cron
- **Services:** `weeklyPerformanceService`

---

## `integration/fub-webhook-listener.js`

### POST `/webhook/fub`

- **Auth:** None
- **Services:** `fubService`

