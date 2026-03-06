# PRD-REVENUE-RECOVERY-001: Revenue Recovery Plan — Critical MRR Gap Closure

**Status:** Approved  
**Version:** 1.0  
**Created:** 2026-03-06  
**Updated:** 2026-03-06  
**PM:** Product Manager  
**Project:** LeadFlow AI

---

## Executive Summary

LeadFlow is 12 days into a 60-day pilot. Current status: 0 paying agents, $0 MRR (target: $20K by day 60). The core product works, but the conversion funnel is broken. This PRD outlines three critical actions to close the gap and get the first paying agents within 44 days.

**Critical Blockers Removed:**
1. ✅ Real Twilio SMS integration (replaces mock)
2. Onboarding 500 error (fix pending)
3. Dashboard visibility/UX issues

---

## Part 1: Conversion Funnel Analysis

### Current State
- **Signup:** Landing page → email signup form (planned)
- **Onboarding:** Agent creates account → connects FUB API key → 500 error ❌
- **Activation:** Setup SMS integration → send first lead response → monitor
- **Revenue:** Upgrade to paid tier → Stripe checkout → billing

### Conversion Blockers
1. **No landing page** — agents have nowhere to learn about LeadFlow
2. **Onboarding 500 error** — agents cannot connect FUB API key
3. **Mock SMS integration** — agents cannot send real SMS (only logs to console)
4. **No dashboard visibility** — agents cannot see lead activity or SMS status

### Impact on MRR
- **Blocker #3 (Twilio):** Prevents test/real SMS; blocks UA and feature validation
- **Blocker #2 (Onboarding):** Prevents ANY agent from completing signup
- **Blockers #1 & #4:** Reduce conversion rate after unblocking #2

---

## Part 2: Use Case Prioritization

### High-Priority Use Cases (Revenue-Critical)
1. **implement-twilio-sms-integration** ← YOU ARE HERE
   - Status: Implementation Complete, E2E Tests Not Defined
   - Why: Enables real SMS delivery; unblocks feature validation and paid tier testing
   - Acceptance: Real Twilio calls, error handling, status tracking, test verification

2. **fix-onboarding-500-error** (separate ticket)
   - Why: Agents can't get past signup → zero revenue possible
   - Blocks: All agent signups

3. **Create Landing Page + Marketing Copy** (design/copy task)
   - Why: Agents have nowhere to learn about LeadFlow
   - Timeline: Complete by day 20

---

## Part 3: Immediate Actions (Next 3 Days)

### Action 1: Verify & Complete Twilio Real SMS Integration
**Use Case:** `implement-twilio-sms-integration`

#### Specification
Replace the mock SMS implementation with real Twilio API calls.

**Current State:**
- `lib/twilio-sms.js` exists and implements real Twilio integration
- Uses `twilio` npm package + Twilio SDK
- Includes proper error handling, logging, and delivery status tracking
- Environment variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER_US`, `TWILIO_PHONE_NUMBER_CA`

**Implementation Details:**
1. **Core Function:** `sendSmsViatwilio(toNumber, messageContent, options)`
   - Validates phone number (E.164 format)
   - Selects from-number based on market (US/CA)
   - Truncates messages to SMS limits
   - Calls `twilioClient.messages.create()` with real API
   - Returns SID, status, duration, and metadata
   - Logs errors with classification (invalid number, rate limit, account issue, etc.)

2. **Database Logging:**
   - Logs to `conversations` table: `lead_id`, `message_body`, `twilio_sid`, `twilio_status`, `from_number`, `to_number`, `created_at`, `delivered_at`
   - Logs to `events` table for analytics: `event_type`, `event_data` (SID, status, error code, duration)

3. **Delivery Status Tracking:**
   - Supports Twilio status callbacks for real-time updates
   - `updateSmsStatus(statusData)` handles webhook callbacks
   - Tracks: `queued` → `sending` → `sent` → `delivered` (or `failed`)

4. **Error Handling:**
   - Classifies errors: invalid number, account suspended, rate limit, message too long
   - Returns retryable flag for caller retry logic
   - Does NOT retry internally — caller decides

5. **Analytics:**
   - `getSmsHistoryForLead(leadId)` — fetch SMS history for a lead
   - `getSmsAnalytics(agentId, startDate, endDate)` — delivery rate, failed count, etc.
   - Cost tracking via `price` and `priceUnit` from Twilio response

#### Acceptance Criteria
1. ✅ Real Twilio SDK integration: `lib/twilio-sms.js` calls `twilio.messages.create()`
2. ✅ Environment variables configured (see `.env.template` and `CLAUDE.md`)
3. ✅ SMS delivery includes: to number, from number, body, SID, status
4. ✅ Twilio SID and status stored in `conversations` table
5. ✅ Delivery callbacks handled by `updateSmsStatus()`
6. ✅ Error handling for: invalid number, rate limit, account issues, message too long
7. ✅ SMS cost tracked and logged for billing analytics
8. E2E Test: Send real SMS via webhook → Verify SMS received → Verify status in dashboard
9. E2E Test: Invalid phone number → Proper error returned
10. E2E Test: Message too long → Truncated + warning logged

#### Testing Strategy
1. **Unit Tests:** `test/twilio-sms-integration.test.js` (if exists, verify coverage)
2. **Integration Test:** Trigger FUB webhook → verify SMS sent via Twilio → check `conversations` table
3. **Manual Test:** Submit lead via FUB API → receive SMS on real phone number
4. **Dashboard Verification:** SMS appears in agent dashboard with correct status

---

### Action 2: Fix Onboarding 500 Error (Separate Ticket)
**Use Case:** `fix-onboarding-500-error`

- Agent signs up → enters FUB API key → endpoint `/api/agents/onboard` returns 500
- Root cause: agents table schema collision or missing field validation
- Fix: validate required fields, handle FUB auth gracefully
- Priority: CRITICAL (blocks all signups)

---

### Action 3: Create Landing Page (Design + Copy)
**Use Case:** (to be created)

- Copy: What is LeadFlow? How does it work? Why should agents care?
- Design: Simple, mobile-friendly, CTA to "Sign Up Free"
- Timeline: Day 20

---

## Part 4: Success Metrics

### SMS Integration (This Task)
- [ ] Twilio SDK integrated and tested
- [ ] Real SMS delivered to test phone number within 10 seconds
- [ ] SMS appears in agent dashboard with correct status
- [ ] Error handling tested (invalid number, rate limit)
- [ ] Cost tracking enabled for MRR reporting

### Overall Funnel (Next 44 Days)
1. **Day 20:** Landing page live + onboarding fixed → recruiting pilot agents
2. **Day 30:** First 3 paying agents with real SMS integration
3. **Day 45:** $1K MRR → $20K/yr ARR trajectory

---

## Part 5: Technical Integration Points

### Webhook Flow
```
FUB Lead → fub-webhook-listener.js → sendSmsViatwilio() → Twilio API → Agent's SMS App
                                    ↓
                            conversations table + events table
```

### Dashboard Integration
- SMS status displayed on agent dashboard
- Real-time updates via Twilio callbacks
- SMS history + analytics for each lead

### Billing Integration
- SMS cost (`price` and `priceUnit` from Twilio) logged per message
- Usage analytics for MRR calculation
- Cost per tier: Starter (100 SMS limit), Pro (unlimited)

---

## Dependencies & Assumptions

- **Twilio Account:** Active with funding + phone numbers configured
- **Supabase:** `conversations` and `events` tables accessible
- **FUB Integration:** Webhook listener receiving leads correctly
- **Environment Variables:** All Twilio credentials in `.env`

---

## Revision History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-03-06 | Initial PRD: Twilio SMS integration spec + conversion funnel analysis |
