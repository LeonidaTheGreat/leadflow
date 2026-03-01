---
title: TASK-004 - UC-8 Follow-up Sequences
date: 2026-02-24
task_id: dev-004
agent: dev
priority: medium
status: assigned
---

# TASK-004: UC-8 Follow-up Sequences

## Status: 🟡 ASSIGNED

**Task ID:** dev-004  
**Priority:** MEDIUM  
**Estimated Time:** 12 hours  
**Assigned:** 2026-02-24  
**Due:** 2026-02-27  
**Agent:** Dev

## Objective
Implement automated follow-up SMS sequences based on time and lead behavior

## Requirements

### 1. Sequence Definition
Create follow-up templates with triggers:

| Sequence | Trigger | Delay | Message |
|----------|---------|-------|---------|
| No Response | Lead hasn't replied | 24h | "Hi {name}, just following up..." |
| Post-Viewing | After property viewing | 4h | "How did you like the property?" |
| Appointment No-Show | Missed appointment | 30min | "Sorry we missed you..." |
| Nurture | No activity | 7 days | "Any updates on your search?" |

### 2. Cron Job Scheduler
- [ ] Create `/api/cron/follow-up/route.ts`
- [ ] Run every hour (Vercel Cron)
- [ ] Query leads needing follow-up
- [ ] Generate AI responses
- [ ] Send via Twilio
- [ ] Track sequence step

### 3. Sequence State Tracking
```typescript
// lead_sequences table
{
  lead_id: string
  sequence_type: 'no_response' | 'post_viewing' | 'no_show' | 'nurture'
  step: number
  last_sent_at: timestamp
  next_send_at: timestamp
  status: 'active' | 'paused' | 'completed'
}
```

### 4. Smart Triggers
- [ ] No response: Check last_message_at > 24h
- [ ] Post-viewing: Check booking.status = 'completed'
- [ ] No-show: Check booking.status = 'no_show'
- [ ] Nurture: Check last_activity > 7 days

### 5. AI-Powered Follow-ups
```
Trigger: No response for 24h
  → Fetch conversation history
  → AI generates contextual follow-up
  → Personalize based on lead data
  → Send with compliance footer
```

### 6. Sequence Controls
- [ ] Pause sequences for opted-out leads
- [ ] Pause if lead responds (reset timer)
- [ ] Max 3 follow-ups per sequence type
- [ ] Don't send between 9pm-8am

## Files to Create/Modify
1. `app/api/cron/follow-up/route.ts` — Cron handler
2. `lib/sequences.ts` — Sequence logic and templates
3. `lib/cron.ts` — Cron utilities
4. Database: `lead_sequences` table (if not exists)
5. `vercel.json` — Add cron schedule

## vercel.json Addition
```json
{
  "crons": [
    {
      "path": "/api/cron/follow-up",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Acceptance Criteria
- [ ] Cron runs every hour
- [ ] Identifies leads needing follow-up
- [ ] Generates contextual AI responses
- [ ] Sends SMS and tracks delivery
- [ ] Updates sequence state
- [ ] Respects opt-outs and quiet hours
- [ ] Pauses on lead response
- [ ] Max 3 messages per sequence

## Verification Steps
1. Create test lead
2. Simulate 24h no response
3. Run cron job manually
4. Verify SMS sent
5. Check sequence state updated
6. Reply to SMS, verify sequence pauses

## Analytics (Future)
- Track open rates (if possible)
- Track response rates by sequence type
- A/B test message variations

## Dependencies
- UC-1 complete (SMS infrastructure)
- UC-6 complete (booking data for triggers)
- Vercel Cron (available on Pro plan)

## Notes
- Start with simple time-based triggers
- Add behavior-based triggers later
- Consider agent-configurable sequences

---
*Assigned by: Orchestrator*  
*Part of: UC-6/7/8 pre-pilot feature set*
