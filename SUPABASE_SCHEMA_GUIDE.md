# 📊 Supabase Schema Migration Guide

## Overview

Moving **all** DASHBOARD.md sections to Supabase makes it the **true single source of truth** for everything:
- Project metadata (goal, deadline, status)
- System components (deployment, integrations, compliance)
- Agent activity
- Completed work
- Action items & blockers
- Cost tracking

Once in Supabase, both DASHBOARD.md and dashboard.html can be **fully generated** from the database with zero manual updates.

---

## New Tables

### 1. **project_metadata**
Project-level configuration and overall status.

```sql
project_id          -- 'leadflow' (unique identifier)
project_name        -- 'LeadFlow AI'
goal                -- '$20K MRR within 60 days'
goal_value_usd      -- 20000
deadline_days       -- 60
overall_status      -- ACTIVE | PAUSED | COMPLETE | AT_RISK
status_color        -- 🟢 | 🟡 | 🔴
```

**When to update:**
- User changes deadline/goal → Update here
- Project status changes → Update here

---

### 2. **system_components**
Status of all system pieces (deployment, integrations, databases, compliance).

```sql
project_id      -- 'leadflow'
component_name  -- 'Vercel Deployment', 'FUB Integration', etc.
category        -- DEPLOYMENT | INTEGRATION | DATABASE | COMPLIANCE | TESTING
status          -- LIVE | READY | TESTING | DOWN | PENDING
status_emoji    -- ✅ | 🟡 | ❌ | ⏳
details         -- 'https://leadflow-ai...' or description
verified_date   -- When last verified
```

**When to update:**
- Deploy new version → status='LIVE'
- Integration fails → status='DOWN'
- New system added → INSERT new row

---

### 3. **agents**
Agent activity tracking (not the orchestrator tasks, but the agent *teams*).

```sql
project_id      -- 'leadflow'
agent_name      -- 'Dev', 'Marketing', 'QC', etc.
agent_type      -- dev | marketing | qc | analytics | product
status          -- ACTIVE | READY | WAITING | COMPLETE | BLOCKED
progress_percent -- 0-100
current_task    -- What they're working on
blocker         -- What's holding them up
```

**When to update:**
- Agent changes current task → UPDATE current_task
- Agent gets blocked → UPDATE status='BLOCKED', blocker='reason'
- Agent finishes → UPDATE status='COMPLETE'

---

### 4. **completed_work**
Features/tasks that have been finished (separate from task queue).

```sql
project_id      -- 'leadflow'
work_name       -- 'Cal.com Integration', 'Outbound SMS', etc.
use_case        -- 'UC-6', 'UC-7', or NULL
description     -- What was built
category        -- FEATURE | DEPLOYMENT | INTEGRATION | TESTING
hours_spent     -- 2, 8, 12, etc.
completed_date  -- When done
status          -- COMPLETE | IN_PROGRESS | BLOCKED
```

**When to update:**
- Feature completes → INSERT new row with status='COMPLETE'
- Feature status changes → UPDATE status
- Add retrospective hours → UPDATE hours_spent

---

### 5. **action_items**
Blockers, decisions, and outstanding items that need action.

```sql
project_id      -- 'leadflow'
title           -- 'Marketing Recruitment Timing'
type            -- BLOCKER | DECISION | APPROVAL | FOLLOW_UP | RISK
status          -- OPEN | IN_PROGRESS | RESOLVED | WAITING
priority        -- 1=critical, 2=high, 3=normal, 4=low
description     -- Details
awaiting_input  -- 'Stojan' (who needs to decide)
impact          -- 'Determines first revenue timeline'
action_needed   -- 'Say "go ahead with recruitment"'
due_date        -- When it needs to be done
```

**When to update:**
- New blocker appears → INSERT
- User makes decision → UPDATE status='RESOLVED'
- Item no longer relevant → DELETE or UPDATE status='RESOLVED'

---

### 6. **cost_tracking**
Budget and spend tracking.

```sql
project_id              -- 'leadflow'
budget_period           -- TOTAL | DAILY | WEEKLY | MONTHLY
estimated_cost_usd      -- $95.80
actual_cost_usd         -- What we've actually spent
budget_limit_usd        -- $500 (the cap)
spend_percent           -- 19.16% (estimated/budget)
breakdown               -- JSON: {"sonnet": 45.50, "haiku": 12.30}
```

**When to update:**
- Agent completes task with cost → UPDATE actual_cost_usd
- Budget limit changes → UPDATE budget_limit_usd
- Monthly reset → UPDATE budget_period

---

### 7. **dashboard_snapshots** (Optional Archive)
Historical snapshots for trending & analytics.

Captures queue state + system health at a point in time. Useful for:
- "How many tasks were we working on yesterday?"
- "Has system health improved?"
- "Burn rate trending"

---

## Migration Steps

### Step 1: Create Tables in Supabase

Copy the SQL from `supabase-schema-migration.sql` into Supabase SQL editor:

```bash
# Or use CLI:
# supabase db push
```

### Step 2: Initial Data (Already Included)

The SQL file includes INSERT statements for leadflow:
- Project metadata
- 9 system components (Vercel, FUB, Twilio, etc.)
- 5 agents (Dev, Marketing, QC, Analytics, Deployment)
- 5 completed work items
- 2 action items
- Cost tracking

### Step 3: Update Dashboard Generators

I'll create `dashboard-from-supabase.js` that queries these tables instead of hardcoding.

---

## How It Works

### Before (Hardcoded)
```javascript
// DASHBOARD.md had static sections
// I had to manually update each section
// Risk: Could get stale or out of sync
```

### After (Database-driven)
```javascript
// Query project_metadata → get goal, status, days
// Query system_components → build system status section
// Query agents → build agent activity section
// Query completed_work → build completed work section
// Query action_items → build blockers section
// Query tasks (existing) → build task queue section
// Query cost_tracking → build cost summary section

// Generate DASHBOARD.md from all these queries
// Generate dashboard.html from same queries
// Both always in sync ✅
```

---

## Real Example: Making a Change

### Scenario: User approves marketing recruitment

**Before (manual update):**
```
1. I update DASHBOARD.md in action_items section
2. Update agents/Marketing status
3. Spawn marketing task
4. Regenerate dashboard
5. Risk: Inconsistency between files
```

**After (database-driven):**
```
1. I UPDATE action_items table (status='RESOLVED')
2. I UPDATE agents table (status='ACTIVE', blocker=NULL)
3. I spawn marketing task (adds to tasks table)
4. Dashboard generators auto-query all tables
5. DASHBOARD.md regenerates
6. dashboard.html auto-refreshes
7. Everything in sync ✅
```

---

## Table Relationships

```
project_metadata (1)
    ├── system_components (many)
    ├── agents (many)
    ├── completed_work (many)
    ├── action_items (many)
    ├── cost_tracking (many)
    ├── tasks (many) ← existing table
    └── dashboard_snapshots (many)
```

All tied together by `project_id = 'leadflow'`.

---

## New Generator Functions

Once tables exist, I'll create:

1. **`query-project.js`** — Fetch all project data for dashboard
   ```javascript
   const project = await queryProject('leadflow')
   // Returns: { metadata, components, agents, work, items, costs, queue }
   ```

2. **`generate-dashboard-from-db.js`** — Creates DASHBOARD.md from queries
   ```bash
   node generate-dashboard-from-db.js
   # Reads all tables → Generates DASHBOARD.md
   ```

3. **Enhanced `dashboard.html`** — Reads all tables
   - Real-time system component status
   - Live agent activity
   - Current action items
   - Task queue
   - Cost tracking

---

## Benefits

✅ **Single source of truth** — Supabase only  
✅ **Zero manual updates** — Generators query tables  
✅ **Both dashboards stay in sync** — Same data source  
✅ **Historical tracking** — snapshots table for trends  
✅ **Audit trail** — When things changed and who  
✅ **Fully automated** — DASHBOARD.md regenerates on any update  
✅ **Real-time web dashboard** — HTML reads directly from Supabase  

---

## Implementation Order

1. **Create tables** (SQL above)
2. **Migrate existing data** (INSERT statements included)
3. **Create query functions** (I'll build this)
4. **Update dashboard generators** (DASHBOARD.md from DB)
5. **Enhance HTML dashboard** (dashboard.html from DB)
6. **Test sync** (update one field → see both dashboards refresh)

---

## Next: What You Need to Do

1. ✅ Confirm you want to proceed
2. ⏳ I run the SQL migration
3. ⏳ I build the query & generator functions
4. ⏳ Test that both dashboards auto-sync

Ready?
