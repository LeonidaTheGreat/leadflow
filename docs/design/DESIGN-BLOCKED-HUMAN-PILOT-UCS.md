# Design Spec: Blocked Human Pilot Recruitment UCs

Task ID: `3ab3dbb5-9e2b-450a-8ecf-32a637bc8bf5`
Use case: `feature-mark-pilot-recruitment-ucs-blockedhuman-an`

## Objective
Stop agent-cycle burn on 3 pilot recruitment UCs that require human outreach by Stojan, by surfacing them as explicit human action items.

Affected UCs:
- `fix-zero-real-pilots-recruited`
- `fix-pilot-outreach-has-not-happened-11-days-left`
- `fix-30-pilot-campaign-stalled-at-day-8`

Required backend state reflected by UI:
- `implementation_status = blocked`
- `blocked_reason = blocked_human`
- Any pending retry tasks canceled

## Primary UX Change
Convert these UC rows from "active execution" representation into a dedicated **Human Required** lane with actionable instructions and no retry affordances.

## Surface 1: Admin Command Center (`/admin`)
### Placement
Inside existing right-column "Immediate blockers" card, above generic action items.

### New block
- Title: `Human Required (3)`
- Subtitle: `These items cannot be automated and require direct outreach by owner.`
- Accent: warning/amber icon + red status chips to preserve urgency

### Row pattern (one per UC)
- Left:
  - UC title (humanized)
  - reason label: `Blocked: Human outreach required`
  - deadline badge when known (for 11-day and day-8 items)
- Right:
  - Status chip: `blocked_human`
  - CTA: `Mark outreach started` (secondary)

### Microcopy mapping
- `fix-zero-real-pilots-recruited` -> `No real pilots recruited yet`
- `fix-pilot-outreach-has-not-happened-11-days-left` -> `Outreach has not started (11 days left)`
- `fix-30-pilot-campaign-stalled-at-day-8` -> `30-pilot campaign stalled at Day 8`

## Surface 2: Pilot Campaign Board (`/admin/pilot-campaigns`)
### New lane
Add a fixed top lane before regular queue sections:
- Lane label: `Blocked - Human Action`
- Description: `Agent retries are disabled while awaiting owner action.`

### Card anatomy
- Title
- `blocked_human` badge
- `retry tasks canceled` confirmation line
- Required action checklist
  - `Contact 10 active real estate agents directly`
  - `Log outreach summary`
  - `Update UC to in_progress once contact starts`

### Interaction rules
- No `Retry`, `Run again`, or autonomous trigger buttons for these cards.
- `Expand details` reveals latest blocked timestamp and cancellation timestamp.

## Surface 3: Action Items Table / Feed
If a global action-item feed exists in admin stack, include these UCs with:
- Type: `human_action_required`
- Owner: `Stojan`
- Priority: `P1`
- SLA clock visible (days left where available)

## Mobile Behavior
- Collapse each blocked UC into accordion rows.
- Keep `blocked_human` chip and deadline visible before expansion.
- Sticky footer CTA on mobile list: `Open outreach checklist`.

## Visual System Specs
- Reuse existing dark admin palette.
- Badge styles:
  - `blocked_human`: red-950 background, red-200 text, red-800 border
  - deadline alert: amber-950 background, amber-200 text
- Spacing:
  - list row vertical padding: 12px
  - lane/card gap: 12px
  - section margin-top from heading: 16px
- Iconography:
  - warning triangle for blocked reason
  - user/checklist icon for human action

## Empty/Edge States
- If all three are unblocked: hide Human Required section.
- If retry cancellation failed for one UC:
  - show inline critical note: `Retry cancellation pending - resolve immediately.`
  - keep item in Human Required with elevated border.

## Accessibility
- Status chips meet AA contrast in dark mode.
- Keyboard tab order: title -> status -> CTA per row.
- All icons include aria-hidden with text alternatives in labels.

## QA Acceptance (Design)
- Three specified UCs always appear in Human Required while blocked.
- No autonomous retry affordance is visible for blocked_human UCs.
- Each card explicitly communicates that retry tasks were canceled.
- Mobile layout preserves urgency signals without truncating UC meaning.

## Handoff Notes for Dev
- Prefer extending existing `Immediate blockers` list renderer with a typed group for `blocked_human`.
- Avoid introducing new page; this is an in-context operational intervention.
- Keep copy deterministic so future agents can parse and avoid re-queueing retries.
