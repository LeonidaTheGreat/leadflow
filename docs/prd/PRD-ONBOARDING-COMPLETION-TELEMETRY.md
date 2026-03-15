# PRD: Onboarding Completion Telemetry — Know Exactly Where Real Agents Drop Off

- **PRD ID:** PRD-ONBOARDING-COMPLETION-TELEMETRY
- **Project:** leadflow
- **Use Case:** feat-onboarding-completion-telemetry
- **Owner:** Product Manager
- **Status:** approved
- **Version:** 1.0
- **Last Updated:** 2026-03-15

## 1) Objective
Instrument onboarding with step-level telemetry so LeadFlow can identify where real agents abandon and prioritize fixes on the highest-friction step.

## 2) Problem
Current `real_estate_agents` records are effectively flat (`onboarding_step=0`, `onboarding_completed=false`). This prevents reliable diagnosis of drop-off points across onboarding stages (email verification, FUB connection, phone setup, SMS verification, aha completion).

## 3) Scope
### In Scope
1. Real-time `onboarding_step` progression updates on `real_estate_agents`
2. Append-only `onboarding_events` logging per step transition
3. Canonical onboarding step taxonomy
4. Funnel admin view at `/admin/funnel` showing current step + time-at-step
5. Automatic stuck-agent alert insertion into `product_feedback` when a real agent is stuck >24h
6. Daily step-to-step conversion reporting
7. Exclusion rules for smoke-test accounts in all funnel metrics and alerts

### Out of Scope
1. Redesign of onboarding UX flows
2. New onboarding steps beyond defined taxonomy
3. Historical backfill prior to feature launch (optional future enhancement)

## 4) Canonical Step Model
### Step order and numeric mapping
- `0` = pre-onboarding / signup-created
- `1` = `email_verified`
- `2` = `fub_connected`
- `3` = `phone_configured`
- `4` = `sms_verified`
- `5` = `aha_completed`

### Transition rules
- Step index must be monotonic non-decreasing
- Repeated completion attempts for the same step are logged as events but do not decrement step index
- `onboarding_completed=true` iff `aha_completed` succeeded

## 5) Functional Requirements
### FR-1: Real-time step progression
System must update `real_estate_agents.onboarding_step` immediately after each successful step completion event.

### FR-2: Event logging contract
System must insert an `onboarding_events` row for each transition attempt with:
- `agent_id`
- `step_name` (enum from canonical list)
- `status` (`started | completed | failed | skipped`)
- `timestamp`
- `metadata` (JSON; error reason, latency, source, route, attempt count)

### FR-3: Step taxonomy enforcement
Only these step names are valid:
- `email_verified`
- `fub_connected`
- `phone_configured`
- `sms_verified`
- `aha_completed`

Invalid step names are rejected and logged as system errors.

### FR-4: Admin funnel visibility
`/admin/funnel` must show only real agents and include at minimum:
- agent identifier (email + id)
- current onboarding step (name + numeric)
- time-at-step (duration since last step update)
- last event timestamp
- current status (`active`, `completed`, `stuck`)

### FR-5: Stuck-agent alerting
If a real agent remains on the same step >24h without progression:
- Insert one `product_feedback` row (`feedback_type='ux_issue'`, source `pm_review` or `telemetry_alert`)
- Include agent id/email, current step, time stuck, and latest event metadata
- De-duplicate so the same agent+step produces at most one alert per 24h window

### FR-6: Funnel conversion metrics
System must expose daily conversion rates for:
- step 1→2 (`email_verified` to `fub_connected`)
- step 2→3 (`fub_connected` to `phone_configured`)
- step 3→4 (`phone_configured` to `sms_verified`)
- step 4→5 (`sms_verified` to `aha_completed`)

Each metric includes numerator, denominator, and rate.

### FR-7: Smoke-test exclusion rules
Exclude from all funnel counts, rates, and stuck alerts any email matching:
- `smoke-test@*`
- `*@leadflow-test.com`

## 6) User Stories
1. **As a PM**, I need to see exactly where onboarding abandonment happens so I can prioritize the highest-revenue fix.
2. **As an operator**, I need to detect agents stuck >24h and trigger intervention before they churn.
3. **As Stojan**, I need daily funnel conversion by step so I can evaluate onboarding improvements objectively.

## 7) Acceptance Criteria
- **AC-1:** `onboarding_step` updated in real time as agents progress (0→1→2→3→4→5)
- **AC-2:** `onboarding_events` logs each step transition with `{agent_id, step_name, status, timestamp, metadata}`
- **AC-3:** Step names are exactly: `email_verified`, `fub_connected`, `phone_configured`, `sms_verified`, `aha_completed`
- **AC-4:** `/admin/funnel` shows real agents only, with current step and time-at-step
- **AC-5:** Alert inserts to `product_feedback` when any real agent is stuck on same step >24h
- **AC-6:** Dashboard shows daily step-to-step conversion rates
- **AC-7:** `smoke-test@*` and `*@leadflow-test.com` excluded from funnel and alerting

## 8) Data & Reporting Requirements
1. Event timestamps stored in UTC
2. Time-at-step computed from latest completed/started event for current step
3. Conversion reporting window defaults to daily (UTC), filterable by date range
4. Reporting layer must be resilient to duplicate events via agent+step+status+time bucketing/idempotency strategy

## 9) Non-Functional Requirements
1. Event insertion must not block onboarding UX (>99% of events written within 1s of step action)
2. Admin funnel view query latency target: p95 < 1.5s for current pilot-scale dataset
3. Alerting job/trigger safe for re-runs (idempotent)

## 10) Risks & Mitigations
- **Risk:** Event spam from retries inflates funnel data  
  **Mitigation:** define idempotency key and dedupe in reporting
- **Risk:** Misclassified test accounts pollute rates  
  **Mitigation:** centralized exclusion predicate used by all funnel queries
- **Risk:** False stuck alerts from temporary outages  
  **Mitigation:** require >24h inactivity and dedupe alerts by agent+step+24h

## 11) Rollout Plan
1. Enable event write path and step updates
2. Validate event integrity in staging/smoke accounts
3. Enable `/admin/funnel`
4. Enable stuck-alert insertions
5. Enable dashboard conversion reporting

## 12) Definition of Done
- All ACs pass via QC E2E specs
- `use_cases.prd_id` links to this PRD
- `e2e_test_specs` created for this use case
- Funnel reports exclude smoke-test accounts consistently
