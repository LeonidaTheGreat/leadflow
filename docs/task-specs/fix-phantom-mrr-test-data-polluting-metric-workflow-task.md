<!--
Spec
1. What: Create the first workflow task for the use case "Fix: Phantom MRR from test subscription data" by adding this task-spec file and a matching task entry in .local-tasks.json. The task must direct implementation toward product/lead-response/dashboard/app/api/billing/mrr-snapshot/route.ts (GET handler / MRR filtering logic) and the Stripe test-data producers/coverage in product/lead-response/dashboard/app/api/smoke/stripe-checkout-e2e/route.ts and tests/integration/stripe-subscription-schema-alignment.test.js.
2. Verify: Confirm docs/task-specs/fix-phantom-mrr-test-data-polluting-metric-workflow-task.md exists, confirm .local-tasks.json contains a task with metadata.use_case_id = "fix-phantom-mrr-test-data-polluting-metric", and validate the JSON file parses successfully with python3 -c 'import json; json.load(open(".local-tasks.json"))'.
3. Boundaries: Do not implement the MRR filtering fix itself here, do not modify billing calculations, database schema, dashboard UI, or Stripe runtime behavior, and do not touch protected/generated files called out in the assignment.
-->
# Workflow Task — Fix: Phantom MRR from test subscription data

## Summary
Create the first implementation task for the use case that phantom MRR is being inflated by Stripe test subscription data polluting the production-facing metric.

## Problem
The dashboard's MRR snapshot can be distorted when test or smoke-checkout subscription records are counted alongside real paying subscriptions. This creates a misleading revenue metric and can mask actual business performance.

## First Workflow Task
**Owner:** dev  
**Type:** fix  
**Priority:** high

### Task
Audit the MRR snapshot pipeline and exclude test-created Stripe subscription records from the value returned by the billing metric, while preserving legitimate live subscriptions.

### Files to inspect/change
- `product/lead-response/dashboard/app/api/billing/mrr-snapshot/route.ts`
- `product/lead-response/dashboard/app/api/smoke/stripe-checkout-e2e/route.ts`
- `tests/integration/stripe-subscription-schema-alignment.test.js`

### Expected output
- MRR snapshot logic documents and enforces a rule that excludes test/smoke subscription data from reported MRR.
- Regression coverage proves a test-tagged subscription does not contribute to MRR.
- Smoke or schema-alignment flows still retain whatever markers are needed to identify non-production subscriptions.

## Verification
Run the implementation task with verification that includes:

```bash
cd /Users/clawdbot/projects/leadflow
npm test -- tests/integration/stripe-subscription-schema-alignment.test.js
grep -Rni "fix-phantom-mrr-test-data-polluting-metric" .local-tasks.json docs/task-specs
python3 -c 'import json; json.load(open(".local-tasks.json"))'
```

## Boundaries
- Do not change unrelated billing metrics or dashboard presentation.
- Do not alter Stripe webhook flows unless required to preserve test-data markers.
- Do not make schema migrations as part of this workflow-task creation step.
- Do not touch protected generated planning files.
