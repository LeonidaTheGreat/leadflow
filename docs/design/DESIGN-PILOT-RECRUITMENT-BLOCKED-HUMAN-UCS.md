# Design Specification: Pilot Recruitment UCs Blocked by Human Outreach

**Feature:** Mark pilot recruitment UCs as `blocked_human` and surface as human action items  
**Task ID:** df0b38f1-e072-4f87-adcd-4fde81776143  
**Date:** 2026-05-15  
**Designer:** Design Agent

## Overview

This spec defines the admin UX for three pilot recruitment use cases that cannot be completed by agents because they require direct human outreach by Stojan.

Target UCs:
- `fix-zero-real-pilots-recruited`
- `fix-pilot-outreach-has-not-happened-11-days-left`
- `fix-30-pilot-campaign-stalled-at-day-8`

Required operational state:
- `implementation_status = 'blocked'`
- `blocked_reason = 'blocked_human'`
- Pending retry tasks for these UCs canceled

The UI goal is to stop presenting these as normal engineering backlog and instead present them as owner action items.

## User Problem

Current dashboards can make blocked-human work appear as standard stuck/in-progress work, which burns autonomous retry cycles and hides the real bottleneck: owner outreach.

## Design Goals

1. Make human dependency explicit at first glance.
2. Separate blocked-human UCs from normal stuck engineering work.
3. Show retry cancellation state so operators trust automation has stopped.
4. Give the owner one clear action phrase per UC.

## Information Architecture

### Placement

Add a dedicated section on admin triage surfaces:
- `/admin/triage`: new top section above general analyses
- Optional mirrored card group on `/admin` command center in Action Items panel

### Section Title

`Human Action Required (Blocked Outreach)`

### Section Subtitle

`These use cases are paused because only direct human outreach can unblock them.`

## Component Specification

### 1) HumanBlockedBanner

Purpose: high-salience status context for the entire section.

Content:
- Title: `Agent retries paused for blocked-human work`
- Body: `3 pilot recruitment use cases require Stojan to contact real estate agents directly.`
- Meta row:
  - `Blocked UCs: 3`
  - `Retry Tasks: Canceled`
  - `Last Sync: {timestamp}`

Visual:
- Background: `bg-amber-950/40`
- Border: `border-amber-700`
- Icon: alert/hand-off icon
- Radius: `rounded-2xl`

### 2) HumanActionUCRow (repeated x3)

Each row represents one blocked UC.

Fields:
- UC title (humanized from ID)
- UC ID (monospace secondary)
- Status chip: `Blocked` (red)
- Reason chip: `blocked_human` (amber outline)
- Retry chip: `Retries canceled` (slate)
- Owner chip: `Owner: Stojan`
- Deadline context (if available): e.g. `11 days left`
- Primary action text (non-button static instruction for this phase):
  - `Personally reach out to 10 qualified real estate agents and log outcomes.`

Visual behavior:
- Desktop: two-column row (left metadata, right action block)
- Mobile: single-column stacked cards
- Critical info always visible without expansion

### 3) Optional Audit Drawer (collapsed by default)

Label: `View automation stop details`

When expanded:
- `implementation_status` transition timestamp
- `blocked_reason` value
- count of canceled pending retries

This reduces cognitive load while preserving traceability.

## Content Mapping for the 3 UCs

1. `fix-zero-real-pilots-recruited`
- Display title: `Zero Real Pilots Recruited`
- Action text: `Call and message qualified agents today to secure first real pilot commitments.`

2. `fix-pilot-outreach-has-not-happened-11-days-left`
- Display title: `Pilot Outreach Not Started (11 Days Left)`
- Action text: `Start direct outreach now; prioritize verified signups and document contact attempts.`

3. `fix-30-pilot-campaign-stalled-at-day-8`
- Display title: `30-Pilot Campaign Stalled at Day 8`
- Action text: `Restart the campaign with direct owner outreach and track daily contacted count.`

## Interaction Rules

- These rows are not retryable from UI.
- No `Retry` CTA shown when `blocked_reason='blocked_human'`.
- If retry cancellation is incomplete, show warning inline:
  - `Automation stop pending: some retries still queued.`
- Filter behavior:
  - New filter pill: `Blocked (Human)`
  - Count reflects only `blocked_reason='blocked_human'`

## Responsive Rules

### Desktop (>=1024px)
- Banner full width
- Table-like rows with compact chips
- Action text right aligned block

### Tablet (768px-1023px)
- Row metadata wraps to 2 lines
- Action block below metadata

### Mobile (<768px)
- Card stack per UC
- Chips wrap to 2-3 lines
- Preserve order: Title -> Chips -> Action -> Optional audit

## Accessibility

- Color cannot be sole signal: include literal text `Blocked` and `blocked_human`.
- Minimum chip contrast WCAG AA.
- Audit drawer keyboard operable and screen-reader labeled.

## Developer Handoff Notes

- Reuse existing admin triage styling tokens where possible.
- Do not blend these into generic stuck recommendations (`START`, `MERGE`, etc.).
- Always render blocked-human section first when non-empty.
- Data contract expectation for each row:
  - `id`
  - `name`
  - `implementation_status`
  - `blocked_reason`
  - `owner` (fallback `Stojan` for these three)
  - `pending_retry_count` (expected `0` after cancellation)
  - `updated_at`

## Acceptance Criteria

- [ ] Exactly the three target UCs appear under `Human Action Required (Blocked Outreach)`.
- [ ] Each row clearly shows `Blocked` + `blocked_human` + `Retries canceled`.
- [ ] No retry CTA appears for blocked-human rows.
- [ ] Section is visually separated from generic triage queue.
- [ ] Mobile layout remains readable without horizontal scroll.
- [ ] Operator can understand required human action in under 5 seconds.
