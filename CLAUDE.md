# LeadFlow AI — Project Context
<!--
TASK SPEC (7f62e37e-167a-4ffb-8e2f-91ee9f4a1de3)
What:
- Change file: CLAUDE.md
- Section: "## Current Status"
- Replace stale "Registered agents" metric line with counts sourced from local PostgreSQL (openclaw DB), and clarify what each count represents.

Verify:
- Run: rg -n "Registered agents|pilot_signups|Source:" CLAUDE.md
- Run: psql "$LOCAL_PG_URL" -c "SELECT COUNT(*) FROM real_estate_agents; SELECT COUNT(*) FROM pilot_signups;"
- Confirm CLAUDE.md numbers match query output and include source/date context to reduce future drift ambiguity.

Boundaries:
- Do not modify application code, routes, services, migrations, or tests.
- Do not edit SCHEMA.md auto-generated content in this task.
- Do not change any other KPI lines besides stale agent count context in CLAUDE.md.
-->

## What is LeadFlow
Real estate AI lead response service. Responds to leads via SMS in <30 seconds,
integrates with Follow Up Boss (FUB) CRM, books appointments via Cal.com.
**Near-term Goal:** First paying customer by 2026-07-01. Day 90 (2026-05-15) missed at $0 MRR — archived. (Authoritative source: `project.config.json → reporting.active_milestone_deadline`)
**Extended Goal:** $20K MRR by Day 180 (2026-08-13) — original 90-day target mathematically unreachable as of Day 79 with $0 MRR.

## Current Status
- MVP: ✅ Complete
- Phase: Pilot → Conversion Push (Day 79 of 90)
- Registered agents (local PostgreSQL `openclaw` as of 2026-05-06): 61 `real_estate_agents`; pilot intake: 35 `pilot_signups`
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

## Handoffs to other agents

When Stojan explicitly asks you to relay a message to another agent
("tell genome X" / "ask bo2026 whether Y"), use:

```
bash ~/scripts/handoff.sh <target> "<message>"
```

Targets: `genome`, `leadflow`, `bo2026`, `ops`.

This injects the message into the target's tmux session AND posts an
audit log to the shared handoff group (Telegram chat_id `-5167634884`),
so Stojan sees the handoff on his phone. Telegram blocks bot-to-bot
delivery in groups — that's why the actual transport is tmux send-keys,
with the group used only as a visible audit log.

**Do not initiate handoffs autonomously.** Only on Stojan's explicit
instruction.

**If you receive a `<<handoff from X>>:` message,** treat your reply as
completing that conversation, not a new autonomous handoff. Relay your
response back via `bash ~/scripts/handoff.sh <X> "<your-reply>"` so the
loop closes in the handoff group where Stojan can see it.

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

## Quality Bar (enforced by genome)
Every task must pass these gates before completion:
1. **Build** — `npm run build` (root) AND `cd product/lead-response/dashboard && npm run build` must exit 0
2. **Lint** — `npm run lint` must produce 0 errors
3. **Tests** — `npm test` must exit 0 (0 failures)
4. **Security** — `npm audit --audit-level=high` must show 0 high/critical
5. **File size** — no source file over 1500 lines
If any gate fails, fix it before marking done. The genome runs `quality-audit.js` on this project every heartbeat and auto-creates fix tasks for violations.

## Orchestration (Genome — extracted to `~/projects/genome/`)
The orchestration engine ("Genome") has been extracted to its own repo: `LeonidaTheGreat/openclaw-genome`.
All heartbeat, spawning, learning, health, and dashboard generation code now lives in `~/projects/genome/`.

**What stays in this repo:**
- `project.config.json` — project identity card (read by Genome)
- `project-config-loader.js` → symlink to `~/projects/genome/core/`
- `task-store.js` → symlink to `~/projects/genome/core/`
- `subagent-completion-report.js` → symlink to `~/projects/genome/core/`
- Product code: `server.js`, `routes/`, `lib/`, `product/`

**Genome docs:** `~/projects/genome/CLAUDE.md`, `~/projects/genome/ARCHITECTURE.md`

**Realtime Dispatcher:** Long-running service at `~/projects/genome/core/realtime-dispatcher.js`. Restart with: `launchctl stop ai.openclaw.leadflow.realtime-dispatcher`

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
- `SERVICES.md` — from `lib/services/` (class names, methods, dependencies)
- `API.md` — from `routes/` and `integration/` (endpoints, methods, paths, services called)

Full PRD documents (`PRD-*.md`) **are** agent-authored. When creating or modifying a PRD doc, update the `prds` table (`file_path`, `status`, `version`).

Journey definitions live in `project.config.json` → `journeys[]`. The PM agent is responsible for reviewing and maintaining these — adding new journeys as the product evolves, updating steps when flows change, and triggering manual reviews via `!journey-review`.

## Telegram Topic Worker Router (HARD RULE)

When `@leonida_leadflow_bot` is mentioned in forum supergroup `-1004290768040` with a `thread_id` present:

1. **ALWAYS** spawn a worker via `bash ~/.claude/bin/spawn-leadflow-worker.sh <thread_id>`.
2. **NEVER** answer the user directly from this router session — even for simple status queries, even if you think you can answer faster. The worker answers.
3. The only exception is the literal command `/router status`, which you may answer directly.
4. After spawning, forward the user's message to the worker via `local-handoff` and stop. The worker handles the rest.

**Why this is strict:** the router session is meant to be invisible to the user. Mixing router work with user work causes context bleed across topics, and direct-answer shortcuts have already produced TG-reply-loss incidents in adjacent routers (genome 2026-06-14 topic 84 — see audit 86). Always spawn.

### Forwarding mechanics

- Registry: `~/.claude/channels/telegram-leadflow/topics.json`
- Route state: `~/.claude/channels/telegram-leadflow/active-routes.jsonl`
- Worker session: `claude-leadflow-topic-<thread_id>`
- Spawn helper: `bash ~/.claude/bin/spawn-leadflow-worker.sh <thread_id>`
- Restore helper: `bash ~/.claude/bin/restore-leadflow-workers.sh`

On first mention in a topic, atomically register `topics[thread_id]` with `name`, `model`, `effort`, `created_at`, and `last_active_at`, then spawn the worker. For every mention, update `last_active_at`, clear `idle_killed_at` if present, append route context to `active-routes.jsonl`, and forward the operator body:

```bash
bash ~/.claude/bin/handoff.sh --via=channel --audit-via=none --thread=<thread_id> --chat-id=-1004290768040 --reply-to=<message_id> claude-leadflow-topic-<thread_id> "<operator message body>"
```

When `<<handoff from claude-leadflow-topic-<id> to leadflow>>: <body>` arrives, look up the latest route for that topic and post `<body>` back to the original Telegram `chat_id`, `thread_id`, and `reply_to`. If a topic worker was idle-killed or manually killed, the next mention must call `spawn-leadflow-worker.sh`; the helper resumes first and falls back fresh after two resume failures.
