# PRD: Expand NPS Survey to Trial/Onboarding Agents

**UC ID:** feat-nps-survey-trial-agents  
**Priority:** P1  
**Phase:** Pilot  
**Author:** PM Agent  
**Date:** 2026-04-29

---

## Problem

NPS Score = null (target: 50). The genome metric collector returns null because `agent_nps_responses` has 0 rows — no surveys have ever been completed.

Root cause chain:

1. `getAgentsDueForSurvey()` filters `.eq('real_estate_agents.status', 'active')` 
2. All 23 agents in the database have status `onboarding` or `invited` — none are `active`
3. Result: cron runs daily, finds 0 eligible agents, sends 0 emails
4. In-app prompt only shows for the 1 agent with `next_survey_at <= now` (overdue since Apr 26) — if they haven't logged in, it's never seen
5. 22 of 23 rows in `agent_survey_schedule` are orphaned (reference UUIDs not in `real_estate_agents`)

The NPS infrastructure is fully built (survey routes, email service, admin page, cron, in-app prompt). The single issue is an overly restrictive status filter.

---

## Solution

Three targeted changes:

### 1. Remove status filter from `getAgentsDueForSurvey()`

**File:** `product/lead-response/dashboard/lib/nps-service.ts` ~line 170

Remove: `.eq('real_estate_agents.status', 'active')`

The `agent_survey_schedule.next_survey_at` column already controls when an agent is eligible — they only appear in the schedule after 14 days (set during signup/onboarding enrollment). Status should not gate survey eligibility for an early-stage product; we need feedback from trial users.

### 2. Clean 22 orphaned schedule rows

Run once (migration or one-time script):
```sql
DELETE FROM agent_survey_schedule 
WHERE agent_id NOT IN (SELECT id FROM real_estate_agents);
```

### 3. Backfill missing schedule entries

22 real agents have no schedule entry. For each, create a schedule with:
- `next_survey_at = created_at + 14 days` (natural delay, not now+14d)
- `survey_count = 0`

This means agents who signed up >14 days ago become immediately eligible on the next cron run.

---

## Acceptance Criteria

```bash
# 1. No orphaned rows
psql openclaw -c "SELECT count(*) FROM agent_survey_schedule WHERE agent_id NOT IN (SELECT id FROM real_estate_agents)"
# → 0

# 2. All real agents have schedule entries
psql openclaw -c "SELECT count(*) FROM agent_survey_schedule WHERE agent_id IN (SELECT id FROM real_estate_agents)"
# → 23

# 3. At least 1 agent due now
psql openclaw -c "SELECT count(*) FROM agent_survey_schedule s JOIN real_estate_agents r ON s.agent_id = r.id WHERE s.next_survey_at <= NOW()"
# → ≥ 1

# 4. Build passes
cd product/lead-response/dashboard && npm run build
# → exit 0
```

---

## Out of Scope

- Changing the NPS scoring formula (promoters − detractors formula is correct)
- Email template changes
- Survey frequency (14d first, 90d recurring is correct)
- Any schema changes to `agent_nps_responses`

---

## Why This Matters

NPS Score is a direct proxy for whether trial agents find value. A null score means zero product signal. With Day 90 approaching, we need at least 5–10 responses to calculate a meaningful NPS. Agents enrolled since mid-April are already overdue for their first survey.
