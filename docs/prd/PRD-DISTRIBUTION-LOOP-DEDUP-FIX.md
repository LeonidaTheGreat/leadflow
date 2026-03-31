# PRD: Distribution Loop Deduplication Fix — Definitive Spec (Wave 4)

**PRD ID:** PRD-DISTRIBUTION-LOOP-DEDUP-FIX  
**Status:** approved  
**Priority:** 1 (Blocker — causes recurring noise tasks every heartbeat, wasting agent budget)  
**Owner:** Product Manager  
**Created:** 2026-03-30 (Wave 1)  
**Updated:** 2026-03-30 — Wave 4 (4th occurrence). CONFIRMED ROOT CAUSE: Migration 006 never applied to local PostgreSQL. Tables don't exist. MUST execute Fix A-pre before anything else.

---

## Problem Statement

Every heartbeat cycle, the distribution health check (Loop 6) creates a new
"PM: Distribution — Create Landing Page" task — even though the landing page
has been live and deployed since Day 1.

**Evidence (3 waves):**

| Wave | Date       | Trigger Tasks | Investigation Tasks |
|------|------------|---------------|---------------------|
| 1    | 2026-03-02 | 10+ duplicates | Multiple            |
| 2    | 2026-03-30 | 8 in 2h       | 5 loop-detected     |
| 3    | 2026-03-30 | 3 in 7 min    | 6 loop-detected (continuing) |

Wave 3 concrete task IDs (today, 12:36–12:43):
- PM: Distribution — Create Landing Page × 3 (all done within minutes)
- PM: Loop detected — PM: Distribution × 6 (12:48–13:54, still spawning)

---

## Root Cause Analysis — Two Bugs

### Bug 1: `distribution_channels` table DOES NOT EXIST (PRIMARY TRIGGER — CONFIRMED WAVE 4)

`checkDistributionHealth()` in `~/.openclaw/genome/scripts/distribution-collector.js` queries the `distribution_channels` table via PostgREST at `LOCAL_POSTGREST_URL` (http://localhost:8787).

**Wave 4 investigation confirmed:**
- `distribution_channels` table does NOT exist in local PostgreSQL
- `distribution_metrics` table does NOT exist in local PostgreSQL
- Migration `006_distribution_metrics.sql` was NEVER applied to local PG
- PostgREST at `localhost:8787` returns "Not found" for all queries
- The Supabase JS client silently returns `null/[]` when PostgREST is unavailable
- Result: query always returns empty → always raises `no_landing_page` → always creates a new task

**Corrected Fix A — run migration first, then seed:**

Step 1 — Apply migration:
```bash
psql "$LOCAL_PG_URL" -f ~/.openclaw/genome/migrations/006_distribution_metrics.sql
```

Step 2 — Seed the landing page record (using direct psql since PostgREST is gone):
```sql
INSERT INTO distribution_channels (project_id, channel_type, name, url, status, metadata)
VALUES (
  'leadflow',
  'landing_page',
  'LeadFlow Marketing Landing Page',
  'https://www.imagineapi.org',
  'active',
  '{"source": "manual_seed", "seeded_at": "2026-03-30", "notes": "Landing page deployed at Wave 1 - Day 1."}'
) ON CONFLICT (project_id, channel_type, name) DO UPDATE SET status = 'active';
```

**But this only solves seeding. The distribution-collector.js also needs to use direct PG (not PostgREST) since PostgREST no longer runs.**

Step 3 — Update `distribution-collector.js` to use direct PostgreSQL:
Replace the PostgREST/supabase client with a `pg.Pool` using `LOCAL_PG_URL` from `~/.env`.

### Bug 2: Loop detector itself has no cooldown (AMPLIFIER — NEWLY IDENTIFIED)

The loop detector in `~/.openclaw/genome/core/task-store.js` (~line 139) creates a PM investigation task when it detects 3+ identical tasks in 2h:

```js
const { data: existingInv } = await this.supabase.from('tasks').select('id')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .not('status', 'in', '("done","failed","cancelled")')  // ← only checks ACTIVE
  .limit(1)
if (!existingInv?.length) {
  // creates new investigation task
}
```

**Problem:** The check only skips if there is an ACTIVE investigation task. When PM completes the investigation task (marks done), the NEXT heartbeat will create another investigation task. Since the underlying condition (no landing page in `distribution_channels`) persists, the loop detector keeps firing every time 3 more trigger tasks accumulate.

Wave 3 shows 6 consecutive "PM: Loop detected" tasks created 10 minutes apart — the loop detector is itself in a loop.

### Bug 3: `createDistributionTasks()` has no dedup guard (AMPLIFIER)

`createDistributionTasks()` calls `store.createTask()` which has dedup logic, but the dedup only blocks creation when a task with the same `use_case_id + agent_id` exists in a NON-terminal status. Once the PM task completes (`done`), the next heartbeat creates another one. Over 5-minute heartbeats, 3 tasks can accumulate in a 15-minute window.

---

## Required Fixes

### Fix A — Seed `distribution_channels` with active landing page [Genome Dev]

**File:** `~/.openclaw/genome/scripts/seed-gtm-use-cases.js` (or a new migration script)  
**Location:** Genome core, applied to local PostgreSQL

Run this SQL (idempotent):
```sql
INSERT INTO distribution_channels (
  project_id, channel_type, name, url, status, metadata
) VALUES (
  'leadflow',
  'landing_page',
  'LeadFlow Marketing Landing Page',
  'https://www.imagineapi.org',
  'active',
  '{"source": "manual_seed", "seeded_at": "2026-03-30", "notes": "Landing page deployed at Wave 1 - Day 1. Seeded retroactively."}'
) ON CONFLICT (project_id, channel_type, name) DO UPDATE SET status = 'active';
```

**Acceptance:** `SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'` returns `1`.

---

### Fix B — Add dedup guard to `createDistributionTasks()` [Genome Dev]

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`  
**Function:** `createDistributionTasks(issues)`

Add dedup check BEFORE calling `store.createTask()`:

```js
// Dedup window: 7 days
const DEDUP_WINDOW_DAYS = 7

for (const issue of issues) {
  const template = UC_WORKFLOWS[issue.uc_template]
  if (!template) continue

  const firstAgent = template.workflow[0]
  const AGENT_LABELS = config.agents.labels
  const label = AGENT_LABELS[firstAgent] || firstAgent
  const title = `${label}: Distribution — ${template.name}`

  // NEW: Check for existing task in last DEDUP_WINDOW_DAYS (any status)
  const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('tasks')
    .select('id, status, created_at')
    .eq('project_id', PROJECT_ID)
    .ilike('title', title)
    .gte('created_at', dedupCutoff)
    .limit(1)

  if (existing?.length > 0) {
    console.log(`  [Distribution] Skipping duplicate: "${title}" (last: ${existing[0].created_at}, status: ${existing[0].status})`)
    continue
  }

  await store.createTask({ title, ... })
  console.log(`  Created task: ${title} (${issue.severity})`)
}
```

**Acceptance:**
- Running `createDistributionTasks()` twice with the same issues within 7 days creates exactly 1 task
- Skipped tasks are logged: `[Distribution] Skipping duplicate: "..."` 
- `grep -c 'Skipping duplicate' ~/.openclaw/genome/scripts/distribution-collector.js` returns ≥ 1

---

### Fix C — Add 24h cooldown to loop detector [Genome Dev]

**File:** `~/.openclaw/genome/core/task-store.js`  
**Location:** Runtime loop detection block (~line 139)

Replace the current "active task check" with a "recently created check":

```js
// CURRENT (broken — only checks active tasks):
const { data: existingInv } = await this.supabase.from('tasks').select('id')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .not('status', 'in', '("done","failed","cancelled")')
  .limit(1)

// FIXED (check last 24h regardless of status):
const cooldownStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
const { data: existingInv } = await this.supabase.from('tasks').select('id')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .gte('created_at', cooldownStart)   // any status in last 24h
  .limit(1)
```

**Acceptance:**
- After loop investigation task is created and completed (done), no new loop investigation task is created for the same trigger within 24h
- `grep -c 'cooldownStart\|24 \* 60 \* 60' ~/.openclaw/genome/core/task-store.js` returns ≥ 1

---

## Implementation Sequence

1. **Genome Dev** — Fix A-pre: Apply migration `006_distribution_metrics.sql` to local PostgreSQL (2 minutes)
2. **Genome Dev** — Fix A: Seed landing page record in `distribution_channels` (2 minutes)
3. **Genome Dev** — Fix A-db: Update `distribution-collector.js` to use `pg.Pool` with `LOCAL_PG_URL` instead of PostgREST (30 minutes)
4. **Genome Dev** — Fix B: Add dedup guard in `distribution-collector.js` createDistributionTasks() (15 minutes)
5. **Genome Dev** — Fix C: Add 24h cooldown in `task-store.js` loop detector (10 minutes)
6. **Genome QC** — Verify all acceptance checks pass

**Order is critical:** Fix A-pre + A must run first (eliminates trigger). Fix A-db is required because PostgREST is no longer running. Fixes B and C are defense-in-depth layers.

---

## Machine-Verifiable Acceptance Checks

```json
[
  {
    "id": "distribution-table-exists",
    "command": "cd /Users/clawdbot/projects/leadflow && node -e \"require('dotenv').config({path:'.env'});const {Pool}=require('pg');const p=new Pool({connectionString:process.env.LOCAL_PG_URL});p.query(\\\"SELECT COUNT(*)::int as c FROM information_schema.tables WHERE table_name='distribution_channels'\\\").then(r=>{console.log(r.rows[0].c);p.end()})\" 2>/dev/null | tail -1",
    "expected": "1"
  },
  {
    "id": "distribution-channels-seeded",
    "command": "cd /Users/clawdbot/projects/leadflow && node -e \"require('dotenv').config({path:'.env'});const {Pool}=require('pg');const p=new Pool({connectionString:process.env.LOCAL_PG_URL});p.query(\\\"SELECT COUNT(*)::int as c FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'\\\").then(r=>{console.log(r.rows[0].c);p.end()})\" 2>/dev/null | tail -1",
    "expected": "1"
  },
  {
    "id": "collector-uses-pg-not-postgrest",
    "command": "grep -c 'LOCAL_PG_URL\\|pg.Pool\\|new Pool' ~/.openclaw/genome/scripts/distribution-collector.js || echo 0",
    "expected": "1"
  },
  {
    "id": "dedup-guard-in-collector",
    "command": "grep -c 'Skipping duplicate' ~/.openclaw/genome/scripts/distribution-collector.js || echo 0",
    "expected": "1"
  },
  {
    "id": "loop-detector-cooldown-fix",
    "command": "grep -c 'cooldownStart\\|24 \\* 60 \\* 60' ~/.openclaw/genome/core/task-store.js || echo 0",
    "expected": "1"
  }
]
```

---

## Definition of Done

- [ ] `distribution_channels` has ≥ 1 active `landing_page` row for `leadflow`
- [ ] `checkDistributionHealth()` returns empty issues array when table is populated
- [ ] `createDistributionTasks()` skips creation when equivalent task exists in last 7 days
- [ ] Loop detector check uses 24h window instead of "not done/failed/cancelled"
- [ ] Zero new "PM: Distribution — Create Landing Page" tasks for 3 consecutive heartbeats (15 minutes)
- [ ] Zero new "PM: Loop detected — PM: Distribution" tasks for 24h after fix

---

## Out of Scope

- The landing page itself (already deployed, separate issue)
- Traffic/conversion metrics (no data → health check correctly flags zero traffic, not this loop)
- Rebuilding the landing page (the `gtm-landing-page` UC is already `complete`)

---

## Notes for Dev Agent

- Genome lives at `~/.openclaw/genome/` — that's where Fixes B and C go
- Fix A is a SQL statement against local PostgreSQL (`LOCAL_PG_URL` from `~/.env`)
- The landing page is already deployed — this is purely a DB registration issue
- Do NOT modify any files in `~/projects/leadflow/` for these fixes
- After applying Fix A, verify `checkDistributionHealth()` returns `[]` by running the function standalone
- This problem has occurred 3 times. Previous agents have written PRDs but not executed the SQL. Execute the SQL this time.
