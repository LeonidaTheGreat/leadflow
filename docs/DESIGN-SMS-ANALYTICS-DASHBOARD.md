# Design Spec: SMS Analytics Dashboard — Delivery, Reply & Booking Conversion

**Task ID:** 0815ead8-239a-4db5-8270-19d327801cba  
**Feature:** feat-sms-analytics-dashboard  
**PRD:** PRD-SMS-ANALYTICS-DASHBOARD  
**Date:** 2026-03-08  
**Designer:** Design Agent

---

## Overview

This spec defines the visual design for three SMS performance stat cards to be added to the agent dashboard. The cards surface Delivery Rate, Reply Rate, and Booking Conversion alongside a shared time window selector.

Design philosophy: these numbers are **the most shareable, most confidence-building metric in the product**. Make them feel earned, not buried. Clean, bold, scannable in under 3 seconds.

---

## Design Principles

1. **Instant readability** — The key number (%) must dominate. Supporting context is secondary.
2. **Trust through color** — Use color to communicate health, not decoration.
3. **Consistent with existing UI** — Match `StatsCards` + `AnalyticsKpiDashboard` token patterns exactly.
4. **Mobile-first** — All three cards readable on iPhone SE without horizontal scroll.
5. **Designed for screenshots** — Agents will share these stats. Make them look great out of context.

---

## 1. Placement & Layout

### Dashboard Location

The three SMS stat cards live directly **below** the existing `StatsCards` row on the main dashboard (`/dashboard`). They form a distinct group labeled **"SMS Performance"**.

```
┌─────────────────────────────────────────────────────────────────┐
│  Lead Feed                                        [Filters ▾]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ New Leads│  │ Qualified│  │ Responded│  │  Today   │       │  ← existing StatsCards
│  │    12    │  │    8     │  │    5     │  │    3     │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
├─────────────────────────────────────────────────────────────────┤
│  SMS Performance                 [ 7d ] [ 30d ] [ All Time ]   │  ← NEW section header + time selector
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │  Delivery Rate   │  │   Reply Rate     │  │  Booking    │  │
│  │      94%         │  │      31%         │  │ Conversion  │  │  ← 3 NEW SMS stat cards
│  │  142 messages    │  │  44 leads        │  │     18%     │  │
│  └──────────────────┘  └──────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Grid Layout

| Breakpoint | Columns | Card Width | Gap |
|------------|---------|------------|-----|
| ≥1024px (lg) | 3 | equal (1fr each) | 16px |
| 768–1023px (md) | 3 | equal | 12px |
| <768px (sm/mobile) | 1 | full width | 12px |

**Tailwind grid class:** `grid grid-cols-1 md:grid-cols-3 gap-4`

---

## 2. Section Header

```
SMS Performance                           [ 7 Days ] [ 30 Days ] [ All Time ]
```

- **Label "SMS Performance":** `text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide`
- **Section wrapper:** `flex items-center justify-between mb-3`
- The time selector sits right-aligned in the same row as the section label

---

## 3. Time Window Selector

### Visual Spec

```
┌──────────┐ ┌──────────┐ ┌───────────┐
│  7 Days  │ │ 30 Days  │ │ All Time  │
└──────────┘ └──────────┘ └───────────┘
     ↑ active state           ↑ inactive
```

- **Wrapper:** `flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1`
- **Button (inactive):** `px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-colors`
- **Button (active):** `px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm`
- **Options:** `7 Days` | `30 Days` | `All Time` (API values: `7d`, `30d`, `all`)
- **Default:** 30 Days

### Behavior
- Clicking any option fires the API fetch and updates all 3 cards simultaneously
- No page reload — state is local to the `SmsStatsSection` component
- Active option persists in React state (no localStorage needed for v1)

---

## 4. Stat Card Component Spec

### Anatomy (per card)

```
┌────────────────────────────────────────────┐
│  [?]  Delivery Rate          ↑ +3%         │  ← label row: metric name + tooltip icon + optional trend
│                                            │
│            94%                             │  ← value: large, bold, dominant
│                                            │
│        142 messages sent                   │  ← denominator hint: small, muted
│                                            │
└────────────────────────────────────────────┘
```

### Typography

| Element | Style |
|---------|-------|
| Metric label | `text-sm font-medium text-slate-600 dark:text-slate-400` |
| Percentage value | `text-4xl font-bold` (color varies — see §5) |
| Denominator hint | `text-xs text-slate-500 dark:text-slate-500 mt-1` |
| Trend arrow + % | `text-sm font-medium` (emerald for up, red for down) |

### Spacing & Structure

- **Card wrapper:** `bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-1 hover:shadow-md transition-shadow`
- **Label row:** `flex items-center justify-between`
- **Label + tooltip:** `flex items-center gap-1.5`
- **Tooltip icon:** `w-3.5 h-3.5 text-slate-400 cursor-help` (Lucide `HelpCircle`)
- **Value:** `text-4xl font-bold leading-none mt-2 mb-1`
- **Denominator:** `text-xs text-slate-500`
- **Trend (optional for v1):** Right-aligned in label row — `flex items-center gap-0.5`

### Card Width Constraint

All three cards should have `min-h-[120px]` to remain visually uniform even when some have trend indicators and others don't.

---

## 5. Color Coding

### Delivery Rate — Threshold Colors

The delivery rate value text changes color based on health:

| Threshold | Color Token | Tailwind Class | Meaning |
|-----------|-------------|----------------|---------|
| ≥ 80% | Emerald | `text-emerald-600 dark:text-emerald-400` | Healthy |
| 60–79% | Amber | `text-amber-600 dark:text-amber-400` | Warning |
| < 60% | Red | `text-red-600 dark:text-red-400` | Critical |
| No data / `—` | Slate | `text-slate-400 dark:text-slate-500` | Empty |

Additionally, apply a **left border accent** matching the color:

```
border-l-4 border-emerald-500  ← healthy
border-l-4 border-amber-500    ← warning  
border-l-4 border-red-500      ← critical
```

This provides a scannable health indicator even when not reading the number.

### Reply Rate & Booking Conversion — Neutral Colors

No red/green health thresholds (insufficient baseline data in v1). Use a neutral color:

- Value text: `text-slate-900 dark:text-white`
- Left border: `border-l-4 border-blue-500` (Reply Rate), `border-l-4 border-purple-500` (Booking Conversion)

These neutral borders differentiate the cards visually without implying health signals.

### Card Background Tint (subtle)

Match existing `AnalyticsKpiDashboard` KPI card pattern:

| Card | Background Tint |
|------|-----------------|
| Delivery Rate | `bg-emerald-50/50 dark:bg-emerald-900/10` (or amber/red tint based on status) |
| Reply Rate | `bg-blue-50/50 dark:bg-blue-900/10` |
| Booking Conversion | `bg-purple-50/50 dark:bg-purple-900/10` |

---

## 6. Individual Card Designs

### 6.1 Delivery Rate Card

```
┌─────────────────────────────────────────────┐ ← border-l-4 border-emerald-500
│  [icon]  Delivery Rate             ↑ +2%   │   bg-emerald-50/50
│                                             │
│                   94%                       │   text-4xl font-bold text-emerald-600
│                                             │
│           142 messages sent                 │   text-xs text-slate-500
└─────────────────────────────────────────────┘
```

- **Icon:** Lucide `CheckCircle2` (`w-4 h-4 text-emerald-500`)
- **Tooltip text:** "Percentage of SMS successfully delivered to lead phones. Low rates may indicate carrier or compliance issues."
- **Empty state:** `—` in `text-slate-400`, no border tint
- **Zero data copy:** "No messages sent yet" (replaces denominator hint)

### 6.2 Reply Rate Card

```
┌─────────────────────────────────────────────┐ ← border-l-4 border-blue-500
│  [icon]  Reply Rate                         │   bg-blue-50/50
│                                             │
│                   31%                       │   text-4xl font-bold text-slate-900
│                                             │
│             44 leads replied                │   text-xs text-slate-500
└─────────────────────────────────────────────┘
```

- **Icon:** Lucide `MessageSquare` (`w-4 h-4 text-blue-500`)
- **Tooltip text:** "Percentage of leads who responded to your AI SMS. Excludes opt-outs (STOP/UNSUBSCRIBE)."
- **Empty state:** `—` in `text-slate-400`

### 6.3 Booking Conversion Card

```
┌─────────────────────────────────────────────┐ ← border-l-4 border-purple-500
│  [icon]  Booking Conversion       [?]       │   bg-purple-50/50
│                                             │
│                   18%                       │   text-4xl font-bold text-slate-900
│                                             │
│          8 appointments booked              │   text-xs text-slate-500
└─────────────────────────────────────────────┘
```

- **Icon:** Lucide `CalendarCheck` (`w-4 h-4 text-purple-500`)
- **Tooltip text:** "Of leads who replied to SMS, the percentage who booked an appointment."
- **Empty state:** `—` in `text-slate-400`

---

## 7. Loading State (Skeleton)

While the API fetch is in progress, show skeleton cards that match the actual card dimensions:

```
┌─────────────────────────────────────────────┐
│  ████████████████              █████        │  ← label + trend: h-4 w-28, h-4 w-10
│                                             │
│           ██████████                        │  ← value: h-10 w-20 (centered)
│                                             │
│            ████████████                     │  ← hint: h-3 w-32
└─────────────────────────────────────────────┘
```

**Tailwind skeleton pattern:**
```
animate-pulse bg-slate-200 dark:bg-slate-700 rounded
```

The 3-card grid renders skeleton cards immediately on mount, replaced by real data when fetch completes.

---

## 8. Empty / Zero States

### New Agent (no data at all)

Do not show the 3 cards. Instead, render a single full-width empty state card:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   📊  Your SMS analytics will appear here                       │
│                                                                 │
│   Once your AI starts sending messages to leads, you'll see     │
│   delivery rates, reply rates, and booking conversions here.    │
│                                                                 │
│                    [ Add your first lead → ]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- **Wrapper:** `bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center`
- **Icon:** `text-4xl mb-3` (emoji or Lucide `BarChart3 w-10 h-10 text-slate-400`)
- **Headline:** `text-base font-semibold text-slate-700 dark:text-slate-300`
- **Body:** `text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto`
- **CTA:** `mt-4 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline`

### Time Window with No Activity

Show the cards but display `—` (em dash) as the value instead of `0%`:

- Value: `text-4xl font-semibold text-slate-300 dark:text-slate-600`
- Denominator hint: hidden
- No colored border accent (use `border-l-4 border-slate-200 dark:border-slate-700`)

---

## 9. Tooltip Design

Each metric label has a `?` icon that shows a tooltip on hover/focus.

```
                ┌────────────────────────────────────────┐
                │  Percentage of SMS successfully         │
                │  delivered to lead phones. Low rates    │
                │  may indicate carrier or compliance     │
                │  issues.                                │
                └────────────────────────────────────────┘
                ↑
  [?] Delivery Rate
```

- **Trigger:** Lucide `HelpCircle` icon, `w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help`
- **Tooltip wrapper:** `absolute z-10 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg p-3 max-w-[220px] shadow-lg`
- **Position:** Above the icon (tooltip appears on top, centered)
- **Implementation:** Use `title` attribute for v1 simplicity; upgrade to Radix `Tooltip` for v2 polish

---

## 10. Full Section Wire

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  SMS PERFORMANCE          [7 Days] [30 Days] [All Time]        │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ ▌[✓] Delivery    │  │ ▌[✉] Reply Rate  │  │ ▌[📅] Book. │  │
│  │       Rate  ↑2%  │  │                  │  │    Conversion│  │
│  │                  │  │                  │  │              │  │
│  │       94%        │  │       31%        │  │     18%      │  │
│  │                  │  │                  │  │              │  │
│  │ 142 msgs sent    │  │ 44 leads replied │  │ 8 appts      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│     ↑ green border         ↑ blue border       ↑ purple border  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Component File Structure (for Dev)

```
components/
└── dashboard/
    ├── SmsStatsSection.tsx          ← outer section (header + selector + cards grid)
    ├── SmsStatCard.tsx              ← individual stat card (reusable)
    └── SmsStatsEmptyState.tsx       ← empty state when no data at all

app/
└── dashboard/
    └── page.tsx                     ← import SmsStatsSection, add below StatsCards
```

### `SmsStatCard` Props Interface

```typescript
interface SmsStatCardProps {
  label: string;                     // "Delivery Rate"
  value: number | null;              // 0.94 (raw, format as %) or null for —
  denominator?: string;              // "142 messages sent"
  icon: React.ReactNode;
  colorScheme: 'delivery' | 'reply' | 'booking';
  tooltip: string;
  trend?: { value: number; direction: 'up' | 'down' };  // optional for v1
  loading?: boolean;
}
```

### `SmsStatsSection` Props Interface

```typescript
interface SmsSectionProps {
  // No external props needed — fetches its own data
  // Uses internal state for window selection
}
```

---

## 12. Responsive Behavior Details

### Desktop (≥1024px)
- 3-column grid, equal widths
- Section header and time selector on same row
- Cards ~200–280px wide each

### Tablet (768–1023px)
- 3-column grid maintained (cards narrower)
- Time selector may wrap to second line if space is tight

### Mobile (<768px)
- 1-column, full-width cards stacked vertically
- Section header stacks above time selector (column layout)
- Card padding: `p-4` (reduced from `p-5`)
- Value size: `text-3xl` (reduced from `text-4xl`) to prevent overflow

---

## 13. Dark Mode

All colors use `dark:` variants consistent with the existing dashboard palette:

| Light | Dark |
|-------|------|
| `bg-white` | `bg-slate-900` |
| `border-slate-200` | `border-slate-800` |
| `text-slate-900` | `text-white` |
| `text-slate-600` | `text-slate-400` |
| `text-slate-500` | `text-slate-500` |
| `bg-emerald-50/50` | `bg-emerald-900/10` |
| `bg-blue-50/50` | `bg-blue-900/10` |
| `bg-purple-50/50` | `bg-purple-900/10` |

Skeleton pulse: `bg-slate-200 dark:bg-slate-700`

---

## 14. Animation & Interaction

- **Card entrance:** No animation (consistent with existing `StatsCards` — they have none)
- **Value update on window change:** Number transition not required for v1; instant swap is fine
- **Hover state:** `hover:shadow-md transition-shadow` (already on `AnalyticsKpiDashboard` KPI cards)
- **Time selector click:** Immediate visual feedback (active pill changes instantly via React state), fetch begins in parallel

---

## 15. Accessibility

- All `%` values announced with context: use `aria-label="Delivery Rate: 94 percent"`
- Tooltip trigger: `aria-describedby` pointing to tooltip content id
- Time selector buttons: `role="tab"` or standard `<button>` with `aria-pressed`
- Color is never the sole indicator — the label always names the metric explicitly
- Focus ring: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`

---

## 16. Design Token Summary

| Token | Value |
|-------|-------|
| Card border radius | `rounded-xl` (12px) |
| Card padding (desktop) | `p-5` (20px) |
| Card padding (mobile) | `p-4` (16px) |
| Card gap | `gap-4` (16px) |
| Value font size (desktop) | `text-4xl` (36px) |
| Value font size (mobile) | `text-3xl` (30px) |
| Value font weight | `font-bold` (700) |
| Label font size | `text-sm` (14px) |
| Label font weight | `font-medium` (500) |
| Denominator font size | `text-xs` (12px) |
| Section label font size | `text-sm` (14px) |
| Section label case | `uppercase tracking-wide` |
| Border accent width | `border-l-4` (4px) |

---

## 17. Dev Handoff Notes

1. **API endpoint:** `GET /api/analytics/sms-stats?window=30d` — dev implements separately per PRD
2. **Values from API:** `deliveryRate`, `replyRate`, `bookingConversion` are decimals (0–1). Multiply × 100 and round for display.
3. **Denominator strings:** Build from `messagesSent`, `leadsReplied`, `bookingsMade` API fields
4. **Loading:** Show skeleton cards while `isLoading === true` 
5. **Error state:** If API fails, show the same `—` empty state — do not show an error banner for a stats section
6. **Icons:** All from `lucide-react` (already installed). Use `CheckCircle2`, `MessageSquare`, `CalendarCheck`
7. **No new chart library needed** — no charts for these cards (just the number + denominator)
8. **Place SmsStatsSection in `app/dashboard/page.tsx`** between `StatsCards` and `LeadSatisfactionCard`

---

## 18. Completion Checklist

- [x] Section layout and grid spec defined
- [x] Time window selector designed
- [x] All 3 cards fully specified (label, value, denominator, icon, color)
- [x] Color coding rules for delivery rate health
- [x] Loading skeleton spec
- [x] Empty/zero state spec
- [x] Tooltip design
- [x] Mobile responsive behavior
- [x] Dark mode tokens
- [x] Accessibility requirements
- [x] Component structure for dev
- [x] Dev handoff notes

---

*Design spec ready for dev implementation.*
