---
title: 6-Loop Orchestration Architecture
author: Leonida System
date: 2026-03-09
version: 2.0
tags: [orchestrator, architecture, loops, automation]
project: leadflow-ai
---

# 6-Loop Orchestration Architecture

## Overview

The LeadFlow orchestration system runs 6 interconnected loops that make the project self-managing. All loops are driven by the Orchestrator (`~/.openclaw/genome/core/heartbeat-executor.js`) every 5 minutes.

```
+---------------------------------------------------+
|              SELF-LEARNING LOOP (4)                |
|  (learns from every cycle, feeds all loops)        |
|                                                    |
|  +---------------------------------------------+  |
|  |         PROJECT EXECUTION LOOP (1)           |  |
|  |  UC roadmap -> delegate -> spawn -> chain    |  |
|  |                                              |  |
|  |  +-------------+    +-----------------+      |  |
|  |  |   QUALITY   |    |    PRODUCT      |      |  |
|  |  |   CONTROL   |<-->|   ITERATION     |      |  |
|  |  |   LOOP (2)  |    |    LOOP (3)     |      |  |
|  |  |  branches,  |    |  feedback ->    |      |  |
|  |  |  PRs, CI    |    |  pivot/iterate  |      |  |
|  |  +-------------+    +-----------------+      |  |
|  |                                              |  |
|  |  +-------------+    +-----------------+      |  |
|  |  |  REVENUE    |    |  DISTRIBUTION   |      |  |
|  |  |  INTEL      |    |   HEALTH        |      |  |
|  |  |  LOOP (5)   |    |    LOOP (6)     |      |  |
|  |  |  metrics,   |    |  traffic,       |      |  |
|  |  |  goals      |    |  conversions    |      |  |
|  |  +-------------+    +-----------------+      |  |
|  +---------------------------------------------+  |
+---------------------------------------------------+
```

## Ownership Model

**The Orchestrator is the brain. All other agents are hands.**

| Concern | Owner | How |
|---------|-------|-----|
| What to build next | Orchestrator | Queries `use_cases` table, checks dependencies |
| Who to assign | Orchestrator | Follows UC `workflow` array (PM->Design->Dev->QC) |
| Task delegation | Orchestrator | Creates all tasks, assigns `agent_id` |
| Quality gates | Orchestrator | Branch-based dev, PR review by QC, automated tests |
| Cost tracking | Orchestrator | Budget-aware, reads `tasks.actual_cost_usd` |
| Project progress | Orchestrator | Tracks UC completion, reports milestones |
| Product direction | PM (via Orchestrator) | PM writes specs, reviews data; Orchestrator executes |
| Failure handling | Orchestrator | Retry -> decompose -> escalate to PM -> escalate to human |
| Revenue intelligence | Orchestrator | Collects revenue metrics, checks goal trajectory (Loop 5) |
| Distribution health | Orchestrator | Detects traffic/conversion issues, triggers fixes (Loop 6) |

No agent creates tasks for another. Every task flows through the Orchestrator.

Agent IDs are normalized via `normalizeAgentId()` which maps labels (PM/Dev/QC) to IDs (product/dev/qc). Label mappings are defined in `config.agents.labels`.

---

## Schema (Migration 004)

File: `supabase/migrations/004_project_hierarchy.sql`

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `prds` | Product requirement docs | `id`, `title`, `status` (draft/review/approved/deprecated) |
| `use_cases` | Use cases with workflow chains | `id`, `prd_id`, `workflow TEXT[]`, `implementation_status`, `depends_on TEXT[]`, `shippable_after_step` |
| `e2e_test_specs` | E2E test definitions | `use_case_id`, `test_name`, `last_result` (pass/fail/not_run) |
| `metrics` | All metrics (orchestrator + product + QC) | `project_id`, `domain`, `metric_type`, `data JSONB` |
| `code_reviews` | PR review tracking | `task_id`, `pr_number`, `status` (pending/approved/changes_requested/merged) |
| `product_feedback` | Feedback from all sources | `source`, `feedback_type`, `processed`, `resulting_task_id` |

### Added to `tasks` table

| Column | Type | Purpose |
|--------|------|---------|
| `use_case_id` | TEXT | Links task to a use case |
| `prd_id` | TEXT | Links task to a PRD |
| `branch_name` | TEXT | Git branch for dev/design tasks |
| `pr_number` | INTEGER | GitHub PR number |

### Seed Data

File: `scripts/seed-project-hierarchy.js`

Seeds 3 PRDs (Core SMS, Billing, Integrations) and 12 use cases (UC-1 through UC-12) with workflow chains, priorities, phases, and dependency relationships.

---

## Loop 1: Project Execution

**Files:** `~/.openclaw/genome/core/heartbeat-executor.js` (methods: `replenishQueue()`, `createFollowUpTasks()`)

### How It Works

1. **Queue Replenishment** (`replenishQueue()`): When ready queue < 2, queries `use_cases` table for next incomplete UC. Checks dependencies are met. Creates task for the first workflow step (usually PM spec).

2. **Task Chaining** (`createFollowUpTasks(task)`): When an agent completes a task linked to a UC, creates the next workflow step automatically:
   ```
   product -> dev -> qc  (typical 3-step)
   product -> design -> dev -> qc  (UI features)
   product -> analytics  (reporting)
   ```

3. **UC Completion**: When the last workflow step completes, marks the UC as `implementation_status: 'complete'` in the database. A safety-net sweep (`sweepUCCompletions()`) also runs each heartbeat to catch any UCs that should be marked complete.

4. **Failure Escalation** (`handleTestFailure()`): After 3 failures, creates a PM review task instead of retrying forever. Rescue tasks (`rescueStuckChains()`, `rescueOrphanTasks()`) diagnose root causes for failed chains.

5. **Progress Tracking**: Every heartbeat writes to the `metrics` table (domain: `orchestrator`, type: `heartbeat`) with queue counts, spawn/completion counts, and error counts.

### Workflow Array Convention

The `workflow` column in `use_cases` is a TEXT array of agent IDs in execution order:
- `['product', 'dev', 'qc']` -- standard feature
- `['product', 'design', 'dev', 'qc']` -- UI feature
- `['product', 'analytics']` -- reporting/analysis

Agent ID -> label mapping defined in `config.agents.labels`: `product`=PM, `dev`=Dev, `design`=Design, `qc`=QC, `analytics`=Analytics, `marketing`=Marketing. Use `normalizeAgentId()` to convert labels to IDs.

---

## Loop 2: Quality Control

**Files:** `~/.openclaw/genome/core/spawn-consumer.js` (branch creation, QC context), `~/.openclaw/genome/core/heartbeat-executor.js` (PR check, merge/rework), `.github/workflows/ci.yml`, `.eslintrc.json`

### Branch-Based Workflow

1. **Branch Creation** (`spawn-consumer.js`): When spawning a `dev` or `design` agent, creates a feature branch:
   ```
   dev/{taskid-first-8}-{sanitized-title}
   design/{taskid-first-8}-{sanitized-title}
   ```
   Branch name is stored in `tasks.branch_name`.

2. **PR Creation**: After a dev/design task completes, the Orchestrator creates a GitHub PR via `gh pr create`.

3. **QC Review**: When the QC agent is spawned for a task with a `pr_number`, it receives a review checklist:
   - `npm test` -- all tests pass
   - `npx eslint . --max-warnings 0` -- no lint errors
   - Security check (no hardcoded secrets, injection, XSS)
   - Acceptance criteria verification
   - Write targeted E2E test (committed to branch)
   - `gh pr review` with approve or request-changes

   QC writes results to the `code_reviews` table.

4. **Merge or Rework** (`checkPRReviews()`):
   - **Approved**: Auto-merges via `gh pr merge --squash --delete-branch` (after CI passes)
   - **Changes Requested**: Creates a new dev fix task with QC feedback

### CI Pipeline

File: `.github/workflows/ci.yml`

Runs on every PR: `npm ci`, `npm test`, `npx eslint . --max-warnings 0`

---

## Loop 3: Product Iteration

**Files:** `scripts/feedback-collector.js` (daily cron), `~/.openclaw/genome/core/heartbeat-executor.js` (`processProductFeedback()`, `checkProductReviews()`)

### Feedback Sources

| Source | Type | How |
|--------|------|-----|
| E2E test failures | `bug_report` | `feedback-collector.js` queries `e2e_test_specs` for `last_result = 'fail'` |
| PostHog funnels | `funnel_drop` | `feedback-collector.js` queries PostHog API (when configured) |
| Pilot users | `feature_request` / `bug_report` | Manual insert into `product_feedback` table |

### Processing (`processProductFeedback()`)

Every heartbeat, processes up to 3 unprocessed feedback items:
1. Creates a PM analysis task: "PM: Analyze {feedback_type} feedback"
2. PM decides: fix bug, improve UX, add feature, or deprioritize
3. Marks feedback as processed with `resulting_task_id`

### Product Reviews (`checkProductReviews()`)

Every heartbeat, triggers PM reviews and processes completed review decisions. PM reviews journey definitions and product direction.

### Shippability Checkpoints

Each UC has an optional `shippable_after_step` field. When that workflow step completes, a `shippable_milestone` metric is written. This appears on the dashboard so humans know what's testable.

### Priority Re-ordering

When PM determines a pivot from feedback analysis, it updates `use_cases.priority` and `implementation_status` directly. The Orchestrator picks this up on the next `replenishQueue()` cycle automatically.

---

## Loop 4: Self-Learning

**Files:** `~/.openclaw/genome/core/heartbeat-executor.js` (integration), `~/.openclaw/genome/core/learning-system.js`, `~/.openclaw/genome/core/orchestrator-decision-tracker.js`, `~/.openclaw/genome/core/self-heal.js`, `~/.openclaw/genome/core/daily-self-review.js`

### Components

| Component | File | What It Does |
|-----------|------|-------------|
| Decision Tracking | `orchestrator-decision-tracker.js` | Records every spawn/retry/decompose/escalate decision and its outcome |
| Learning System | `learning-system.js` | Tracks success/failure rates by task type and model. Recommends model escalation and pre-decomposition |
| Self-Heal | `self-heal.js` | Detects stalled queues, budget anomalies, failure patterns. Auto-heals critical issues |
| Daily Review | `daily-self-review.js` | Nightly cron that calculates accuracy, generates recommendations, writes to `metrics` table |

### Decision Points (4 record sites)

1. `spawnAgents()` -- records `SPAWN_TIMING` decision
2. `handleTestFailure()` retry -- records `MODEL_SELECTION` decision
3. `handleTestFailure()` decompose -- records `DECOMPOSITION_TIMING` decision
4. `handleTestFailure()` escalate -- records `ESCALATION_DECISION`

### Outcome Points (2 record sites)

1. `handleTaskSuccess()` -- records outcome as `correct`
2. `handleTestFailure()` -- records outcome as `incorrect`

### Cross-Loop Learning

In `spawnAgents()`, before spawning:
- Queries `learner.getRecommendations(task)` for model suggestions
- If learning system recommends a different model (based on historical success rates for this task type), auto-escalates

### Self-Heal Checks

`runSelfHealChecks()` runs after `checkBlockers()` every heartbeat. Detects:
- Idle agents with no activity
- Stuck tasks (in_progress too long)
- Repeated failure patterns
- Queue stalling (no progress)
- Budget anomalies

Auto-heals critical issues; logs warnings for others.

---

## Loop 5: Revenue Intelligence

**Files:** `~/.openclaw/genome/core/heartbeat-executor.js` (`collectRevenueIntelligence()`)

### How It Works

Every heartbeat, the Revenue Intelligence loop:
1. Collects revenue metrics from configured sources (Stripe, usage data)
2. Checks goal trajectory against defined targets
3. Writes revenue metrics to the `metrics` table (domain: `revenue`)
4. If goals are off-track, adjusts urgency mode and prioritizes revenue-impacting UCs in `replenishQueue()`

### Goal State

`checkGoalState()` runs at the top of every heartbeat cycle to set urgency mode based on goal trajectory. This influences task prioritization and spawn decisions throughout the entire loop.

---

## Loop 6: Distribution

**Files:** `~/.openclaw/genome/core/heartbeat-executor.js` (`checkDistributionHealth()`)

### How It Works

Every heartbeat, the Distribution loop:
1. Checks traffic and conversion metrics from configured sources
2. Detects anomalies (traffic drops, conversion rate changes)
3. Triggers marketing or product tasks when distribution issues are detected
4. Writes distribution health metrics to the `metrics` table (domain: `distribution`)

---

## Heartbeat Execution Order

The full heartbeat cycle in `~/.openclaw/genome/core/heartbeat-executor.js`:

```
 0.  checkGoalState()             -- Set urgency mode based on goal trajectory
 1.  queryState()                 -- Read queue from Supabase
 2.  detectZombieTasks()          -- PID-check in_progress tasks, handle zombies
 3.  checkCompletions()           -- Process completion reports
 3b. rescueStuckChains()          -- Rescue failed UC workflow chains
3b2. rescueOrphanTasks()          -- Rescue orphan failed tasks (!fix, !feature)
 3c. resetExhaustedTasks()        -- Reset exhausted tasks daily (fresh retries)
 4.  spawnAgents()                -- Cross-loop learning + budget check + spawn
 5.  checkBlockers()              -- Check blocked tasks
 5b. runSelfHealChecks()          -- Self-heal (Loop 4)
 5c. runSmokeTests()              -- Verify live product health
5c2. syncProductComponents()      -- Persist smoke results + product status to Supabase
 5d. checkBuildHealth()           -- Verify dashboard builds cleanly
 5e. collectRevenueIntelligence() -- Collect metrics, check goals (Loop 5)
 5f. checkDistributionHealth()    -- Detect traffic/conversion issues (Loop 6)
 5g. sweepUCCompletions()         -- Sweep for UCs that should be marked complete
 6.  replenishQueue()             -- UC roadmap -> create tasks (Loop 1, revenue-aware)
 6b. processProductFeedback()     -- Feedback -> PM tasks (Loop 3)
 6c. checkPRReviews()             -- Merge/rework PRs (Loop 2)
 6d. cleanupStaleBranches()       -- Remove merged/stale branches
 6e. checkProductReviews()        -- Trigger PM reviews + process decisions
 6f. archiveStaleTasks()          -- Archive old stale tasks
 7.  updateDashboard()            -- Regenerate dashboard
 8.  reportToTelegram()           -- Telegram report (topic 10788)
 9.  logHeartbeat()               -- Write to metrics table + log file
```

---

## Dashboard Sections

File: `~/.openclaw/dashboard/dashboard.html`

All data from Supabase. No local JSON files. No hardcoded agent lists.

| Section | Data Source |
|---------|------------|
| System Status | `system_components` table |
| Key Metrics | `tasks` + `project_metadata` |
| Spawn Health | `tasks.spawn_config` |
| Task Queue | `tasks` (in_progress, ready, blocked) |
| Agent Activity | `tasks` grouped by `agent_id` (dynamic discovery) |
| Completed Work | `completed_work` table |
| Action Items | `action_items` table |
| Optimization Mode | `.current-optimization-mode.json` |
| **Orchestrator Quality** | `metrics` table (domain=orchestrator, type=heartbeat) |
| **Product Quality** | `use_cases` + `e2e_test_specs` + `metrics` (domain=product) |
| **QC Status** | `code_reviews` table |
| Cost Summary | `tasks` table (`actual_cost_usd`) |

---

## Spawn Context

File: `~/.openclaw/genome/core/spawn-consumer.js`

When an agent is spawned, the message includes:
- Task title, ID, description
- Use case ID (if linked)
- Chain context (previous task ID, workflow step N/total)
- Retry context (retry count, last error)
- **Dev/Design agents**: branch name + instruction to commit to branch
- **QC agents**: PR number + review checklist

---

## File Reference

### Core Loop Files (in `~/.openclaw/genome/core/`)
| File | Role |
|------|------|
| `heartbeat-executor.js` | Main orchestration loop (all 6 loops integrated) |
| `spawn-consumer.js` | Reads spawn-queue.json, creates branches, fires agents |
| `heartbeat-wrapper.js` | Wrapper that runs heartbeat-executor + spawn-consumer |
| `task-store.js` | Supabase CRUD for tasks (accepts UC/PRD/branch/PR fields) |
| `supabase-client.js` | Lower-level Supabase task client |

### Learning & Self-Improvement (in `~/.openclaw/genome/core/`)
| File | Role |
|------|------|
| `learning-system.js` | Records task outcomes, recommends models + decomposition |
| `orchestrator-decision-tracker.js` | Tracks every orchestrator decision + outcome |
| `self-heal.js` | Health checks, auto-healing, watch mode |
| `daily-self-review.js` | Nightly accuracy report, writes to metrics table |

### Schema & Data
| File | Role |
|------|------|
| `supabase/migrations/004_project_hierarchy.sql` | PRDs, use_cases, e2e_test_specs, metrics, code_reviews, product_feedback |
| `scripts/seed-project-hierarchy.js` | Seeds PRDs + 12 UCs with workflows |
| `scripts/feedback-collector.js` | Daily cron: collects E2E failures + PostHog data |

### Quality & CI
| File | Role |
|------|------|
| `.github/workflows/ci.yml` | PR checks: test + lint |
| `.eslintrc.json` | ESLint config |

### Dashboard
| File | Role |
|------|------|
| `~/.openclaw/dashboard/dashboard.html` | Full Supabase-driven dashboard with all 6-loop sections |

---

## Replicability (New Project Setup)

1. Run `supabase/migrations/004_project_hierarchy.sql` against your Supabase project
2. Set `project_id` in `task-store.js` constructor
3. Edit `scripts/seed-project-hierarchy.js` with your PRDs and use cases
4. Run `node scripts/seed-project-hierarchy.js`
5. Configure OpenClaw agents (agent IDs must match `workflow` arrays)
6. Start heartbeat -> Orchestrator reads roadmap, delegates, reports
7. Dashboard auto-populates from Supabase queries

---

## Extending the System

### Adding a New Use Case
Insert into `use_cases` table with:
- `id`: UC-N format
- `prd_id`: which PRD it belongs to
- `workflow`: array of agent IDs in execution order
- `depends_on`: array of UC IDs that must complete first
- `shippable_after_step`: which step makes it human-testable (0-indexed)

The Orchestrator will pick it up on the next `replenishQueue()` cycle.

### Adding a New Agent Type
1. Add the agent to OpenClaw config
2. Add the agent ID to `config.agents.labels` and ensure `normalizeAgentId()` handles it
3. Use the agent ID in UC `workflow` arrays
4. The dashboard discovers agents dynamically from tasks

### Adding a New Feedback Source
Insert directly into `product_feedback` table:
```sql
INSERT INTO product_feedback (project_id, source, feedback_type, data)
VALUES ('leadflow', 'my_source', 'bug_report', '{"details": "..."}');
```
Next heartbeat will create a PM analysis task.

### Adding a New Metric
Insert into `metrics` table:
```sql
INSERT INTO metrics (project_id, domain, metric_type, data)
VALUES ('leadflow', 'product', 'my_metric', '{"value": 42}');
```
Add a dashboard section that queries it.
