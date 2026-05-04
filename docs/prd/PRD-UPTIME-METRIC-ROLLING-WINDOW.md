# PRD-UPTIME-METRIC-ROLLING-WINDOW

## Status: approved
## Version: 1.0
## Priority: P2 (infrastructure improvement — no paying customers affected)

## Problem

The `Uptime` mission metric uses a point-in-time calculation: `passed_tests / total_tests` from the **most recent** smoke test run. This produces misleading readings:

- A 20-minute Vercel deploy blip (as observed 2026-05-03 20:56–21:17) drops Uptime to 42.9% then snaps to 100% on recovery
- A permanent outage looks the same as a brief deploy window
- No historical record of availability is preserved; current_value is overwritten every 5 minutes

**Root cause observed (2026-05-03):**
- Commit `480e605f` (remove edge jose dependency) triggered a Vercel deploy
- 4 tests failed for ~20 minutes: `vercel-dashboard`, `signup-page`, `login-page`, `lead-simulator`
- These are all Next.js dashboard pages on `leadflow-ai-five.vercel.app`
- The webhook API (`vercel-health`, `vercel-root`) and local dashboard remained healthy throughout
- No paying customers; no real-world impact

## Solution

Change `_collectSmokeTestMetrics` in `~/.openclaw/genome/core/mission-metric-collector.js` to compute **rolling 24-hour uptime**:

```
Uptime = (runs_where_all_critical_tests_passed / total_runs_in_last_24h) * 100
```

A run is "fully passing" if every smoke test with `severity: 'critical'` passed.
Tests with `severity: 'warning'` (e.g., `lead-simulator`) do not count against uptime.

## Implementation

**File:** `~/.openclaw/genome/core/mission-metric-collector.js`

**Method:** `_collectSmokeTestMetrics(projectId)`

**Current logic (replace):**
```js
const metricsRows = await this.store.getMetrics(projectId, {
  domain: 'smoke_tests', orderByTimestampDesc: true, limit: 1
})
// ... uptime = passed.length / total * 100
```

**New logic:**
```js
// Query last 24h of smoke_results
const metricsRows = await this.store.getMetrics(projectId, {
  select: 'data, timestamp',
  domain: 'smoke_tests',
  orderByTimestampDesc: true,
  limit: 288  // 24h at 5-min cadence = max 288 runs
})

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const cutoff = Date.now() - TWENTY_FOUR_HOURS_MS

const recentRuns = (metricsRows || [])
  .filter(r => new Date(r.timestamp).getTime() >= cutoff)

if (recentRuns.length === 0) return { 'Lead Response Time': null, 'Uptime': null }

// A run is "healthy" if no critical-severity failures
const healthyRuns = recentRuns.filter(r => {
  const failed = Array.isArray(r.data?.failed) ? r.data.failed : []
  return failed.every(f => f.severity !== 'critical')
})

const uptime = Math.round((healthyRuns.length / recentRuns.length) * 1000) / 10
```

## Acceptance Criteria

1. `_collectSmokeTestMetrics` queries metrics with `limit: 288` (not `limit: 1`)
2. Uptime is computed over the last 24h of runs, not the most recent run
3. Only `critical` severity failures count against uptime (warning = ignored)
4. If a 20-min outage occurs in a 24h window, uptime reflects ~98.6% (not 42.9%)
5. `npm test` passes in both `~/projects/leadflow` and `~/.openclaw/genome/`

## Verification Commands

```bash
# After fix, simulate: insert a 'failed' smoke run 2h ago, then check current_value
# Expected: should show ~98-99% (one blip in 24h), not 100%

# Confirm the query uses limit 288:
grep -n "limit: 288\|limit:288" ~/.openclaw/genome/core/mission-metric-collector.js

# Confirm critical-severity filter present:
grep -n "severity.*critical\|critical.*severity" ~/.openclaw/genome/core/mission-metric-collector.js
```

## Out of Scope

- Do NOT change smoke test definitions or project.config.json
- Do NOT change the `Lead Response Time` metric (no duration data available)
- Do NOT modify any LeadFlow product files
- The deploy-time outage itself is acceptable for a pre-revenue product; no SLA fix needed
