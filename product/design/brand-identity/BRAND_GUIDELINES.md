# LeadFlow AI — Brand Guidelines

## Overview
**Product:** AI Lead Response System for Real Estate Agents  
**Tagline:** "Never Miss a Lead Again"  
**Tone:** Professional, trustworthy, efficient, human-centered

---

## 1. Color Palette

### Primary Colors
- **Slate-900** (`#0f172a`) — Deep trust, primary actions, backgrounds
- **Emerald-500** (`#10b981`) — Positive outcomes, conversions, success states
- **Amber-500** (`#f59e0b`) — Urgency, pending leads, attention

### Secondary Colors
- **Blue-500** (`#3b82f6`) — Information, secondary actions
- **Slate-100** (`#f1f5f9`) — Light backgrounds, cards
- **Slate-300** (`#cbd5e1`) — Borders, subtle dividers

### Semantic Colors
- **Success:** Emerald-500 (`#10b981`)
- **Warning:** Amber-500 (`#f59e0b`)
- **Danger:** Red-500 (`#ef4444`)
- **Info:** Blue-500 (`#3b82f6`)
- **Neutral:** Slate-500 (`#64748b`)

### Usage Rules
- **Dark mode preferred** for mobile agents (reduces eye strain, battery efficient)
- **Lead priority indicators:**
  - 🔴 High priority = Amber-500 (warm, draws attention)
  - 🟢 Qualified = Emerald-500 (trust, success)
  - 🔵 Pending response = Blue-500 (neutral, pending)
  - ⚪ Closed/Completed = Slate-400 (neutral, passive)

---

## 2. Typography

### Font Family
- **Primary Font:** Inter (sans-serif, open-source via Google Fonts)
- **Fallback:** -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

### Type Scale
```
H1 (Headline)      → 32px, Bold (700), Line-height 1.2
H2 (Subheading)    → 24px, Semi-bold (600), Line-height 1.3
H3 (Section)       → 18px, Semi-bold (600), Line-height 1.4
Body (Default)     → 14px, Regular (400), Line-height 1.5
Caption/Small      → 12px, Regular (400), Line-height 1.4
Button/Label       → 13px, Semi-bold (600), Line-height 1.4
```

### Emphasis
- **Bold** for CTAs, lead names, critical metrics
- **Semi-bold** for section headers, field labels
- **Regular** for body text, descriptions, timestamps

---

## 3. Logo Concept

### Design: "LeadFlow" Mark
```
┌─────────────────────────┐
│   ▌█ ▄ ▄ ▄ ▄ ▄ ▄   │
│   ▄ █ ▄ ▄ ▄ ▄ ▄▄   │
│   ▄ █ ▌█ ▌█ ▌█ █   │
└─────────────────────────┘
```

**Concept:** Flowing arrows (→) ascending upward, suggesting:
- **Flow:** Leads moving through system
- **Growth:** Arrow pointing up (conversions increasing)
- **Movement:** Dynamic, not static

**Logo Versions:**
1. **Full Logo** — Mark + "LeadFlow AI" wordmark (horizontal, for landing pages)
2. **Mark Only** — Icon only (for app, favicons, buttons)
3. **Stacked** — Mark above wordmark (for vertical layouts)
4. **Monochrome** — Black & white for printing, grayscale contexts

**Mark Specs:**
- Minimum size: 32px × 32px
- Padding: ≥ 25% of mark size on all sides
- Colors: Emerald-500 (primary), Slate-900 (text)

---

## 4. Spacing & Layout

### Grid System
- **Base unit:** 4px
- **Multiples:** 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px

### Component Spacing
- **Card padding:** 16px or 20px
- **Section gap:** 24px (between major sections)
- **List item gap:** 12px
- **Button padding:** 8px (vert) × 12px (horiz) — compact, mobile-optimized

### Margins
- **Page margins (mobile):** 12px–16px
- **Page margins (tablet+):** 24px–32px
- **Section margins:** 24px vertical

---

## 5. Component Styles (shadcn/ui + Tailwind)

### Buttons
```
Primary:      bg-emerald-500 text-white rounded-lg py-2 px-3 text-sm font-semibold
Secondary:    bg-slate-200 text-slate-900 rounded-lg py-2 px-3 text-sm font-semibold
Ghost:        text-slate-600 hover:bg-slate-100 rounded-lg py-2 px-3
Danger:       bg-red-500 text-white rounded-lg py-2 px-3 text-sm font-semibold
```

### Inputs
```
Base:         border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500
State:        disabled: bg-slate-100 text-slate-400
Error:        border-red-500 focus:ring-red-500
```

### Cards
```
Base:         bg-slate-50 border border-slate-200 rounded-lg p-4
Dark mode:    bg-slate-900 border border-slate-800 text-slate-50
```

### Badges/Tags
```
Success:      bg-emerald-100 text-emerald-800 rounded-full px-2 py-1 text-xs font-medium
Warning:      bg-amber-100 text-amber-800 rounded-full px-2 py-1 text-xs font-medium
```

---

## 6. Mobile-First Design Rules

1. **Touch targets:** Minimum 44px × 44px (iOS recommendation)
2. **Readability:** Minimum 14px for body text, 13px acceptable for labels
3. **One-column layouts:** Stack everything vertically on mobile
4. **Action buttons:** Bottom sheet or floating action button (FAB)
5. **Thumb zone:** Important actions in lower 50% of screen
6. **Density:** Compact but not cramped—12px gaps between items

---

## 7. Accessibility

- **Color contrast:** 4.5:1 minimum (WCAG AA) for text
- **Focus states:** Visible ring on all interactive elements
- **Icons + text:** Always pair icons with labels in buttons
- **Dark mode:** Background contrast 5:1 minimum

---

## 8. Theming (Dark Mode Default)

```css
/* Light theme (fallback) */
--bg-primary: #f1f5f9
--bg-secondary: #ffffff
--text-primary: #0f172a
--text-secondary: #64748b
--accent: #10b981

/* Dark theme (default for app) */
--bg-primary: #0f172a
--bg-secondary: #1e293b
--text-primary: #f1f5f9
--text-secondary: #cbd5e1
--accent: #10b981
```

---

## Files Included

- `logo-concepts.md` — Logo variations and usage
- `tailwind-config.js` — Tailwind CSS customization
- `component-library.md` — Ready-to-use components
