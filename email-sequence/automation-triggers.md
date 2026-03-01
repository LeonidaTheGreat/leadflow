# Email Sequence Automation Triggers

## Overview

This document defines the automation triggers for the LeadFlow Pilot Onboarding email sequence.

## Trigger Types

### 1. Immediate Trigger (Email 1: Welcome)
- **Event**: `pilot.enrolled`
- **Timing**: Instant (within 60 seconds)
- **Condition**: Agent status = "pilot_enrolled"
- **API Endpoint**: `POST /api/v1/pilot/enroll`
- **Payload**:
```json
{
  "agentId": "uuid",
  "email": "agent@example.com",
  "firstName": "Jane",
  "brokerage": "Example Realty",
  "pilotStartDate": "2026-03-01T00:00:00Z"
}
```

### 2. Time-Based Triggers (Emails 2-5)

| Email | Trigger Event | Delay | Send Time Window |
|-------|--------------|-------|------------------|
| Day-3 Tips | `pilot.day3_reminder` | 72h from enrollment | 9:00 AM - 11:00 AM local time |
| Week-1 Check-in | `pilot.week1_checkin` | 7d from enrollment | 10:00 AM - 12:00 PM local time |
| Mid-Pilot Feedback | `pilot.mid_feedback` | 15d from enrollment | 9:00 AM - 5:00 PM local time |
| Completion | `pilot.complete` | 30d from enrollment | 9:00 AM - 12:00 PM local time |

## Conditional Logic

### Skip Conditions
- Email is NOT sent if:
  - Agent unsubscribed (`preferences.email.optOut = true`)
  - Agent status changed to "withdrawn"
  - Previous email bounced (`deliveryStatus = bounced`)

### Alternative Path (High Engagement)
If agent opens 3+ emails AND clicks 2+ links:
- Trigger: `pilot.high_engagement` 
- Action: Add to "Power User" nurture sequence

### Alternative Path (Low Engagement)
If agent hasn't opened any emails after Day-3:
- Trigger: `pilot.re_engagement`
- Action: Send SMS notification (if opted in)

## Webhook Events

All emails trigger webhook events for analytics:

```
email.sent       → POST /webhooks/email/sent
email.delivered  → POST /webhooks/email/delivered  
email.opened     → POST /webhooks/email/opened
email.clicked    → POST /webhooks/email/clicked
email.bounced    → POST /webhooks/email/bounced
email.complained → POST /webhooks/email/complained
```

## Resend API Integration

### Configuration
```javascript
const resend = new Resend(process.env.RESEND_API_KEY);

// Send with A/B test
await resend.emails.send({
  from: 'pilot@leadflow.ai',
  to: agent.email,
  subject: abTestVariant === 'A' ? subjectA : subjectB,
  html: emailHtml,
  text: emailPlainText,
  tags: [
    { name: 'campaign', value: 'pilot-onboarding' },
    { name: 'email_id', value: 'welcome' },
    { name: 'variant', value: abTestVariant }
  ]
});
```

## A/B Test Allocation

- Variant A: 50% of recipients
- Variant B: 50% of recipients
- Winner determined by: Open rate at 48 hours
- Winning variant used for: Remaining 20% of pilot cohort

## Error Handling

1. **API Failure**: Retry with exponential backoff (max 3 attempts)
2. **Rate Limiting**: Queue and retry after 60 seconds
3. **Invalid Email**: Mark as bounced, skip remaining sequence

## Testing

### Test Mode
Set `X-Test-Mode: true` header to:
- Send to test inbox only
- Skip delay timers
- Log full payload for debugging

### Test Recipients
- test-agent-1@leadflow.ai
- test-agent-2@leadflow.ai  
- test-agent-3@leadflow.ai
