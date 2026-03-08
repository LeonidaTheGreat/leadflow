# PRD: Lead Satisfaction Feedback Collection

**PRD ID:** PRD-LEAD-SATISFACTION-FEEDBACK  
**Status:** draft  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-03-06  
**UC:** feat-lead-satisfaction-feedback  

---

## 1. Problem Statement

LeadFlow AI sends AI-generated SMS responses to real estate leads on behalf of agents. We have no signal indicating whether leads find these messages helpful or annoying. Without this signal:
- We cannot validate PMF (leads could be opting out silently)
- Agents cannot tune AI behavior for their market
- We cannot improve the AI prompt strategy with real data
- Churn risk is invisible until an agent cancels

**Goal:** Collect lightweight satisfaction signals from leads after AI SMS interactions to determine if the AI is serving them well or creating friction.

---

## 2. Success Metrics

| Metric | Target |
|--------|--------|
| Response rate on satisfaction ping | ≥ 20% |
| % leads rating interaction as helpful | ≥ 70% |
| Opt-out rate after AI SMS exchange | ≤ 5% |
| Agent dashboard adoption (views satisfaction data) | ≥ 80% of active agents |

---

## 3. User Stories

### US-1: Lead Receives Satisfaction Check-In
**As a lead,** after an AI SMS exchange, I want to optionally rate my experience so that future interactions improve.

**Acceptance Criteria:**
- After a complete AI conversation exchange (≥2 messages), a brief check-in SMS is sent: e.g., "Was this helpful? Reply YES or NO."
- The check-in fires no more than once per conversation thread
- The check-in is not sent if lead has already opted out (STOP)
- The check-in respects a minimum 10-minute cooldown after the last AI message

### US-2: Lead Reply is Captured
**As the system,** when a lead replies to a satisfaction check-in, their response is logged and classified.

**Acceptance Criteria:**
- Replies of YES / HELPFUL / GOOD / GREAT / THANKS are classified as `positive`
- Replies of NO / STOP / BAD / ANNOYING / QUIT are classified as `negative`
- Replies of NEUTRAL / OK / FINE / MEH are classified as `neutral`
- Unrecognized replies are classified as `unclassified`
- Each satisfaction event is stored in `lead_satisfaction_events` table with: `lead_id`, `agent_id`, `conversation_id`, `rating` (positive|negative|neutral|unclassified), `raw_reply`, `created_at`
- STOP replies additionally trigger opt-out (existing flow)

### US-3: Agent Sees Satisfaction Metrics in Dashboard
**As a real estate agent,** I want to see how my leads are responding to AI SMS so I can understand if it's working.

**Acceptance Criteria:**
- Dashboard shows a "Lead Satisfaction" card with:
  - Total satisfaction responses (last 30 days)
  - % positive, % negative, % neutral
  - Trend indicator (improving / declining / stable vs. prior 30 days)
- Clicking the card shows a list of individual satisfaction events
- Card is visible only when ≥5 satisfaction responses have been collected (to avoid noise)
- Data refreshes on dashboard load

### US-4: Agent Can Disable Satisfaction Pings
**As a real estate agent,** I want to opt out of satisfaction pings for my leads if I feel it creates friction in my market.

**Acceptance Criteria:**
- Agent settings page has a toggle: "Send satisfaction check-in after AI conversations" (default: ON)
- When OFF, no satisfaction SMS is sent for that agent's leads
- Setting is persisted in the `agents` table as `satisfaction_ping_enabled` (boolean, default true)

### US-5: Product Team Sees Aggregate Satisfaction Data
**As the product team,** I want an aggregate view of lead satisfaction across all agents to measure AI quality.

**Acceptance Criteria:**
- Supabase `lead_satisfaction_events` table is queryable with standard service-role key
- A summary view `satisfaction_summary` (or query pattern in docs) shows per-agent and overall satisfaction rates
- Aggregate data is not exposed in the agent-facing dashboard (each agent sees only their own data)

---

## 4. Technical Requirements

### 4.1 New Database Table: `lead_satisfaction_events`

```sql
CREATE TABLE lead_satisfaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id),
  conversation_id TEXT,
  satisfaction_ping_sent_at TIMESTAMPTZ,
  raw_reply TEXT,
  rating TEXT CHECK (rating IN ('positive','negative','neutral','unclassified')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON lead_satisfaction_events(agent_id);
CREATE INDEX ON lead_satisfaction_events(created_at);
```

### 4.2 Agent Settings Field

Add `satisfaction_ping_enabled BOOLEAN DEFAULT TRUE` to the `agents` table.

### 4.3 SMS Trigger Logic (in existing SMS handler)

After an AI conversation exchange is complete:
1. Check `agent.satisfaction_ping_enabled` — if false, skip
2. Check if a satisfaction ping was already sent for this conversation — if yes, skip
3. Check cooldown: last AI message < 10 minutes ago — if so, wait
4. Send satisfaction ping SMS (using Twilio, same provider as main SMS)
5. Log sent timestamp in `lead_satisfaction_events` with `rating = null`

### 4.4 Inbound Reply Classification (in existing SMS inbound handler)

When an inbound SMS arrives and matches a lead with a pending satisfaction ping:
1. Classify the reply using keyword matching (see US-2)
2. Update the `lead_satisfaction_events` row with `raw_reply` and `rating`
3. If rating is negative and reply is STOP — trigger existing opt-out flow

### 4.5 Dashboard Widget

New React component `<LeadSatisfactionCard />` in agent dashboard:
- Queries `lead_satisfaction_events` filtered by `agent_id`
- Shows counts and percentages
- Conditionally renders only when ≥5 events exist

---

## 5. Satisfaction Ping Message Template

```
Was this conversation helpful? Reply YES or NO — it helps us improve. (Reply STOP anytime to unsubscribe)
```

This message:
- Is short (< 160 chars)
- Includes opt-out reminder (TCPA compliance)
- Is clearly optional in tone
- Does not impersonate the agent

---

## 6. Out of Scope (v1)

- NPS scores (1-10 scale) — too much friction for SMS
- Email satisfaction surveys — different channel
- AI-inferred sentiment from conversation history — phase 2 enhancement
- Lead satisfaction data in FUB — can be added later via note/tag
- Multi-language support — English only for v1

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Leads annoyed by extra SMS | Default cooldown; agent toggle to disable |
| Low response rate | Expected; even 20% provides useful signal |
| STOP mis-classified as satisfaction negative | Classification logic checks STOP first, routes to opt-out, not satisfaction |
| Compliance (TCPA/A2P) | Message includes opt-out instruction; sent on same A2P registered number |

---

## 8. Workflow

**product → marketing → design → dev → qc**

- **Product (this PRD):** Spec complete ✅
- **Marketing:** Review messaging template, ensure compliance language is appropriate
- **Design:** Design `<LeadSatisfactionCard />` widget and agent settings toggle UI
- **Dev:** Implement DB schema, SMS trigger logic, classification, dashboard widget
- **QC:** End-to-end test all 5 user stories

---

## 9. Definition of Done

- [ ] `lead_satisfaction_events` table created in Supabase
- [ ] `satisfaction_ping_enabled` column added to `agents` table
- [ ] Satisfaction ping SMS sent after AI conversations (when enabled)
- [ ] Inbound reply classification working and stored
- [ ] Dashboard widget shows satisfaction data (when ≥5 events)
- [ ] Agent settings toggle works
- [ ] All E2E test specs pass
- [ ] Deployed to production (Vercel + webhook)

