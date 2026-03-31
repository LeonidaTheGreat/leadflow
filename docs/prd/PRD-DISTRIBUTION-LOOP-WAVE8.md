# PRD: Distribution Loop Investigation — Wave 8

**PRD ID:** `prd-distribution-loop-wave8`  
**Status:** Approved  
**Priority:** P1 (Blocker — consumes agent budget every 10 min, cascades into meta-loops)  
**Date:** 2026-03-30  
**Author:** Product Manager  
**Supersedes:** Investigation task `50f1f67b-1f96-446a-82c5-237adbda5537`  
**Implementation Spec:** See `prd-fix-distribution-loop-consolidated` (docs/prd/PRD-FIX-DISTRIBUTION-LOOP-CONSOLIDATED.md)

---

## Executive Summary

The "PM: Distribution — Create Landing Page" task has been spawning every heartbeat (~10 min) since at least 2026-03-30 14:39. This is Wave 8 of investigating this loop. A ready dev task (`cf5ce77f`) exists referencing an earlier wave PRD — the implementation has never executed.

**This PRD is the investigation report. Implementation spec is in `PRD-FIX-DISTRIBUTION-LOOP-CONSOLIDATED.md`.**

---

## Investigation Findings

### Root Cause 1: `distribution_channels` Table Missing

```
SELECT * FROM distribution_channels → relation "distribution_channels" does not exist
```

The table was designed for Supabase cloud but never migrated to local PostgreSQL after the Supabase → local PG migration. Every heartbeat, `checkDistributionHealth()` queries this non-existent table, gets `null` back, interprets it as "no active landing page," and creates a new `no_landing_page` issue.

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`, line ~148  
**Fix:** Apply migration `006_distribution_metrics.sql` to local PG + seed active landing page row

### Root Cause 2: No Dedup Guard in `createDistributionTasks()`

`createDistributionTasks()` creates a new task unconditionally every time it's called with a `no_landing_page` issue. It does NOT check:
- Whether an identical task already exists (ready/in_progress)
- Whether the linked UC (`gtm-landing-page`) is already complete
- Whether a cooldown window has passed

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`, line ~236+  
**Fix:** Add UC completion gate + 30-min task cooldown (see consolidated PRD, REQ-1 and REQ-2)

### Root Cause 3: Loop Detector Status-Only Dedup Creates Meta-Loop

When the loop is detected (3+ tasks in 2h), `task-store.js` creates an investigation task ("PM: Loop detected — ..."). The dedup check only skips if investigation task status is NOT IN (done, failed, cancelled). Since investigation tasks are marked `done` after each PM agent completes, the next heartbeat finds no active investigation and creates another one.

**File:** `~/.openclaw/genome/core/task-store.js`, ~line 138  
**Fix:** Replace status-based dedup with timestamp-based 30-min cooldown (see consolidated PRD, REQ-3)

---

## Evidence

| Timestamp | Task Count |
|-----------|-----------|
| 2026-03-30 14:39–17:24 | 20+ "PM: Distribution — Create Landing Page" tasks (all done) |
| 2026-03-30 14:29–17:24 | 15+ "PM: Loop detected — PM: Distribution — Create Landing Page" tasks (all done) |
| Total waste | ~35 agent task slots consumed by a single bug |

---

## Implementation Plan

**There is already a ready dev task:** `cf5ce77f` — "Dev: Fix distribution loop — apply 006 migration, loop detector cooldown, UC gate (Wave 6)"

The dev task needs to be picked up and executed. It should implement the three fixes documented in `PRD-FIX-DISTRIBUTION-LOOP-CONSOLIDATED.md`.

### Fix 1: Apply Migration 006 to Local PG

File: `~/.openclaw/genome/migrations/006_distribution_metrics.sql` (or equivalent)

Create `distribution_channels` table in local PostgreSQL (`postgresql://clawdbot@localhost/openclaw`) and seed:

```sql
CREATE TABLE IF NOT EXISTS distribution_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,  -- 'landing_page', 'social', 'email', etc.
  name TEXT,
  url TEXT,
  status TEXT DEFAULT 'active',  -- 'active', 'inactive', 'pending'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed: LeadFlow landing page (deployed on Vercel)
INSERT INTO distribution_channels (project_id, channel_type, name, url, status, metadata)
VALUES (
  'leadflow',
  'landing_page',
  'LeadFlow Marketing Site',
  'https://leadflow-app.vercel.app',  -- Update with actual production URL
  'active',
  '{"registered_by": "migration-006", "note": "Vercel deployment"}'
)
ON CONFLICT DO NOTHING;
```

### Fix 2: UC Completion Gate in `distribution-collector.js`

Add at the start of `checkDistributionHealth()`:

```javascript
const UC_ISSUE_MAP = {
  no_landing_page: 'gtm-landing-page',
  zero_traffic: 'gtm-content',
  zero_signups: 'gtm-conversion',
  low_conversion: 'gtm-conversion',
  low_trial_conversion: 'gtm-onboarding'
};

const ucIds = Object.values(UC_ISSUE_MAP);
const { data: completedUcs } = await supabase
  .from('use_cases')
  .select('id, implementation_status')
  .eq('project_id', PROJECT_ID)
  .in('id', ucIds)
  .in('implementation_status', ['complete', 'done']);

const completedUcIds = new Set(completedUcs?.map(u => u.id) || []);
```

Before pushing each issue: `if (completedUcIds.has(UC_ISSUE_MAP[issueType])) continue;`

### Fix 3: 30-Min Cooldown in `createDistributionTasks()`

Before creating each task:

```javascript
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const { data: recentTask } = await supabase
  .from('tasks')
  .select('id, created_at')
  .eq('project_id', PROJECT_ID)
  .ilike('title', title.slice(0, 60) + '%')
  .gte('created_at', thirtyMinutesAgo)
  .limit(1);

if (recentTask?.length) { console.log('Cooldown: skip'); continue; }
```

### Fix 4: Timestamp-Based Loop Detector Dedup in `task-store.js`

Replace `.not('status', 'in', '("done","failed","cancelled")')` with:

```javascript
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
.not('status', 'eq', 'cancelled')
.gte('created_at', thirtyMinutesAgo)
```

---

## Acceptance Criteria

| # | Check | Verification |
|---|-------|-------------|
| AC-1 | `distribution_channels` table exists in local PG | `\d distribution_channels` returns schema |
| AC-2 | Active landing page row exists for leadflow | `SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'` → `1` |
| AC-3 | `distribution-collector.js` has UC completion gate | `grep -c 'completedUcIds\|UC_ISSUE_MAP' ~/.openclaw/genome/scripts/distribution-collector.js` → `≥2` |
| AC-4 | `distribution-collector.js` has 30-min cooldown | `grep -c 'thirtyMinutesAgo\|30 \* 60' ~/.openclaw/genome/scripts/distribution-collector.js` → `≥1` |
| AC-5 | `task-store.js` uses timestamp dedup for loop detection | `grep -c 'thirtyMinutesAgo' ~/.openclaw/genome/core/task-store.js` → `≥1` |
| AC-6 | No new "PM: Distribution — Create Landing Page" tasks in 3 consecutive heartbeats | DB query → `0` |

---

## Machine-Verifiable Acceptance Checks

```json
[
  {
    "id": "distribution-channels-exists",
    "command": "psql postgresql://clawdbot@localhost/openclaw -tAc \"SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'\"",
    "expected": "1"
  },
  {
    "id": "dc-has-uc-gate",
    "command": "grep -c 'completedUcIds\\|UC_ISSUE_MAP' ~/.openclaw/genome/scripts/distribution-collector.js",
    "expected": "2"
  },
  {
    "id": "dc-has-cooldown",
    "command": "grep -c 'thirtyMinutesAgo' ~/.openclaw/genome/scripts/distribution-collector.js",
    "expected": "1"
  },
  {
    "id": "ts-has-timestamp-dedup",
    "command": "grep -c 'thirtyMinutesAgo' ~/.openclaw/genome/core/task-store.js",
    "expected": "1"
  }
]
```

---

## Scope

**Genome project** (`~/.openclaw/genome/`):
- `core/task-store.js` — loop detection timestamp dedup
- `scripts/distribution-collector.js` — UC gate + task cooldown

**Leadflow project** (`~/projects/leadflow/`):
- Migration SQL to apply to local PG (run once)
- No product code changes needed

---

## Priority Rationale

This is **P1 (Blocker)**:
- Loop runs every 10 minutes without bound
- Each iteration wastes one agent slot + ~$0.05–0.10 in LLM cost
- The meta-loop (investigation tasks) doubles the waste
- At 35+ tasks consumed already today, this is significant orchestration overhead

**Wave 8 note:** This has been investigated 7 times before. The fix is well-specified. The bottleneck is implementation execution. The ready dev task (`cf5ce77f`) must be picked up and completed without cancellation.
