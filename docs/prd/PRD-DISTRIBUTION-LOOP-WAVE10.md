# PRD: Distribution Loop — Wave 10 FINAL ESCALATION

**PRD ID:** `prd-distribution-loop-wave10`  
**Status:** Approved  
**Priority:** P1 (Blocker — consumes 5–10 agent slots/day, wasting $0.50–1.00/day in LLM cost indefinitely)  
**Date:** 2026-03-30  
**Author:** Product Manager  
**Supersedes:** Wave 9 — `prd-distribution-loop-wave9`  
**UC:** `uc-distribution-loop-fix`  
**Affected Projects (needs implementation):** `genome`

---

## Why Wave 10 Exists

"PM: Distribution — Create Landing Page" has been spawning every heartbeat (every 5 min) since ~2026-03-02. This is **Wave 10**. Waves 1–9 documented root causes and wrote specs. Zero fixes have landed. The zombie_timeout pattern on Genome dev tasks suggests the implementation keeps getting stuck.

**This wave changes the approach: prioritize the STOP-GAP fix first (1 line, zero risk), then the full migration.**

---

## Root Cause (Confirmed — Final)

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`, function `checkDistributionHealth()`, line ~149

```javascript
const { data: landingPages } = await supabase
  .from('distribution_channels')
  .select('*')
  .eq('project_id', PROJECT_ID)
  .eq('channel_type', 'landing_page')
  .eq('status', 'active')

if (!landingPages || landingPages.length === 0) {
  issues.push({ type: 'no_landing_page', ... })
}
```

**The table `distribution_channels` does NOT exist in local PostgreSQL.**  
`SELECT EXISTS(SELECT FROM information_schema.tables WHERE table_name='distribution_channels')` → `false`

PostgREST returns `null` for the query (error is swallowed by destructuring).  
`!landingPages` evaluates to `true` → always pushes `no_landing_page` → creates task every heartbeat.

**Confirmed:** `distribution_channels` table does not exist as of 2026-03-30T22:00 UTC.

---

## Wave History (Do Not Investigate Again)

| Wave | Date | Spec Written | Why Fix Failed |
|------|------|-------------|----------------|
| 1–5 | 2026-03-02 to 2026-03-10 | Yes | Root cause analysis phase |
| 6 | 2026-03-20 | Yes (consolidated) | Dev task created but not tracked |
| 7 | 2026-03-25 | Yes | zombie_timeout |
| 8 | 2026-03-30 | Yes | Dev task `cf5ce77f` never executed |
| 9 | 2026-03-30 | Yes (`prd-distribution-loop-wave9`) | zombie_timeout again |
| **10** | **2026-03-30** | **This doc** | **Implement stop-gap FIRST** |

---

## Two-Phase Implementation

### Phase A — STOP-GAP (1 file, 5 lines, ~10 minutes) — DO THIS FIRST

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`  
**Function:** `checkDistributionHealth()`, inside the `distribution_channels` query block

**Change:** Add error check — if PostgREST returns an error for the query, skip the `no_landing_page` issue instead of treating null as "no table = no landing page".

**Current code (lines ~145–160):**
```javascript
const { data: landingPages } = await supabase
  .from('distribution_channels')
  .select('*')
  .eq('project_id', PROJECT_ID)
  .eq('channel_type', 'landing_page')
  .eq('status', 'active')

if (!landingPages || landingPages.length === 0) {
  issues.push({
    type: 'no_landing_page',
    severity: 'critical',
    message: 'No active landing page — visitors have nowhere to sign up',
    uc_template: 'landing-page'
  })
}
```

**Replace with:**
```javascript
const { data: landingPages, error: lpError } = await supabase
  .from('distribution_channels')
  .select('*')
  .eq('project_id', PROJECT_ID)
  .eq('channel_type', 'landing_page')
  .eq('status', 'active')

if (lpError) {
  console.warn('  [distribution] distribution_channels query failed (table may not exist) — skipping no_landing_page check:', lpError.message)
} else if (!landingPages || landingPages.length === 0) {
  issues.push({
    type: 'no_landing_page',
    severity: 'critical',
    message: 'No active landing page — visitors have nowhere to sign up',
    uc_template: 'landing-page'
  })
}
```

**Effect:** If the table doesn't exist, the error is caught → no `no_landing_page` issue → no task created. **Loop stops immediately.**

---

### Phase B — FULL FIX (Migration + Cooldown Guard)

#### Fix B1 — Create `distribution_channels` table and seed it

Run against local PostgreSQL (`postgresql://clawdbot@localhost/openclaw`):

```sql
-- Create table
CREATE TABLE IF NOT EXISTS distribution_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  name TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed LeadFlow landing page (it's live at getleadflow.ai / leadflow.imagineapi.org)
INSERT INTO distribution_channels (project_id, channel_type, name, url, status)
VALUES ('leadflow', 'landing_page', 'LeadFlow Landing Page', 'https://leadflow.imagineapi.org', 'active')
ON CONFLICT DO NOTHING;
```

**Run via:** `psql postgresql://clawdbot@localhost/openclaw -c "..."` or save to `~/.openclaw/genome/migrations/007_distribution_channels.sql`

#### Fix B2 — Add cooldown guard in `createDistributionTasks()`

**File:** `~/.openclaw/genome/scripts/distribution-collector.js`, function `createDistributionTasks()`

Before `store.createTask(...)`, add a 30-minute cooldown check:

```javascript
// Cooldown: don't recreate if same title was created in last 30 min
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
const { data: recentTask } = await supabase
  .from('tasks')
  .select('id, created_at')
  .eq('project_id', PROJECT_ID)
  .eq('title', title)
  .gte('created_at', thirtyMinutesAgo)
  .limit(1)

if (recentTask?.length > 0) {
  console.log(`  [distribution] Cooldown active for "${title}" (created ${recentTask[0].created_at}) — skipping`)
  continue
}

await store.createTask({ ... })
```

#### Fix B3 — Loop detector timestamp-based dedup

**File:** `~/.openclaw/genome/core/task-store.js`, line ~147

**Current (status-based — breaks when PM completes investigation):**
```javascript
const { data: existingInv } = await this.supabase.from('tasks').select('id')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .not('status', 'in', '("done","failed","cancelled")')
  .limit(1)
if (!existingInv?.length) { /* create investigation task */ }
```

**Replace with (timestamp-based — prevents re-creation for 30 min regardless of status):**
```javascript
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
const { data: existingInv } = await this.supabase.from('tasks').select('id')
  .eq('project_id', this.projectId)
  .eq('title', invTitle)
  .gte('created_at', thirtyMinutesAgo)
  .limit(1)
if (!existingInv?.length) { /* create investigation task */ }
```

---

## Files to Modify (Genome Only)

| File | Change | Phase |
|------|--------|-------|
| `~/.openclaw/genome/scripts/distribution-collector.js` | Error check for missing table (stop-gap) | A |
| `~/.openclaw/genome/scripts/distribution-collector.js` | 30-min cooldown guard in `createDistributionTasks()` | B |
| `~/.openclaw/genome/core/task-store.js` | Timestamp-based loop detector dedup | B |
| Local PostgreSQL `openclaw` DB | Create `distribution_channels` table + seed row | B |

**No changes to `/Users/clawdbot/projects/leadflow/` product code required.**

---

## Acceptance Criteria

### AC-1: Stop-gap works (Phase A)
After Phase A lands, running `checkDistributionHealth()` when `distribution_channels` table is missing should produce 0 tasks. The function should log the skipped check and return `[]`.

**Machine check:**
```json
{
  "id": "distribution-health-no-error-swallow",
  "command": "grep -c 'lpError' ~/.openclaw/genome/scripts/distribution-collector.js",
  "expected": "1",
  "description": "Error variable captured from distribution_channels query"
}
```

### AC-2: Table exists and seeded (Phase B)
```json
{
  "id": "distribution-channels-table-exists",
  "command": "psql postgresql://clawdbot@localhost/openclaw -t -c \"SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'\"",
  "expected": "1",
  "description": "LeadFlow landing page seeded in distribution_channels"
}
```

### AC-3: Cooldown guard present (Phase B)
```json
{
  "id": "cooldown-guard-present",
  "command": "grep -c 'thirtyMinutesAgo' ~/.openclaw/genome/scripts/distribution-collector.js",
  "expected": "1",
  "description": "30-min cooldown guard in createDistributionTasks"
}
```

### AC-4: Loop detector uses timestamp dedup (Phase B)
```json
{
  "id": "loop-detector-timestamp-dedup",
  "command": "grep -c 'thirtyMinutesAgo' ~/.openclaw/genome/core/task-store.js",
  "expected": "1",
  "description": "Loop detector uses timestamp-based dedup"
}
```

### AC-5: No new distribution loop tasks (Integration)
After fix lands, no new "PM: Distribution — Create Landing Page" task should appear for at least 4 hours.

---

## E2E Test Specs

### T1: Stop-gap — DB error handled gracefully
- **Setup:** `distribution_channels` table dropped (or doesn't exist)
- **Action:** Call `checkDistributionHealth()`
- **Expected:** Returns `[]`; logs `"distribution_channels query failed ... skipping"`. No task created.

### T2: Normal flow with seeded table
- **Setup:** `distribution_channels` has active landing_page row
- **Action:** Call `checkDistributionHealth()`
- **Expected:** `no_landing_page` issue NOT in results.

### T3: Cooldown blocks duplicate tasks
- **Setup:** Task "PM: Distribution — Create Landing Page" created 5 min ago
- **Action:** Call `createDistributionTasks([{ type: 'no_landing_page', ... }])`
- **Expected:** No new task created; logs "Cooldown active".

### T4: Loop detector not re-triggered after investigation complete
- **Setup:** Loop detected, investigation task created and marked `done`
- **Action:** Wait < 30 min; trigger same loop condition
- **Expected:** No new investigation task created (timestamp dedup active).

---

## Implementation Order (Critical)

**Do Phase A FIRST.** It takes 10 minutes and stops the loop immediately.  
Do Phase B next. It prevents the loop from recurring even after the table is eventually dropped or reset.

**Do NOT skip Phase A to do Phase B first.** Phase A is the difference between the loop stopping today vs. Phase B failing with another zombie_timeout and the loop continuing for Wave 11.
