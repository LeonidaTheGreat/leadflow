<!--
SPEC
What:
- Create docs/task-specs/feat-conversion-call-booking-workflow-task.md documenting the first workflow task for use case feat-conversion-call-booking.
- Add a new product-owned task entry to .local-tasks.json with metadata.use_case_id = feat-conversion-call-booking and workflow = PM > Dev > QC.
- Add tests/feat-conversion-call-booking-workflow-task.test.js to verify the task spec exists, the .local-tasks.json entry is spawnable, targets the product agent, and references the correct use case.

Verify:
- Run: node tests/feat-conversion-call-booking-workflow-task.test.js
- Run: node -e "JSON.parse(require('fs').readFileSync('.local-tasks.json','utf8')); console.log('ok')"
- Grep: grep -n "feat-conversion-call-booking" .local-tasks.json docs/task-specs/feat-conversion-call-booking-workflow-task.md tests/feat-conversion-call-booking-workflow-task.test.js

Boundaries:
- Do not modify application code, UI components, routes, analytics, email sending, or Cal.com integration.
- Do not edit protected generated files such as DASHBOARD.md, USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md, ORCHESTRATOR-HEARTBEAT-LOG.md, or project.config.json.
- Do not create a PR or alter other unrelated tasks.
-->
# Workflow Task Spec — feat-conversion-call-booking

## Use Case
- **ID:** feat-conversion-call-booking
- **Title:** High-Intent Conversion Call — Book a Demo for Trial Agents Near Checkout
- **Workflow:** PM > Dev > QC
- **Gap Type:** uc_no_tasks
- **Source Task ID:** c11057d4-79df-4a55-91be-cc2d709d4e65

## Goal
Create the first workflow task for this use case by opening a Product/PM task that turns the use-case description into an implementation-ready PRD for Dev and QC.

## Why This First Task
The use case already identifies the business goal and acceptance criteria, but the workflow explicitly starts with PM. The first task should therefore produce a PRD that locks scope for:
- the CTA surfaces on pricing, billing, and trial-expired pages,
- the Cal.com destination and copy approach,
- analytics event requirements,
- whether checkout-abandonment email is in v1 or deferred,
- rollout constraints and measurement.

## Task To Create
- **Title:** Conversion Call Booking PRD
- **Agent:** product
- **Status:** ready
- **Priority:** P1

### Task Description
Create the first workflow task for use case feat-conversion-call-booking. Define the PM-ready PRD for adding a high-intent “Book a 15-min demo / Talk to a human” CTA across pricing-adjacent surfaces, confirm the Cal.com booking destination and copy strategy, specify GA4 tracking requirements, decide whether the 24-hour checkout-abandonment follow-up email is in v1 or explicitly deferred, and document acceptance criteria, rollout constraints, and non-goals so implementation can move cleanly through PM > Dev > QC.

### Acceptance Criteria
1. Document the conversion-call-booking use case with target audience, goal, and success metric tied to trial-to-paid conversion.
2. Specify the required product surfaces and CTA variants for `/pricing`, `/settings/billing`, and `/dashboard/trial-expired`.
3. Define the Cal.com destination, event tracking payloads, and source taxonomy for CTA click analytics.
4. Clarify v1 scope versus deferred scope for checkout-abandonment follow-up email and any implementation constraints.
5. Provide engineering-ready acceptance criteria, dependencies, and non-goals for Dev and QC handoff.

## Files Expected In This Workflow-Seed Change
- `.local-tasks.json`
- `docs/task-specs/feat-conversion-call-booking-workflow-task.md`
- `tests/feat-conversion-call-booking-workflow-task.test.js`

## Out of Scope
- Implementing UI CTAs
- Wiring GA4 events
- Sending abandonment emails
- Adding or changing Cal.com integration code
