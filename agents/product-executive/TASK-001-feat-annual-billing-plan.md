<!--
Spec
What:
- Create `agents/product-executive/TASK-001-feat-annual-billing-plan.md` as the first workflow task for the uncovered use case `feat-annual-billing-plan`.
- No application source functions will be changed in this task; this is a workflow/task-definition fix only.

Verify:
- `test -f agents/product-executive/TASK-001-feat-annual-billing-plan.md` succeeds.
- `grep -n "Annual Billing Plan" agents/product-executive/TASK-001-feat-annual-billing-plan.md` returns the task title/objective.
- `grep -n "Stripe\|annual\|2 months free\|cash upfront" agents/product-executive/TASK-001-feat-annual-billing-plan.md` confirms the task contains actionable implementation scope.

Boundaries:
- Do not modify billing implementation code, checkout flows, database schema, or generated planning artifacts.
- Do not edit protected/generated files: `DASHBOARD.md`, `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md`, `ORCHESTRATOR-HEARTBEAT-LOG.md`, or `project.config.json`.
- Do not create PRs or touch unrelated use cases.
-->
---
title: TASK-001 - Annual Billing Plan — 2 Months Free, Cash Upfront
date: 2026-04-22
task_id: product-executive-001
agent: product-executive
priority: high
status: assigned
use_case: feat-annual-billing-plan
---

# TASK-001: Annual Billing Plan — 2 Months Free, Cash Upfront

## Status: 🟡 ASSIGNED

**Task ID:** product-executive-001  
**Priority:** HIGH  
**Estimated Time:** 6 hours  
**Assigned:** 2026-04-22  
**Due:** 2026-04-23  
**Agent:** Product Executive

## Objective
Define the implementation-ready product and delivery plan for adding an annual billing option that charges 10 months up front, communicates “2 months free,” and integrates cleanly with the existing monthly subscription signup and billing flow.

## Why This Task Exists
The use case `feat-annual-billing-plan` currently has no workflow tasks, so work cannot begin. This task creates the first workflow artifact and hands implementation to Dev with clear scope, acceptance criteria, and sequencing.

## Deliverables
- [ ] Document the desired annual pricing behavior and customer-facing copy
- [ ] Define checkout and post-purchase UX for monthly vs annual plan selection
- [ ] Specify required Stripe changes for annual pricing and recurring billing behavior
- [ ] Identify database, analytics, and admin/reporting implications
- [ ] Produce an implementation brief Dev can execute without ambiguity
- [ ] Create follow-on Dev and QC tasks once the brief is finalized

## Product Requirements

### 1. Pricing Model
- Add an annual plan option alongside the current monthly plan
- Annual plan should charge the customer for **10 months up front**
- Customer-facing messaging should position the offer as **“2 months free”**
- Preserve transparent pricing disclosure at checkout and on plan-selection UI
- Clarify whether renewal occurs annually at the same discounted rate or reverts to standard list price

### 2. Signup & Checkout UX
- Add plan toggle or plan cards on the signup/billing screen
- Show monthly plan as the default unless business rules say otherwise
- Display:
  - monthly price
  - annual total billed today
  - effective monthly equivalent
  - savings amount / “2 months free” message
- Confirm plan selection is carried through Stripe Checkout or existing billing flow
- Define success-state messaging and billing confirmation copy for annual purchasers

### 3. Billing System Requirements
- Determine whether the implementation uses:
  - a separate Stripe Price for annual billing, or
  - dynamic checkout/session creation with annual interval pricing
- Define webhook and subscription-state expectations for annual customers
- Confirm how MRR/ARR reporting should treat annual prepayment
- Specify cancellation/refund policy handling assumptions for annual plans

### 4. Data & Analytics Requirements
Document whether the following need changes:
- `agents.plan_tier`
- billing interval storage (`monthly` vs `annual`)
- Stripe price/subscription metadata
- conversion funnel analytics
- dashboard revenue reporting for prepaid annual customers
- upgrade/downgrade path between monthly and annual

### 5. Engineering Handoff Scope
The Dev follow-up task should, at minimum, evaluate or implement changes in:
- signup/pricing UI
- Stripe checkout/session creation
- webhook processing
- billing persistence / customer plan metadata
- analytics and reporting adjustments
- tests covering annual purchase and renewal state

## Recommended Files for Dev Follow-up
These are the likely implementation touchpoints the Product Executive should validate before handing off:
1. `app/(marketing)/pricing/*` or equivalent pricing page components
2. `app/api/stripe/**` or equivalent checkout/session routes
3. `lib/stripe.ts` / billing helpers
4. subscription webhook handlers
5. relevant billing persistence utilities and tests

## Acceptance Criteria
- [ ] A clear product brief exists for annual billing behavior
- [ ] Pricing language explicitly defines “2 months free” and upfront charge amount
- [ ] Checkout UX requirements are documented end to end
- [ ] Stripe implementation direction is chosen and documented
- [ ] Data/reporting impacts are enumerated
- [ ] A Dev implementation task can be created directly from this brief
- [ ] A QC task outline is identified for post-implementation validation

## Verification Steps
1. Review this task for complete annual-plan scope coverage
2. Confirm it names product, billing, data, and analytics requirements
3. Confirm it references the use case `feat-annual-billing-plan`
4. Confirm it is the first workflow task for this use case and is actionable by the next agent

## Dependencies
- Existing monthly subscription flow must already be functional
- Stripe billing integration must already exist in the product
- Business owner must confirm renewal/cancellation policy if not already specified

## Boundaries / Non-Goals
- Do **not** implement the annual plan in this task
- Do **not** change Stripe config, code, schema, or pricing page components here
- Do **not** modify generated project graph artifacts directly
- Do **not** expand scope into coupons, promo codes, or multi-seat billing unless separately requested

## Notes for Next Agent
Annual billing affects pricing UX, Stripe setup, subscription lifecycle handling, and revenue reporting. The implementation task should prefer the existing billing architecture and avoid introducing a second billing path unless necessary.

---
*Assigned by: Orchestrator*  
*Part of: feat-annual-billing-plan*  
*Purpose: resolve `uc_no_tasks` by creating the first workflow task*