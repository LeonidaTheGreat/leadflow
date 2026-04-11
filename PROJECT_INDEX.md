# LeadFlow AI — Project Index

Agent-facing map of the repository. Read this before making changes.

## Directory Structure

```
leadflow/
├── server.js                  ← Express API entry point (FUB webhook server)
├── playwright.config.js       ← Playwright browser test config
├── package.json               ← Dependencies and npm scripts
├── project.config.json        ← Genome project identity card (agents, products, rules)
├── vercel.json                ← Vercel deployment config
│
├── lib/                       ← Backend modules (Node.js/CommonJS)
├── routes/                    ← Express API route handlers
├── integrations/              ← Third-party integration code
│   └── fub-webhook/           ← Follow Up Boss webhook (standalone Vercel project)
│
├── product/                   ← Product artifacts
│   ├── lead-response/
│   │   ├── dashboard/         ← Next.js customer dashboard (Vercel: leadflow-ai)
│   │   ├── database/          ← Database schema docs
│   │   ├── docs/              ← Product-specific docs
│   │   └── workflows/         ← Workflow definitions
│   ├── analytics/             ← Analytics configs
│   ├── design/                ← Design specs, wireframes, brand assets
│   ├── legal/                 ← Legal docs (terms, privacy)
│   └── marketing/             ← Marketing content, outreach, templates
│
├── scripts/                   ← Utility scripts (organized by purpose)
│   ├── db/                    ← Database migrations and setup
│   ├── diagnostics/           ← Codebase analysis and debugging
│   ├── migrations/            ← Migration docs
│   ├── shell/                 ← Shell scripts (heartbeat, watchdog, spawn)
│   ├── stripe/                ← Stripe-specific utilities
│   ├── tasks/                 ← Task management utilities
│   └── utilities/             ← General-purpose utilities
│
├── tests/                     ← All tests
│   ├── unit/                  ← Unit tests (11 files)
│   ├── integration/           ← Integration tests (15 files)
│   ├── e2e/                   ← End-to-end tests (34 files)
│   ├── browser/               ← Playwright browser tests (4 specs)
│   ├── genome/                ← Genome infrastructure tests
│   └── (root)                 ← Legacy tests (~90 files, should migrate to subdirs)
│
├── docs/                      ← Documentation
│   ├── prd/                   ← Product Requirements Documents (PRD-*.md)
│   ├── design/                ← Design specs and component docs
│   ├── design-assets/         ← Static design assets
│   ├── guides/                ← How-to guides and reference
│   ├── marketing-handoff/     ← Marketing handoff docs
│   └── reports/               ← Completion reports and analysis
│
├── agents/                    ← Agent role configs (one dir per agent type)
│   ├── dev/
│   ├── qc/
│   ├── design/
│   ├── product-executive/
│   ├── analytics/
│   ├── marketing/
│   └── orchestrator/
│
├── schema/                    ← Per-domain schema docs (progressive disclosure)
│   ├── agents.md              ← real_estate_agents, onboarding, auth (20 tables)
│   ├── crm.md                 ← leads, dnc_list, qualifications (6 tables)
│   ├── communications.md      ← messages, sms, conversations, webhooks (6 tables)
│   ├── bookings.md            ← Cal.com bookings and reminders (4 tables)
│   ├── billing.md             ← subscriptions, payments, referrals (8 tables)
│   ├── analytics.md           ← events, metrics, NPS, distribution (18 tables)
│   └── orchestration.md       ← tasks, use_cases, code_reviews, PRDs (15 tables)
├── migrations/                ← SQL migration files (numbered)
├── sql/                       ← SQL schemas and one-off migration scripts
├── supabase/                  ← Legacy Supabase migrations (historical only)
├── email-sequence/            ← Email sequence configs and templates
├── orchestrator/              ← Orchestrator playbooks
├── pilot_recruitment/         ← Pilot agent recruitment materials
├── e2e/                       ← Standalone E2E test suite (Playwright, separate config)
├── frontend/                  ← Legacy frontend code (src/components, src/lib)
├── app/                       ← Vercel serverless functions (api/cron/)
├── design/                    ← Top-level design specs (brokerage tier)
├── stripe-subscriptions/      ← Stripe subscription module
├── completion-reports/        ← Agent task completion reports
└── test-results/              ← Test run output artifacts
```

## Entry Points

| File | Purpose |
|------|---------|
| `server.js` | Express API server — FUB webhook listener + Twilio inbound SMS. Deployed to Vercel as `fub-inbound-webhook`. |
| `product/lead-response/dashboard/` | Next.js customer dashboard. Deployed to Vercel as `leadflow-ai`. Entry: `app/` directory (Next.js App Router). |
| `playwright.config.js` | Root Playwright config for browser tests in `tests/browser/`. |
| `app/api/cron/` | Vercel cron functions (serverless). |

## Module Map

### lib/ — Backend Modules

| File | Description | Notes |
|------|-------------|-------|
| `billing.js` | Stripe billing: customer creation, subscriptions, webhook events | Base billing module |
| `billing-enhanced.js` | Complete Stripe integration with subscription lifecycle management | **Canonical** — extends billing.js with full lifecycle |
| `billing-cycle-manager.js` | Renewal dates, billing cycles, prorations | Used by billing-enhanced.js |
| `booking-link-service.js` | Personalized booking link generation for agents (Cal.com) | |
| `calcom.js` | Cal.com API client for booking link integration | |
| `calcom-webhook-handler.js` | Processes booking events from Cal.com, updates database | |
| `calcom-webhook-management.js` | Webhook registration and delivery log management | |
| `db-client.js` | Database client — re-exports from postgrest-client.js | **Compatibility shim** — use postgrest-client.js |
| `db-pool.js` | Database connection pool manager | |
| `errors.js` | Server-side error handling utilities | |
| `index.js` | Centralized backend library exports | |
| `logger.js` | Structured logging for backend services | |
| `onboarding-telemetry.js` | Onboarding step tracking and telemetry | |
| `pilot-conversion-service.js` | Pilot-to-paid conversion email sequence logic | |
| `postgrest-client.js` | PostgREST client — drop-in replacement for Supabase SDK | **Canonical DB client** |
| `posthog-server.js` | PostHog server-side analytics client | |
| `satisfaction-service.js` | Satisfaction ping logic (shared across server and dashboard) | |
| `sequence-service.js` | Follow-up sequence creation and management (UC-8) | |
| `stripe-portal.js` | Stripe customer portal session and configuration | |
| `subscription-service.js` | Stripe subscription lifecycle management with DB integration | |
| `twilio-sms.js` | Twilio SMS sending with error handling and delivery tracking | |
| `webhook-handler.js` | Stripe webhook Express middleware | |
| `webhook-processor.js` | Comprehensive Stripe subscription webhook event processing | |

### routes/ — API Route Handlers

| File | Endpoints | Notes |
|------|-----------|-------|
| `billing.js` | `/api/billing/*` — agent billing operations | Base billing routes |
| `billing-enhanced.js` | `/api/billing-enhanced/*` — full subscription lifecycle | **Canonical** — use over billing.js |
| `calcom.js` | `/api/calcom/*` — booking link integration | |
| `calcom-webhooks.js` | `/api/calcom/webhooks/*` — webhook management CRUD | |
| `webhooks-calcom.js` | `/api/webhooks/calcom` — inbound Cal.com webhook receiver | |
| `cron-pilot-conversion.js` | `/api/cron/pilot-conversion` — daily conversion email trigger | Vercel cron |
| `customers.js` | `/api/customers/*` — customer CRUD operations | |
| `pilot-conversion.js` | `/api/pilot-conversion/*` — manual trigger and status | |
| `portal.js` | `/api/portal/*` — Stripe customer portal sessions | |

## Test Organization

| Directory | Purpose | Count |
|-----------|---------|-------|
| `tests/unit/` | Unit tests — isolated module tests | 11 files |
| `tests/integration/` | Integration tests — cross-module and API tests | 15 files |
| `tests/e2e/` | End-to-end tests — full flow verification | 34 files |
| `tests/browser/` | Playwright browser tests — UI page verification | 4 specs |
| `tests/genome/` | Genome infrastructure tests | 3 test files |
| `tests/` (root) | Legacy tests — should be moved to subdirs over time | ~90 files |
| `product/lead-response/dashboard/__tests__/` | Dashboard-specific tests (Next.js) | |
| `frontend/__tests__/` | Legacy frontend tests (GA4, landing page) | |
| `e2e/` | Standalone E2E suite with own Playwright config | |

## Scripts Organization

| Directory | Purpose | Examples |
|-----------|---------|---------|
| `scripts/db/` | Database migrations, table setup, data fixes | `migrate.js`, `auto-create-tables.js`, `setup-calcom-tables.js` |
| `scripts/diagnostics/` | Codebase analysis, debugging, verification | `check-db.js`, `check-tables.js`, `test-comprehensive.js` |
| `scripts/stripe/` | Stripe-specific utilities | `verify-stripe-env.js`, `sync-stripe-tasks.js` |
| `scripts/tasks/` | Task management (query, reset, cleanup) | `query-tasks.js`, `reset-zombies.js`, `cleanup-duplicates.js` |
| `scripts/utilities/` | General-purpose utilities and tools | `completion-report.js`, `auto-spawn.js`, `first-lead-simulation.js` |
| `scripts/shell/` | Shell scripts (heartbeat, watchdog, spawn) | `orchestrator-heartbeat-runner.sh`, `watchdog-orchestrator.sh` |
| `scripts/migrations/` | Migration documentation | |
| `scripts/` (root) | Unsorted scripts — should be moved to subdirs | ~70 files |

## File Placement Rules

These rules define where new files belong. Enforced by genome codebase rules.

### Code Files
- **New backend modules** go in `lib/`
- **New API routes** go in `routes/`
- **New integration code** goes in `integrations/`
- **Dashboard code** goes in `product/lead-response/dashboard/` (Next.js App Router structure)

### Scripts
- **Database migrations/setup** go in `scripts/db/`
- **Diagnostic/debugging scripts** go in `scripts/diagnostics/`
- **Stripe utilities** go in `scripts/stripe/`
- **Task management** go in `scripts/tasks/`
- **Shell scripts** go in `scripts/shell/`
- **Everything else** goes in `scripts/utilities/`
- **Never put scripts in the repo root.** Only `server.js`, `playwright.config.js`, and config files belong at root.

### Tests
- **Unit tests** go in `tests/unit/`
- **Integration tests** go in `tests/integration/`
- **End-to-end tests** go in `tests/e2e/`
- **Browser/Playwright tests** go in `tests/browser/`
- **Genome tests** go in `tests/genome/`
- **Never put new tests in `tests/` root.** Existing root tests are legacy and should be migrated.
- **Dashboard tests** go in `product/lead-response/dashboard/__tests__/`

### Documentation
- **PRDs** go in `docs/prd/` (filename: `PRD-*.md`)
- **Design specs** go in `docs/design/`
- **Guides** go in `docs/guides/`
- **Reports** go in `docs/reports/`
- **Marketing handoffs** go in `docs/marketing-handoff/`

### Database Schema
- **Schema reference**: `SCHEMA.md` — slim index with domain links and quick table lookup
- **Domain details**: `schema/<domain>.md` — load only the domain you need (agents, crm, communications, bookings, billing, analytics, orchestration)
- **Auto-generated** every heartbeat from live PostgreSQL — do NOT edit manually

### SQL
- **Numbered migrations** go in `migrations/` (format: `NNN_description.sql`)
- **One-off schemas** go in `sql/`

### What Belongs at Repo Root
Only these files should be at the repo root:
- `server.js` — API entry point
- `playwright.config.js` — test config
- `package.json` / `package-lock.json` — dependencies
- `vercel.json` — deployment config
- `project.config.json` — genome project identity
- `.eslintrc.json` — linting config
- Symlinks to genome core (`project-config-loader.js`, `task-store.js`, `subagent-completion-report.js`)
- Documentation markdown files (`CLAUDE.md`, `ARCHITECTURE.md`, `README.md`, etc.)
- Agent state files (`.*.json` dotfiles)
