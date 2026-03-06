<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# E2E Test Mappings

> Generated: 2026-03-06T10:24:40.575Z | Source: `e2e_test_specs` + `use_cases` tables

**Coverage: 47 specs | 5 pass | 0 fail | 42 not run**

| UC | Test Name | File | Last Run | Result |
|----|-----------|------|----------|--------|
| feat-add-auth-middleware-to-protect-dashboard | Auth Middleware - Protect Dashboard Routes | tests/e2e/auth-middleware.test.ts | - | not_run |
| feat-add-login-page-with-email-and-password | Login Page with Email and Password | tests/e2e/login-page.test.ts | - | not_run |
| feat-add-route-discovery-smoke-test | Public routes pass | - | - | not_run |
| feat-add-route-discovery-smoke-test | All routes discovered | - | - | not_run |
| feat-add-route-discovery-smoke-test | Execution under 30s | - | - | not_run |
| feat-add-route-discovery-smoke-test | Protected routes with auth | - | - | not_run |
| feat-add-route-discovery-smoke-test | Failed route reported | - | - | not_run |
| feat-add-route-discovery-smoke-test | Route Discovery Smoke Test | tests/e2e/route-discovery-smoke.test.ts | - | not_run |
| feat-add-route-discovery-smoke-test | Deployment blocked | - | - | not_run |
| feat-add-session-management-with-server-side- | Session Management with Server-Side Tokens | tests/e2e/session-management.test.ts | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Auto-Sync Deployed Pages to System Components | tests/e2e/auto-sync-deployed-pages.test.ts | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Dashboard reflects sync | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Removed page marked deprecated | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Manual sync trigger | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | URL change updated | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | New deployment detected | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Failed sync retry | - | - | not_run |
| fix-deployed-pages-not-registered-in-system- | E2E-3: URL Accuracy Verification | tests/e2e/url-accuracy.test.ts | - | not_run |
| fix-deployed-pages-not-registered-in-system- | E2E-1: Auto-Sync on Heartbeat | tests/e2e/deployed-pages-sync.test.ts | - | not_run |
| fix-deployed-pages-not-registered-in-system- | E2E-2: Manual Sync API | tests/e2e/manual-sync-api.test.ts | - | not_run |
| fix-onboarding-500-error | Signup Flow Recovery Test | tests/e2e/signup-recovery.test.ts | - | not_run |
| implement-twilio-sms-integration | Real SMS Delivery Test | tests/e2e/sms-delivery.test.ts | - | not_run |
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
| UC-LANDING-MARKETING-001 | E2E-LP-004: Mobile Responsive | tests/e2e/landing-marketing-mobile.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | E2E-LP-003: Pricing CTA Navigation | tests/e2e/landing-marketing-pricing-cta.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Landing Page Conversion Test | tests/e2e/landing-conversion.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | E2E-LP-002: Hero CTA Navigation | tests/e2e/landing-marketing-hero-cta.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | E2E-LP-001: Page Load and Visual Check | tests/e2e/landing-marketing-page-load.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | E2E-LP-005: Navigation Smooth Scroll | tests/e2e/landing-marketing-navigation.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | E2E-LP-006: Analytics Events | tests/e2e/landing-marketing-analytics.test.ts | - | not_run |
| UC-REVENUE-RECOVERY-001 | Pilot Agent Onboarding | - | - | not_run |
| UC-REVENUE-RECOVERY-001 | SMS Value Delivery | - | - | not_run |
| UC-REVENUE-RECOVERY-001 | End-to-End Revenue Funnel | - | - | not_run |

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

### All routes discovered

- **Result:** not_run
- **Assertions:**
```json
[
  "All expected routes found"
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

### Protected routes with auth

- **Result:** not_run
- **Assertions:**
```json
[
  "Returns 200 with auth",
  "Returns 401 without auth"
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

### Deployment blocked

- **Result:** not_run
- **Assertions:**
```json
[
  "Deployment prevented"
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

### Dashboard reflects sync

- **Result:** not_run
- **Assertions:**
```json
[
  "All components match system_components"
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

### Manual sync trigger

- **Result:** not_run
- **Assertions:**
```json
[
  "Components updated without waiting for heartbeat"
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

### Failed sync retry

- **Result:** not_run
- **Assertions:**
```json
[
  "Sync succeeds on retry"
]
```


## fix-deployed-pages-not-registered-in-system- — Auto-Sync Deployed Vercel Pages to System Components

### E2E-3: URL Accuracy Verification

- **File:** `tests/e2e/url-accuracy.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "url": "https://leadflow-ai-five.vercel.app",
    "type": "http",
    "expect": 200
  },
  {
    "url": "https://leadflow-ai-five.vercel.app/dashboard",
    "type": "http",
    "expect": 200
  },
  {
    "url": "https://fub-inbound-webhook.vercel.app/health",
    "type": "http",
    "expect": 200
  }
]
```

### E2E-1: Auto-Sync on Heartbeat

- **File:** `tests/e2e/deployed-pages-sync.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "database",
    "query": "component_name='Vercel /health endpoint' AND metadata->>'url' IS NOT NULL",
    "table": "system_components",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "component_name='Vercel root endpoint' AND metadata->>'url' IS NOT NULL",
    "table": "system_components",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "component_name='Vercel dashboard health' AND metadata->>'url' IS NOT NULL",
    "table": "system_components",
    "expect": "exists"
  },
  {
    "type": "database",
    "query": "component_name='Signup page' AND metadata->>'url' IS NOT NULL",
    "table": "system_components",
    "expect": "exists"
  }
]
```

### E2E-2: Manual Sync API

- **File:** `tests/e2e/manual-sync-api.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": 200,
    "endpoint": "POST /api/admin/sync-deployed-pages"
  },
  {
    "path": "success",
    "type": "response",
    "expect": "true"
  },
  {
    "type": "database",
    "query": "status='live' AND status_emoji='🟢'",
    "table": "system_components",
    "expect": "count >= 4"
  }
]
```


## fix-onboarding-500-error — Fix Onboarding Endpoint - Resolve Agents Table Schema Collision

### Signup Flow Recovery Test

- **File:** `tests/e2e/signup-recovery.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "ui",
    "action": "navigate",
    "expect": "page loads with CTA",
    "target": "/"
  },
  {
    "type": "ui",
    "action": "click",
    "expect": "navigates to /onboarding",
    "target": "Start Free Trial button"
  },
  {
    "type": "form",
    "action": "fill",
    "expect": "form validates",
    "fields": [
      "email",
      "password",
      "name",
      "phone"
    ]
  },
  {
    "type": "api",
    "expect": "200 OK",
    "endpoint": "POST /api/agents/onboard"
  },
  {
    "type": "database",
    "query": "email matches signup",
    "table": "customers",
    "expect": "record exists"
  },
  {
    "type": "ui",
    "action": "redirect",
    "expect": "/dashboard loads with auth"
  }
]
```


## implement-twilio-sms-integration — Implement Real Twilio SMS Integration - Replace Mock

### Real SMS Delivery Test

- **File:** `tests/e2e/sms-delivery.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "api",
    "expect": "200 OK",
    "payload": "new lead event",
    "endpoint": "POST /api/webhooks/fub"
  },
  {
    "type": "database",
    "query": "phone = test_phone",
    "table": "leads",
    "expect": "record created"
  },
  {
    "type": "integration",
    "action": "send SMS",
    "expect": "API call succeeds",
    "service": "twilio"
  },
  {
    "type": "database",
    "query": "lead_id matches",
    "table": "messages",
    "expect": "twilio_sid IS NOT NULL"
  },
  {
    "type": "manual",
    "action": "check test phone",
    "expect": "SMS received within 30s"
  }
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


## UC-LANDING-MARKETING-001 — Marketing Landing Page — High-Converting Signup Flow

### E2E-LP-004: Mobile Responsive

- **File:** `tests/e2e/landing-marketing-mobile.test.ts`
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
    "action": "verify",
    "expect": "visible",
    "selector": "mobile-menu-button"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "hero-headline"
  },
  {
    "type": "layout",
    "expect": "2x2-grid",
    "selector": "stats-bar"
  },
  {
    "type": "layout",
    "expect": "single-column",
    "selector": "pricing-cards"
  },
  {
    "type": "touch",
    "expect": "tappable",
    "minSize": 44,
    "selector": "hero-cta-button"
  }
]
```

### E2E-LP-003: Pricing CTA Navigation

- **File:** `tests/e2e/landing-marketing-pricing-cta.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "url": "/#pricing",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "pricing-pro-cta"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "pricing-pro-cta"
  },
  {
    "type": "redirect",
    "expect": "/onboarding"
  },
  {
    "type": "analytics",
    "event": "pricing_cta_click",
    "expect": "fired",
    "params": {
      "tier": "pro"
    }
  }
]
```

### Landing Page Conversion Test

- **File:** `tests/e2e/landing-conversion.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "ui",
    "action": "navigate",
    "expect": "page loads <2s",
    "target": "/"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "text contains Never Lose a Lead",
    "target": "hero headline"
  },
  {
    "type": "ui",
    "action": "scroll",
    "expect": "visible",
    "target": "pricing section"
  },
  {
    "type": "ui",
    "action": "click",
    "expect": "navigates to /onboarding",
    "target": "Get Started - Pro tier"
  },
  {
    "type": "analytics",
    "event": "cta_click",
    "expect": "event tracked"
  }
]
```

### E2E-LP-002: Hero CTA Navigation

- **File:** `tests/e2e/landing-marketing-hero-cta.test.ts`
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
    "action": "verify",
    "expect": "visible",
    "selector": "hero-cta-button"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "hero-cta-button"
  },
  {
    "type": "redirect",
    "expect": "/onboarding"
  },
  {
    "type": "analytics",
    "event": "landing_cta_click",
    "expect": "fired"
  }
]
```

### E2E-LP-001: Page Load and Visual Check

- **File:** `tests/e2e/landing-marketing-page-load.test.ts`
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
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "hero-headline"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "stats-bar"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "problem-section"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "how-it-works"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "features-grid"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "pricing-section"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "final-cta"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "not-visible",
    "selector": "api-docs-table"
  },
  {
    "max": 2000,
    "type": "performance",
    "metric": "load_time"
  }
]
```

### E2E-LP-005: Navigation Smooth Scroll

- **File:** `tests/e2e/landing-marketing-navigation.test.ts`
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
    "action": "verify",
    "expect": "visible",
    "selector": "nav-pricing-link"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "nav-pricing-link"
  },
  {
    "type": "scroll",
    "expect": "smooth"
  },
  {
    "type": "url",
    "value": "#pricing",
    "expect": "contains"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "in-viewport",
    "selector": "pricing-section"
  }
]
```

### E2E-LP-006: Analytics Events

- **File:** `tests/e2e/landing-marketing-analytics.test.ts`
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
    "type": "analytics",
    "event": "page_view",
    "expect": "fired"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "hero-cta-button"
  },
  {
    "type": "analytics",
    "event": "landing_cta_click",
    "expect": "fired"
  },
  {
    "url": "/#pricing",
    "type": "ui",
    "action": "navigate"
  },
  {
    "type": "analytics",
    "event": "scroll_to_pricing",
    "expect": "fired"
  }
]
```


## UC-REVENUE-RECOVERY-001 — Revenue Recovery — Close MRR Gap

### Pilot Agent Onboarding

- **Result:** not_run
- **Assertions:**
```json
"[\"Recruit pilot agent\",\"Send onboarding link\",\"Complete all 4 steps\",\"Verify account created\",\"Verify FUB connection\",\"Verify Twilio connection\",\"Send test lead\",\"Verify SMS received\"]"
```

### SMS Value Delivery

- **Result:** not_run
- **Assertions:**
```json
"[\"Ensure Twilio integration active\",\"Submit lead via FUB webhook\",\"Verify SMS sent within 30s\",\"Verify message delivered\",\"Check dashboard for status\",\"Verify conversation logged\"]"
```

### End-to-End Revenue Funnel

- **Result:** not_run
- **Assertions:**
```json
"[\"Navigate to landing page\",\"Click CTA to signup\",\"Complete onboarding wizard\",\"Connect FUB integration\",\"Trigger test lead\",\"Verify SMS sent within 30s\",\"Upgrade to paid plan\",\"Verify MRR updated\"]"
```

