<!--
Task Spec
What:
- Create docs/prd/PRD-WHITE-GLOVE-PILOT-ONBOARDING.md (new PRD document) to resolve missing approved PRD artifact on disk.
- No function/module changes; this is a documentation artifact restoration.

Verify:
- Confirm file now exists at docs/prd/PRD-WHITE-GLOVE-PILOT-ONBOARDING.md.
- Run quality gates: npm run build, npm run lint, npm test, npm audit --audit-level=high.
- Verify targeted file presence with: test -f docs/prd/PRD-WHITE-GLOVE-PILOT-ONBOARDING.md.

Boundaries:
- Do not modify routes/, lib/services/, database schema, or migrations.
- Do not change generated/protected files (DASHBOARD.md, USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md, project.config.json).
- Do not alter existing PRD files beyond creating the missing one.
-->

# PRD: White-Glove Pilot Onboarding

**ID:** UC-PILOT-WHITE-GLOVE  
**Status:** approved  
**Priority:** P1  
**Owner:** Product + Ops  
**Created:** 2026-04-04

## Problem

LeadFlow needed an execution-ready onboarding path for pilot agents who are recruited directly (white-glove), but the process was fragmented across invite flow, onboarding steps, and manual support notes. Without a single operational PRD, pilot onboarding quality and conversion from invite to trial activation was inconsistent.

## Goal

Onboard pilot agents through a concierge flow that gets each agent from signup to demonstrated value quickly, with clear stage tracking, escalation for stuck accounts, and explicit conversion gates.

## Success Metrics

- 5 pilot agents onboarded through the white-glove flow.
- Time from `signed_up` to `aha_moment` under 72 hours median.
- Stuck pilots (`>24h` in non-terminal stage) automatically surfaced for action.
- Pilot-to-trial and pilot-to-paid conversions measurable by stage transitions.

## Scope

### In Scope

- Pilot lifecycle stage model and progression tracking.
- Stage-based operator workflow for onboarding and follow-up.
- Admin visibility into pilot status, contact history, and blockers.
- Alerting workflow for pilots stuck in a stage.

### Out of Scope

- Self-serve onboarding optimization for non-pilot users.
- Stripe pricing or checkout redesign.
- Changes to general inbound lead routing logic.

## User Stories

### Internal Operator (White-Glove Team)

- As an operator, I can see each pilot's current stage and hours in stage.
- As an operator, I can log last-contact channel and support notes.
- As an operator, I can identify and prioritize stuck pilots quickly.

### Pilot Agent (Customer)

- As a pilot agent, I get guided through setup from signup to first visible value.
- As a pilot agent, I receive responsive help when blocked on integration or setup.
- As a pilot agent, I can reach a successful first lead response before trial conversion asks.

## Lifecycle Stages

1. `signed_up`
2. `email_verified`
3. `fub_connected`
4. `first_lead_responded`
5. `aha_moment`
6. `trial_started`
7. `paid`

## Functional Requirements

### FR-1: Pilot Progress Tracking

Each pilot has a persistent progress record with:
- Current `stage`
- `stage_entered_at`
- `pilot_cohort`
- Last-contact metadata (`last_contact_at`, `last_contact_type`)
- Support context (`support_notes`)

### FR-2: Stage Transition Recording

Operators can advance stages as onboarding milestones are completed. Stage transition updates must update `stage` and reset `stage_entered_at`.

### FR-3: Stuck Pilot Detection

A pilot is considered stuck when:
- `NOW() - stage_entered_at > 24 hours`
- Stage is not terminal (`paid`)

Stuck pilots must be queryable in admin workflows for daily follow-up.

### FR-4: Pilot List and Operational Querying

Operators can fetch pilot records joined with agent profile data, including current stage, hours in stage, cohort, and last-contact metadata.

### FR-5: Conversion Visibility

Operators can identify recent conversions where stage moved to `trial_started` or `paid` within the last 24 hours.

## Data Model

Primary table: `pilot_progress`

Required fields:
- `id`
- `agent_id` (FK to `real_estate_agents`)
- `stage`
- `stage_entered_at`
- `stuck_since`
- `last_contact_at`
- `last_contact_type`
- `pilot_cohort`
- `support_notes`

## Operational Playbook

- Review all pilots daily sorted by highest `hours_in_stage`.
- Contact all stuck pilots first and log contact type + notes.
- Advance stage only when milestone evidence exists.
- Escalate unresolved blockers after second contact attempt.

## Acceptance Criteria

1. Pilot progress records can be created and retrieved with agent joins.
2. Stage transitions update `stage` and `stage_entered_at` correctly.
3. Last-contact metadata and support notes are persisted.
4. Stuck-pilot logic flags records in stage for more than 24 hours.
5. All defined lifecycle stages are accepted and persisted.
6. Admin workflows can query pilots with operational fields and identify recent conversions.

## Verification

- Integration coverage: `tests/integration/pilot-white-glove-onboarding.test.js`
- The verification must demonstrate:
  - Pilot progress CRUD operations
  - Valid stage transitions
  - Stuck-pilot detection query behavior
  - Pilot operational query behavior for conversion monitoring

## Dependencies

- Pilot invite and activation flows to feed pilot cohort.
- Follow Up Boss integration onboarding for `fub_connected` milestone.
- Admin operational surfaces that consume pilot progress queries.

## Risks

- Inconsistent operator updates can degrade stage fidelity.
- Delayed follow-up on stuck pilots can reduce pilot conversion.
- Missing contact logging limits root-cause analysis for pilot drop-off.

## Rollout Notes

- Apply to all newly recruited white-glove pilot agents immediately.
- Backfill existing active pilots into `pilot_progress` where missing.
- Review stage-distribution weekly and adjust operator playbook based on bottlenecks.
