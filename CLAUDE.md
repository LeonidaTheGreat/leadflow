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
- `integrations/` — FUB, Cal.com, Stripe, Supabase
- `agents/` — agent configs
- `docs/` — API design docs (including leadflow-api-design.md)
- `scripts/` — utility scripts

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

## Orchestration (4-Loop Architecture)
The system runs 4 automated loops via `heartbeat-executor.js` (every 5 min):
1. **Execution** — UC roadmap → queue replenishment → workflow chaining → UC completion
2. **QC** — feature branches → PRs → QC review → auto-merge/rework → CI
3. **Product** — feedback ingestion → PM analysis → priority re-ordering
4. **Learning** — decision tracking → model escalation → self-heal

**Realtime Dispatcher:** `realtime-dispatcher.js` is a **long-running** Supabase Realtime listener (launchd: `ai.openclaw.bo2026.realtime-dispatcher`). It reacts instantly to task status changes (done → chain next, ready → spawn). **IMPORTANT:** It caches Node.js modules at startup. After editing `workflow-engine.js`, `spawn-consumer.js`, or `task-store.js`, restart it with: `launchctl stop ai.openclaw.bo2026.realtime-dispatcher` (KeepAlive auto-restarts). Logs: `/tmp/openclaw/bo2026-realtime-dispatcher.log`.

**Role Directives:** `buildRoleContext()` in `workflow-engine.js` is the single source of truth for agent role enforcement. All task creation paths (replenishQueue, chainTask, spawn-consumer) use it.

**Schema:** `supabase/migrations/004_project_hierarchy.sql` adds: `prds`, `use_cases`, `e2e_test_specs`, `metrics`, `code_reviews`, `product_feedback` + `tasks.use_case_id`, `tasks.branch_name`, `tasks.pr_number`

**Seed data:** `scripts/seed-project-hierarchy.js` (3 PRDs, 12 UCs with workflows)

**Full docs:** `docs/4-LOOP-ARCHITECTURE.md`

## Dashboard
The live execution dashboard has moved to `~/.openclaw/dashboard/` — it's a system-level orchestration tool, not a LeadFlow product artifact.
- **Location:** `~/.openclaw/dashboard/dashboard.html`
- **HTTP server:** `python3 -m http.server 8787 --bind 127.0.0.1` (managed by launchd via `~/.openclaw/workspace/scripts/dashboard-server.sh`)
- **Data source:** All sections pull from Supabase (project `bo2026`), never local JSON files
- **Supabase client variable:** Named `sb` (not `supabase`) to avoid collision with the CDN's global `var supabase`
- **API key:** Uses the service_role key (anon key is invalid for these tables)
- **Tailscale access:** https://stojanadmins-mac-mini.tail3ca16c.ts.net — accessible from all tailnet devices
  - `/` → dashboard on port 8787
  - `/live` → BO2026 dashboard on port 3000
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

Full PRD documents (`PRD-*.md`) **are** agent-authored. When creating or modifying a PRD doc, update the `prds` table (`file_path`, `status`, `version`).

## Active Blockers (as of Feb 2026)
- Pilot agent recruitment pending Stojan approval
- Landing page needs design handoff
- A2P 10DLC SMS compliance registration pending
