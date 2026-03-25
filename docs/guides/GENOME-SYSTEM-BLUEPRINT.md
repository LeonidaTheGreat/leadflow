# Genome System Blueprint
## Building an Autonomous Multi-Agent Software Development System with Claude Code

> Written by Claude Opus 4.6, based on building and operating the OpenClaw Genome system for the LeadFlow project (Feb-Mar 2026). Lessons learned from ~2,000 tasks, $600+ in LLM costs, and many spectacular failures.

---

## 1. What is the Genome?

The Genome is a **rules engine** that orchestrates AI agents (Claude Code, Kimi, etc.) to autonomously develop software. It does NOT use LLM tokens itself — it's pure JavaScript/Node.js running on a schedule.

**The three layers:**

| Layer | What it is | LLM Cost | Purpose |
|-------|-----------|----------|---------|
| **Genome** (rules engine) | Node.js scripts on cron | $0 | Execute tasks, enforce rules, merge PRs, monitor health |
| **Orchestrator AI** (process) | Claude Code agent, daily | ~$0.50/day | Strategic decisions: what to prioritize, what to cancel, is the process healthy? |
| **PM AI** (product) | Claude Code agent, weekly | ~$1-2/week | Product decisions: what to build, does it work for users, acceptance criteria |

The agents (Dev, QC, Design, Marketing) do the actual work. The genome coordinates them.

---

## 2. Core Architecture

### 2.1 Database (PostgreSQL)

The genome needs these tables:

```sql
-- The work to be done
CREATE TABLE use_cases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 3,        -- 1=blocker, 2=user-facing, 3=quality, 4=maintenance
  implementation_status TEXT DEFAULT 'not_started',
    -- not_started → in_progress → needs_merge → complete (or → stuck)
  workflow TEXT[] DEFAULT '{dev,qc}', -- agent sequence: [pm, design, dev, qc]
  revenue_impact TEXT,               -- high, medium, low
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual tasks assigned to agents
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  project_id TEXT NOT NULL,
  agent_id TEXT,                      -- dev, qc, product, design, marketing
  status TEXT DEFAULT 'ready',        -- ready → in_progress → done/failed/cancelled
  model TEXT DEFAULT 'sonnet',        -- which LLM model to use
  priority INTEGER DEFAULT 3,
  use_case_id TEXT REFERENCES use_cases(id),
  branch_name TEXT,                   -- git branch for this task
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  estimated_cost_usd NUMERIC,
  actual_cost_usd NUMERIC DEFAULT 0,
  spawn_config JSONB,                 -- PID, model, timestamps, cost breakdown
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PR tracking
CREATE TABLE code_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id),
  pr_number INTEGER,
  branch_name TEXT,
  reviewer_agent TEXT,
  status TEXT DEFAULT 'pending',      -- pending → approved → merged/closed
  review_notes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics for self-assessment
CREATE TABLE metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT,
  domain TEXT,          -- orchestrator, smoke_tests, code_quality, genome, budget, tests
  metric_type TEXT,     -- heartbeat, code_scan, self_assessment, test_run
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFY trigger for real-time events
CREATE OR REPLACE FUNCTION notify_table_change() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('table_changes', json_build_object(
    'table', TG_TABLE_NAME, 'type', TG_OP, 'id', COALESCE(NEW.id::text, OLD.id::text)
  )::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify AFTER INSERT OR UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION notify_table_change();
CREATE TRIGGER trg_notify AFTER INSERT OR UPDATE ON code_reviews FOR EACH ROW EXECUTE FUNCTION notify_table_change();
```

### 2.2 Project Configuration

Each project has a `project.config.json`:

```json
{
  "project_id": "my-project",
  "project_name": "My Project",
  "project_dir": "/path/to/project",
  "reporting": {
    "day_zero": "2026-03-01",
    "day_target": 90,
    "report_prefix": "My Project Orchestrator"
  },
  "budget": {
    "daily_limit_usd": 30,
    "model_token_costs": {
      "sonnet": { "input_per_1m": 3.00, "output_per_1m": 15.00 },
      "haiku": { "input_per_1m": 1.00, "output_per_1m": 5.00 },
      "local": { "input_per_1m": 0, "output_per_1m": 0 }
    }
  },
  "products": [
    { "id": "dashboard", "name": "Dashboard", "url": "https://...", "smoke_test_id": "dashboard-health" }
  ],
  "smoke_tests": [
    { "id": "dashboard-health", "name": "Dashboard Health", "url": "https://example.com/api/health", "expect_status": 200 }
  ],
  "codebase_rules": [
    { "id": "tests-pass", "check": "npm test 2>&1 | grep -oP '\\d+ failed' | grep -oP '\\d+'", "expected": "0", "severity": "critical" },
    { "id": "build-passes", "check": "npm run build 2>&1 | tail -1 | grep -c error", "expected": "0", "severity": "critical" }
  ]
}
```

### 2.3 Project Registry

`projects.json` — lists all genome-managed projects:

```json
{
  "projects": [
    { "id": "my-project", "name": "My Project", "config_path": "/path/project.config.json", "project_dir": "/path/to/project", "active": true },
    { "id": "genome", "name": "Genome Engine", "config_path": "/path/genome/project.config.json", "project_dir": "/path/genome", "active": true }
  ]
}
```

---

## 3. The Heartbeat (Core Loop)

The heartbeat runs every 30 minutes via launchd/cron. It's the genome's pulse.

### 3.1 Heartbeat Steps (in order)

```
 0. checkGoalState()              — Set urgency mode based on revenue/goal trajectory
 1. queryState()                  — Read task queue from database
 2. detectZombieTasks()           — Find in_progress tasks with dead PIDs
2b. detectStuckSpawns()           — Find ready tasks stuck > 24h → fail them
 3. checkCompletions()            — Process agent completion reports
3b. rescueStuckChains()           — Retry failed UC workflow chains
3b3. retryStuckUCs()              — Re-evaluate stuck UCs periodically
3b4. retryNeedsMergeUCs()         — Retry merge-conflicted UCs (with conflict resolution)
 4. spawnAgents()                 — Priority-filtered spawn with budget check
 5. checkBlockers()               — Check blocked tasks
5b. runSelfHealChecks()           — Self-heal (component health)
5c. runSmokeTests()               — HTTP health checks on live products
5d. checkBuildHealth()            — Verify project builds
5d2. checkTestHealth()            — Run tests, update metrics (every 6h)
5d3. checkCodeQuality()           — Security/quality pattern scan (every 24h)
5d4. enforceCodebaseRules()       — Machine-verifiable invariants (every 6h)
5g. sweepUCCompletions()          — Mark complete UCs (with merge gate)
5h. auditUCCompletions()          — Verify completions have merged PRs
 6. replenishQueue()              — Create tasks from UC roadmap (with contention guard)
6b. processProductFeedback()      — Route user feedback to PM
6c. checkPRReviews()              — Merge approved PRs (sequential, pre-rebase, CI-gated)
6e. checkProductReviews()         — Trigger PM product reviews (weekly)
6e3. processActionItemResponses() — Create tasks from dashboard responses
6e4. reviewPriorities()           — Detect stuck blockers, priority drift (daily)
6g2. orchestratorStrategicReview()— AI-driven process evaluation (daily, costs ~$0.50)
6h. genomeReview()                — Self-assessment with capability scoring (every 12h)
 7. updateDashboard()             — Regenerate dashboard data
 8. reportToTelegram()            — Send summary to Telegram
 9. logHeartbeat()                — Write metrics
```

### 3.2 Key Design Principles for the Heartbeat

1. **Every step wrapped in try/catch with error classification** — FATAL (abort), DEGRADED (log + continue), EXPECTED (silent)
2. **Step outcome tracking** — each step reports success/failure/duration. Silent failures detected by genome review.
3. **Lockfile prevents concurrent runs** — launchd can fire overlapping instances
4. **Budget check before spawning** — won't spawn if daily budget exhausted

---

## 4. The Realtime Dispatcher

A long-running process that listens for database changes via PostgreSQL LISTEN/NOTIFY:

```
Task becomes ready → onTaskReady() → queue for spawn → spawn-consumer fires agent
Task completes → onTaskCompleted() → verify output → record cost → chain to next workflow step → create PR
Task fails → onTaskFailed() → retry or rescue
```

Key features:
- **Debounced spawning** — waits 2s after events before spawning (batches rapid changes)
- **60s polling fallback** — catches missed NOTIFY events
- **Completion scan** — periodically checks in_progress tasks for dead PIDs
- **Heartbeat watchdog** — if no heartbeat metric in 60min, restarts it via launchctl
- **Dedup sets** — prevents double-reporting of completions/spawns

---

## 5. The Spawn Consumer

Fires Claude Code agents as detached child processes:

```javascript
// Simplified flow
const child = spawn('claude', ['--agent', agentId, '--local', '--message', taskMessage], {
  detached: true,
  stdio: ['ignore', stdoutFd, stderrFd]
})
child.unref()
```

Key features:
- **Model selection** — complexity-based: simple tasks → local/free model, complex → sonnet
- **Session reset** — clears previous conversation before each spawn
- **Concurrency guard** — 1 agent per role at a time (shared session files)
- **Git branch creation** — each dev task gets a fresh branch from latest main
- **Context injection** — task gets: UC description, PRD, role instructions, QC checklist, git workflow, previous attempt failures

---

## 6. Safety Mechanisms (Critical — learned the hard way)

### 6.1 Circuit Breaker
Every task spawn checks total cost/tasks per UC. Limits scale with workflow length:
- 2-step UC: max $10, 15 tasks
- 4-step UC: max $20, 30 tasks
- On breach: UC → stuck, PM investigation task created (Investigate → Propose → Learn)

### 6.2 Loop Detection
`createTask()` checks: were 3+ tasks with this title created in the last 2 hours?
If yes: blocks creation, creates PM investigation task instead.

### 6.3 UC State Machine
Formal state transitions with ownership — only ONE handler can make each transition:
```
not_started → in_progress     (owner: replenishQueue)
in_progress → complete        (owner: sweepUCCompletions, guard: merged PR exists)
in_progress → needs_merge     (owner: checkPRReviews, guard: PR closed, merge conflict)
needs_merge → in_progress     (owner: retryNeedsMergeUCs, guard: retry < 3, branch < 3d)
needs_merge → stuck           (owner: retryNeedsMergeUCs, guard: retry >= 3 or branch >= 3d)
```

### 6.4 Merge Gate
A UC cannot be marked `complete` unless a merged PR exists in code_reviews. This prevents "all tasks done but code never landed on main."

### 6.5 Codebase Rules
Machine-verifiable invariants defined in project.config.json. Checked every 6h. Violations auto-create P1 fix tasks. Rules persist FOREVER — not just during one UC.

### 6.6 Priority Enforcement
Strict hierarchy: P1 tasks BLOCK all P2+ from spawning. Prevents maintenance work from consuming agent slots while blockers wait.

---

## 7. The Merge Pipeline

### 7.1 PR Creation (`createPRForTask`)
After dev completes:
1. Check branch has commits
2. Remove junk files (coverage/, node_modules/, .next/)
3. Remove auto-generated files (restore to main's version)
4. Auto-move misplaced docs to correct directories
5. Rebase onto latest main
6. Push with `--force-with-lease`
7. Create PR via `gh pr create`

### 7.2 PR Merge (`checkPRReviews`)
1. Sort approved PRs by diff size (smallest first)
2. Max 1 merge per heartbeat (sequential queue)
3. Pre-merge rebase onto latest main
4. Wait for pending CI checks
5. If CI fails → reject, create fix task
6. If mergeable=CONFLICTING → close PR, mark UC needs_merge
7. If mergeable=MERGEABLE → squash merge
8. Post-merge: rebase remaining approved PRs against new main

### 7.3 Area-Aware Scheduling
Tags UCs by file area (auth, onboarding, billing, etc.). Only 1 in-flight dev task per area. Prevents parallel changes to the same files.

---

## 8. Quality Enforcement

### 8.1 QC Agent Instructions
QC agents receive a mandatory 2-step process:

**Step 1: Automated gates (MUST pass before manual review)**
- Run `npm run build` — REJECT if fails
- Run `npm test` — REJECT if pass rate decreases
- Check for junk files (coverage/, node_modules/)
- Check for root-level .md files

**Step 2: Manual review (only if Step 1 passes)**
- Security checklist (8 items)
- Code quality checklist
- Commit hygiene (specific git add, no -A)
- Semantic correctness (table references, import paths)
- Deliverable verification (claimed changes actually exist)

### 8.2 CI Pipeline
GitHub Actions runs on every PR:
- `npm test` — must pass
- `npm run build` — must pass
- Branch protection: CI must pass before merge

### 8.3 Code Quality Scan (every 24h)
Scans changed files for patterns: Math.random(), eval(), innerHTML, hardcoded secrets, loose equality, stale imports. Creates fix tasks for critical/high findings.

---

## 9. Self-Assessment (Genome Review)

Runs every 12h. Scores the genome on multiple dimensions:

### 9.1 Task Pipeline Health
- Completion rate, retry rate, stuck rate
- Stale ready tasks, stale action items
- Silent failure detection (steps with 0 output)

### 9.2 Cost Efficiency
- Cost per success
- Model performance (success rate per model per task type)
- Budget forecast

### 9.3 Code Quality
- Findings from code scan (critical, high, medium)
- Codebase rule violations

### 9.4 Capability Scoring (per project)
For each registered project, scores:
- CI exists? (0/10)
- Branch protection? (0/10)
- Tests pass rate (0-10)
- Build health (0-10)
- Code quality (0-10)
- Merge rate (0-10)

If a project scores < 5/10: breach → auto-runs `setup-project-quality.sh`

### 9.5 Auto-Remediation
- Critical breaches → auto-create dev fix tasks
- High breaches → noted, not auto-remediated
- Circuit breaker breaches → PM investigation (Investigate → Propose → Learn)

---

## 10. How to Build This with Claude Code Agents

### 10.1 Minimum Viable Genome

Start with just these components:

1. **PostgreSQL database** with tasks + use_cases + code_reviews tables
2. **Heartbeat script** (Node.js, runs every 30 min via cron):
   - Query ready tasks
   - Spawn Claude Code agent for the highest-priority one
   - Check if previous agent completed (completion report file)
   - Create PR from the agent's branch
   - Try to merge approved PRs
3. **Project config** with codebase_rules
4. **Git workflow**: each task gets a branch, PRs merge to main

That's it. No dispatcher, no intelligence modules, no dashboard. Add those later.

### 10.2 Claude Code Agent Spawning

```bash
# Spawn a dev agent
claude --agent dev --local --message "
## Task: Fix the login page bug

**Project Directory:** /path/to/project
**FIRST:** cd /path/to/project && git checkout -b fix/login-bug

Description: The login form doesn't validate email format...

## Git Workflow
- Work ONLY on branch fix/login-bug
- Commit with: git add <specific files> (NEVER git add -A)
- When done: git push -u origin fix/login-bug
- Do NOT create PRs
"
```

### 10.3 Scaling Up

Add components in this order:
1. **QC chain** — after dev completes, spawn QC agent to review
2. **PM reviews** — weekly product review agent
3. **Smoke tests** — HTTP health checks on live product
4. **Safety mechanisms** — circuit breaker, loop detection (YOU WILL NEED THESE)
5. **Dashboard** — visualize the pipeline
6. **Self-assessment** — genome reviews its own effectiveness

### 10.4 Lessons Learned (the hard way)

1. **NEVER trust agent self-reports.** An agent that says "all tests pass" may not have run them. Use CI to verify.
2. **Every handler that creates tasks must guarantee loop termination.** If the task doesn't resolve the trigger condition, you get an infinite loop burning money.
3. **Commit changes to branches, not working tree.** Working tree edits get overwritten when agent PRs merge.
4. **Sequential merge queue.** Parallel PRs cause merge conflicts. Merge one at a time.
5. **Cost tracking must happen BEFORE session cleanup.** Read the cost, then clear the session.
6. **QC is advisory, CI is the enforcer.** QC agents rubber-stamp. CI blocks bad code.
7. **Codebase rules > UC completion.** A UC can be "done" while the codebase violates its goal. Rules verify the actual state.
8. **The genome must not modify its own running code.** Use a separate repo with CI/CD.
9. **Local models ($0) for simple tasks.** Don't burn sonnet/kimi on file moves and config changes.
10. **Priority enforcement is critical.** Without it, smoke test loops consume all agent slots while blockers wait.

---

## 11. Estimated Costs

For a typical project with 10-20 tasks/day:

| Component | Cost/day | Notes |
|-----------|----------|-------|
| Genome (rules engine) | $0 | Pure Node.js |
| Dev agents (10 tasks × qwen3-coder) | $0 | Local model |
| Dev agents (5 tasks × sonnet) | $6 | Complex tasks |
| QC agents (15 tasks × haiku) | $7.50 | Review + tests |
| PM review (weekly ÷ 7) | $0.30 | Product review |
| Orchestrator review (daily) | $0.50 | Strategic review |
| **Total** | **~$14/day** | |

With all-API models (no local): ~$30-50/day.
With aggressive local model usage: ~$5-10/day.

---

## 12. File Structure

```
genome/
├── core/
│   ├── heartbeat-executor.js     — The main loop (35+ steps)
│   ├── heartbeat-wrapper.js      — Entry point, TG reporting, lockfile
│   ├── workflow-engine.js        — Model selection, PR creation, UC transitions
│   ├── spawn-consumer.js         — Agent spawning, session management
│   ├── realtime-dispatcher.js    — LISTEN/NOTIFY, hot-path completion
│   ├── task-store.js             — DB operations with dedup + loop detection
│   ├── local-pg.js               — PostgreSQL client (Supabase-compatible API)
│   ├── parse-utc.js              — Timestamp parsing
│   └── project-config-loader.js  — Config resolution
├── intelligence/
│   ├── learning-system.js        — Model performance tracking
│   ├── optimizer.js              — Mode switching (speed/balanced/quality)
│   └── predictive-engine.js      — Success prediction, auto-decomposition
├── health/
│   ├── smoke-tests.js            — HTTP health checks
│   └── build-health.js           — Build verification
├── scripts/
│   ├── atomic-restart.sh         — Validate + test + restart services
│   ├── auto-pull.sh              — Poll for new commits, deploy
│   └── setup-project-quality.sh  — Configure CI + branch protection for new projects
├── tests/
│   ├── local-pg.test.js
│   ├── workflow-engine.test.js
│   └── parseUTC.test.js
├── .github/workflows/
│   └── ci.yml                    — Lint + test on PR
├── projects.json                 — Project registry
├── package.json
└── CLAUDE.md                     — Agent context (project separation, priority hierarchy)
```

---

## 13. The Dashboard (Visibility Layer)

The dashboard is a single HTML page served by a Node.js HTTP server that also acts as a REST API proxy to PostgreSQL. Everything is real-time — no build step, no framework.

### 13.1 Architecture

```
Browser → dashboard.html (static)
       → /rest/v1/tasks?status=eq.ready (REST API)
       → /genome-health (health endpoint)
       ↓
Node.js server (port 8787)
       → PostgreSQL (direct queries)
       → State files (budget, smoke results)
```

The server has two roles:
1. **Static file server** — serves `dashboard.html`
2. **PostgREST-compatible API** — translates Supabase-style queries to SQL

The dashboard's JavaScript uses a lightweight client (`window.localDB`) that speaks PostgREST syntax (`.from('tasks').select('*').eq('status', 'ready')`).

### 13.2 Dashboard Sections (18 total)

| Section | What it shows | Data source |
|---------|--------------|-------------|
| **KPI Cards** | Tasks done, system health, blockers | `tasks`, `system_components` |
| **System Components** | Product status (LIVE/DOWN/BUILT) with links | `system_components` |
| **Product Components** | Deployed products with smoke test status | `system_components` + smoke results |
| **Task Queue** | In-progress (with PIDs), ready to spawn, blocked | `tasks` |
| **Agent Activity** | Recent completions with cost, model, outcome | `tasks` |
| **Product Quality** | UC completion %, awaiting merge count, E2E pass rate | `use_cases`, `e2e_test_specs` |
| **QC Status** | Merged/pending/conflicts, QC pass rate | `code_reviews` |
| **Cost Summary** | Today's spend vs budget, all-time by model | `tasks`, `metrics` |
| **Action Items** | Human decisions needed, with submit/dismiss buttons | `action_items` |
| **Orchestrator Stats** | Heartbeat frequency, spawn rate, error rate | `metrics` |
| **Marketing Attribution** | UTM sources, conversion funnel (if configured) | `metrics` |
| **Optimization Mode** | Current optimizer mode (speed/balanced/quality) | `metrics` |
| **Spawn Health** | Agent success rate, model distribution | `tasks` |

### 13.3 Key Dashboard Features

**Interactive action items:**
Users can submit responses to PM recommendations directly from the dashboard. Radio buttons for options, textarea for instructions, submit/dismiss buttons. Responses are picked up by the heartbeat's `processActionItemResponses` step.

**Task detail modal:**
Click any task to see: description, PRD, cost breakdown per attempt, branch name, PR number, error history, retry count.

**Project filter:**
Multi-project support — dropdown filters all sections by project_id.

**Auto-refresh:**
Page refreshes every 5 minutes. No cache headers (always latest data).

**Genome health endpoint (`/genome-health`):**
Returns JSON for programmatic monitoring:
```json
{
  "last_heartbeat": "2026-03-25T...",
  "active_agents": 2,
  "queue_depth": 15,
  "errors_24h": 3,
  "stale_ready": 0,
  "budget_remaining": 24.50,
  "budget_limit": 30
}
```

### 13.4 How to Build the Dashboard

**Start minimal:**

```javascript
// server.js — bare minimum
const http = require('http')
const { Pool } = require('pg')
const fs = require('fs')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

http.createServer(async (req, res) => {
  // REST API
  const match = req.url.match(/^\/rest\/v1\/(\w+)/)
  if (match) {
    const table = match[1]
    // Parse query params into SQL (simplified)
    const result = await pool.query(`SELECT * FROM ${table} LIMIT 100`)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(result.rows))
    return
  }

  // Static files
  const html = fs.readFileSync('./dashboard.html')
  res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
  res.end(html)
}).listen(8787)
```

```html
<!-- dashboard.html — bare minimum -->
<script>
  const API = window.location.origin
  async function query(table, params) {
    const qs = Object.entries(params).map(([k,v]) => `${k}=${v}`).join('&')
    const res = await fetch(`${API}/rest/v1/${table}?${qs}`)
    return res.json()
  }

  async function loadDashboard() {
    // Task queue
    const ready = await query('tasks', { status: 'eq.ready', order: 'priority.asc' })
    document.getElementById('queue').innerHTML = ready.map(t =>
      `<div>${t.priority} | ${t.agent_id} | ${t.title}</div>`
    ).join('')

    // Active agents
    const active = await query('tasks', { status: 'eq.in_progress' })
    document.getElementById('active').innerHTML = active.map(t =>
      `<div>PID:${t.spawn_config?.pid} | ${t.agent_id} | ${t.title}</div>`
    ).join('')
  }

  loadDashboard()
  setInterval(loadDashboard, 300000) // refresh every 5 min
</script>
<h1>Genome Dashboard</h1>
<h2>Active Agents</h2><div id="active"></div>
<h2>Task Queue</h2><div id="queue"></div>
```

**Scale up by adding sections:**
1. KPI cards (task count, health, blockers)
2. Cost tracking (actual vs estimated, by model)
3. Product components (with smoke test status badges)
4. Action items (interactive submit/dismiss)
5. QC status (merge rate, approval rate)
6. UC completion progress bar

### 13.5 Exposing the Dashboard

For team access:
- **Local network:** Serve on port 8787, access via IP
- **Tailscale:** Expose via `tailscale serve` for secure remote access
- **Cloudflare Tunnel:** Public access with API key auth

Our setup:
```
https://stojanadmins-mac-mini.tail3ca16c.ts.net/ → port 8787 (dashboard)
https://stojanadmins-mac-mini.tail3ca16c.ts.net/genome-health → JSON health endpoint
```

### 13.6 Telegram Reporting

The heartbeat sends a summary to Telegram every 30 min:
```
🤖 My Project Orchestrator — Day 38/90

Queue: 15 ready | 2 active | 0 blocked

✅ Completed:
  • Fix login page validation (dev)
  • Review PR #42 (qc)

📊 Step Outcomes: 35/35 success

• Spawned dev → Implement user profile page
```

The dispatcher sends ONLY failure alerts (not individual completions — those are in the summary):
```
🛑 Fix signup flow — failed after 3 retries, needs rescue
```

---

*This document is the genome's DNA. Build it incrementally. Start with the heartbeat + spawn + merge pipeline. Add safety mechanisms before scaling. The expensive lesson: without circuit breakers and loop detection, a single misconfigured handler can burn your entire daily budget in 2 hours.*
