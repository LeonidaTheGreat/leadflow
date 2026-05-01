<!--
Spec
1. What:
   - Create docs/task-specs/uc-marketing-campaign-launch-workflow-task.md and docs/task-specs/fix-zero-real-pilots-recruited-workflow-task.md to define missing re-implementation workflow tasks for the two revenue-critical UCs that currently have zero task records.
   - Update .local-tasks.json by appending exactly two pending workflow-task records:
     a) id=uc-marketing-campaign-launch-workflow-task, use_case_id=uc-marketing-campaign-launch
     b) id=fix-zero-real-pilots-recruited-workflow-task, use_case_id=fix-zero-real-pilots-recruited
   - Add tests/uc-marketing-campaign-launch-workflow-task.test.js and tests/fix-zero-real-pilots-recruited-workflow-task.test.js to enforce unique registration, ownership, status, and spec linkage.
2. Verify:
   - node tests/uc-marketing-campaign-launch-workflow-task.test.js
   - node tests/fix-zero-real-pilots-recruited-workflow-task.test.js
   - node -e "const t=require('./.local-tasks.json'); const ids=['uc-marketing-campaign-launch-workflow-task','fix-zero-real-pilots-recruited-workflow-task']; ids.forEach(id=>{const rows=t.filter(x=>x.id===id); if(rows.length!==1) throw new Error(id+':'+rows.length)});"
   - npm test
3. Boundaries:
   - Do not modify runtime application code in routes/, lib/services/, integrations/, server.js, or product dashboard implementation.
   - Do not modify protected/generated files (DASHBOARD.md, USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md, ORCHESTRATOR-HEARTBEAT-LOG.md, project.config.json).
   - Do not attempt to rebase or resurrect old conflicted PR branches in this task; only seed actionable re-implementation workflow tasks from current main state.
-->

# Workflow Task: Marketing Campaign Launch

## Summary
Create a concrete dev workflow task for `uc-marketing-campaign-launch` so this revenue-critical acquisition effort can be re-implemented cleanly from current main.

## Why This Task Exists
The use case is marked `needs_merge` but has no actionable workflow task entry in `.local-tasks.json`. Without a task record, the orchestrator cannot assign delivery work to unblock campaign launch.

## Implementation Intent
The assignee should re-implement campaign launch from current main, including:
- production-ready acquisition landing flow tied to signup conversion
- analytics attribution for campaign source and signup outcomes
- deployment and verification steps targeting at least 10 signups/day capacity
- regression checks to confirm no impact on existing lead-response flows

## Acceptance Criteria
- Exactly one workflow task record exists for `uc-marketing-campaign-launch`.
- Task status is `pending` and owner is `dev`.
- Task spec path points to this file.
- No runtime product code changes are bundled in this workflow-seeding task.

## Verification
```bash
node tests/uc-marketing-campaign-launch-workflow-task.test.js
```

## Out of Scope
- Shipping the full campaign implementation in this workflow-seeding change.
- Editing Stripe, Twilio, or FUB integration runtime behavior.
