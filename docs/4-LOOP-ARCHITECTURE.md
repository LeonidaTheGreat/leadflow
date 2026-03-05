---
title: 4-Loop Orchestration Architecture
author: Leonida System
date: 2026-03-01
version: 1.0
tags: [orchestrator, architecture, loops, automation]
project: leadflow-ai
---

# 4-Loop Orchestration Architecture

## Overview

The LeadFlow orchestration system runs 4 interconnected loops that make the project self-managing. All loops are driven by the Orchestrator (heartbeat-executor.js) every 5 minutes.

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
| Cost tracking | Orchestrator | Budget-aware, $0 qwen3.5 preference |
| Project progress | Orchestrator | Tracks UC completion, reports milestones |
| Product direction | PM (via Orchestrator) | PM writes specs, reviews data; Orchestrator executes |
| Failure handling | Orchestrator | Retry -> decompose -> escalate to PM -> escalate to human |

No agent creates tasks for another. Every task flows through the Orchestrator.

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

**Files:** `heartbeat-executor.js` (methods: `replenishQueue()`, `createFollowUpTasks()`)

### How It Works

1. **Queue Replenishment** (`replenishQueue()`): When ready queue < 2, queries `use_cases` table for next incomplete UC. Checks dependencies are met. Creates task for the first workflow step (usually PM spec).

2. **Task Chaining** (`createFollowUpTasks(task)`): When an agent completes a task linked to a UC, creates the next workflow step automatically:
   ```
   product -> dev -> qc  (typical 3-step)
   product -> design -> dev -> qc  (UI features)
   product -> analytics  (reporting)
   ```

3. **UC Completion**: When the last workflow step completes, marks the UC as `implementation_status: 'complete'` in the database.

4. **Failure Escalation** (`handleTestFailure()`): After 3 failures, creates a PM review task instead of retrying forever.

5. **Progress Tracking**: Every heartbeat writes to the `metrics` table (domain: `orchestrator`, type: `heartbeat`) with queue counts, spawn/completion counts, and error counts.

### Workflow Array Convention

The `workflow` column in `use_cases` is a TEXT array of agent IDs in execution order:
- `['product', 'dev', 'qc']` -- standard feature
- `['product', 'design', 'dev', 'qc']` -- UI feature
- `['product', 'analytics']` -- reporting/analysis

Agent ID -> label mapping: `product`=PM, `dev`=Dev, `design`=Design, `qc`=QC, `analytics`=Analytics, `marketing`=Marketing

---

## Loop 2: Quality Control

**Files:** `spawn-consumer.js` (branch creation, QC context), `heartbeat-executor.js` (PR check, merge/rework), `.github/workflows/ci.yml`, `.eslintrc.json`

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
   - `gh pr review` with approve or request-changes

   QC writes results to the `code_reviews` table.

4. **Merge or Rework** (`checkPRReviews()`):
   - **Approved**: Auto-merges via `gh pr merge --squash --delete-branch`
   - **Changes Requested**: Creates a new dev fix task with QC feedback

### CI Pipeline

File: `.github/workflows/ci.yml`

Runs on every PR: `npm ci`, `npm test`, `npx eslint . --max-warnings 0`

---

## Loop 3: Product Iteration

**Files:** `scripts/feedback-collector.js` (daily cron), `heartbeat-executor.js` (`processProductFeedback()`)

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

### Shippability Checkpoints

Each UC has an optional `shippable_after_step` field. When that workflow step completes, a `shippable_milestone` metric is written. This appears on the dashboard so humans know what's testable.

### Priority Re-ordering

When PM determines a pivot from feedback analysis, it updates `use_cases.priority` and `implementation_status` directly. The Orchestrator picks this up on the next `replenishQueue()` cycle automatically.

---

## Loop 4: Self-Learning

**Files:** `heartbeat-executor.js` (integration), `learning-system.js`, `orchestrator-decision-tracker.js`, `self-heal.js`, `daily-self-review.js`

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

## Heartbeat Execution Order

The full heartbeat cycle in `heartbeat-executor.js`:

```
1.  queryState()              -- Read queue from Supabase
2.  detectZombieTasks()       -- PID-check in_progress tasks, handle zombies
3.  checkCompletions()        -- Process completion reports
4.  spawnAgents()             -- Cross-loop learning + budget check + spawn
5.  checkBlockers()           -- Check blocked tasks
5b. runSelfHealChecks()       -- Self-heal (Loop 4)
6.  replenishQueue()          -- UC roadmap -> create tasks (Loop 1)
6b. processProductFeedback()  -- Feedback -> PM tasks (Loop 3)
6c. checkPRReviews()          -- Merge/rework PRs (Loop 2)
7.  updateDashboard()         -- Regenerate dashboard
8.  reportToTelegram()        -- Telegram report (topic 10788)
9.  logHeartbeat()            -- Write to metrics table + log file
```

---

## Dashboard Sections

File: `dashboard.html`

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
| Cost Summary | `cost_tracking` table |

---

## Spawn Context

File: `spawn-consumer.js`

When an agent is spawned, the message includes:
- Task title, ID, description
- Use case ID (if linked)
- Chain context (previous task ID, workflow step N/total)
- Retry context (retry count, last error)
- **Dev/Design agents**: branch name + instruction to commit to branch
- **QC agents**: PR number + review checklist

---

## File Reference

### Core Loop Files
| File | Role |
|------|------|
| `heartbeat-executor.js` | Main orchestration loop (all 4 loops integrated) |
| `spawn-consumer.js` | Reads spawn-queue.json, creates branches, fires agents |
| `heartbeat-wrapper.js` | Wrapper that runs heartbeat-executor + spawn-consumer |
| `task-store.js` | Supabase CRUD for tasks (accepts UC/PRD/branch/PR fields) |
| `supabase-client.js` | Lower-level Supabase task client |

### Learning & Self-Improvement
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
| `dashboard.html` | Full Supabase-driven dashboard with all 4-loop sections |

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
2. Add the agent ID to `AGENT_LABELS` map in `heartbeat-executor.js` (in `replenishQueue()` and `createFollowUpTasks()`)
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
