# PRD: Distribution Loop — Wave 9 Fix Escalation

**PRD ID:** `prd-distribution-loop-wave9`  
**Status:** Approved  
**Priority:** P1 (Blocker — consumes agent budget every 10 min, cascades into meta-loops)  
**Date:** 2026-03-30  
**Author:** Product Manager  
**Supersedes:** Wave 8 — `prd-distribution-loop-wave8` (docs/prd/PRD-DISTRIBUTION-LOOP-WAVE8.md)  
**UC:** `uc-distribution-loop-fix`  
**Affected Projects (needs implementation):** `genome`

---

## Why This Wave Exists

"PM: Distribution — Create Landing Page" has been spawning every heartbeat since ~2026-03-02. This is Wave 9 of the same loop. Prior waves (1–8) have investigated and documented the root causes exhaustively. The spec is complete. The fix has never been executed.

**This PRD is an escalation — no new investigation needed. The dev task must implement the 4 fixes below.**

---

## Root Causes (Confirmed — Do Not Re-Investigate)

### RC-1: `distribution_channels` table missing from local PostgreSQL

File: `~/.openclaw/genome/scripts/distribution-collector.js`, line ~149  
`checkDistributionHealth()` queries `distribution_channels` table → gets `null` → interprets as "no landing page" → creates task every heartbeat.

**Fix:** Create the table + seed active landing page row.

### RC-2: No dedup guard in `createDistributionTasks()`

File: `~/.openclaw/genome/scripts/distribution-collector.js`, line ~236+  
`createDistributionTasks()` creates a new task unconditionally — no check for:
- Whether a recent identical task exists (cooldown)
- Whether the linked UC (`gtm-landing-page`) is already `complete`

**Fix:** Add UC completion gate + 30-min cooldown before inserting.

### RC-3: Loop detector creates meta-loop via status-only dedup

File: `~/.openclaw/genome/core/task-store.js`, line ~138  
After PM finishes investigation task (marked `done`), next heartbeat finds no "active" investigation → creates another. Status-only dedup cannot stop this.

**Fix:** Replace status-based dedup with 30-min timestamp window.

---

## Implementation Spec (All Changes in `genome` Project)

### Fix 1 — Apply Migration to Local PG

Run against `postgresql://clawdbot@localhost/openclaw`:

```sql
CREATE TABLE IF NOT EXISTS distribution_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  name TEXT,
  url TEXT,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO distribution_channels (project_id, channel_type, name, url, status, metadata)
VALUES (
  'leadflow',
  'landing_page',
  'LeadFlow Marketing Site',
  'https://leadflow-app.vercel.app',
  'active',
  '{"registered_by": "migration-009", "note": "Vercel deployment"}'
)
ON CONFLICT DO NOTHING;
```

### Fix 2 — UC Completion Gate + Cooldown in `distribution-collector.js`

At the top of `checkDistributionHealth()`, before processing issues, add UC completion gating:

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

Filter out issues whose UC is already complete before returning them.

In `createDistributionTasks()`, before inserting each task, add 30-min cooldown:

```javascript
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const { data: recentTask } = await supabase
  .from('tasks')
  .select('id')
  .eq('project_id', PROJECT_ID)
  .ilike('title', title.slice(0, 60) + '%')
  .gte('created_at', thirtyMinutesAgo)
  .limit(1);
if (recentTask?.length) {
  console.log(`  Cooldown: skip "${title}"`);
  continue;
}
```

### Fix 3 — Timestamp-Based Loop Detector in `task-store.js`

In the loop detection block (~line 138), replace the status-based dedup query:

**Before:**
```javascript
.not('status', 'in', '("done","failed","cancelled")')
```

**After:**
```javascript
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
// ... add: .gte('created_at', thirtyMinutesAgo) to the existing investigation task query
```

The check should be: "was an investigation task for this prefix created in the last 30 minutes?" — regardless of its current status.

---

## Acceptance Criteria (Machine-Verifiable)

```json
[
  {
    "id": "distribution-channels-exists",
    "command": "psql postgresql://clawdbot@localhost/openclaw -tAc \"SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'\"",
    "expected": "1",
    "description": "distribution_channels table exists with active leadflow landing page row"
  },
  {
    "id": "dc-has-uc-gate",
    "command": "grep -c 'completedUcIds\\|UC_ISSUE_MAP' ~/.openclaw/genome/scripts/distribution-collector.js",
    "expected": "2",
    "description": "UC completion gate added to distribution-collector.js"
  },
  {
    "id": "dc-has-cooldown",
    "command": "grep -c 'thirtyMinutesAgo' ~/.openclaw/genome/scripts/distribution-collector.js",
    "expected": "1",
    "description": "30-min cooldown guard added to createDistributionTasks()"
  },
  {
    "id": "ts-has-timestamp-dedup",
    "command": "grep -c 'thirtyMinutesAgo' ~/.openclaw/genome/core/task-store.js",
    "expected": "1",
    "description": "Loop detector uses timestamp dedup instead of status-only"
  }
]
```

---

## Scope

| File | Change |
|------|--------|
| `~/.openclaw/genome/scripts/distribution-collector.js` | UC gate + 30-min task cooldown |
| `~/.openclaw/genome/core/task-store.js` | Timestamp-based loop detector dedup |
| Local PostgreSQL (`openclaw` DB) | Create `distribution_channels` table + seed leadflow row |

**No changes to `~/projects/leadflow/` product code.**

---

## Wave History (Do Not Investigate Again)

| Wave | Date | Outcome |
|------|------|---------|
| 1–5 | 2026-03-02 to 2026-03-10 | Root causes documented in multiple PRDs |
| 6 | 2026-03-20 | Consolidated fix spec written, dev task created |
| 7 | 2026-03-25 | Dev task cancelled (zombie_timeout) |
| 8 | 2026-03-30 | Full spec in PRD-DISTRIBUTION-LOOP-WAVE8.md, dev task `cf5ce77f` never executed |
| **9** | **2026-03-30** | **This escalation. Implement now. Do not investigate again.** |

---

## Priority Rationale

**P1 Blocker.** Each loop iteration wastes one agent slot + ~$0.05–0.10 in LLM cost. At 35+ tasks consumed per day, this is significant recurring waste. The fix is fully specified and takes < 2 hours to implement.

**The only open question is execution.**
