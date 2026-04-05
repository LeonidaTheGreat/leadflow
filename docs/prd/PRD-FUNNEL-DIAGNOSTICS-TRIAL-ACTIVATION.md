# PRD: Funnel Diagnostics — Trial Activation Analysis

**PRD ID:** prd-funnel-diagnostics-trial-activation  
**Status:** Draft  
**Version:** 1.0  
**Created:** 2026-04-05  
**Owner:** PM Agent  
**Use Case:** uc-revenue-funnel-diagnostics  
**Priority:** P1  
**Parent PRD:** PRD-REVENUE-RECOVERY-SPRINT.md

---

## Overview

LeadFlow is in pilot phase with 0 paying customers. To convert trial agents to paid, we need visibility into which trial agents are actually using the product. Without this, outreach is untargeted — we don't know who to nudge, who to help, or who has already activated.

This feature is a diagnostics endpoint + dashboard widget that segments all trial agents by activation state. It answers: "Of our trial agents, who is active, who onboarded but stalled, and who never started?"

This is a **read-only diagnostic tool** — no writes, no mutations. It surfaces existing data from `real_estate_agents`, `leads`, `sms_messages`, and `agent_integrations`.

---

## Problem

At Day 43 of 90, we have pilot agents in the system but no structured visibility into their activation states. The revenue recovery sprint (PRD-REVENUE-RECOVERY-SPRINT.md) identified pilot recruitment as P0, but even recruited pilots may stall at activation. Without a diagnostic view, we cannot:

- Identify agents who connected FUB but never received a lead response (Onboarded, stalled)
- Identify agents who have never taken any action (Never-activated, at risk of churning before paying)
- Track active agents to understand what's working and use them as conversion references

---

## Activation Segments

### Segment Definitions

| Segment | Definition |
|---------|-----------|
| **Active** | Agent has FUB API key set in `agent_integrations` AND has at least 1 lead created in last 7 days AND has at least 1 outbound SMS sent in last 7 days |
| **Onboarded** | Agent has FUB API key set in `agent_integrations` BUT does NOT meet Active criteria (no recent lead+SMS activity within 7 days) |
| **Never-activated** | Agent has NO FUB API key in `agent_integrations` (or no row in `agent_integrations` at all) |

**Notes on segment logic:**
- "Trial agent" = a `real_estate_agents` row where `trial_ends_at IS NOT NULL` and `subscription_status` is not `'active'` (i.e., still on trial, not converted to paid)
- FUB connection is the primary activation signal because it is the prerequisite for AI lead response to function
- 7-day recency window for Active reflects meaningful ongoing usage, not a one-time test
- Segments are mutually exclusive: Active takes priority over Onboarded (if both FUB + recent activity, it's Active, not Onboarded)

### Data Sources

The query joins the following tables:

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `real_estate_agents` | Trial agent roster | `id`, `email`, `first_name`, `last_name`, `trial_ends_at`, `subscription_status`, `onboarding_completed`, `created_at` |
| `agent_integrations` | FUB connection status | `agent_id`, `follow_up_boss_api_key`, `updated_at` |
| `leads` | Lead capture activity | `agent_id`, `created_at` |
| `sms_messages` | SMS send activity | `lead_id`, `direction`, `created_at` (joined via `leads` to get `agent_id`) |

**Note:** There is no `fub_contacts` table in the current schema. FUB connection is determined by the presence of a non-null `follow_up_boss_api_key` in `agent_integrations`. The `v_trial_eligible_agents` view provides a convenience starting point for the trial agent population.

---

## API Specification

### Endpoint

```
GET /api/admin/funnel/trial-activation
```

**Auth:** Admin-only. Requires `LEADFLOW_API_KEY` in `Authorization: Bearer <key>` header (same auth pattern used by other admin endpoints).

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `window_days` | integer | 7 | Recency window in days for Active segment detection |

### Response Shape

```json
{
  "summary": {
    "total_trial_agents": 12,
    "active": 3,
    "onboarded": 4,
    "never_activated": 5,
    "as_of": "2026-04-05T14:32:00.000Z"
  },
  "segments": {
    "active": [
      {
        "agent_id": "uuid",
        "email": "agent@example.com",
        "first_name": "Jane",
        "last_name": "Doe",
        "trial_ends_at": "2026-04-12T00:00:00.000Z",
        "days_remaining": 7,
        "fub_connected_at": "2026-03-30T10:15:00.000Z",
        "leads_last_7d": 4,
        "sms_sent_last_7d": 6,
        "last_activity_at": "2026-04-04T18:22:00.000Z"
      }
    ],
    "onboarded": [
      {
        "agent_id": "uuid",
        "email": "agent2@example.com",
        "first_name": "John",
        "last_name": "Smith",
        "trial_ends_at": "2026-04-10T00:00:00.000Z",
        "days_remaining": 5,
        "fub_connected_at": "2026-03-28T09:00:00.000Z",
        "leads_last_7d": 0,
        "sms_sent_last_7d": 0,
        "last_activity_at": "2026-03-29T14:00:00.000Z"
      }
    ],
    "never_activated": [
      {
        "agent_id": "uuid",
        "email": "agent3@example.com",
        "first_name": "Alice",
        "last_name": "Jones",
        "trial_ends_at": "2026-04-08T00:00:00.000Z",
        "days_remaining": 3,
        "fub_connected_at": null,
        "leads_last_7d": 0,
        "sms_sent_last_7d": 0,
        "last_activity_at": null
      }
    ]
  }
}
```

### Core SQL Query

The underlying query the endpoint executes:

```sql
WITH trial_agents AS (
  SELECT
    ra.id              AS agent_id,
    ra.email,
    ra.first_name,
    ra.last_name,
    ra.trial_ends_at,
    ra.created_at      AS trial_started_at,
    EXTRACT(DAY FROM (ra.trial_ends_at - NOW()))::integer AS days_remaining
  FROM real_estate_agents ra
  WHERE ra.trial_ends_at IS NOT NULL
    AND (ra.subscription_status IS NULL OR ra.subscription_status NOT IN ('active', 'canceled'))
),
fub_status AS (
  SELECT
    agent_id,
    follow_up_boss_api_key IS NOT NULL AND follow_up_boss_api_key != '' AS fub_connected,
    updated_at AS fub_connected_at
  FROM agent_integrations
),
lead_activity AS (
  SELECT
    agent_id,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS leads_last_7d,
    MAX(created_at) AS last_lead_at
  FROM leads
  GROUP BY agent_id
),
sms_activity AS (
  SELECT
    l.agent_id,
    COUNT(*) FILTER (WHERE sm.created_at >= NOW() - INTERVAL '7 days' AND sm.direction = 'outbound') AS sms_sent_last_7d,
    MAX(sm.created_at) AS last_sms_at
  FROM sms_messages sm
  JOIN leads l ON sm.lead_id = l.id
  WHERE sm.direction = 'outbound'
  GROUP BY l.agent_id
)
SELECT
  ta.agent_id,
  ta.email,
  ta.first_name,
  ta.last_name,
  ta.trial_ends_at,
  ta.days_remaining,
  ta.trial_started_at,
  COALESCE(fs.fub_connected, false)   AS fub_connected,
  fs.fub_connected_at,
  COALESCE(la.leads_last_7d, 0)       AS leads_last_7d,
  COALESCE(sa.sms_sent_last_7d, 0)    AS sms_sent_last_7d,
  GREATEST(la.last_lead_at, sa.last_sms_at) AS last_activity_at,
  CASE
    WHEN COALESCE(fs.fub_connected, false)
         AND COALESCE(la.leads_last_7d, 0) > 0
         AND COALESCE(sa.sms_sent_last_7d, 0) > 0
    THEN 'active'
    WHEN COALESCE(fs.fub_connected, false)
    THEN 'onboarded'
    ELSE 'never_activated'
  END AS activation_segment
FROM trial_agents ta
LEFT JOIN fub_status fs        ON fs.agent_id = ta.agent_id
LEFT JOIN lead_activity la     ON la.agent_id = ta.agent_id
LEFT JOIN sms_activity sa      ON sa.agent_id = ta.agent_id
ORDER BY ta.trial_ends_at ASC;
```

The endpoint groups results by `activation_segment` and builds the response shape above.

---

## Dashboard Widget Specification

### Widget Location

Admin section of the internal dashboard (same admin area as the pilot recruitment dashboard). Route: `/admin/funnel` or a tab on the existing admin overview.

### Widget Layout

Three columns, one per segment:

```
[ Active (N) ]     [ Onboarded (N) ]     [ Never-Activated (N) ]
-----------------  ------------------    ----------------------
Jane Doe           John Smith            Alice Jones
Trial ends: 7d     Trial ends: 5d        Trial ends: 3d
Last active: 1d ago Last active: 6d ago  Last active: never
[Send email] [Flag] [Send email] [Flag]  [Send email] [Flag]
```

### Widget Columns Detail

Each agent card shows:
- Agent full name + email
- Trial expiry countdown (days remaining, color-coded: green >7d, yellow 3-7d, red <3d)
- Last activity date (formatted as relative: "2 days ago", "never")
- For Active: leads captured + SMS sent in last 7 days
- For Onboarded: FUB connected date, days since last activity
- For Never-activated: days since trial started (urgency signal)

### Action Buttons

Each agent card has two action buttons:

| Button | Action |
|--------|--------|
| **Send Activation Email** | Triggers a POST to `/api/admin/agents/:id/send-activation-email`. The email content matches the agent's activation state (Active = congratulations, Onboarded = re-engagement, Never-activated = setup guide). This is a future implementation detail — the button exists in the spec now. |
| **Flag for Manual Outreach** | Sets a flag on the agent record (future: `real_estate_agents.manual_outreach_flagged = true`). Creates a visible indicator so Stojan knows which agents need a personal call. |

**Note:** The actual email sending and outreach flagging logic are out of scope for this PRD. This PRD specifies the diagnostic view and button surfaces only. The actions are placeholders for a future implementation task.

---

## Acceptance Criteria

All criteria are machine-verifiable via SQL or HTTP assertions.

### AC-1: API returns correct structure
```
GET /api/admin/funnel/trial-activation
→ HTTP 200
→ response.summary.total_trial_agents >= 0
→ response.summary.active + response.summary.onboarded + response.summary.never_activated === response.summary.total_trial_agents
→ response.segments has keys: active, onboarded, never_activated
→ each segment is an array
```

### AC-2: Segment counts are exhaustive
```sql
-- All trial agents appear in exactly one segment
SELECT COUNT(*) FROM real_estate_agents
WHERE trial_ends_at IS NOT NULL
  AND (subscription_status IS NULL OR subscription_status NOT IN ('active', 'canceled'))
-- Must equal: response.summary.total_trial_agents
```

### AC-3: Active segment classification is correct
```sql
-- An agent with FUB key + leads + outbound SMS in last 7 days must appear in Active
SELECT ra.id
FROM real_estate_agents ra
JOIN agent_integrations ai ON ai.agent_id = ra.id
WHERE ai.follow_up_boss_api_key IS NOT NULL AND ai.follow_up_boss_api_key != ''
  AND ra.trial_ends_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM leads l WHERE l.agent_id = ra.id AND l.created_at >= NOW() - INTERVAL '7 days')
  AND EXISTS (
    SELECT 1 FROM sms_messages sm
    JOIN leads l ON sm.lead_id = l.id
    WHERE l.agent_id = ra.id AND sm.direction = 'outbound' AND sm.created_at >= NOW() - INTERVAL '7 days'
  )
-- All rows returned here must be in response.segments.active
```

### AC-4: Onboarded segment classification is correct
```sql
-- An agent with FUB key but no leads or no SMS in last 7 days must appear in Onboarded (not Active, not Never-activated)
SELECT ra.id
FROM real_estate_agents ra
JOIN agent_integrations ai ON ai.agent_id = ra.id
WHERE ai.follow_up_boss_api_key IS NOT NULL AND ai.follow_up_boss_api_key != ''
  AND ra.trial_ends_at IS NOT NULL
  AND NOT (
    EXISTS (SELECT 1 FROM leads l WHERE l.agent_id = ra.id AND l.created_at >= NOW() - INTERVAL '7 days')
    AND EXISTS (
      SELECT 1 FROM sms_messages sm
      JOIN leads l ON sm.lead_id = l.id
      WHERE l.agent_id = ra.id AND sm.direction = 'outbound' AND sm.created_at >= NOW() - INTERVAL '7 days'
    )
  )
-- All rows returned here must be in response.segments.onboarded
```

### AC-5: Never-activated segment classification is correct
```sql
-- An agent with no agent_integrations row or null/empty FUB key must appear in Never-activated
SELECT ra.id
FROM real_estate_agents ra
LEFT JOIN agent_integrations ai ON ai.agent_id = ra.id
WHERE ra.trial_ends_at IS NOT NULL
  AND (ai.agent_id IS NULL OR ai.follow_up_boss_api_key IS NULL OR ai.follow_up_boss_api_key = '')
-- All rows returned here must be in response.segments.never_activated
```

### AC-6: Response is fast
```
GET /api/admin/funnel/trial-activation
→ response time < 2000ms
```

### AC-7: Auth is enforced
```
GET /api/admin/funnel/trial-activation (no Authorization header)
→ HTTP 401

GET /api/admin/funnel/trial-activation (wrong key)
→ HTTP 401
```

---

## E2E Test Specifications

Five test scenarios to be implemented in `tests/e2e/trial-activation-diagnostics.test.js`:

### Test 1: API returns 200 with correct response structure
- **Setup:** No special seed data needed (test against current DB state)
- **Action:** `GET /api/admin/funnel/trial-activation` with valid API key
- **Assert:**
  - HTTP status 200
  - `response.summary` has keys: `total_trial_agents`, `active`, `onboarded`, `never_activated`, `as_of`
  - `response.segments` has keys: `active`, `onboarded`, `never_activated`
  - All three segment arrays exist (may be empty)
  - `summary.active + summary.onboarded + summary.never_activated === summary.total_trial_agents`

### Test 2: Segment counts sum to total trial agent count
- **Setup:** Query DB for trial agent count directly
- **Action:** `GET /api/admin/funnel/trial-activation`
- **Assert:**
  - DB trial agent count equals `response.summary.total_trial_agents`
  - `response.segments.active.length + response.segments.onboarded.length + response.segments.never_activated.length === response.summary.total_trial_agents`

### Test 3: Agent with FUB + recent leads + recent SMS appears in Active segment
- **Setup:** Create a test `real_estate_agents` row with `trial_ends_at = NOW() + 7 days`, an `agent_integrations` row with a non-null `follow_up_boss_api_key`, a `leads` row with `created_at = NOW() - 1 day`, and an outbound `sms_messages` row linked to that lead with `created_at = NOW() - 1 day`
- **Action:** `GET /api/admin/funnel/trial-activation`
- **Assert:** The test agent's `agent_id` appears in `response.segments.active`; does NOT appear in `onboarded` or `never_activated`
- **Teardown:** Delete test rows

### Test 4: Agent with FUB connected but no recent SMS appears in Onboarded segment
- **Setup:** Create a test `real_estate_agents` row with `trial_ends_at = NOW() + 7 days` and an `agent_integrations` row with a non-null `follow_up_boss_api_key`, but no `leads` or `sms_messages` rows within the last 7 days
- **Action:** `GET /api/admin/funnel/trial-activation`
- **Assert:** The test agent's `agent_id` appears in `response.segments.onboarded`; does NOT appear in `active` or `never_activated`
- **Teardown:** Delete test rows

### Test 5: Agent with no FUB integration appears in Never-activated segment
- **Setup:** Create a test `real_estate_agents` row with `trial_ends_at = NOW() + 7 days` and NO corresponding row in `agent_integrations`
- **Action:** `GET /api/admin/funnel/trial-activation`
- **Assert:** The test agent's `agent_id` appears in `response.segments.never_activated`; does NOT appear in `active` or `onboarded`
- **Teardown:** Delete test rows

---

## Out of Scope

The following are explicitly NOT part of this PRD:

- Sending activation emails (button surface is specced, not the email logic)
- Manual outreach flagging implementation (button surface is specced, not the flag storage)
- Automated outreach scheduling
- Historical segment tracking (snapshots over time)
- SMS reply rate analysis
- Lead quality scoring
- Any writes or mutations to agent data

---

## Implementation Notes for Dev Agent

When this PRD is handed off for implementation:

1. **Route file:** Create `routes/admin/funnel-diagnostics.js` — follow the pattern in existing `routes/admin/` files for auth middleware
2. **Auth:** Use the same `LEADFLOW_API_KEY` bearer token check as other admin endpoints
3. **SQL parameterization:** The `window_days` query param should be parameterized in the SQL (`INTERVAL $1 days`), not string-interpolated
4. **Null safety:** `agent_integrations` rows may not exist for all agents — all joins must be LEFT JOINs
5. **Performance:** For pilot scale (< 50 agents), a single SQL query is sufficient. No caching needed.
6. **Test file:** `tests/e2e/trial-activation-diagnostics.test.js` — use the existing test helpers pattern from other e2e tests

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Endpoint responds in < 2s | Yes |
| All 5 E2E tests pass | Yes |
| Segment counts match direct SQL verification | Yes |
| Stojan can identify which trial agents to call within 30 seconds | Yes |
