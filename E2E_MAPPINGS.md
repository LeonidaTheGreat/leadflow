<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->
# E2E Test Mappings

> Generated: 2026-03-08T04:50:53.246Z | Source: `e2e_test_specs` + `use_cases` tables

**Coverage: 80 specs | 8 pass | 0 fail | 72 not run**

| UC | Test Name | File | Last Run | Result |
|----|-----------|------|----------|--------|
| feat-add-auth-middleware-to-protect-dashboard | Auth Middleware - Protect Dashboard Routes | tests/e2e/auth-middleware.test.ts | - | not_run |
| feat-add-login-page-with-email-and-password | E2E-LOGIN-001: Existing agent login → dashboard | test/e2e/login-flow.test.ts | - | not_run |
| feat-add-login-page-with-email-and-password | Login Page with Email and Password | tests/e2e/login-page.test.ts | - | not_run |
| feat-add-route-discovery-smoke-test | All routes discovered | - | - | not_run |
| feat-add-route-discovery-smoke-test | Protected routes with auth | - | - | not_run |
| feat-add-route-discovery-smoke-test | Public routes pass | - | - | not_run |
| feat-add-route-discovery-smoke-test | Deployment blocked | - | - | not_run |
| feat-add-route-discovery-smoke-test | Execution under 30s | - | - | not_run |
| feat-add-route-discovery-smoke-test | Failed route reported | - | - | not_run |
| feat-add-route-discovery-smoke-test | Route Discovery Smoke Test | tests/e2e/route-discovery-smoke.test.ts | - | not_run |
| feat-add-session-management-with-server-side- | Session Management with Server-Side Tokens | tests/e2e/session-management.test.ts | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Auto-Sync Deployed Pages to System Components | tests/e2e/auto-sync-deployed-pages.test.ts | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Failed sync retry | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | New deployment detected | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Manual sync trigger | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Dashboard reflects sync | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | Removed page marked deprecated | - | - | not_run |
| feat-auto-sync-deployed-pages-to-system-compo | URL change updated | - | - | not_run |
| fix-deployed-pages-not-registered-in-system- | E2E-3: URL Accuracy Verification | tests/e2e/url-accuracy.test.ts | 2026-03-07 | pass |
| fix-deployed-pages-not-registered-in-system- | E2E-1: Auto-Sync on Heartbeat | tests/e2e/deployed-pages-sync.test.ts | 2026-03-07 | pass |
| fix-deployed-pages-not-registered-in-system- | E2E-2: Manual Sync API | tests/e2e/manual-sync-api.test.ts | 2026-03-07 | pass |
| fix-onboarding-500-error | E2E-ONBOARD-004: End-to-End User Journey | test/e2e-user-journey.test.ts | - | not_run |
| fix-onboarding-500-error | E2E-ONBOARD-006: Stripe Webhook Processing | test/stripe-webhook.test.ts | - | not_run |
| fix-onboarding-500-error | E2E-ONBOARD-005: Billing Portal Access | test/billing-portal.test.ts | - | not_run |
| fix-onboarding-500-error | E2E-ONBOARD-001: Successful Signup Flow | test/onboarding-signup-flow.test.ts | - | not_run |
| fix-onboarding-500-error | E2E-ONBOARD-003: Health Check | test/health-endpoint.test.ts | - | not_run |
| fix-onboarding-500-error | E2E-ONBOARD-002: Login with Migrated Table | test/onboarding-login.test.ts | - | not_run |
| implement-twilio-sms-integration | E2E-TWILIO-002: Invalid Phone Number Error Handling | test/twilio-sms-integration.test.js | - | not_run |
| implement-twilio-sms-integration | E2E-TWILIO-007: Concurrent SMS Sends | test/twilio-sms-integration.test.js | - | not_run |
| implement-twilio-sms-integration | E2E-TWILIO-006: SMS Analytics & Cost Tracking | test/twilio-sms-integration.test.js | - | not_run |
| implement-twilio-sms-integration | E2E-TWILIO-005: Market-Based From Number Selection | test/twilio-sms-integration.test.js | - | not_run |
| implement-twilio-sms-integration | E2E-TWILIO-004: Status Update via Webhook Callback | test/twilio-sms-integration.test.js | - | not_run |
| implement-twilio-sms-integration | E2E-TWILIO-003: Message Truncation | test/twilio-sms-integration.test.js | - | not_run |
| implement-twilio-sms-integration | E2E-TWILIO-001: Real SMS Delivery via Twilio | test/twilio-sms-integration.test.js | - | not_run |
| UC-1 | UC-1: Lead-Initiated SMS Response | tests/e2e/uc-1-lead-initiated-sms.test.ts | - | pass |
| UC-1 | E2E-SMS-001: FUB webhook → SMS sent → delivery tracked | test/e2e/sms-delivery.test.ts | - | not_run |
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
| UC-LANDING-MARKETING-001 | FAQ Accordion | - | - | not_run |
| UC-LANDING-MARKETING-001 | Pricing Toggle | e2e/landing-page.spec.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Smooth Scroll Navigation | - | - | not_run |
| UC-LANDING-MARKETING-001 | Pricing CTA with Plan Selection | - | - | not_run |
| UC-LANDING-MARKETING-001 | Hero CTA Navigation | - | - | not_run |
| UC-LANDING-MARKETING-001 | Page Load & SEO | - | - | not_run |
| UC-LANDING-MARKETING-001 | Mobile Responsive | e2e/landing-page.spec.ts | - | not_run |
| UC-LANDING-MARKETING-001 | SEO Meta Tags | tests/e2e/landing-seo-meta.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Keyboard Navigation Accessibility | tests/e2e/landing-keyboard-nav.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Navigation Smooth Scroll | tests/e2e/landing-nav-scroll.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Mobile Responsiveness | tests/e2e/landing-mobile-responsive.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Analytics Events | - | - | not_run |
| UC-LANDING-MARKETING-001 | Pricing Tier Selection | tests/e2e/landing-pricing-cta.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | CTA Click Flow | e2e/landing-page.spec.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Hero CTA Navigation | tests/e2e/landing-hero-cta.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | FAQ Accordion | e2e/landing-page.spec.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Page Load Performance | tests/e2e/landing-page-load.test.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Analytics Tracking | e2e/landing-page.spec.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Landing Page Load | e2e/landing-page.spec.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Mobile Navigation | - | - | not_run |
| UC-LANDING-MARKETING-001 | Responsive Design | - | - | not_run |
| UC-LANDING-MARKETING-001 | Accessibility | e2e/landing-page.spec.ts | - | not_run |
| UC-LANDING-MARKETING-001 | Navigation Scroll | e2e/landing-page.spec.ts | - | not_run |
| UC-REVENUE-RECOVERY-001 | E2E-REV-001: End-to-End Revenue Funnel | tests/e2e/revenue-funnel.test.ts | - | not_run |
| UC-REVENUE-RECOVERY-001 | Pilot Agent Onboarding | - | - | not_run |
| UC-REVENUE-RECOVERY-001 | SMS Value Delivery | - | - | not_run |
| UC-REVENUE-RECOVERY-001 | E2E-REV-003: SMS Value Delivery | tests/e2e/sms-value-delivery.test.ts | - | not_run |
| UC-REVENUE-RECOVERY-001 | E2E-REVENUE-004: End-to-End Revenue Funnel | tests/e2e/revenue-recovery-full-funnel.test.ts | - | not_run |
| UC-REVENUE-RECOVERY-001 | E2E-REV-002: Pilot Agent Onboarding | tests/e2e/pilot-onboarding.test.ts | - | not_run |
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

### E2E-LOGIN-001: Existing agent login → dashboard

- **File:** `test/e2e/login-flow.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"Agent successfully logs in; Token stored; Dashboard accessible"
```

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

### All routes discovered

- **Result:** not_run
- **Assertions:**
```json
[
  "All expected routes found"
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

### Public routes pass

- **Result:** not_run
- **Assertions:**
```json
[
  "All return 200"
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

### Failed sync retry

- **Result:** not_run
- **Assertions:**
```json
[
  "Sync succeeds on retry"
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

### Manual sync trigger

- **Result:** not_run
- **Assertions:**
```json
[
  "Components updated without waiting for heartbeat"
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

### URL change updated

- **Result:** not_run
- **Assertions:**
```json
[
  "URL updated to new value"
]
```


## fix-deployed-pages-not-registered-in-system- — Auto-Sync Deployed Vercel Pages to System Components

### E2E-3: URL Accuracy Verification

- **File:** `tests/e2e/url-accuracy.test.ts`
- **Result:** pass
- **Last run:** 2026-03-07T01:01:17.443Z
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
- **Result:** pass
- **Last run:** 2026-03-07T01:01:17.443Z
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
- **Result:** pass
- **Last run:** 2026-03-07T01:01:17.443Z
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

### E2E-ONBOARD-004: End-to-End User Journey

- **File:** `test/e2e-user-journey.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"Complete flow works without errors; Dashboard displays user data from real_estate_agents"
```

### E2E-ONBOARD-006: Stripe Webhook Processing

- **File:** `test/stripe-webhook.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"Webhook processes successfully; real_estate_agents table updated; No 500 errors"
```

### E2E-ONBOARD-005: Billing Portal Access

- **File:** `test/billing-portal.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"Billing portal loads; Subscription details displayed; Queries real_estate_agents successfully"
```

### E2E-ONBOARD-001: Successful Signup Flow

- **File:** `test/onboarding-signup-flow.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"No 500 errors; Agent created in real_estate_agents table; Response includes agent data (no password_hash)"
```

### E2E-ONBOARD-003: Health Check

- **File:** `test/health-endpoint.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"Status 200; Database connectivity confirmed; Queries real_estate_agents table successfully"
```

### E2E-ONBOARD-002: Login with Migrated Table

- **File:** `test/onboarding-login.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"Login succeeds; Returns agent data from real_estate_agents table; Session created"
```


## implement-twilio-sms-integration — Implement Real Twilio SMS Integration - Replace Mock

### E2E-TWILIO-002: Invalid Phone Number Error Handling

- **File:** `test/twilio-sms-integration.test.js`
- **Result:** not_run
- **Assertions:**
```json
"Error thrown; Code 21211; Category INVALID_NUMBER; Retryable false; Logged to DB"
```

### E2E-TWILIO-007: Concurrent SMS Sends

- **File:** `test/twilio-sms-integration.test.js`
- **Result:** not_run
- **Assertions:**
```json
"All SMS sent; Unique SIDs; All logged; Response time <2s each; No rate limit errors"
```

### E2E-TWILIO-006: SMS Analytics & Cost Tracking

- **File:** `test/twilio-sms-integration.test.js`
- **Result:** not_run
- **Assertions:**
```json
"Analytics counts correct; Delivery rate calculated; Cost tracked; Events logged with durations"
```

### E2E-TWILIO-005: Market-Based From Number Selection

- **File:** `test/twilio-sms-integration.test.js`
- **Result:** not_run
- **Assertions:**
```json
"Correct from-number per market; CA override works; Warning logged if missing; No errors"
```

### E2E-TWILIO-004: Status Update via Webhook Callback

- **File:** `test/twilio-sms-integration.test.js`
- **Result:** not_run
- **Assertions:**
```json
"Status updated to delivered; Timestamp set; Events logged; DB state consistent"
```

### E2E-TWILIO-003: Message Truncation

- **File:** `test/twilio-sms-integration.test.js`
- **Result:** not_run
- **Assertions:**
```json
"Message truncated to 160 chars; Warning in console; SMS sent; Body stored correctly"
```

### E2E-TWILIO-001: Real SMS Delivery via Twilio

- **File:** `test/twilio-sms-integration.test.js`
- **Result:** not_run
- **Assertions:**
```json
"SMS delivered to phone; SID stored in DB; Status tracking active; No errors; Response <2s"
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

### E2E-SMS-001: FUB webhook → SMS sent → delivery tracked

- **File:** `test/e2e/sms-delivery.test.ts`
- **Result:** not_run
- **Assertions:**
```json
"Lead receives SMS within 30 seconds; Status tracked in conversations table; Message visible in dashboard"
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

### FAQ Accordion

- **Result:** not_run

### Pricing Toggle

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"prices_update\",\"badge_visible\",\"calculation_correct\"]"
```

### Smooth Scroll Navigation

- **Result:** not_run

### Pricing CTA with Plan Selection

- **Result:** not_run

### Hero CTA Navigation

- **Result:** not_run

### Page Load & SEO

- **Result:** not_run

### Mobile Responsive

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"no_horizontal_scroll\",\"tap_targets_44px\",\"faq_works_touch\"]"
```

### SEO Meta Tags

- **File:** `tests/e2e/landing-seo-meta.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "name": "title",
    "type": "meta",
    "expect": "contains=LeadFlow AI"
  },
  {
    "name": "description",
    "type": "meta",
    "expect": "not-empty"
  },
  {
    "type": "meta",
    "expect": "exists",
    "property": "og:title"
  },
  {
    "type": "meta",
    "expect": "exists",
    "property": "og:description"
  }
]
```

### Keyboard Navigation Accessibility

- **File:** `tests/e2e/landing-keyboard-nav.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "keyboard",
    "action": "tab",
    "expect": "focus-on-nav-links"
  },
  {
    "type": "keyboard",
    "action": "tab",
    "expect": "focus-on-hero-cta"
  },
  {
    "type": "css",
    "expect": "visible-outline",
    "selector": ":focus"
  },
  {
    "type": "keyboard",
    "action": "enter",
    "expect": "cta-activated"
  }
]
```

### Navigation Smooth Scroll

- **File:** `tests/e2e/landing-nav-scroll.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "click",
    "selector": "[data-testid=nav-pricing]"
  },
  {
    "type": "scroll",
    "expect": "pricing-section-centered"
  },
  {
    "type": "click",
    "selector": "[data-testid=nav-features]"
  },
  {
    "type": "scroll",
    "expect": "features-section-centered"
  }
]
```

### Mobile Responsiveness

- **File:** `tests/e2e/landing-mobile-responsive.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "layout",
    "expect": "single-column"
  },
  {
    "type": "scroll",
    "expect": "no-horizontal-scroll"
  },
  {
    "type": "element",
    "expect": "tap-target>=44px",
    "selector": "[data-testid=hero-cta-primary]"
  },
  {
    "type": "element",
    "expect": "visible",
    "selector": "[data-testid=pricing-section]"
  }
]
```

### Analytics Events

- **Result:** not_run

### Pricing Tier Selection

- **File:** `tests/e2e/landing-pricing-cta.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "scroll",
    "selector": "[data-testid=pricing-section]"
  },
  {
    "type": "click",
    "selector": "[data-testid=pricing-pro-cta]"
  },
  {
    "type": "navigation",
    "expect": "url=/onboarding"
  },
  {
    "type": "analytics",
    "event": "pricing_cta_click",
    "expect": "fired",
    "params": {
      "plan": "pro"
    }
  }
]
```

### CTA Click Flow

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"redirects_to_signup\",\"utm_preserved\",\"analytics_fired\"]"
```

### Hero CTA Navigation

- **File:** `tests/e2e/landing-hero-cta.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "click",
    "selector": "[data-testid=hero-cta-primary]"
  },
  {
    "type": "scroll",
    "expect": "signup-section-in-viewport"
  },
  {
    "type": "analytics",
    "event": "hero_cta_click",
    "expect": "fired"
  }
]
```

### FAQ Accordion

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"accordion_expands\",\"only_one_open\",\"smooth_animation\"]"
```

### Page Load Performance

- **File:** `tests/e2e/landing-page-load.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  {
    "type": "performance",
    "expect": "<1500",
    "metric": "FCP"
  },
  {
    "type": "performance",
    "expect": "score>=90",
    "metric": "Lighthouse"
  },
  {
    "type": "console",
    "expect": "no_errors"
  },
  {
    "type": "element",
    "expect": "visible",
    "selector": "[data-testid=hero-section]"
  }
]
```

### Analytics Tracking

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"pageview_fired\",\"scroll_depth_tracked\",\"cta_events_fired\"]"
```

### Landing Page Load

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"hero_visible\",\"ctas_clickable\",\"lighthouse_score_above_90\"]"
```

### Mobile Navigation

- **Result:** not_run

### Responsive Design

- **Result:** not_run

### Accessibility

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"alt_text_present\",\"heading_hierarchy\",\"aria_labels\",\"contrast_aa\"]"
```

### Navigation Scroll

- **File:** `e2e/landing-page.spec.ts`
- **Result:** not_run
- **Assertions:**
```json
"[\"smooth_scroll\",\"url_hash_updated\"]"
```


## UC-REVENUE-RECOVERY-001 — Revenue Recovery — Close MRR Gap

### E2E-REV-001: End-to-End Revenue Funnel

- **File:** `tests/e2e/revenue-funnel.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  "Landing page loads with <3s LCP",
  "Signup form submits without error",
  "Onboarding completes successfully",
  "Dashboard accessible post-onboarding",
  "Payment processing succeeds",
  "MRR increases correctly"
]
```

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

### E2E-REV-003: SMS Value Delivery

- **File:** `tests/e2e/sms-value-delivery.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  "FUB webhook received",
  "SMS sent within 30s",
  "Message delivered to lead phone",
  "Conversation logged in dashboard",
  "Delivery status tracked"
]
```

### E2E-REVENUE-004: End-to-End Revenue Funnel

- **File:** `tests/e2e/revenue-recovery-full-funnel.test.ts`
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
    "action": "click",
    "selector": "hero-cta-button"
  },
  {
    "type": "ui",
    "value": "/onboarding",
    "action": "verify",
    "expect": "url"
  },
  {
    "type": "ui",
    "value": "Revenue Test",
    "action": "fill",
    "selector": "input-name"
  },
  {
    "type": "ui",
    "value": "revenue@test.com",
    "action": "fill",
    "selector": "input-email"
  },
  {
    "type": "ui",
    "value": "555-999-8888",
    "action": "fill",
    "selector": "input-phone"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "next-button"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "next-button"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "submit-button"
  },
  {
    "type": "ui",
    "action": "verify",
    "expect": "visible",
    "selector": "plan-selection"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "select-pro-plan"
  },
  {
    "type": "ui",
    "action": "click",
    "selector": "continue-to-payment"
  },
  {
    "cvc": "123",
    "type": "stripe",
    "action": "fill_card",
    "expiry": "12/30",
    "number": "4242424242424242"
  },
  {
    "type": "stripe",
    "action": "submit"
  },
  {
    "type": "ui",
    "value": "/dashboard",
    "action": "verify",
    "expect": "url"
  },
  {
    "type": "stripe",
    "expect": "subscription_active"
  },
  {
    "type": "db",
    "table": "subscriptions",
    "where": {
      "status": "active"
    },
    "expect": "record_exists"
  }
]
```

### E2E-REV-002: Pilot Agent Onboarding

- **File:** `tests/e2e/pilot-onboarding.test.ts`
- **Result:** not_run
- **Assertions:**
```json
[
  "Onboarding wizard renders",
  "Account created in Supabase",
  "FUB integration connects",
  "Twilio integration connects",
  "Test lead received within 5 min"
]
```

### End-to-End Revenue Funnel

- **Result:** not_run
- **Assertions:**
```json
"[\"Navigate to landing page\",\"Click CTA to signup\",\"Complete onboarding wizard\",\"Connect FUB integration\",\"Trigger test lead\",\"Verify SMS sent within 30s\",\"Upgrade to paid plan\",\"Verify MRR updated\"]"
```

