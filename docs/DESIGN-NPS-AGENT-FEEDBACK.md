# Design Spec: NPS & Feedback Survey for Agents

**Task ID:** f6cb0ad3-832f-42e9-b6bf-8e3b118a2b4c  
**Feature:** feat-nps-agent-feedback  
**Date:** 2026-07-17  
**Designer:** Design Agent

---

## Overview

This design spec covers the visual design for the NPS (Net Promoter Score) and Feedback Survey system for LeadFlow AI. The design follows the existing dashboard patterns while introducing new components for survey collection and admin analytics.

## Design Principles

1. **Non-intrusive** — Surveys should not block core workflows
2. **Clear hierarchy** — NPS scale is immediately scannable
3. **Consistent** — Uses existing color palette, spacing, and typography
4. **Accessible** — WCAG 2.1 AA compliant, keyboard navigable
5. **Delightful** — Micro-interactions reward participation

---

## 1. In-App NPS Survey Prompt (Modal)

### Placement
- Centered modal overlay on dashboard load
- Triggered when survey is due and user is authenticated
- Dismissible via X button or "Ask me later"

### Visual Spec

```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ✕                                                  │    │
│  │                                                     │    │
│  │     How likely are you to recommend               │    │
│  │     LeadFlow AI to another agent?                 │    │
│  │                                                     │    │
│  │  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┬────┐│    │
│  │  │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │ 8  │ 9  ││    │
│  │  └────┴────┴────┴────┴────┴────┴────┴────┴────┴────┘│    │
│  │  Not likely                              Very likely │    │
│  │                                                     │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │                                                     │    │
│  │  What's the #1 thing we could improve? (optional) │    │
│  │  ┌───────────────────────────────────────────────┐  │    │
│  │  │                                                 │  │    │
│  │  │                                                 │  │    │
│  │  └───────────────────────────────────────────────┘  │    │
│  │  0 / 500 characters                                 │    │
│  │                                                     │    │
│  │           [  Ask me later  ]  [  Submit  ]          │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         ↑ Overlay: bg-slate-900/50 backdrop-blur-sm
```

### Component Details

**Modal Container**
- Width: 480px max (responsive: 90vw on mobile)
- Background: `bg-white dark:bg-slate-900`
- Border: `border border-slate-200 dark:border-slate-800`
- Border radius: `rounded-xl` (12px)
- Shadow: `shadow-2xl`
- Padding: `p-6` (24px)

**Close Button (X)**
- Position: absolute top-4 right-4
- Size: 32px × 32px
- Icon: X from lucide-react
- Color: `text-slate-400 hover:text-slate-600 dark:hover:text-slate-300`
- Hover: `bg-slate-100 dark:bg-slate-800 rounded-full`

**Headline**
- Text: "How likely are you to recommend LeadFlow AI to another agent?"
- Font: `text-lg font-semibold`
- Color: `text-slate-900 dark:text-white`
- Alignment: center
- Margin bottom: `mb-6`

**NPS Scale (0-10)**
- Layout: Horizontal flex, gap-2
- Button size: 44px × 44px (minimum touch target)
- Default state:
  - Background: `bg-slate-100 dark:bg-slate-800`
  - Text: `text-slate-700 dark:text-slate-300 font-medium`
  - Border radius: `rounded-lg`
- Hover state:
  - Background: `bg-slate-200 dark:bg-slate-700`
- Selected state:
  - Background: `bg-emerald-500`
  - Text: `text-white`
  - Scale: `scale-110` (subtle pop)
- Detractor range (0-6): On select, background `bg-red-500`
- Passive range (7-8): On select, background `bg-amber-500`
- Promoter range (9-10): On select, background `bg-emerald-500`

**Scale Labels**
- "Not likely" — left aligned, `text-xs text-slate-500`
- "Very likely" — right aligned, `text-xs text-slate-500`

**Divider**
- `border-t border-slate-200 dark:border-slate-800 my-6`

**Open Text Section**
- Label: "What's the #1 thing we could improve? (optional)"
- Font: `text-sm font-medium text-slate-700 dark:text-slate-300`
- Margin bottom: `mb-2`

**Textarea**
- Min height: 80px
- Padding: `p-3`
- Background: `bg-white dark:bg-slate-950`
- Border: `border border-slate-300 dark:border-slate-700 rounded-lg`
- Focus: `ring-2 ring-emerald-500 border-emerald-500`
- Placeholder: "Tell us what would make LeadFlow better for you..."
- Character count: bottom right, `text-xs text-slate-400`

**Action Buttons**
- Layout: flex justify-end gap-3
- "Ask me later":
  - Variant: secondary (ghost)
  - `px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white`
- "Submit":
  - Variant: primary
  - `px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg`
  - Disabled state (no score selected): `opacity-50 cursor-not-allowed`

---

## 2. Persistent "Give Feedback" Button

### Placement
- Fixed position bottom-right of dashboard
- Position: `right-6 bottom-6`
- Z-index: `z-40` (above content, below modals)

### States

**Collapsed (Default)**
```
┌─────────────────────┐
│  💬  Give Feedback  │
└─────────────────────┘
```
- Background: `bg-slate-900 dark:bg-white`
- Text: `text-white dark:text-slate-900 font-medium text-sm`
- Padding: `px-4 py-3`
- Border radius: `rounded-full`
- Shadow: `shadow-lg hover:shadow-xl`
- Icon: MessageSquare from lucide-react, 18px

**Hover**
- Scale: `scale-105`
- Shadow increase

**Expanded (Click to Open)**
```
┌─────────────────────────────────┐
│  💬 Give Feedback          ✕    │
├─────────────────────────────────┤
│  How's your experience?         │
│                                 │
│  [👍 Works great]              │
│  [🐛 Bug]                      │
│  [💡 Idea]                     │
│  [😤 Frustration]              │
│                                 │
│  Tell us more:                  │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  └───────────────────────────┘  │
│  0 / 500                        │
│                                 │
│              [Submit Feedback]  │
└─────────────────────────────────┘
```

**Expanded Panel**
- Width: 320px
- Background: `bg-white dark:bg-slate-900`
- Border: `border border-slate-200 dark:border-slate-800`
- Border radius: `rounded-xl`
- Shadow: `shadow-2xl`
- Animation: `animate-in slide-in-from-bottom-2 duration-200`

**Feedback Type Selector**
- Layout: 2×2 grid, gap-2
- Each option:
  - Padding: `p-3`
  - Border: `border border-slate-200 dark:border-slate-700 rounded-lg`
  - Background: `bg-white dark:bg-slate-950`
  - Selected: `ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20`
- Icons:
  - 👍 Works great: `ThumbsUp` icon, `text-emerald-500`
  - 🐛 Bug: `Bug` icon, `text-red-500`
  - 💡 Idea: `Lightbulb` icon, `text-amber-500`
  - 😤 Frustration: `Frown` icon, `text-orange-500`

**Success State**
```
┌─────────────────────────────────┐
│                                 │
│           ✓                     │
│      Thanks for your            │
│      feedback!                  │
│                                 │
│  We read every submission.      │
│                                 │
└─────────────────────────────────┘
```
- Checkmark: `CheckCircle` icon, 48px, `text-emerald-500`
- Auto-collapse after 3 seconds

---

## 3. Admin NPS Dashboard (/admin/nps)

### Page Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  LeadFlow AI                                                    [User ▼]     │
├──────────────────────────────────────────────────────────────────────────────┤
│  Admin → NPS Dashboard                                                         │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  NPS Score                                    Response Rate             │ │
│  │                                                                         │ │
│  │     ┌─────┐                                    ┌─────┐                 │ │
│  │     │  42 │                                    │ 67% │                 │ │
│  │     └─────┘                                    └─────┘                 │ │
│  │    +12 vs last 90d                              45 responses           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Breakdown                                    Trend                     │ │
│  │                                                                         │ │
│  │  Promoters (9-10)    ████████████████░░░░░░░░░░  45%  ▲ 12%           │ │
│  │  Passives (7-8)      ████████░░░░░░░░░░░░░░░░░░  23%  ─  0%           │ │
│  │  Detractors (0-6)    ██████░░░░░░░░░░░░░░░░░░░░  18%  ▼  5%           │ │
│  │  Unresponded         ███░░░░░░░░░░░░░░░░░░░░░░░  14%                  │ │
│  │                                                                         │ │
│  │                              [Line chart: NPS over last 6 months]       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Recent Responses                                          [Export ▼]   │ │
│  │                                                                         │ │
│  │  Score  Agent              Response                        Date         │ │
│  │  ─────────────────────────────────────────────────────────────────────  │ │
│  │   10    Sarah Chen         "Game changer for my business"   2h ago      │ │
│  │    9    Mike Ross          "Love the AI responses"          5h ago      │ │
│  │    6    John Davis         "SMS delays sometimes"          1d ago  ⚠️   │ │
│  │    3    Lisa Wong          "Too expensive for my volume"   2d ago  ⚠️   │ │
│  │   10    Tom Bradley        "Closed 3 deals because of this" 3d ago      │ │
│  │   ...                                                                   │ │
│  │                                                                         │ │
│  │                              [Load more...]                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  ⚠️ Churn Risk Alerts (Action Required)                                 │ │
│  │                                                                         │ │
│  │  2 detractors need follow-up within 48 hours:                           │ │
│  │                                                                         │ │
│  │  • John Davis (score: 6) — Submitted 1d ago    [Mark as contacted]     │ │
│  │  • Lisa Wong (score: 3) — Submitted 2d ago     [Mark as contacted]     │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Component Details

**Page Header**
- Breadcrumb: "Admin → NPS Dashboard"
- Font: `text-sm text-slate-500`
- Current page: `font-medium text-slate-900 dark:text-white`

**NPS Score Card**
- Large number: `text-6xl font-bold text-slate-900 dark:text-white`
- Change indicator: 
  - Positive: `text-emerald-600` with `TrendingUp` icon
  - Negative: `text-red-600` with `TrendingDown` icon
  - Neutral: `text-slate-500` with `Minus` icon

**Response Rate Card**
- Percentage: `text-4xl font-bold text-slate-900 dark:text-white`
- Subtext: `text-sm text-slate-500`

**Breakdown Bars**
- Promoters: `bg-emerald-500`
- Passives: `bg-amber-400`
- Detractors: `bg-red-500`
- Unresponded: `bg-slate-300 dark:bg-slate-700`
- Bar height: 8px
- Border radius: `rounded-full`

**Trend Chart**
- Line chart showing NPS over 6 months
- Grid lines: `border-slate-200 dark:border-slate-800`
- Line color: `stroke-emerald-500`
- Fill: `fill-emerald-500/10`

**Responses Table**
- Table header: `bg-slate-50 dark:bg-slate-800`
- Row hover: `hover:bg-slate-50 dark:hover:bg-slate-800/50`
- Score badge:
  - Promoter (9-10): `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400`
  - Passive (7-8): `bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`
  - Detractor (0-6): `bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400`
- Churn risk indicator: `AlertTriangle` icon, `text-red-500`

**Churn Risk Alert Section**
- Background: `bg-red-50 dark:bg-red-900/20`
- Border: `border border-red-200 dark:border-red-800`
- Alert icon: `AlertTriangle` with `text-red-500`
- Action button: `bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md px-3 py-1 text-sm`

---

## 4. Email Survey Design

Since emails are plain text per PRD, provide visual reference for the plain-text format:

```
Subject: Quick question about LeadFlow AI

────────────────────────────────────────

Hi [Agent Name],

You've been using LeadFlow AI for two weeks now. 

Quick question: How likely are you to recommend 
LeadFlow AI to another real estate agent?

[0] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]
↑ Not likely              Very likely ↑

Or click here: [survey link]

────────────────────────────────────────

What's the #1 thing we could improve?

[Share your thoughts →]

────────────────────────────────────────

Thanks for helping us make LeadFlow better.

— The LeadFlow AI Team

[Unsubscribe] | [Privacy Policy]
```

**Email Design Notes:**
- Plain text only (no HTML per PRD)
- ASCII art scale for visual clarity
- Clear CTA links
- Minimal, scannable format

---

## 5. Color Palette Reference

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Background | `bg-white` | `bg-slate-950` | Page background |
| Card | `bg-white` | `bg-slate-900` | Cards, modals |
| Border | `border-slate-200` | `border-slate-800` | Borders, dividers |
| Text Primary | `text-slate-900` | `text-white` | Headlines |
| Text Secondary | `text-slate-600` | `text-slate-400` | Body text |
| Text Muted | `text-slate-500` | `text-slate-500` | Labels, hints |
| Primary | `bg-emerald-500` | `bg-emerald-500` | Buttons, selected states |
| Success | `text-emerald-600` | `text-emerald-400` | Positive indicators |
| Warning | `text-amber-500` | `text-amber-400` | Passives |
| Error | `text-red-500` | `text-red-400` | Detractors, errors |

---

## 6. Spacing & Typography

**Spacing Scale (Tailwind)**
- xs: 4px (`space-1`)
- sm: 8px (`space-2`)
- md: 16px (`space-4`)
- lg: 24px (`space-6`)
- xl: 32px (`space-8`)

**Typography**
- Font: Inter (already in use)
- Headlines: `font-semibold` or `font-bold`
- Body: `font-normal`
- Small/Labels: `text-sm` or `text-xs`

---

## 7. Animation Specs

**Modal Open**
- Overlay: `animate-in fade-in duration-200`
- Content: `animate-in zoom-in-95 duration-200`

**Modal Close**
- Overlay: `animate-out fade-out duration-150`
- Content: `animate-out zoom-out-95 duration-150`

**NPS Button Select**
- Scale: `scale-110` on select
- Duration: 150ms
- Easing: `ease-out`

**Feedback Button Expand**
- Animation: `animate-in slide-in-from-bottom-2 duration-200`

**Success Checkmark**
- Scale: `scale-0` → `scale-100`
- Duration: 300ms
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bounce)

---

## 8. Responsive Behavior

**Mobile (< 640px)**
- Modal: 90vw width, full padding
- NPS scale: Horizontal scroll or 2 rows (0-5, 6-10)
- Feedback button: Smaller, bottom-right with safe area inset
- Admin dashboard: Stack cards vertically, table becomes cards

**Tablet (640px - 1024px)**
- Modal: 480px width
- Admin dashboard: 2-column grid for stats

**Desktop (> 1024px)**
- Full layout as specified
- Admin dashboard: 3-column grid for stats

---

## 9. Accessibility Requirements

- All interactive elements must have focus states (`focus:ring-2 focus:ring-emerald-500`)
- NPS buttons: `role="radiogroup"` with individual `role="radio"`
- Modal: `role="dialog"`, `aria-modal="true"`, focus trap
- Close button: `aria-label="Close survey"`
- Color contrast: Minimum 4.5:1 for text
- Keyboard navigation: Tab through scale, Enter/Space to select

---

## 10. Asset Checklist

**Icons (from lucide-react)**
- [ ] X (close)
- [ ] MessageSquare (feedback button)
- [ ] ThumbsUp (positive feedback)
- [ ] ThumbsDown (detractor indicator)
- [ ] Bug (bug report)
- [ ] Lightbulb (idea)
- [ ] Frown (frustration)
- [ ] CheckCircle (success)
- [ ] TrendingUp/TrendingDown/Minus (trends)
- [ ] AlertTriangle (churn risk)
- [ ] Download (export)

**No image assets required** — all UI is icon + text based.

---

## Implementation Notes for Dev

1. Use existing shadcn/ui components where possible (Dialog, Button, Textarea)
2. NPS scale is a custom component — 11 buttons in a row
3. Feedback button uses Framer Motion or CSS transitions for expand/collapse
4. Admin charts can use Recharts or similar
5. All colors reference CSS variables from globals.css

---

## Files to Create

1. `components/nps/NPSSurveyModal.tsx` — In-app NPS survey
2. `components/nps/FeedbackButton.tsx` — Persistent feedback widget
3. `app/admin/nps/page.tsx` — Admin NPS dashboard
4. `components/nps/NPSScoreCard.tsx` — Reusable score display
5. `components/nps/ChurnRiskAlert.tsx` — Churn risk notification

---

## Review Checklist

- [ ] All designs follow existing dashboard patterns
- [ ] Colors match the emerald/slate theme
- [ ] Mobile layouts considered
- [ ] Accessibility requirements met
- [ ] Animation specs provided
- [ ] Component structure clear for dev handoff
