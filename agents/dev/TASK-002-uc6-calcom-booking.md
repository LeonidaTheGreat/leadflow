---
title: TASK-002 - UC-6 Cal.com Booking Confirmation
date: 2026-02-24
task_id: dev-002
agent: dev
priority: high
status: assigned
---

# TASK-002: UC-6 Cal.com Booking Confirmation

## Status: 🟡 ASSIGNED

**Task ID:** dev-002  
**Priority:** HIGH  
**Estimated Time:** 8 hours  
**Assigned:** 2026-02-24  
**Due:** 2026-02-26  
**Agent:** Dev

## Objective
Implement SMS confirmation when appointments are booked via Cal.com

## Requirements

### 1. Cal.com Webhook Handler
- [ ] Create `/api/webhook/calcom/route.ts`
- [ ] Verify webhook signature
- [ ] Parse booking events: `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`
- [ ] Extract: date, time, meeting link, attendee info

### 2. SMS Confirmation Flow
```
Cal.com Booking Created
  → Store booking in Supabase
  → Find lead by email/phone
  → Generate confirmation SMS
  → Store outbound message
  → Send via Twilio
```

### 3. SMS Templates
**Booking Confirmation:**
```
Hi {name}! Your appointment with {agent_name} is confirmed for {date} at {time}. 
Meeting link: {link}
Reply STOP to opt out.
```

**Booking Rescheduled:**
```
Hi {name}! Your appointment has been rescheduled to {date} at {time}.
New link: {link}
Reply STOP to opt out.
```

**Booking Cancelled:**
```
Hi {name}! Your appointment for {date} has been cancelled. 
Reply here or call us to reschedule.
Reply STOP to opt out.
```

### 4. Database Updates
- [ ] Ensure `bookings` table has required fields
- [ ] Store: calcom_booking_id, start_time, end_time, meeting_link, status

### 5. Configuration
- [ ] Cal.com webhook URL: `https://leadflow-ai-five.vercel.app/api/webhook/calcom`
- [ ] Webhook secret verification
- [ ] Event types to subscribe: `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`

## Files to Create/Modify
1. `app/api/webhook/calcom/route.ts` — Webhook handler
2. `lib/calcom.ts` — Add webhook parsing functions
3. `lib/sms-templates.ts` — Booking confirmation templates
4. `lib/supabase.ts` — Ensure booking functions work

## Acceptance Criteria
- [ ] Webhook receives and validates Cal.com events
- [ ] Booking stored in Supabase with all metadata
- [ ] Confirmation SMS sent within 5 seconds
- [ ] SMS includes date, time, meeting link
- [ ] Reschedule/cancel events update lead + send SMS
- [ ] Error handling logs failures to events table

## Verification Steps
```bash
# Test with mock Cal.com webhook
curl -X POST "https://leadflow-ai-five.vercel.app/api/webhook/calcom" \
  -H "Content-Type: application/json" \
  -H "X-Calcom-Signature: <signature>" \
  -d '{
    "triggerEvent": "BOOKING_CREATED",
    "payload": {
      "bookingId": 123,
      "startTime": "2026-02-25T10:00:00Z",
      "endTime": "2026-02-25T11:00:00Z",
      "attendees": [{"email": "test@test.com", "name": "Test User"}],
      "metadata": {"videoCallUrl": "https://meet.google.com/abc"}
    }
  }'
```

## Dependencies
- Agent Cal.com accounts configured (Manual setup)
- Cal.com webhook configured in dashboard (Manual setup)

## Notes
- Use existing `lib/calcom.ts` functions where possible
- Follow error handling pattern from `twilio/route.ts`
- Ensure compliance footer on all SMS

---
*Assigned by: Orchestrator*  
*Part of: UC-6/7/8 pre-pilot feature set*
