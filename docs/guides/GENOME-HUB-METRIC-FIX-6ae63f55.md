# Genome Fix: Hub Module Task Success Rate Metric

**Task ID:** 6ae63f55-f03d-4364-8973-6a312f4b1308
**Date:** 2026-05-02
**Repo:** openclaw-genome (core/mission-metric-collector.js)
**Commit:** d4043ac288630212178cb7283f301238cac66308

## Problem

`_collectGraphMetrics()` had two bugs that depressed the Hub Module Task
Success Rate metric below its true value:

1. **Pipeline failures counted as agent failures.** Tasks that failed due to
   spawn infrastructure (no commits on branch, max retries at spawn, spawn
   process failed) were included in the success rate denominator. These tasks
   never executed agent code — they are infrastructure failures, not agent
   failures.

2. **Hub detection too broad.** Hub keywords matched title OR description,
   causing false positives when task descriptions mention hub module names as
   context. Additionally, `'heartbeat'` matched diagnostic phrases like
   "3 consecutive heartbeats failed" instead of only genuine hub-module work.

## Fix

- Added `last_error` to the SELECT query.
- Added `SPAWN_FAILURE_PATTERNS` + `isSpawnFailure()` to exclude pipeline
  failures from `devTasks` before computing the success rate.
- Changed hub keyword matching from title+description to title-only.
- Replaced `'heartbeat'` keyword with `'heartbeat-executor'` for precision.

## Tests Added (genome/tests/mission-metric-collector.test.js)

8 new tests covering:
- spawn failure "no commits on branch" excluded
- spawn failure "max retries exhausted at spawn" excluded
- spawn failure "spawn.*failed" pattern excluded
- Description-only keyword mentions do NOT count as hub tasks
- "heartbeat" alone does NOT match (only "heartbeat-executor" does)
- Null returned when no hub tasks in window
- Empty task list returns null
- Basic done/failed counting
