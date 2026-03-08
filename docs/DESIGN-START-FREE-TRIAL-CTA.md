# Design Spec: Start Free Trial CTA — Frictionless Trial Entry
**Task ID:** eb70abc2-bb27-495b-9262-0d67acb6d862  
**Use Case:** feat-start-free-trial-cta  
**Status:** Complete  
**Author:** Design Agent  
**Date:** 2026-03-07  

---

## Overview

This spec covers visual design and component layout for all three "Start Free Trial" CTA placements on the landing page, the trial-mode signup page, and the trial status badge in the dashboard nav.

Design language inherits the existing codebase:
- **Background:** `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
- **Brand color:** Emerald — `#10b981` (`emerald-500`) / `#059669` (`emerald-600`)
- **Text hierarchy:** `text-white` → `text-slate-300` → `text-slate-400`
- **Cards:** `border-slate-700 bg-slate-800/50 backdrop-blur-sm`
- **Primary buttons:** `bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700`
- **Form inputs:** `bg-slate-900 border-slate-600 text-white`

---

## 1. Landing Page — Hero Section Redesign

### Layout (1280px desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER: LeadFlow AI logo (left) · Pricing link · Sign In (right) │
│         + [Start Free Trial] ghost/outline button (nav, right)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   [Pill badge]  ✦ Built for Real Estate Agents · Free for 30 days │
│                                                                   │
│   HEADLINE (56px bold, white, centered):                          │
│   "Never Miss Another Lead.                                       │
│    AI Responds in 30 Seconds."                                    │
│                                                                   │
│   SUBHEADLINE (20px, slate-300, centered, max-w 560px):           │
│   "LeadFlow AI qualifies your leads, texts them instantly, and    │
│    books appointments — so you can focus on closing deals."       │
│                                                                   │
│   ┌────────────────────────────────────────┐                     │
│   │  Email input (inline, 320px wide)      │  [Start Free Trial] │
│   │  placeholder: "Work email address"     │  (emerald gradient) │
│   └────────────────────────────────────────┘                     │
│   ↳ OR: Single button → navigates to /signup?mode=trial          │
│                                                                   │
│   🔒 Free for 30 days · No credit card · Cancel anytime          │
│      (12px, slate-400, centered, with Lock icon)                  │
│                                                                   │
│   ─────────── Secondary ──────────                               │
│   [▶ See How It Works]  (ghost button, slate-600 border, white)   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (375px)

- Headline: 36px, 2 lines max
- Email input stacks above CTA button (full width)
- Trust line: single row with wrapping allowed
- Secondary CTA: below trust line, full width ghost button

### Header Nav Addition

Add to existing nav (right side, before "Sign In"):

```
[ Start Free Trial ]   Sign In
```

- "Start Free Trial": `bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium`
- Links to `/signup?mode=trial`

### Hero Pill Badge

```css
display: inline-flex
align-items: center
gap: 6px
background: rgba(16, 185, 129, 0.12)   /* emerald-500/12 */
border: 1px solid rgba(16, 185, 129, 0.35)
color: #6ee7b7                          /* emerald-300 */
padding: 4px 12px
border-radius: 999px
font-size: 13px
font-weight: 500
margin-bottom: 24px
```

Content: `✦ Now in Pilot — Free 30-day Pro Trial`

### Hero CTA — Two Layout Options

**Option A (Recommended): Inline email capture**

```
┌──────────────────────────────────┐ ┌───────────────────────────┐
│ 📧  Work email address           │ │   Start Free Trial →      │
│     (input, bg-slate-800,        │ │   (emerald gradient btn)   │
│      border-slate-600)           │ │   height: 52px             │
└──────────────────────────────────┘ └───────────────────────────┘
```
Width: input 300px, button 200px, gap 8px. Container: max-w 520px centered.

**Option B: Single button (simpler)**

```
┌───────────────────────────────────────┐
│      Start Free Trial — Free 30 Days  │
│         (emerald gradient, full CTA)  │
└───────────────────────────────────────┘
```
Width: 280px, height: 56px, font-size: 18px font-semibold

**Recommendation:** Option A for desktop (higher conversion signal), Option B on mobile.

---

## 2. Trial Signup Page (`/signup?mode=trial`)

### Page Layout

```
┌─────────────────────────────────────────────────┐
│  bg-gradient-to-br from-slate-900 via-slate-800  │
│  to-slate-900 (full page)                        │
│                                                  │
│  Background glows (decorative, pointer-none):    │
│  · top-right: emerald-500/10, blur-3xl, 320px    │
│  · bottom-left: blue-500/10, blur-3xl, 320px     │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  HEADER (border-b border-slate-700/50)     │  │
│  │  LeadFlow AI logo (left)    Sign In (right)│  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│             ┌───────────────────┐                │
│             │  LeadFlow AI logo │                │
│             │  (centered mark)  │                │
│             └───────────────────┘                │
│                                                  │
│   HEADLINE (32px bold, white, centered):          │
│   "Start Your Free 30-Day Trial"                 │
│                                                  │
│   SUBHEADLINE (16px, slate-300, centered):        │
│   "No credit card. No commitment. Just results." │
│                                                  │
│   ┌─────────────────────────────────────────┐   │
│   │  CARD (max-w: 420px, mx-auto)           │   │
│   │  bg: slate-800/50  border: slate-700    │   │
│   │  border-radius: 16px  padding: 32px     │   │
│   │                                         │   │
│   │  [Optional] Your name (placeholder)    │   │
│   │  hint: "Optional — personalize later"   │   │
│   │                                         │   │
│   │  Work email address *                   │   │
│   │  [📧  you@brokerage.com             ]   │   │
│   │                                         │   │
│   │  Password * (min 8 characters)          │   │
│   │  [🔒  ●●●●●●●●                    👁]   │   │
│   │                                         │   │
│   │  ┌─────────────────────────────────┐   │   │
│   │  │   Create My Free Account  →     │   │   │
│   │  │   (emerald gradient, full width)│   │   │
│   │  │   height: 52px                  │   │   │
│   │  └─────────────────────────────────┘   │   │
│   │                                         │   │
│   │  🔒 Free for 30 days  ·  No credit card  │   │
│   │     Cancel anytime                     │   │
│   │  (12px, slate-400, centered, icon row)  │   │
│   │                                         │   │
│   └─────────────────────────────────────────┘   │
│                                                  │
│   Already have an account? [Sign in →]           │
│   (14px, slate-400 · emerald-400 link)           │
│                                                  │
│   ─────────────────────────────────────────      │
│   Looking for the Pilot Program?                 │
│   [Apply for the LeadFlow Pilot →]               │
│   (13px, slate-500, centered, links to /pilot)   │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Form Field Specs

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Your name | text | No | Placeholder: "Your name (optional)" · helper text below |
| Work email | email | Yes | Icon: `<Mail>` (Lucide), 16px, left-inset |
| Password | password | Yes | Icon: `<Lock>` left, `<Eye>/<EyeOff>` right toggle |

**Field styling (all inputs):**
```css
background: bg-slate-900
border: 1px solid border-slate-600
color: text-white
placeholder: text-slate-500
padding: pl-10 pr-4 py-3
border-radius: 8px
focus: ring-2 ring-emerald-500/40 border-emerald-500
transition: all 150ms ease
```

### Error States

**Inline field error (below field):**
```
color: text-red-400
font-size: 12px
margin-top: 4px
icon: ⚠ (inline, 12px)
```

**Form-level error banner:**
```
bg: bg-red-500/10
border: border-red-500/50
color: text-red-400
padding: 12px 16px
border-radius: 8px
font-size: 14px
```

Error messages (per PRD):
- Duplicate email: `"An account with this email already exists. Sign in instead."`
  → "Sign in instead" is a clickable link to `/login`
- Invalid email: `"Please enter a valid email address"`
- Password too short: `"Password must be at least 8 characters"`
- Network error: `"Something went wrong. Please try again."`

### Loading State

During form submit, button changes to:
```
[ ⟳ Creating your account... ]
(spinner animation, button disabled, opacity 80%)
```

### Trust Signals Block (below submit button)

```
┌─────────────────────────────────────────┐
│  🔒 Free for 30 days  ·  No credit card  │
│         ·  Cancel anytime               │
└─────────────────────────────────────────┘
```
- Font: 12px, slate-400
- Separator: `·` (mid-dot, slate-600)
- Lock icon: `<Lock>` Lucide, 12px, slate-500, inline-left

---

## 3. Features Section CTA Placement

Insert after the 3-column feature cards grid, before any next section:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│         ─────────── Ready to see it in action? ───────────       │
│                                                                   │
│         [  Start Free Trial — 30 Days Free  →  ]                 │
│                  (emerald gradient, 260px wide, centered)         │
│                                                                   │
│         No credit card required · Takes 60 seconds               │
│             (13px, slate-400, centered)                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Component name:** `<FeaturesSectionCTA />`

Styling:
```css
margin-top: 48px
text-align: center
padding: 48px 0
border-top: 1px solid rgba(148, 163, 184, 0.1)   /* slate-400/10 */
```

Separator text: `text-slate-400 text-sm font-medium tracking-wide uppercase`

---

## 4. Pricing Section CTA Placement

Each pricing card already has a primary CTA. Add a secondary "or start free" link below each:

```
┌──────────────────────────────────┐
│  Professional    $997/mo         │
│  ████████████████████████████    │
│  [ Start Free Trial  →    ]      │   ← Primary (emerald)
│  or  [start a free 30-day trial] │   ← Secondary link (below)
│  ─────────────────────────────   │
│  ✓ Feature list...               │
└──────────────────────────────────┘
```

Secondary link styling:
```css
display: block
text-align: center
margin-top: 8px
font-size: 13px
color: text-slate-400
hover: text-emerald-400
transition: color 150ms ease
```

Link text: `"or start a free 30-day trial"`  
Link destination: `/signup?mode=trial`

**For the bottom CTA section of the pricing page** (currently has "Contact our sales team"), add above it:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   Not sure which plan? Start with a free trial.                  │
│   (18px, slate-200, centered)                                     │
│                                                                   │
│   [ Start Free Trial — No Credit Card  →  ]                      │
│   (emerald gradient, 300px, centered)                            │
│                                                                   │
│   ─────  or  ─────                                               │
│   Questions? Contact our sales team                              │
│   (existing line, moved below)                                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Dashboard Nav — Trial Status Badge

### Placement

Inside `DashboardNav`, right side — between the existing status indicator and any user avatar/menu:

```
┌────────────────────────────────────────────────────────────────┐
│ LeadFlow AI  │ Lead Feed · History · Analytics  [⬤ Online]    │
│              │                    [Trial · 28d] [Settings ▾]  │
└────────────────────────────────────────────────────────────────┘
```

### Badge Variants

**Normal (> 7 days remaining):**
```css
display: inline-flex
align-items: center
gap: 6px
padding: 3px 10px
border-radius: 999px
background: rgba(16, 185, 129, 0.12)   /* emerald-500/12 */
border: 1px solid rgba(16, 185, 129, 0.30)
color: #6ee7b7                          /* emerald-300 */
font-size: 12px
font-weight: 600
```

Content: `Trial · 28d left`  
Link: wraps entire badge, navigates to `/settings/billing`

**Warning (≤ 7 days remaining):**
```css
background: rgba(239, 68, 68, 0.12)    /* red-500/12 */
border: 1px solid rgba(239, 68, 68, 0.35)
color: #fca5a5                          /* red-300 */
```

Content: `⚠ Trial expires in 3d`  
Adds a pulsing dot indicator:
```css
width: 6px
height: 6px
border-radius: 50%
background: #ef4444   /* red-500 */
animation: pulse 1.5s ease-in-out infinite
```

**Upgrade prompt (on click or hover of badge):**

Small tooltip/popover above badge:
```
┌─────────────────────────────────┐
│  Your trial ends in 3 days      │
│  [ Upgrade to Pro — $149/mo → ] │
└─────────────────────────────────┘
```
Background: slate-800, border-slate-700, shadow-lg, rounded-lg, 200px width.

---

## 6. Visual Tokens Summary

| Token | Value |
|-------|-------|
| Brand primary | `#10b981` (emerald-500) |
| Brand primary dark | `#059669` (emerald-600) |
| Brand glow | `rgba(16,185,129,0.10)` |
| Success text | `#6ee7b7` (emerald-300) |
| Warning | `#ef4444` (red-500) |
| Warning text | `#fca5a5` (red-300) |
| Page bg | `from-slate-900 via-slate-800 to-slate-900` |
| Card bg | `rgba(30,41,59,0.5)` (slate-800/50) |
| Card border | `#334155` (slate-700) |
| Input bg | `#0f172a` (slate-900) |
| Body text | `#cbd5e1` (slate-300) |
| Muted text | `#94a3b8` (slate-400) |
| Disabled text | `#64748b` (slate-500) |

---

## 7. Component Architecture

Dev should build these new or updated components:

### New Components

| Component | Route/Location | Notes |
|-----------|---------------|-------|
| `<HeroSection />` | `app/page.tsx` | Replace existing hero |
| `<TrialSignupForm />` | `app/signup/page.tsx` | New `mode=trial` branch |
| `<FeaturesSectionCTA />` | `app/page.tsx` | After features grid |
| `<TrialBadge />` | `app/dashboard/layout.tsx` | In `DashboardNav` |

### Modified Components

| Component | Change |
|-----------|--------|
| `app/page.tsx` | Redesign hero, add `<FeaturesSectionCTA />` |
| `app/signup/page.tsx` | Add `?mode=trial` path (2-field, no plan select) |
| `app/pricing/page.tsx` | Add secondary "start free trial" links + bottom CTA section |
| `app/dashboard/layout.tsx` | Add `<TrialBadge />` to nav |

---

## 8. Accessibility Checklist (WCAG 2.1 AA)

- All form inputs have associated `<Label>` elements (htmlFor/id pair)
- Error messages announced via `aria-live="polite"` or `role="alert"`
- Color contrast: emerald-300 on slate-900 = ~7:1 ✅
- Focus ring: `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`
- Password toggle button: `aria-label="Show password"` / `"Hide password"`
- Submit button: `aria-disabled={loading}` during processing
- Badge: `aria-label="Trial: 28 days remaining. Click to upgrade."`

---

## 9. Responsive Breakpoints

| Breakpoint | Key Changes |
|-----------|-------------|
| `sm` (640px) | Hero CTA stacks vertically, full-width inputs |
| `md` (768px) | Feature grid 3-col → 1-col |
| `lg` (1024px) | Full desktop layout restored |

Mobile nav: add "Start Free Trial" as a full-width button at bottom of mobile menu drawer (if nav is hamburger-collapsible).

---

## 10. Animation / Motion

Keep minimal — functional, not decorative:

- Form submit loading: `animate-spin` on `<Loader2>` (existing pattern)
- Trial badge warning pulse: CSS `animation: pulse 1.5s ease-in-out infinite`
- Button hover: `transition-all duration-150` (existing pattern)
- No page transition animations needed

---

## 11. Pilot Program Link Preservation

On the trial signup page (`/signup?mode=trial`), add at the very bottom:

```
┌────────────────────────────────────────────────────┐
│ Looking for the Pilot Program?                     │
│ [Apply for the LeadFlow Pilot →]                   │
│ (links to /pilot · text-slate-500 hover:slate-300) │
└────────────────────────────────────────────────────┘
```

This preserves `source = 'pilot_application'` path without cluttering the main flow.

---

## 12. Design Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Option A inline email in hero | Reduces clicks to trial start; email capture before redirect means we own the lead even on bounce |
| Name field optional in trial form | Every required field = friction lost. Name can be collected in onboarding wizard |
| Trust signals inline (not hover) | PRD requirement: "No Credit Card" must be visible without hover |
| Trial badge as pill, not banner | Avoids dashboard clutter (PRD Design Notes). Pill is subtle; banner is alarming |
| Secondary "free trial" link under pricing CTAs | Pricing section visitors are evaluating cost; a free trial escape hatch reduces bounce |
| Warning badge only at ≤ 7 days | Earlier = annoying. 7-day window gives users time to upgrade without feeling pressured daily |

---

*End of design spec. Proceed to dev implementation.*
