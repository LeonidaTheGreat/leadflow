# Cal.com Webhook Handler

Complete webhook implementation for receiving and processing Cal.com booking events.

## Overview

This implementation provides:
- Webhook endpoint at `/api/webhooks/calcom`
- Signature validation using `CAL_WEBHOOK_SECRET`
- Support for all booking events (created, rescheduled, cancelled, rejected, meeting ended)
- Supabase database integration
- Automatic retry logic with exponential backoff
- Comprehensive error handling

## Environment Variables

```bash
# Required
CAL_WEBHOOK_SECRET=your_webhook_secret_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional
CAL_API_KEY=your_cal_api_key
CAL_USERNAME=your_cal_username
```

## API Endpoints

### POST /api/webhooks/calcom
Main webhook endpoint for receiving Cal.com events.

**Headers:**
- `x-cal-signature-256` or `cal-signature-256` - Webhook signature

**Events Supported:**
- `BOOKING_CREATED` - New booking created
- `BOOKING_RESCHEDULED` - Booking time changed
- `BOOKING_CANCELLED` - Booking cancelled
- `BOOKING_REJECTED` - Booking rejected (handled as cancellation)
- `MEETING_ENDED` - Meeting completed

### GET /api/webhooks/calcom
Health check endpoint.

### POST /api/webhooks/calcom/test (Development only)
Test endpoint with sample payloads.

## Webhook Payload Structure

### BOOKING_CREATED
```json
{
  "triggerEvent": "BOOKING_CREATED",
  "payload": {
    "id": 12345,
    "uid": "booking-uid-001",
    "title": "Discovery Call",
    "startTime": "2026-03-01T14:00:00.000Z",
    "endTime": "2026-03-01T14:30:00.000Z",
    "eventTypeId": 67890,
    "eventType": {
      "slug": "discovery-call",
      "title": "Discovery Call"
    },
    "attendees": [{
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "timeZone": "America/New_York"
    }],
    "location": "https://cal.com/video/room",
    "metadata": {}
  }
}
```

### BOOKING_RESCHEDULED
```json
{
  "triggerEvent": "BOOKING_RESCHEDULED",
  "payload": {
    "uid": "booking-uid-001",
    "startTime": "2026-03-02T15:00:00.000Z",
    "endTime": "2026-03-02T15:30:00.000Z",
    "rescheduleReason": "Need to move to later time"
  }
}
```

### BOOKING_CANCELLED
```json
{
  "triggerEvent": "BOOKING_CANCELLED",
  "payload": {
    "uid": "booking-uid-001",
    "status": "CANCELLED",
    "cancellationReason": "Found another solution"
  }
}
```

## Database Schema

### bookings table
- `id` - UUID primary key
- `cal_booking_id` - Cal.com booking ID
- `cal_booking_uid` - Cal.com booking UID (unique)
- `cal_event_type_id` - Event type ID
- `cal_event_type_slug` - Event type slug
- `attendee_email` - Lead email
- `attendee_name` - Lead name
- `attendee_phone` - Lead phone
- `title` - Booking title
- `start_time` - Start time (ISO 8601)
- `end_time` - End time (ISO 8601)
- `status` - booked, rescheduled, cancelled, completed
- `reschedule_count` - Number of reschedules
- `cancellation_reason` - Reason for cancellation
- `lead_id` - Foreign key to leads table
- `agent_id` - Foreign key to agents table
- `metadata` - JSON metadata

### booking_activities table (Audit log)
- `booking_id` - Reference to booking
- `action` - Type of action (booking_created, booking_rescheduled, etc.)
- `previous_data` - Previous state
- `new_data` - New state
- `created_at` - Timestamp

## Retry Configuration

```javascript
{
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
}
```

Non-retryable errors (fail immediately):
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- Unique constraint violations
- Foreign key violations

## Testing

Run all Cal.com tests:
```bash
npm test
```

Run webhook handler tests only:
```bash
npm run test:webhook-handler
```

Run webhook management tests:
```bash
npm run test:webhooks
```

## Webhook Setup in Cal.com

1. Go to Cal.com Settings → Webhooks
2. Add new webhook with URL: `https://your-domain.com/api/webhooks/calcom`
3. Select events: BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED, MEETING_ENDED
4. Copy the webhook secret to your `.env` file as `CAL_WEBHOOK_SECRET`
5. Save the webhook

## Error Handling

The webhook handler:
1. Validates webhook signature (in production)
2. Parses and validates the event payload
3. Processes the event with retry logic
4. Updates Supabase database
5. Returns appropriate HTTP status codes

Response codes:
- `200 OK` - Webhook processed successfully
- `400 Bad Request` - Invalid payload
- `401 Unauthorized` - Invalid signature
- `500 Internal Server Error` - Processing failed

## File Structure

```
lib/
  calcom-webhook-handler.js    # Main webhook handler logic
  calcom-webhook-management.js  # Webhook management functions

routes/
  webhooks-calcom.js           # API route at /api/webhooks/calcom
  calcom-webhooks.js           # Webhook management routes
  calcom.js                    # Cal.com API routes

test/
  calcom-webhook-handler.test.js    # Webhook handler tests
  calcom-webhook-management.test.js # Management tests
  calcom-integration.test.js        # Integration tests

server.js                      # Express server with webhook routes
```
