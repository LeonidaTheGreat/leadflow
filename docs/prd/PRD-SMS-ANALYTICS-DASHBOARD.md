# PRD: SMS Analytics Dashboard — Delivery, Reply & Booking Conversion Tracking

**PRD ID:** PRD-SMS-ANALYTICS-DASHBOARD  
**Status:** draft  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-03-08  
**Use Case:** feat-sms-analytics-dashboard  
**Workflow:** product → marketing → design → dev → qc  

---

## 1. Overview

Real estate agents using LeadFlow need visibility into how their AI-driven SMS outreach is actually performing. Without clear metrics on delivery rates, lead reply rates, and appointment booking conversions, agents cannot judge the ROI of the product or identify problems early. This dashboard panel surfaces the three core performance signals every agent cares about.

---

## 2. Problem Statement

**Current state:** LeadFlow sends SMS messages, logs them in Supabase, and books appointments via Cal.com — but the agent-facing dashboard shows no operational SMS performance metrics beyond a raw count.

**Impact:**
- Agents cannot see if messages are failing to deliver (Twilio delivery errors go unnoticed)
- Agents cannot see what percentage of leads are actually replying (reply rate = product health signal)
- Agents cannot attribute bookings to specific SMS campaigns or timeframes
- Without these numbers, agents cannot justify renewal or upgrade to higher tiers

**Who is affected:** All paying agents (Starter, Pro, Team tiers). Critical for Pro/Team retention where unlimited SMS is the core value prop.

---

## 3. Goals & Non-Goals

### Goals
- Display SMS delivery rate, reply rate, and booking conversion rate in the agent dashboard
- Update metrics in near-real-time (on page load / manual refresh)
- Show trend data over configurable time windows (7d, 30d, all-time)
- Keep implementation simple: query existing Supabase tables, no new event tracking infrastructure required for MVP

### Non-Goals (v1)
- Per-lead-source breakdown (Zillow vs Facebook, etc.) — phase 2
- Email / voicemail analytics — out of scope
- Brokerage-level aggregated analytics across multiple agents — phase 2
- Exported CSV/PDF reports — phase 2
- Real-time push updates (websockets) — phase 2

---

## 4. User Stories

### US-1: Delivery Rate
> As a real estate agent, I want to see what percentage of SMS messages I sent were successfully delivered, so I know if there are carrier or compliance issues affecting my outreach.

**Acceptance Criteria:**
- Dashboard shows "Delivery Rate: XX%" prominently
- Denominator = total outbound SMS attempted in the selected time window
- Numerator = SMS with Twilio status `delivered`
- If denominator is 0, show "No messages sent yet" instead of 0%
- Time window selector: 7 days | 30 days | All Time (default: 30 days)

### US-2: Reply Rate
> As a real estate agent, I want to see what percentage of leads replied to my AI-sent SMS, so I know if the messages are resonating and the AI is engaging leads effectively.

**Acceptance Criteria:**
- Dashboard shows "Reply Rate: XX%"
- Denominator = unique leads who received at least one outbound SMS in the time window
- Numerator = unique leads who sent at least one inbound SMS reply
- Excludes opt-out replies (STOP, UNSUBSCRIBE) from both numerator and denominator
- Time window selector shares state with delivery rate selector

### US-3: Booking Conversion Rate
> As a real estate agent, I want to see what percentage of engaged leads converted into booked appointments, so I can measure the true business impact of LeadFlow.

**Acceptance Criteria:**
- Dashboard shows "Booking Conversion: XX%"
- Denominator = unique leads who replied (same set as reply rate numerator)
- Numerator = unique leads who have a Cal.com booking linked in Supabase
- Time window selector shares state with other metrics
- Tooltip clarifies: "Of leads who replied to SMS, % who booked an appointment"

### US-4: Stats Bar Placement
> As a real estate agent, I want the metrics displayed consistently with the rest of the dashboard, so the interface feels cohesive.

**Acceptance Criteria:**
- Metrics appear as cards in the existing stats bar / metrics row
- Consistent visual style with existing stats (leads count, SMS sent, etc.)
- Mobile responsive (stacks to 1-column on small screens)
- Each card shows: metric name, value (%), and a subtle sparkline or up/down trend arrow (optional for v1)

---

## 5. Data Model

All required data already exists in Supabase. No new tables are needed for v1.

### Relevant Tables

| Table | Columns Used | Purpose |
|-------|-------------|---------|
| `sms_messages` | `lead_id`, `direction` (`outbound`/`inbound`), `status` (Twilio status), `created_at`, `agent_id` | Delivery rate + reply rate |
| `leads` | `id`, `agent_id`, `created_at` | Lead scoping |
| `bookings` | `lead_id`, `agent_id`, `created_at`, `status` | Booking conversion |

> **Note for dev:** Confirm exact table/column names in Supabase before implementing. If `sms_messages.status` values differ from Twilio canonical names, map accordingly.

### Computation Logic

```
delivery_rate = 
  COUNT(sms_messages WHERE direction='outbound' AND status='delivered' AND agent_id=X AND created_at >= window_start)
  /
  COUNT(sms_messages WHERE direction='outbound' AND agent_id=X AND created_at >= window_start)

reply_rate =
  COUNT(DISTINCT lead_id WHERE direction='inbound' AND agent_id=X AND created_at >= window_start)
  /
  COUNT(DISTINCT lead_id WHERE direction='outbound' AND agent_id=X AND created_at >= window_start)

booking_conversion =
  COUNT(DISTINCT bookings.lead_id WHERE agent_id=X AND created_at >= window_start)
  /
  COUNT(DISTINCT leads.id WHERE replied=true AND agent_id=X AND created_at >= window_start)
```

### API Endpoint

**New endpoint:** `GET /api/analytics/sms-stats?window=30d`

Response:
```json
{
  "window": "30d",
  "deliveryRate": 0.94,
  "replyRate": 0.31,
  "bookingConversion": 0.18,
  "messagesSent": 142,
  "leadsReplied": 44,
  "bookingsMade": 8
}
```

Authentication: existing session middleware (agent scoped — no agent can see another agent's data).

---

## 6. Design Requirements

- **Placement:** Add 3 new stat cards to the existing stats bar in the agent dashboard
- **Card anatomy:** Label + Percentage value (large, bold) + denominator hint (small text, e.g. "142 messages sent")
- **Time window selector:** Single segmented control above the stats bar (affects all 3 metrics simultaneously)
- **Empty state:** When no data exists for the window, show "—" not "0%" to avoid alarming new agents
- **Color coding:** ≥80% delivery → green; 60–79% → amber; <60% → red. Reply and booking rates: directional only (no red/green thresholds in v1 — needs baseline data first)
- **Loading state:** Skeleton cards while API fetch is in progress

---

## 7. Marketing Considerations

- Delivery rate, reply rate, and booking conversion are the **three metrics agents will screenshot and share** when recommending LeadFlow to colleagues — design for shareability
- These metrics are a **upsell lever**: Pro tier should surface a "compare to plan average" hint, encouraging Starter agents to upgrade
- Use in email nurture: "Your LeadFlow stats this week: 94% delivery, 31% reply rate" — triggered from these same API values

---

## 8. Acceptance Criteria (Definition of Done)

- [ ] `/api/analytics/sms-stats` endpoint returns correct values for authenticated agent
- [ ] Endpoint respects `?window=7d|30d|all` parameter
- [ ] Dashboard stats bar shows Delivery Rate, Reply Rate, Booking Conversion cards
- [ ] Time window selector updates all 3 metrics without page reload
- [ ] Empty state handled (no data → shows "—")
- [ ] No cross-agent data leakage (agent scoped query verified)
- [ ] Mobile responsive layout confirmed (iPhone SE viewport)
- [ ] QC: Stojan can log in, see his own metrics, change the time window, and confirm numbers match raw data in Supabase

---

## 9. Open Questions

1. Does `sms_messages` table exist with a `status` column updated by Twilio webhooks? If Twilio delivery status callbacks are not being stored, we need a prerequisite task to capture them before delivery rate is computable.
2. Does `bookings` table link to `lead_id`? Cal.com webhooks may only store the booking metadata — dev to confirm join-ability.
3. Should this be the first step toward a dedicated "Analytics" tab in the dashboard, or stay as an extension of the existing stats bar?

---

## 10. Dependencies

- Twilio delivery status webhooks must be captured in Supabase (prerequisite — dev to verify)
- Cal.com booking webhook must store `lead_id` (prerequisite — dev to verify)
- Existing agent auth session middleware must be available for the new API endpoint

---

## 11. Success Metrics

- **Adoption:** >80% of active agents view their SMS stats within 30 days of launch
- **Retention signal:** Agents with visible delivery rate >85% renew at higher rates (track correlation)
- **Support reduction:** Zero tickets asking "are my messages being sent?" within 60 days of launch
