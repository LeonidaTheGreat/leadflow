# Cal.com Scheduling Setup

## Overview
Cal.com is already integrated into LeadFlow AI. Agents can add their Cal.com booking link during onboarding, and the AI will automatically include it in SMS messages when leads want to schedule.

---

## For the Pilot Program

### Your Cal.com Setup

You need a Cal.com account to:
1. Schedule onboarding calls with pilot agents
2. Allow agents to book setup calls
3. Let leads book appointments through the AI

### Recommended Cal.com Configuration

#### Event Type: "LeadFlow Onboarding Call"
```
Event Name: LeadFlow Pilot Onboarding
Duration: 15 minutes
Description: 
  "Get set up with LeadFlow AI - the AI assistant that responds to your leads in under 30 seconds.
  
  During this call, we'll:
  • Connect your Follow Up Boss account
  • Set up your AI assistant
  • Configure your booking preferences
  • Test everything is working
  
  Bring: Your FUB login and your Cal.com booking link"

Location: Zoom (or your preferred platform)
Buffer Time: 15 minutes before and after
Minimum Notice: 4 hours
```

#### Event Type: "LeadFlow Setup Call" (for agents)
```
Event Name: LeadFlow Setup Call
Duration: 20 minutes
Description:
  "Let's get your AI assistant live!
  
  We'll cover:
  • Connect Follow Up Boss (2 mins)
  • Add your Cal.com link (2 mins)
  • Customize your AI voice (5 mins)
  • Test with a sample lead (5 mins)
  • Q&A (6 mins)
  
  After this call, you'll be ready to handle leads automatically."

Location: Zoom
Buffer Time: 10 minutes
```

---

## Cal.com Integration for Agents

### How It Works

1. **Agent provides their Cal.com link** during onboarding
2. **AI includes booking link** in SMS when lead wants to schedule
3. **Booking confirmations sent** via SMS to lead
4. **Booking data synced** to FUB and LeadFlow dashboard

### Agent Onboarding Steps

```
Step 1: Get Cal.com Account
• Sign up at cal.com (free plan available)
• Create event type for property showings/consultations
• Set availability preferences
• Copy booking link

Step 2: Add to LeadFlow
• Go to LeadFlow dashboard → Settings → Integrations
• Paste Cal.com link
• Click "Verify"
• System confirms link is valid

Step 3: Test
• AI will now include booking link in qualifying conversations
• Test with sample lead
• Verify booking appears in both Cal.com and dashboard
```

---

## Cal.com Webhook Configuration

### Already Configured
The webhook endpoint is live at:
```
POST /api/webhook/calcom
```

This handles:
- BOOKING_CREATED
- BOOKING_RESCHEDULED  
- BOOKING_CANCELLED

### SMS Notifications Sent
When a booking event occurs, the system automatically:
1. Finds the associated lead in FUB
2. Sends SMS confirmation/update to lead
3. Updates booking status in LeadFlow dashboard
4. Logs event for analytics

---

## Booking Flow Example

```
Lead: "Can I see the property this week?"
AI: "Absolutely! I have availability Tuesday at 2pm, Wednesday at 10am, or Friday at 3pm. Which works best?"

Lead: "Tuesday at 2pm"
AI: "Perfect! Here's your booking link: [Agent's Cal.com Link]

Once you book, you'll get a confirmation text with the address and my contact info. Looking forward to meeting you!"

[Lead books via Cal.com]

→ SMS sent to lead: "Confirmed! You're booked for Tuesday at 2pm with [Agent Name]. Address: 123 Main St. Questions? Just reply here."

→ Agent sees booking in FUB and LeadFlow dashboard
```

---

## Troubleshooting

### Common Issues

**"Cal.com link not verifying"**
- Check link format: should be https://cal.com/username/event-type
- Ensure event type is public
- Try with https://

**"Bookings not showing in dashboard"**
- Verify webhook is configured in Cal.com
- Check that lead email/phone matches FUB record
- Review webhook logs in dashboard

**"SMS confirmations not sending"**
- Verify lead has consent_sms = true
- Check lead is not on DNC list
- Review Twilio logs

---

## Resources

### Cal.com Documentation
- Getting Started: https://cal.com/docs
- Webhook Setup: https://cal.com/docs/webhooks
- Embedding: https://cal.com/docs/embed

### LeadFlow Integration
- API Endpoint: `/api/webhook/calcom`
- Verification Endpoint: `/api/integrations/cal-com/verify`
- Support: support@leadflow.ai

---

## Pilot Program Notes

### During Pilot
- Monitor booking conversion rates
- Track time from lead inquiry to booked appointment
- Gather feedback on SMS confirmation copy
- Note any integration issues

### Success Metrics
- **Target:** 30%+ of qualified leads book appointments
- **Target:** <2 min average booking time
- **Target:** 95%+ successful webhook delivery

---

*Cal.com Integration v1.0 - February 2026*
