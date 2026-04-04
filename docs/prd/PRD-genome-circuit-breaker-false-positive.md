---
id: prd-genome-circuit-breaker-false-positive
title: Genome Circuit Breaker False Positive — Fix Stale Task Data & Stuck-UC Detection
status: active
created: 2026-04-04
---

# PRD: Genome Circuit Breaker False Positive Fix

## Summary

The circuit breaker tripped for `uc-distribution-loop-fix` (24 tasks, $15.45) despite the UC being marked `implementation_status: 'complete'`. Root cause: three compounding genome bugs causing false positives and waste.

## Problem Statement

Three bugs compound into repeated circuit breaker trips and wasted agent spawns:

### Issue A: Stuck-UC Detection Fires for Complete UCs
The heartbeat's stuck-UC detection loop repeatedly creates investigation tasks for UCs already in `implementation_status: 'complete'` state. The detection does not filter out complete UCs before checking for staleness.

**Expected:** UCs with `implementation_status IN ('complete', 'cancelled')` are skipped entirely.
**Actual:** Complete UCs still trigger stuck-UC investigation tasks.

### Issue B: Supabase Task Write Pipeline Broken
All task completions and spawns since ~2026-04-02 are tracked only in local `budget-tracker.json`. The Supabase `tasks` table has not received new records in 2+ days. Any genome logic querying Supabase for task counts, costs, or statuses returns stale data. The task store write path is silently failing.

**Expected:** Every spawn and completion is durably written to Supabase within seconds.
**Actual:** Writes fail silently; local state diverges from DB.

### Issue C: PM Investigation Tasks Completing Hollow
PM investigation tasks for stuck UCs complete in <2 minutes with zero output (no files, no triageOutcome, no PRD). The root cause is unclear but likely the agent receives insufficient context or the task prompt is underspecified.

**Expected:** PM investigation produces a triageOutcome with one of: DECOMPOSE, CHANGE_APPROACH, CANCEL, INCREASE_BUDGET.
**Actual:** Tasks complete with empty reports, triggering re-spawn indefinitely.

## Acceptance Criteria

### Issue A Fix
- [ ] Stuck-UC detection query filters out `implementation_status IN ('complete', 'cancelled', 'paused')`
- [ ] Zero investigation tasks created for already-complete UCs
- Machine check: `grep -n "implementation_status" ~/.openclaw/genome/core/heartbeat-executor.js | grep -c "complete"` ≥ 1

### Issue B Fix  
- [ ] Task store write errors are logged with full error detail (not swallowed)
- [ ] Health check validates Supabase connectivity on startup and every N cycles
- [ ] Failed writes trigger a genome alert (Telegram or action_item)
- Machine check: `grep -c "task write.*error\|write.*failed" ~/.openclaw/genome/core/task-store.js` ≥ 1

### Issue C Fix
- [ ] PM investigation task prompt includes: current UC status from DB, recent task list with failure reasons, explicit output format requirement
- [ ] A PM investigation task that completes without triageOutcome is flagged as invalid and retried once
- Machine check: `grep -c "triageOutcome" ~/.openclaw/genome/core/workflow-engine.js` ≥ 1

## Out of Scope
- Changes to the LeadFlow product code (`~/projects/leadflow/`)
- Changes to the circuit breaker threshold values

## Files to Modify (Genome)
- `~/.openclaw/genome/core/heartbeat-executor.js` — Issue A: filter stuck-UC query
- `~/.openclaw/genome/core/task-store.js` — Issue B: surface write errors
- `~/.openclaw/genome/core/workflow-engine.js` — Issue C: validate PM completion
