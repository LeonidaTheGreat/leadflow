# Design Spec: Lead Satisfaction Feedback Collection

**Feature:** feat-lead-satisfaction-feedback  
**Spec ID:** DESIGN-LEAD-SATISFACTION-FEEDBACK  
**Status:** Complete  
**Author:** Design Agent  
**Date:** 2026-03-08  

---

## Design Scope

Two deliverables:
1. **`<LeadSatisfactionCard />`** — dashboard widget showing satisfaction metrics
2. **`<SatisfactionPingToggle />`** — agent settings toggle to enable/disable satisfaction pings

Design system context: Tailwind CSS, dark mode (slate palette), emerald-500 primary, card-based layout, same conventions as `StatsCards.tsx` and `NotificationToggle` in settings.

---

## 1. LeadSatisfactionCard — Dashboard Widget

### 1a. Placement

Insert `<LeadSatisfactionCard />` in `app/dashboard/page.tsx`, **below the StatsCards row**, before the "Next Steps" callout box. It sits full-width in the single-column `space-y-6` flow.

```
[StatsCards row: 4 columns]
[LeadSatisfactionCard — full width, collapsible to detail view]
[LeadFeed]
[Next Steps callout]
```

### 1b. States

| State | Trigger | UI |
|-------|---------|-----|
| **Hidden** | `count < 5` satisfaction events | Component renders nothing (no empty state, no placeholder) |
| **Summary (default)** | `count >= 5` | Collapsed card showing metrics |
| **Detail (expanded)** | User clicks card / "View all" | List of individual satisfaction events |
| **Loading** | Data fetch in progress | Skeleton pulse animation |

---

### 1c. Summary Card Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  😊 Lead Satisfaction          [trend badge]        View all →     │
│                                                                    │
│  ┌──────────────┐  ┌────────────────────────────────────────────┐  │
│  │              │  │  ████████████████░░░░░░░░░░░░░░░░░░░░░░    │  │
│  │   74%        │  │  72% Positive  · 14% Neutral · 14% Negative│  │
│  │  Positive    │  │                                            │  │
│  │              │  │  Based on 28 responses · Last 30 days      │  │
│  └──────────────┘  └────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

#### Anatomy

**Card container:**  
- `bg-white dark:bg-slate-900`  
- `rounded-lg border border-slate-200 dark:border-slate-800`  
- `p-5`  
- Cursor: pointer (entire card is clickable to expand detail)  
- Hover: `hover:border-emerald-400 dark:hover:border-emerald-600` — subtle affordance

**Header row** (`flex items-center justify-between mb-4`):
- Left: emoji `😊` + `text-base font-semibold text-slate-900 dark:text-white` label "Lead Satisfaction"
- Middle: Trend badge (see below)
- Right: `text-sm text-emerald-600 dark:text-emerald-400 hover:underline` "View all →"

**Trend badge** (inline, between label and link):
- Improving: `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400` + ↑ arrow
- Declining: `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400` + ↓ arrow
- Stable: `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400` + → arrow
- Format: `px-2 py-0.5 rounded-full text-xs font-medium`
- Label: "↑ Improving vs. prior 30d" / "↓ Declining vs. prior 30d" / "→ Stable"

**Content row** (`flex gap-6`):
- **Left column** — Big number + label:  
  - `text-4xl font-bold text-emerald-600 dark:text-emerald-400` (positive %)  
  - `text-sm text-slate-500 dark:text-slate-400 mt-1` "Positive"  
  - Width: `w-32 shrink-0`
- **Right column** — Progress bar stack + legend + footnote  
  - `flex-1`

**Stacked progress bar** (`h-3 rounded-full overflow-hidden flex`):
- Positive segment: `bg-emerald-500` width = positive%
- Neutral segment: `bg-slate-300 dark:bg-slate-600` width = neutral%
- Negative segment: `bg-red-400` width = negative%
- Total: 100%, no gaps between segments

**Legend row** (`flex gap-4 mt-2 text-xs text-slate-600 dark:text-slate-400`):
- `● 72% Positive` — emerald dot
- `● 14% Neutral` — slate dot
- `● 14% Negative` — red dot
- Each: `flex items-center gap-1`
- Dot: `inline-block w-2 h-2 rounded-full` with appropriate color

**Footnote** (`text-xs text-slate-400 dark:text-slate-500 mt-2`):
- "Based on 28 responses · Last 30 days"

---

### 1d. Loading Skeleton

```tsx
// Pulse animate skeleton — matches card dimensions
<div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-5 animate-pulse">
  <div className="flex items-center gap-3 mb-4">
    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-36"></div>
    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-28 ml-2"></div>
    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16 ml-auto"></div>
  </div>
  <div className="flex gap-6">
    <div className="w-32">
      <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-20 mb-1"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-14"></div>
    </div>
    <div className="flex-1">
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full mb-3"></div>
      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
    </div>
  </div>
</div>
```

---

### 1e. Detail / Expanded View

When the agent clicks "View all →" or the card, toggle to the expanded view inline (no navigation, no modal). The card grows to show the events list below the summary row.

```
┌──────────────────────────────────────────────────────────────────┐
│  😊 Lead Satisfaction         [trend badge]      ↑ Collapse      │
│  [summary bar — same as above, condensed height]                 │
├──────────────────────────────────────────────────────────────────┤
│  Satisfaction Responses (last 30 days)                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ 👍  John D.   "YES"      Positive    Mar 7 · 2:14 PM        │ │
│  │ 👎  Sarah M.  "NO"       Negative    Mar 6 · 5:02 PM        │ │
│  │ 😐  Mike T.   "OK"       Neutral     Mar 6 · 11:30 AM       │ │
│  │ ❓  Amy K.    "GREAT JOB" Unclassified  Mar 5 · 9:15 AM    │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

#### Events List

**Section header** (`border-t border-slate-200 dark:border-slate-800 pt-4 mt-4`):
- `text-sm font-semibold text-slate-700 dark:text-slate-300` "Satisfaction Responses (last 30 days)"

**Events table** — `divide-y divide-slate-100 dark:divide-slate-800`:

Each row (`flex items-center gap-3 py-3 text-sm`):
- **Rating icon** — `w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0`:
  - Positive: `bg-emerald-100 dark:bg-emerald-900/30` + 👍
  - Negative: `bg-red-100 dark:bg-red-900/30` + 👎
  - Neutral: `bg-slate-100 dark:bg-slate-800` + 😐
  - Unclassified: `bg-amber-100 dark:bg-amber-900/30` + ❓
- **Lead name** — `font-medium text-slate-900 dark:text-white w-28 truncate`
- **Raw reply** — `text-slate-500 dark:text-slate-400 italic flex-1 truncate` (e.g., `"YES"`)
- **Rating badge** — `px-2 py-0.5 rounded-full text-xs font-medium`:
  - Positive: `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`
  - Negative: `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
  - Neutral: `bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400`
  - Unclassified: `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
- **Timestamp** — `text-slate-400 dark:text-slate-500 text-xs ml-auto whitespace-nowrap` e.g., "Mar 7 · 2:14 PM"

**Empty state** (if expanded but somehow no rows):
- Centered, `text-slate-400 dark:text-slate-500 text-sm py-6`  
- "No responses yet"

---

## 2. SatisfactionPingToggle — Settings Page

### 2a. Placement

Insert inside the existing `<div id="notifications">` section in `app/settings/page.tsx`, as the **last toggle** in the `NotificationToggle` stack:

```
[New Lead Alerts]
[SMS Responses]
[Weekly Reports]
[Integration Alerts]
─────────────────  ← separator within list
[Satisfaction Check-Ins]  ← NEW — visually distinct via subtle divider or spacing
```

---

### 2b. Toggle Spec

Use the existing `NotificationToggle` pattern exactly. Fields:

| Prop | Value |
|------|-------|
| `label` | "Satisfaction Check-Ins" |
| `description` | "Send a brief YES/NO check-in SMS after AI conversations to collect lead feedback" |
| `defaultChecked` | `true` (persisted from `agents.satisfaction_ping_enabled`) |
| Toggle style | Same emerald toggle as all other `NotificationToggle` rows |

The toggle sits in a visually separated sub-section under a heading:

```
┌──────────────────────────────────────────────────────┐
│  🔔 Notification Preferences                         │
│  Choose how you want to be notified...               │
├──────────────────────────────────────────────────────┤
│  New Lead Alerts           [  ON  ●────]             │
│  SMS Responses             [  ON  ●────]             │
│  Weekly Reports            [  OFF ────●]             │
│  Integration Alerts        [  ON  ●────]             │
│                                                      │
│  ── AI Feedback ──────────────────────────────────   │
│  Satisfaction Check-Ins    [  ON  ●────]             │
│  Send a brief YES/NO check-in SMS after AI           │
│  conversations to collect lead feedback              │
└──────────────────────────────────────────────────────┘
```

**Section divider:** `<div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">` wrapping the new toggle, with optional sub-label `text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-3` "AI Feedback".

---

## 3. Color & Interaction Reference

### Satisfaction Rating Colors

| Rating | Background (light) | Background (dark) | Text (light) | Text (dark) |
|--------|-------------------|------------------|-------------|-------------|
| Positive | `bg-emerald-100` | `bg-emerald-900/30` | `text-emerald-700` | `text-emerald-400` |
| Negative | `bg-red-100` | `bg-red-900/30` | `text-red-700` | `text-red-400` |
| Neutral | `bg-slate-100` | `bg-slate-800` | `text-slate-600` | `text-slate-400` |
| Unclassified | `bg-amber-100` | `bg-amber-900/30` | `text-amber-700` | `text-amber-400` |

### Typography

| Element | Class |
|---------|-------|
| Card heading | `text-base font-semibold text-slate-900 dark:text-white` |
| Big % number | `text-4xl font-bold text-emerald-600 dark:text-emerald-400` |
| Sub-label | `text-sm text-slate-500 dark:text-slate-400` |
| Footnote | `text-xs text-slate-400 dark:text-slate-500` |
| Trend badge | `text-xs font-medium` |
| Table label | `text-sm font-medium text-slate-900 dark:text-white` |
| Table secondary | `text-sm text-slate-500 dark:text-slate-400` |

### Spacing

- Card inner padding: `p-5`  
- Section gap: `gap-6` (horizontal) / `space-y-4` (vertical)  
- Row padding in event list: `py-3`  
- Progress bar height: `h-3`  
- Icon circle size: `w-8 h-8`  

---

## 4. Component Spec Files

See wireframe spec TSX files at:
- `components/design-specs/LeadSatisfactionCard.spec.tsx`
- `components/design-specs/SatisfactionPingToggle.spec.tsx`

These are wireframe-level specs for dev reference — annotated with `// SPEC:` comments explaining intent. Dev should use these as the structural blueprint for production components.

---

## 5. API Shape (for dev reference)

The dashboard widget needs these data fields from Supabase `lead_satisfaction_events`:

```ts
interface SatisfactionSummary {
  total: number           // count of events with a rating (not null)
  positive: number        // count where rating = 'positive'
  negative: number        // count where rating = 'negative'
  neutral: number         // count where rating = 'neutral'
  unclassified: number    // count where rating = 'unclassified'
  positiveRate: number    // positive / total (0–1)
  trend: 'improving' | 'declining' | 'stable'
}

interface SatisfactionEvent {
  id: string
  lead_id: string
  leadName?: string       // join from leads table
  raw_reply: string
  rating: 'positive' | 'negative' | 'neutral' | 'unclassified'
  created_at: string      // ISO timestamp
}
```

Query pattern:
```sql
-- Summary (last 30 days)
SELECT rating, COUNT(*) FROM lead_satisfaction_events
WHERE agent_id = $agentId
  AND created_at >= NOW() - INTERVAL '30 days'
  AND rating IS NOT NULL
GROUP BY rating;

-- Trend (prior 30 days for comparison)
SELECT rating, COUNT(*) FROM lead_satisfaction_events
WHERE agent_id = $agentId
  AND created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
  AND rating IS NOT NULL
GROUP BY rating;
```

---

## 6. Accessibility Notes

- Card expand/collapse: add `aria-expanded` on the clickable region
- Progress bar: add `role="progressbar"` with `aria-valuenow` and `aria-label`
- Rating badges: ensure sufficient contrast (all color combos pass WCAG AA for small text at `text-xs font-medium`)
- Toggle: uses native `<input type="checkbox">` — inherits full keyboard + screen-reader support from existing `NotificationToggle` pattern

---

## Definition of Done (Design)

- [x] Summary card layout specified with all states (hidden, loading, summary, detail)
- [x] Color palette defined for all 4 rating categories (positive / negative / neutral / unclassified)
- [x] Trend badge variants specified (improving / declining / stable)
- [x] Events list row anatomy defined
- [x] Settings toggle placement and copy defined
- [x] Typography scale and spacing documented
- [x] Component wireframe spec files created
- [x] API data shape documented for dev
- [x] Accessibility notes included
