# PRD: Lead Satisfaction Analytics & Reporting

**PRD ID:** PRD-LEAD-SATISFACTION-ANALYTICS-REPORTING
**Status:** draft
**Version:** 1.0
**Author:** Product Manager
**Date:** 2026-05-19
**UC:** feature-lead-satisfaction-feedback-collection-meas
**Supersedes:** PRD-LEAD-SATISFACTION-FEEDBACK (collection layer — fully implemented)

---

## 1. Problem Statement

LeadFlow has a complete satisfaction data collection infrastructure:
- **SMS satisfaction pings** — sent after AI conversations, classified as positive/negative/neutral (`lead_satisfaction_events`)
- **NPS surveys** — email-based 0-10 scoring with churn risk alerts (`agent_nps_responses`)
- **Agent dashboard** — per-agent satisfaction card with 30-day stats (`LeadSatisfactionCard`)
- **Admin dashboard** — NPS overview with churn risk management (`/admin/nps`)

However, we cannot answer the core question: **"Are leads helped or annoyed by AI SMS responses?"** because:

1. **No unified measurement.** SMS satisfaction and NPS data live in separate silos. There's no combined view showing overall lead sentiment health.
2. **NPS metric is manual.** The mission metric "NPS Score" (target: 50) has `collection_method=manual` — nobody is updating it. We don't know our actual NPS.
3. **No trend tracking.** The admin NPS page shows a 90-day snapshot but no time-series — we can't see if satisfaction is improving or declining over weeks.
4. **No per-agent correlation.** We can't identify which agents have satisfied leads vs. which have frustrated leads, making it impossible to intervene before churn.
5. **No export.** Product and marketing teams can't pull satisfaction data for analysis, investor decks, or compliance reporting.
6. **No automated alerts.** Satisfaction degradation is invisible until an agent cancels.

**Goal:** Turn collected satisfaction data into automated, actionable measurement that feeds product decisions and the mission metrics system.

---

## 2. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| NPS Score mission metric auto-updated | Every heartbeat | `mission_metrics.collection_method = 'nps_collector'`, `last_collected` within 10 min |
| % positive SMS satisfaction responses | ≥ 70% | `lead_satisfaction_events` where `rating = 'positive'` / total rated |
| Satisfaction analytics page load time | < 2s | Admin dashboard `/admin/satisfaction-analytics` |
| Export capability functional | CSV + JSON | Admin can download 90-day data in both formats |
| Degradation alert triggers | Within 1 heartbeat | Alert fires when weekly positive rate drops > 15 points |

---

## 3. User Stories

### US-1: Unified Satisfaction Analytics Dashboard

**As an admin/product manager,** I want a single analytics page combining SMS satisfaction and NPS data so I can assess overall lead sentiment health at a glance.

**Acceptance Criteria:**
- New page at `/admin/satisfaction-analytics` (admin-only, requires `API_SECRET_KEY`)
- **Summary cards** (top row):
  - Overall SMS Satisfaction Rate: positive % (30d), with trend arrow vs prior 30d
  - Current NPS Score: computed from `agent_nps_responses` (90d), with category label
  - Total Data Points: count of satisfaction events + NPS responses combined
  - Response Rate: satisfaction pings responded to / total pings sent
- **Time-series chart** (middle):
  - Weekly SMS satisfaction positive rate over last 12 weeks
  - Weekly NPS responses plotted (when available)
  - X-axis: week, Y-axis: percentage / score
- **Per-agent breakdown** (bottom table):
  - Agent name, SMS satisfaction rate, NPS score (if available), total responses, trend
  - Sortable by any column
  - Highlight agents with negative trend (> 10pt drop) in red
- All data queries use existing `lead_satisfaction_events` and `agent_nps_responses` tables — no new tables

### US-2: Automated NPS Metric Collection

**As the mission metrics system,** I want the NPS Score metric to update automatically every heartbeat so the genome can track progress toward the target of 50.

**Acceptance Criteria:**
- `_collectNPSMetrics()` function in the genome's `mission-metric-collector.js`:
  - Queries `agent_nps_responses` for last 90 days
  - Calculates NPS: `((promoters - detractors) / total) * 100` (same formula as `nps-service.ts`)
  - Updates `mission_metrics` row: `current_value`, `last_collected = NOW()`
  - Updates `collection_method` from `manual` to `nps_collector`
- Runs as part of heartbeat metric collection (no separate cron needed)
- When `agent_nps_responses` has 0 rows in window, sets `current_value = NULL` (not 0)
- Logs collection result to structured logger

**Note:** There is an existing UC (`NPS Metric Auto-Collection via nps_collector`, status: in_progress) that covers the genome-side implementation. This user story defines the product requirements that UC should satisfy. Do not create a duplicate UC.

### US-3: Satisfaction Data Export

**As an admin,** I want to export satisfaction and NPS data as CSV or JSON so I can analyze it externally or include it in reports.

**Acceptance Criteria:**
- New API endpoint: `GET /api/admin/satisfaction-export`
  - Query params: `format=csv|json`, `type=satisfaction|nps|all`, `days=90` (default)
  - Requires `API_SECRET_KEY` bearer token
  - Returns appropriate `Content-Type` and `Content-Disposition` headers
- **Satisfaction CSV columns:** `date, lead_id, agent_name, agent_email, rating, raw_reply, conversation_id`
- **NPS CSV columns:** `date, agent_name, agent_email, score, category (promoter/passive/detractor), open_text, survey_trigger`
- **Combined ("all") CSV:** union of both with a `source` column (`sms_satisfaction` or `nps_survey`)
- Maximum export window: 365 days
- Response is streamed (not buffered) for large datasets

### US-4: Automated Satisfaction Degradation Alerts

**As the product team,** I want to be alerted when lead satisfaction degrades significantly so we can intervene before agents churn.

**Acceptance Criteria:**
- Degradation check runs during heartbeat metric collection
- **Trigger conditions** (any one fires alert):
  - SMS positive rate drops > 15 percentage points week-over-week (requires ≥ 10 responses in both weeks)
  - NPS score drops below 0 (net detractors exceed promoters)
  - Any single agent receives ≥ 3 negative satisfaction responses in 7 days
- **Alert delivery:**
  - Telegram notification to LeadFlow topic (topic ID from `project.config.json`)
  - Creates `product_feedback` row with `feedback_type = 'satisfaction_degradation'` and `source = 'automated'`
- **Cooldown:** Same degradation pattern doesn't re-alert within 24 hours
- **State:** `.satisfaction-alert-state.json` in genome state directory (gitignored)

---

## 4. Technical Requirements

### 4.1 No New Database Tables

All data already exists:
- `lead_satisfaction_events` — SMS satisfaction data (columns: lead_id, agent_id, rating, raw_reply, created_at, satisfaction_ping_sent_at)
- `agent_nps_responses` — NPS scores (columns: agent_id, score, open_text, survey_trigger, created_at)
- `real_estate_agents` — agent identity (first_name, last_name, email)
- `mission_metrics` — NPS Score target row exists (collection_method currently 'manual')
- `product_feedback` — for degradation alerts

### 4.2 New API Route: `/api/admin/satisfaction-analytics`

Returns unified analytics data for the dashboard page.

```
GET /api/admin/satisfaction-analytics
Authorization: Bearer <API_SECRET_KEY>
Query: ?days=90

Response: {
  summary: {
    smsPositiveRate: number,        // 0-100
    smsPositiveRateTrend: number,   // delta vs prior period
    npsScore: number | null,
    npsCategory: string,            // 'excellent'|'good'|'average'|'poor'
    totalDataPoints: number,
    responseRate: number            // 0-100 (responded / sent)
  },
  weeklyTrends: [{
    weekStart: string,              // ISO date
    smsPositiveRate: number | null,
    smsTotal: number,
    npsAvgScore: number | null,
    npsCount: number
  }],
  agentBreakdown: [{
    agentId: string,
    agentName: string,
    agentEmail: string,
    smsPositiveRate: number | null,
    smsTotal: number,
    npsScore: number | null,
    trend: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  }]
}
```

### 4.3 New API Route: `/api/admin/satisfaction-export`

See US-3 acceptance criteria. Implementation in `app/api/admin/satisfaction-export/route.ts`.

### 4.4 Genome Integration (mission-metric-collector.js)

See US-2. The NPS metric auto-collection UC already targets this. This PRD defines the product requirements:
- Collection frequency: every heartbeat (5 min)
- Metric name in DB: `NPS Score`
- Formula: standard NPS = `((promoters - detractors) / total) * 100`
- Window: 90 days rolling

### 4.5 Degradation Alert Logic (new function in heartbeat or metric collector)

See US-4. Implement as `checkSatisfactionDegradation()` called during heartbeat metric collection.

---

## 5. Existing Code to Leverage (Do Not Reimplement)

| Capability | File | Function |
|---|---|---|
| SMS satisfaction stats (per-agent, 30d) | `lib/satisfaction.ts` | `getSatisfactionStats()` |
| NPS score calculation (global, 90d) | `lib/nps-service.ts` | `getNPSStats()` |
| Churn risk alerts | `lib/nps-service.ts` | `createChurnRiskAlert()` |
| Admin NPS data fetch | `app/api/admin/nps/route.ts` | GET handler |
| Satisfaction events fetch | `app/api/satisfaction/events/route.ts` | GET handler |
| Agent satisfaction stats | `app/api/satisfaction/stats/route.ts` | GET handler |

The analytics dashboard should call these existing service functions where possible, not duplicate their SQL queries.

---

## 6. Out of Scope (v1)

- AI-inferred sentiment from conversation text (phase 2)
- Satisfaction data in FUB CRM (separate integration)
- Multi-language satisfaction pings
- Real-time WebSocket updates on the analytics page
- Satisfaction data used to auto-tune AI prompts (phase 2)
- A/B testing different satisfaction ping messages

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Low data volume makes trends noisy | Show "insufficient data" state when < 10 responses per period; don't compute trends without minimums |
| NPS auto-collection conflicts with existing UC | This PRD defines requirements only; implementation defers to the existing `NPS Metric Auto-Collection` UC |
| Export of large datasets times out | Stream responses; cap at 365 days; paginate if needed |
| False degradation alerts from statistical noise | Require minimum sample sizes (≥ 10 responses per week) before triggering |

---

## 8. Workflow

**product → dev → qc**

- **Product (this PRD):** Specification complete
- **Dev:** Implement analytics API routes, dashboard page, export endpoint, degradation alerts
- **QC:** Verify all 4 user stories with E2E tests against existing test data

---

## 9. Definition of Done

- [ ] `/admin/satisfaction-analytics` page renders with summary, trends, and agent breakdown
- [ ] NPS Score mission metric updates automatically (or confirmed delegated to existing auto-collection UC)
- [ ] `/api/admin/satisfaction-export` returns CSV and JSON for satisfaction, NPS, and combined data
- [ ] Degradation alerts fire on significant drops (verified with test data)
- [ ] All existing satisfaction/NPS functionality unchanged (no regressions)
- [ ] Admin NPS page (`/admin/nps`) still works independently
- [ ] E2E tests pass for new endpoints
- [ ] Deployed to Vercel

---

## 10. Relationship to Existing Work

This PRD supersedes `PRD-LEAD-SATISFACTION-FEEDBACK` (March 2026), which covered the data **collection** layer. That layer is fully implemented:
- ✅ SMS satisfaction pings sent and classified
- ✅ NPS surveys sent via email
- ✅ Agent dashboard card showing per-agent stats
- ✅ Admin NPS page with churn risk management
- ✅ Database tables and API routes

This PRD covers the **measurement and reporting** layer — turning collected data into actionable analytics, automated metric tracking, and degradation alerts.
