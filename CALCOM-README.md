# Cal.com Booking Integration

This module provides complete Cal.com booking link integration for LeadFlow, enabling agents to generate personalized booking links, receive webhook notifications for booking events, and sync booking data with Supabase.

## Features

- **Booking Link Generation**: Create personalized booking links for agents with prefill data
- **Webhook Handlers**: Process `booking.created`, `booking.rescheduled`, `booking.cancelled`, and `meeting.ended` events
- **Calendar Sync**: Store and manage booking data in Supabase
- **SMS Notifications**: Send booking confirmations and reminders via Twilio
- **Agent Configuration**: Per-agent booking preferences and settings

## Quick Start

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure your Cal.com credentials:

```bash
# Cal.com API Configuration
CAL_API_KEY=your_cal_api_key_here
CAL_USERNAME=your_cal_username
CAL_WEBHOOK_SECRET=your_webhook_secret_here

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Database Setup

Run the database setup script to create the required tables:

```bash
npm run setup:calcom
```

Or execute the SQL directly in Supabase SQL Editor:
- File: `sql/calcom-bookings-schema.sql`

### 3. Configure Cal.com Webhooks

In your Cal.com dashboard:
1. Go to Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/webhook/calcom`
3. Subscribe to events:
   - `BOOKING_CREATED`
   - `BOOKING_RESCHEDULED`
   - `BOOKING_CANCELLED`
   - `MEETING_ENDED`
4. Copy the webhook secret and set it as `CAL_WEBHOOK_SECRET`

## API Endpoints

### Status Check
```
GET /api/calcom/status
```

### Event Types (Booking Link Templates)
```
GET /api/calcom/event-types
GET /api/calcom/event-types?username=john
```

### Booking Links
```
GET /api/calcom/booking-links
GET /api/calcom/booking-links?agentId=uuid
```

### Generate Personalized Link
```
POST /api/calcom/generate-link
{
  "agentId": "agent-uuid",
  "eventTypeSlug": "discovery-call",
  "options": {
    "prefill": {
      "name": "John Doe",
      "email": "john@example.com"
    },
    "utmSource": "website"
  }
}
```

### Create Personalized Link for Lead
```
POST /api/calcom/personalized-link
{
  "agentId": "agent-uuid",
  "eventTypeSlug": "property-tour",
  "lead": {
    "id": "lead-uuid",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "source": "facebook"
  }
}
```

### Quick Booking Links
```
GET /api/calcom/quick-link/discovery?agentId=uuid
GET /api/calcom/quick-link/tour?agentId=uuid
GET /api/calcom/quick-link/consultation?agentId=uuid
```

### Available Scenarios
```
GET /api/calcom/scenarios
```

### Get Available Time Slots
```
GET /api/calcom/slots?eventTypeId=1&start=2026-03-15&end=2026-03-16
```

### Create Booking
```
POST /api/calcom/bookings
{
  "eventTypeId": 1,
  "start": "2026-03-15T14:00:00Z",
  "attendee": {
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890"
  }
}
```

## Webhook Events

The webhook handler (`/webhook/calcom`) processes these events:

### BOOKING_CREATED
- Creates booking record in database
- Finds or creates lead
- Links booking to agent
- Sends SMS confirmation (if phone available)
- Schedules reminder notifications

### BOOKING_RESCHEDULED
- Updates booking with new time
- Increments reschedule count
- Sends updated confirmation SMS
- Reschedules reminders

### BOOKING_CANCELLED
- Updates booking status to cancelled
- Stores cancellation reason
- Cancels pending reminders

### MEETING_ENDED
- Updates booking status to completed
- Triggers post-meeting follow-up sequence

## Database Schema

### bookings
- `cal_booking_id` - Cal.com booking ID
- `cal_booking_uid` - Unique booking identifier
- `attendee_email`, `attendee_name`, `attendee_phone`
- `start_time`, `end_time`
- `status` - booked, rescheduled, cancelled, completed
- `lead_id`, `agent_id` - Foreign keys
- `metadata` - JSON additional data

### booking_activities
- Audit log of all booking actions
- Tracks changes and updates

### agent_booking_configs
- Per-agent booking preferences
- Notification settings
- Buffer times and notice requirements

### booking_reminders
- Scheduled reminders for bookings
- Tracks SMS/email reminder status

## Testing

Run the test suite:

```bash
npm test
# or
npm run test:calcom
```

Tests cover:
- API client functionality
- Webhook event handling
- Booking link generation
- Data validation
- Error handling

## Library Functions

### calcom.js - API Client
```javascript
const calcom = require('./lib/calcom');

// Get event types
const eventTypes = await calcom.getEventTypes();

// Get available slots
const slots = await calcom.getAvailableSlots({
  eventTypeId: 1,
  start: '2026-03-15',
  end: '2026-03-16'
});

// Create booking
const booking = await calcom.createBooking({
  eventTypeId: 1,
  start: '2026-03-15T14:00:00Z',
  attendee: { name, email, phoneNumber }
});

// Cancel booking
await calcom.cancelBooking(bookingId, { reason });

// Reschedule booking
await calcom.rescheduleBooking(bookingId, { start: newTime });
```

### booking-link-service.js - Link Generation
```javascript
const bookingService = require('./lib/booking-link-service');

// Generate agent link
const link = await bookingService.generateAgentBookingLink(
  agentId,
  'discovery-call',
  { prefill: { name, email } }
);

// Get all agent links
const links = await bookingService.getAgentBookingLinks(agentId);

// Create personalized link for lead
const personalized = await bookingService.createPersonalizedBookingLink(
  agentId,
  'property-tour',
  { name, email, phone, source: 'facebook' }
);

// Quick link by scenario
const quick = await bookingService.getQuickBookingLink(agentId, 'discovery');
```

### calcom-webhook-handler.js - Webhooks
```javascript
const { handleCalWebhook } = require('./lib/calcom-webhook-handler');

// Process webhook event
const result = await handleCalWebhook({
  triggerEvent: 'BOOKING_CREATED',
  payload: { ... }
});
```

## Configuration Options

### Agent Booking Config

| Option | Description | Default |
|--------|-------------|---------|
| `auto_confirmation` | Auto-accept bookings | false |
| `buffer_time_minutes` | Buffer between bookings | 15 |
| `minimum_notice_hours` | Minimum advance notice | 24 |
| `send_sms_confirmation` | Send SMS on booking | true |
| `send_email_confirmation` | Send email on booking | true |
| `send_reminder_sms` | Send reminder SMS | true |
| `reminder_hours_before` | When to send reminder | 24 |

## Security

- Webhook signatures are verified using HMAC-SHA256
- Production requires `CAL_WEBHOOK_SECRET`
- Database uses Row Level Security (RLS) policies
- Service role key required for database operations

## Error Handling

The integration gracefully handles:
- Missing or invalid API keys (returns mock data in development)
- Database connection failures (logs warnings)
- Invalid webhook payloads
- Missing attendee data
- Duplicate bookings (upserts by UID)

## Development

When `CAL_API_KEY` is not configured, the system returns mock data for development:
- 5 sample event types (discovery, tour, consultation, etc.)
- Mock bookings with realistic data
- Simulated time slots

## Deployment

### Vercel
1. Set environment variables in Vercel dashboard
2. Deploy webhook endpoint is automatically available at `/webhook/calcom`
3. Configure Cal.com webhook URL to point to your deployment

### Local Development
```bash
npm install
npm run dev
# Server runs on http://localhost:3000
```

## Troubleshooting

### Webhooks not receiving
- Verify `CAL_WEBHOOK_SECRET` matches Cal.com settings
- Check server logs for signature verification failures
- Ensure `/webhook/calcom` endpoint is accessible

### Database errors
- Run `npm run setup:calcom` to create tables
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check RLS policies if using authenticated access

### Booking links not generating
- Verify `CAL_USERNAME` is set
- Check that event type slug exists in Cal.com
- Ensure agent has Cal.com account linked

## License

Part of LeadFlow AI - Proprietary
