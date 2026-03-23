# LeadFlow AI — Project Context

## What is LeadFlow
Real estate AI lead response service. Responds to leads via SMS in <30 seconds,
integrates with Follow Up Boss (FUB) CRM, books appointments via Cal.com.
**Goal:** $20K MRR within 60 days of pilot start.

## Current Status
- MVP: ✅ Complete
- Phase: Pilot (recruiting first 3 free pilot agents)
- Day ~12 of 60
- Deployed on Vercel

## Key Directories
- `routes/` — API routes
- `frontend/` — dashboard UI
- `integrations/` — FUB, Cal.com, Stripe
- `agents/` — agent configs
- `config/` — strategy and runtime config JSON (strategy-config.json, swarm-config.json, budget-tracker.json)
- `scripts/` — utility scripts organized by purpose:
  - `scripts/db/` — database diagnostics and migrations
  - `scripts/stripe/` — Stripe-specific utility scripts
  - `scripts/tasks/` — task management utilities
  - `scripts/diagnostics/` — general diagnostic scripts
- `docs/` — documentation organized by type:
  - `docs/prd/` — Product Requirements Documents (PRD-*.md)
  - `docs/design/` — Design specs and content briefs
  - `docs/guides/` — How-to guides and reference docs
  - `docs/reports/` — Completion reports and analysis
- `tests/` — consolidated test directory:
  - `tests/e2e/` — end-to-end tests
  - `tests/integration/` — integration tests
  - `tests/unit/` — unit tests

## Key Files
- `server.js` — main entry point
- `ARCHITECTURE.md` — system architecture (includes 4-loop overview)
- `docs/guides/4-LOOP-ARCHITECTURE.md` — full 4-loop orchestration docs (schema, loops, heartbeat order, extending)
- `HEARTBEAT.md` — heartbeat spec (includes 4-loop execution order)
- `SKILLS.md` — orchestrator skills (includes 4-loop skills 12-16)
- `AGENTS.md` — agent configuration
- `PMF.md` — pricing, ICP, GTM strategy
- `USE_CASES.md` — product use cases
- `package.json` — dependencies and scripts

## Tech Stack
- Node.js / Express
- PostgreSQL (local, on Mac Mini)
- Vercel (deployment)
- Cloudflare Tunnel (public API access via `api.imagineapi.org`)
- Stripe (billing)
- Cal.com (appointment booking)
- Follow Up Boss API (CRM)
- Twilio (SMS)

## Pricing Tiers
- Starter: $49/mo — 100 SMS, basic AI
- Pro: $149/mo — unlimited SMS, full AI
- Team: $399/mo — 5 agents
- Brokerage: $999+/mo — white-label

## OpenClaw Agents (do not modify their configs)
All agents point to this directory. Active agents:
- leadflow-orchestrator — runs heartbeat, posts to Telegram
- leadflow-dev — development tasks
- leadflow-qc — quality control
- leadflow-analytics — analytics
- leadflow-product — product management
- leadflow-marketing — marketing
- leadflow-design — design

## Critical Rules
- This repo lives at `~/projects/leadflow` (GitHub: `LeonidaTheGreat/leadflow`)
- OpenClaw agents are actively running against this codebase
- Always run `npm test` before suggesting any deployment
- Stripe is in production — be careful with any data scripts
- Never modify `agents.json` or agent config files without explicit instruction
- `.env` and `.env.local` contain production Stripe/Twilio/API credentials — never delete or overwrite
- System-level backup at `~/.env` — if credentials go missing, restore from `~/.env`
- `~/.env` contains: `LOCAL_PG_URL`, `LEADFLOW_API_KEY`, `ORCHESTRATOR_BOT_TOKEN`, `PRODUCT_MANAGER_BOT_TOKEN`
- Database is local PostgreSQL (`LOCAL_PG_URL`). Supabase has been fully removed.
- TaskStore has a self-healing fallback chain: `process.env` → `__dirname/.env` → `__dirname/.env.local` → `~/.env`

## Orchestration (Genome — extracted to `~/.openclaw/genome/`)
The orchestration engine ("Genome") has been extracted to its own repo: `LeonidaTheGreat/openclaw-genome`.
All heartbeat, spawning, learning, health, and dashboard generation code now lives in `~/.openclaw/genome/`.

**What stays in this repo:**
- `project.config.json` — project identity card (read by Genome)
- `project-config-loader.js` → symlink to `~/.openclaw/genome/core/`
- `task-store.js` → symlink to `~/.openclaw/genome/core/`
- `subagent-completion-report.js` → symlink to `~/.openclaw/genome/core/`
- Product code: `server.js`, `routes/`, `lib/`, `product/`

**Genome docs:** `~/.openclaw/genome/CLAUDE.md`, `~/.openclaw/genome/ARCHITECTURE.md`

**Realtime Dispatcher:** Long-running service at `~/.openclaw/genome/core/realtime-dispatcher.js`. Restart with: `launchctl stop ai.openclaw.leadflow.realtime-dispatcher`

**Full docs:** `docs/guides/4-LOOP-ARCHITECTURE.md`

## Dashboard
The live execution dashboard has moved to `~/.openclaw/dashboard/` — it's a system-level orchestration tool, not a LeadFlow product artifact.
- **Location:** `~/.openclaw/dashboard/dashboard.html`
- **HTTP server:** Node.js server at `~/.openclaw/dashboard/server.js` (managed by launchd via `~/.openclaw/workspace/scripts/dashboard-server.sh`)
- **Data source:** All sections pull from local PostgreSQL via REST API on port 8787
- **Inline PostgREST client:** `window.localDB` (replaced Supabase CDN)
- **Tailscale access:** https://stojanadmins-mac-mini.tail3ca16c.ts.net — accessible from all tailnet devices
  - `/` → dashboard on port 8787
  - `/live` → LeadFlow dashboard on port 3000
- **Public API:** `https://api.imagineapi.org` — Cloudflare Tunnel → port 8788 (API key auth required)
  - Used by Vercel for database access
  - launchd service: `com.cloudflare.leadflow-tunnel`

## Vercel Deployment

Two separate Vercel projects deploy different parts of the codebase:

| Project | Production URL | Source Directory | What |
|---------|---------------|-----------------|------|
| `leadflow-ai` | `leadflow-ai-five.vercel.app` | `product/lead-response/dashboard/` | Next.js customer dashboard |
| `fub-inbound-webhook` | `fub-inbound-webhook.vercel.app` | repo root (`server.js`) | FUB webhook API |

### Deploying the Dashboard (leadflow-ai)
```bash
cd ~/projects/leadflow/product/lead-response/dashboard
vercel --prod
```
- The directory is linked to the `leadflow-ai` project via `.vercel/project.json`
- Framework: Next.js — `npm run build` → `next build`
- Node.js 24.x
- Env vars are configured in Vercel project settings (not local `.env`)
- No GitHub auto-deploy — all deployments are CLI-only

### Deploying the Webhook (fub-inbound-webhook)
```bash
cd ~/projects/leadflow
vercel --prod
```
- Root `.vercel/project.json` points to `fub-inbound-webhook`
- Uses `@vercel/node` to run `server.js`

### Vercel CLI
- Installed at `/opt/homebrew/bin/vercel` (v50.17.1)
- Authenticated as `madzunkov-3285` under team `stojans-projects-7db98187`
- Non-interactive flags: `--yes --scope stojans-projects-7db98187` (or use `--prod` after linking)

### Health Check
- Dashboard health endpoint: `/api/health` (server-side, checks env vars + database connectivity)
- Smoke tests run every heartbeat via `smoke-tests.js` — checks both Vercel projects
- Failures auto-spawn QC → dev investigation pipeline

### Important
- Do NOT run `vercel link` in the repo root (it's already linked to `fub-inbound-webhook`)
- Do NOT run `vercel link` in `product/lead-response/dashboard/` (already linked to `leadflow-ai`)
- After merging code that affects the dashboard, deploy with `cd product/lead-response/dashboard && vercel --prod`
- Vercel env vars are separate from local `.env` files — changes to one do not affect the other

## Generated Files (auto-updated every heartbeat)
The following .md files are **auto-generated** from the database by `scripts/generate-project-docs.js`. They regenerate every heartbeat — do NOT manually edit them:
- `USE_CASES.md` — from `use_cases` + `prds` tables
- `E2E_MAPPINGS.md` — from `e2e_test_specs` + `use_cases` tables
- `PRD_INDEX.md` — from `prds` table
- `DASHBOARD.md` — from `generate-dashboard-complete.js`
- `JOURNEYS.md` — from `project.config.json` journeys + `product_reviews` table (journey type)

Full PRD documents (`PRD-*.md`) **are** agent-authored. When creating or modifying a PRD doc, update the `prds` table (`file_path`, `status`, `version`).

Journey definitions live in `project.config.json` → `journeys[]`. The PM agent is responsible for reviewing and maintaining these — adding new journeys as the product evolves, updating steps when flows change, and triggering manual reviews via `!journey-review`.

## Active Blockers (as of Feb 2026)
- Pilot agent recruitment pending Stojan approval
- Landing page needs design handoff
- A2P 10DLC SMS compliance registration pending
