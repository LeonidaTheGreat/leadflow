<!--
Spec
What:
- Create a first workflow task for the use case `fix-no-urgency-or-scarcity-mechanism` by adding this task spec file and a matching queued task entry in `/Users/clawdbot/projects/leadflow/.local-tasks.json`.
- The implementation task created by this spec should target `product/lead-response/dashboard/app/page.tsx`, specifically the landing-page sections rendered by `export default function HomePage()` and any helper content/constants it uses for hero, pricing, and CTA copy.
- Verification for the future implementation task should use `cd /Users/clawdbot/projects/leadflow/product/lead-response/dashboard && npm run test -- landing-page-optimization.test.js` or the project’s equivalent landing-page E2E command, plus grep checks confirming urgency/scarcity copy exists in `app/page.tsx`.

Verify:
- Confirm this file exists at `docs/task-specs/fix-no-urgency-or-scarcity-mechanism-workflow-task.md`.
- Confirm `.local-tasks.json` contains a queued task whose metadata `use_case_id` is `fix-no-urgency-or-scarcity-mechanism`.
- Run `python3 - <<'PY' ...` or `jq` against `.local-tasks.json` to verify the new task title, agent, and metadata were added without breaking JSON syntax.

Boundaries:
- Do not implement the landing-page urgency/scarcity UI in this task.
- Do not edit protected planning files: `DASHBOARD.md`, `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md`, `ORCHESTRATOR-HEARTBEAT-LOG.md`, or `project.config.json`.
- Do not modify unrelated product code, database schema, or backend automation flows.
-->
# Workflow Task: Add urgency and scarcity to landing page conversion flow

## Summary
Create the first implementation task for the use case `fix-no-urgency-or-scarcity-mechanism` so the Dev → QC workflow can begin. The current landing page explains value and pricing, but it does not create urgency to act now or scarcity around early access, founding pricing, or limited onboarding capacity.

## Why this matters
This gap directly affects trial-to-paid conversion, signup-to-activated rate, and the number of paying customers. Without a clear reason to act now, visitors can defer signup even if the product value is clear.

## Implementation target
The follow-up implementation task should update the marketing landing page in:

- `product/lead-response/dashboard/app/page.tsx`

Focus on the content rendered by `HomePage()` that currently drives first-visit conversion:

- hero copy and supporting trust bar
- pricing/offer framing
- CTA-adjacent reinforcement copy
- any founder/pilot or onboarding-capacity messaging near signup actions

## Requirements for the implementation task
1. Add urgency messaging that gives visitors a reason to start now.
2. Add scarcity messaging that feels credible, specific, and consistent with the existing product voice.
3. Keep claims honest and non-deceptive.
4. Ensure the primary CTA remains visually dominant.
5. Preserve mobile readability and existing page structure unless a small structural change is required to support the new messaging.
6. Update or add landing-page verification coverage so the new copy is asserted by test.

## Suggested acceptance criteria
- Hero or pricing section includes clear act-now messaging.
- Landing page includes a limited-availability or founding-offer message.
- CTA support copy reinforces urgency without overwhelming the page.
- Existing landing-page tests still pass.
- Updated landing-page test coverage verifies the new urgency/scarcity content.

## Verification for the implementation task
From `product/lead-response/dashboard`:

```bash
npm run test -- landing-page-optimization.test.js
```

And confirm the final implementation includes urgency/scarcity copy:

```bash
grep -nE "limited|spots|founding|early access|act now|this week|before" app/page.tsx
```

## Notes
This workflow task only creates the implementation entry point. It does not change production behavior by itself.
