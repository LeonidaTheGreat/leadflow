# Cal.com API Research — Booking Links Implementation

**Status:** Research complete — blockers identified, fixes documented  
**Parent task:** Cal.com Booking Links (stalled)  
**Researched:** 2026-05-12

---

## Summary

The Cal.com v2 REST API is fully capable of supporting LeadFlow's booking link feature.
All required endpoints are implemented in `CalcomClient`. Two bugs block the parent task:

1. **Syntax error in `CalcomClient.js`** (FIXED in this task — module was unloadable)
2. **Missing `cal_username` column on `real_estate_agents`** (requires DB migration — NOT in this task)

---

## API Overview

**Base URL:** `https://api.cal.com/v2`  
**Auth:** `Authorization: Bearer <CAL_API_KEY>`  
**Config env vars:** `CAL_API_KEY`, `CAL_USERNAME`, `CAL_WEBHOOK_SECRET`

---

## Implemented Endpoints

| Endpoint | Version header | Method | Status |
|---|---|---|---|
| `GET /event-types` | `2024-06-14` | list agent's event types | ✅ implemented |
| `GET /event-types/:id` | `2024-06-14` | single event type | ✅ implemented |
| `GET /slots` | *(none set)* | available time slots | ✅ implemented |
| `POST /bookings` | `2024-08-13` | create booking | ✅ implemented |
| `GET /bookings/:id` | `2024-08-13` | get booking | ✅ implemented |
| `POST /bookings/:id/cancel` | `2024-08-13` | cancel booking | ✅ implemented |
| `POST /bookings/:id/reschedule` | `2024-08-13` | reschedule booking | ✅ implemented |
| `GET /me` | *(none set)* | authenticated user info | ✅ implemented |
| `GET /teams` | *(none set)* | team members | ✅ implemented |

**Note:** `/slots`, `/me`, and `/teams` do not pass a `cal-api-version` header.
Cal.com recommends pinning versions for all endpoints. Should be added in the follow-on implementation task.

---

## Booking URL Format

```
https://cal.com/<username>/<event-slug>
```

Pre-fill query params supported by Cal.com embed:
- `name=<lead name>`
- `email=<lead email>`
- `notes=<pre-filled notes>`
- `utm_source=<tracking source>`

`BookingLinkService.generateAgentBookingLink()` already handles this correctly.

---

## Webhook Events (inbound, from Cal.com to LeadFlow)

Handled by `CalcomWebhookHandler` and `CalcomEventProcessor`:

| Trigger event | Meaning |
|---|---|
| `BOOKING_CREATED` | New booking made |
| `BOOKING_RESCHEDULED` | Booking time changed |
| `BOOKING_CANCELLED` | Booking cancelled |
| `BOOKING_REJECTED` | Booking rejected by host |
| `BOOKING_CONFIRMED` | Host confirmed pending booking |
| `BOOKING_PAYMENT_INITIATED` | Payment started (paid events) |

Signature verification via `x-cal-signature-256` header (HMAC-SHA256 of raw body).
Secret stored in `CALCOM_WEBHOOK_SECRET` env var.

---

## Bugs Found (Blockers for Parent Task)

### BUG 1 — Syntax error in `CalcomClient.js` (FIXED)

**File:** `lib/services/CalcomClient.js:258–264`  
**Status:** Fixed in this task.

`getMe()` catch block placed `this.logger.error()` inside a return object literal:
```js
// BROKEN (was):
return {
    this.logger.error('Cal.com getMe failed', error.message);  // ← syntax error
    username: this.defaultUsername,
    error: 'Failed to fetch Cal.com user'
};

// FIXED (now):
this.logger.error('Cal.com getMe failed', error.message);
return {
    username: this.defaultUsername,
    error: 'Failed to fetch Cal.com user'
};
```

This caused `SyntaxError: Unexpected token '.'` and made the entire module unloadable.
All Cal.com functionality (webhooks, event types, bookings) was broken as a result.

---

### BUG 2 — Missing `cal_username` column on `real_estate_agents` (NEEDS MIGRATION)

**File:** `lib/services/BookingLinkService.js:75`  
**Status:** Needs DB migration + code fix.

`generateAgentBookingLink()` queries:
```js
.select('id, name, email, cal_username, metadata')
```

`cal_username` does **not** exist on `real_estate_agents`. The column lives only on
`agent_booking_configs`. This causes every booking link generation to fail.

**Fix required (two parts):**

1. **Migration** — add `cal_username TEXT` to `real_estate_agents`:
   ```sql
   ALTER TABLE real_estate_agents ADD COLUMN cal_username TEXT;
   ```
   Migration file goes in `~/.openclaw/genome/migrations/`.

2. **Code fix** — `BookingLinkService.generateAgentBookingLink()` should look up
   `cal_username` from `agent_booking_configs` as fallback if not set on the agent:
   ```js
   // After fetching agent, try agent_booking_configs for cal_username
   const calUsername = agent.cal_username ||
       agent.metadata?.cal_username ||
       await this._getCalUsernameFromConfigs(agentId) ||
       process.env.CAL_USERNAME;
   ```

---

### BUG 3 — `CalcomWebhookManagement` uses legacy Supabase client pattern

**File:** `lib/services/CalcomWebhookManagement.js:19–29`  
**Status:** Low priority (webhook management UI not yet exposed to users).

`getSupabase()` reads `NEXT_PUBLIC_API_URL` + `API_SECRET_KEY` — these are from the
old Supabase era. The project uses local PostgreSQL via `LOCAL_PG_URL`. The function
returns `null` in local dev, causing all webhook management methods to fall back to
mock data silently.

**Fix:** Replace `getSupabase()` with the same `createClient` pattern used in
`BookingLinkService` or switch to direct PostgreSQL queries via `task-store.js`.

---

### BUG 4 — No booking link HTTP routes

**Status:** Missing feature, not a bug.

`BookingLinkService` exists as a service class but has no HTTP endpoints. The parent
"Cal.com Booking Links" task requires at minimum:

- `GET  /api/agents/:id/booking-links` — list agent's active booking configs
- `POST /api/agents/:id/booking-links` — generate/store a booking link
- `GET  /api/agents/:id/booking-links/quick?scenario=discovery` — quick link

---

## Recommended Implementation Order

1. **Migration** — add `cal_username` to `real_estate_agents` (unblocks BookingLinkService)
2. **Routes** — add `routes/agents/booking-links.js` exposing BookingLinkService
3. **Cal-api-version headers** — pin version for `/slots`, `/me`, `/teams` in `CalcomClient`
4. **WebhookManagement fix** — switch from Supabase client to local PG (low priority)

---

## Environment Variables Required

| Variable | Purpose | Where to get |
|---|---|---|
| `CAL_API_KEY` | Authenticates API calls | Cal.com dashboard → Settings → Developer → API keys |
| `CAL_USERNAME` | System-level fallback Cal.com username | Cal.com profile username |
| `CAL_WEBHOOK_SECRET` / `CALCOM_WEBHOOK_SECRET` | Verifies inbound webhook signatures | Set when registering webhook on Cal.com |

Note: route handler checks `CALCOM_WEBHOOK_SECRET`, config reads `CAL_WEBHOOK_SECRET`.
These should be consolidated to one variable name.

---

## Test Coverage

Existing unit tests in `tests/unit/calcom-client-class.test.js` cover:
- Module loads and exports class + static functions
- Mock event types when `CAL_API_KEY` not set
- `cal-api-version` header for `/bookings` endpoints
- `getEventTypes` response mapping

Tests **not** currently covered:
- `getMe()` error path (was broken by syntax error)
- `BookingLinkService.generateAgentBookingLink()` (blocked by missing `cal_username` column)
- Booking link route handlers (don't exist yet)
