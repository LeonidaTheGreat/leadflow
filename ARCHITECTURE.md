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

<!-- AUTO-GENERATED from lib/services/ — regenerate with: ls lib/services/*.js -->
| Service | Location | Responsibility |
|---------|----------|---------------|
| DB Client | `lib/db.js` | PostgreSQL connection pool |
| BillingService | `lib/services/BillingService.js` | Stripe billing, subscriptions, webhooks |
| BookingLinkService | `lib/services/BookingLinkService.js` | Cal.com booking link management |
| CalcomClient | `lib/services/CalcomClient.js` | Cal.com API client |
| CalcomWebhookHandler | `lib/services/CalcomWebhookHandler.js` | Cal.com webhook processing |
| CalcomWebhookManagement | `lib/services/CalcomWebhookManagement.js` | Cal.com webhook registration |
| EmailService | `lib/services/EmailService.js` | Transactional email via Resend |
| FUBService | `lib/services/FUBService.js` | Follow Up Boss CRM integration |
| OnboardingTelemetryService | `lib/services/OnboardingTelemetryService.js` | Agent onboarding tracking |
| PilotConversionService | `lib/services/PilotConversionService.js` | Pilot → paid email sequences |
| PosthogService | `lib/services/PosthogService.js` | PostHog analytics events |
| SatisfactionService | `lib/services/SatisfactionService.js` | Agent satisfaction pings |
| SequenceService | `lib/services/SequenceService.js` | Email/SMS drip sequences |
| StuckPilotsService | `lib/services/StuckPilotsService.js` | Stuck pilot detection and alerts |
| SubscriptionService | `lib/services/SubscriptionService.js` | Subscription state management |
| TwilioService | `lib/services/TwilioService.js` | Twilio SMS integration |
| WeeklyPerformanceService | `lib/services/WeeklyPerformanceService.js` | Weekly agent performance reports |

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
→ verify (build + syntax) → create PR → QC reviews (sonnet) → CI passes
→ merge → deploy
```

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
