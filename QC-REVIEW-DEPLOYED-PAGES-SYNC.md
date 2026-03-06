# QC Review: Auto-Sync Deployed Pages to System Components

**Task ID:** c8882bbe-3a83-44d2-ba59-d03a348a9fcc  
**PR:** #9  
**Branch:** dev/cf7edc9b-dev-fix-deployed-pages-not-registered-in  
**Reviewed:** 2026-03-06  
**Status:** ❌ REJECTED  

---

## Executive Summary

**The implementation is INCOMPLETE.**

The developer successfully created the sync script and API endpoint (all unit tests pass), but **failed to integrate the sync into the heartbeat loop**. This is a critical gap because the entire feature purpose is *automatic* sync on heartbeat. Without heartbeat integration, the feature doesn't work as designed per PRD FR-3 & AC-3.

### Verdict: FAILED AC-3 (Heartbeat Integration)
- **Acceptance Criteria Met:** 4 of 5 (AC-1, AC-2, AC-4, AC-5)
- **Acceptance Criteria Failed:** 1 of 5 (AC-3) — **THE CRITICAL ONE**
- **Test Results:** 7/7 unit tests pass, but integration test fails
- **Recommendation:** Retry (code fix needed, not architectural)

---

## What Works ✅

### 1. Sync Script (`scripts/sync-system-components.js`)
```bash
$ node scripts/sync-system-components.js
🔄 Syncing deployed pages to system_components...
   ✅ Synced Customer Dashboard → https://leadflow-ai-five.vercel.app/dashboard
   ✅ Synced FUB Webhook API → https://fub-inbound-webhook.vercel.app
   ✅ Synced Landing Page → https://leadflow-ai-five.vercel.app/
   ✅ Synced Internal Dashboard → http://127.0.0.1:8787/dashboard.html
   ✅ Synced Billing Flow → https://leadflow-ai-five.vercel.app/settings
   📊 Synced 5 components, 0 errors
✅ Sync complete
```

### 2. Manual Sync API (`POST /api/admin/sync-deployed-pages`)
- Endpoint exists and is callable
- Returns 200 with correct response format
- Properly syncs all components

### 3. System Components Table
All 5 components correctly registered:
| Component | URL | Status | Emoji |
|-----------|-----|--------|-------|
| Customer Dashboard | https://leadflow-ai-five.vercel.app/dashboard | LIVE | 🟢 |
| Landing Page | https://leadflow-ai-five.vercel.app/ | LIVE | 🟢 |
| Billing Flow | https://leadflow-ai-five.vercel.app/settings | LIVE | 🟢 |
| FUB Webhook API | https://fub-inbound-webhook.vercel.app | LIVE | 🟢 |
| Internal Dashboard | http://127.0.0.1:8787/dashboard.html | LIVE | 🟢 |

### 4. Test Suite
All 7 tests pass (100% pass rate):
- ✅ Sync script executes without errors
- ✅ Customer Dashboard has correct URL
- ✅ Landing Page has correct URL  
- ✅ Billing Flow has correct URL
- ✅ FUB Webhook API has correct URL
- ✅ All components have verified_date
- ✅ Deployed URLs return successful status

### 5. URL Accessibility
```bash
$ curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/
200 ✅ Landing Page
$ curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/dashboard
307 ✅ Dashboard (redirect is OK)
$ curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/settings
307 ✅ Billing (redirect is OK)
$ curl -s -o /dev/null -w "%{http_code}" https://fub-inbound-webhook.vercel.app/health
200 ✅ FUB Health
```

---

## What's Missing ❌

### CRITICAL: Heartbeat Integration (AC-3 FAILED)

**The sync is NEVER called from the heartbeat loop.**

Evidence:
```bash
$ grep -r "syncDeployedPages\|sync-system-components" orchestrator-heartbeat-runner.sh scripts/dry-run-heartbeat.js
# Returns: NOTHING

$ grep -r "sync" orchestrator-heartbeat-runner.sh
# Returns: NOTHING (no mention of sync at all)
```

### PRD Requirements for Heartbeat Integration (FR-3)

From PRD:
> **FR-3: Heartbeat Integration**  
> **Priority:** P1  
> **Description:** Run sync on every orchestrator heartbeat
> 
> **Specifications:**
> - Add sync function to heartbeat executor
> - Run after smoke tests
> - Only update if URL has changed
> - Log sync results

**Heartbeat Flow (per PRD):**
```
1. Run smoke tests
2. Sync deployed pages to system_components ← NOT IMPLEMENTED
3. Generate dashboard
4. Report status
```

### What the Code Actually Does

Current heartbeat flow in `orchestrator-heartbeat-runner.sh`:
```bash
1. Check task state
2. Check for completions
3. Check for stalled tasks
4. Check budget
5. Post report
6. Check blockers
# MISSING: Step to sync deployed pages
```

Current heartbeat flow in `scripts/dry-run-heartbeat.js`:
```
1. Query state
2. Zombie check
3. Completions check
4. Spawn simulation
5. Blockers
6. Self-heal checks
7. Queue replenishment
8. Product feedback
9. PR reviews
# MISSING: Sync deployed pages
```

---

## Acceptance Criteria Scorecard

| AC | Requirement | Status | Evidence |
|----|------------|--------|----------|
| AC-1 | Vercel API Connection | ✅ PASS | Sync queries project.config.json and successfully reads product URLs |
| AC-2 | System Components Updated | ✅ PASS | All 5 components in DB with correct URLs, status LIVE, emoji 🟢 |
| AC-3 | Heartbeat Integration | ❌ **FAIL** | No calls to sync in heartbeat loop (grep returns 0 matches) |
| AC-4 | Manual Sync API | ✅ PASS | POST /api/admin/sync-deployed-pages endpoint exists and works |
| AC-5 | Dashboard Display | ✅ PASS | URLs are in system_components table, accessible via API |

**Verdict:** 4/5 criteria met. **AC-3 is CRITICAL and determines pass/fail.**

---

## Root Cause Analysis

### Why This Happened

The developer implemented the *building blocks* but not the *integration*:

1. ✅ Created `sync-system-components.js` script — works perfectly
2. ✅ Created `/api/admin/sync-deployed-pages` endpoint — works perfectly
3. ✅ Created test suite — all pass
4. ❌ **Did NOT integrate into heartbeat**

This is a **classic incomplete feature**: the mechanics work, but the automation doesn't.

### Why It Matters

**From the PRD, Section 1.2 (Product Goal):**
> "Automatically detect all deployed Vercel pages and sync their URLs to the system_components table."

**"Automatically"** means:
- Without manual intervention
- On every deployment (via heartbeat)
- Invisible to users

**What exists now:**
- Manual script you have to run
- Manual API you have to call
- NOT automatic

---

## How to Fix

### Step 1: Add Sync to Heartbeat Runner

File: `orchestrator-heartbeat-runner.sh`

After the smoke tests section, add:
```bash
# 2.5 Sync deployed pages
echo "2.5️⃣ Syncing deployed pages..."
node scripts/sync-system-components.js >> $HEARTBEAT_LOG
if [ $? -eq 0 ]; then
  echo "   ✅ Deployed pages synced"
else
  echo "   ⚠️ Sync failed (non-critical)"
fi
```

### Step 2: Add Sync to Dry-Run Heartbeat

File: `scripts/dry-run-heartbeat.js`

After the `5b. SELF-HEAL CHECKS` section, add:
```javascript
// 5c. DEPLOYED PAGES SYNC (read-only simulation)
console.log('\n5c. DEPLOYED PAGES SYNC')
try {
  const { SystemComponentsSync } = require('../scripts/sync-system-components.js')
  const syncer = new SystemComponentsSync()
  const result = await syncer.syncDeployedPages()
  console.log(`   ✅ Would sync ${result.count} components`)
  if (result.errors.length > 0) {
    console.log(`   ⚠️ Errors: ${result.errors.map(e => e.error).join(', ')}`)
  }
} catch (err) {
  console.log(`   ⚠️ Sync check failed: ${err.message}`)
}
```

### Step 3: Verify Integration

```bash
# Run dry-run to verify integration
$ node scripts/dry-run-heartbeat.js
# Should now include "5c. DEPLOYED PAGES SYNC" section

# Run actual heartbeat and verify sync runs
$ bash orchestrator-heartbeat-runner.sh &
# Check that sync completes within 30 seconds

# Re-run tests
$ node test-sync-deployed-pages.js
# Should pass all 7 tests
```

### Step 4: Verify Performance

Sync must complete within 30s (per AC-3):
- Current sync time: <1 second (verified via test output)
- No performance concerns

---

## Test Commands

To reproduce this review:

```bash
# 1. Checkout the branch
git fetch origin && git checkout dev/cf7edc9b-dev-fix-deployed-pages-not-registered-in

# 2. Run unit tests
node test-sync-deployed-pages.js
# Should pass 7/7

# 3. Run sync script manually  
node scripts/sync-system-components.js
# Should show 5 components synced

# 4. Verify heartbeat integration is missing
grep -r "syncDeployedPages\|sync-system-components" orchestrator-heartbeat-runner.sh scripts/dry-run-heartbeat.js
# Should return: (no matches)

# 5. Check database
node -e "
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
client.from('system_components').select('*').eq('project_id', 'leadflow').then(r => {
  r.data.forEach(c => console.log(\`\${c.component_name}: \${c.metadata?.url}\`));
});
"
# Should show 5 components with correct URLs
```

---

## Files Reviewed

| File | Status | Notes |
|------|--------|-------|
| `scripts/sync-system-components.js` | ✅ REVIEWED | Sync logic correct, works perfectly |
| `product/lead-response/dashboard/app/api/admin/sync-deployed-pages/route.ts` | ✅ REVIEWED | API endpoint correct, works perfectly |
| `test-sync-deployed-pages.js` | ✅ REVIEWED | Test suite comprehensive, all pass |
| `orchestrator-heartbeat-runner.sh` | ⚠️ REVIEWED | Sync not called (CRITICAL GAP) |
| `scripts/dry-run-heartbeat.js` | ⚠️ REVIEWED | Sync not called (CRITICAL GAP) |
| `supabase/migrations/010_register_deployed_components.sql` | ⚠️ REVIEWED | Schema mismatch with code (uses old `name` instead of `component_name`), but actual DB schema is correct |
| `supabase/migrations/011_system_components.sql` | ⚠️ REVIEWED | Schema mismatch with code, but actual DB schema is correct |

---

## Recommendations

### For Developer (Next Attempt)

1. **Read the PRD more carefully** — FR-3 explicitly says "Run sync on every heartbeat"
2. **Test the full flow** — Manual testing of sync script is not enough; test actual heartbeat execution
3. **Verify acceptance criteria** — This PR fails AC-3, which should have been caught before submitting

### For PM/Orchestrator

1. **Monitor heartbeat execution** — Once fixed, verify sync runs on every heartbeat
2. **Check logs** — Sync should log its actions for troubleshooting
3. **Set up alerts** — If sync fails, alert operations team

---

## Failure Pattern Notes

This matches a common failure pattern from the learning system:
- **Pattern:** Developer creates standalone feature but doesn't integrate into system loop
- **Indicator:** Unit tests pass but integration tests fail
- **Fix:** Add integration points and re-test

This is task 2/2 in the workflow. The dev completed task 1 but incompletely — the feature works in isolation but not in production (where it needs to run on heartbeat).

---

## Completion Report

Written to: `/Users/clawdbot/projects/leadflow/completion-reports/COMPLETION-c8882bbe-3a83-44d2-ba59-d03a348a9fcc-1772791013678.json`

**Status:** FAILED  
**Reason:** AC-3 (Heartbeat Integration) not met  
**Retry Recommendation:** `retry` (code-level fix needed, not architectural)

---

**Signed:** QC Review  
**Date:** 2026-03-06  
**Pass Rate:** 4/5 acceptance criteria (80%) — **FAILS because AC-3 is critical**
