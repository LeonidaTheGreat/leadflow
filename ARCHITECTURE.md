---
title: LeadFlow Architecture Summary
author: Stojan & Leonida
date: 2026-02-23
---

# LeadFlow Autonomous System Architecture

## Overview

A self-improving, self-testing, self-tasking agent swarm for LeadFlow AI with:
- ✅ Discord-based orchestrator control
- ✅ Telegram notifications for visibility  
- ✅ Heartbeat-driven automation (15-min cycles)
- ✅ Dynamic model selection (Qwen → Haiku → Sonnet)
- ✅ Quality metrics tracking
- ✅ Dashboard with Tailscale access

---

## System Components

### 1. Control Layer (Discord)

**Purpose:** Human → Orchestrator interaction

**Location:** `#orchestrator` channel in "Leonida HQ" Discord server

**How it works:**
- You @mention the bot for status/commands
- Bot responds with current project state
- Cannot auto-respond (requires @mention by design)

**Commands:**
```
@Openclaw Orchestrator status
@Openclaw Orchestrator spawn marketing agent
@Openclaw Orchestrator list blocked tasks
```

**Why not persistent threads?**
- Discord thread binding requires `applications.commands` OAuth scope
- Current implementation works with @mentions (actually safer)
- Future: Can add auto-response with config change

---

### 2. Automation Layer (Heartbeat)

**Purpose:** Background orchestration without human intervention

**Implementation:** macOS LaunchAgent running every 15 minutes

**What it does:**
1. **Dashboard Auto-Sync** (`update_dashboard.py`)
   - Reads `task-tracker.json`
   - Updates `DASHBOARD.md` and `dashboard.html`

2. **Task Dispatcher** (`task-dispatcher.ts`)
   - Scores tasks by impact (distance to revenue)
   - Identifies newly unblocked tasks
   - Writes spawn configs (triggers agent spawning)

3. **Agent Notifications** (`agent-notifier.ts`)
   - Checks for completed subagents
   - Sends Telegram summary

4. **TG-Discord Bridge** (`tg-discord-bridge.ts`)
   - Forwards Discord updates to Telegram topic
   - **CONFIGURABLE:** Reads from `.notifications.json`

5. **Git Auto-Sync**
   - Commits safe files (memory/, docs/)
   - Pushes to origin/main

---

### 3. Intelligence Layer (Model Selection)

**Purpose:** Optimize cost vs quality automatically

**Implementation:** `lib/model-selector.ts` + `lib/dynamic-orchestrator.ts`

**How it works:**

```
Task Received
    ↓
Assess Complexity (1-10 scale)
    ↓
Select Initial Model:
  - Qwen (free): Complexity ≤5
  - Haiku ($4/M): Complexity ≤7  
  - Sonnet ($15/M): Complexity ≤9
  - Opus ($75/M): Complexity 10 (requires approval)
    ↓
Spawn Agent
    ↓
Monitor Result
    ↓
If Failed → Escalate to next model
    ↓
Log Metrics for Dashboard
```

**Metrics Tracked:**
- Success rate by model
- Average tokens per task
- Escalation rate
- Cost per task
- Quality score (1-5)

**Dashboard Shows:**
- Model performance comparison
- Recommendations ("Use Qwen more" / "Escalate earlier")
- Cost tracking vs budget

---

### 4. Notification Layer (Telegram)

**Purpose:** Keep you informed without Discord context-switching

**Implementation:** Configurable via `.notifications.json`

**Current Config:**
```json
{
  "projectName": "leadflow-ai",
  "discord": {
    "enabled": true,
    "channelId": "orchestrator",
    "useThreads": false
  },
  "telegram": {
    "enabled": true,
    "target": "telegram:-1003852328909:topic:10171",
    "bidirectional": false
  },
  "primaryInterface": "telegram"
}
```

**What you get in Telegram:**
- Agent completion notifications
- Dashboard updates
- Orchestrator status summaries
- Blocker alerts

**Bi-directional?** Currently Discord → Telegram only
- Telegram → Discord would require webhook setup
- Can be enabled by setting `bidirectional: true` + webhook config

---

### 5. Visualization Layer (Dashboard)

**Purpose:** Real-time project status anywhere

**Access:** http://100.117.143.114:3000/dashboard.html (Tailscale)

**Sections:**
1. **Agent Activity** - Live status of all 5 agents
2. **Model Performance** - Success rates, costs, recommendations
3. **This Week's Plan** - Execution roadmap
4. **Milestones** - Progress toward $20K MRR
5. **Model Selection Log** - Auto-escalation history

**Auto-refresh:** Every 60 seconds

**Server:** Always-on via LaunchAgent

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│  YOU (Telegram)                                        │
│  ├─ Ask questions → Main session (me)                 │
│  └─ Get notifications ← Heartbeat bridge              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  ORCHESTRATOR (Discord)                                │
│  ├─ Spawn agents via sessions_spawn                   │
│  ├─ Monitor via subagents list                        │
│  └─ Report via Telegram bridge                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  HEARTBEAT (Every 15 min)                              │
│  ├─ Check task-tracker.json                           │
│  ├─ Update dashboard                                   │
│  ├─ Spawn agents for unblocked tasks                  │
│  └─ Send notifications                                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  AGENTS (Dev/Marketing/Design/QC/Analytics)            │
│  ├─ Work on tasks                                      │
│  ├─ Log to NOTES/                                      │
│  ├─ Update task-tracker.json                          │
│  └─ Auto-announce completion                           │
└─────────────────────────────────────────────────────────┘
```

---

## File Structure

```
leadflow/
├── .notifications.json          # ← NEW: Configurable targets
├── .project.json                # Project metadata
├── task-tracker.json            # Source of truth
├── dashboard.html               # Auto-updated visualization
├── DASHBOARD.md                 # Auto-updated markdown
│
├── lib/
│   ├── model-selector.ts        # Complexity → Model mapping
│   └── dynamic-orchestrator.ts  # Auto-escalation logic
│
├── scripts/
│   ├── heartbeat.sh             # Master automation script
│   ├── setup-autonomous.sh      # One-time setup
│   ├── setup-notifications.ts   # ← NEW: Interactive config
│   ├── tg-discord-bridge.ts     # Discord → Telegram
│   ├── task-dispatcher.ts       # Auto-spawn logic
│   ├── agent-notifier.ts        # Completion notifications
│   └── update_dashboard.py      # Dashboard sync
│
├── agents/
│   ├── orchestrator/
│   │   ├── SOUL.md              # Personality & principles
│   │   ├── SKILLS.md            # Capabilities (includes model mgmt)
│   │   └── NOTES/               # Activity logs
│   ├── dev/
│   ├── marketing/
│   ├── design/
│   ├── qc/
│   └── analytics/
│
└── proposals/                   # Template improvements
    └── template-improvement-*.md
```

---

## Management Commands

### Dashboard Server
```bash
# Check status
launchctl list | grep leadflow.dashboard

# View logs
tail -f /tmp/openclaw/leadflow-dashboard.log

# Restart
launchctl unload ~/Library/LaunchAgents/ai.openclaw.leadflow.dashboard.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.leadflow.dashboard.plist
```

### Heartbeat
```bash
# Check status
launchctl list | grep leadflow.heartbeat

# View logs
tail -f /tmp/openclaw/leadflow-heartbeat.log

# Manual run
cd leadflow && bash scripts/heartbeat.sh
```

### Notification Config
```bash
# Reconfigure targets
npx ts-node scripts/setup-notifications.ts

# Edit manually
vim .notifications.json
```

---

## Current Status

| Component | Status | Notes |
|-----------|--------|-------|
| Discord Bot | ✅ Working | @mention required |
| Orchestrator | ✅ Spawned | Running in Discord |
| Heartbeat | ✅ Running | Every 15 min |
| Dashboard Server | ✅ Running | Port 3000, Tailscale |
| Model Selector | ✅ Ready | Will auto-escalate |
| TG Bridge | ✅ Configured | Discord → Telegram |
| Dev Agent | ✅ Completed | TASK-001 done |
| Marketing Agent | 🟡 Ready to spawn | Unblocked by Dev |

---

## 4-Loop Orchestration (v2 Architecture)

> **Full documentation: [`docs/4-LOOP-ARCHITECTURE.md`](docs/4-LOOP-ARCHITECTURE.md)**

As of 2026-03-01, the orchestration system runs 4 interconnected loops:

1. **Project Execution Loop** -- UC roadmap drives task creation, workflow chaining (PM->Dev->QC), and UC completion tracking. Replaces manual task creation.
2. **Quality Control Loop** -- Feature branches, automated PRs, QC agent review, auto-merge/rework, GitHub Actions CI.
3. **Product Iteration Loop** -- Feedback from E2E tests, PostHog, and pilot users is ingested, processed by PM agent, and routed back into the execution loop.
4. **Self-Learning Loop** -- Decision tracking, learning system, self-heal checks, and cross-loop model escalation.

**Key schema:** `supabase/migrations/004_project_hierarchy.sql` (PRDs, use_cases, metrics, code_reviews, product_feedback)

**Key files:** `heartbeat-executor.js` (all loops), `spawn-consumer.js` (branches + spawn context), `learning-system.js`, `self-heal.js`, `orchestrator-decision-tracker.js`

---

## Next Steps

1. **Monitor:** Heartbeat will spawn Marketing agent automatically
2. **Access:** Dashboard at http://100.117.143.114:3000/dashboard.html
3. **Control:** @mention bot in Discord for status
4. **Receive:** Telegram notifications in Business Opportunities topic

---

## For New Projects

```bash
# 1. Instantiate from template
cd templates/project-pod-v1
./instantiate.sh --name "new-project" --goal "$10K MRR" --deadline "30 days"

# 2. Configure notifications
cd ~/projects/new-project
npx ts-node scripts/setup-notifications.ts
# (Interactive: choose Discord channel, Telegram group, etc.)

# 3. Setup automation
bash scripts/setup-autonomous.sh

# 4. Spawn orchestrator
# In Discord: @YourBot spawn orchestrator
```

---

*Architecture v1.0 - 2026-02-23*
