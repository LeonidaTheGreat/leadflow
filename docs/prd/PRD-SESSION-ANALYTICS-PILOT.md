# PRD: Session Analytics for Agent Dashboard — Pilot Usage Tracking

**PRD ID:** PRD-SESSION-ANALYTICS-PILOT  
**Status:** draft  
**Version:** 1.0  
**Author:** Product Manager  
**Created:** 2026-03-10  
**Priority:** Medium  
**Workflow:** product → marketing → design → dev → qc

---

## 1. Problem Statement

We have pilot agents signed up but no visibility into whether they are actually logging in and using the product. Without session-level tracking, we cannot:

- Identify disengaged pilot agents before they churn
- Understand which dashboard features pilots are using (or ignoring)
- Correlate product usage to business outcomes (leads responded, bookings made)
- Make data-driven decisions on which features to prioritise for $20K MRR

We need a lightweight session analytics layer that lets Stojan (and the PM) see, at a glance, whether each pilot agent has logged in recently and which parts of the dashboard they are using.

---

## 2. Goals

| Goal | Metric | Target |
|------|--------|--------|
| Know pilot engagement | % pilots with ≥1 session in last 7 days | 100% (all pilots active) |
| Identify at-risk pilots | Days since last login visible per agent | Immediate alert if >3 days |
| Understand feature usage | Top 3 features accessed per pilot | Available within 14 days of pilot start |
| Reduce churn risk | Proactive outreach triggered | Within 24h of inactivity |

---

## 3. Scope

### In Scope
- Server-side session event logging (login, logout, page/feature visited)
- Internal admin view showing per-pilot usage metrics
- Inactivity alert: flag pilots who haven't logged in for >72 hours
- Basic feature usage counts per pilot (which dashboard pages visited)

### Out of Scope
- Client-side JavaScript event tracking (GA4, Mixpanel) — covered by separate UC
- Public-facing analytics shown to the agent themselves (future)
- Heatmaps or detailed click tracking
- Revenue attribution analytics

---

## 4. User Stories

### US-1 — Stojan wants a usage overview
> As Stojan, I want to see a table of all pilot agents with their last login date and total sessions this week, so I can identify who is disengaged and reach out proactively.

**Acceptance Criteria:**
- An internal page (or Telegram-posted report) shows: agent name, email, last login timestamp, sessions (7d), and most-visited feature
- Data is no more than 5 minutes stale
- Pilot agents with 0 logins in last 72h are highlighted

### US-2 — System auto-logs sessions
> As the system, when a pilot agent logs in to the dashboard, I record the session start event in Supabase with agent_id, timestamp, and IP/user-agent.

**Acceptance Criteria:**
- `agent_sessions` table row is created on successful authentication
- Row includes: `id`, `agent_id`, `session_start`, `session_end` (nullable), `ip_address`, `user_agent`, `last_active_at`
- Session end is updated on logout or after 30 min of inactivity (timeout)

### US-3 — Feature page visits are tracked
> As the system, when a logged-in pilot navigates to a dashboard section (Overview, SMS Conversations, Settings, Billing), I record the page visit against their current session.

**Acceptance Criteria:**
- `agent_page_views` table row created per navigation event
- Row includes: `id`, `agent_id`, `session_id`, `page`, `visited_at`
- Pages tracked: `/dashboard`, `/dashboard/conversations`, `/dashboard/settings`, `/dashboard/billing`

### US-4 — Inactivity alert
> As the PM/Stojan, when a pilot agent hasn't had any session activity in 72 hours, I receive a Telegram notification so I can follow up.

**Acceptance Criteria:**
- Heartbeat (or cron job) checks `agent_sessions.last_active_at` for each pilot
- If `now() - last_active_at > 72h`, a Telegram message is sent to the LeadFlow channel
- Alert format: "⚠️ [Agent Name] hasn't logged in for [X] days. Last seen: [date]."
- Alert fires at most once per 24h per agent (de-duplication)

---

## 5. Functional Requirements

### FR-1: Session Logging Middleware
The authentication success path in the dashboard API must call a `logSessionStart(agentId, req)` utility that:
1. Inserts a row into `agent_sessions` with `session_start = now()`, `last_active_at = now()`
2. Returns a `session_id` stored in the user's auth context (JWT claim or server-side cookie)

### FR-2: Session Heartbeat
Any authenticated API call or page load must call `touchSession(sessionId)` which:
1. Updates `agent_sessions.last_active_at = now()`
2. Is rate-limited to at most 1 DB write per 60 seconds per session

### FR-3: Page View Logging
Middleware on authenticated dashboard routes must log a `agent_page_views` row after each page navigation (not per-API-call).

### FR-4: Internal Analytics Endpoint
`GET /api/internal/pilot-usage` (service_role key required) returns:
```json
{
  "pilots": [
    {
      "agentId": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "lastLogin": "2026-03-09T14:23:00Z",
      "sessionsLast7d": 5,
      "topPage": "/dashboard/conversations",
      "inactiveHours": 18
    }
  ],
  "generatedAt": "2026-03-10T08:00:00Z"
}
```

### FR-5: Inactivity Alerting
A cron task (or heartbeat integration) runs every 30 minutes and:
1. Queries pilots with `last_active_at < now() - interval '72 hours'`
2. Checks `inactivity_alerts` table for sent alert within last 24h
3. If no recent alert, sends Telegram message and inserts into `inactivity_alerts`

---

## 6. Data Model

### Table: `agent_sessions`
```sql
CREATE TABLE agent_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      UUID NOT NULL REFERENCES agents(id),
  session_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_end   TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX idx_agent_sessions_last_active ON agent_sessions(last_active_at);
```

### Table: `agent_page_views`
```sql
CREATE TABLE agent_page_views (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES agents(id),
  session_id  UUID NOT NULL REFERENCES agent_sessions(id),
  page        TEXT NOT NULL,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_page_views_agent_session ON agent_page_views(agent_id, session_id);
```

### Table: `inactivity_alerts`
```sql
CREATE TABLE inactivity_alerts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL REFERENCES agents(id),
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  channel    TEXT NOT NULL DEFAULT 'telegram'
);

CREATE INDEX idx_inactivity_alerts_agent ON inactivity_alerts(agent_id, alerted_at);
```

---

## 7. Non-Functional Requirements

| NFR | Requirement |
|-----|-------------|
| Performance | `touchSession()` must not add >10ms to any API response |
| Privacy | IP addresses stored only if GDPR consent captured (or anonymise after 30 days) |
| Retention | Session data retained for 90 days, then auto-purged |
| Security | `/api/internal/pilot-usage` requires `SUPABASE_SERVICE_ROLE_KEY` bearer token |
| Reliability | If session logging fails, it must fail silently (not break login) |

---

## 8. Acceptance Criteria (Summary)

- [ ] `agent_sessions` table exists and is populated on each pilot login
- [ ] `agent_page_views` table tracks dashboard navigation per session
- [ ] `GET /api/internal/pilot-usage` returns current engagement data for all pilots
- [ ] Pilots with >72h inactivity trigger a Telegram alert (max once/24h)
- [ ] Session logging failures do not break the authentication flow
- [ ] All tables have RLS disabled for service role, enabled for anon/authenticated

---

## 9. Open Questions

1. **Session timeout duration:** 30 min idle = session end? Or keep alive as long as tab is open?  
   → Default: 30 min of no `touchSession` calls = soft end (don't update `session_end`, just stop extending `last_active_at`)

2. **Is the internal analytics endpoint enough, or does Stojan want a UI?**  
   → Start with endpoint + Telegram report. Design agent can add a UI card if needed in a follow-up.

3. **Should agents themselves see their own session history?**  
   → Out of scope v1. Can expose via "My Activity" page later.

---

## 10. Definition of Done

- [ ] Migrations applied in Supabase (schema live)
- [ ] Middleware integrated into auth flow without regressions
- [ ] `/api/internal/pilot-usage` endpoint returns correct data
- [ ] Inactivity alert fires correctly (tested with manual time override)
- [ ] QC agent validates all acceptance criteria with real session data
- [ ] No existing dashboard or auth tests broken
