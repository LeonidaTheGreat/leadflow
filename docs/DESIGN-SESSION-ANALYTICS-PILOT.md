# Design Specification: Session Analytics — Pilot Agent Usage Tracking

**Use Case:** feat-session-analytics-pilot  
**Task ID:** a1503db1-9bcd-4ff3-b031-a4729179bd87  
**Date:** 2026-03-10  
**Designer:** Design Agent  
**Status:** Complete

---

## 1. Overview

This document provides visual design specifications for the Session Analytics feature. It covers:

1. **Internal Admin Dashboard** — `/admin/pilot-usage` — Stojan/PM view of pilot engagement
2. **Future "My Activity" Page** — `/dashboard/activity` — Agent-facing activity view (v2)
3. **Component Specifications** — Reusable UI components
4. **Responsive Behavior** — Mobile, tablet, desktop layouts

---

## 2. Design Principles

Follow the established LeadFlow design system:

- **Clean, minimal UI** — Every element earns its place
- **Color-coded status** — Immediate visual scanning for at-risk pilots
- **Data density without clutter** — Information-rich but scannable
- **Consistent with existing dashboard** — Same cards, typography, spacing patterns
- **Dark mode support** — All components work in both themes

---

## 3. Internal Admin Dashboard — `/admin/pilot-usage`

### 3.1 Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LeadFlow AI                                                    [System Online]
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Pilot Usage Analytics                                          [Refresh ↻] │
│  Track pilot agent engagement and identify at-risk users                    │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Total     │  │   Active    │  │   At Risk   │  │   Inactive  │        │
│  │   Pilots    │  │   (24h)     │  │   (>72h)    │  │   (>7d)     │        │
│  │             │  │             │  │             │  │             │        │
│  │     12      │  │      8      │  │      3      │  │      1      │        │
│  │             │  │    ━━       │  │    ⚠️       │  │    🚨       │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Filter: [All Pilots ▼]  Search: [________________]  [Export CSV]   │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │  Agent              Last Login    Sessions   Top Feature    Status   │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  │  Jane Smith         2 min ago     12         Conversations  🟢 Active│   │
│  │  Mike Johnson       4 hours ago   8          Overview       🟢 Active│   │
│  │  Sarah Chen         1 day ago     5          Settings       🟡 Idle  │   │
│  │  Tom Wilson         3 days ago    2          Overview       ⚠️ At Risk│   │
│  │  Lisa Park          5 days ago    1          Billing        ⚠️ At Risk│   │
│  │  David Brown        8 days ago    0          —              🚨 Inactive│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📊 Feature Usage (7 days)                                          │   │
│  │                                                                     │   │
│  │  Dashboard Overview  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  45 views    │   │
│  │  SMS Conversations   ━━━━━━━━━━━━━━━━━━                28 views    │   │
│  │  Settings            ━━━━━━━━━━━━━                     22 views    │   │
│  │  Billing             ━━━━━━                            12 views    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Last updated: Mar 10, 2026 at 2:34 PM                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Specifications

#### Summary Cards (Top Row)

**Layout:** 4-column grid on desktop, 2x2 on tablet, stacked on mobile

**Card Structure:**
```
┌─────────────────────────────┐
│  Icon    Label              │
│         ─────────────       │
│          VALUE              │
│         (trend/subtext)     │
└─────────────────────────────┘
```

**Styles:**
- Card: `bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6`
- Icon container: `w-10 h-10 rounded-lg flex items-center justify-center`
- Label: `text-sm font-medium text-slate-600 dark:text-slate-400`
- Value: `text-3xl font-bold text-slate-900 dark:text-white mt-1`
- Subtext: `text-xs text-slate-500 dark:text-slate-400 mt-1`

**Color Coding:**
| Card | Icon BG | Icon Color | Value Color |
|------|---------|------------|-------------|
| Total Pilots | slate-100 dark:slate-800 | slate-600 | slate-900 |
| Active (24h) | emerald-50 dark:emerald-900/20 | emerald-600 | emerald-600 |
| At Risk (>72h) | amber-50 dark:amber-900/20 | amber-600 | amber-600 |
| Inactive (>7d) | red-50 dark:red-900/20 | red-600 | red-600 |

**Icons (Lucide):**
- Total Pilots: `<Users className="w-5 h-5" />`
- Active: `<Activity className="w-5 h-5" />`
- At Risk: `<AlertTriangle className="w-5 h-5" />`
- Inactive: `<UserX className="w-5 h-5" />`

---

#### Pilot Data Table

**Container:**
- `bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden`

**Table Header:**
- Row: `bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700`
- Text: `text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider`
- Padding: `px-4 py-3`

**Table Body:**
- Row: `border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`
- Padding: `px-4 py-4`
- Text: `text-sm text-slate-900 dark:text-white`

**Column Specifications:**

| Column | Width | Content | Alignment |
|--------|-------|---------|-----------|
| Agent | ~25% | Avatar + Name + Email | Left |
| Last Login | ~20% | Relative time + timestamp tooltip | Left |
| Sessions (7d) | ~15% | Number with sparkline mini-chart | Center |
| Top Feature | ~20% | Page name with icon | Left |
| Status | ~15% | Badge with icon | Left |
| Actions | ~5% | ••• menu button | Right |

**Agent Cell:**
```
┌──────────────────────────────┐
│  ┌────┐  Jane Smith          │
│  │ JS │  jane@example.com    │
│  └────┘                       │
└──────────────────────────────┘
```
- Avatar: `w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xs font-bold flex items-center justify-center`
- Name: `font-medium text-slate-900 dark:text-white`
- Email: `text-xs text-slate-500 dark:text-slate-400`

**Last Login Cell:**
- Primary: Relative time (e.g., "2 hours ago", "3 days ago")
- Tooltip on hover: Exact timestamp (e.g., "Mar 10, 2026 at 2:34 PM")
- Color coding: 
  - <24h: `text-emerald-600`
  - 24-72h: `text-slate-600 dark:text-slate-400`
  - >72h: `text-amber-600`
  - >7d: `text-red-600`

**Sessions Cell:**
- Number: `font-semibold text-slate-900 dark:text-white`
- Mini sparkline (optional): 5-bar chart showing daily activity

**Status Badges:**

| Status | Badge Style | Icon |
|--------|-------------|------|
| 🟢 Active | `bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800` | `<CheckCircle className="w-3 h-3" />` |
| 🟡 Idle | `bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700` | `<Clock className="w-3 h-3" />` |
| ⚠️ At Risk | `bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800` | `<AlertTriangle className="w-3 h-3" />` |
| 🚨 Inactive | `bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800` | `<UserX className="w-3 h-3" />` |

Badge structure:
```
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ...">
  <Icon className="w-3 h-3" />
  Status Label
</span>
```

**Actions Menu:**
- Button: `p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600`
- Icon: `<MoreVertical className="w-4 h-4" />`
- Dropdown items:
  - View Profile
  - Send Message
  - View Sessions
  - Mark as Reached Out

---

#### Feature Usage Bar Chart

**Container:**
- `bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6`

**Structure:**
```
Feature Usage (7 days)

Dashboard Overview  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  45 views  45%
SMS Conversations   ━━━━━━━━━━━━━━━━━━━━                 28 views  28%
Settings            ━━━━━━━━━━━━━━                       22 views  22%
Billing             ━━━━━━━━                             12 views  12%
```

**Bar Styles:**
- Track: `bg-slate-100 dark:bg-slate-800 rounded-full h-2`
- Fill: `bg-blue-500 rounded-full h-2 transition-all duration-500`
- Fill colors (alternating):
  - Primary: `bg-blue-500`
  - Secondary: `bg-emerald-500`
  - Tertiary: `bg-purple-500`
  - Quaternary: `bg-amber-500`

**Label Styles:**
- Feature name: `text-sm font-medium text-slate-700 dark:text-slate-300`
- View count: `text-sm text-slate-500 dark:text-slate-400`
- Percentage: `text-xs text-slate-400 dark:text-slate-500`

---

### 3.3 Filter Bar

**Container:**
- `flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4`

**Elements:**

1. **Filter Dropdown:**
   - Trigger: `px-3 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300`
   - Options: All Pilots, Active Only, At Risk, Inactive

2. **Search Input:**
   - Container: `relative flex-1 max-w-sm`
   - Icon: `<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />`
   - Input: `pl-9 pr-4 py-2 rounded-lg text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400`

3. **Export Button:**
   - Style: `px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 inline-flex items-center gap-2`
   - Icon: `<Download className="w-4 h-4" />`

---

### 3.4 Empty States

**No Pilots Yet:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌──────────┐                             │
│                    │   👤     │                             │
│                    │   +      │                             │
│                    │   👤     │                             │
│                    └──────────┘                             │
│                                                             │
│              No pilot agents yet                            │
│     Agents will appear here after their first login         │
│                                                             │
│              [Recruit Pilots]                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
- Container: `text-center py-12 px-4`
- Icon: `w-16 h-16 mx-auto mb-4 text-slate-300`
- Title: `text-lg font-medium text-slate-900 dark:text-white mb-2`
- Subtitle: `text-sm text-slate-500 dark:text-slate-400`

**No Search Results:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    🔍                                       │
│                                                             │
│              No agents found                                │
│     Try adjusting your search or filters                    │
│                                                             │
│              [Clear Filters]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Future "My Activity" Page — `/dashboard/activity`

*Note: This is for v2 — when agents can see their own activity. Design now for future implementation.*

### 4.1 Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  LeadFlow AI                                                    [System Online]
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  My Activity                                                                │
│  Track your engagement and discover features                                │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  YOUR ACTIVITY THIS WEEK                                            │   │
│  │                                                                     │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│   │
│  │  │  Sessions   │  │   Time in   │  │   Last      │  │   Top       ││   │
│  │  │   This Week │  │   Dashboard │  │   Login     │  │   Section   ││   │
│  │  │             │  │             │  │             │  │             ││   │
│  │  │      8      │  │    2h 34m   │  │  2 hrs ago  │  │Conversations││   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  GET THE MOST FROM LEADFLOW                                         │   │
│  │                                                                     │   │
│  │  Progress: ━━━━━━━━━━━━━━━━━━━━                                    │   │
│  │            3 of 5 completed — Almost there!                         │   │
│  │                                                                     │   │
│  │  ☑️ View dashboard overview                                         │   │
│  │  ☑️ Check SMS conversations                                         │   │
│  │  ☑️ Update your settings                                            │   │
│  │  ☐ Connect your calendar                                            │   │
│  │  ☐ Respond to your first lead                                       │   │
│  │                                                                     │   │
│  │  [Complete Setup →]                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  TIPS BASED ON YOUR ACTIVITY                                        │   │
│  │                                                                     │   │
│  │  💡 You haven't checked conversations in 2 days. New leads may be   │   │
│  │     waiting!                                                        │   │
│  │                                                                     │   │
│  │  [View Conversations]                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ACTIVITY HISTORY                                                   │   │
│  │                                                                     │   │
│  │  Mon, Mar 10    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  4 sessions         │   │
│  │  Sun, Mar 9     ━━━━━━━━━━━━━━━━                2 sessions         │   │
│  │  Sat, Mar 8     ━━━━━━━━━━                      1 session          │   │
│  │  Fri, Mar 7     ━━━━━━━━━━━━━━━━━━━━━━━━━━      3 sessions         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Component Specifications

#### Activity Stats Cards

Same card component as admin dashboard, but with different metrics:
- Sessions This Week
- Time in Dashboard (cumulative)
- Last Login
- Top Section

**Card Style:**
- Same as existing `StatsCards` component
- Use `bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-800`

#### Feature Discovery Checklist

**Container:**
- `bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6`

**Progress Bar:**
- Track: `bg-white/50 dark:bg-slate-800/50 rounded-full h-2`
- Fill: `bg-blue-500 rounded-full h-2 transition-all duration-500`
- Percentage text: `text-sm font-medium text-blue-900 dark:text-blue-100`

**Checklist Items:**
```
┌─────────────────────────────────────────────────────────────┐
│  ☑️  View dashboard overview                    [View →]    │
│  ─────────────────────────────────────────────────────────  │
│  ☐   Check SMS conversations                    [Go →]      │
└─────────────────────────────────────────────────────────────┘
```

- Completed: `flex items-center gap-3 text-slate-700 dark:text-slate-300`
- Incomplete: `flex items-center gap-3 text-slate-900 dark:text-white font-medium`
- Checkbox completed: `w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center`
- Checkbox incomplete: `w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600`

#### Contextual Tips Card

**Container:**
- `bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4`

**Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  💡 Tip title                                               │
│     Tip description with helpful context                    │
│     [Action Button]                                         │
└─────────────────────────────────────────────────────────────┘
```

- Icon: `text-xl` (💡, ⚙️, 🔥)
- Title: `font-semibold text-amber-900 dark:text-amber-100 mb-1`
- Description: `text-sm text-amber-800 dark:text-amber-200 mb-3`
- Button: `px-3 py-1.5 rounded-md text-sm font-medium bg-amber-100 dark:bg-amber-800 text-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-700`

---

## 5. Responsive Behavior

### Breakpoints

| Breakpoint | Layout Changes |
|------------|----------------|
| < 640px (mobile) | Single column, stacked cards, horizontal scroll table |
| 640-1024px (tablet) | 2-column grids, condensed table |
| > 1024px (desktop) | Full layout as designed |

### Mobile Adaptations

**Summary Cards:**
- Stack vertically
- Full width
- Reduce padding: `p-4` instead of `p-6`

**Data Table:**
- Convert to card list view
- Each pilot becomes a card:
```
┌─────────────────────────────┐
│ Jane Smith        🟢 Active │
│ jane@example.com            │
│                             │
│ Last Login      2 min ago   │
│ Sessions (7d)        12     │
│ Top Feature  Conversations  │
└─────────────────────────────┘
```

**Feature Usage Chart:**
- Maintain bar chart
- Reduce to single line: `Feature name ━━━━ count views`

---

## 6. Color Palette

### Status Colors

| Status | Light Mode | Dark Mode |
|--------|------------|-----------|
| Active | emerald-50 bg, emerald-600 text | emerald-900/20 bg, emerald-400 text |
| Idle | slate-50 bg, slate-600 text | slate-800 bg, slate-400 text |
| At Risk | amber-50 bg, amber-600 text | amber-900/20 bg, amber-400 text |
| Inactive | red-50 bg, red-600 text | red-900/20 bg, red-400 text |

### Chart Colors

| Index | Color | Hex (Light) |
|-------|-------|-------------|
| 1 | Blue | #3b82f6 |
| 2 | Emerald | #10b981 |
| 3 | Purple | #8b5cf6 |
| 4 | Amber | #f59e0b |
| 5 | Pink | #ec4899 |
| 6 | Cyan | #06b6d4 |

---

## 7. Typography

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Page Title | text-2xl | font-bold | slate-900 dark:white |
| Page Subtitle | text-sm | font-normal | slate-500 |
| Section Header | text-lg | font-semibold | slate-900 dark:white |
| Card Label | text-sm | font-medium | slate-600 dark:slate-400 |
| Card Value | text-3xl | font-bold | slate-900 dark:white |
| Table Header | text-xs | font-semibold uppercase | slate-500 |
| Table Cell | text-sm | font-normal | slate-900 dark:white |
| Badge | text-xs | font-medium | varies by status |

---

## 8. Spacing & Layout

### Container
- Max width: `max-w-7xl mx-auto`
- Padding: `px-4 sm:px-6 lg:px-8`
- Vertical spacing: `space-y-6`

### Cards
- Padding: `p-6` (desktop), `p-4` (mobile)
- Border radius: `rounded-lg`
- Gap between cards: `gap-4`

### Tables
- Cell padding: `px-4 py-4`
- Header padding: `px-4 py-3`
- Row divider: `border-b border-slate-200 dark:border-slate-700`

---

## 9. Animation & Interactions

### Loading States
- Skeleton: `animate-pulse bg-slate-200 dark:bg-slate-700`
- Stagger: 100ms delay between rows

### Hover States
- Table rows: `hover:bg-slate-50 dark:hover:bg-slate-800/50`
- Cards: `hover:shadow-md transition-shadow`
- Buttons: `hover:bg-slate-100 dark:hover:bg-slate-700`

### Data Updates
- Number changes: `transition-all duration-300`
- New rows: `animate-in fade-in slide-in-from-top-2`
- Status changes: Pulse animation on badge

---

## 10. Accessibility

### Requirements
- All status colors have text labels (not just color)
- Status badges include aria-labels
- Table has proper `<thead>` and `<th scope="col">`
- Focus states visible: `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
- Minimum contrast ratio: 4.5:1 for text

### Keyboard Navigation
- Table rows: Tab to focus, Enter to open actions menu
- Filter dropdowns: Arrow keys to navigate options
- Export button: Focusable, Enter to trigger

---

## 11. Assets & Icons

### Required Lucide Icons

```typescript
import {
  Users,
  Activity,
  AlertTriangle,
  UserX,
  CheckCircle,
  Clock,
  MoreVertical,
  Search,
  Download,
  LayoutDashboard,
  MessageSquare,
  Settings,
  CreditCard,
  ChevronRight,
  Calendar,
  Flame,
  Lightbulb,
} from 'lucide-react'
```

### Icon Mapping

| Feature | Icon | Usage |
|---------|------|-------|
| Dashboard Overview | `<LayoutDashboard />` | Top feature, navigation |
| SMS Conversations | `<MessageSquare />` | Top feature, navigation |
| Settings | `<Settings />` | Top feature, navigation |
| Billing | `<CreditCard />` | Top feature, navigation |
| Active status | `<CheckCircle />` | Status badge |
| Idle status | `<Clock />` | Status badge |
| At Risk | `<AlertTriangle />` | Status badge, alerts |
| Inactive | `<UserX />` | Status badge |

---

## 12. Implementation Notes for Dev

### Component Structure

```
app/
├── admin/
│   └── pilot-usage/
│       ├── page.tsx              # Main admin page
│       └── layout.tsx            # Admin layout (if needed)
├── dashboard/
│   └── activity/                 # Future: agent-facing
│       └── page.tsx
├── components/
│   ├── admin/
│   │   ├── PilotUsageDashboard.tsx
│   │   ├── PilotSummaryCards.tsx
│   │   ├── PilotDataTable.tsx
│   │   ├── FeatureUsageChart.tsx
│   │   └── StatusBadge.tsx
│   └── activity/                 # Future
│       ├── ActivityDashboard.tsx
│       ├── FeatureChecklist.tsx
│       └── ContextualTips.tsx
```

### Data Types

```typescript
interface PilotUsageData {
  agentId: string
  name: string
  email: string
  avatarUrl?: string
  lastLoginAt: string
  sessionsLast7d: number
  topPage: string
  inactiveHours: number
  status: 'active' | 'idle' | 'at-risk' | 'inactive'
}

interface FeatureUsageData {
  page: string
  views: number
  percentage: number
}

interface PilotUsageSummary {
  totalPilots: number
  active24h: number
  atRisk72h: number
  inactive7d: number
}
```

### API Endpoint

```
GET /api/internal/pilot-usage
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

---

## 13. Design Deliverables Summary

| Deliverable | Location | Status |
|-------------|----------|--------|
| Design spec (this doc) | `docs/DESIGN-SESSION-ANALYTICS-PILOT.md` | ✅ Complete |
| Component specs | Sections 3-5 above | ✅ Complete |
| Responsive guidelines | Section 6 | ✅ Complete |
| Color palette | Section 7 | ✅ Complete |
| Typography scale | Section 8 | ✅ Complete |
| Icon mapping | Section 12 | ✅ Complete |
| Dev implementation notes | Section 13 | ✅ Complete |

---

**Next Steps:**
1. Dev team implements `/admin/pilot-usage` page using these specs
2. Dev team implements `/api/internal/pilot-usage` endpoint
3. QC validates against PRD acceptance criteria
4. Future: Implement `/dashboard/activity` for agent-facing view
