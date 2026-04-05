# PRD: Trial Countdown Widget & Urgency

**PRD ID:** prd-trial-countdown-widget  
**Status:** active  
**Created:** 2026-04-04  
**Owner:** PM Agent  
**Priority:** 1 (P1 — directly on conversion path to first paying customer)  
**Parent PRD:** prd-revenue-recovery-sprint  
**UC:** uc-revenue-countdown-widget

---

## Problem

Trial users don't feel urgency to upgrade. The existing `TrialStatusBanner` component has two critical gaps:

1. **No upgrade CTA for users with >3 days remaining.** Green state shows "you're on a trial" but zero call-to-action. A user with 10 days left never sees "Upgrade Now."
2. **3-tier urgency is spec'd but not implemented.** Only green (>3 days) and amber (≤3 days / expired) exist. Red urgency is missing. Amber threshold of 3 days is too late — most users who don't upgrade in 7 days churn.

This directly blocks the conversion path outlined in PRD-REVENUE-RECOVERY-SPRINT.md (Action 2, step 3).

---

## Goal

Every trial user who opens their dashboard sees:
- How many days they have left (exact countdown)
- A clear visual urgency signal (green → yellow → red)
- A prominent "Upgrade Now" button — always visible, never hidden

---

## Scope

**In scope:**
- Enhance or replace `TrialStatusBanner` component with a `TrialCountdownWidget`
- Three urgency tiers with distinct visual treatment
- Upgrade button visible in ALL urgency states
- Countdown display (days remaining + expiry date)

**Out of scope:**
- Changes to `/api/auth/trial-status` route (already returns needed data)
- Email notifications (separate UC)
- Stripe checkout flow itself (separate UC: `uc-stripe-checkout-end-to-end`)

---

## User Stories

**US-1:** As a trial user with 10 days left, I want to see my countdown so I know when my trial ends and can plan to upgrade before losing access.

**US-2:** As a trial user with 3–7 days left, I want a clear yellow warning so I feel motivated to act now rather than later.

**US-3:** As a trial user with ≤3 days left, I want a red urgent alert with a large Upgrade button prominently placed so I don't miss it.

**US-4:** As an expired trial user, I want to immediately understand I need to upgrade to restore access — not hunt for a billing link.

**US-5:** As any trial user (any urgency state), I want the Upgrade button always visible so I can upgrade whenever I'm ready, even on day 1.

---

## Requirements

### R1 — Urgency Tiers

| State | Condition | Color | Label |
|-------|-----------|-------|-------|
| Green | > 7 days remaining | `emerald-500` | "X days left" |
| Yellow | 3–7 days remaining | `yellow-500` | "X days left — ending soon" |
| Red | ≤ 3 days remaining | `red-500` | "X days left — upgrade now" |
| Expired | `isExpired === true` | `red-700` | "Trial ended — restore access" |

### R2 — Countdown Display

- Primary: `"X days remaining"` (days as integer, ≥1)
- When ≤ 1 day: show hours remaining (e.g. `"18 hours remaining"`)
- Secondary: exact date formatted as `"Expires May 15"` (locale: en-US, no year unless different year)
- Zero state: `"Trial ended"` with exact end date

### R3 — Upgrade Button

- Always visible in all states (green, yellow, red, expired)
- Label: `"Upgrade to Pro — $149/mo"` for trial users; `"Upgrade Plan"` for pilot users
- Links to: `/settings/billing`
- Size: `px-6 py-3` minimum (large, not small)
- Color: matches urgency (emerald for green, amber for yellow, red for red/expired)
- On hover: darker shade, no spinner needed

### R4 — Widget Layout

```
┌─────────────────────────────────────────────────────┐
│ [icon]  Trial — 8 days remaining          [Upgrade] │
│         Expires Apr 12                              │
└─────────────────────────────────────────────────────┘
```

- Single-row layout on desktop (icon + text left, button right)
- Stack vertically on mobile (text above button)
- Rounded card (`rounded-xl`), not just a thin banner strip
- Padding: `p-4` minimum

### R5 — Placement

- Render at the top of the main dashboard content area, below the header/nav
- Replace or wrap the existing `TrialStatusBanner` — do not render both
- Only visible when `isTrial === true` OR `isPilot === true`
- Hidden when agent is on a paid plan

### R6 — Data Source

Uses the existing `/api/auth/trial-status` endpoint. No new API needed.

Response fields used:
- `daysRemaining` — integer, ≥ 0
- `trialEndsAt` — ISO 8601 date string (may be null for pilots)
- `isExpired` — boolean
- `isTrial` — boolean
- `isPilot` — boolean

---

## Acceptance Criteria

### AC-1: Green state renders with upgrade button
- Given: agent with `daysRemaining > 7`
- When: dashboard loads
- Then: widget renders with green/emerald color scheme AND upgrade button is visible

**Machine check:** `grep -c "Upgrade to Pro" product/lead-response/dashboard/components/dashboard/TrialCountdownWidget.tsx` → expect ≥ 1

### AC-2: Yellow state renders
- Given: agent with `daysRemaining` between 3 and 7 (inclusive of 7, exclusive of 3 — i.e. 4, 5, 6, 7)
- When: dashboard loads
- Then: widget renders with yellow color scheme

**Machine check:** `grep -c "yellow" product/lead-response/dashboard/components/dashboard/TrialCountdownWidget.tsx` → expect ≥ 1

### AC-3: Red state renders
- Given: agent with `daysRemaining <= 3` and `isExpired === false`
- When: dashboard loads
- Then: widget renders with red color scheme

**Machine check:** `grep -c "red" product/lead-response/dashboard/components/dashboard/TrialCountdownWidget.tsx` → expect ≥ 1

### AC-4: Expired state renders
- Given: agent with `isExpired === true`
- When: dashboard loads
- Then: widget renders with red/dark color + "restore access" messaging

### AC-5: Upgrade button always present
- Widget renders upgrade button in ALL 4 states (green, yellow, red, expired)
- Button always links to `/settings/billing`

### AC-6: Hours shown when ≤ 1 day remaining
- Given: `daysRemaining === 0` and `isExpired === false`
- Then: display shows hours remaining, not "0 days"

### AC-7: Widget not shown for paid users
- Given: agent with `isTrial === false` AND `isPilot === false`
- When: dashboard loads
- Then: widget renders nothing (null)

### AC-8: Component file exists at correct path
**Machine check:** `test -f product/lead-response/dashboard/components/dashboard/TrialCountdownWidget.tsx && echo "exists"` → expect `exists`

---

## Technical Notes

### File to create
`product/lead-response/dashboard/components/dashboard/TrialCountdownWidget.tsx`

This replaces or supersedes `TrialStatusBanner.tsx`. The dev agent should either:
- (Preferred) Create `TrialCountdownWidget.tsx` as the new component and update the dashboard page to use it instead of `TrialStatusBanner`
- (Acceptable) Rewrite `TrialStatusBanner.tsx` to match this spec

### Dashboard page integration
The widget must be imported and rendered in the main dashboard page. Find the existing `TrialStatusBanner` usage:
```
grep -r "TrialStatusBanner" product/lead-response/dashboard/
```
Replace or extend that import/usage with the new component.

### Hours calculation (when daysRemaining = 0, not expired)
```typescript
const hoursRemaining = trialEndsAt 
  ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60)))
  : 0
```

### Expiry date formatting
```typescript
const expiryLabel = trialEndsAt
  ? new Date(trialEndsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : null
```

---

## E2E Test Spec

**File:** `tests/e2e/trial-countdown-widget.spec.ts`

Tests use Playwright against the local dev server or production URL.

| Test | Setup | Assertion |
|------|-------|-----------|
| Green state shown | Mock `/api/auth/trial-status` → `daysRemaining: 10, isTrial: true` | Widget visible, emerald color class, Upgrade button present |
| Yellow state shown | Mock → `daysRemaining: 5, isTrial: true` | Yellow color class |
| Red state shown | Mock → `daysRemaining: 2, isTrial: true` | Red color class |
| Expired state shown | Mock → `isExpired: true, isTrial: true` | "restore access" text visible |
| Upgrade button clicks through | Any state | Click Upgrade → navigates to `/settings/billing` |
| Hidden for paid users | Mock → `isTrial: false, isPilot: false` | Widget not in DOM |

---

## Out of Scope (Do Not Implement)

- Email reminders triggered by trial expiry (separate UC)
- Countdown timer ticking in real-time on screen (not needed — daily update sufficient)
- A/B testing different CTA text (post-launch optimization)
- Analytics tracking for "Upgrade button clicked" (nice-to-have, P4)
