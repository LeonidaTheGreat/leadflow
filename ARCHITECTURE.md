<!-- AUTO-GENERATED sections marked. Manual sections maintained by Opus review. -->
# LeadFlow Architecture

## Layered Architecture (ENFORCED)

Every file in the codebase belongs to exactly one layer. Agents MUST follow this structure. QC rejects violations.

```
┌─────────────────────────────────────────────────┐
│  ROUTES (routes/)                               │
│  Thin HTTP handlers. Parse → delegate → respond │
│  ZERO business logic. ZERO direct DB queries.   │
├─────────────────────────────────────────────────┤
│  SERVICES (lib/services/)                       │
│  Business logic classes. One class per domain.  │
│  ONLY layer that touches DB or external APIs.   │
├─────────────────────────────────────────────────┤
│  DATA ACCESS (lib/db.js)                        │
│  Database client. Used ONLY by services.        │
├─────────────────────────────────────────────────┤
│  TYPES (lib/types/)                             │
│  Shared interfaces. Lead, Agent, Message, etc.  │
├─────────────────────────────────────────────────┤
│  CONFIG (lib/config/)                           │
│  Env resolution, constants, feature flags.      │
└─────────────────────────────────────────────────┘
```

### Rules (strictly enforced by QC)

1. **Routes are thin.** A route handler parses the request, calls a service method, and returns the response. No DB queries, no API calls, no business logic.
2. **Services own all logic.** Every business operation (send email, qualify lead, create booking, process payment) lives in a service class. Services are the ONLY code that imports the DB client or calls external APIs.
3. **One service per domain.** LeadService handles leads. BillingService handles Stripe. SMSService handles Twilio. No splitting across multiple files.
4. **Services are classes with constructors.** Not loose exported functions. A service encapsulates config, clients, and state. Agents call `service.method()`, not `import { doThing } from 'utils'`.
5. **Types are shared.** All interfaces live in `lib/types/`. Routes and services both import from here.
6. **No inline implementations.** If an operation has a service, use it. If it doesn't, create one. One-off scripts for repeatable operations are rejected.

### Where things go

| I need to... | Put it in... | NOT in... |
|--------------|-------------|-----------|
| Handle an HTTP request | `routes/` | anywhere else |
| Query the database | A service class in `lib/services/` | routes, scripts, inline |
| Call Twilio/Stripe/FUB | A service class in `lib/services/` | routes, scripts, inline |
| Define a data shape | `lib/types/` | inline type annotations |
| Read env vars | `lib/config/` | scattered process.env |
| Run a one-time migration | `scripts/db/` | product code |
| Write a test | `tests/` | product code directories |

### Existing Services (grep for these before creating new code)

<!-- AUTO-GENERATED from lib/services/ — regenerate with: node scripts/generate-architecture-services.js -->
| Service | Location | Responsibility |
|---------|----------|---------------|
| DB Client | `lib/db.js` | PostgreSQL connection pool |
| ActivationService | `lib/services/ActivationService.js` | ActivationService — Admin outreach to verified-but-unactivated agents |
| ApiKeyAuthService | `lib/services/api-key-auth-service.js` | Timing-safe API key comparison for admin/preview endpoint auth |
| BillingService | `lib/services/BillingService.js` | — |
| BookingLinkService | `lib/services/BookingLinkService.js` | BookingLinkService |
| CalcomClient | `lib/services/CalcomClient.js` | Cal.com API Client |
| CalcomEventProcessor | `lib/services/CalcomEventProcessor.js` | CalcomEventProcessor — event-specific booking logic for Cal.com webhooks. |
| CalcomWebhookHandler | `lib/services/CalcomWebhookHandler.js` | CalcomWebhookHandler — route-facing class for Cal.com webhooks. |
| CalcomWebhookManagement | `lib/services/CalcomWebhookManagement.js` | Cal.com Webhook Management Service |
| EmailService | `lib/services/EmailService.js` | — |
| FUBService | `lib/services/FUBService.js` | — |
| LapsedTrialReactivationService | `lib/services/LapsedTrialReactivationService.js` | Lapsed trial reactivation email campaigns for expired-trial agents |
| PilotConversionService | `lib/services/PilotConversionService.js` | PilotConversionService — Pilot-to-Paid Conversion Email Service |
| PilotSignupOutreachService | `lib/services/PilotSignupOutreachService.js` | — |
| SatisfactionService | `lib/services/SatisfactionService.js` | — |
| SequenceService | `lib/services/SequenceService.js` | SequenceService — Follow-up sequence creation and management |
| StripeService | `lib/services/StripeService.js` | Creates a Stripe coupon + promo code for a personal upgrade offer. |
| StuckPilotsService | `lib/services/StuckPilotsService.js` | — |
| SystemStatusService | `lib/services/SystemStatusService.js` | — |
| TrialActivationService | `lib/services/TrialActivationService.js` | Note: trial_email_logs table doesn't have pilot_progress_id, so we check via pilot_progress.trial_cta_sent instead |
| TwilioService | `lib/services/TwilioService.js` | TwilioService — SMS sending, status tracking, and analytics via Twilio. |
| WeeklyPerformanceService | `lib/services/WeeklyPerformanceService.js` | — |
<!-- /AUTO-GENERATED services -->

> **If you're about to write a DB query or API call outside of lib/services/, STOP.** Find or create the right service first.

---

## System Overview

### Tech Stack
- **Runtime:** Node.js / Express (API), Next.js (Dashboard)
- **Database:** Local PostgreSQL on Mac Mini (openclaw DB)
- **Deployment:** Vercel (two projects: webhook API + dashboard)
- **External:** Twilio (SMS), Stripe (billing), Follow Up Boss (CRM), Cal.com (bookings), Resend (email)
- **Orchestration:** OpenClaw Genome (`~/.openclaw/genome/`) — heartbeat, task spawning, agent management

### Two Vercel Projects

| Project | URL | Source | Purpose |
|---------|-----|--------|---------|
| `leadflow-ai` | leadflow-ai-five.vercel.app | `product/lead-response/dashboard/` | Next.js customer dashboard |
| `fub-inbound-webhook` | fub-inbound-webhook.vercel.app | repo root (`server.js`) | FUB webhook API |

### Data Flow
```
Lead arrives (FUB webhook) → server.js → AI qualification → SMS response (Twilio)
                                                          → Booking (Cal.com)
                                                          → Dashboard update (Next.js)
```

### Orchestration Pipeline
```
Heartbeat → detect issues → create task → spawn agent → dev codes
→ verify (build + syntax + tests + quality) → create PR → QC reviews (sonnet)
→ CI passes → merge → deploy
```

---

## Security Architecture (ENFORCED)

### Authentication
- **Webhook signatures:** All inbound webhooks verified with HMAC-SHA256 + `crypto.timingSafeEqual()`. Fail-closed — if secret env var missing, returns 503 (not skip).
  - FUB: `FUB_WEBHOOK_SECRET` → HMAC verification in `integration/fub-webhook-listener.js`
  - Stripe: `STRIPE_WEBHOOK_SECRET` → `stripe.webhooks.constructEvent()` in `routes/billing.js`
  - Cal.com: `CALCOM_WEBHOOK_SECRET` → HMAC verification in `routes/calcom-webhook.js`
- **Cron auth:** `lib/middleware/require-cron-secret.js` — verifies Vercel's `Authorization: Bearer <CRON_SECRET>` with timing-safe comparison. Fail-closed.
- **API key auth:** `lib/middleware/require-api-key.js` — `crypto.timingSafeEqual()`. Protects admin and preview endpoints.

### Rate Limiting
Applied in `server.js` via `lib/middleware/rate-limiter.js`:
- `/webhook/*` → 120 req/min per IP (webhookLimiter)
- `/api/cron/*` → 10 req/min per IP (adminLimiter)
- `/api/admin/*` → 10 req/min per IP (adminLimiter)
- `/health*` → 60 req/min per IP (custom in-memory limiter in `routes/system.js`)

### Principle: Fail-Closed
Every auth/verification path rejects by default. No `if (secret) { verify } else { skip }` patterns. If a secret is missing, the system refuses requests rather than degrading silently.

---

## Resilience Architecture

### Circuit Breakers
`lib/utils/circuit-breaker.js` — protects all external API calls from cascade failures.

| Service | Breaker | Threshold | Reset | Methods Wrapped |
|---------|---------|-----------|-------|-----------------|
| FUB | `breakers.fub` | 5 failures | 30s | fetchLeadFromFub, logSmsInFub |
| Stripe | `breakers.stripe` | 3 failures | 60s | subscriptions.create, customers.retrieve/create, billingPortal.sessions.create |
| Cal.com | `breakers.calcom` | 5 failures | 30s | calApiRequest (covers all API calls) |
| Twilio | `breakers.twilio` | 5 failures | 30s | messages.create, messages.fetch |

States: CLOSED (normal) → OPEN (fail-fast after threshold) → HALF_OPEN (test one request) → CLOSED

Metrics exposed at `GET /health/breakers` via `getAllBreakerMetrics()`.

### Retry Logic
`withRetry()` in `lib/utils/circuit-breaker.js` — exponential backoff with jitter.
- Max 3 retries, base delay 1s
- Skips retry on: `CIRCUIT_OPEN` errors, 4xx HTTP responses, non-retryable DB errors (constraint violations)
- Used by: CalcomWebhookHandler (15+ callsites), FUBService

### Dead-Letter Queue
Failed webhooks written to `webhook_dead_letters` table via `lib/utils/dead-letter.js`.
- `lib/utils/dead-letter-replay.js` — replays with exponential backoff (2^retry_count minutes)
- Cron route: `GET /api/cron/dead-letter-replay` (requireCronSecret protected)
- Max 5 retries before marking as `abandoned`

---

## Observability Architecture

### Structured Logging
`lib/logger.js` — all logging is structured JSON. Zero `console.*` calls in production code.
- PII redaction: password, token, apiKey, secret, authorization, cookie, credit_card
- Child loggers with scoped context in every service and route
- Request/response lifecycle logging with timing

### Request Tracing
- `lib/request-context.js` — `AsyncLocalStorage` threads requestId through entire async call stack
- `requestLogger` middleware generates `X-Request-ID`, wraps `next()` in context store
- All external-calling services use `getRequestId()` as fallback for requestId propagation
- X-Request-ID forwarded to: FUB API, Cal.com API, Resend API
- Background/cron tasks get synthetic `bg-<ts>-<rand>` IDs

### Health Endpoints
- `GET /health` — basic health check (env vars, DB connectivity)
- `GET /health/breakers` — circuit breaker state for all 4 external services

---

## Route Organization

```
routes/
├── system.js                    ← GET /, /health, /health/breakers
├── billing.js                   ← POST /webhook/stripe, /api/billing/*
├── calcom-webhook.js            ← POST /webhook/calcom, /api/calcom/*
├── admin/
│   ├── activation-outreach.js   ← GET/POST /api/admin/activation-outreach
│   └── reactivation-campaign.js ← POST /api/admin/reactivation-campaign
└── internal/
    ├── check-stuck-pilots.js    ← GET /api/cron/check-stuck-pilots (cron)
    ├── weekly-performance.js    ← GET /api/cron/weekly-performance (cron)
    └── dead-letter-replay.js    ← GET /api/cron/dead-letter-replay (cron)

integration/
└── fub-webhook-listener.js      ← POST /webhook/fub
```

Internal cron routes are separated from customer-facing API routes. All cron routes require `CRON_SECRET` verification.

---

## Dashboard (Next.js — `product/lead-response/dashboard/`)

The customer-facing dashboard is a separate Next.js app deployed to Vercel (`leadflow-ai`). It has its own route handlers, services, and DB access via Supabase client.

### Dashboard API Routes (`app/api/`)

| Route group | Purpose | Auth |
|-------------|---------|------|
| `webhook/twilio/` | Inbound SMS + status callbacks | `twilio.validateRequest()` (X-Twilio-Signature) |
| `webhook/fub/` | FUB lead events | HMAC-SHA256 (`timingSafeEqual`) |
| `webhook/calcom/` | Cal.com booking events | HMAC-SHA256 |
| `webhooks/stripe/` | Stripe subscription events | `stripe.webhooks.constructEvent()` |
| `auth/` | Login, logout, signup, password reset, email verify, session, pilot/trial status | Public / Session |
| `agents/` | Agent profile, onboarding wizard sub-steps, satisfaction ping | Session auth |
| `onboarding/` | Onboarding flow (legacy path), FUB config, phone provisioning | Session auth |
| `integrations/` | FUB / Cal.com / Twilio connect + verify + disconnect | Session auth |
| `leads/` | Lead list, individual lead messages | Session auth |
| `dashboard/` | Dashboard stats, lead list, session analytics | Session auth |
| `analytics/` | Event tracking, SMS stats, dashboard metrics | Session auth |
| `nps/` | NPS prompt, submit, dismiss, verify | Session auth |
| `sequences/` | Follow-up sequence CRUD, pause/resume | Session auth |
| `satisfaction/` | Satisfaction events + stats | Session auth |
| `sms/` | Manual send, AI suggest, status | Session auth |
| `billing/` | Checkout session creation, MRR snapshot | Session auth |
| `stripe/` | Checkout + portal sessions (upgrade flow) | Session auth |
| `booking/` | Booking link management | Session auth |
| `referrals/` | Referral link generation + stats | Session auth |
| `metrics/` | ROI metrics | Session auth |
| `setup/` | Setup wizard progress, test SMS, status | Session auth |
| `trial/` | Trial start, status, nudge | Session auth |
| `cron/follow-up/` | Follow-up sequence cron | CRON_SECRET |
| `cron/inactivity-alerts/` | Inactivity alert cron | CRON_SECRET |
| `cron/inactivity-check/` | Inactivity check cron | CRON_SECRET |
| `cron/expire-trials/` | Trial expiry cron | CRON_SECRET |
| `cron/nps-surveys/` | NPS survey send cron | CRON_SECRET |
| `cron/send-trial-emails/` | Trial email sequence cron | CRON_SECRET |
| `cron/pilot-trial-cta/` | Pilot trial CTA email cron | CRON_SECRET |
| `cron/pilot-recruitment-outreach/` | Pilot recruitment outreach cron | CRON_SECRET |
| `cron/pilot-stuck-check/` | Stuck pilot detection cron | CRON_SECRET |
| `cron/check-stuck-agents/` | Stuck agent detection cron | CRON_SECRET |
| `admin/` | Admin operations (pilots, signups, outreach, simulate, triage, funnels) | API key auth |
| `internal/` | Internal ops (pilot usage, activation emails) | API key auth |
| `demo/` | Demo flow (generate response, run, status, aha SMS) | Public / Internal |
| `health/` | Dashboard health check | Public |
| `ping/` | Liveness ping | Public |
| `prospects/` | Prospect capture | Public |
| `pilot-signup/` | Pilot signup (legacy path) | Public |
| `lead-capture/` | Lead capture form | Public |
| `page-views/` | Page view tracking | Public |
| `events/track/` | Analytics event ingestion | Public |
| `debug/` | Development debug endpoints | Internal |
| `smoke/` | Smoke test endpoints | Internal |

### Dashboard Libraries (`lib/`)

**Database client:**

| Module | Purpose |
|--------|---------|
| `lib/db.ts` | Primary PostgREST client (`postgrestAdmin`, `postgrestPublic`). All dashboard DB access goes here. |
| `lib/supabase.ts` | Backward-compat re-exports from `lib/db.ts`. Kept so existing imports don't break. |
| `lib/supabase-server.ts` | Server-side re-export of `lib/db.ts` with build-safe initialization. |

**Core services (`lib/services/`):**

| Module | Purpose |
|--------|---------|
| `lib/services/AuthService.ts` | JWT-based session auth: token generation, validation, cookie management |
| `lib/services/inbound-sms-service.ts` | Inbound SMS business logic (extracted from webhook route) |
| `lib/services/fub-webhook-service.ts` | FUB webhook event processing business logic |
| `lib/services/AnalyticsService.js` | Analytics event recording and aggregation |
| `lib/services/ProspectWaitlistService.ts` | Prospect capture and waitlist management |
| `lib/services/encryption-service.ts` | Symmetric encryption for sensitive fields (e.g. API keys at rest) |
| `lib/services/pilot-outreach-blast-service.ts` | Pilot outreach bulk email blast |

**Other lib modules:**

| Module | Purpose |
|--------|---------|
| `lib/twilio.ts` | Twilio SMS client + phone normalization |
| `lib/fub.ts` | FUB API client + webhook verification |
| `lib/calcom.ts` | Cal.com booking link management |
| `lib/ai.ts` | AI SMS response generation |
| `lib/logger.ts` | Structured JSON logger for Vercel function logs |
| `lib/satisfaction.ts` | Satisfaction ping system |
| `lib/email-service.ts` | Transactional email dispatch (Resend) |
| `lib/nps-service.ts` | NPS survey scheduling + response recording |
| `lib/nps-email-service.ts` | NPS email delivery |
| `lib/sequences.ts` | Follow-up sequence state machine |
| `lib/trial.ts` | Trial activation + expiry logic |
| `lib/trial-emails.ts` | Trial email sequence templates + dispatch |
| `lib/pilot-status.ts` | Pilot status checks and lifecycle helpers |
| `lib/pilot-conversion-service.ts` | Pilot-to-paid conversion email logic |
| `lib/outreach-email-service.ts` | Outreach blast email service |
| `lib/agent-mapper.ts` | Maps DB `real_estate_agents` shape to typed `Agent` domain object |
| `lib/agent-session.ts` | Agent session state helpers |
| `lib/session-analytics.ts` | Session-scoped analytics helpers |
| `lib/onboarding-api.ts` | Onboarding API helper functions |
| `lib/onboarding-validation.ts` | Onboarding input validators |
| `lib/sms-templates.ts` | SMS response template library |
| `lib/sms-delivery-monitor.ts` | Twilio delivery status tracking |
| `lib/telegram-service.ts` | Internal Telegram notifications |
| `lib/rate-limit.ts` | In-memory rate limiter for dashboard API routes |
| `lib/error-handler.ts` | Centralized error response formatting |
| `lib/config.ts` | Dashboard env var resolution and constants |
| `lib/utils.ts` | Shared utility functions |
| `lib/types/` | Shared TypeScript interfaces (`Lead`, `Agent`, `Message`, etc.) |
| `lib/analytics/` | GA4 + PostHog analytics client wrappers |

### Dashboard Rules
- All webhook routes use fail-closed signature verification
- Structured logging via `@/lib/logger` (no raw `console.*`)
- PostgREST client (`lib/db.ts`) for all DB access — not raw SQL, not the Supabase SDK
- Business logic belongs in `lib/services/` or dedicated `lib/` modules, not in route handlers

---

## Key Directories

```
/Users/clawdbot/projects/leadflow/
├── server.js                    ← Webhook API entry point
├── routes/                      ← API route handlers (thin)
├── integration/                 ← FUB webhook listener
├── lib/                         ← Services, types, config
│   ├── services/                ← Business logic classes
│   ├── types/                   ← Shared interfaces
│   └── config/                  ← Environment, constants
├── product/lead-response/
│   └── dashboard/               ← Next.js customer dashboard
│       ├── app/                 ← Next.js app router
│       ├── components/          ← React components
│       └── lib/                 ← Dashboard-specific services
├── tests/                       ← All tests (e2e, integration, unit)
├── scripts/                     ← Utility scripts (migrations, diagnostics)
├── docs/                        ← PRDs, design specs, reports
└── config/                      ← Strategy configs, runtime configs
```
