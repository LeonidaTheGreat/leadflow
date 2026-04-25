<!--
Spec
1. What:
   - Create docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md to define the first workflow task for use case feat-subscription-funnel-tracking.
   - Update .local-tasks.json by appending a single pending workflow-task record with id feat-subscription-funnel-tracking-workflow-task and spec_path docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md.
   - No runtime application functions are changed in this task; this is project workflow initialization only.
2. Verify:
   - python3 - <<'PY' ... load .local-tasks.json and assert exactly one task with id feat-subscription-funnel-tracking-workflow-task and matching spec_path.
   - grep -n "feat-subscription-funnel-tracking-workflow-task" .local-tasks.json docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md
   - git diff -- .local-tasks.json docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md shows only the new workflow task registration and spec.
3. Boundaries:
   - Do not modify product runtime code, migrations, Stripe handlers, or analytics implementation files.
   - Do not edit protected/generated files listed in the assignment.
   - Do not create additional tasks for other use cases or expand scope beyond seeding this use case with its first workflow task.
-->

# Workflow Task: Subscription Funnel Tracking

## Summary
Create the first implementation task for the `feat-subscription-funnel-tracking` use case so the project graph no longer treats this mission-critical subscription conversion work as unowned.

## Why This Task Exists
The project graph detected that **Subscription Funnel Tracking: Apply Migration + Checkout Abandonment Recovery** has no workflow tasks attached to it. That means the work is not actionable by delivery agents even if related code or planning exists elsewhere.

This task establishes an explicit execution entry point for:
- applying the subscription funnel tracking migration safely
- wiring checkout funnel event capture end to end
- implementing checkout abandonment detection and recovery follow-up
- verifying attribution/reporting needed to improve trial-to-paid conversion

## Proposed Implementation Scope
The assignee for this workflow task should:

1. **Audit current billing and signup flow code paths**
   - identify the existing Stripe checkout/session creation path
   - identify current trial/subscription persistence and webhook update flow
   - identify any existing analytics/event sink already present in the app

2. **Apply or author the required migration**
   - verify whether the schema already contains funnel-tracking fields/tables
   - if missing, add the migration needed for checkout lifecycle tracking and abandonment recovery state
   - document rollback and backfill expectations if production data is affected

3. **Implement funnel event tracking**
   - capture subscription funnel milestones such as visit, checkout start, checkout session created, checkout completed, and checkout abandoned
   - ensure event names and payloads are stable enough for downstream reporting
   - avoid duplicating events across retries or webhook replays

4. **Implement checkout abandonment recovery**
   - detect incomplete checkout sessions based on durable persisted state
   - trigger the appropriate recovery path already used by the system, or add a minimal one if absent
   - define guardrails to prevent duplicate reminders or recovery spam

5. **Verify end-to-end behavior**
   - add or update targeted tests for migration-backed persistence and recovery logic
   - verify the implementation against a realistic Stripe checkout flow
   - document any operational prerequisites or environment variables

## Acceptance Criteria
- A concrete implementation task now exists for `feat-subscription-funnel-tracking`
- The task clearly points to migration, tracking, and abandonment recovery work
- The task is registered in `.local-tasks.json` so orchestration can pick it up
- No unrelated product code changes are bundled into this workflow-seeding task

## Verification Notes
Use the commands below after registration:

```bash
grep -n "feat-subscription-funnel-tracking-workflow-task" \
  .local-tasks.json \
  docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md

python3 - <<'PY'
import json
from pathlib import Path
path = Path('.local-tasks.json')
data = json.loads(path.read_text())
rows = [t for t in data if t.get('id') == 'feat-subscription-funnel-tracking-workflow-task']
assert len(rows) == 1, rows
assert rows[0]['spec_path'] == 'docs/task-specs/feat-subscription-funnel-tracking-workflow-task.md'
print('verified workflow task registration')
PY
```

## Out of Scope
- Shipping the actual migration in this workflow-seeding task
- Editing Stripe billing logic in this workflow-seeding task
- Building dashboards or reporting UI in this workflow-seeding task
- Creating more than one task for this use case right now
