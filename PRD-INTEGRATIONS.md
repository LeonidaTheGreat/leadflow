# PRD: CRM & Calendar Integrations

**Document ID:** PRD-INTEGRATIONS  
**Version:** 1.0  
**Status:** Active  
**Last Updated:** 2026-03-03  
**Owner:** Product Manager

---

## 1. Overview

### 1.1 Problem Statement
Real estate agents use multiple tools (FUB for CRM, Twilio for SMS, Cal.com for scheduling) that need to work together seamlessly. Without proper integrations, agents must manually transfer data between systems, leading to delays and errors.

### 1.2 Product Goal
Enable seamless integration between LeadFlow AI and external services (Follow Up Boss, Twilio, Cal.com) to create a unified lead management and communication platform.

### 1.3 Target Users
- **Primary:** Real estate agents using Follow Up Boss CRM
- **Secondary:** Agents who schedule appointments via Cal.com

### 1.4 Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| FUB Webhook Success | >99% | % of webhooks processed successfully |
| Integration Uptime | 99.5% | External API availability |
| Setup Completion | >80% | % of users who complete all integrations |
| Time to First Lead | <5 min | Time from integration to first lead received |

---

## 2. Integrations

### 2.1 Follow Up Boss (FUB)

**Purpose:** CRM sync - receive leads and status updates from FUB

**Features:**
- Inbound webhooks for new leads
- Status change notifications
- Agent assignment updates
- Activity logging back to FUB

**Status:** ✅ Operational (per dashboard: Webhook endpoint live, UC-6 working)

---

### 2.2 Twilio

**Purpose:** SMS sending and receiving

**Features:**
- Send outbound SMS via Twilio API
- Receive inbound SMS via webhooks
- Delivery status tracking
- Opt-out handling (STOP keywords)

**Status:** ✅ TESTED (per dashboard: SMS sent successfully via API)

---

### 2.3 Cal.com

**Purpose:** Appointment scheduling - let leads book meetings

**Features:**
- Generate booking links for agents
- Embed booking in SMS conversations
- Receive booking confirmations
- Sync appointments to calendar

**Status:** ⚠️ UI Present - Connection flow needs verification

---

## 3. Use Cases

### UC-6: Cal.com Booking
**Description:** Book appointments via Cal.com from SMS conversations

**Trigger:** Lead expresses interest in meeting or agent sends booking link

**Flow:**
1. Lead indicates interest in viewing property (via SMS)
2. AI detects intent and offers booking options
3. System generates Cal.com booking link for agent
4. SMS sent with booking link to lead
5. Lead clicks link and selects time slot
6. Cal.com confirms booking
7. Webhook received with booking details
8. Confirmation SMS sent to lead
9. Booking logged in FUB and dashboard

**Acceptance Criteria:**
- [ ] Cal.com booking link generated for agent
- [ ] Link sent via SMS to lead
- [ ] Booking confirmation webhook received
- [ ] Appointment details stored in database
- [ ] Confirmation SMS sent automatically
- [ ] Booking appears in dashboard
- [ ] Activity logged in FUB timeline
- [ ] Agent receives notification

**Review Findings (2026-03-03):**
- ✅ Integration UI present in dashboard
- ⚠️ Connection status shows "Not connected" - flow needs verification
- ⚠️ API endpoint /api/booking returned 404 for GET (may be POST-only)

---

## 4. Technical Requirements

### 4.1 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/webhook/fub` | POST | Receive FUB lead/events |
| `/webhook/twilio/sms` | POST | Receive inbound SMS |
| `/webhook/twilio/status` | POST | Delivery status callbacks |
| `/webhook/calcom/booking` | POST | Receive booking confirmations |
| `/api/booking` | GET/POST | Get booking link / Create booking |
| `/api/integrations/fub/connect` | POST | Connect FUB account |
| `/api/integrations/twilio/connect` | POST | Connect Twilio account |
| `/api/integrations/calcom/connect` | POST | Connect Cal.com account |
| `/api/integrations/status` | GET | Get all integration statuses |

### 4.2 Data Model

**integrations**
```
id: UUID
user_id: UUID
service: enum (fub, twilio, calcom)
status: enum (connected, disconnected, error)
credentials: JSON (encrypted)
webhook_url: string
settings: JSON
created_at: timestamp
updated_at: timestamp
```

**bookings**
```
id: UUID
lead_id: UUID
agent_id: UUID
calcom_booking_id: string
start_time: timestamp
end_time: timestamp
timezone: string
status: enum (confirmed, cancelled, rescheduled)
meeting_url: string
notes: text
created_at: timestamp
```

### 4.3 Webhook Handling

**FUB Webhooks:**
- `people.created` - New lead
- `people.updated` - Lead updated
- `people.stage_changed` - Status change
- `people.assigned` - Agent assignment

**Twilio Webhooks:**
- Incoming SMS
- Delivery status (delivered, failed)
- Opt-out (STOP, UNSUBSCRIBE)

**Cal.com Webhooks:**
- `booking.created` - New booking
- `booking.cancelled` - Booking cancelled
- `booking.rescheduled` - Booking rescheduled

### 4.4 Error Handling

**Integration Disconnection:**
- Detect via failed API calls
- Mark integration status as error
- Notify user via email/dashboard
- Queue retry with exponential backoff

**Webhook Failures:**
- Log failed webhook
- Retry up to 3 times
- Alert admin after repeated failures
- Store failed payload for manual review

---

## 5. E2E Test Specifications

### E2E-INTEGRATIONS-1: FUB Webhook Processing
**URL:** https://fub-inbound-webhook.vercel.app/webhook/fub  
**Test Steps:**
1. Send test FUB webhook payload (new lead)
2. Verify webhook accepted (200 response)
3. Verify lead created in database
4. Verify lead appears in dashboard
5. Verify welcome SMS triggered

**Expected Result:** Lead processed end-to-end within 30 seconds

### E2E-INTEGRATIONS-2: Twilio SMS Round-trip
**Test Steps:**
1. Trigger outbound SMS via dashboard
2. Verify Twilio API call succeeds
3. Simulate inbound reply via webhook
4. Verify AI response generated
5. Verify response SMS delivered

**Expected Result:** Complete SMS conversation cycle

### E2E-INTEGRATIONS-3: Cal.com Booking Flow
**Test Steps:**
1. Connect Cal.com integration (OAuth)
2. Generate booking link via API
3. Simulate booking webhook from Cal.com
4. Verify booking stored in database
5. Verify confirmation SMS sent
6. Verify booking appears in dashboard

**Expected Result:** Booking created and confirmed end-to-end

### E2E-INTEGRATIONS-4: Integration Status Dashboard
**URL:** https://leadflow-ai-five.vercel.app/integrations  
**Test Steps:**
1. Navigate to integrations page
2. Verify all 3 integrations listed
3. Verify status indicators shown
4. Click Connect on each integration
5. Verify OAuth flows initiate

**Expected Result:** All integrations visible and connectable

---

## 6. Review Findings & Spec Updates

Based on Product Review (2026-03-03):

### Finding 1: Cal.com Connection Flow (Medium)
**Finding:** Integration shows "Not connected" with no clear CTA
**Impact:** Users may not know how to connect Cal.com
**Spec Update:**
- Add explicit "Connect" buttons to integration cards
- Document OAuth flow steps
- Add connection wizard or setup guide

### Finding 2: API Endpoint Verification (Low)
**Finding:** /api/booking returned 404 for GET
**Impact:** Unclear if endpoint supports GET for link retrieval
**Spec Update:**
- Clarify endpoint methods (GET vs POST)
- Document expected request/response formats
- Add error handling for unsupported methods

---

## 7. Release Criteria

### MVP (Pilot Ready)
- [ ] FUB webhook integration operational
- [ ] Twilio SMS sending/receiving working
- [ ] Cal.com UI present in dashboard
- [ ] Integration status page functional
- [ ] Basic error handling implemented

### Production Ready
- [ ] All 3 integrations fully operational
- [ ] OAuth flows working for all services
- [ ] Retry logic for failed webhooks
- [ ] Comprehensive error handling
- [ ] Integration health monitoring

---

## 8. Dependencies

| Service | Status | Required For |
|---------|--------|--------------|
| Follow Up Boss | ✅ Ready | Core lead flow |
| Twilio | ✅ Tested | SMS functionality |
| Cal.com | ⚠️ Verify | Appointment booking |

---

## 9. Open Questions

1. Should we support other CRMs beyond FUB (e.g., HubSpot, Salesforce)?
2. Do we need two-way sync with FUB or just inbound?
3. Should Cal.com booking embed in iframe or open new tab?
4. How should we handle integration credential rotation?
