<!--
Spec
1. What:
   - Create docs/task-specs/feat-revenue-funnel-visibility-workflow-task.md defining the first workflow task for use case feat-revenue-funnel-visibility.
   - Update .local-tasks.json to append one pending workflow-task entry with id feat-revenue-funnel-visibility-workflow-task and spec_path docs/task-specs/feat-revenue-funnel-visibility-workflow-task.md.
   - Add tests/feat-revenue-funnel-visibility-workflow-task.test.js to validate task registration, ownership, and spec linkage.
2. Verify:
   - node tests/feat-revenue-funnel-visibility-workflow-task.test.js returns 0 with all checks passing.
   - node -e "const t=require('./.local-tasks.json'); const rows=t.filter(x=>x.id==='feat-revenue-funnel-visibility-workflow-task'); if(rows.length!==1) process.exit(1);"
   - grep -n "feat-revenue-funnel-visibility-workflow-task" .local-tasks.json docs/task-specs/feat-revenue-funnel-visibility-workflow-task.md tests/feat-revenue-funnel-visibility-workflow-task.test.js
3. Boundaries:
   - Do not modify runtime application routes/services, database schema, or dashboard rendering code.
   - Do not edit protected generated docs and config files listed in task instructions.
   - Do not create additional workflow tasks beyond the single first task needed to clear the uc_no_tasks gap.
-->

# Workflow Task: Revenue Funnel Visibility

## Summary
Create the first implementation workflow task for `feat-revenue-funnel-visibility` so the team can execute a concrete plan for tracking conversion from signup through paid MRR with alerting.

## Why This Task Exists
Project graph reported a `uc_no_tasks` gap for **Revenue Funnel Dashboard — Track Signups to MRR with Alerts**. Without a registered workflow task, ownership and execution routing cannot begin.

## Implementation Scope for the Assignee
1. Define the canonical revenue funnel stages and ownership.
- Stages should minimally include signup created, onboarding completed, trial started, paid conversion, and MRR recognition.
- Each stage needs an explicit event/data source and timestamp field.

2. Build backend aggregation pipeline for funnel counts and rates.
- Implement a service-owned query layer that computes counts and conversion rates by stage.
- Ensure stage transitions are deduplicated and resilient to webhook retries.

3. Add alert conditions tied to funnel degradation.
- Configure threshold alerts for signup drop, activation drop, and trial-to-paid drop.
- Persist alert state so repeated breaches do not spam operators.

4. Expose API + dashboard integration points.
- Provide route-level read access through thin handlers delegated to a service class.
- Add clear data contracts for dashboard cards and trend views.

5. Verify with targeted tests.
- Add unit/integration tests for aggregation accuracy and alert triggering boundaries.
- Cover empty-state handling and out-of-order event ingestion.

## Acceptance Criteria
- A first workflow task exists for `feat-revenue-funnel-visibility` in `.local-tasks.json`.
- The task points to this spec file and has `pending` status owned by `dev`.
- Scope covers signup-to-MRR stage visibility and alerting expectations.
- No unrelated runtime or schema changes are bundled in this seeding task.

## Verification Commands
```bash
node tests/feat-revenue-funnel-visibility-workflow-task.test.js

grep -n "feat-revenue-funnel-visibility-workflow-task" \
  .local-tasks.json \
  docs/task-specs/feat-revenue-funnel-visibility-workflow-task.md \
  tests/feat-revenue-funnel-visibility-workflow-task.test.js
```

## Out Of Scope
- Implementing the full revenue funnel dashboard in this task.
- Shipping new schema migrations in this task.
- Creating multiple downstream implementation tasks.
