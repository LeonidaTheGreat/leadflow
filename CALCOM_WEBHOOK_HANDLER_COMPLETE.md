# Cal.com Webhook Handler - Complete Implementation Guide

## Overview

This guide documents the complete Cal.com Webhook Handler integration for LeadFlow, including:
- Webhook endpoint for receiving booking events
- Signature verification for security
- Event parsing and processing
- Database integration
- Retry logic with exponential backoff
- Webhook registration and management API
- Comprehensive testing

## Table of Contents

1. [Architecture](#architecture)
2. [Installation & Setup](#installation--setup)
3. [Webhook Endpoint](#webhook-endpoint)
4. [Event Types](#event-types)
5. [Security](#security)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Retry Logic](#retry-logic)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

### System Flow

```
┌─────────────────┐
│   Cal.com       │
│   Platform      │
└────────┬────────┘
         │ Webhook POST
         ▼
┌─────────────────────────┐
│ POST /webhook/calcom    │
│ - Raw body preserved    │
│ - Signature verified    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ handleCalWebhook()      │
│ - Parse event type      │
│ - Route to handler      │
└────────┬────────────────┘
         │
    ┌────┴────┬───────────┬───────────┐
    ▼         ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Created │ │Resched-│ │Cancel- │ │Meeting │
│Handler │ │uled    │ │led     │ │Ended   │
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘
    │          │          │          │
    └──────────┴────┬─────┴──────────┘
                    ▼
         ┌────────────────────┐
         │  Supabase Database │
         │  - bookings        │
         │  - booking_activ.  │
         │  - leads           │
         └────────────────────┘
```

### Components

| Component | File | Purpose |
|-----------|------|---------|
| Webhook Handler | `lib/calcom-webhook-handler.js` | Process incoming webhooks |
| Webhook Management | `lib/calcom-webhook-management.js` | CRUD operations for webhooks |
| API Client | `lib/calcom.js` | Cal.com API integration |
| Booking Service | `lib/booking-link-service.js` | Generate booking links |
| Routes | `routes/calcom.js` | Booking API endpoints |
| Webhook Routes | `routes/calcom-webhooks.js` | Webhook management endpoints |

---

## Installation & Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Required
CAL_API_KEY=cal_live_xxxxxxxxxxxxx
CAL_USERNAME=your_cal_username
CAL_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
NODE_ENV=production
```

### 2. Database Setup

Run the schema migrations:

```bash
# Option 1: Using the setup script
npm run setup:calcom

# Option 2: Execute SQL directly in Supabase
# Run sql/calcom-bookings-schema.sql
# Run sql/calcom-webhook-management-schema.sql
```

### 3. Configure Cal.com Webhooks

1. Go to https://app.cal.com/settings/developer/webhooks
2. Add webhook URL: `https://your-domain.com/webhook/calcom`
3. Select events to subscribe to:
   - ✓ BOOKING_CREATED
   - ✓ BOOKING_RESCHEDULED
   - ✓ BOOKING_CANCELLED
   - ✓ MEETING_ENDED
4. Copy the webhook secret to `CAL_WEBHOOK_SECRET`

---

## Webhook Endpoint

### Primary Endpoint

```
POST /webhook/calcom
```

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Content-Type` | Yes | `application/json` |
| `x-cal-signature-256` | Yes* | HMAC-SHA256 signature |

*Required in production, optional in development

### Request Body

```json
{
  "triggerEvent": "BOOKING_CREATED",
  "payload": {
    "uid": "booking-123",
    "id": 12345,
    "eventTypeId": 1,
    "eventType": { 
      "slug": "discovery-call",
      "title": "Discovery Call"
    },
    "startTime": "2026-03-15T14:00:00Z",
    "endTime": "2026-03-15T14:30:00Z",
    "attendees": [{
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "timeZone": "America/New_York"
    }],
    "metadata": { 
      "source": "website",
      "videoCallUrl": "https://meet.example.com/abc"
    }
  }
}
```

### Response

**Success (200):**
```json
{
  "received": true,
  "processed": true
}
```

**Invalid Signature (401):**
```json
{
  "error": "Invalid webhook signature"
}
```

**Processing Error (500):**
```json
{
  "error": "Webhook processing failed"
}
```

---

## Event Types

### BOOKING_CREATED

Triggered when a new booking is made.

**Actions:**
- Find or create lead
- Store booking in database
- Log activity
- Update lead status to `appointment_scheduled`
- Send confirmation SMS (if phone available)
- Schedule reminder notifications

### BOOKING_RESCHEDULED

Triggered when a booking time is changed.

**Actions:**
- Update booking with new time
- Increment reschedule count
- Log reschedule activity
- Reschedule reminder notifications
- Send updated confirmation

### BOOKING_CANCELLED

Triggered when a booking is cancelled.

**Actions:**
- Update booking status to `cancelled`
- Store cancellation reason
- Log cancellation activity
- Cancel pending reminders

### MEETING_ENDED

Triggered when a scheduled meeting ends.

**Actions:**
- Update booking status to `completed`
- Log completion activity
- Trigger post-meeting follow-up sequence

---

## Security

### Signature Verification

Webhooks are verified using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const payloadString = typeof payload === 'string' 
        ? payload 
        : JSON.stringify(payload);
    
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadString)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature.replace('sha256=', ''))
    );
}
```

### Environment Behavior

| Environment | Signature Verification |
|-------------|----------------------|
| Production | Required - 401 if invalid |
| Development | Optional - logs warning if missing |

### Best Practices

1. Always use HTTPS for webhook endpoints
2. Store `CAL_WEBHOOK_SECRET` securely (not in code)
3. Verify signatures before processing
4. Use timing-safe comparison to prevent timing attacks
5. Log all webhook attempts for audit trail

---

## Database Schema

### Core Tables

#### `bookings`
Stores all booking data from Cal.com.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| cal_booking_id | BIGINT | Cal.com booking ID |
| cal_booking_uid | TEXT | Unique booking identifier |
| attendee_email | TEXT | Lead email |
| attendee_name | TEXT | Lead name |
| attendee_phone | TEXT | Lead phone |
| start_time | TIMESTAMPTZ | Meeting start |
| end_time | TIMESTAMPTZ | Meeting end |
| status | TEXT | booked/rescheduled/cancelled/completed |
| lead_id | UUID | Reference to leads table |
| agent_id | UUID | Reference to agents table |

#### `booking_activities`
Audit log for all booking actions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| booking_id | UUID | Reference to booking |
| action | TEXT | Type of action |
| previous_data | JSONB | Before state |
| new_data | JSONB | After state |

#### `webhook_configs`
Registered webhook configurations.

| Column | Type | Description |
|--------|------|-------------|
| webhook_id | VARCHAR | Unique webhook ID |
| subscriber_url | TEXT | Webhook endpoint URL |
| event_triggers | TEXT[] | Subscribed events |
| active | BOOLEAN | Is webhook active |
| secret | TEXT | Signature secret |

#### `webhook_delivery_logs`
Tracks all webhook delivery attempts.

| Column | Type | Description |
|--------|------|-------------|
| webhook_id | VARCHAR | Reference to webhook |
| event_type | TEXT | Event that triggered |
| status | TEXT | success/failed/retrying |
| http_status | INTEGER | HTTP response code |
| attempt_number | INTEGER | Retry attempt count |

---

## API Reference

### Booking API (`/api/calcom/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calcom/status` | Check integration status |
| GET | `/api/calcom/event-types` | Get all event types |
| GET | `/api/calcom/booking-links` | Get simplified booking links |
| POST | `/api/calcom/generate-link` | Generate personalized link |
| POST | `/api/calcom/personalized-link` | Create lead-specific link |
| GET | `/api/calcom/quick-link/:scenario` | Quick scenario links |
| GET | `/api/calcom/scenarios` | List available scenarios |
| GET | `/api/calcom/slots` | Get available time slots |
| POST | `/api/calcom/bookings` | Create booking programmatically |
| GET | `/api/calcom/me` | Get Cal.com profile |

### Webhook Management API (`/api/calcom/webhooks/*`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calcom/webhooks` | List all webhooks |
| POST | `/api/calcom/webhooks` | Register new webhook |
| GET | `/api/calcom/webhooks/:id` | Get webhook details |
| PATCH | `/api/calcom/webhooks/:id` | Update webhook |
| DELETE | `/api/calcom/webhooks/:id` | Delete webhook |
| POST | `/api/calcom/webhooks/:id/test` | Send test webhook |
| GET | `/api/calcom/webhooks/:id/logs` | Get delivery logs |
| GET | `/api/calcom/webhooks/:id/stats` | Get statistics |
| GET | `/api/calcom/webhooks/stats/overall` | Overall statistics |
| GET | `/api/calcom/webhooks/health/summary` | Health summary |

### Register Webhook Example

```bash
curl -X POST https://api.leadflow.com/api/calcom/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberUrl": "https://example.com/webhook/calcom",
    "eventTriggers": ["BOOKING_CREATED", "BOOKING_CANCELLED"],
    "active": true
  }'
```

**Response:**
```json
{
  "success": true,
  "webhook": {
    "webhookId": "wh_a1b2c3d4e5f6",
    "subscriberUrl": "https://example.com/webhook/calcom",
    "eventTriggers": ["BOOKING_CREATED", "BOOKING_CANCELLED"],
    "active": true,
    "secret": "whsec_xxxxxxxxxxxx"
  }
}
```

---

## Retry Logic

### Configuration

```javascript
const RETRY_CONFIG = {
    maxRetries: 3,           // 3 retry attempts
    baseDelayMs: 1000,       // Start with 1 second
    maxDelayMs: 10000,       // Cap at 10 seconds
    backoffMultiplier: 2     // Double each time
}
```

### Exponential Backoff

| Attempt | Base Delay | With Jitter (±25%) |
|---------|------------|-------------------|
| 1 | 1000ms | 750-1250ms |
| 2 | 2000ms | 1500-2500ms |
| 3 | 4000ms | 3000-5000ms |
| 4 | 8000ms | 6000-10000ms |

### Non-Retryable Errors

The following errors will NOT be retried:
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- Foreign key violations (code 23503)
- Unique constraint violations (code 23505)
- Not found errors (code PGRST116)

### Operations with Retry

- `findOrCreateLead()` - Database lookups and inserts
- `upsertBooking()` - Booking record creation/updates
- `logBookingActivity()` - Audit logging
- `updateLeadStatus()` - Lead status updates
- `scheduleBookingReminders()` - Reminder scheduling

---

## Testing

### Run All Tests

```bash
# All tests
npm test

# Cal.com integration tests only
npm run test:calcom

# Webhook management tests
node test/calcom-webhook-management.test.js
```

### Test Coverage

| Test Suite | Count | Coverage |
|------------|-------|----------|
| API Client | 8 | Configuration, URL generation |
| Booking Link Service | 3 | Scenario mappings |
| Webhook Handler | 10 | Event routing, data handling |
| Data Validation | 2 | Missing metadata, partial data |
| Mock Data | 4 | Fallback data integrity |
| Error Handling | 3 | Validation errors |
| Retry Logic | 13 | Backoff, jitter, limits |
| Webhook Integration | 4 | End-to-end with retry |
| Signature Verification | 3 | Production vs dev |
| Webhook Management | 25 | CRUD, logs, stats, testing |
| **Total** | **75** | **Comprehensive** |

### Manual Testing

1. **Test Webhook Endpoint:**
```bash
curl -X POST http://localhost:3000/webhook/calcom \
  -H "Content-Type: application/json" \
  -d '{
    "triggerEvent": "BOOKING_CREATED",
    "payload": {
      "uid": "test-123",
      "attendees": [{"name": "Test", "email": "test@example.com"}]
    }
  }'
```

2. **Test Webhook Registration:**
```bash
curl -X POST http://localhost:3000/api/calcom/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberUrl": "https://webhook.site/unique-id",
    "eventTriggers": ["BOOKING_CREATED"]
  }'
```

3. **Test Signature Verification:**
```bash
curl -X POST http://localhost:3000/webhook/calcom \
  -H "Content-Type: application/json" \
  -H "x-cal-signature-256: sha256=invalid" \
  -d '{}'
# Should return 401 in production
```

---

## Troubleshooting

### Common Issues

#### Webhooks Not Receiving
- Verify `CAL_WEBHOOK_SECRET` matches Cal.com settings
- Check server logs for signature verification failures
- Ensure `/webhook/calcom` endpoint is publicly accessible
- Verify firewall rules allow POST requests

#### Database Errors
- Run `npm run setup:calcom` to create tables
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check RLS policies if using authenticated access
- Verify connection limits not exceeded

#### Signature Verification Failing
- Ensure raw body is preserved (before express.json())
- Check secret is correctly copied from Cal.com
- Verify no body parsing middleware is modifying the payload
- Compare expected vs received signature in logs

#### Retry Exhaustion
- Check database connection stability
- Verify Supabase service is operational
- Review logs for specific error messages
- Consider increasing `maxRetries` for transient failures

### Debug Mode

Enable detailed logging:

```bash
DEBUG=calcom:* npm start
```

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-26T16:30:00Z",
  "fub": "configured",
  "calcom": "configured"
}
```

---

## Related Documentation

- [CALCOM-README.md](./CALCOM-README.md) - User guide
- [CALCOM_WEBHOOK_IMPLEMENTATION.md](./CALCOM_WEBHOOK_IMPLEMENTATION.md) - Implementation details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture

---

## License

Part of LeadFlow AI - Proprietary

**Implementation Version:** 1.0.0  
**Last Updated:** February 26, 2026  
**Test Status:** ✅ 75 tests passing