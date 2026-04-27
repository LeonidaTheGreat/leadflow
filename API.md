<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from routes/. -->
# API Reference

> Generated: 2026-04-27T05:17:51.550Z | Source: `routes/`, `integration/`

**20 endpoints across 8 files**

## Summary

| Method | Path | Services | Auth | File |
|--------|------|----------|------|------|
| **GET** | `/api/admin/activation-list` | - | Bearer token | `routes/admin/activation-outreach.js` |
| **POST** | `/api/admin/send-activation-email` | - | Bearer token | `routes/admin/activation-outreach.js` |
| **POST** | `/webhook/stripe` | - | None | `routes/billing.js` |
| **POST** | `/api/billing/checkout` | - | Bearer token | `routes/billing.js` |
| **POST** | `/api/billing/portal` | - | Bearer token | `routes/billing.js` |
| **GET** | `/api/billing/status/:userId` | - | Bearer token | `routes/billing.js` |
| **POST** | `/webhook/calcom` | - | None | `routes/calcom-webhook.js` |
| **GET** | `/api/calcom/webhooks` | - | Bearer token | `routes/calcom-webhook.js` |
| **POST** | `/api/calcom/webhooks` | - | Bearer token | `routes/calcom-webhook.js` |
| **DELETE** | `/api/calcom/webhooks/:id` | - | Bearer token | `routes/calcom-webhook.js` |
| **GET** | `/api/calcom/webhooks/:id/stats` | - | Bearer token | `routes/calcom-webhook.js` |
| **POST** | `/api/calcom/webhooks/:id/test` | - | Bearer token | `routes/calcom-webhook.js` |
| **GET** | `/api/cron/check-stuck-pilots` | - | Vercel cron | `routes/internal/check-stuck-pilots.js` |
| **GET** | `/api/cron/dead-letter-replay` | - | Vercel cron | `routes/internal/dead-letter-replay.js` |
| **GET** | `/api/cron/weekly-performance` | `WeeklyPerformanceService` | Bearer token | `routes/internal/weekly-performance.js` |
| **GET** | `/api/cron/weekly-performance/preview` | `weeklyPerformanceService` | Bearer token | `routes/internal/weekly-performance.js` |
| **GET** | `/` | `systemStatusService` | None | `routes/system.js` |
| **GET** | `/health` | `systemStatusService` | None | `routes/system.js` |
| **GET** | `/health/breakers` | - | None | `routes/system.js` |
| **POST** | `/webhook/fub` | - | None | `integration/fub-webhook-listener.js` |

---

## `routes/admin/activation-outreach.js`

### GET `/api/admin/activation-list`

- **Auth:** Bearer token

### POST `/api/admin/send-activation-email`

- **Auth:** Bearer token

---

## `routes/billing.js`

### POST `/webhook/stripe`

- **Auth:** None

### POST `/api/billing/checkout`

- **Auth:** Bearer token

### POST `/api/billing/portal`

- **Auth:** Bearer token

### GET `/api/billing/status/:userId`

- **Auth:** Bearer token

---

## `routes/calcom-webhook.js`

### POST `/webhook/calcom`

- **Auth:** None

### GET `/api/calcom/webhooks`

- **Auth:** Bearer token

### POST `/api/calcom/webhooks`

- **Auth:** Bearer token

### DELETE `/api/calcom/webhooks/:id`

- **Auth:** Bearer token

### GET `/api/calcom/webhooks/:id/stats`

- **Auth:** Bearer token

### POST `/api/calcom/webhooks/:id/test`

- **Auth:** Bearer token

---

## `routes/internal/check-stuck-pilots.js`

### GET `/api/cron/check-stuck-pilots`

Stuck Pilots Cron Route

- **Auth:** Vercel cron

---

## `routes/internal/dead-letter-replay.js`

### GET `/api/cron/dead-letter-replay`

- **Auth:** Vercel cron

---

## `routes/internal/weekly-performance.js`

### GET `/api/cron/weekly-performance`

Weekly Performance Email Routes

- **Auth:** Bearer token
- **Services:** `WeeklyPerformanceService`

### GET `/api/cron/weekly-performance/preview`

Preview endpoint: returns the email HTML for a given agent (or demo agent if agentId is omitted).

- **Auth:** Bearer token
- **Services:** `weeklyPerformanceService`

---

## `routes/system.js`

### GET `/`

- **Auth:** None
- **Services:** `systemStatusService`

### GET `/health`

- **Auth:** None
- **Services:** `systemStatusService`

### GET `/health/breakers`

- **Auth:** None

---

## `integration/fub-webhook-listener.js`

### POST `/webhook/fub`

- **Auth:** None

