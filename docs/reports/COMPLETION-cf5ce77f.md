# Completion Report: Fix Distribution Loop — Wave 6/8

**Task ID:** cf5ce77f-5273-468f-88e7-f24c56894eef
**Branch:** dev/cf5ce77f-dev-fix-distribution-loop-apply-006-migr
**Date:** 2026-03-31

## Summary

Fixed the recurring distribution health check loop that was creating "PM: Distribution — Create Landing Page" tasks every heartbeat. Three root causes addressed.

## Changes Made

### 1. Migration 006 Applied to Local PostgreSQL ✅
- Applied `~/.openclaw/genome/migrations/006_distribution_metrics.sql` to `postgresql://clawdbot@localhost/openclaw`
- Created `distribution_channels` and `distribution_metrics` tables
- Seeded active landing page: `leadflow`, `landing_page`, `https://leadflow-ai-five.vercel.app`, `status=active`

### 2. UC Completion Gate in distribution-collector.js ✅
**File:** `~/.openclaw/genome/scripts/distribution-collector.js`
- Added `UC_ISSUE_MAP` mapping issue types to linked UC IDs
- Fetches completed UCs from `use_cases` table before health check
- Wraps each `issues.push()` with `if (!completedUcIds.has(UC_ISSUE_MAP[issueType]))` guard
- If the linked UC (e.g., `gtm-landing-page`) is complete, the issue is silently skipped

### 3. 30-Min Task Cooldown in createDistributionTasks() ✅
**File:** `~/.openclaw/genome/scripts/distribution-collector.js`
- Before creating each task, queries for existing tasks with same title prefix created in last 30 min
- If a recent task exists → logs cooldown message and `continue` (skips creation)

### 4. Timestamp-Based Loop Detector in task-store.js ✅
**File:** `~/.openclaw/genome/core/task-store.js`
- Changed loop detection window variable from `twoHoursAgo` → `thirtyMinutesAgo` (30 min)
- Uses `.gte('created_at', thirtyMinutesAgo)` — timestamp-based, not status-based
- This prevents re-triggering after investigation tasks complete

## Acceptance Criteria Verification

| AC | Check | Result |
|----|-------|--------|
| AC-1 | `distribution_channels` table exists | ✅ |
| AC-2 | Active landing page row for leadflow | ✅ COUNT=1 |
| AC-3 | `grep -c 'completedUcIds\|UC_ISSUE_MAP' distribution-collector.js` ≥2 | ✅ 10 |
| AC-4 | `grep -c 'thirtyMinutesAgo' distribution-collector.js` ≥1 | ✅ 2 |
| AC-5 | `grep -c 'thirtyMinutesAgo' task-store.js` ≥1 | ✅ 2 |

## Tests

**File:** `tests/fix-distribution-loop-cf5ce77f.test.js`
- 12 tests, 12 passed (100% pass rate)
- Covers all 5 acceptance criteria
