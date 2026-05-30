# Design Spec: Session Analytics for Agent Dashboard

**Feature:** Pilot agent session analytics visibility
**Task ID:** ba7c5481-775e-4fde-9c9a-79871f4fe0f4
**Date:** 2026-05-29
**Designer:** Design Agent
**Use Case:** feature-session-analytics-for-agent-dashboard-trac

## 1. Goal

Let operators answer one question in under 10 seconds: **Are pilot agents actually using the product?**

The design surfaces usage status, trend direction, and urgent at-risk users in a single pass. It should reduce manual digging through per-agent logs and make outreach prioritization obvious.

## 2. Placement + Information Architecture

### Primary Surface
- Keep `SessionAnalyticsCard` on dashboard home.
- Position directly under top KPIs and above detailed lead/conversation widgets.

### Secondary Surface (optional follow-up)
- `View full session analytics` CTA can route to a future `/dashboard/analytics/sessions` page.

## 3. Layout Blueprint

### Desktop (>= 1280px)
- Block title row:
  - Left: `Pilot Engagement`
  - Right controls: `Last updated {time}` + `Refresh` button
- Snapshot row (4 compact stat cards):
  - `Active in 24h`
  - `At Risk (>72h)`
  - `Avg Sessions / Pilot (7d)`
  - `Login Rate (7d)`
- Pilot list grid:
  - 3 columns on `lg`, 2 columns on `md`, 1 on mobile
  - Each card is action-oriented: identity, status chip, recency, session intensity, top page

### Tablet/Mobile (< 768px)
- Keep same hierarchy, but linear:
  1. Title + refresh
  2. Horizontal scroll stat cards (4)
  3. Stacked pilot cards
- On mobile, collapse less-critical metadata into one line (`Top page • Plan tier`).

## 4. Component Spec

### 4.1 Header Row
- Title: `Pilot Engagement`
- Subcopy (small): `Track pilot adoption and intervention risk.`
- Right-side controls:
  - Timestamp label `Updated 2m ago`
  - Secondary button `Refresh`

### 4.2 Snapshot Metrics (new within this block)

#### Card A — Active in 24h
- Value: count of pilots with `inactiveHours <= 24`
- Color: emerald value, neutral card
- Helper: `of {totalPilots} pilots`

#### Card B — At Risk (>72h)
- Value: count where `atRisk=true`
- Color: red value
- Helper: `needs manual follow-up`

#### Card C — Avg Sessions / Pilot (7d)
- Value: numeric with 1 decimal
- Color: slate
- Helper: `session depth signal`

#### Card D — Login Rate (7d)
- Value: `%` of pilots with `sessionsLast7d > 0`
- Color: slate/emerald if above threshold
- Helper: `baseline weekly engagement`

### 4.3 Pilot Card

Each pilot card contains:
- Identity:
  - `name`
  - `email` (secondary)
- Status chip (top-right):
  - `Active`
  - `Low Activity (>48h)`
  - `At Risk (>72h)`
- Metrics row:
  - `Last Login`
  - `Sessions (7d)`
- Behavior row:
  - `Top Page`
  - optional `Plan` (if already in payload)
- Footer action:
  - Primary text action `Review conversations` (links to conversations filtered by pilot when available)
  - Secondary text action `Message pilot` (future hook)

### 4.4 Ranking + Sort
- Default sort: highest risk first, then lowest `sessionsLast7d`, then oldest login.
- Order should be stable after refresh.

## 5. Visual Language

Use established dashboard system (slate neutrals + semantic accents).

### Color mapping
- Active: emerald chip `bg-emerald-100 text-emerald-700`
- Low activity: amber chip `bg-amber-100 text-amber-700`
- At risk: red chip `bg-red-100 text-red-700`

### Typography
- Section title: `text-sm font-semibold uppercase tracking-wide`
- Metric values: `text-2xl font-semibold`
- Helper text: `text-xs text-slate-500`

### Spacing + density
- Outer block gap: 12px vertical rhythm
- Card padding: 16px desktop, 14px mobile
- Minimum tap area for controls: 40px height

## 6. Interaction States

### Loading
- Show skeletons for snapshot cards + pilot cards.
- Preserve card dimensions to prevent layout shift.

### Error
- Inline alert block with retry CTA.
- Keep section title visible to maintain page continuity.

### Empty
- Headline: `No pilot agents yet`
- Support line: `Session analytics will appear once pilots sign up.`
- CTA: `Invite pilot agents` (route to pilot signup admin view if available)

## 7. Content Rules

- Relative time should be human and concise (`2h ago`, `Yesterday`, `3d ago`).
- Never show raw route IDs when a friendly label mapping exists.
- Use consistent threshold wording in chip and legend (`>48h`, `>72h`).

## 8. Accessibility + Testability

- Color is not sole status signal; include text labels (`At Risk`).
- Status chips must meet AA contrast.
- Refresh button has `aria-label="Refresh session analytics"`.
- Each metric tile and pilot card should expose deterministic `data-testid` hooks.

## 9. Acceptance for Design QA

1. Operator can identify at-risk pilots without opening any card.
2. Desktop and mobile preserve the same decision order: risk first, activity second.
3. Empty/error/loading all retain section identity and CTA clarity.
4. No copy ambiguity around inactivity thresholds.

## 10. Implementation Mapping (for dev)

- Existing component target: `product/lead-response/dashboard/components/dashboard/SessionAnalyticsCard.tsx`
- Existing payload fields already aligned:
  - `lastLogin`
  - `sessionsLast7d`
  - `topPage`
  - `inactiveHours`
  - `atRisk`
- Required derived values in UI layer:
  - `active24hCount`
  - `atRiskCount`
  - `avgSessionsPerPilot`
  - `loginRate7d`

## 11. Out of Scope

- Back-end schema changes
- New analytics event taxonomy
- Automated outreach triggers
