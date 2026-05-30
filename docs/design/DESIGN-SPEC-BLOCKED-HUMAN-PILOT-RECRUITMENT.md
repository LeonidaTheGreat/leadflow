# Design Spec: Blocked Human Pilot Recruitment (UC Triage)

## Task
- Task ID: `3ab3dbb5-9e2b-450a-8ecf-32a637bc8bf5`
- Use Case group: `feature-mark-pilot-recruitment-ucs-blockedhuman-an`
- Scope: Visual design for surfacing 3 pilot recruitment UCs as `blocked_human` and preventing wasted retry cycles.

## Problem To Solve
Three use cases are currently consuming agent retries despite requiring direct human outreach from Stojan:
- `fix-zero-real-pilots-recruited`
- `fix-pilot-outreach-has-not-happened-11-days-left`
- `fix-30-pilot-campaign-stalled-at-day-8`

System behavior needs to be legible in UI:
- `implementation_status = blocked`
- `blocked_reason = blocked_human`
- pending retry tasks canceled
- surfaced as explicit human action items

## UX Outcome
Operator should understand in under 5 seconds:
- these 3 items are blocked for human reasons, not engineering failure
- no further agent retries will run
- exact next action is manual outreach by Stojan

## Information Architecture
Add a dedicated lane above generic triage list:
1. `Human Action Required` (new, highest priority lane)
2. `Active Machine-Actionable Work` (existing triage)
3. `Completed / Archived` (existing)

## Page-Level Layout (Desktop)
Target surface: `/admin/triage`

```text
+-----------------------------------------------------------------------------------+
| Use Case Triage                                              Generated: 2026-05-19 |
+-----------------------------------------------------------------------------------+
| [Summary KPI Row]                                                             |
| Total | Stuck | Blocked Human (NEW) | Needs Merge                              |
+-----------------------------------------------------------------------------------+
| HUMAN ACTION REQUIRED (3)  [red dot]  [Paused retries: 3]                       |
| "These items require direct outreach by Stojan. Agents are paused."             |
|-----------------------------------------------------------------------------------|
| UC: fix-zero-real-pilots-recruited                            STATUS: BLOCKED     |
| Reason: blocked_human                                          Retries: CANCELED   |
| Next action: Contact 10 real estate agents directly this week                   |
| [Open outreach checklist] [Mark outreach started] [Snooze 24h]                  |
|-----------------------------------------------------------------------------------|
| UC: fix-pilot-outreach-has-not-happened-11-days-left          STATUS: BLOCKED     |
| Reason: blocked_human                                          Retries: CANCELED   |
| Next action: Send personal outreach sequence today                             |
| [Open outreach checklist] [Mark outreach started] [Snooze 24h]                  |
|-----------------------------------------------------------------------------------|
| UC: fix-30-pilot-campaign-stalled-at-day-8                    STATUS: BLOCKED     |
| Reason: blocked_human                                          Retries: CANCELED   |
| Next action: Directly book 5 agent calls from existing leads                   |
| [Open outreach checklist] [Mark outreach started] [Snooze 24h]                  |
+-----------------------------------------------------------------------------------+
| ACTIVE MACHINE-ACTIONABLE WORK (existing cards/list)                              |
+-----------------------------------------------------------------------------------+
```

## Mobile Layout
Single-column compression rules:
- Keep `Human Action Required` lane pinned at top.
- Each card order:
  1. UC name
  2. `BLOCKED` badge + `blocked_human` reason chip
  3. `Retries canceled` inline status row
  4. one-line next action
  5. primary CTA: `Open outreach checklist`
  6. overflow menu: `Mark outreach started`, `Snooze 24h`

```text
[Use Case Triage]
[Blocked Human: 3] [Paused retries: 3]

[fix-zero-real-pilots-recruited]
[BLOCKED] [blocked_human]
Retries: canceled
Next: Contact 10 real estate agents directly this week
[Open outreach checklist]
[•••]
```

## Component Specs

### 1) `BlockedHumanSummaryCard` (new)
- Purpose: top-level visibility of human-blocked queue.
- Content:
  - Count of blocked-human UCs
  - Count of canceled pending retries
  - Short explanatory sentence
- Visual:
  - Background: warm neutral (`#FFF7ED` family)
  - Border: warning red/orange (`#FCA5A5` or token equivalent)
  - Icon: handoff/human silhouette

### 2) `BlockedHumanUseCaseCard` (new card variant)
- Base on existing triage card structure; add mandatory rows:
  - `Status: BLOCKED`
  - `Reason: blocked_human`
  - `Retry state: canceled`
  - `Human owner: Stojan`
- CTA hierarchy:
  - Primary: `Open outreach checklist`
  - Secondary: `Mark outreach started`
  - Tertiary: `Snooze 24h`

### 3) Status Chips
- `BLOCKED` badge: high-contrast red text on soft red bg.
- `blocked_human` reason chip: neutral with icon + tooltip.
- `Retries canceled` microchip: muted gray-green, non-clickable.

### 4) Audit Event Row (inline)
Display immutable system event below card header:
- `Pending retries canceled at <timestamp> by system`
- style as small mono text to separate machine event from human CTA.

## Interaction States
- Loading: skeleton for summary card + 3 placeholder cards.
- Empty blocked-human queue:
  - Message: `No human-blocked use cases right now.`
  - fallback to existing triage list only.
- Error:
  - keep existing triage error shell
  - add explicit line: `Blocked-human lane unavailable; showing base triage only.`

## Copy Guidelines
Use direct operational copy:
- Good: `Requires direct outreach by Stojan`
- Avoid: vague AI blame language (`agent failed`, `system confused`)
- Retry language must be explicit and final: `Pending retries canceled`

## Accessibility
- All status chips must meet WCAG AA contrast.
- Do not encode blocked state by color only; include text + icon.
- CTA labels must be verb-first and screen-reader clear.

## Telemetry (for Dev Handoff)
Track visual usage events:
- `blocked_human_lane_viewed`
- `blocked_human_checklist_opened`
- `blocked_human_mark_started_clicked`
- `blocked_human_snooze_clicked`

## Dev Handoff Mapping
Existing surfaces to extend:
- `product/lead-response/dashboard/app/admin/triage/page.tsx`
- `product/lead-response/dashboard/app/api/admin/triage-use-cases/route.ts`

Expected payload extension for design fidelity:
- boolean/derived field: `is_blocked_human`
- field: `blocked_reason`
- field: `pending_retries_canceled_count` (global + per UC optional)
- field: `human_owner` (`Stojan`)

## Acceptance (Design-Level)
1. The three named UCs are visually grouped in a dedicated `Human Action Required` lane.
2. Each card shows `BLOCKED`, `blocked_human`, and `Retries canceled` without opening details.
3. A first-time operator can identify next human action within 5 seconds.
4. Desktop and mobile layouts preserve the same status hierarchy.

## Out of Scope
- Database updates
- task cancellation implementation
- API route logic
- retry scheduler logic

This document is visual and behavioral guidance for implementation.
