# NPS Metric Gap Analysis — 2026-04-29

**Task:** 99dc1e17-94c4-41a9-b2a6-76c796fed22b  
**Gap:** NPS Score null vs target 50  
**Severity:** High

## Root Cause

`getAgentsDueForSurvey()` in `product/lead-response/dashboard/lib/nps-service.ts` (line 176) filters on:

```typescript
.eq('real_estate_agents.status', 'active')
```

No agents ever have `active` status — all production agents are `onboarding`, `trial`, or `pilot`. Result: **zero surveys sent → zero responses → NPS = null**.

The NPS system is fully built (21 UCs complete, email delivery, in-app prompt, admin dashboard, churn alerts). The metric collector (`_collectNPSMetrics()` in genome) is also implemented and returns null correctly when no responses exist. The single blocking issue is the status filter.

## Data

| Table | Count |
|-------|-------|
| `agent_nps_responses` | 0 |
| `nps_survey_tokens` | 0 |
| `nps_prompt_dismissals` | 0 |
| `agent_survey_schedule` | 12 (all pending, none sent) |
| Orphaned schedule rows | 22 (no matching agent) |
| `real_estate_agents` by status | 22 onboarding, 1 invited, 0 active |

The cron (`/api/cron/nps-surveys`, daily 11am) runs but gets 0 eligible agents due to the status filter.

## Actions Taken

1. **Created UC** `fix-nps-survey-eligibility-status-filter` (P1, status: `ready`)  
   Fix: change `.eq('status', 'active')` to `.in('status', ['trial', 'pilot', 'active'])` in two places in `nps-service.ts`. Also clean 22 orphaned `agent_survey_schedule` rows.

2. **Unblocked UC** `c740b281-2c54-4f6d-8bd2-e2d346c28e98` (NPS Metric Auto-Collection, status: `ready`)  
   Genome collector is implemented — needs verification run and orphan cleanup.

## Expected Outcome

Once the status filter is fixed:
- Next cron run surveys all pilot/trial agents overdue for their 14-day check-in
- First NPS responses flow into `agent_nps_responses`
- `_collectNPSMetrics()` computes NPS each heartbeat and updates `mission_metrics`
- NPS Score changes from null to a real number

## NPS Target Reality Check

Target of 50 requires majority promoters (9-10). At Day 79 with 0 activated paying users, a realistic near-term milestone is: **collect ≥5 responses from pilot agents** to get any data point. Refine the 50 target once we have baseline data (likely 0-30 range for an early-stage product).
