<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# E2E Test Mappings

> Generated: 2026-03-03T17:12:21.040Z | Source: `e2e_test_specs` + `use_cases` tables

**Coverage: 15 specs | 5 pass | 0 fail | 10 not run**

| UC | Test Name | File | Last Run | Result |
|----|-----------|------|----------|--------|
| UC-1 | UC-1: Lead-Initiated SMS Response | tests/e2e/uc-1-lead-initiated-sms.test.ts | - | pass |
| UC-10 | UC-10: Billing Portal Access | tests/e2e/uc-10-billing-portal.test.ts | - | not_run |
| UC-11 | UC-11: Subscription Upgrade | tests/e2e/uc-11-subscription-lifecycle.test.ts | - | not_run |
| UC-12 | UC-12: MRR Reporting | tests/e2e/uc-12-mrr-reporting.test.ts | - | not_run |
| UC-2 | UC-2: FUB New Lead Auto-Response | tests/e2e/uc-2-fub-new-lead.test.ts | - | not_run |
| UC-3 | UC-3: FUB Status Change SMS | tests/e2e/uc-3-fub-status-change.test.ts | - | not_run |
| UC-4 | UC-4: Agent Assignment Intro SMS | tests/e2e/uc-4-agent-assignment.test.ts | - | not_run |
| UC-5 | UC-5: Lead Opt-Out Handling | tests/e2e/uc-5-lead-opt-out.test.ts | - | pass |
| UC-6 | UC-6: Cal.com Booking Integration | tests/e2e/uc-6-calcom-booking.test.ts | - | pass |
| UC-7 | UC-7: Dashboard Manual SMS | tests/e2e/uc-7-dashboard-manual-sms.test.ts | - | pass |
| UC-8 | UC-8: Follow-up Sequence Execution | tests/e2e/uc-8-follow-up-sequences.test.ts | - | pass |
| UC-9 | UC-9: Customer Sign-Up Flow | tests/e2e/uc-9-customer-signup.test.ts | - | not_run |
| UC-AUTH-FIX-001 | UC-AUTH-FIX-001: Authentication Flow | tests/e2e/auth-flow.test.ts | - | not_run |
| UC-BILLING-FIX-001 | UC-BILLING-FIX-001: Billing Integration Error Fix | tests/e2e/billing-integration-fix.test.ts | - | not_run |
| UC-DEPLOY-LANDING-001 | UC-DEPLOY-LANDING-001: Landing Page Smoke Test | tests/e2e/landing-page-smoke.test.ts | - | not_run |

## UC-1 — Lead-Initiated SMS

### UC-1: Lead-Initiated SMS Response

- **File:** `tests/e2e/uc-1-lead-initiated-sms.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /webhook/twilio/sms"
  },
  {
    "type": "database",
    "query": "direction = 'inbound'",
    "table": "messages",
    "expect": "exists"
  },
  {
    "max": 5000,
    "type": "time",
    "metric": "ai_response_generated"
  },
  {
    "max": 30000,
    "type": "time",
    "metric": "sms_delivered"
  },
  {
    "type": "database",
    "query": "source = 'ai'",
    "table": "messages",
    "expect": "exists"
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
    "url": "/settings",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "billing-section"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /api/billing/subscription"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "subscription-plan"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "subscription-price"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "next-billing-date"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "payment-methods"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "invoice-history"
  }
]
```


## UC-11 — Subscription Lifecycle

### UC-11: Subscription Upgrade

- **File:** `tests/e2e/uc-11-subscription-lifecycle.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "url": "/settings/billing",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "upgrade-button"
  },
  {
    "type": "ui",
    "value": "Pro",
    "action": "select",
    "selector": "plan-pro"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/billing/upgrade"
  },
  {
    "type": "stripe",
    "action": "confirm-proration"
  },
  {
    "type": "database",
    "query": "plan_id = 'pro'",
    "table": "subscriptions",
    "expect": "exists"
  },
  {
    "type": "email",
    "expect": "upgrade-confirmation",
    "provider": "sendgrid"
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
    "url": "/admin/mrr",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /api/admin/mrr"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "mrr-total"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "mrr-breakdown"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "mrr-trend-chart"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "export-csv"
  },
  {
    "type": "file",
    "action": "downloaded",
    "expect": "mrr-report.csv"
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
    "type": "ui",
    "action": "verify",
    "expect": "contains test lead",
    "selector": "lead-feed"
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

### UC-5: Lead Opt-Out Handling

- **File:** `tests/e2e/uc-5-lead-opt-out.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /webhook/twilio/sms"
  },
  {
    "type": "database",
    "query": "opted_out = true",
    "table": "leads",
    "expect": "exists"
  },
  {
    "type": "database",
    "table": "compliance_logs",
    "expect": "exists"
  },
  {
    "type": "blocking",
    "action": "send_sms",
    "expect": "blocked",
    "reason": "opted_out"
  }
]
```


## UC-6 — Cal.com Booking

### UC-6: Cal.com Booking Integration

- **File:** `tests/e2e/uc-6-calcom-booking.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/integrations/calcom/connect"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /api/booking"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "booking-link"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /webhook/calcom/booking"
  },
  {
    "type": "database",
    "table": "bookings",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "direction = 'outbound'",
    "table": "messages",
    "expect": "exists"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "booking-confirmation"
  }
]
```


## UC-7 — Dashboard Manual SMS

### UC-7: Dashboard Manual SMS

- **File:** `tests/e2e/uc-7-dashboard-manual-sms.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "url": "/dashboard",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "send-message-button"
  },
  {
    "type": "ui",
    "value": "Test message",
    "action": "type",
    "selector": "message-input"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "send-button"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/sms/send"
  },
  {
    "type": "database",
    "query": "source = 'manual'",
    "table": "messages",
    "expect": "exists"
  }
]
```


## UC-8 — Follow-up Sequences

### UC-8: Follow-up Sequence Execution

- **File:** `tests/e2e/uc-8-follow-up-sequences.test.ts`
- **Result:** pass
- **Assertions:**
```json
[
  {
    "type": "database",
    "table": "sequences",
    "expect": "exists"
  },
  {
    "type": "database",
    "table": "sequence_steps",
    "expect": "exists"
  },
  {
    "max": 70000,
    "type": "time",
    "metric": "sequence_step_executed"
  },
  {
    "type": "database",
    "query": "source = 'sequence'",
    "table": "messages",
    "expect": "exists"
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
    "url": "/",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "signup-cta"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "signup-cta"
  },
  {
    "type": "ui",
    "value": "Pro",
    "action": "select",
    "selector": "plan-pro"
  },
  {
    "type": "ui",
    "value": "test@example.com",
    "action": "type",
    "selector": "email-input"
  },
  {
    "type": "ui",
    "value": "TestPass123!",
    "action": "type",
    "selector": "password-input"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /auth/signup"
  },
  {
    "type": "redirect",
    "expect": "checkout.stripe.com"
  },
  {
    "type": "stripe",
    "action": "complete-checkout"
  },
  {
    "type": "webhook",
    "expect": "customer.subscription.created"
  },
  {
    "type": "redirect",
    "expect": "/dashboard"
  },
  {
    "type": "database",
    "table": "subscriptions",
    "expect": "exists"
  }
]
```


## UC-AUTH-FIX-001 — Implement Authentication Flow - Signup/Login

### UC-AUTH-FIX-001: Authentication Flow

- **File:** `tests/e2e/auth-flow.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "url": "/",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "signup-button"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "login-button"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "signup-button"
  },
  {
    "type": "ui",
    "value": "test@example.com",
    "action": "type",
    "selector": "email-input"
  },
  {
    "type": "ui",
    "value": "TestPass123!",
    "action": "type",
    "selector": "password-input"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "submit-signup"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /auth/signup"
  },
  {
    "type": "redirect",
    "expect": "/dashboard"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "user-menu"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "logout-button"
  },
  {
    "type": "redirect",
    "expect": "/"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "login-button"
  }
]
```


## UC-BILLING-FIX-001 — Fix Billing Integration - Agent Not Found Error

### UC-BILLING-FIX-001: Billing Integration Error Fix

- **File:** `tests/e2e/billing-integration-fix.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "url": "/settings",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "billing-subscription"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /api/billing/subscription"
  },
  {
    "type": "ui",
    "action": "not-visible",
    "expect": true,
    "selector": "error-agent-not-found"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "subscription-plan"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "subscription-price"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "payment-methods"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "invoice-history"
  },
  {
    "type": "database",
    "query": "user_id IS NOT NULL",
    "table": "subscriptions",
    "expect": "exists"
  }
]
```


## UC-DEPLOY-LANDING-001 — Deploy Landing Page to Vercel

### UC-DEPLOY-LANDING-001: Landing Page Smoke Test

- **File:** `tests/e2e/landing-page-smoke.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /"
  },
  {
    "url": "/",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "landing-hero"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "cta-button"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "cta-button"
  },
  {
    "type": "redirect",
    "expect": "/dashboard"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "dashboard-content"
  }
]
```

