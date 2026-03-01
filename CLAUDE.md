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
- This directory is a symlink from `~/projects/leadflow` → `.openclaw/workspace/projects/leadflow`
- OpenClaw agents are actively running against this codebase
- Always run `npm test` before suggesting any deployment
- Stripe and Supabase are in production — be careful with any data scripts
- Never modify `agents.json` or agent config files without explicit instruction
- `.env` and `.env.local` contain production Supabase/Stripe/Twilio credentials — never delete or overwrite
- System-level backup at `~/.env` (Supabase creds only) — if credentials go missing, restore from `~/.env`
- TaskStore has a self-healing fallback chain: `process.env` → `__dirname/.env` → `__dirname/.env.local` → `~/.env`

## Orchestration (4-Loop Architecture)
The system runs 4 automated loops via `heartbeat-executor.js` (every 5 min):
1. **Execution** — UC roadmap → queue replenishment → workflow chaining → UC completion
2. **QC** — feature branches → PRs → QC review → auto-merge/rework → CI
3. **Product** — feedback ingestion → PM analysis → priority re-ordering
4. **Learning** — decision tracking → model escalation → self-heal

**Schema:** `supabase/migrations/004_project_hierarchy.sql` adds: `prds`, `use_cases`, `e2e_test_specs`, `metrics`, `code_reviews`, `product_feedback` + `tasks.use_case_id`, `tasks.branch_name`, `tasks.pr_number`

**Seed data:** `scripts/seed-project-hierarchy.js` (3 PRDs, 12 UCs with workflows)

**Full docs:** `docs/4-LOOP-ARCHITECTURE.md`

## Dashboard (`dashboard.html`)
The live execution dashboard runs as a static HTML file served over HTTP (not `file://`).
- **Data source:** All sections pull from Supabase (project `bo2026`), never local JSON files
- **Supabase client variable:** Named `sb` (not `supabase`) to avoid collision with the CDN's global `var supabase`
- **API key:** Uses the service_role key (anon key is invalid for these tables)
- **Agent Activity section:** Derived from the `tasks` table grouped by `agent_id`, NOT from the `agents` table
- **KPI "System Health":** Reads from `system_components` table, not `agents`
- **KPI "Tasks":** Done/total from `tasks` table
- **Cost Summary:** Falls back to `estimated_cost_usd` when `actual_cost_usd` is null
- **Orchestrator Quality section:** Reads from `metrics` table (domain=orchestrator, type=heartbeat)
- **Product Quality section:** Reads from `use_cases` + `e2e_test_specs` + `metrics` (domain=product)
- **QC Status section:** Reads from `code_reviews` table
- **Agent Activity:** Dynamic agent discovery from `SELECT DISTINCT agent_id FROM tasks` (not hardcoded list)
- **Task Queue order:** In Progress → Ready to Spawn → Blocked
- **Local HTTP server:** `python3 -m http.server 8787 --bind 127.0.0.1` (managed by launchd, always on)
- **Tailscale access:** https://stojanadmins-mac-mini.tail3ca16c.ts.net — accessible from all tailnet devices
  - `/` → dashboard on port 8787
  - `/live` → BO2026 dashboard on port 3000
  - Config is persistent (survives reboots). Do NOT reconfigure or remove Tailscale serve.

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
