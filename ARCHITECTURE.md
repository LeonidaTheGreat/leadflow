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

---

## UC State Machine (added 2026-03-24)

Use case `implementation_status` follows a formal state machine. Each transition has ONE owner handler — no other handler may make that transition.

### States

| State | Meaning | Terminal? |
|-------|---------|-----------|
| `not_started` | UC created, no work begun | No |
| `in_progress` | At least one task active or completed | No |
| `needs_merge` | Dev + QC done, PR has merge conflicts (< 3 days old) | No |
| `complete` | All workflow steps done AND PR merged to main | **Yes** |
| `stuck` | Failed to merge after retries, or circuit breaker tripped | **Soft-terminal** (PM re-evaluates weekly) |

### Transitions

```
not_started ──[replenishQueue]──→ in_progress
                                      │
                  ┌───────────────────┤
                  │                    │
                  ↓                    ↓
            needs_merge ←──[checkPRReviews]── PR conflict (branch < 3d old)
                  │
                  │──[retryNeedsMergeUCs, retry < 3]──→ in_progress
                  │──[retryNeedsMergeUCs, retry ≥ 3 OR branch ≥ 3d]──→ stuck
                  │
            in_progress ──[sweepUCCompletions, merged PR exists]──→ complete
                  │
                  │──[rescueStuckChains, unrecoverable]──→ stuck
                  │
            complete ──[auditUCCompletions, no merged PR, < 48h]──→ needs_merge
                    ──[auditUCCompletions, no merged PR, ≥ 48h]──→ stuck
```

### Invariants (enforced by code)

1. **Only `sweepUCCompletions` can mark `complete`** — and ONLY if a merged PR exists (`_ucHasMergedPR`)
2. **`retryStuckUCs` NEVER marks complete** — if all steps done but no merged PR, stays stuck
3. **Circuit breaker**: Any UC with > 10 tasks or > $5 total cost → stuck (terminal)
4. **Branch age gate**: `retryNeedsMergeUCs` rejects branches > 3 days old → stuck
5. **Audit age gate**: Only UCs completed < 48h ago get retried; older ones → stuck

### Circuit Breaker (cost protection)

Every task spawn checks against limits that scale with UC workflow length:

| Workflow Steps | Max Cost | Max Tasks |
|----------------|----------|-----------|
| 2 (dev→qc) | $10 | 15 |
| 3 (pm→dev→qc) | $15 | 22 |
| 4 (pm→design→dev→qc) | $20 | 30 |

If exceeded, the system runs the **Investigate → Propose → Learn** protocol:

1. **Trip**: UC → stuck, current task → cancelled
2. **Investigate**: Auto-creates PM task to analyze WHY the UC is expensive (query task history, identify failure pattern)
3. **Propose**: PM chooses: DECOMPOSE (split into smaller UCs), CHANGE APPROACH (different implementation), CANCEL (no longer needed), or INCREASE BUDGET (rare, must justify)
4. **Learn**: Failure pattern recorded in learning system. Future UCs with similar characteristics get flagged early.

This ensures expensive UCs are never silently abandoned — they get diagnosed and resolved through a cheaper path.

### Merge Queue (conflict prevention)

PRs are merged sequentially (max 1 per heartbeat) with:
1. **Pre-merge rebase**: Always rebase onto latest main BEFORE attempting merge
2. **Smallest-first ordering**: PRs sorted by diff size (fewer files = merge first)
3. **Post-merge rebase**: After merge, rebase all other approved PRs
4. **Area contention**: Only 1 in-flight dev task per file area

### Design Principles

1. **Every handler that creates tasks must guarantee loop termination.** If task completion doesn't resolve the trigger condition, the handler will loop.
2. **State transitions are owned.** Only the designated handler can make each transition. This prevents fight conditions where multiple handlers cycle a UC between states.
3. **Verify outcomes, don't assume them.** Check DB state after actions. Don't report "Spawned" until the task is `in_progress`. Don't mark `complete` until a merged PR exists.
4. **Simpler is better.** Auto-approving orphan PRs (1 line) is more reliable than a QC review chain (50 lines) that can't close its own loop.

---

*Architecture v2.0 - 2026-03-24 (state machine, circuit breaker, merge queue)*
