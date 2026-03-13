# PRD: Core SMS Lead Response

**Document ID:** PRD-CORE-SMS  
**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-03-03  
**Owner:** Product Manager

---

## 1. Overview

### 1.1 Problem Statement
Real estate agents lose leads to competitors who respond faster. 78% of deals go to the first responder, yet 35% of leads never get a response. LeadFlow AI solves this by automatically responding to leads via SMS within 30 seconds.

### 1.2 Product Goal
Enable real estate agents to instantly respond to leads from Follow Up Boss (FUB) CRM via AI-generated SMS messages, improving lead conversion rates and reducing response time to under 30 seconds.

### 1.3 Target Users
- **Primary:** Solo real estate agents (12-24 transactions/year)
- **Secondary:** Small teams (2-5 agents, 50-150 leads/month)

### 1.4 Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Response Time | <30 seconds | Time from lead creation to first SMS |
| Lead Response Rate | 100% | % of leads receiving SMS response |
| Booking Conversion | 15%+ | % of leads booking appointments |
| System Uptime | 99.5% | Vercel/Twilio availability |

---

## 2. Use Cases

### UC-1: Lead-Initiated SMS
**Description:** Respond to inbound lead SMS messages with AI-generated responses

**Trigger:** Lead sends SMS to agent's Twilio number

**Flow:**
1. Twilio receives inbound SMS webhook
2. System identifies lead by phone number
3. AI generates contextual response based on conversation history
4. SMS sent back to lead
5. Conversation logged in FUB and dashboard

**Acceptance Criteria:**
- [ ] System receives and processes Twilio inbound webhooks
- [ ] Lead identified correctly by phone number
- [ ] AI response generated within 5 seconds
- [ ] Response includes context from previous messages
- [ ] Conversation synced to FUB timeline
- [ ] Message appears in dashboard history

---

### UC-2: FUB New Lead Auto-SMS
**Description:** Automatically send SMS when new lead appears in FUB CRM

**Trigger:** New lead created in FUB (via webhook)

**Flow:**
1. FUB sends webhook for new lead event
2. System extracts lead info (name, phone, source)
3. AI generates personalized welcome SMS
4. SMS sent via Twilio
5. Lead record created in local database
6. Lead appears in dashboard

**Acceptance Criteria:**
- [ ] FUB webhook endpoint accepts and validates payloads
- [ ] Lead data correctly extracted from FUB payload
- [ ] Welcome SMS sent within 30 seconds of lead creation
- [ ] Lead record created with all FUB fields
- [ ] Lead appears in dashboard lead feed
- [ ] SMS delivery status tracked

---

### UC-3: FUB Status Change
**Description:** Trigger SMS workflows on FUB lead status changes

**Trigger:** Lead status updated in FUB (e.g., New → Qualified)

**Flow:**
1. FUB sends status change webhook
2. System checks if status triggers SMS workflow
3. If matched, AI generates status-appropriate message
4. SMS sent to lead
5. Status history logged

**Acceptance Criteria:**
- [ ] Status change webhooks processed correctly
- [ ] Configurable status→SMS workflow mapping
- [ ] SMS only sent for configured status transitions
- [ ] Message content appropriate for new status
- [ ] Status history maintained in database

---

### UC-4: FUB Agent Assignment
**Description:** Handle agent assignment changes in FUB CRM

**Trigger:** Lead assigned to different agent in FUB

**Flow:**
1. FUB sends agent assignment webhook
2. System updates lead ownership
3. New agent notified (if configured)
4. Lead visibility updated in dashboard

**Acceptance Criteria:**
- [ ] Agent assignment webhooks processed
- [ ] Lead ownership updated in database
- [ ] Dashboard shows correct agent for each lead
- [ ] Previous agent loses access (if permissions restrict)

---

### UC-5: Lead Opt-Out
**Description:** Process STOP/opt-out messages and update CRM

**Trigger:** Lead sends "STOP", "UNSUBSCRIBE", or similar opt-out keywords

**Flow:**
1. Twilio receives opt-out SMS
2. System recognizes opt-out intent
3. Lead marked as opted-out in database
4. Opt-out status synced to FUB (via note/tag)
5. No further SMS sent to this lead
6. Compliance log updated

**Acceptance Criteria:**
- [ ] STOP/UNSUBSCRIBE keywords recognized (case-insensitive)
- [ ] Lead opted_out flag set to true
- [ ] Opt-out logged for TCPA compliance
- [ ] No SMS sent to opted-out leads
- [ ] Opt-out status visible in dashboard
- [ ] FUB updated with opt-out note

---

### UC-7: Dashboard Manual SMS
**Description:** Send manual SMS from dashboard interface

**Trigger:** Agent clicks "Send SMS" in dashboard

**Flow:**
1. Agent selects lead from lead feed
2. Clicks "Send Message" button
3. Types message or uses AI suggestion
4. Clicks Send
5. SMS delivered via Twilio
6. Message appears in conversation history

**Acceptance Criteria:**
- [ ] "Send Message" button available on lead detail
- [ ] Message composition UI with character count
- [ ] AI suggestion button generates contextual message
- [ ] Send button triggers Twilio API
- [ ] Delivery status shown (sent, delivered, failed)
- [ ] Message appears in history immediately

---

### UC-8: Follow-up Sequences
**Description:** Automated multi-step follow-up SMS sequences

**Trigger:** Time-based or event-based triggers (e.g., 2 hours after first contact with no response)

**Flow:**
1. Sequence scheduler checks for due follow-ups
2. For each due lead, generates personalized follow-up
3. SMS sent via Twilio
4. Sequence step marked complete
5. Next step scheduled (if applicable)
6. Lead engagement tracked

**Acceptance Criteria:**
- [ ] Sequences configurable per lead stage
- [ ] Time delays between steps (1h, 4h, 24h, etc.)
- [ ] Sequence stops if lead responds
- [ ] Sequence stops if lead books appointment
- [ ] Sequence stops if lead opts out
- [ ] Active sequences visible in dashboard

---

## 3. Technical Requirements

### 3.1 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /webhook/fub | POST | Receive FUB lead/events webhooks |
| /webhook/twilio/sms | POST | Receive Twilio SMS inbound |
| /webhook/twilio/status | POST | Receive Twilio delivery status |
| /api/sms/send | POST | Send manual SMS from dashboard |
| /api/leads | GET | List leads for dashboard |
| /api/leads/:id/messages | GET | Get message history for lead |
| /api/sequences | GET/POST | Manage follow-up sequences |
| /health | GET | System health check |

### 3.2 Data Model

**Lead**
- id: UUID
- fub_id: string
- name: string
- phone: string
- email: string
- source: string
- status: enum (new, qualified, nurturing, appointment, closed, lost)
- agent_id: UUID
- opted_out: boolean
- created_at: timestamp
- updated_at: timestamp

**Message**
- id: UUID
- lead_id: UUID
- direction: enum (inbound, outbound)
- content: text
- twilio_sid: string
- status: enum (pending, sent, delivered, failed)
- source: enum (ai, manual, sequence)
- created_at: timestamp

**Sequence**
- id: UUID
- name: string
- trigger: enum (time, event)
- steps: JSON [delay_hours, message_template]
- is_active: boolean

### 3.3 Integrations

| Service | Purpose | Critical |
|---------|---------|----------|
| Follow Up Boss | Lead source, CRM sync | Yes |
| Twilio | SMS sending/receiving | Yes |
| Claude AI | Message generation | Yes |
| Cal.com | Appointment booking | No |
| Supabase | Database, auth | Yes |

### 3.4 Performance Requirements

- Webhook response time: <200ms
- AI message generation: <5 seconds
- Dashboard load time: <2 seconds
- SMS delivery notification: <30 seconds from send

---

## 4. E2E Test Specifications

### E2E-1: Lead-Initiated SMS Flow
**URL:** https://fub-inbound-webhook.vercel.app  
**Test Steps:**
1. Send test SMS to Twilio number
2. Verify webhook received by system
3. Verify AI response generated
4. Verify response SMS delivered
5. Verify conversation logged in dashboard

**Expected Result:** Complete round-trip in <30 seconds

### E2E-2: FUB New Lead Auto-Response
**URL:** https://fub-inbound-webhook.vercel.app/webhook/fub  
**Test Steps:**
1. Create new lead in FUB test account
2. Verify FUB webhook received
3. Verify welcome SMS sent within 30 seconds
4. Verify lead appears in dashboard
5. Verify delivery status updated

**Expected Result:** Lead receives SMS, dashboard updated

### E2E-3: Opt-Out Handling
**URL:** https://fub-inbound-webhook.vercel.app  
**Test Steps:**
1. Send "STOP" from test lead phone
2. Verify opt-out processed
3. Verify no further SMS sent
4. Verify opt-out flag in dashboard
5. Verify compliance log entry

**Expected Result:** Lead opted out, system respects choice

### E2E-4: Dashboard Manual SMS
**URL:** https://leadflow-ai-five.vercel.app/dashboard  
**Test Steps:**
1. Navigate to lead in dashboard
2. Click "Send Message"
3. Type test message
4. Click Send
5. Verify SMS delivered
6. Verify appears in history

**Expected Result:** Manual SMS sent and logged

### E2E-5: Follow-up Sequence Execution
**URL:** https://leadflow-ai-five.vercel.app/dashboard  
**Test Steps:**
1. Create test sequence with 1-minute delay
2. Assign to test lead
3. Wait for sequence trigger
4. Verify follow-up SMS sent
5. Verify sequence progress updated

**Expected Result:** Sequence executes on schedule

### E2E-6: Health Check All Services
**URL:** https://fub-inbound-webhook.vercel.app/health  
**Test Steps:**
1. Call health endpoint
2. Verify status: ok
3. Verify FUB connection: configured
4. Verify Supabase connection: ok
5. Verify Twilio: configured

**Expected Result:** All services report healthy

---

## 5. Review Findings & Spec Updates

Based on Product Review (2026-03-03):

### Issue 1: Billing Integration Error (High Severity)
**Finding:** Settings > Billing shows "Agent not found" error  
**Spec Update Required:** 
- Add acceptance criteria for billing data validation
- Define agent-billing record association requirements
- Add error handling requirements for missing billing records

### Issue 2: Authentication Flow Visibility (Medium Severity)
**Finding:** No visible login/signup on customer dashboard landing page  
**Spec Update Required:**
- Add requirement for authentication entry point on landing page
- Define sign-up flow from landing page
- Add acceptance criteria for auth UI visibility

### Issue 3: E2E Test Pass Rate (Medium Severity)
**Finding:** Only 42% (5/12) E2E tests passing  
**Spec Update Required:**
- Prioritize E2E test coverage for core flows (UC-1 through UC-5)
- Add test stability requirements
- Define minimum pass rate (target: 80%+)

---

## 6. Release Criteria

### MVP (Pilot Ready)
- [ ] UC-1 through UC-5 functional and tested
- [ ] Dashboard shows leads and messages
- [ ] FUB webhook integration working
- [ ] Twilio SMS sending/receiving
- [ ] AI message generation operational
- [ ] Opt-out compliance implemented

### Production Ready
- [ ] All 7 use cases complete
- [ ] E2E test pass rate 80%+
- [ ] Billing integration working
- [ ] Authentication flow complete
- [ ] Documentation complete
- [ ] 3+ pilot agents successfully onboarded

---

## 7. Open Questions

1. Should we support multiple phone numbers per agent?
2. What custom fields from FUB should sync to LeadFlow?
3. Should sequences be editable per-lead or only per-template?
4. What happens to active sequences when a lead opts out?
