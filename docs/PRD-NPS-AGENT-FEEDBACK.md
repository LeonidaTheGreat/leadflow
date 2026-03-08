# PRD: NPS / Feedback Survey Mechanism for Real Estate Agents
**ID:** PRD-NPS-AGENT-FEEDBACK  
**Status:** draft  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-07-17  

---

## 1. Problem Statement

LeadFlow AI has no structured way to measure whether paying real estate agents (customers) are satisfied with the product. We have no NPS score, no feedback loop, and no early-warning signal for churn. Without this:

- We cannot identify agents who are about to cancel.
- We cannot detect product gaps from real users.
- We have no PMF signal beyond anecdote.

**Goal:** Implement a lightweight, automated NPS + open-ended feedback mechanism that gives us a recurring signal from agents on how well LeadFlow is serving them.

---

## 2. Target Users

| Persona | Description |
|---------|-------------|
| **Pilot Agent** | Free-tier agent recruited for pilot. Feedback from this group validates PMF before monetization. |
| **Paying Agent** | Starter / Pro / Team subscriber. Retention signal and upsell opportunity. |

**Not in scope:** Leads (homebuyers/sellers). Lead satisfaction is covered by `feat-lead-satisfaction-feedback`.

---

## 3. User Stories

### US-1: Automated NPS Survey (Email or In-App)
> As a real estate agent, I receive an NPS survey 14 days after signup and every 90 days thereafter, so LeadFlow can understand my satisfaction without me having to seek out a feedback channel.

**Acceptance Criteria:**
- Triggered automatically at T+14 days (first survey) and T+90 days intervals.
- Survey contains: "How likely are you to recommend LeadFlow AI to another agent?" (0–10 scale).
- Optional follow-up open field: "What's the #1 thing we could improve?"
- Survey works via email (primary) and as an in-app prompt (secondary, shown on next dashboard login after trigger fires).
- Agent can dismiss the in-app prompt; dismissal is recorded and prompt does not re-appear for 30 days.
- Response stored in `agent_nps_responses` table.

### US-2: Agent Can Submit Feedback Any Time
> As a real estate agent using the dashboard, I can submit feedback at any time via a persistent "Give Feedback" button, so I have an outlet when something is working or broken.

**Acceptance Criteria:**
- Persistent "Give Feedback" button in dashboard (footer or sidebar, low-prominence).
- Opens a simple form: type (👍 Works great / 🐛 Bug / 💡 Idea / 😤 Frustration) + text field (max 500 chars).
- Submission stored in `product_feedback` table (`source: 'agent_self_report'`).
- Confirmation message displayed after submit: "Thanks! We read every submission."
- No login re-prompt required (agent is already authenticated).

### US-3: Admin / PM Dashboard — NPS Trend View
> As the Product Manager (Stojan), I can see aggregate NPS scores, individual responses, and trend over time in the admin panel, so I know the product health without querying Supabase manually.

**Acceptance Criteria:**
- Admin panel (authenticated, `/admin` route) shows:
  - Current NPS score (calculated: % Promoters − % Detractors).
  - Response count this period vs. prior period.
  - Breakdown: Promoters (9–10) / Passives (7–8) / Detractors (0–6).
  - List of recent open-ended responses (most recent 20).
- NPS is calculated from responses in the last 90 days.
- Data sourced from `agent_nps_responses` table.

### US-4: Churn Risk Detection
> As the LeadFlow system, I flag agents who give a score of 0–6 (Detractor) so the PM is alerted and can follow up personally within 48 hours.

**Acceptance Criteria:**
- When an agent submits NPS score 0–6, a record is inserted into `product_feedback` table with `feedback_type: 'churn_risk'`.
- Orchestrator heartbeat picks up unprocessed churn_risk entries and creates a PM task to review.
- No automated email sent to the detractor (PM handles manually).

---

## 4. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | `agent_nps_responses` table: `id`, `agent_id`, `score` (0–10), `open_text` (nullable), `survey_trigger` (enum: `auto_14d`, `auto_90d`, `manual`), `created_at`, `responded_via` (email/in_app) |
| FR-2 | NPS survey email sent via Resend (same integration as password reset). Template: plain text, short, no HTML flourishes. |
| FR-3 | Survey link contains a signed JWT token (agent_id + expiry 7 days). Token validated server-side on response submission; no login required. |
| FR-4 | In-app prompt shown on dashboard login if trigger has fired and no response submitted within 7 days. |
| FR-5 | Open-ended feedback stored in `product_feedback` (`source: 'agent_self_report'`). |
| FR-6 | Admin NPS view at `/admin/nps` (server-rendered or client fetch, behind admin auth). |
| FR-7 | Churn risk entries auto-inserted into `product_feedback` when score ≤ 6. |
| FR-8 | Survey scheduling tracked in `agent_survey_schedule` table: `agent_id`, `next_survey_at`, `last_survey_at`, `survey_count`. |

---

## 5. Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Survey email delivered within 5 minutes of trigger time. |
| NFR-2 | Survey token validation must not allow replay (one response per token). |
| NFR-3 | All submissions persist even if admin view is down. |
| NFR-4 | In-app prompt must not block any core workflow (dismissible, overlay only). |
| NFR-5 | No PII stored beyond what already exists on the agent record. |

---

## 6. Data Model

### `agent_nps_responses`
```sql
CREATE TABLE agent_nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  open_text TEXT,
  survey_trigger TEXT NOT NULL, -- 'auto_14d' | 'auto_90d' | 'manual'
  responded_via TEXT NOT NULL,  -- 'email' | 'in_app'
  token_hash TEXT UNIQUE,       -- hash of JWT used (prevents replay)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `agent_survey_schedule`
```sql
CREATE TABLE agent_survey_schedule (
  agent_id UUID PRIMARY KEY REFERENCES agents(id),
  next_survey_at TIMESTAMPTZ NOT NULL,
  last_survey_at TIMESTAMPTZ,
  survey_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Out of Scope (v1)

- SMS-based NPS (email + in-app sufficient for v1).
- Per-feature micro-surveys.
- Automated response email to agents.
- NPS benchmarking or external integrations (Delighted, Typeform, etc.).
- A/B testing survey timing.

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Survey response rate | ≥ 40% within 7 days of send |
| NPS score (pilot phase) | ≥ 30 (good for early SaaS) |
| Churn risk response time | PM reviews detractor within 48h |
| Feedback submissions (any time) | ≥ 2 per agent per month |

---

## 9. Workflow

```
product → marketing → design → dev → qc
```

- **Product (this PRD):** Requirements, data model, acceptance criteria.
- **Marketing:** Survey email copy, subject line, tone guidelines.
- **Design:** In-app prompt UI, feedback button placement, admin NPS view wireframe.
- **Dev:** DB migrations, API routes, email trigger, JWT token logic, admin view.
- **QC:** E2E tests covering all acceptance criteria.

---

## 10. Definition of Done

A feature is complete when Stojan can:
1. Log into the dashboard, see the feedback button, submit feedback, and receive a confirmation.
2. View the `/admin/nps` page and see NPS score + responses.
3. Receive (and open) an NPS survey email within the configured window after signup.
4. Submit a score via the email link without logging in.
5. Observe that a detractor score (≤6) appears in the task pipeline within one heartbeat.
