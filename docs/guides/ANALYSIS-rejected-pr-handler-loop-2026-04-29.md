# Rejected PR Handler Loop — Root Cause Analysis

**Date:** 2026-04-29  
**Investigated by:** PM agent (task dcca7611)  
**Fix task:** 98c5440e (dev, ready, project=genome)

## What happened

`checkPRReviews()` in `~/projects/genome/core/loops/pr-review-loop.js` created 7 fix tasks for the same QC rejection of PR #85. Four PRs merged with duplicate fixes (~$14 wasted compute).

## Root cause: 3 compounding bugs

### Bug 1 — `rework` status missing from DB constraint (critical)
`updateCodeReview({ status: 'rework' })` at line 641 silently fails. `code_reviews_status_check` only allows `pending`, `approved`, `changes_requested`, `merged`, `closed`. The review stays `changes_requested` forever, re-triggering the handler every heartbeat.

### Bug 2 — Fallback path never marks code_review as handled
Lines 653–664: creates fix task but never calls `updateCodeReview`. Same result.

### Bug 3 — `awaiting_merge` origTask falls to fallback
Guard at line 609 checks `['done', 'failed']` only. When origTask is `awaiting_merge`, it falls to fallback instead of skipping.

## Secondary issue
`findTaskByTitle` (task-store-base.js:228) explicitly excludes `awaiting_merge` from dedup.

## Triage done (immediate)
- code_review 4828e1ab: marked `closed` → loop stopped
- Tasks ec8a45ec, 26bd1813, 63ee38c8, 42757d16: cancelled
- Actual fix was shipped via PR #1379 (task 313a3f0f, merged)
