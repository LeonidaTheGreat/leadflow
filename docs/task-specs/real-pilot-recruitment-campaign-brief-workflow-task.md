<!--
Spec
What:
- Create docs/task-specs/real-pilot-recruitment-campaign-brief-workflow-task.md to define the first workflow task for use case fix-zero-real-pilots-recruited.
- Update .local-tasks.json by appending one new marketing task entry titled "Real Pilot Recruitment Campaign Brief" with metadata.use_case_id=fix-zero-real-pilots-recruited so the project graph sees an implementation task for this use case.

Verify:
- python3 - <<'PY' ... json.load(open('.local-tasks.json')) ... confirms the file is valid JSON and contains a task whose metadata.use_case_id is fix-zero-real-pilots-recruited.
- grep -n "Real Pilot Recruitment Campaign Brief" .local-tasks.json docs/task-specs/real-pilot-recruitment-campaign-brief-workflow-task.md returns matches in both files.
- git diff -- docs/task-specs/real-pilot-recruitment-campaign-brief-workflow-task.md .local-tasks.json shows only the new task spec and the appended task entry.

Boundaries:
- Do not modify protected/generated planning files such as DASHBOARD.md, USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md, ORCHESTRATOR-HEARTBEAT-LOG.md, or project.config.json.
- Do not change application code, database schema, or existing unrelated tasks.
- Do not rewrite existing pilot recruitment PRDs; only add the missing workflow task and its task-spec handoff doc.
-->

# Real Pilot Recruitment Campaign Brief Workflow Task

## Summary
Create the first workflow task for use case `fix-zero-real-pilots-recruited`. This use case already has supporting strategy and implementation references (`PRD-PILOT-RECRUITMENT-CAMPAIGN`, `PILOT-AGENT-RECRUITMENT-PLAYBOOK`, and `PRD-ADMIN-PILOT-INVITE-FLOW`) but no task is currently linked to the use case. The missing first task should be a marketing-owned campaign brief that turns those references into an executable recruitment plan and hands clean requirements to Dev and QC.

## Why this task should exist
- The use case owner is **Marketing**, with workflow **Marketing > Dev > QC**.
- The core gap is not additional schema or UI discovery; it is a missing execution task connected to the use case graph.
- A campaign brief is the correct first step because it defines audience, channel mix, send targets, tracking, and handoff requirements before more engineering work is queued.

## Task to create
- **Title:** `Real Pilot Recruitment Campaign Brief`
- **Agent:** `marketing`
- **Model:** `sonnet`
- **Priority:** `1`
- **Estimated hours:** `1`
- **Status:** `ready`

## Description
Create the first workflow task for use case `fix-zero-real-pilots-recruited`. Turn the existing pilot recruitment strategy into an executable campaign brief that defines the pilot target profile, sourcing channels, outreach sequencing, weekly contact goals, conversion checkpoints, success metrics, and the exact operational or product handoffs needed for Dev and QC to support pilot invite execution and signup tracking.

## Acceptance Criteria
1. Document the ideal real-estate-agent pilot profile, market constraints, and minimum qualification bar for a “real pilot.”
2. Define the outreach plan across available channels (manual outreach, partner/referral sourcing, email/invite flow, and any landing/signup surfaces already in product scope).
3. Set weekly funnel goals from identified prospects to contacted, responded, invited, activated, and recruited pilots, including the source-of-truth metrics to review.
4. List required Dev/QC follow-up work for tooling, invite flow support, tracking, or admin visibility, plus explicit non-goals for this first task.

## Suggested Tags
- `P1`
- `marketing`
- `pilot-recruitment`
- `activation`
- `growth`

## Metadata
```json
{
  "use_case_id": "fix-zero-real-pilots-recruited",
  "gap_type": "uc_no_tasks",
  "workflow": "Marketing > Dev > QC",
  "created_from_task_id": "e76d4483-f21a-403c-86e7-f5c23179f143"
}
```

## Notes for the assignee
- Reuse existing pilot recruitment docs instead of re-discovering the problem.
- Focus on the first real pilot wins, not broad self-serve acquisition.
- Make Dev handoff concrete enough that engineering can immediately implement missing invite/tracking gaps after the brief is approved.
