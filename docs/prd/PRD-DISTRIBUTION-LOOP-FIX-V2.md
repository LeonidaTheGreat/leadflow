# PRD: Fix Distribution Collector Loop — V2 (Database Mismatch)

**PRD ID:** prd-distribution-loop-fix-v2  
**Use Case:** uc-distribution-loop-fix-v2  
**Status:** draft  
**Date:** 2026-04-04  
**Author:** PM Agent  
**Priority:** P1 (loop is actively firing, creating spam tasks)

---

## Problem Statement

The distribution loop ("PM: Distribution — Content Marketing Campaign") has been created 3x in 2 hours on 2026-04-04, despite a previous fix (Wave 8, `uc-distribution-loop-fix`) claiming to have resolved the issue.

**Root cause confirmed by investigation:**

`distribution-collector.js` contains a dedup guard that queries tasks from **cloud Supabase** (via the `supabase` client), but all production tasks are stored in **local PostgreSQL** (via `TaskStore`, which uses `LOCAL_PG_URL`). The dedup guard always returns zero results because it's querying the wrong database. The task creation proceeds on every heartbeat.

### Evidence

- `distribution-collector.js` line 35: `const supabase = createClient(supabaseUrl, supabaseKey)` — cloud Supabase
- `distribution-collector.js` line 239: `const store = new TaskStore()` — local PostgreSQL
- `distribution-collector.js` line 262: `const { data: recentTask } = await supabase.from('tasks')...` — **dedup queries cloud**
- Cloud Supabase tasks table: 0 results for `PM: Distribution — Content Marketing Campaign` in last 7 days
- Local PostgreSQL tasks table: 3 matching tasks created on 2026-04-04 (04:27, 04:31, 04:36)

### Why Previous Fix Failed

The Wave 8 investigation (`uc-distribution-loop-fix`) verified the _presence_ of dedup code (grep counts) but **did not verify it queried the correct database**. The acceptance criteria passed because `grep -c 'sevenDaysAgo' distribution-collector.js` returns 1 — the code exists but is broken.

### Persistent Trigger

The `zero_traffic` condition fires on every run because:
- No PostHog API key is configured → PostHog returns 0 visitors
- `distribution_channels` has an active landing page in cloud Supabase → `no_landing_page` doesn't fire
- `zero_traffic` condition: `totalVisitors === 0 && landingPages.length > 0` → **always true**
- This means the content marketing task is created on every heartbeat indefinitely

---

## Requirements

### Fix 1 (Critical): Use TaskStore for Dedup Check

The dedup guard in `createDistributionTasks()` must query tasks using `TaskStore` (local PostgreSQL) instead of the raw `supabase` client.

**Current code (broken):**
```javascript
const { data: recentTask } = await supabase
  .from('tasks')
  .select('id, status, created_at')
  .eq('project_id', PROJECT_ID)
  .ilike('title', title)
  .gte('created_at', sevenDaysAgo)
  .limit(1)
```

**Required fix:**
```javascript
// Use TaskStore to query local PostgreSQL (where tasks actually live)
const recentTask = await store.findRecentTaskByTitle(title, 7 * 24 * 60 * 60 * 1000)
if (recentTask) {
  console.log(`  [Distribution] Skipping duplicate: "${title}" (last: ${recentTask.created_at}, status: ${recentTask.status})`)
  continue
}
```

`TaskStore` must expose a `findRecentTaskByTitle(title, windowMs)` method (or equivalent). If this method doesn't exist, it must be added.

### Fix 2 (High): Zero-Traffic Condition Must Check Real Data

The `zero_traffic` condition should not fire if the analytics source (PostHog) is not configured. Zero visitors from an unconfigured source is meaningless noise — it should not trigger task creation.

**Current logic (broken):**
```javascript
if (totalVisitors === 0 && (landingPages && landingPages.length > 0)) {
  issues.push({ type: 'zero_traffic', ... })
}
```

**Required fix:**
```javascript
// Only flag zero_traffic if at least one data source is actually configured
const hasAnalyticsSource = !!(process.env.POSTHOG_API_KEY || process.env.VERCEL_ACCESS_TOKEN)
if (totalVisitors === 0 && hasAnalyticsSource && (landingPages && landingPages.length > 0)) {
  issues.push({ type: 'zero_traffic', ... })
}
```

### Fix 3 (High): Dedup Window Must Cover Task Workflow Duration

The current 7-day dedup window is appropriate but must be applied to the task title pattern used (exact match or ILIKE with `%`). Confirm the title match is correct:

- Task title created: `"PM: Distribution — Content Marketing Campaign"` 
- Dedup query: `.ilike('title', title)` where `title = "PM: Distribution — Content Marketing Campaign"`
- This is an exact ilike match (no wildcards) — correct for this use case, keep as-is.

### Fix 4 (Medium): Add Explicit Logging for Dedup Database Source

Add a log line when dedup check runs to confirm which database is being queried:

```javascript
console.log(`  [Distribution] Dedup check via TaskStore (local PG) for: "${title}"`)
```

---

## Acceptance Criteria

### Machine-Verifiable Checks

1. **Dedup uses TaskStore, not raw Supabase client:**
   ```
   grep -c 'supabase.from.*tasks' ~/.openclaw/genome/scripts/distribution-collector.js
   Expected: 0
   ```
   (The raw supabase client must no longer be used for task dedup queries)

2. **TaskStore used in dedup guard:**
   ```
   grep -c 'store\.find\|store\.getRecent\|TaskStore.*dedup\|findRecent' ~/.openclaw/genome/scripts/distribution-collector.js
   Expected: >= 1
   ```

3. **Zero-traffic guard checks for analytics source:**
   ```
   grep -c 'hasAnalyticsSource\|POSTHOG_API_KEY.*zero\|analyticsConfigured' ~/.openclaw/genome/scripts/distribution-collector.js
   Expected: >= 1
   ```

4. **No new content marketing tasks created after fix (runtime test):**
   After deploying the fix, running `distribution-collector.js` twice in succession should create 0 new tasks (dedup prevents the second creation).
   ```
   node ~/.openclaw/genome/scripts/distribution-collector.js 2>&1 | grep -c 'Skipping duplicate'
   Expected: >= 1
   ```

### Human Test

1. Run `node ~/.openclaw/genome/scripts/distribution-collector.js` twice
2. Confirm that the second run logs "Skipping duplicate: PM: Distribution — Content Marketing Campaign"
3. Confirm no new tasks appear in the `tasks` table on the second run

---

## Implementation Notes for Dev Agent

### File to Modify
`~/.openclaw/genome/scripts/distribution-collector.js` (Genome repo, not leadflow repo)

### TaskStore Method Needed

Check if `TaskStore` already has a method to query recent tasks by title. If not, add:

```javascript
// In task-store.js
async findRecentTaskByTitle(title, windowMs = 7 * 24 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - windowMs).toISOString()
  const { data } = await this.supabase
    .from('tasks')
    .select('id, status, created_at')
    .eq('project_id', this.projectId)
    .ilike('title', title)
    .gte('created_at', cutoff)
    .limit(1)
  return data?.[0] || null
}
```

Since `TaskStore.supabase` is actually a local-pg client (when `LOCAL_PG_URL` is set), this query will correctly hit local PostgreSQL.

### Scope

- Modify: `~/.openclaw/genome/scripts/distribution-collector.js`
- Possibly modify: `~/.openclaw/genome/core/task-store.js` (if `findRecentTaskByTitle` doesn't exist)
- Do NOT modify: any files in `/Users/clawdbot/projects/leadflow/` — this is a Genome bug

---

## Impact

- **Immediate**: Stops the loop — no more "PM: Distribution — Content Marketing Campaign" spam tasks
- **Secondary**: Stops "PM: Loop detected" tasks from being created for this issue
- **Long-term**: Prevents similar issues in other distribution template handlers using the same pattern

---

## Out of Scope

- Implementing actual content marketing campaigns (separate UC)
- Connecting PostHog (separate integration task)
- Changing the distribution-collector scheduling frequency
