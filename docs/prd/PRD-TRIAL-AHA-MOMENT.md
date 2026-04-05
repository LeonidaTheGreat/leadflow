# PRD: Trial Aha Moment — AI Response by Day 3

**PRD ID:** prd-trial-aha-moment  
**Use Case:** uc-revenue-aha-moment  
**Status:** active  
**Created:** 2026-04-04  
**Owner:** PM Agent  
**Priority:** P1 (User-facing, direct path to paid conversion)  
**Parent PRD:** prd-revenue-recovery-sprint

---

## Goal

Guarantee **80% of trial users see the AI respond to a lead** within 3 days of signup.

This is the single most important activation metric. Users who experience the aha moment convert to paid at dramatically higher rates than those who don't. Currently the simulator is buried behind FUB + SMS setup steps and can be skipped entirely.

---

## Problem Analysis

### Why trial users miss the aha moment today

1. **Simulator is gated behind setup steps** — `/setup` requires FUB API key and SMS phone number before reaching the simulator (step 3 of 4). Most trial users won't have these ready on day 1.
2. **"Skip this for now" button is too prominent** — users can bypass the simulator with one click and never see it again.
3. **No re-engagement** — users who skip the simulator get no follow-up nudge.
4. **No tracking** — there is no metric for "% of trial users who saw AI respond within 3 days."

### Existing infrastructure (reuse, don't rebuild)

- **Simulator API:** `POST /api/onboarding/simulator` — fully working, scripted conversation, DB tracking via `onboarding_simulations` table, analytics events logged to `events` table.
- **Simulator UI:** `app/setup/steps/simulator.tsx` — complete, animated conversation display.
- **Setup wizard:** `app/setup/page.tsx` — 4-step flow (fub → sms → simulator → complete).
- **Analytics events already fired:** `onboarding_simulation_started`, `onboarding_simulation_succeeded`, `onboarding_simulation_skipped`.

---

## Requirements

### R1 — Decouple Simulator from FUB/SMS Prerequisites

The simulator MUST be reachable on day 1 without completing FUB or SMS setup.

**Implementation:** Add a standalone simulator route at `/setup/simulator` (or make the simulator the first step for trial users). The setup wizard should present the simulator as step 1 for fresh trial signups, with FUB/SMS steps after.

**Alternatively (simpler):** Add a "Try the AI now — no setup needed" shortcut on the dashboard home page that skips directly to the simulator step, bypassing FUB/SMS.

**Acceptance criterion:** A brand-new trial user can reach and run the simulator within 2 clicks of landing on the dashboard, without entering any API keys.

---

### R2 — Remove Friction on "Skip"

The "Skip this for now" button must not silently let users leave without seeing the demo. Options:
- Change "Skip" to "I'll do this later" with a modal: "Are you sure? 80% of agents who see the demo upgrade within a week."
- OR: Remove the skip button and only show "Continue" after simulation completes.

**Preferred behavior:** Keep skip but add a single confirmation step. Log `skip_reason='user_confirmed_skip'` in DB.

**Acceptance criterion:** Users who click skip see a confirmation prompt before bypassing. Skip rate measured in `onboarding_simulations` via `skip_reason`.

---

### R3 — Day-1 Trigger: "See Your AI in Action" Email

On successful signup/email verification, send a transactional email with a direct deeplink to the simulator.

**Email content:**
- **Subject:** "Your AI is ready — watch it handle a lead right now"
- **Body:** Short, visual. Show one AI response message. CTA: "Watch a 30-second demo →" linking to `/setup?step=simulator` (or standalone simulator URL).
- **Timing:** Send immediately after email verification confirmed.
- **Do not send:** If `onboarding_simulations` already has a `success` record for this agent.

**Acceptance criterion:** Email fires within 5 minutes of verification for all new trial agents who have not yet completed simulator. Email links to functional simulator page.

---

### R4 — Day-3 Re-engagement Nudge (Email + Dashboard Banner)

For trial users who have **not** completed the simulator by day 3:

**Email nudge:**
- **Subject:** "3 days in — have you seen your AI respond yet?"
- **Body:** One-sentence hook, same CTA as day-1 email.
- **Trigger:** Cron or heartbeat job — check agents where `trial_start_date` = 3 days ago AND no `success` record in `onboarding_simulations`.

**Dashboard banner:**
- Persistent yellow/amber banner on dashboard home for users without simulator completion: "🤖 You haven't seen your AI in action yet. [Watch the demo →]"
- Dismissable. If dismissed, don't show again for 24h.
- Remove permanently once `onboarding_simulations.status = 'success'` exists for agent.

**Acceptance criterion:**
- Banner is visible on dashboard for agents with no simulator completion.
- Banner is absent for agents with a `success` simulation record.
- Day-3 email sends to correct cohort (verified, no simulator success, ≥3 days since signup).

---

### R5 — Activation Metric Tracking

Add a dashboard KPI card and heartbeat metric: **"% trial users with simulator completed within 3 days."**

**Data source:**
```sql
-- Agents who completed simulator within 3 days of signup
SELECT 
  COUNT(CASE WHEN s.status = 'success' 
             AND s.created_at <= (a.trial_start_date + interval '3 days') 
             THEN 1 END)::float 
  / NULLIF(COUNT(a.id), 0) AS aha_moment_rate
FROM agents a
LEFT JOIN onboarding_simulations s ON s.agent_id = a.id::text
WHERE a.plan_tier = 'trial'
  AND a.trial_start_date >= NOW() - interval '30 days';
```

**Target:** ≥80% within 3 days of signup.

**Acceptance criterion:** Metric queryable from DB. Exposed in heartbeat health check or dashboard analytics.

---

## User Stories

**As a new trial agent**, I want to see my AI respond to a lead on day 1 without needing to set up FUB or Twilio, so I understand the product's value immediately.

**As a new trial agent who skipped the demo**, I want a reminder on day 3 that I haven't seen the AI yet, so I get a second chance at the aha moment before my trial ends.

**As Stojan (product owner)**, I want to track what % of trial users experience the aha moment within 3 days, so I can measure activation quality.

---

## Acceptance Criteria (machine-verifiable where possible)

| ID | Check | Method |
|----|-------|--------|
| AC-1 | New trial user can reach simulator without FUB/SMS | Manual: sign up, reach simulator in ≤2 clicks |
| AC-2 | Simulator API returns `status: success` conversation | `curl -X POST /api/onboarding/simulator -d '{"action":"start","agentId":"test"}'` returns 200 with conversation |
| AC-3 | Skip button shows confirmation modal | Manual: click Skip, confirm modal appears |
| AC-4 | Dashboard banner visible for agents without simulator | DB query: agents with no `onboarding_simulations.status='success'` see banner |
| AC-5 | Dashboard banner absent for agents with simulator | DB query: agents with `onboarding_simulations.status='success'` do NOT see banner |
| AC-6 | Day-1 email sends after verification | Check `events` table for `onboarding_email_sent` event within 5min of verification |
| AC-7 | Day-3 email sends to correct cohort | Query: agents verified 3d ago, no simulation success → email fired |
| AC-8 | Aha moment metric queryable | Above SQL query returns a float between 0 and 1 |

---

## Out of Scope

- Live SMS/Twilio lead simulation (A2P blocked) — use scripted simulator only
- Personalizing simulator with agent's real FUB leads — future iteration
- Changing simulator conversation scripts — content is fine as-is
- Multi-language support

---

## Implementation Notes for Dev

### Files to modify:
- `app/setup/page.tsx` — reorder steps OR add shortcut to skip to simulator
- `app/setup/steps/simulator.tsx` — add skip confirmation modal
- `app/dashboard/page.tsx` (or equivalent) — add "Watch demo" banner for non-completed agents
- New API route or heartbeat job: day-3 email trigger

### DB tables used:
- `onboarding_simulations` — primary source of truth for simulator status
- `agents` — `trial_start_date`, `email`, `plan_tier`
- `events` — analytics event logging

### Do NOT modify:
- `app/api/onboarding/simulator/route.ts` — simulator API is working correctly

---

## Success Metric

**80% of trial agents have `onboarding_simulations.status = 'success'` within 3 days of signup.**

Measured weekly. If below 80%, treat as P1 regression.
