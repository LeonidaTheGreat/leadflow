# PRD: Distribution Loop — Wave 10 Escalation

**PRD ID:** prd-distribution-loop-wave10  
**Status:** approved  
**Date:** 2026-03-30  
**Author:** Product Manager  
**Project:** LeadFlow AI

---

## Problem Statement

The distribution-collector health check spawns `PM: Distribution — Create Landing Page` tasks repeatedly every heartbeat because:

1. **Missing Table:** The `distribution_channels` table does not exist, causing health checks to query a non-existent resource
2. **No Dedup Guard:** Even if a landing page task is created, there's no mechanism to prevent re-creating it
3. **Loop Cascade:** When the loop detector fires, it spawns investigation tasks that also loop, creating a cascade

This creates Telegram spam and wastes orchestration cycles.

---

## Goal

Stop repeated task spawning for `PM: Distribution — Create Landing Page` by implementing three fixes at the Genome orchestration layer.

---

## Requirements

### R1: Create distribution_channels Table (LeadFlow)

**Acceptance:**
- Table exists with columns: `id`, `project_id`, `channel_type`, `status`, `created_at`, `updated_at`
- Seeded with 1 row: `project_id='leadflow'`, `channel_type='landing_page'`, `status='active'`
- Query must return: `SELECT COUNT(*) FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'` = `1`

**Implementation Notes:**
- Seed the table via `scripts/seed-project-hierarchy.js` or direct SQL
- This prevents the "missing landing page" alert from firing repeatedly

### R2: Add Dedup Guard to distribution-collector.js (Genome)

**Acceptance:**
- Code checks for recent task creation (within 7 days) before spawning new tasks
- Searches `tasks` table for recent `PM: Distribution → Create Landing Page` entries
- Skips task creation if found
- Logs: "Skipping duplicate PM:Distribution→Create Landing Page task — created X days ago"

**Implementation Notes:**
- File: `~/projects/genome/scripts/distribution-collector.js`
- Logic: Query `tasks` table with `created_at > now() - INTERVAL 7 days` + `task_name LIKE '%Create Landing Page%'`
- This prevents accumulation even if new issues are detected

### R3: Add 24h Cooldown to Loop Detector (Genome)

**Acceptance:**
- Loop detection task has a 24-hour cooldown
- When a loop is detected, check if an investigation task was created in the last 24 hours
- Skip new investigation task if found
- Uses timestamp-based check: `cutoff = now() - INTERVAL 24 hours`

**Implementation Notes:**
- File: `~/projects/genome/core/task-store.js`
- Method: `detectLoop()` or `checkLoopCooldown()`
- This stops the investigator-loops-itself cycle

---

## Acceptance Criteria

All 4 criteria must pass:

```json
[
  {
    "id": "distribution-channels-seeded",
    "command": "cd /Users/clawdbot/projects/leadflow && node -e \"require('dotenv').config({path:'.env'});const {Pool}=require('pg');const p=new Pool({connectionString:process.env.LOCAL_PG_URL});p.query(\\\"SELECT COUNT(*)::int as c FROM distribution_channels WHERE project_id='leadflow' AND channel_type='landing_page' AND status='active'\\\").then(r=>{console.log(r.rows[0].c);p.end()})\" 2>/dev/null | tail -1",
    "expected": "1",
    "description": "distribution_channels table seeded with active leadflow landing page row"
  },
  {
    "id": "dedup-guard-implemented",
    "command": "grep -c 'sevenDaysAgo' ~/projects/genome/scripts/distribution-collector.js",
    "expected": "1",
    "description": "Dedup guard uses 7-day window to skip recent task creation"
  },
  {
    "id": "cooldown-fix-applied",
    "command": "grep -c 'cutoff24h' ~/projects/genome/core/task-store.js",
    "expected": "2",
    "description": "Loop detector uses 24h cooldown instead of status-only check"
  },
  {
    "id": "skip-duplicate-logging",
    "command": "grep -c 'Skipping duplicate' ~/projects/genome/scripts/distribution-collector.js",
    "expected": "1",
    "description": "Dedup logic logs when skipping duplicate task creation"
  }
]
```

---

## Impact

**Before:** Every heartbeat (5 min) spawns new `PM: Distribution → Create Landing Page` task, creating visible spam in Telegram and wasting orchestration cycles.

**After:** 
- No duplicate tasks spawn (7-day dedup window)
- No investigation cascade (24h loop cooldown)
- Landing page is registered in `distribution_channels`, so health checks pass normally

**Metrics:** Zero `PM: Distribution → Create Landing Page` tasks in next 168 hours (7-day window).

---

## Success Criteria

- ✅ All 4 acceptance criteria pass
- ✅ No new `PM: Distribution → Create Landing Page` tasks spawn for 7 days
- ✅ Zero cascade investigation tasks for 24 hours after first detection
- ✅ Telegram logs show "Skipping duplicate" messages instead of new task spawns

---

## Design Notes

All three fixes operate at the **Genome orchestration layer**, not in LeadFlow product code:

1. **Database seed** happens in LeadFlow (one-time migration)
2. **Dedup guard** runs in `distribution-collector.js` (Genome script)
3. **Loop cooldown** runs in `task-store.js` (Genome core)

No changes to product business logic, API routes, or customer-facing features.

---

## Timeline

- **Specification Phase:** ✅ Complete (this PRD)
- **Dev Phase:** Implementation of R1, R2, R3
- **QC Phase:** Verify all 4 acceptance criteria pass
- **Deployment:** Changes to Genome config only (no product deploy needed for R2/R3; R1 deploys with next product release)

---

## Related Use Cases

- **uc-onboarding-aha-moment-completion** — Also affected by loop detection spam
- **uc-product-health-dashboard** — Monitor loop detection and task spawning patterns

---

## Version History

| Date | Status | Change |
|------|--------|--------|
| 2026-03-30 | approved | Initial spec (Wave 10 consolidation) |
