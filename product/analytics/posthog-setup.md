# PostHog Analytics Setup
## AI Lead Response System for Real Estate Agents

---

## 1. Event Tracking Plan

### Core Events

| Event Name | Trigger | Properties | Priority |
|------------|---------|------------|----------|
| `lead_received` | New lead enters system | `source`, `lead_id`, `agent_id`, `timestamp` | Critical |
| `ai_response_sent` | AI sends initial response | `lead_id`, `response_time_ms`, `channel` | Critical |
| `lead_qualified` | Lead passes qualification criteria | `lead_id`, `score`, `criteria_met` | Critical |
| `appointment_booked` | Meeting scheduled | `lead_id`, `agent_id`, `booking_time` | Critical |
| `agent_login` | Agent accesses dashboard | `agent_id`, `plan_tier` | High |
| `subscription_created` | New paid signup | `plan`, `amount`, `billing_cycle` | Critical |
| `subscription_cancelled` | Churn event | `reason`, `lifetime_value`, `tenure_days` | Critical |
| `feature_used` | Any feature interaction | `feature_name`, `duration_ms` | Medium |

### Property Taxonomy

```javascript
// Standard properties for all events
{
  "distinct_id": "agent_123",           // PostHog user ID
  "timestamp": "2026-02-14T11:32:00Z",
  "$current_url": "https://app.leadresponse.ai/dashboard",
  "$browser": "Chrome",
  "$device_type": "desktop"
}

// Lead-specific properties
{
  "lead_id": "lead_abc789",
  "lead_source": "zillow|realtor_com|facebook|organic|referral",
  "lead_type": "buyer|seller|investor",
  "property_value_estimate": 450000,
  "location": "Austin, TX"
}

// Performance properties
{
  "response_time_ms": 8500,             // Target: < 30 seconds
  "ai_confidence_score": 0.94,
  "qualification_score": 78,            // 0-100
  "conversation_turns": 4
}
```

---

## 2. User Identification

### Identify Call Structure

```javascript
// When agent signs up or logs in
posthog.identify('agent_123', {
  // Core identity
  email: 'agent@example.com',
  name: 'Jane Smith',
  
  // Plan & billing
  plan_tier: 'professional',            // starter | professional | enterprise
  mrr: 997,
  signup_date: '2026-01-15',
  
  // Business context
  brokerage: 'Keller Williams Austin',
  team_size: 5,
  monthly_lead_volume: 150,
  
  // Segmentation
  acquisition_channel: 'facebook_ads',
  onboarding_completed: true
});
```

### Group Analytics (Account-Level)

```javascript
// For team/brokerage analytics
posthog.group('brokerage', 'kw_austin_001', {
  name: 'Keller Williams Austin',
  total_agents: 45,
  plan: 'enterprise',
  total_mrr: 15976
});
```

---

## 3. Funnel Configuration

### Primary Funnel: Lead → Qualified → Booked

**Funnel Steps:**

1. **Lead Received** (`lead_received`)
   - Entry point: Any lead entering system
   - Conversion target: 100% (baseline)

2. **AI Response Sent** (`ai_response_sent`)
   - Target conversion: 98%
   - Target time: < 30 seconds median

3. **Lead Qualified** (`lead_qualified`)
   - Target conversion: 35-45%
   - Qualified = score >= 60 + intent confirmed

4. **Appointment Booked** (`booking_created`)
   - Target conversion: 15-25% of leads
   - Target: 40-50% of qualified leads

### Secondary Funnels

**Onboarding Funnel:**
- `signup_started` → `account_created` → `integration_connected` → `first_lead_processed` → `first_booking`

**Retention Funnel:**
- `week_1_active` → `week_2_active` → `week_4_active` → `month_3_active`

---

## 4. Dashboard Configuration

### Executive Dashboard

| Insight | Type | Configuration |
|---------|------|---------------|
| Lead Volume Trend | Trend | `lead_received` daily/weekly |
| Response Time Distribution | Distribution | `ai_response_sent` → `response_time_ms` |
| Conversion Funnel | Funnel | Lead → Response → Qualified → Booked |
| MRR Growth | Trend | `subscription_created` - `subscription_cancelled` |
| Active Agents | Stickiness | Weekly active users |

### Agent Performance Dashboard

| Insight | Type | Filters |
|---------|------|---------|
| My Lead Pipeline | Funnel | `agent_id` = current user |
| Response Time Trends | Trend | By agent, daily avg |
| Booking Rate | Formula | `appointment_booked` / `lead_received` |
| Qualification Rate | Formula | `lead_qualified` / `lead_received` |

### Technical Health Dashboard

| Insight | Type | Alert Threshold |
|---------|------|-----------------|
| AI Response Time | Trend | > 30s avg = alert |
| Error Rate | Trend | > 2% = alert |
| Webhook Delivery Success | Trend | < 99% = alert |
| API Latency | Distribution | p95 > 500ms = alert |

---

## 5. Implementation Code

### JavaScript SDK Initialization

```javascript
import posthog from 'posthog-js';

posthog.init('phc_YOUR_PROJECT_API_KEY', {
  api_host: 'https://app.posthog.com',
  capture_pageview: true,
  persistence: 'localStorage',
  autocapture: false,  // Manual tracking for precision
  
  // Privacy-compliant settings
  mask_all_text: false,
  mask_all_element_attributes: false,
  session_recording: {
    maskAllInputs: true,
    maskInputOptions: { password: true, email: true }
  }
});
```

### Event Tracking Examples

```javascript
// Lead received
posthog.capture('lead_received', {
  lead_id: lead.id,
  source: lead.source,
  estimated_value: lead.property_value,
  location: lead.city
});

// AI response sent
posthog.capture('ai_response_sent', {
  lead_id: lead.id,
  response_time_ms: Date.now() - lead.received_at,
  channel: 'sms',
  message_length: response.length
});

// Lead qualified
posthog.capture('lead_qualified', {
  lead_id: lead.id,
  qualification_score: score,
  criteria: ['budget_confirmed', 'timeline_30_days', 'pre_approved']
});

// Booking created
posthog.capture('appointment_booked', {
  lead_id: lead.id,
  agent_id: agent.id,
  booking_datetime: slot.toISOString(),
  time_to_book_hours: hoursSinceLeadReceived
});
```

---

## 6. Alert Configuration

### Critical Alerts (Slack/PagerDuty)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Avg response time | > 45 seconds | Page on-call |
| Funnel drop (Response) | < 95% conversion | Alert in #alerts |
| Error rate spike | > 5% errors/5min | Page on-call |
| Zero leads (30min) | 0 leads during business hours | Alert #ops |

### Business Alerts (Email/Slack)

| Condition | Threshold | Audience |
|-----------|-----------|----------|
| Daily leads below target | < 80% of daily goal | Sales team |
| Conversion rate drop | < 20% for 3 days | Product team |
| Churn spike | > 3 cancellations/day | Leadership |
| MRR milestone | Every $5K increment | Leadership |

---

## 7. Privacy & Compliance

### Data Handling
- **PII Masking**: Email, phone, names auto-masked in session replays
- **Retention**: Event data 12 months, session replays 30 days
- **GDPR**: Right to deletion workflow documented
- **Opt-out**: Respect `ph_optout` cookie

### Excluded Properties
Never capture:
- Social Security Numbers
- Full credit card numbers
- Passwords
- Unmasked phone numbers in session replay

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Event ingestion latency | < 5 seconds | PostHog internal |
| Dashboard load time | < 3 seconds | User experience |
| Data freshness | Real-time | < 1 min delay |
| Tracking coverage | 100% critical events | Audit monthly |

---

## Next Steps

1. [ ] Create PostHog project
2. [ ] Install JS SDK in app
3. [ ] Implement `identify` on login
4. [ ] Deploy event tracking (Phase 1: critical events)
5. [ ] Build primary funnel insight
6. [ ] Configure alerts
7. [ ] Train team on dashboard usage
