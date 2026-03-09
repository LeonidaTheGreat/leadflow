---
title: LeadFlow Architecture Summary
author: Stojan & Leonida
date: 2026-03-09
---

# LeadFlow Autonomous System Architecture

## Overview

A self-improving, self-testing, self-tasking agent swarm for LeadFlow AI with:
- Telegram-based orchestrator control (bidirectional commands)
- Heartbeat-driven automation (5-min cycles) + realtime dispatcher (2-min cycles)
- 6-loop orchestration (Execution, QC, Product, Learning, Revenue Intelligence, Distribution)
- Dynamic model selection (Kimi → Haiku → Sonnet → Opus)
- Quality metrics tracking + self-learning
- Dashboard with Tailscale access

---

## System Components

### 1. Control Layer (Telegram)

**Purpose:** Human ↔ Orchestrator interaction

**Implementation:** `telegram-commands.js` in Genome (`~/.openclaw/genome/commands/`)

**Commands:**
```
!status          — system status, budget, active tasks
!fix <desc>      — create a dev fix task
!feature <desc>  — create a feature task (PM→Dev→QC workflow)
!set-budget <$>  — set daily budget
!spawn <agent>   — manually spawn an agent
!pause / !resume — pause/resume orchestration
```

Also accessible via CLI: `~/bin/fix` and `~/bin/feature`

---

### 2. Automation Layer (Heartbeat + Realtime Dispatcher)

**Purpose:** Background orchestration without human intervention

**Heartbeat** (`heartbeat-executor.js`): macOS LaunchAgent, runs every 5 minutes
- Runs all 6 loops (see below)
- Generates project docs from Supabase
- Runs smoke tests
- Sends Telegram summary

**Realtime Dispatcher** (`realtime-dispatcher.js`): Long-running launchd service, polls every 2 minutes
- Monitors active agent PIDs
- Detects zombie/idle/dead agents
- Handles task completion (verification, PR creation, chain next agent)
- Budget reconciliation (real token costs vs estimates)
- Completion scan with retry + model escalation

---

### 3. Intelligence Layer (Model Selection)

**Purpose:** Optimize cost vs quality automatically

**Implementation:** `selectInitialModel()` in `workflow-engine.js`

```
Task Received
    ↓
Assess Complexity (1-10 from UC or heuristic)
    ↓
Select Initial Model (MODEL_LADDER):
  - Kimi (Moonshot): Low complexity
  - Haiku: Medium complexity
  - Sonnet: High complexity
  - Opus: Critical tasks (requires high complexity score)
    ↓
Spawn Agent
    ↓
Monitor Result (realtime dispatcher)
    ↓
If Failed → Escalate to next model (escalateModel())
    ↓
Log actual cost + learning outcome
```

**Cost tracking:** Real token-based costs from session `.jsonl` files, with per-model pricing in `project.config.json`.

---

### 4. Notification Layer (Telegram)

**Purpose:** Real-time visibility into system operations

**What you get:**
- Agent completion notifications (with cost + duration)
- Heartbeat summaries (tasks spawned, completed, blocked)
- Budget alerts (approaching/exceeded daily limit)
- Smoke test failure escalations
- PR merge/conflict notifications

---

### 5. Visualization Layer (Dashboard)

**Purpose:** Real-time project status anywhere

**Access:** `https://stojanadmins-mac-mini.tail3ca16c.ts.net/` (Tailscale)

**Location:** `~/.openclaw/dashboard/dashboard.html` (system-level, not in this repo)

**Sections:**
1. **Agent Activity** — Dynamic discovery from Supabase tasks
2. **Task Queue** — In Progress → Ready → Blocked
3. **Cost Tracking** — Today + all-time, per-model breakdown
4. **Orchestrator Quality** — Heartbeat metrics
5. **Product Quality** — UC coverage, E2E test specs
6. **QC Status** — Code reviews

**Server:** `python3 -m http.server 8787` via launchd

---

## 6-Loop Orchestration

> **Full documentation: [`docs/6-LOOP-ARCHITECTURE.md`](docs/6-LOOP-ARCHITECTURE.md)**

The orchestration system runs 6 interconnected loops:

1. **Project Execution Loop** — UC roadmap drives task creation, workflow chaining (PM→Dev→QC), and UC completion tracking.
2. **Quality Control Loop** — Feature branches, automated PRs, QC agent review, auto-merge/rework, GitHub Actions CI, merge conflict resolution.
3. **Product Iteration Loop** — Feedback from E2E tests, PostHog, and pilot users is ingested, processed by PM agent, and routed back into the execution loop.
4. **Self-Learning Loop** — Decision tracking, learning system, self-heal checks, and cross-loop model escalation.
5. **Revenue Intelligence Loop** — Pilot agent tracking, conversion metrics, pricing optimization, churn risk detection.
6. **Distribution Loop** — Landing page optimization, SEO, content marketing, social proof collection, referral tracking.

**Key schema:** `supabase/migrations/004_project_hierarchy.sql` (PRDs, use_cases, metrics, code_reviews, product_feedback)

**Key files (all in `~/.openclaw/genome/`):**
- `core/heartbeat-executor.js` — all 6 loops
- `core/spawn-consumer.js` — branches + spawn context
- `core/realtime-dispatcher.js` — completion monitoring + zombie detection
- `core/workflow-engine.js` — model selection, budget, PR creation, verification
- `intelligence/learning-system.js` — outcome tracking
- `health/self-heal.js` — system health checks

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  YOU (Telegram)                                        │
│  ├─ Commands (!fix, !feature, !status) → Orchestrator  │
│  └─ Get notifications ← Heartbeat + Dispatcher        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (Telegram + Heartbeat)                   │
│  ├─ Score & prioritize UC roadmap                      │
│  ├─ Spawn agents via spawn-consumer                    │
│  ├─ Monitor via realtime-dispatcher                    │
│  └─ Report via Telegram notifications                  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  HEARTBEAT (Every 5 min) + DISPATCHER (Every 2 min)    │
│  ├─ Check Supabase tasks table                         │
│  ├─ Spawn agents for ready tasks                       │
│  ├─ Monitor PIDs, detect zombies                       │
│  ├─ Handle completions (verify, PR, chain)             │
│  └─ Run smoke tests, generate docs                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  AGENTS (Dev/QC/Design/Product/Marketing/Analytics)    │
│  ├─ Work on tasks (feature branches for dev/design)    │
│  ├─ Write completion reports                           │
│  └─ Costs tracked from session token usage             │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

```
leadflow/
├── project.config.json         # Project identity card (read by Genome)
├── server.js                   # Main API entry point
├── package.json                # Dependencies and scripts
├── CLAUDE.md                   # Project context for agents
│
├── routes/                     # API routes
├── lib/                        # Shared libraries
├── integrations/               # FUB, Cal.com, Stripe, Supabase
│
├── product/
│   └── lead-response/
│       └── dashboard/          # Next.js customer dashboard (Vercel: leadflow-ai)
│
├── supabase/
│   └── migrations/             # Database migrations
│
├── agents/                     # Agent configs (SOUL.md, SKILLS.md)
│   ├── orchestrator/
│   ├── dev/
│   ├── qc/
│   ├── design/
│   ├── marketing/
│   └── analytics/
│
├── docs/                       # API design docs
│   └── 6-LOOP-ARCHITECTURE.md  # Full orchestration docs
│
├── scripts/                    # Utility scripts
│   └── generate-project-docs.js
│
└── *.js (symlinks)             # Orchestration files → ~/.openclaw/genome/core/
```

---

## Management Commands

### Realtime Dispatcher
```bash
# Check status
launchctl list | grep realtime-dispatcher

# View logs
tail -f /tmp/openclaw/leadflow-realtime-dispatcher.log

# Restart (picks up code changes)
launchctl stop ai.openclaw.leadflow.realtime-dispatcher
```

### Heartbeat
```bash
# Check status
launchctl list | grep leadflow.heartbeat

# View logs
tail -f /tmp/openclaw/leadflow-heartbeat.log
```

### Dashboard
```bash
# Check status
launchctl list | grep dashboard-server

# Access
open https://stojanadmins-mac-mini.tail3ca16c.ts.net/
```

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Telegram Bot | Running | Bidirectional commands |
| Heartbeat | Running | Every 5 min via launchd |
| Realtime Dispatcher | Running | 2-min poll cycle |
| Dashboard | Running | Port 8787, Tailscale |
| Model Selection | Active | Kimi primary, Haiku/Sonnet escalation |
| Smoke Tests | Active | Every heartbeat |
| Dev Agent | Active | Spawned per-task |
| QC Agent | Active | Auto-chained after dev |

---

*Architecture v2.0 - 2026-03-09 (updated from v1.0 2026-02-23)*
