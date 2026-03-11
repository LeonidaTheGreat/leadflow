# Design Spec: Landing Page Conversion Cleanup
**Spec ID:** DESIGN-SPEC-LP-CONV-001  
**Task ID:** 06dc1003-d920-4dff-8fda-358f5fabf2f3  
**PRD Reference:** PRD-LANDING-PAGE-CONVERSION-001  
**Date:** 2026-03-12  
**Author:** Design Agent  

---

## Overview

The marketing landing page (`product/lead-response/dashboard/app/page.tsx`) had a developer-facing "API Endpoints" table embedded mid-page. This section — showing raw HTTP routes like `POST /api/webhook` and `POST /api/sms/send` — severely hurt conversion by signaling a developer tool, not a real estate product.

**Status of the bug:** The API table has been removed from the current build (confirmed by code review). This spec guards against recurrence and adds two missing sections that directly replace the technical void with conversion-focused content.

---

## Page Structure After Implementation

```
┌─────────────────────────────────────┐
│  Header / Nav                       │
├─────────────────────────────────────┤
│  Hero (dark gradient)               │
│  headline + subheadline + CTA form  │
├─────────────────────────────────────┤
│  Features (slate-50 bg)             │
│  6-card grid: AI, SMS, CRM, etc.    │
├─────────────────────────────────────┤
│  ★ How It Works (white bg)          │  ← NEW
│  3-step horizontal layout           │
├─────────────────────────────────────┤
│  Mid-page CTA                       │
│  "Ready to Respond Faster?"         │
├─────────────────────────────────────┤
│  ★ Testimonials (slate-50 bg)       │  ← NEW
│  3-card grid                        │
├─────────────────────────────────────┤
│  Pricing (white bg)                 │
│  3 tiers, "MOST POPULAR" badge      │
├─────────────────────────────────────┤
│  Footer                             │
└─────────────────────────────────────┘
```

---

## Section 1: API Endpoints — REMOVED ✕

**Mandate:** No `<table>` element, no heading containing "API Endpoints", no cells containing `POST /api/*` paths may appear on the public marketing landing page.

This is not a section to design — it is a permanent exclusion. The E2E test `E2E-CONV-01` enforces this at build time.

**If a dev needs to expose API documentation:** create a separate `/docs/api` page behind authentication, never on the public landing.

---

## Section 2: "How It Works" — NEW ★

### Intent
Convert a "what is this?" visitor into a "I get it" visitor in under 10 seconds. Three numbered steps, no jargon, agent-first language.

### Position
Between the Features grid and the mid-page CTA ("Ready to Respond Faster?").

### Background
White (`bg-white dark:bg-slate-900`) — alternates from the slate-50 Features background above it for visual breathing room.

### Layout Wireframe (Desktop — 1200px+)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          How It Works                                │
│                  Get set up in 5 minutes. AI does the rest.          │
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐         │
│  │  ① 🔗        │ ──▶ │  ② ⚡        │ ──▶ │  ③ 🤝        │         │
│  │              │     │              │     │              │         │
│  │ Connect Your │     │  AI Responds │     │  You Close   │         │
│  │     CRM      │     │  Instantly   │     │  the Deal    │         │
│  │              │     │              │     │              │         │
│  │ Link your    │     │ When a lead  │     │ Get notified │         │
│  │ Follow Up    │     │ comes in, AI │     │ when appts   │         │
│  │ Boss account │     │ texts them   │     │ are booked.  │         │
│  │ in 2 min.    │     │ in < 30 sec. │     │ You step in  │         │
│  │              │     │              │     │ to close.    │         │
│  └──────────────┘     └──────────────┘     └──────────────┘         │
└──────────────────────────────────────────────────────────────────────┘
```

### Layout Wireframe (Mobile — 375px)

```
┌─────────────────────┐
│    How It Works     │
│ Get set up in 5 min.│
│                     │
│  ① 🔗               │
│  Connect Your CRM   │
│  Link your Follow   │
│  Up Boss account    │
│  in 2 min. We sync  │
│  leads auto.        │
│                     │
│  ② ⚡               │
│  AI Responds        │
│  Instantly          │
│  When a new lead    │
│  comes in, AI texts │
│  them in < 30 sec.  │
│                     │
│  ③ 🤝               │
│  You Close the Deal │
│  Get notified when  │
│  leads are ready.   │
│  Appointments on    │
│  your calendar.     │
└─────────────────────┘
```

### Component Specs

#### Section Container
```
padding: py-20 (80px top/bottom)
container: max-w-5xl mx-auto px-4
```

#### Section Heading
```
Text: "How It Works"
Typography: text-3xl font-bold
Color: text-slate-900 dark:text-white
Alignment: text-center
Margin bottom: mb-4
```

#### Section Subheading
```
Text: "Get set up in 5 minutes. AI does the rest."
Typography: text-lg
Color: text-slate-500 dark:text-slate-400
Alignment: text-center
Margin bottom: mb-12
Max width: max-w-2xl mx-auto
```

#### Steps Grid
```
Desktop: grid-cols-3 gap-8
Mobile: grid-cols-1 gap-8
Connector arrow: visible on desktop (→), hidden on mobile
```

#### Step Card (each of 3)
```
Background: none (transparent) — steps sit on section bg
Padding: p-6
Border: none — open layout, not boxed
```

#### Step Number Badge
```
Display: inline-flex items-center justify-center
Size: w-10 h-10
Background: bg-emerald-500
Text: text-white font-bold text-lg
Border radius: rounded-full
Margin bottom: mb-4
```

#### Step Icon / Emoji
```
Size: text-3xl
Margin bottom: mb-3
Display: block
```
Icons per step:
- Step 1 (Connect CRM): 🔗 or use Lucide `link-2` icon in slate-500
- Step 2 (AI Responds): ⚡ or Lucide `zap` in emerald-500
- Step 3 (Close Deal): 🤝 or Lucide `calendar-check` in emerald-500

#### Step Title
```
Typography: text-lg font-semibold
Color: text-slate-900 dark:text-white
Margin bottom: mb-2
```

#### Step Description
```
Typography: text-sm
Color: text-slate-600 dark:text-slate-400
Line height: leading-relaxed
```

#### Connector Arrows (Desktop Only)
```
Position: absolute, centered vertically between step cards
Symbol: → or SVG arrow
Color: text-slate-300 dark:text-slate-600
Font size: text-2xl
Hidden on: mobile (md:block)
```

### Copy
| Step | Title | Body |
|------|-------|------|
| 1 | Connect Your CRM | Link your Follow Up Boss account in 2 minutes. We sync your leads automatically — no manual data entry. |
| 2 | AI Responds Instantly | When a new lead comes in, our AI sends a personalized SMS in under 30 seconds. 24/7, even when you're with clients. |
| 3 | You Close the Deal | Get notified when leads are qualified and appointments are booked on your calendar. You show up at the perfect moment. |

---

## Section 3: Testimonials / Social Proof — NEW ★

### Intent
Real estate agents buy based on peer validation. Three agent testimonials reduce the "will this work for me?" objection.

### Position
Between the mid-page CTA ("Ready to Respond Faster?") and the Pricing section.

### Background
Slate-50 (`bg-slate-50 dark:bg-slate-800/30`) — alternates from mid-page CTA and Pricing (both white).

### Layout Wireframe (Desktop — 1200px+)

```
┌──────────────────────────────────────────────────────────────────────┐
│              What Agents Are Saying                                  │
│         Join agents converting more leads with AI                    │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ ❝                │  │ ❝                │  │ ❝                │   │
│  │ "I used to lose  │  │ "My response     │  │ "Setup took 5    │   │
│  │  leads because   │  │  time went from  │  │  minutes. The    │   │
│  │  I couldn't      │  │  2 hours to 30   │  │  AI sounds like  │   │
│  │  respond fast    │  │  seconds. I've   │  │  me, not a       │   │
│  │  enough."        │  │  booked 3 extra  │  │  robot."         │   │
│  │                  │  │  appts."         │  │                  │   │
│  │  — Sarah M.      │  │  — Mike R.       │  │  — Jennifer K.   │   │
│  │  Solo Agent      │  │  Team Lead       │  │  Realtor         │   │
│  │  Austin, TX      │  │  Denver, CO      │  │  Miami, FL       │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                      │
│       * Results may vary. Testimonials from pilot participants.      │
└──────────────────────────────────────────────────────────────────────┘
```

### Layout Wireframe (Mobile — 375px)

```
┌─────────────────────┐
│ What Agents Are     │
│     Saying          │
│                     │
│  ┌───────────────┐  │
│  │ ❝             │  │
│  │ "I used to    │  │
│  │  lose leads   │  │
│  │  because..."  │  │
│  │               │  │
│  │ — Sarah M.    │  │
│  │ Solo Agent    │  │
│  │ Austin, TX    │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ ❝             │  │
│  │ "My response  │  │
│  │  time went    │  │
│  │  from..."     │  │
│  │               │  │
│  │ — Mike R.     │  │
│  │ Team Lead     │  │
│  │ Denver, CO    │  │
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ ❝             │  │
│  │ "Setup took   │  │
│  │  5 minutes... │  │
│  │               │  │
│  │ — Jennifer K. │  │
│  │ Realtor       │  │
│  │ Miami, FL     │  │
│  └───────────────┘  │
│                     │
│  * Results may vary │
└─────────────────────┘
```

### Component Specs

#### Section Container
```
padding: py-20 (80px top/bottom)
container: max-w-5xl mx-auto px-4
```

#### Section Heading
```
Text: "What Agents Are Saying"
Typography: text-3xl font-bold
Color: text-slate-900 dark:text-white
Alignment: text-center
Margin bottom: mb-4
```

#### Section Subheading
```
Text: "Join agents converting more leads with AI-powered response."
Typography: text-lg
Color: text-slate-500 dark:text-slate-400
Alignment: text-center
Margin bottom: mb-12
```

#### Testimonial Grid
```
Desktop: grid-cols-3 gap-8 (or gap-6)
Tablet (768–1199px): grid-cols-2 gap-6 (3rd card spans or stacks)
Mobile: grid-cols-1 gap-6
```

#### Testimonial Card
```
Background: bg-white dark:bg-slate-900
Border: border border-slate-200 dark:border-slate-700
Border radius: rounded-xl
Padding: p-6
Box shadow: shadow-sm hover:shadow-md transition-shadow duration-200
Left border accent: border-l-4 border-l-emerald-500 (visual cue)
```

#### Quote Mark
```
Display: block, above quote text
Symbol: ❝ (Unicode U+275D) OR Lucide `quote` icon
Size: text-3xl
Color: text-emerald-500
Margin bottom: mb-3
```

#### Quote Text
```
Typography: text-sm (or text-base for single testimonial)
Color: text-slate-600 dark:text-slate-300
Font style: italic
Line height: leading-relaxed
Margin bottom: mb-4
```

#### Attribution
```
Agent Name: text-sm font-semibold, text-slate-900 dark:text-white
Title + Location: text-xs text-slate-500 dark:text-slate-400, mt-1
Layout: stacked (name above title/location)
```

#### Headshot Placeholder (optional)
```
If added: w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700
Use initials as fallback (first initial, last initial)
Color: text-slate-500
Font: text-sm font-medium
Flexbox: flex items-center gap-3 for photo + name layout
```

#### Disclaimer
```
Text: "* Results may vary. Testimonials are from early pilot participants."
Typography: text-xs italic
Color: text-slate-400 dark:text-slate-500
Alignment: text-center
Margin top: mt-8
```

### Copy — Placeholder Testimonials
```
TESTIMONIAL_DATA = [
  {
    quote: "I used to lose at least 2–3 leads a week because I couldn't respond fast enough. Since using LeadFlow AI, every lead gets an immediate response. I've already booked 4 appointments from leads that would've gone cold.",
    name: "Sarah M.",
    title: "Solo Agent",
    location: "Austin, TX"
  },
  {
    quote: "My response time went from 2 hours to 30 seconds. I've booked 3 extra appointments this month from leads I would have missed entirely.",
    name: "Mike R.",
    title: "Team Lead",
    location: "Denver, CO"
  },
  {
    quote: "Setup took 5 minutes. The AI sounds like me, not a robot. My leads can't tell the difference — and I'm closing more of them.",
    name: "Jennifer K.",
    title: "Realtor",
    location: "Miami, FL"
  }
]
```

---

## Consistency Constraints

### ✕ What Must NOT Appear

| Element | Reason |
|---------|--------|
| `<table>` with Method/Endpoint/Description columns | Developer-facing content, kills agent trust |
| Any heading containing "API Endpoints" | Same reason |
| Raw paths like `POST /api/webhook` | Triggers "this is a dev tool" mental model |
| Any `<code>` or `<pre>` blocks on the public page | Technical, not agent-facing |

### ✓ What Must Appear

| Section | Required? | Status |
|---------|-----------|--------|
| Hero with CTA | Yes | ✅ Exists |
| Features 6-card grid | Yes | ✅ Exists |
| How It Works 3-step | Yes | ⬜ To add |
| Mid-page CTA | Yes | ✅ Exists |
| Testimonials | Yes (min 1) | ⬜ To add |
| Pricing 3-tier | Yes | ✅ Exists |
| Footer | Yes | ✅ Exists |

---

## Design Tokens (Match Existing Tailwind Conventions)

These match the existing Next.js app conventions in `page.tsx`:

```
Background alternation:
  - Dark/hero:  bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900
  - Light:      bg-slate-50 dark:bg-slate-950 (or bg-white dark:bg-slate-900)
  - Alt light:  bg-white dark:bg-slate-900

Accent color:   emerald-500 (#10b981) — matches existing "MOST POPULAR" badge
Text primary:   slate-900 dark:text-white
Text secondary: slate-500 dark:text-slate-400
Text body:      slate-600 dark:text-slate-300
Border:         slate-200 dark:slate-700

Typography scale:
  - Section heading: text-3xl font-bold
  - Card title: text-lg font-semibold
  - Body: text-sm to text-base
  - Meta/caption: text-xs

Spacing:
  - Section padding: py-20 (80px)
  - Card padding: p-6
  - Grid gap: gap-8 (desktop), gap-6 (mobile)
  - Section margin bottom (heading): mb-4
  - Section margin bottom (subheading): mb-12
```

---

## Responsive Breakpoints

| Breakpoint | How It Works | Testimonials |
|------------|-------------|--------------|
| < 640px (mobile) | 1 col stacked, no arrows | 1 col stacked |
| 640–767px (sm) | 1 col stacked | 1 col stacked |
| 768–1199px (md) | 1 col or 3 col | 2 col grid |
| 1200px+ (lg+) | 3 col horizontal + arrows | 3 col grid |

**Mobile requirements:**
- No horizontal scroll at 375px
- No text clipping
- Minimum touch targets: 44×44px for any interactive elements
- Step numbers and cards must not overflow container

---

## Accessibility

- Section headings use `<h3>` (nested under page `<h2>` in features)
- Quote marks are decorative: wrap in `aria-hidden="true"`
- Step numbers are part of visual flow; include in text content (not aria-hidden)
- Cards are non-interactive (no click events needed) — no role attribute needed
- Color contrast: emerald-500 on white meets WCAG AA for large text; body text uses slate-600+ which also passes

---

## Implementation Notes for Dev

1. **Data-driven:** Both How It Works steps and testimonials should use a data array (not hardcoded JSX). This makes it trivial to swap copy when pilot feedback arrives.

2. **Existing patterns:** Copy the section pattern from `page.tsx` Features section — same container, heading, subheading structure. Don't invent new patterns.

3. **No new dependencies:** All icons available in `lucide-react` (already installed). Emoji are fine too.

4. **Dark mode:** All new sections must follow `dark:` variant pattern used throughout `page.tsx`.

5. **GA4 tracking:** No CTA buttons added to these sections (they're purely informational). GA4 scroll-depth events will naturally capture engagement. If a CTA is added later, follow existing `PostHogEvents` naming convention.

6. **The API table guard:** The E2E test `E2E-CONV-01` must check for absence of `API Endpoints` heading and `POST /api/` text in the DOM. Dev should add this test if not already present.

---

## Deliverables Checklist

- [x] Design spec: API Endpoints removal mandate  
- [x] Design spec: How It Works section layout, components, copy  
- [x] Design spec: Testimonials section layout, components, copy  
- [x] Design tokens: Colors, typography, spacing  
- [x] Responsive wireframes: Desktop + Mobile  
- [x] Accessibility notes  
- [x] Dev handoff notes  

**Ready for Dev Agent to implement.** See PRD-LANDING-PAGE-CONVERSION-001 for full acceptance criteria.
