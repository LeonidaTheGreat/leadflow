---
title: TASK-003 - UC-7 Dashboard Manual SMS
date: 2026-02-24
task_id: dev-003
agent: dev
priority: high
status: assigned
---

# TASK-003: UC-7 Dashboard Manual SMS

## Status: 🟡 ASSIGNED

**Task ID:** dev-003  
**Priority:** HIGH  
**Estimated Time:** 6 hours  
**Assigned:** 2026-02-24  
**Due:** 2026-02-26  
**Agent:** Dev

## Objective
Enable agents to send manual SMS from the LeadFlow dashboard

## Requirements

### 1. API Endpoint
- [ ] Create `/api/sms/send-manual/route.ts`
- [ ] Accept: lead_id, message_body, ai_assist (boolean)
- [ ] Validate agent has permission for lead
- [ ] Send via Twilio
- [ ] Store in Supabase messages table

### 2. Dashboard UI Components
- [ ] Add message input to lead detail page
- [ ] "Send SMS" button
- [ ] AI Assist toggle (generates suggested response)
- [ ] Message history thread view
- [ ] Delivery status indicator

### 3. AI Assist Feature
```
Agent clicks "AI Assist"
  → Send conversation context to AI
  → AI generates suggested response
  → Agent can edit or send as-is
```

### 4. Message Thread UI
```
┌─────────────────────────────────────┐
│ Lead: John Doe                      │
│ Phone: +1-555-0100                  │
├─────────────────────────────────────┤
│ [Lead] Hi, is this still available? │
│ [AI]   Yes! When can you view it?   │
│ [Lead] Tomorrow at 3pm              │
│                                     │
│ [Input: ________________] [AI🔘]   │
│ [Send SMS]                          │
└─────────────────────────────────────┘
```

## Files to Create/Modify
1. `app/api/sms/send-manual/route.ts` — API endpoint
2. `app/dashboard/leads/[id]/page.tsx` — Add message UI
3. `components/dashboard/MessageThread.tsx` — Message history
4. `components/dashboard/SmsComposer.tsx` — Input + AI assist
5. `lib/twilio.ts` — Ensure sendSms works for manual sends

## Acceptance Criteria
- [ ] Agent can view full message history for a lead
- [ ] Agent can type and send custom SMS
- [ ] AI Assist generates contextual suggestions
- [ ] Messages appear in real-time (WebSocket or polling)
- [ ] Delivery status shows sent/delivered/failed
- [ ] Opt-out compliance enforced (check lead.consent_sms)

## Verification Steps
1. Open dashboard, navigate to lead
2. View existing message thread
3. Type message, click Send
4. Verify SMS received on phone
5. Test AI Assist button generates suggestion

## Dependencies
- UC-1 complete (outbound message storage working)
- Existing Twilio integration
- Lead detail page exists

## UI/UX Notes
- Use same styling as existing dashboard components
- Show timestamp for each message
- Color-code: inbound (gray), outbound (blue), AI (purple)
- Mobile-responsive layout

---
*Assigned by: Orchestrator*  
*Part of: UC-6/7/8 pre-pilot feature set*
