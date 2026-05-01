# Workflow Task: Fix Zero Real Pilots Recruited

## Summary
Create a concrete dev workflow task for `fix-zero-real-pilots-recruited` so pilot recruitment fixes can be re-implemented from current main without merge-conflicted branch history.

## Why This Task Exists
The use case is revenue-critical and blocked in `needs_merge`, but there is no workflow task record to drive a fresh implementation cycle.

## Implementation Intent
The assignee should re-implement pilot recruitment fixes from current main, including:
- audited pilot invite and onboarding funnel path from landing to booked demo
- repaired pilot-specific tracking to identify drop-off points
- operational safeguards for invite links and follow-up messaging reliability
- tests covering pilot recruitment happy-path and failure-path behavior

## Acceptance Criteria
- Exactly one workflow task record exists for `fix-zero-real-pilots-recruited`.
- Task status is `pending` and owner is `dev`.
- Task spec path points to this file.
- No runtime product code changes are bundled in this workflow-seeding task.

## Verification
```bash
node tests/fix-zero-real-pilots-recruited-workflow-task.test.js
```

## Out of Scope
- Shipping the full pilot-recruitment feature set in this workflow-seeding change.
- Modifying unrelated acquisition or billing features.
