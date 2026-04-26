# Task Spec: Move GTM Status Test to Correct Directory

**UC:** fix-pilot-outreach-has-not-happened-11-days-left
**Branch:** dev/7f073104-dev-fix-pilot-outreach-has-not-happened
**Type:** Fix (test file location)

## Context

Previous dev task (7f073104) completed the implementation: updated `app/api/admin/gtm-status/route.ts` to mark pilot outreach as `blocked` when all 20 recruitment targets remain in `identified` status. This is the correct behavior — the dashboard now accurately reflects that outreach is stalled and requires owner action.

**Single failure reason:** The test was placed in `product/lead-response/dashboard/__tests__/gtm-status-route.test.ts` but the codebase verification rule requires tests to live in `product/lead-response/dashboard/tests/`.

## What

Move one file. Everything else stays.

## Instructions

1. `git checkout dev/7f073104-dev-fix-pilot-outreach-has-not-happened`
2. Move the test:
   ```
   mv product/lead-response/dashboard/__tests__/gtm-status-route.test.ts \
      product/lead-response/dashboard/tests/gtm-status-route.test.ts
   ```
3. Verify tests pass:
   ```
   cd product/lead-response/dashboard
   npm test -- --testPathPattern=gtm-status-route
   cd ../../../..
   npm test
   ```
4. Commit: `git add product/lead-response/dashboard/tests/gtm-status-route.test.ts product/lead-response/dashboard/__tests__/gtm-status-route.test.ts && git commit -m "fix: move gtm-status test to tests/ directory"`
5. Push: `git push --force-with-lease origin dev/7f073104-dev-fix-pilot-outreach-has-not-happened`
6. Report via subagent-completion-report.js

## Boundaries

- Do NOT re-implement the route logic — `app/api/admin/gtm-status/route.ts` is correct
- Do NOT modify any other file
- Do NOT create a new branch

## Verification

```
ls product/lead-response/dashboard/tests/gtm-status-route.test.ts   # exists
ls product/lead-response/dashboard/__tests__/gtm-status-route.test.ts  # not found
npm test  # passes
```
