# 📊 Tracking Plan — AI Lead Response System

**Version:** 1.0  
**Last Updated:** 2026-02-16  
**Owner:** Analytics Agent  
**Tools:** PostHog (primary), Supabase (warehouse)

---

## 🎯 Overview

This document defines all events, properties, and tracking implementations for the AI Lead Response System. All events should be sent to PostHog with user identification and relevant properties.

---

## 📋 Event Categories

| Category | Events | Purpose |
|----------|--------|---------|
| Lead Lifecycle | 8 events | Track from creation to conversion |
| AI Engine | 6 events | Monitor AI performance & confidence |
| SMS Channel | 7 events | Track message delivery & engagement |
| Dashboard | 9 events | Measure product usage |
| Billing/Plan | 5 events | Track subscription lifecycle |

---

## 🔄 Lead Lifecycle Events

### 1. `lead_received`
**Trigger:** Webhook receives new lead from any source
**Priority:** P0 - Required

```javascript
posthog.capture('lead_received', {
  // Lead Properties
  lead_id: 'lead_abc123',
  lead_source: 'zillow|realtor_com|facebook|direct_sms|website_form',
  lead_type: 'buyer|seller|refinance|unknown',
  
  // Attribution
  utm_source: 'google_ads',
  utm_medium: 'ppc',
  utm_campaign: 'spring_2026',
  
  // System
  agent_id: 'agent_xyz789',
  team_id: 'team_abc456',
  market: 'us-national|ca-ontario',
  timestamp: '2026-02-16T21:25:00Z'
})
```

### 2. `lead_qualified`
**Trigger:** AI qualification engine completes analysis
**Priority:** P0 - Required

```javascript
posthog.capture('lead_qualified', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // AI Qualification Results
  intent: 'buy|sell|rent|refinance|unknown',
  intent_confidence: 0.92,           // 0-1 scale
  budget_range: '300k-500k|500k-750k|750k-1m|1m+',
  timeline: 'immediate|1-3mo|3-6mo|6mo+',
  location_preference: 'Austin, TX',
  urgency_score: 8,                  // 1-10 scale
  
  // Qualification Outcome
  qualification_result: 'qualified|nurture|discard',
  qualification_reason: 'high_intent_budget_match|low_budget|no_contact_info|spam',
  
  // AI Metadata
  ai_model: 'claude-3-5-sonnet-20241022',
  processing_time_ms: 850            // Time to qualify
})
```

### 3. `response_generated`
**Trigger:** AI generates SMS response
**Priority:** P0 - Required

```javascript
posthog.capture('response_generated', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Response Content
  response_type: 'initial|followup|booking|handoff|nurture',
  template_used: 'initial_warm_v2',
  message_length_chars: 142,
  
  // AI Performance
  ai_confidence: 0.88,               // Overall confidence 0-1
  content_confidence: 0.91,          // Content quality score
  tone_match_score: 0.85,            // Tone appropriateness
  
  // Features Used
  includes_booking_link: true,
  includes_agent_name: true,
  personalized_elements: 3,          // Count of personalized tokens
  
  // Performance
  generation_time_ms: 420
})
```

### 4. `response_sent`
**Trigger:** SMS successfully sent via Twilio
**Priority:** P0 - Required

```javascript
posthog.capture('response_sent', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  message_id: 'msg_twilio_123',
  
  // Delivery Info
  channel: 'sms',
  provider: 'twilio',
  phone_number_e164: '+15551234567',
  
  // Content
  response_type: 'initial|followup|booking|handoff|nurture',
  ai_generated: true,
  
  // Timing (critical for response time metric)
  lead_received_at: '2026-02-16T21:25:00Z',
  response_sent_at: '2026-02-16T21:25:12Z',
  response_time_seconds: 12          // Derived metric
})
```

### 5. `response_delivered`
**Trigger:** Twilio webhook confirms delivery
**Priority:** P1 - Important

```javascript
posthog.capture('response_delivered', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  message_id: 'msg_twilio_123',
  
  // Delivery Status
  delivery_status: 'delivered|failed|undelivered',
  delivery_timestamp: '2026-02-16T21:25:15Z',
  
  // Failure Details (if applicable)
  failure_code: '30003',             // Twilio error code
  failure_reason: 'Unreachable destination handset'
})
```

### 6. `lead_replied`
**Trigger:** Lead sends inbound message
**Priority:** P0 - Required

```javascript
posthog.capture('lead_replied', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  message_id: 'msg_twilio_456',
  
  // Reply Content Analysis
  reply_type: 'question|positive|negative|opt_out|booking_request|general',
  reply_sentiment: 'positive|neutral|negative',
  reply_length_chars: 45,
  
  // Conversation State
  conversation_turn: 2,              // Message number in thread
  time_since_last_outbound_minutes: 45,
  
  // Opt-out Detection
  contains_opt_out: false,           // "stop", "unsubscribe", etc.
  opt_out_type: null                 // "stop", "cancel", "end"
})
```

### 7. `appointment_booked`
**Trigger:** Cal.com confirms booking
**Priority:** P0 - Required (conversion event)

```javascript
posthog.capture('appointment_booked', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  booking_id: 'booking_cal_789',
  
  // Booking Details
  booking_type: 'call|tour|consultation',
  appointment_date: '2026-02-18',
  appointment_time: '14:00',
  appointment_timezone: 'America/New_York',
  
  // Conversion Attribution
  lead_source: 'zillow',
  days_to_booking: 2,                // Since lead received
  messages_before_booking: 4,        // Total conversation turns
  ai_messages_before_booking: 3,     // AI-sent messages
  
  // Funnel Position
  funnel_stage: 'appointment'
})
```

### 8. `lead_status_changed`
**Trigger:** Lead status updated in FUB or system
**Priority:** P1 - Important

```javascript
posthog.capture('lead_status_changed', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Status Change
  previous_status: 'new',
  new_status: 'qualified|nurturing|appointment|closed|dnc',
  status_change_reason: 'ai_qualified|agent_updated|auto_nurture|opted_out',
  
  // Automated vs Manual
  changed_by: 'ai_system|agent_manual|automation'
})
```

### 9. `opt_out_received`
**Trigger:** Lead sends STOP or opt-out keyword
**Priority:** P0 - Required (compliance)

```javascript
posthog.capture('opt_out_received', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Opt-out Details
  opt_out_keyword: 'STOP|UNSUBSCRIBE|CANCEL|END|QUIT',
  opt_out_channel: 'sms',
  opt_out_timestamp: '2026-02-16T21:30:00Z',
  
  // Context
  messages_before_opt_out: 3,
  days_since_first_contact: 2,
  last_message_type: 'followup|initial|nurture',
  
  // Compliance
  dnc_list_added: true,
  dnc_timestamp: '2026-02-16T21:30:05Z'
})
```

---

## 🤖 AI Engine Events

### 10. `ai_qualification_started`
**Trigger:** AI begins lead qualification

```javascript
posthog.capture('ai_qualification_started', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  model: 'claude-3-5-sonnet-20241022',
  prompt_tokens: 450,
  input_length_chars: 250
})
```

### 11. `ai_qualification_completed`
**Trigger:** AI qualification finishes

```javascript
posthog.capture('ai_qualification_completed', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Performance
  processing_time_ms: 850,
  prompt_tokens: 450,
  completion_tokens: 180,
  total_tokens: 630,
  
  // Output
  qualification_result: 'qualified|nurture|discard',
  confidence_score: 0.92
})
```

### 12. `ai_response_generation_started`
**Trigger:** AI begins SMS response generation

```javascript
posthog.capture('ai_response_generation_started', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  response_type: 'initial|followup|booking|handoff',
  template_id: 'initial_warm_v2',
  model: 'claude-3-5-sonnet-20241022'
})
```

### 13. `ai_response_generation_completed`
**Trigger:** AI finishes response generation

```javascript
posthog.capture('ai_response_generation_completed', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Performance
  generation_time_ms: 420,
  prompt_tokens: 320,
  completion_tokens: 95,
  total_tokens: 415,
  
  // Quality
  confidence_score: 0.88,
  response_length_chars: 142,
  
  // Cost (for tracking AI spend)
  estimated_cost_usd: 0.00623
})
```

### 14. `ai_low_confidence_triggered`
**Trigger:** AI confidence below threshold

```javascript
posthog.capture('ai_low_confidence_triggered', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Confidence Details
  confidence_score: 0.42,
  threshold: 0.70,
  confidence_type: 'overall|content|tone|intent',
  
  // Action Taken
  action: 'human_handoff|retry|send_anyway|skip',
  human_notified: true
})
```

### 15. `ai_error_occurred`
**Trigger:** AI processing error

```javascript
posthog.capture('ai_error_occurred', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Error Details
  error_type: 'timeout|rate_limit|content_policy|api_error|parsing_error',
  error_code: ' Anthropic API error',
  error_message: 'Request timeout after 30s',
  
  // Context
  operation: 'qualification|response_generation',
  model: 'claude-3-5-sonnet-20241022',
  retry_count: 1
})
```

---

## 💬 SMS Channel Events

### 16. `sms_sent`
**Trigger:** SMS sent via Twilio

```javascript
posthog.capture('sms_sent', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  message_id: 'msg_twilio_123',
  
  // Message Details
  direction: 'outbound',
  ai_generated: true,
  segment_count: 1,                  // Twilio segments (1-3 for pricing)
  character_count: 142,
  contains_unicode: false,
  
  // Provider
  provider: 'twilio',
  from_number: '+15559876543',
  to_number: '+15551234567',
  
  // Cost
  estimated_cost_usd: 0.0075         // Segment cost
})
```

### 17. `sms_delivered`
**Trigger:** Delivery confirmation from Twilio

```javascript
posthog.capture('sms_delivered', {
  message_id: 'msg_twilio_123',
  lead_id: 'lead_abc123',
  
  // Delivery Metrics
  delivery_time_seconds: 3,          // Time from sent to delivered
  delivery_status: 'delivered',
  
  // Network
  carrier: 'Verizon',
  network_code: '310004'
})
```

### 18. `sms_failed`
**Trigger:** SMS delivery failed

```javascript
posthog.capture('sms_failed', {
  message_id: 'msg_twilio_123',
  lead_id: 'lead_abc123',
  
  // Failure Details
  failure_code: '30003',
  failure_reason: 'Unreachable destination handset',
  failure_stage: 'sent|delivered',
  
  // Retry Info
  retry_attempted: true,
  retry_scheduled: false
})
```

### 19. `sms_inbound_received`
**Trigger:** Lead sends SMS reply

```javascript
posthog.capture('sms_inbound_received', {
  message_id: 'msg_twilio_456',
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Content
  message_length_chars: 45,
  contains_keywords: ['price', 'available', 'when'],
  
  // Timing
  time_since_last_outbound_minutes: 45
})
```

### 20. `sms_template_used`
**Trigger:** SMS uses a template

```javascript
posthog.capture('sms_template_used', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Template Info
  template_id: 'initial_warm_v2',
  template_category: 'initial|followup|booking|handoff|nurture',
  template_variant: 'A|B|C',         // For A/B testing
  
  // Personalization
  personalization_tokens_used: ['name', 'location', 'agent_name'],
  ai_customized: true                // AI modified base template
})
```

### 21. `sms_rate_limit_hit`
**Trigger:** SMS rate limit exceeded

```javascript
posthog.capture('sms_rate_limit_hit', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Rate Limit Info
  limit_type: 'per_number|per_account',
  messages_in_window: 15,
  window_minutes: 60,
  retry_after_seconds: 120
})
```

### 22. `sms_conversation_closed`
**Trigger:** Conversation marked complete

```javascript
posthog.capture('sms_conversation_closed', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Outcome
  close_reason: 'booked|opted_out|agent_took_over|no_response|spam',
  
  // Conversation Metrics
  total_messages: 8,
  duration_hours: 48,
  ai_messages: 5,
  lead_messages: 3,
  outcome: 'appointment_booked'
})
```

---

## 📱 Dashboard Events

### 23. `dashboard_page_view`
**Trigger:** Agent views dashboard page

```javascript
posthog.capture('$pageview', {
  // Standard PostHog pageview
  $current_url: '/dashboard/leads',
  $pathname: '/dashboard/leads',
  
  // Custom Properties
  agent_id: 'agent_xyz789',
  team_id: 'team_abc456',
  plan_tier: 'starter|growth|pro',
  
  // Page Context
  page_name: 'lead_feed|analytics|settings|conversations'
})
```

### 24. `dashboard_lead_viewed`
**Trigger:** Agent clicks to view lead details

```javascript
posthog.capture('dashboard_lead_viewed', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Lead Context
  lead_status: 'qualified',
  lead_source: 'zillow',
  hours_since_received: 2,
  
  // View Source
  view_source: 'lead_feed|notification|search|direct_link'
})
```

### 25. `dashboard_message_sent`
**Trigger:** Agent sends manual message

```javascript
posthog.capture('dashboard_message_sent', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Message Details
  message_type: 'manual|template',
  ai_assisted: true,                 // AI suggested content
  character_count: 85,
  
  // Timing
  response_time_minutes: 30          // Agent response time
})
```

### 26. `dashboard_lead_status_updated`
**Trigger:** Agent manually updates lead status

```javascript
posthog.capture('dashboard_lead_status_updated', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Status Change
  previous_status: 'nurturing',
  new_status: 'appointment',
  update_source: 'manual|bulk_action',
  
  // AI Context
  ai_suggested_status: 'appointment',
  agent_overrode_ai: false
})
```

### 27. `dashboard_filter_applied`
**Trigger:** Agent applies filters to lead feed

```javascript
posthog.capture('dashboard_filter_applied', {
  agent_id: 'agent_xyz789',
  
  // Filter Details
  filter_type: 'status|source|date_range|assigned_to',
  filter_values: ['qualified', 'new'],
  results_count: 23
})
```

### 28. `dashboard_search_performed`
**Trigger:** Agent searches leads

```javascript
posthog.capture('dashboard_search_performed', {
  agent_id: 'agent_xyz789',
  
  // Search Details
  search_query: 'john smith',
  search_type: 'name|phone|email|address',
  results_count: 3,
  has_results: true
})
```

### 29. `dashboard_ai_suggestion_accepted`
**Trigger:** Agent accepts AI-suggested response

```javascript
posthog.capture('dashboard_ai_suggestion_accepted', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Suggestion Details
  suggestion_type: 'response|status|followup_date',
  ai_confidence: 0.89,
  time_to_accept_seconds: 12
})
```

### 30. `dashboard_ai_suggestion_rejected`
**Trigger:** Agent rejects AI suggestion

```javascript
posthog.capture('dashboard_ai_suggestion_rejected', {
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Rejection Details
  suggestion_type: 'response|status|followup_date',
  ai_confidence: 0.72,
  rejection_reason: 'tone|inaccurate|too_long|preferred_own'
})
```

### 31. `dashboard_exported_data`
**Trigger:** Agent exports leads/analytics

```javascript
posthog.capture('dashboard_exported_data', {
  agent_id: 'agent_xyz789',
  
  // Export Details
  export_type: 'leads|conversations|analytics',
  export_format: 'csv|xlsx|pdf',
  date_range_days: 30,
  records_count: 150
})
```

---

## 💳 Billing/Plan Events

### 32. `subscription_created`
**Trigger:** New agent signs up

```javascript
posthog.capture('subscription_created', {
  agent_id: 'agent_xyz789',
  
  // Plan Details
  plan_tier: 'starter|growth|pro',
  plan_price_monthly: 49,
  billing_cycle: 'monthly|annual',
  trial_days: 14,
  
  // Attribution
  signup_source: 'landing_page|referral|ad',
  referrer_agent_id: null
})
```

### 33. `subscription_upgraded`
**Trigger:** Agent upgrades plan

```javascript
posthog.capture('subscription_upgraded', {
  agent_id: 'agent_xyz789',
  
  // Upgrade Details
  previous_plan: 'starter',
  new_plan: 'growth',
  previous_price: 49,
  new_price: 99,
  
  // Timing
  days_since_signup: 45,
  upgrade_reason: 'lead_volume|features|team_size'
})
```

### 34. `subscription_downgraded`
**Trigger:** Agent downgrades plan

```javascript
posthog.capture('subscription_downgraded', {
  agent_id: 'agent_xyz789',
  
  // Downgrade Details
  previous_plan: 'growth',
  new_plan: 'starter',
  downgrade_reason: 'cost|usage_low|features_not_needed'
})
```

### 35. `subscription_cancelled`
**Trigger:** Agent cancels subscription

```javascript
posthog.capture('subscription_cancelled', {
  agent_id: 'agent_xyz789',
  
  // Cancellation Details
  cancel_reason: 'too_expensive|not_using|switched_competitor|business_closed|missing_features',
  cancel_feedback: 'Going with competitor X',
  
  // Usage at Cancel
  days_active: 120,
  total_leads_processed: 450,
  mrr_lost: 99
})
```

### 36. `payment_failed`
**Trigger:** Payment processing fails

```javascript
posthog.capture('payment_failed', {
  agent_id: 'agent_xyz789',
  
  // Payment Details
  amount_usd: 99,
  failure_code: 'card_declined|insufficient_funds|expired_card',
  attempt_number: 2,
  
  // Recovery
  retry_scheduled: true,
  grace_period_days: 3
})
```

---

## 🔧 Technical Events

### 37. `webhook_received`
**Trigger:** External webhook hits our system

```javascript
posthog.capture('webhook_received', {
  // Source
  webhook_source: 'fub|zillow|realtor_com',
  webhook_event: 'lead.created',
  
  // Performance
  processing_time_ms: 45,
  payload_size_bytes: 2400,
  
  // Result
  processed_successfully: true,
  lead_created: true
})
```

### 38. `integration_sync_completed`
**Trigger:** CRM sync finishes

```javascript
posthog.capture('integration_sync_completed', {
  agent_id: 'agent_xyz789',
  integration: 'fub|cal_com',
  
  // Sync Details
  sync_direction: 'inbound|outbound|bidirectional',
  records_synced: 25,
  sync_duration_seconds: 8,
  errors_count: 0
})
```

### 39. `error_logged`
**Trigger:** System error occurs

```javascript
posthog.capture('error_logged', {
  // Error Details
  error_type: 'api_error|database_error|timeout',
  error_code: '500',
  error_message: 'Connection timeout',
  
  // Context
  component: 'ai_engine|sms_service|webhook_handler',
  lead_id: 'lead_abc123',
  agent_id: 'agent_xyz789',
  
  // Impact
  user_impact: 'high|medium|low',
  auto_resolved: false
})
```

---

## 👤 User Identification

### Identify Agents on Login

```javascript
posthog.identify('agent_xyz789', {
  // Profile
  email: 'agent@example.com',
  name: 'John Smith',
  phone: '+15551234567',
  
  // Plan
  plan_tier: 'growth',
  plan_price: 99,
  billing_cycle: 'monthly',
  
  // Team
  team_id: 'team_abc456',
  team_size: 5,
  is_team_admin: true,
  
  // Market
  market: 'us-national',
  timezone: 'America/New_York',
  
  // Usage
  signup_date: '2026-01-15',
  leads_this_month: 127,
  
  // CRM
  fub_connected: true,
  cal_com_connected: true
})
```

### Group Analytics (Teams)

```javascript
posthog.group('team', 'team_abc456', {
  name: 'Smith Realty Group',
  plan_tier: 'pro',
  agent_count: 5,
  total_leads_month: 450,
  mrr: 495
})
```

---

## 📊 Super Properties

Set these on every event automatically:

```javascript
posthog.register({
  // App Version
  app_version: '1.2.3',
  environment: 'production|staging|development',
  
  // User Context
  agent_id: 'agent_xyz789',
  team_id: 'team_abc456',
  plan_tier: 'growth',
  
  // Feature Flags
  $feature_flag_variant: 'control|treatment'
})
```

---

## 🎯 Implementation Priority

### Phase 1 (MVP - Week 1)
| Priority | Events | Notes |
|----------|--------|-------|
| P0 | `lead_received` | Core funnel start |
| P0 | `lead_qualified` | AI performance |
| P0 | `response_sent` | Response time metric |
| P0 | `response_delivered` | Delivery rate |
| P0 | `lead_replied` | Engagement |
| P0 | `appointment_booked` | Conversion |
| P0 | `opt_out_received` | Compliance |

### Phase 2 (Week 2)
| Priority | Events | Notes |
|----------|--------|-------|
| P1 | All dashboard events | Product usage |
| P1 | `ai_*` events | AI optimization |
| P1 | Billing events | Revenue tracking |

### Phase 3 (Scale)
| Priority | Events | Notes |
|----------|--------|-------|
| P2 | Technical events | Debugging |
| P2 | Cohort retention | Advanced analytics |

---

## 🔌 PostHog Configuration

### Project Setup
```javascript
// Initialize PostHog
import posthog from 'posthog-js'

posthog.init('phc_YOUR_PROJECT_API_KEY', {
  api_host: 'https://us.i.posthog.com',
  
  // Privacy
  persistence: 'localStorage',
  disable_session_recording: false,
  mask_all_text: false,              // Don't mask for B2B
  mask_all_element_attributes: false,
  
  // Performance
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: true,
  
  // Batch events
  loaded: (posthog) => {
    posthog.opt_in_capturing()
  }
})
```

### Server-Side (Node.js)
```javascript
import { PostHog } from 'posthog-node'

const client = new PostHog(
  'phc_YOUR_PROJECT_API_KEY',
  { host: 'https://us.i.posthog.com' }
)

// Capture server-side event
client.capture({
  distinctId: 'agent_xyz789',
  event: 'lead_received',
  properties: {
    lead_id: 'lead_abc123',
    source: 'zillow'
  }
})
```

---

## 📈 Derived Metrics from Events

| Metric | Calculation |
|--------|-------------|
| **Response Time** | AVG(`response_sent.response_time_seconds`) |
| **Lead Capture Rate** | COUNT(`response_sent`) / COUNT(`lead_received`) × 100 |
| **Delivery Rate** | COUNT(`response_delivered`) / COUNT(`response_sent`) × 100 |
| **Opt-out Rate** | COUNT(`opt_out_received`) / COUNT(`lead_received`) × 100 |
| **Booking Conversion** | COUNT(`appointment_booked`) / COUNT(`lead_received`) × 100 |
| **AI Confidence (avg)** | AVG(`ai_qualification_completed.confidence_score`) |

---

## 📝 Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-16 | 1.0 | Initial tracking plan created |

---

**Questions?** Contact @AnalyticsAgent or check PostHog project settings.
