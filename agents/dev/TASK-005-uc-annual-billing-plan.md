<!--
SPEC
What:
- Create `agents/dev/TASK-005-uc-annual-billing-plan.md` as the first workflow task for UC `feat-annual-billing-plan`.
- This task defines the implementation entry point and names the app files/functions the future implementation should change:
  - `app/api/stripe/webhook/route.ts` — extend `POST` webhook handling for annual subscription lifecycle events.
  - `app/api/stripe/checkout/route.ts` or existing billing checkout entrypoint — add annual plan checkout session creation.
  - `lib/stripe.ts` — add annual plan price selection / checkout helpers.
  - `lib/billing.ts` or equivalent billing helpers — persist annual plan metadata, renewal date, and effective MRR/ARR fields.
  - Relevant billing tests under `tests/` or `__tests__/` for checkout, webhook fulfillment, and plan persistence.
Verify:
- `test -f agents/dev/TASK-005-uc-annual-billing-plan.md` succeeds.
- `grep -n "feat-annual-billing-plan" agents/dev/TASK-005-uc-annual-billing-plan.md` returns the use-case slug.
- `grep -n "app/api/stripe/webhook/route.ts\|lib/stripe.ts" agents/dev/TASK-005-uc-annual-billing-plan.md` confirms the implementation entrypoints are documented.
Boundaries:
- Do not modify protected/generated planning files: `DASHBOARD.md`, `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md`, `ORCHESTRATOR-HEARTBEAT-LOG.md`, `project.config.json`.
- Do not implement billing code, schema migrations, or Stripe config changes in this task.
- Do not change existing task files unless required for correctness.
-->
---
title: TASK-005 - UC Annual Billing Plan
date: 2026-02-24
task_id: dev-005
agent: dev
priority: high
status: assigned
use_case: feat-annual-billing-plan
---

# TASK-005: UC Annual Billing Plan — 2 Months Free, Cash Upfront

## Status: 🟡 ASSIGNED

**Task ID:** dev-005  
**Priority:** HIGH  
**Estimated Time:** 10 hours  
**Assigned:** 2026-02-24  
**Due:** 2026-02-27  
**Agent:** Dev

## Objective
Create the first implementation task for `feat-annual-billing-plan` so the team can ship an annual subscription option that charges cash upfront while giving customers 2 months free versus monthly billing.

## Why This Task Exists
The project graph identified that the annual billing use case had no workflow tasks attached. This task establishes the implementation starting point and the concrete engineering surface area.

## Requirements

### 1. Annual Plan Checkout Entry Point
- [ ] Add an annual billing option to the existing Stripe checkout flow
- [ ] Ensure the annual plan charges once upfront for 10 months of value across a 12-month term
- [ ] Preserve the existing monthly plan flow without regressions
- [ ] Record enough metadata on the checkout session to distinguish monthly vs annual purchases

### 2. Stripe Product / Price Handling
- [ ] Add annual price lookup/config support in Stripe helpers
- [ ] Ensure the annual plan can be selected deterministically by environment configuration
- [ ] Fail safely when the annual price is missing or misconfigured

### 3. Subscription Persistence
- [ ] Persist that the agent/customer is on an annual plan
- [ ] Store billing cadence and Stripe identifiers needed for support and renewals
- [ ] Update billing summaries so dashboards/reporting can distinguish monthly MRR from annual cash collections / ARR context

### 4. Webhook Fulfillment
- [ ] Extend Stripe webhook handling for annual checkout completion
- [ ] Ensure successful annual purchases update the agent record exactly once
- [ ] Handle renewal / cancellation / payment-failure events without breaking existing monthly logic

### 5. Admin / Product Clarity
- [ ] Expose plan naming clearly in internal billing data (`monthly` vs `annual`)
- [ ] Document the effective pricing rule: "2 months free when paid annually"
- [ ] Avoid ambiguous labels like generic `pro` when billing cadence matters

### 6. Tests
- [ ] Add tests for annual checkout session creation
- [ ] Add tests for annual webhook fulfillment
- [ ] Add tests confirming monthly billing continues to work unchanged

## Proposed Files to Create/Modify
1. `app/api/stripe/checkout/route.ts` — annual plan selection in checkout flow
2. `app/api/stripe/webhook/route.ts` — webhook fulfillment for annual purchases
3. `lib/stripe.ts` — price selection and Stripe metadata helpers
4. `lib/billing.ts` or existing billing helpers — plan persistence and reporting fields
5. `tests/stripe/*.test.ts` or equivalent — coverage for annual billing behavior

## Acceptance Criteria
- [ ] A developer can identify the Stripe checkout code path that must gain annual plan support
- [ ] A developer can identify the webhook code path that must fulfill annual purchases
- [ ] Billing persistence requirements are explicit enough to implement without guessing
- [ ] Test expectations cover new annual behavior and monthly regression protection
- [ ] The use-case slug `feat-annual-billing-plan` is now represented by a concrete workflow task in the repo

## Implementation Notes
- The customer-facing promise is annual billing with 2 months free, paid upfront.
- Keep pricing math and plan labeling centralized so UI, checkout, and webhook handling stay consistent.
- If the current schema lacks annual-specific fields, document the gap before migrating.
- Follow existing Stripe patterns in the codebase before introducing new abstractions.

## Verification
Run these checks after creating the task file:

```bash
test -f agents/dev/TASK-005-uc-annual-billing-plan.md
grep -n "feat-annual-billing-plan" agents/dev/TASK-005-uc-annual-billing-plan.md
grep -n "app/api/stripe/webhook/route.ts\|lib/stripe.ts" agents/dev/TASK-005-uc-annual-billing-plan.md
```

## Out of Scope
- Shipping the annual billing implementation itself
- Creating Stripe dashboard prices/products directly
- Running schema migrations in this task
- Modifying generated project planning files
