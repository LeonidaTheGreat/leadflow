# PRD: ROI Metrics Widget — Show Agents the Value LeadFlow Delivers

**PRD ID:** prd-roi-dashboard-widget  
**Status:** shipped  
**Version:** 1.0  
**Use Case:** feat-roi-dashboard-widget  
**Phase:** Pilot → Conversion

---

## Problem

Agents on trial can't see whether LeadFlow is working. No data surface = no perceived value = no upgrade. The dashboard shows operational status (leads in, messages out) but nothing that quantifies the business outcome for the agent.

Real estate agents care about one thing: commissions. If LeadFlow isn't visibly protecting commission opportunity, there's no reason to pay $49/mo.

---

## Goal

Surface the ROI story directly on the dashboard — in the agent's language (dollars, appointments, speed) — so they feel the value every time they log in. This reduces churn and accelerates upgrade decisions.

---

## Target User

Solo real estate agent (1–5 years experience). Uses FUB. Doesn't think about technology; thinks about listings, leads, and closings. Will pay for something that visibly protects their pipeline.

---

## What We're Building

A widget on the main dashboard (`/dashboard`) that shows 4 ROI metrics:

| Metric | Label | Source |
|--------|-------|--------|
| Total leads responded | "Leads Responded" | `leads` table, `status = 'responded'` |
| Avg response time | "Avg Response Time" | `messages` table, first `direction = 'outbound'` per lead |
| Appointments booked this month | "Appointments Booked" | `bookings` table, current month |
| Estimated commission protected | "Revenue Protected" | `leadsResponded × $350K × 5% commission × bookingRate` |

---

## States

**With data:** 4-metric card grid, emerald/teal gradient background.

**No data:** Blue "Coming Soon" panel with bullet list of what they'll see + CTA to connect Follow Up Boss (links to `/settings`).

**Loading:** Animated skeleton (4 card slots).

**Error:** Red error banner with message.

---

## API

`GET /api/metrics/roi`

- Auth: session only (`getAuthUserId`)
- Returns: `{ leadsResponded, avgResponseTimeSeconds, appointmentsBookedThisMonth, estimatedRevenueProtected, bookingRate, hasData }`
- `hasData = true` when `leadsResponded > 0 || appointmentsBookedThisMonth > 0`
- Revenue formula: `leadsResponded × 350000 × 0.05 × bookingRate`
- Default booking rate: 5% when no history

---

## Assumptions

- Average property value: $350,000 (US market)
- Average commission: 5%
- These are visible in the tooltip as "Estimated value saved"

---

## Placement

After `AhaMomentBanner`, before the lead feed section in `app/dashboard/page.tsx`.

---

## Known Issues (from product review, 2026-04-27)

1. **Widget placement is too low**: 7 banners appear above it. Most agents won't scroll to it.
2. **Response time label**: "How fast you respond" — should be "How fast LeadFlow responds for you".
3. **Empty state copy**: Assumes agent hasn't connected FUB; doesn't handle "connected but no data yet" state.
4. **"Revenue Protected" tooltip**: Says "Estimated value saved" — inconsistent with card header.
5. **Booking rate 0.0%**: Shown for new agents with no history — demotivating.

---

## Acceptance Criteria

- [ ] Dashboard shows ROI widget with 4 metrics
- [ ] Numbers pull from real database (leads, messages, bookings tables)
- [ ] Widget updates on each page load (no caching)
- [ ] Agents with no data see empty state with FUB CTA
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)
