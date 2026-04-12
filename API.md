<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from routes/. -->
# API Reference

> Generated: 2026-04-12T19:09:03.931Z | Source: `routes/`, `integration/`

**8 endpoints across 5 files**

## Summary

| Method | Path | Services | Auth | File |
|--------|------|----------|------|------|
| **GET** | `/api/admin/activation-list` | - | API key (admin) | `routes/admin/activation-outreach.js` |
| **POST** | `/api/admin/send-activation-email` | - | API key (admin) | `routes/admin/activation-outreach.js` |
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

