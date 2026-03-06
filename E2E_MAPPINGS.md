<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# E2E Test Mappings

> Generated: 2026-03-06T07:18:18.527Z | Source: `e2e_test_specs` + `use_cases` tables

**Coverage: 32 specs | 5 pass | 0 fail | 27 not run**

| UC | Test Name | File | Last Run | Result |
|----|-----------|------|----------|--------|
| feat-add-auth-middleware-to-protect-dashboard | Auth Middleware - Protect Dashboard Routes | tests/e2e/auth-middleware.test.ts | - | not_run |
| feat-add-login-page-with-email-and-password | Login Page with Email and Password | tests/e2e/login-page.test.ts | - | not_run |
| feat-add-route-discovery-smoke-test | Public routes pass | - | - | not_run |
| feat-add-route-discovery-smoke-test | Failed route reported | - | - | not_run |
| feat-add-route-discovery-smoke-test | All routes discovered | - | - | not_run |
| feat-add-route-discovery-smoke-test | Deployment blocked | - | - | not_run |
| feat-add-route-discovery-smoke-test | Execution under 30s | - | - | not_run |
| feat-add-route-discovery-smoke-test | Route Discovery Smoke Test | tests/e2e/route-discovery-smoke.test.ts | - | not_run |
| feat-add-route-discovery-smoke-test | Protected routes with auth | - | - | not_run |
| feat-add-session-management-with-server-side- | Session Management with Server-Side Tokens | tests/e2e/session-management.test.ts | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Failed sync retry | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Dashboard reflects sync | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Auto-Sync Deployed Pages to System Components | tests/e2e/auto-sync-deployed-pages.test.ts | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Removed page marked deprecated | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | URL change updated | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Manual sync trigger | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | New deployment detected | - | - | not_run |
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

## feat-add-auth-middleware-to-protect-dashboard — add auth middleware to protect dashboard and settings routes

### Auth Middleware - Protect Dashboard Routes

- **File:** `tests/e2e/auth-middleware.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "url": "/dashboard",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "redirect",
    "expect": "/login"
  },
  {
    "url": "/settings",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "redirect",
    "expect": "/login"
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
    "selector": "landing-content"
  },
  {
    "type": "api",
    "expect": 401,
    "endpoint": "GET /api/user (no auth)"
  },
  {
    "type": "ui",
    "email": "test@example.com",
    "action": "login",
    "password": "TestPass123!"
  },
  {
    "url": "/dashboard",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "dashboard-content"
  }
]
```


## feat-add-login-page-with-email-and-password — add login page with email and password

### Login Page with Email and Password

- **File:** `tests/e2e/login-page.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "url": "/login",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "email-input"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "password-input"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "login-button"
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
    "selector": "login-button"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /auth/login"
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
  }
]
```


## feat-add-route-discovery-smoke-test — Route Discovery Smoke Test

### Public routes pass

- **Result:** not_run
- **Assertions:**
```json
[
  "All return 200"
]
```

### Failed route reported

- **Result:** not_run
- **Assertions:**
```json
[
  "Failure shown with details"
]
```

### All routes discovered

- **Result:** not_run
- **Assertions:**
```json
[
  "All expected routes found"
]
```

### Deployment blocked

- **Result:** not_run
- **Assertions:**
```json
[
  "Deployment prevented"
]
```

### Execution under 30s

- **Result:** not_run
- **Assertions:**
```json
[
  "Completes in < 30 seconds"
]
```

### Route Discovery Smoke Test

- **File:** `tests/e2e/route-discovery-smoke.test.ts`
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
    "type": "api",
    "expect": 200,
    "endpoint": "GET /login"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /signup"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /dashboard (with auth)"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /settings (with auth)"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /integrations (with auth)"
  },
  {
    "type": "report",
    "format": "json",
    "include": "all_routes_status"
  }
]
```

### Protected routes with auth

- **Result:** not_run
- **Assertions:**
```json
[
  "Returns 200 with auth",
  "Returns 401 without auth"
]
```


## feat-add-session-management-with-server-side- — add session management with server-side tokens

### Session Management with Server-Side Tokens

- **File:** `tests/e2e/session-management.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "ui",
    "email": "test@example.com",
    "action": "login",
    "password": "TestPass123!"
  },
  {
    "name": "sb-access-token",
    "type": "cookie",
    "expect": "exists"
  },
  {
    "name": "sb-access-token",
    "type": "cookie",
    "expect": "httpOnly"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /api/user"
  },
  {
    "url": "/dashboard",
    "type": "ui",
    "action": "refresh"
  },
  {
    "type": "ui",
    "action": "visible",
    "expect": true,
    "selector": "dashboard-content"
  },
  {
    "name": "sb-refresh-token",
    "type": "cookie",
    "expect": "exists"
  },
  {
    "type": "ui",
    "action": "logout"
  },
  {
    "name": "sb-access-token",
    "type": "cookie",
    "expect": "not-exists"
  },
  {
    "type": "redirect",
    "expect": "/login"
  }
]
```


## feat-auto-sync-deployed-pages-to-system-compo — Auto-Sync Deployed Pages to System Components

### Failed sync retry

- **Result:** not_run
- **Assertions:**
```json
[
  "Sync succeeds on retry"
]
```

### Dashboard reflects sync

- **Result:** not_run
- **Assertions:**
```json
[
  "All components match system_components"
]
```

### Auto-Sync Deployed Pages to System Components

- **File:** `tests/e2e/auto-sync-deployed-pages.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "trigger",
    "action": "heartbeat"
  },
  {
    "type": "api",
    "expect": 200,
    "endpoint": "GET /api/vercel/deployments"
  },
  {
    "type": "database",
    "query": "url IS NOT NULL",
    "table": "system_components",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "status = live",
    "table": "system_components",
    "expect": "exists"
  },
  {
    "max": 300000,
    "type": "time",
    "metric": "sync_completion"
  }
]
```

### Removed page marked deprecated

- **Result:** not_run
- **Assertions:**
```json
[
  "Status changed to deprecated"
]
```

### URL change updated

- **Result:** not_run
- **Assertions:**
```json
[
  "URL updated to new value"
]
```

### Manual sync trigger

- **Result:** not_run
- **Assertions:**
```json
[
  "Components updated without waiting for heartbeat"
]
```

### New deployment detected

- **Result:** not_run
- **Assertions:**
```json
[
  "New entry exists",
  "URL is correct",
  "Status is live"
]
```


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

