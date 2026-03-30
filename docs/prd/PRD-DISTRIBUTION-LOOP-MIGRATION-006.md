# PRD: Distribution Loop — Migration 006 Not Applied to Local PostgreSQL

**PRD ID:** `prd-distribution-loop-migration-006`  
**Status:** approved  
**Priority:** 1 (Blocker — causing recurring noise tasks, burning agent budget every heartbeat)  
**Owner:** Product Manager  
**Created:** 2026-03-30  
**Supersedes:** PRD-DISTRIBUTION-LOOP-FIX.md, PRD-DISTRIBUTION-LOOP-DEDUP-FIX.md (prior specs targeted Supabase; this targets local PG)

---

## Executive Summary

The distribution health check creates "PM: Distribution — Create Landing Page" every heartbeat because `distribution_channels` table does not exist in local PostgreSQL. Migration `006_distribution_metrics.sql` was never applied to local PG after the Supabase→local PG migration. The table existed in Supabase (and was seeded there), but the genome now uses local PG exclusively.

**This single fix stops the loop permanently.**

---

## Root Cause (Confirmed)

### Step-by-step chain of failure

```
1. distribution-collector.js runs every heartbeat (Loop 6)
2. checkDistributionHealth() queries:
       SELECT * FROM distribution_channels
       WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'
3. Table does NOT exist in local PG → query returns null
4. null is treated as "no landing page" → issues.push({ type: 'no_landing_page' })
5. createDistributionTasks() calls store.createTask("PM: Distribution — Create Landing Page")
6. Heartbeat repeats every ~5 min → 3 identical tasks in <2h
7. Loop detector fires → creates "PM: Loop detected — PM: Distribution..." task
8. Investigation task is completed (marked done)
9. Heartbeat resumes → 3 more tasks → loop detector fires again
10. GOTO 7 (repeating every ~30 min)
```

### Verified evidence

```bash
# Table does not exist in local PG:
/opt/homebrew/Cellar/postgresql@16/16.13/bin/psql "postgresql://clawdbot@localhost/openclaw" -c "\dt distribution*"
# → Did not find any relation named "distribution*"

# 5 consecutive "PM: Loop detected" tasks in local PG tasks table (today):
# 2026-03-30 13:15, 13:30, 13:39, 13:54, 14:04 — all "done" except current
```

### Why prior PRDs didn't fix it

- PRD-DISTRIBUTION-LOOP-FIX.md specified seeding Supabase → was done (Supabase has the row)
- PRD-DISTRIBUTION-LOOP-DEDUP-FIX.md specified dedup logic in distribution-collector.js
- **Neither addressed the local PG table creation** — the system migrated to local PG after those PRDs were written

---

## Required Fixes

### Fix 1 (PRIMARY): Apply Migration 006 to Local PostgreSQL

**Owner:** Genome Dev agent  
**File:** `~/.openclaw/genome/migrations/006_distribution_metrics.sql`  
**Action:** Run migration against local PG database `postgresql://clawdbot@localhost/openclaw`

```bash
/opt/homebrew/Cellar/postgresql@16/16.13/bin/psql "postgresql://clawdbot@localhost/openclaw" \
  -f ~/.openclaw/genome/migrations/006_distribution_metrics.sql
```

This creates:
- `distribution_channels` table
- `distribution_metrics` table
- Required indexes

### Fix 2 (PRIMARY): Seed Landing Page Record in Local PG

**Owner:** Genome Dev agent  
**Action:** Insert the LeadFlow landing page into the newly created table

```sql
INSERT INTO distribution_channels (project_id, channel_type, name, url, status, metadata)
VALUES (
  'leadflow',
  'landing_page',
  'Main landing page',
  'https://leadflow-ai-five.vercel.app',
  'active',
  '{"source": "leadflow-product", "registered_by": "migration-fix-006"}'
)
ON CONFLICT DO NOTHING;
```

After this insert, `checkDistributionHealth()` will find the landing page and stop creating tasks.

### Fix 3 (SECONDARY): Add Dedup Guard to `createDistributionTasks()` [Genome]

**Owner:** Genome Dev agent  
**File:** `~/.openclaw/genome/scripts/distribution-collector.js`  
**Function:** `createDistributionTasks(issues)` (~line 236)

Even after seeding, future table issues could re-trigger the loop. Add a title-based dedup check:

```javascript
async function createDistributionTasks(issues) {
  if (issues.length === 0) return

  const { TaskStore } = require('../core/task-store')
  const store = new TaskStore()

  for (const issue of issues) {
    const template = UC_WORKFLOWS[issue.uc_template]
    if (!template) continue

    const firstAgent = template.workflow[0]
    const AGENT_LABELS = config.agents.labels
    const label = AGENT_LABELS[firstAgent] || firstAgent
    const title = `${label}: Distribution — ${template.name}`

    // [NEW] Dedup guard: skip if task with same title created in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await store.supabase
      .from('tasks')
      .select('id, status, created_at')
      .eq('project_id', store.projectId)
      .ilike('title', title)
      .gte('created_at', sevenDaysAgo)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`[Distribution] Skipping duplicate task: "${title}" (last: ${existing[0].created_at}, status: ${existing[0].status})`)
      continue
    }

    await store.createTask({ /* ... existing code ... */ })
    console.log(`  Created task: ${title} (${issue.severity})`)
  }
}
```

### Fix 4 (SECONDARY): Extend Loop Detector Cooldown

**Owner:** Genome Dev agent  
**File:** `~/.openclaw/genome/core/task-store.js` (~line 147)

The loop detector currently only skips if an investigation task is in `ready/in_progress` status. Once the PM marks it done, a new one is created. Change to check for ANY investigation task in the last 24h:

```javascript
// BEFORE (only checks active tasks):
.not('status', 'in', '("done","failed","cancelled")')

// AFTER (checks last 24h regardless of status):
.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
```

---

## Acceptance Criteria

### AC-1: Migration applied, table exists
```bash
/opt/homebrew/Cellar/postgresql@16/16.13/bin/psql "postgresql://clawdbot@localhost/openclaw" \
  -c "SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'"
# Expected: COUNT = 1
```

### AC-2: No new "Create Landing Page" distribution tasks after fix
```sql
SELECT COUNT(*) FROM tasks
WHERE title = 'PM: Distribution — Create Landing Page'
  AND status = 'ready'
  AND created_at > NOW() - INTERVAL '2 hours';
-- Expected: 0
```

### AC-3: No new loop detection tasks after fix
```sql
SELECT COUNT(*) FROM tasks
WHERE title LIKE 'PM: Loop detected — PM: Distribution%'
  AND status = 'ready'
  AND created_at > NOW() - INTERVAL '2 hours';
-- Expected: 0
```

### AC-4: Distribution health check passes cleanly
```bash
cd ~/.openclaw/genome && node -e "
require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { checkDistributionHealth } = require('./scripts/distribution-collector');
checkDistributionHealth().then(issues => {
  const noLandingPage = issues.filter(i => i.type === 'no_landing_page');
  console.log('no_landing_page issues:', noLandingPage.length);
  process.exit(noLandingPage.length === 0 ? 0 : 1);
});
"
# Expected: exit code 0, logs "no_landing_page issues: 0"
```

---

## E2E Test Specs

### Test 1: Distribution health check returns no landing page issues
- **Setup:** Migration 006 applied, landing page seeded
- **Action:** Run `checkDistributionHealth()`
- **Expected:** Returns array with no `no_landing_page` issues
- **Verify:** `issues.filter(i => i.type === 'no_landing_page').length === 0`

### Test 2: Dedup prevents second task creation (requires Fix 3)
- **Setup:** One "PM: Distribution — Create Landing Page" task exists (any status, created <7d ago)
- **Action:** Run `createDistributionTasks([{ type: 'no_landing_page', uc_template: 'landing-page' }])`
- **Expected:** No new task created, log shows "Skipping duplicate task"
- **Verify:** Task count unchanged after call

### Test 3: Loop detection silent for 2h after fix
- **Setup:** All fixes applied
- **Action:** Wait 2 heartbeat cycles (~10 min)
- **Expected:** No new "PM: Loop detected" tasks created
- **Verify:**
  ```sql
  SELECT COUNT(*) FROM tasks
  WHERE title LIKE 'PM: Loop detected — PM: Distribution%'
    AND created_at > NOW() - INTERVAL '2 hours'
  -- Expected: 0 new tasks
  ```

---

## Implementation Order

1. **[GENOME-DEV] Apply migration 006 to local PG** — unblocks everything else
2. **[GENOME-DEV] Seed landing page record** — stops the loop immediately
3. **[GENOME-DEV] Add dedup guard in distribution-collector.js** — prevents future loops
4. **[GENOME-DEV] Extend loop detector cooldown in task-store.js** — reduces meta-task noise
5. **[QC] Verify all 4 acceptance criteria pass** — confirm loop stopped

---

## Notes

- **This is the 4th time this loop has been investigated.** The issue is persistent because each previous fix targeted Supabase, not local PG.
- Migration scripts in `~/.openclaw/genome/migrations/` must be applied to local PG after any DB migration. There may be other un-applied migrations — Genome Dev should audit all `00x_*.sql` files.
- The landing page is live at `https://leadflow-ai-five.vercel.app` — no design or dev work needed on the page itself.
