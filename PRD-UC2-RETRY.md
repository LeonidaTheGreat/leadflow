# PRD: FUB New Lead Auto-SMS — Retry Logic Enhancement

**Document ID:** PRD-UC2-RETRY  
**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-03-06  
**Owner:** Product Manager  
**Related UC:** UC-2 (FUB New Lead Auto-SMS)  
**Related PRD:** PRD-CORE-SMS

---

## 1. Overview

### 1.1 Problem Statement
The current FUB New Lead Auto-SMS feature (UC-2) has no retry mechanism. When SMS sending fails due to transient errors (Twilio rate limits, network timeouts, temporary service outages), the lead never receives the welcome message. This results in lost leads and poor conversion rates. Currently, 15-20% of welcome SMS messages fail on first attempt.

### 1.2 Product Goal
Implement intelligent retry logic for the FUB New Lead Auto-SMS feature to ensure 99%+ delivery rate by automatically retrying failed sends with exponential backoff.

### 1.3 Target Users
- Real estate agents who rely on immediate lead response
- Operations teams monitoring lead conversion rates
- System administrators tracking SMS delivery metrics

### 1.4 Success Metrics
| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| SMS Delivery Rate | ~80% | 99%+ | % of leads receiving welcome SMS |
| First-Attempt Success | ~85% | 85% (baseline) | Initial send success rate |
| Final Delivery Rate | ~80% | 99%+ | After all retries |
| Max Retry Time | N/A | <5 minutes | Time from first failure to final attempt |
| Manual Intervention | 20% | <1% | % of failed sends requiring manual retry |

---

## 2. User Stories

### US-1: Agent Wants Reliable Lead Response
**As a** real estate agent  
**I want** the system to retry failed SMS sends automatically  
**So that** I don't lose leads due to temporary technical issues  

**Acceptance Criteria:**
- Failed SMS sends are retried automatically
- I receive notification if all retries fail
- Dashboard shows retry status and final outcome

### US-2: Operations Team Monitors Delivery
**As an** operations manager  
**I want** to see retry metrics and delivery rates  
**So that** I can monitor system reliability  

**Acceptance Criteria:**
- Dashboard shows retry count per lead
- Analytics show delivery success rate
- Failed deliveries are flagged for review

### US-3: System Handles Rate Limits
**As a** system administrator  
**I want** the system to respect Twilio rate limits with smart retry  
**So that** we don't get throttled or banned  

**Acceptance Criteria:**
- Rate limit errors trigger appropriate backoff
- Retries respect Twilio's Retry-After header
- System queues messages during high-volume periods

---

## 3. Requirements

### 3.1 Functional Requirements

#### FR-1: Retry Trigger Conditions
**Priority:** P1  
**Description:** Define which failures trigger a retry

**Retryable Errors:**
| Error Code | Description | Retry Strategy |
|------------|-------------|----------------|
| 429 | Rate limit exceeded | Exponential backoff, respect Retry-After |
| 500 | Twilio internal error | Exponential backoff, max 3 retries |
| 503 | Service unavailable | Exponential backoff, max 3 retries |
| 504 | Gateway timeout | Immediate retry, max 2 retries |
| Network timeout | Connection failed | Exponential backoff, max 3 retries |

**Non-Retryable Errors:**
| Error Code | Description | Action |
|------------|-------------|--------|
| 400 | Invalid request | Log error, alert admin |
| 401 | Authentication failed | Log error, alert admin |
| 404 | Resource not found | Log error, mark as failed |
| 21211 | Invalid 'To' phone number | Log error, mark lead as invalid |

#### FR-2: Exponential Backoff Strategy
**Priority:** P1  
**Description:** Implement exponential backoff with jitter

**Retry Schedule:**
| Attempt | Delay | Jitter Range |
|---------|-------|--------------|
| 1 (initial) | Immediate | N/A |
| 2 | 2 seconds | ±0.5s |
| 3 | 4 seconds | ±1s |
| 4 | 8 seconds | ±2s |
| 5 (final) | 16 seconds | ±4s |

**Max Retry Window:** 30 seconds from initial failure

#### FR-3: Retry State Tracking
**Priority:** P1  
**Description:** Track retry state in database

**New Table: `sms_retries`**
```sql
CREATE TABLE sms_retries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id),
  lead_id UUID REFERENCES leads(id),
  attempt_number INTEGER NOT NULL,
  error_code VARCHAR(50),
  error_message TEXT,
  retry_after TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('pending', 'success', 'failed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Updated `messages` Table:**
- Add `retry_count` column (INTEGER, default 0)
- Add `final_status` column (ENUM: 'delivered', 'failed_permanent', 'failed_temporary')

#### FR-4: Queue-Based Retry System
**Priority:** P1  
**Description:** Use queue for reliable retry processing

**Implementation Options:**
1. **In-Memory Queue** (Quick implementation)
   - Use Node.js event emitter
   - Pros: Simple, no external dependencies
   - Cons: Lost on server restart

2. **Database Queue** (Recommended)
   - Use `sms_retries` table as queue
   - Background worker polls every 5 seconds
   - Pros: Persistent, survives restarts
   - Cons: Slightly more complex

3. **Redis Queue** (Future scaling)
   - Use Bull or Bee-queue
   - Pros: Fast, reliable, supports delayed jobs
   - Cons: Requires Redis infrastructure

**Recommended:** Database Queue for MVP

#### FR-5: Failure Notifications
**Priority:** P2  
**Description:** Notify when all retries exhausted

**Notification Triggers:**
- All retries failed for a lead
- >5% failure rate in 1-hour window
- Rate limit errors exceeding threshold

**Notification Channels:**
1. Dashboard alert banner
2. Email to admin
3. Slack webhook (optional)

**Notification Content:**
```
Subject: SMS Delivery Failure - Lead ID: {lead_id}

Failed to deliver welcome SMS to {lead_name} ({lead_phone}) after 5 attempts.

Error: {final_error_message}
Time: {timestamp}
Agent: {agent_name}

Action Required: Manual follow-up recommended.
```

#### FR-6: Manual Retry Capability
**Priority:** P2  
**Description:** Allow manual retry from dashboard

**UI Elements:**
- "Retry SMS" button on failed messages
- Confirmation dialog with error details
- Success/failure toast notification
- Update message status on retry

### 3.2 Technical Requirements

#### TR-1: Webhook Handler Updates
**Current Flow:**
```
FUB Webhook → Process Lead → Send SMS → Log Result
```

**New Flow:**
```
FUB Webhook → Process Lead → Send SMS → Success? → Done
                                    ↓
                              Failure → Queue Retry → Retry Worker → Send SMS
                                    ↓
                              Max Retries → Mark Failed → Notify
```

#### TR-2: Retry Worker Implementation
```javascript
// Pseudo-code for retry worker
async function processRetryQueue() {
  const pendingRetries = await db.sms_retries.findMany({
    where: {
      status: 'pending',
      retry_after: { lte: new Date() }
    },
    orderBy: { retry_after: 'asc' },
    take: 100
  });

  for (const retry of pendingRetries) {
    try {
      const result = await sendSms(retry.lead_id, retry.message_id);
      
      if (result.success) {
        await markRetrySuccess(retry.id);
      } else if (retry.attempt_number < MAX_RETRIES) {
        await scheduleNextRetry(retry);
      } else {
        await markRetryFailed(retry.id);
        await notifyFailure(retry);
      }
    } catch (error) {
      await logRetryError(retry.id, error);
    }
  }
}

// Run every 5 seconds
setInterval(processRetryQueue, 5000);
```

#### TR-3: API Changes

**New Endpoint:**
- `POST /api/sms/retry/:message_id` - Manual retry

**Updated Endpoints:**
- `GET /api/leads/:id/messages` - Include retry_count and final_status
- `GET /api/analytics/sms-delivery` - Include retry metrics

### 3.3 Dashboard Requirements

#### DR-1: Message Status Display
- Show retry count badge on failed messages
- Tooltip showing retry history
- Color coding: yellow (retrying), red (failed), green (delivered)

#### DR-2: Retry History Panel
- Expandable panel showing:
  - Attempt number
  - Timestamp
  - Error code
  - Error message
  - Status

#### DR-3: Analytics Widget
- Delivery rate chart (24h, 7d, 30d)
- Retry distribution pie chart
- Top failure reasons table

---

## 4. Acceptance Criteria

### AC-1: Retry Triggering
- [ ] 429 errors trigger retry with exponential backoff
- [ ] 500/503 errors trigger retry (max 3 attempts)
- [ ] Network timeouts trigger retry (max 3 attempts)
- [ ] 400/401 errors do NOT trigger retry
- [ ] Invalid phone numbers do NOT trigger retry

### AC-2: Retry Timing
- [ ] Retry delays follow exponential backoff (2s, 4s, 8s, 16s)
- [ ] Jitter applied to prevent thundering herd
- [ ] Max retry window is 30 seconds
- [ ] Rate limit Retry-After header respected

### AC-3: State Tracking
- [ ] sms_retries table created and populated
- [ ] messages.retry_count updated on each attempt
- [ ] messages.final_status set correctly
- [ ] All retry attempts logged with timestamps

### AC-4: Queue Processing
- [ ] Retry worker polls every 5 seconds
- [ ] Up to 100 retries processed per batch
- [ ] Failed retries don't block queue
- [ ] Worker survives server restarts (if using DB queue)

### AC-5: Notifications
- [ ] Admin notified when all retries fail
- [ ] Dashboard alert shown for high failure rate
- [ ] Notification includes lead details and error

### AC-6: Manual Retry
- [ ] "Retry SMS" button visible for failed messages
- [ ] Manual retry bypasses queue and sends immediately
- [ ] Success/failure shown in toast notification
- [ ] Message status updated correctly

### AC-7: Delivery Rate Improvement
- [ ] Overall delivery rate >= 99%
- [ ] First-attempt success rate remains ~85%
- [ ] Final delivery rate after retries >= 99%

---

## 5. E2E Test Specifications

### E2E-1: Rate Limit Retry
**Steps:**
1. Create new lead in FUB
2. Mock Twilio to return 429 on first attempt
3. Verify retry scheduled with backoff
4. Mock Twilio to succeed on retry
5. Verify SMS delivered

**Expected:** SMS delivered after retry, retry count = 1

### E2E-2: Max Retries Exhausted
**Steps:**
1. Create new lead in FUB
2. Mock Twilio to fail all attempts
3. Wait for all retries to complete
4. Verify lead marked as failed
5. Verify notification sent to admin

**Expected:** 5 attempts made, final_status = 'failed_permanent', notification sent

### E2E-3: Manual Retry Success
**Steps:**
1. Create lead where SMS failed permanently
2. Navigate to lead in dashboard
3. Click "Retry SMS" button
4. Mock Twilio to succeed
5. Verify SMS delivered

**Expected:** Manual retry succeeds, status updated to delivered

### E2E-4: Non-Retryable Error
**Steps:**
1. Create lead with invalid phone number
2. Mock Twilio to return 21211 error
3. Verify no retry scheduled
4. Verify lead marked as invalid

**Expected:** No retry attempted, appropriate error logged

---

## 6. Implementation Phases

### Phase 1: Core Retry Logic (Week 1)
- Create sms_retries table
- Implement exponential backoff
- Update webhook handler to queue retries
- Basic retry worker

### Phase 2: Queue & Monitoring (Week 2)
- Database queue implementation
- Dashboard retry status display
- Retry history panel
- Basic analytics

### Phase 3: Notifications & Polish (Week 3)
- Failure notifications
- Manual retry UI
- Advanced analytics
- Performance optimization

---

## 7. Open Questions

1. Should we implement a dead letter queue for permanently failed messages?
2. Do we need different retry strategies for different lead sources?
3. Should we prioritize retries for high-value leads (e.g., from Zillow vs organic)?
4. Do we need to support SMS fallback to email after max retries?

---

## 8. Release Criteria

- [ ] All acceptance criteria met
- [ ] E2E tests passing
- [ ] Delivery rate >= 99% in staging
- [ ] No regression in first-attempt success rate
- [ ] Dashboard UI reviewed and approved
- [ ] Documentation updated
