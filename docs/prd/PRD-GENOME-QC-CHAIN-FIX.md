# PRD: Fix Genome QC Chain — Dev-Done UCs Not Progressing

**ID:** PRD-GENOME-QC-CHAIN-FIX  
**Status:** draft  
**Priority:** P1  
**Author:** PM Agent  
**Date:** 2026-04-04

## Problem

6 UCs (including P0 trial-to-paid conversion) have completed dev tasks but no QC task has been created. The genome's `sweepUCCompletions` and `replenishQueue` functions are not chaining to the next workflow step (QC) after dev completion.

### Affected UCs
| UC ID | Priority | Dev Done | QC Task Exists |
|-------|----------|----------|----------------|
| `uc-trial-to-paid-conversion-path` | P0 | Yes | No |
| `fix-most-recent-next-js-dashboard-deployment-returns-5` | P0 | Yes | No |
| `fix-sessionstorage-key-mismatch-utm-params-never-reach` | P1 | Yes | No |
| `fix-sms-stats-api-agent-scoping-and-column-names` | P1 | Yes | No |
| `fix-sms-messages-message-body-column-does-not-exist-op` | P1 | Yes | No |
| `fix-trial-to-paid-conversion-path-not-implemented-no-u` | P1 | Yes | No |

## Root Cause Hypothesis

The `replenishQueue` function in `heartbeat-executor.js` identifies the next workflow step but may be:
1. Skipping UCs that already have some done tasks (treating them as "active")
2. Not detecting that dev is done when the UC has a multi-step workflow (PM > Dev > QC)
3. Failing silently when trying to create the QC task

## Requirements

### R1: Diagnose the chain gap
- Add logging to `replenishQueue` for UCs where dev tasks are done but no QC task exists
- Check if the "find next step" logic correctly identifies QC as the next step after dev

### R2: Fix the chain logic
- Ensure `replenishQueue` creates QC tasks for UCs where:
  - The current workflow step (dev) has a `done` task
  - The next workflow step (qc) has NO task in `ready`/`in_progress`/`done` status
  - The UC is still `in_progress`

### R3: Backfill the 6 blocked UCs
- After the fix, manually trigger replenishQueue or create QC tasks for the 6 affected UCs

## Acceptance Criteria

1. `SELECT COUNT(*) FROM tasks WHERE use_case_id = 'uc-trial-to-paid-conversion-path' AND agent_id = 'qc' AND status IN ('ready','in_progress','done')` returns >= 1
2. `SELECT COUNT(*) FROM use_cases WHERE implementation_status = 'in_progress' AND id IN (SELECT DISTINCT use_case_id FROM tasks WHERE agent_id = 'dev' AND status = 'done') AND id NOT IN (SELECT DISTINCT use_case_id FROM tasks WHERE agent_id = 'qc' AND status IN ('ready','in_progress','done'))` returns 0

## Scope

- **In scope:** Genome heartbeat-executor.js `replenishQueue` and `sweepUCCompletions` logic
- **Out of scope:** Changes to the LeadFlow product code
- **Affected project:** genome (not leadflow)
