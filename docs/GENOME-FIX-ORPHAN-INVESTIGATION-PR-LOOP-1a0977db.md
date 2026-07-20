# Fix: Orphan Branch Investigation Tasks — PR Loop (Task 1a0977db)

**Status:** Completed | **Date:** 2026-07-20

## Problem

Orphan branch investigation tasks were systematically failing with "PR creation exhausted 8
attempts: awaiting_merge requires pr_number for dev/design tasks". The pipeline was clogged
with dozens of stuck or failed investigation tasks consuming budget without producing value.

**Root cause:** Investigation tasks use `agent_id: 'dev'`, so `completion-scan.js` routed
them to `awaiting_merge` status and attempted PR creation after completion. The investigation
agent also received the standard dev git workflow (commit, push, create branch) — but
investigation tasks write a JSON finding file, not code commits. Without a pushed branch,
PR creation failed 8 times before terminal task failure.

## What Changed (genome: commit ebf2441)

### 1. `core/sensors/completion-scan.js`
- Detects `orphan-branch` tag (already set on all investigation tasks)
- Skips code output verification (investigation agents don't push code)
- Skips PR creation gate entirely
- Routes directly to `done` instead of `awaiting_merge`
- The PR-pending retry guard also checks `isOrphanInvestigation` to prevent false exhaustion loops

### 2. `lib/services/orphan-branch-investigation-task-builder.js`
- Added explicit **DO NOT commit / DO NOT push / DO NOT create a PR** instruction as the first paragraph
- Specifies required output path: `completion-reports/orphan-<branch>-finding.json`
- Enforced 4-verdict format: `shippable-needs-task-pr`, `already-shipped-safe-delete`,
  `duplicate/superseded`, `needs-human-review`
- Diff line hard cap unchanged at 200 lines

### 3. `core/food/spawn-message-builder.js`
- `buildGitSection` now accepts `tags` parameter
- If `tags.includes('orphan-branch')`: returns read-only investigation section listing
  allowed read-only git commands (`git log`, `git diff --stat`, `git ls-remote`)
  with explicit DO NOT run: `git commit`, `git push`, `git add`, `git branch -d`
- Normal dev git workflow returned for all other tasks (no behavior change)

### 4. `core/actuators/spawn-consumer.js`
- Passes `tags` to `buildGitSection` so the investigation override activates

## Tests Added/Updated
- `tests/completion-scan-pr-creation-retry.test.js`: new test verifying orphan-branch
  task transitions to `done` with no PR creation attempted
- `tests/orphan-branch-triage.test.js`: updated to assert `orphan-branch` tag present,
  "DO NOT commit" instruction in description, all 4 verdicts listed
- `tests/spawn-message-builder.test.js`: new tests for read-only section on orphan-branch
  tag, normal workflow for other tags

## Genome Commit
- `ebf2441 fix: orphan-branch investigation tasks skip PR creation and use read-only git access`
