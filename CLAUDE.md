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
- `integrations/` — FUB, Cal.com, Stripe, Supabase
- `lib/` — shared business logic and utilities
- `agents/` — agent configs
- `product/` — product-specific code
- `sql/` — SQL migration files and schema
- `config/` — JSON config files (budget-tracker.json, strategy-config.json, swarm-config.json)
- `scripts/` — utility scripts
  - `scripts/migrations/` — DB migration runners and table setup
  - `scripts/diagnostics/` — check, verify, query scripts
  - `scripts/simulation/` — lead flow simulation
  - `scripts/one-off/` — one-time fix and cleanup scripts
- `tests/` — all tests
  - `tests/e2e/` — end-to-end tests
  - `tests/integration/` — integration tests
  - `tests/unit/` — unit tests
- `docs/` — all documentation
  - `docs/prd/` — PRD-*.md product requirements
  - `docs/design/` — DESIGN-*.md design specs
  - `docs/guides/` — integration guides (Stripe, Cal.com, Resend, etc.)
  - `docs/reports/` — completion reports and analyses
- `completion-reports/` — auto-generated agent task completion reports
- `PROJECT_STRUCTURE.md` — canonical repo structure reference

## Key Files
- `server.js` — main entry point
- `ARCHITECTURE.md` — system architecture (includes 4-loop overview)
- `docs/4-LOOP-ARCHITECTURE.md` — full 4-loop orchestration docs (schema, loops, heartbeat order, extending)
- `HEARTBEAT.md` — heartbeat spec (includes 4-loop execution order)
- `SKILLS.md` — orchestrator skills (includes 4-loop skills 12-16)
- `AGENTS.md` — agent configuration
- `PMF.md` — pricing, ICP, GTM strategy
- `USE_CASES.md` — product use cases
- `package.json` — dependencies and scripts

## Tech Stack
- Node.js / Express
- Supabase (database)
- Vercel (deployment)
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
- Stripe and Supabase are in production — be careful with any data scripts
- Never modify `agents.json` or agent config files without explicit instruction
- `.env` and `.env.local` contain production Supabase/Stripe/Twilio credentials — never delete or overwrite
- System-level backup at `~/.env` (Supabase creds + Telegram bot tokens) — if credentials go missing, restore from `~/.env`
- `~/.env` contains: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `ORCHESTRATOR_BOT_TOKEN`, `PRODUCT_MANAGER_BOT_TOKEN`
- `SUPABASE_DB_PASSWORD` is the Postgres password for direct DB connections (migrations, DDL). Present in both `~/.env` and `leadflow/.env`
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

**Full docs:** `docs/4-LOOP-ARCHITECTURE.md`

## Dashboard
The live execution dashboard has moved to `~/.openclaw/dashboard/` — it's a system-level orchestration tool, not a LeadFlow product artifact.
- **Location:** `~/.openclaw/dashboard/dashboard.html`
- **HTTP server:** `python3 -m http.server 8787 --bind 127.0.0.1` (managed by launchd via `~/.openclaw/workspace/scripts/dashboard-server.sh`)
- **Data source:** All sections pull from Supabase (project `leadflow`), never local JSON files
- **Supabase client variable:** Named `sb` (not `supabase`) to avoid collision with the CDN's global `var supabase`
- **API key:** Uses the service_role key (anon key is invalid for these tables)
- **Tailscale access:** https://stojanadmins-mac-mini.tail3ca16c.ts.net — accessible from all tailnet devices
  - `/` → dashboard on port 8787
  - `/live` → LeadFlow dashboard on port 3000
  - Config is persistent (survives reboots). Do NOT reconfigure or remove Tailscale serve.

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
- Dashboard health endpoint: `/api/health` (server-side, checks env vars + Supabase connectivity)
- Smoke tests run every heartbeat via `smoke-tests.js` — checks both Vercel projects
- Failures auto-spawn QC → dev investigation pipeline

### Important
- Do NOT run `vercel link` in the repo root (it's already linked to `fub-inbound-webhook`)
- Do NOT run `vercel link` in `product/lead-response/dashboard/` (already linked to `leadflow-ai`)
- After merging code that affects the dashboard, deploy with `cd product/lead-response/dashboard && vercel --prod`
- Vercel env vars are separate from local `.env` files — changes to one do not affect the other

## Generated Files (auto-updated every heartbeat)
The following .md files are **auto-generated** from Supabase by `scripts/generate-project-docs.js`. They regenerate every heartbeat — do NOT manually edit them:
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
