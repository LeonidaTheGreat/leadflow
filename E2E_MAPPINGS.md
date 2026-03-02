<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# E2E Test Mappings

> Generated: 2026-03-02T19:06:18.815Z | Source: `e2e_test_specs` + `use_cases` tables

**Coverage: 12 specs | 5 pass | 0 fail | 7 not run**

| UC | Test Name | File | Last Run | Result |
|----|-----------|------|----------|--------|
| UC-1 | UC-1: Lead-Initiated SMS Flow | tests/e2e/uc-1-inbound-sms.test.ts | - | pass |
| UC-10 | UC-10: Billing Portal Access | tests/e2e/uc-10-billing-portal.test.ts | - | not_run |
| UC-11 | UC-11: Subscription Lifecycle | tests/e2e/uc-11-subscription-lifecycle.test.ts | - | not_run |
| UC-12 | UC-12: MRR Reporting | tests/e2e/uc-12-mrr-reporting.test.ts | - | not_run |
| UC-2 | UC-2: FUB New Lead Auto-Response | tests/e2e/uc-2-fub-new-lead.test.ts | - | not_run |
| UC-3 | UC-3: FUB Status Change SMS | tests/e2e/uc-3-fub-status-change.test.ts | - | not_run |
| UC-4 | UC-4: Agent Assignment Intro SMS | tests/e2e/uc-4-agent-assignment.test.ts | - | not_run |
| UC-5 | UC-5: Opt-Out Handling | tests/e2e/uc-5-opt-out.test.ts | - | pass |
| UC-6 | UC-6: Cal.com Booking Confirmation | tests/e2e/uc-6-cal-booking.test.ts | - | pass |
| UC-7 | UC-7: Dashboard Manual SMS | tests/e2e/uc-7-dashboard-sms.test.ts | - | pass |
| UC-8 | UC-8: Follow-up Sequences | tests/e2e/uc-8-followup-sequences.test.ts | - | pass |
| UC-9 | UC-9: Customer Sign-Up Flow | tests/e2e/uc-9-customer-signup.test.ts | - | not_run |

## UC-1 — Lead-Initiated SMS

### UC-1: Lead-Initiated SMS Flow

- **File:** `tests/e2e/uc-1-inbound-sms.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/webhook/twilio"
  },
  {
    "type": "database",
    "query": "phone = +12015559999",
    "table": "leads",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "direction = 'inbound'",
    "table": "messages",
    "expect": "exists"
  },
  {
    "type": "ai",
    "check": "response.includes('Austin') || response.includes('house')",
    "expect": true
  },
  {
    "type": "database",
    "query": "direction = 'outbound' AND ai_generated = true",
    "table": "messages",
    "expect": "exists"
  },
  {
    "type": "response",
    "expect": true,
    "contains": "<Response><Message>"
  }
]
```


## UC-10 — Billing Portal

### UC-10: Billing Portal Access

- **File:** `tests/e2e/uc-10-billing-portal.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "auth",
    "action": "login as customer",
    "expect": "success"
  },
  {
    "type": "ui",
    "action": "navigate to /settings/billing",
    "expect": "page loads"
  },
  {
    "type": "ui",
    "check": "plan displays as 'Pro - $149/month'",
    "expect": true
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/stripe/portal-session"
  },
  {
    "type": "response",
    "expect": true,
    "contains": "billing.stripe.com"
  },
  {
    "type": "stripe_portal",
    "check": "logo is LeadFlow logo",
    "expect": true
  },
  {
    "type": "stripe_portal",
    "check": "payment methods section visible",
    "expect": true
  },
  {
    "type": "stripe_portal",
    "action": "add new card",
    "expect": "success"
  },
  {
    "type": "webhook",
    "event": "payment_method.attached",
    "expect": "received"
  }
]
```


## UC-11 — Subscription Lifecycle

### UC-11: Subscription Lifecycle

- **File:** `tests/e2e/uc-11-subscription-lifecycle.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "webhook",
    "event": "invoice.paid",
    "expect": "received"
  },
  {
    "type": "database",
    "query": "current_period_end > NOW()",
    "table": "customers",
    "expect": "extended"
  },
  {
    "type": "webhook",
    "event": "invoice.payment_failed",
    "expect": "received"
  },
  {
    "type": "database",
    "query": "status = 'past_due'",
    "table": "customers",
    "expect": "exists"
  },
  {
    "type": "email",
    "expect": "sent",
    "subject_contains": "Payment Failed"
  },
  {
    "type": "database",
    "query": "status = 'canceled'",
    "table": "customers",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "data_retention_until > NOW()",
    "table": "customers",
    "expect": "exists"
  }
]
```


## UC-12 — MRR Reporting

### UC-12: MRR Reporting

- **File:** `tests/e2e/uc-12-mrr-reporting.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /api/billing/metrics"
  },
  {
    "path": "mrr",
    "type": "response",
    "equals": 59700
  },
  {
    "path": "active_customers",
    "type": "response",
    "equals": 4
  },
  {
    "path": "churn_rate",
    "type": "response",
    "equals": 20
  },
  {
    "type": "ui",
    "check": "MRR displays as '$597'",
    "expect": true
  },
  {
    "type": "api",
    "expect": true,
    "endpoint": "GET /api/billing/metrics?export=csv",
    "content_type": "text/csv"
  }
]
```


## UC-2 — FUB New Lead Auto-SMS

### UC-2: FUB New Lead Auto-Response

- **File:** `tests/e2e/uc-2-fub-new-lead.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "payload": "peopleCreated",
    "endpoint": "POST /api/webhook/fub"
  },
  {
    "type": "database",
    "query": "fub_id IS NOT NULL",
    "table": "leads",
    "expect": "exists"
  },
  {
    "type": "database",
    "table": "qualifications",
    "expect": "exists"
  },
  {
    "max": 30000,
    "type": "time",
    "metric": "sms_sent_within"
  },
  {
    "type": "database",
    "query": "direction = 'outbound'",
    "table": "messages",
    "expect": "exists"
  },
  {
    "type": "api",
    "expect": "contains SMS activity",
    "endpoint": "GET /fub/activities"
  }
]
```


## UC-3 — FUB Status Change

### UC-3: FUB Status Change SMS

- **File:** `tests/e2e/uc-3-fub-status-change.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "payload": "peopleStageUpdated",
    "endpoint": "POST /api/webhook/fub"
  },
  {
    "type": "database",
    "query": "status = 'appointment'",
    "table": "leads",
    "expect": "exists"
  },
  {
    "if": "status = 'appointment'",
    "then": "sms_type = 'booking_confirmation'",
    "type": "conditional"
  },
  {
    "type": "api",
    "expect": "contains status change + SMS",
    "endpoint": "GET /fub/activities"
  }
]
```


## UC-4 — FUB Agent Assignment

### UC-4: Agent Assignment Intro SMS

- **File:** `tests/e2e/uc-4-agent-assignment.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "payload": "lead.assigned",
    "endpoint": "POST /api/webhook/fub"
  },
  {
    "type": "database",
    "query": "agent_id = 'agent_123'",
    "table": "leads",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "content ILIKE '%Jane Smith%'",
    "table": "messages",
    "expect": "exists"
  },
  {
    "type": "sms",
    "expect": true,
    "contains": [
      "new agent",
      "Jane Smith"
    ]
  }
]
```


## UC-5 — Lead Opt-Out

### UC-5: Opt-Out Handling

- **File:** `tests/e2e/uc-5-opt-out.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "body": "STOP",
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/webhook/twilio"
  },
  {
    "type": "database",
    "query": "status = 'opted_out'",
    "table": "leads",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "dnc = true",
    "table": "leads",
    "expect": "exists"
  },
  {
    "type": "sms",
    "expect": true,
    "contains": "unsubscribed"
  },
  {
    "name": "follow_up_blocked",
    "type": "test",
    "action": "send SMS to opted-out lead",
    "expect": "blocked"
  }
]
```


## UC-6 — Cal.com Booking

### UC-6: Cal.com Booking Confirmation

- **File:** `tests/e2e/uc-6-cal-booking.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/webhook/calcom"
  },
  {
    "type": "database",
    "table": "bookings",
    "expect": "exists"
  },
  {
    "type": "sms",
    "expect": true,
    "contains": [
      "March 1",
      "2:00 PM",
      "confirmed"
    ]
  },
  {
    "type": "database",
    "query": "status = 'appointment'",
    "table": "leads",
    "expect": "exists"
  },
  {
    "job": "reminder_sms",
    "type": "scheduled",
    "expect": "scheduled",
    "trigger": "24h before appointment"
  }
]
```


## UC-7 — Dashboard Manual SMS

### UC-7: Dashboard Manual SMS

- **File:** `tests/e2e/uc-7-dashboard-sms.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "type": "ui",
    "action": "click #send-sms-button",
    "expect": "modal opens"
  },
  {
    "type": "ui",
    "action": "type message",
    "expect": "input updates"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/messages/send"
  },
  {
    "type": "database",
    "query": "status = 'pending'",
    "table": "messages",
    "expect": "exists (before send)"
  },
  {
    "type": "database",
    "query": "status = 'sent'",
    "table": "messages",
    "expect": "exists (after send)"
  },
  {
    "type": "ui",
    "action": "check message thread",
    "expect": "message appears"
  },
  {
    "type": "webhook",
    "event": "twilio.status_callback",
    "expect": "delivered status updated"
  }
]
```


## UC-8 — Follow-up Sequences

### UC-8: Follow-up Sequences

- **File:** `tests/e2e/uc-8-followup-sequences.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "job": "followup-check",
    "runs": "every hour",
    "type": "cron",
    "expect": "executes"
  },
  {
    "type": "database",
    "query": "status = 'active'",
    "table": "sequences",
    "expect": "exists"
  },
  {
    "type": "ai",
    "check": "message.contextually_relevant",
    "expect": true
  },
  {
    "sent": true,
    "type": "sms"
  },
  {
    "type": "database",
    "query": "completed = true",
    "table": "sequence_steps",
    "expect": "exists"
  },
  {
    "name": "reply_stops_sequence",
    "type": "test",
    "action": "simulate lead reply",
    "expect": "sequence paused"
  }
]
```


## UC-9 — Customer Sign-Up Flow

### UC-9: Customer Sign-Up Flow

- **File:** `tests/e2e/uc-9-customer-signup.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "ui",
    "action": "visit /signup",
    "expect": "page loads with 3 plan options"
  },
  {
    "type": "ui",
    "action": "select Pro plan",
    "expect": "Pro highlighted"
  },
  {
    "type": "ui",
    "action": "fill email, name, phone",
    "expect": "form validates"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/billing/create-checkout"
  },
  {
    "type": "redirect",
    "expect": true,
    "url_contains": "stripe.com/checkout"
  },
  {
    "type": "stripe",
    "action": "complete checkout",
    "expect": "success"
  },
  {
    "type": "webhook",
    "event": "checkout.session.completed",
    "expect": "received"
  },
  {
    "type": "database",
    "query": "email = 'test@example.com'",
    "table": "customers",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "plan_tier = 'pro'",
    "table": "customers",
    "expect": "exists"
  },
  {
    "type": "redirect",
    "expect": true,
    "url_contains": "/onboarding"
  }
]
```

