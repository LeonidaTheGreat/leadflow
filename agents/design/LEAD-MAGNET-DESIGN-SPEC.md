# Design Spec: Lead Magnet / Email Capture Section
**Feature:** feat-lead-magnet-email-capture  
**Task ID:** 58543774-f266-45e5-a637-df5c61a8f67b  
**Design Agent:** Design  
**Date:** 2026-03-07  
**Status:** ✅ Complete — Ready for Dev Agent

---

## 1. Overview

A dedicated email capture section inserted into the landing page between the **Features section** and **Social Proof section**. It offers the "5-Minute AI Lead Response Playbook" PDF as a lead magnet, converting visitors who are curious but not yet ready to sign up.

---

## 2. Page Placement

```
[Scarcity Banner]
[Navigation]
[Hero Section]           ← existing
[Features Section]       ← existing (bg-muted/50)
───────────────────────
[LEAD MAGNET SECTION]    ← NEW — insert here
───────────────────────
[Social Proof Section]   ← existing
[CTA Section]            ← existing (bg-primary)
[Footer]                 ← existing
```

**Rationale:** After features builds interest, this section catches visitors who believe in the product but aren't ready to commit — the perfect moment to offer a free resource as a trust builder.

---

## 3. Visual Design

### 3.1 Background Treatment

The section uses a **gradient background** to visually distinguish it from adjacent sections and signal "this is a gift, not a sales pitch":

```
background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)
```

- In dark mode: `linear-gradient(135deg, hsl(220 25% 8%) 0%, hsl(220 25% 10%) 100%)`
- In Tailwind: `bg-gradient-to-br from-sky-50 via-blue-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800`
- The gradient is subtle — it evokes calm trustworthiness, not a promotional banner
- Border top and bottom: `border-y border-sky-100 dark:border-slate-700`

### 3.2 Layout — Desktop (≥ 768px)

```
┌────────────────────────────────────────────────────────────────┐
│  bg-gradient-to-br from-sky-50 via-blue-50 to-emerald-50       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  container (max-w-4xl) — centered, py-16 lg:py-24        │  │
│  │                                                          │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────┐ │  │
│  │  │  LEFT COLUMN (55%)   │  │  RIGHT COLUMN (45%)       │ │  │
│  │  │                      │  │                           │ │  │
│  │  │  📘 [PDF COVER]      │  │  eyebrow label            │ │  │
│  │  │                      │  │  H2 headline              │ │  │
│  │  │  Illustrated         │  │  subheadline              │ │  │
│  │  │  book/PDF mockup     │  │                           │ │  │
│  │  │  (120×150px)         │  │  ✓ bullet  ✓ bullet       │ │  │
│  │  │                      │  │  ✓ bullet                 │ │  │
│  │  │                      │  │                           │ │  │
│  │  │                      │  │  [email input]            │ │  │
│  │  │                      │  │  [CTA button]             │ │  │
│  │  │                      │  │                           │ │  │
│  │  │                      │  │  trust line               │ │  │
│  │  └──────────────────────┘  └──────────────────────────┘ │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

### 3.3 Layout — Mobile (< 768px)

```
┌─────────────────────────┐
│  bg-gradient ...        │
│  py-12 px-4             │
│                         │
│  [eyebrow label]        │
│  [H2 headline]          │
│  [subheadline]          │
│                         │
│  ✓ bullet               │
│  ✓ bullet               │
│  ✓ bullet               │
│                         │
│  [PDF cover - centered] │
│                         │
│  [email input]          │
│  [CTA button — full W]  │
│                         │
│  trust line             │
│                         │
└─────────────────────────┘
```

On mobile: PDF mockup drops below bullets to maintain reading flow. CTA button goes full-width.

---

## 4. Component Anatomy

### 4.1 Eyebrow Label
```
FREE RESOURCE  ←  small caps, uppercase
```
- Font: `text-xs font-semibold tracking-widest uppercase`
- Color: `text-sky-600 dark:text-sky-400`
- Background pill: `bg-sky-100 dark:bg-sky-900/30 rounded-full px-3 py-1`
- Margin: `mb-3`

### 4.2 Headline (H2)
```
Not ready to start yet?
Get the free playbook.
```
- Font: `text-3xl md:text-4xl font-bold tracking-tight leading-tight`
- Color: `text-foreground`
- Margin: `mb-3`
- Line breaks: natural (no forced breaks needed)

### 4.3 Subheadline
```
The 5-Minute AI Lead Response Playbook — how top agents
never miss a lead (and convert 3× more).
```
- Font: `text-base md:text-lg text-muted-foreground`
- Max width: `max-w-sm` (within the column)
- Margin: `mb-5`

### 4.4 Benefit Bullets
Three bullets with checkmark icons:
```
✓  The exact framework top-producing agents use to respond first
✓  Why 5 minutes is the make-or-break window (with data)
✓  How AI handles it automatically — so you never miss a lead
```
- Icon: `CheckCircle` (lucide-react), `h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0`
- Text: `text-sm text-foreground`
- Layout: `flex items-start gap-2`
- List gap: `space-y-2`
- Container: `mb-6`

### 4.5 Form

#### Email Input (with optional first name)
The form has **two fields on desktop, stacked on mobile**:

**Desktop layout:**
```
┌─────────────────┐ ┌────────────────┐ ┌────────────────────────┐
│  First name     │ │  Email address │ │  Send Me the Playbook → │
│  (optional)     │ │               │ │                          │
└─────────────────┘ └────────────────┘ └────────────────────────┘
```

Wait — PRD says first name is optional. Given limited space on a 2-column layout, keep it simple:

**Simplified layout (recommended):**
```
┌────────────────────────────────────────────┐
│  Your email address                        │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│  Send Me the Playbook →                    │
└────────────────────────────────────────────┘
```

- Email input: full-width, `h-11`, `rounded-md border border-input`
- CTA button: full-width, `h-11`, below the input with `mt-2 gap`
- Or side-by-side: `flex gap-2` — input flex-1, button fixed-width `w-auto px-6 whitespace-nowrap`
- **Recommended: side-by-side on desktop, stacked on mobile**

#### Email Input Specs
- Placeholder: `"Enter your email address"`
- Type: `email`, required
- Height: `h-11` (44px)
- Border: `border-input` standard
- Focus ring: `focus-visible:ring-ring focus-visible:ring-2`
- Corner radius: `rounded-md`
- Font: `text-sm`

#### CTA Button Specs
- Label: **"Send Me the Playbook"**
- Icon: `ArrowRight` (lucide), `h-4 w-4 ml-2`
- Background: `bg-primary` (same blue as nav CTA — consistency)
- Text: `text-primary-foreground`
- Height: `h-11`
- Corner radius: `rounded-md`
- Font: `text-sm font-semibold`
- Hover: `hover:bg-primary/90`
- Loading state: spinner replacing the arrow icon, button disabled, text stays "Send Me the Playbook"

#### Form Container
- `max-w-md` — constrains to readable width on desktop column
- Below bullets, above trust line

### 4.6 Trust Line
```
🔒  No spam. Unsubscribe anytime. Delivered in 60 seconds.
```
- Layout: `flex items-center gap-1.5 text-xs text-muted-foreground mt-3`
- Icon: `Shield` (lucide-react), `h-3.5 w-3.5`
- No bullet/separator between clauses — the commas suffice

### 4.7 PDF / Playbook Mockup

A visual representation of the downloadable guide — not an actual PDF, just an illustrative element that communicates "this is a real document."

**Option A — Simple Book Illustration (recommended for v1):**
```
┌──────────────────────┐
│  ░░░░░░░░░░░░░░░░░░  │  ← background (sky-700)
│  ░                ░  │
│  ░   📘           ░  │
│  ░                ░  │
│  ░  THE 5-MINUTE  ░  │
│  ░  AI LEAD       ░  │
│  ░  RESPONSE      ░  │
│  ░  PLAYBOOK      ░  │
│  ░                ░  │
│  ░  LeadFlow  ⚡  ░  │
│  ░                ░  │
└──────────────────────┘
```

Implemented as a styled `div` — no external image needed:
- Container: `w-36 h-44 rounded-lg shadow-2xl`
- Background: `bg-gradient-to-b from-sky-700 to-sky-900`
- Inner padding: `p-4`
- Title text: `text-white text-sm font-bold leading-tight`
- Brand line: `text-sky-300 text-xs flex items-center gap-1`
- Slight rotation: `rotate-3 hover:rotate-0 transition-transform duration-300`
- Drop shadow: `shadow-xl shadow-sky-900/30`

**Option B — with subtle 3D perspective (for polish):**  
Add a right-edge strip (`w-2 bg-sky-600 rounded-r`) and bottom edge (`h-1.5 bg-sky-600`) to simulate a book spine. Dev can implement as CSS perspective if desired.

### 4.8 Success State

When the form submits successfully, **replace the entire form + bullets with:**

```
┌────────────────────────────────────────────┐
│                                            │
│            🎉                              │
│                                            │
│   Check your inbox!                        │
│   We just sent your playbook.             │
│                                            │
│   While you're here, see how              │
│   LeadFlow puts this into practice ↓      │
│                                            │
│   [Try LeadFlow Free →]                   │
│                                            │
└────────────────────────────────────────────┘
```

- Icon: Large emoji `text-4xl` or a `CheckCircle` icon in `text-emerald-500 h-12 w-12`
- Headline: `text-xl font-semibold`
- Body: `text-sm text-muted-foreground mt-1`
- Upsell CTA: subtle text link → `text-primary text-sm underline-offset-4 hover:underline`
- Animate in: `animate-in fade-in slide-in-from-bottom-4 duration-500`

### 4.9 Error State

Inline, below the input:
```
[email input — with red border]
⚠ Please enter a valid email address.
```

- Input border changes: `border-destructive focus-visible:ring-destructive`
- Error text: `text-xs text-destructive mt-1 flex items-center gap-1`
- Icon: `AlertCircle h-3.5 w-3.5 text-destructive`
- Error clears when user types again

---

## 5. Design Tokens (Reference)

Matches existing landing page token system:

| Token | Value | Usage |
|-------|-------|-------|
| `bg-background` | white / slate-950 | Base page background |
| `bg-muted/50` | slate-100/50% | Features section alt bg |
| `bg-primary` | sky-600 | CTA buttons |
| `text-primary` | sky-600 | Links, accents |
| `text-muted-foreground` | slate-500 | Secondary text |
| `border-input` | slate-200 | Input borders |
| `text-destructive` | red-500 | Error states |
| `text-emerald-500` | #10b981 | Success checkmarks |
| `text-sky-600` | #0284c7 | Eyebrow label |
| `shadow-2xl` | — | PDF mockup depth |

---

## 6. Typography Scale

| Element | Class |
|---------|-------|
| Eyebrow | `text-xs font-semibold tracking-widest uppercase` |
| H2 | `text-3xl md:text-4xl font-bold tracking-tight` |
| Subheadline | `text-base md:text-lg text-muted-foreground` |
| Bullet text | `text-sm text-foreground` |
| Input | `text-sm` |
| Button | `text-sm font-semibold` |
| Trust line | `text-xs text-muted-foreground` |

---

## 7. Spacing & Layout

```
Section:  py-16 lg:py-24
Container: container max-w-5xl mx-auto px-4 md:px-6
Grid gap:  gap-12 md:gap-16
Eyebrow → H2:  mb-3
H2 → Sub:  mb-3
Sub → Bullets: mb-5
Bullets → Form: mb-6 (combined with bullets container)
Input → Button: gap-2 (side-by-side) or mt-2 (stacked)
Form → Trust: mt-3
```

---

## 8. Motion & Interaction

| State | Behavior |
|-------|----------|
| Section scroll into view | `lead_magnet_view` GA4 event fires via IntersectionObserver |
| PDF mockup hover | `hover:rotate-0 transition-transform duration-300` (from `rotate-3`) |
| Button hover | `hover:bg-primary/90` |
| Button loading | Spinner icon, `disabled:opacity-50 disabled:cursor-not-allowed` |
| Form → success | `animate-in fade-in slide-in-from-bottom-4 duration-500` (tailwind-animate) |
| Error appearance | No animation — immediate, inline |

---

## 9. Responsive Breakpoints

| Breakpoint | Layout |
|-----------|--------|
| `< 640px` (mobile) | Stack: eyebrow → headline → sub → bullets → PDF mockup (centered) → form → trust |
| `640px–767px` (sm) | Same as mobile, wider container |
| `≥ 768px` (md+) | Two-column: PDF mockup left, copy + form right |

**Mobile-specific notes:**
- PDF mockup: `mx-auto my-6` (centered, below bullets)
- Input + button: `flex-col` (full-width stacked)
- Button: `w-full`
- Minimum touch target: `h-11` (44px) for both input and button

---

## 10. Component Interface (for Dev)

The dev agent should implement a `<LeadMagnetSection />` React component:

```typescript
// Component accepts no props — self-contained section
// Internal state:
//   email: string
//   firstName: string (optional)
//   status: 'idle' | 'loading' | 'success' | 'error'
//   errorMessage: string | null

interface LeadMagnetSectionProps {
  // Optional: override for testing
  onSuccess?: (email: string) => void
}
```

**API call:**
```typescript
POST /api/lead-capture
Body: {
  email: string,
  firstName?: string,
  source: 'landing-page',
  utmSource?: string,    // read from URL params or cookie
  utmMedium?: string,
  utmCampaign?: string
}
```

**GA4 events (fire via existing `useEventTracking` hook):**
- `lead_magnet_view` — on section scroll-into-view
- `lead_magnet_submit` — on form submit attempt  
- `lead_magnet_success` — on 200 response
- `lead_magnet_error` — on validation/API error

---

## 11. Landing Page Integration

**Insertion point** in `LandingPage.tsx`:

```tsx
{/* Features Section */}
<section className="container ... bg-muted/50">
  ...features...
</section>

{/* Lead Magnet Section — INSERT HERE */}
<LeadMagnetSection />

{/* Social Proof */}
<section className="container ...">
  ...testimonials...
</section>
```

The component is a full-bleed section (not wrapped in `container`) — it manages its own background and internal container. This matches the pattern of the CTA section.

---

## 12. ASCII Wireframe — Full Desktop

```
╔══════════════════════════════════════════════════════════════════════╗
║  bg-gradient-to-br from-sky-50 via-blue-50 to-emerald-50           ║
║  border-y border-sky-100                                            ║
║                                                                      ║
║  ┌──────────────────────────────────────────────────────────────┐   ║
║  │  py-16 lg:py-24  container max-w-5xl                         │   ║
║  │                                                              │   ║
║  │  ┌──────────────────────┐     ┌────────────────────────────┐ │   ║
║  │  │                      │     │                            │ │   ║
║  │  │   ┌──────────────┐   │     │  ┌─────────────────────┐  │ │   ║
║  │  │   │▓▓▓▓▓▓▓▓▓▓▓▓▓│   │     │  │ FREE RESOURCE       │  │ │   ║
║  │  │   │▓            ▓│   │     │  └─────────────────────┘  │ │   ║
║  │  │   │▓  THE       ▓│   │     │                            │ │   ║
║  │  │   │▓  5-MINUTE  ▓│   │     │  Not ready to start yet?  │ │   ║
║  │  │   │▓  AI LEAD   ▓│   │     │  Get the free playbook.   │ │   ║
║  │  │   │▓  RESPONSE  ▓│   │     │                            │ │   ║
║  │  │   │▓  PLAYBOOK  ▓│   │     │  The 5-Minute AI Lead     │ │   ║
║  │  │   │▓            ▓│   │     │  Response Playbook — how  │ │   ║
║  │  │   │▓ LeadFlow ⚡ ▓│   │     │  top agents never miss   │ │   ║
║  │  │   │▓▓▓▓▓▓▓▓▓▓▓▓▓│   │     │  a lead (and convert 3×  │ │   ║
║  │  │   └──────────────┘   │     │  more).                   │ │   ║
║  │  │   [PDF mockup div]   │     │                            │ │   ║
║  │  │   w-36 h-44          │     │  ✓ The exact framework    │ │   ║
║  │  │   rotate-3           │     │    top agents use         │ │   ║
║  │  │                      │     │  ✓ Why 5 min is the       │ │   ║
║  │  │                      │     │    make-or-break window   │ │   ║
║  │  │                      │     │  ✓ How AI handles it      │ │   ║
║  │  │                      │     │    automatically          │ │   ║
║  │  │                      │     │                            │ │   ║
║  │  │                      │     │  ┌──────────────────────┐ │ │   ║
║  │  │                      │     │  │ your@email.com       │ │ │   ║
║  │  │                      │     │  └──────────────────────┘ │ │   ║
║  │  │                      │     │  ┌──────────────────────┐ │ │   ║
║  │  │                      │     │  │ Send Me the Playbook→│ │ │   ║
║  │  │                      │     │  └──────────────────────┘ │ │   ║
║  │  │                      │     │                            │ │   ║
║  │  │                      │     │  🔒 No spam. Unsubscribe  │ │   ║
║  │  │                      │     │     anytime. 60 seconds.  │ │   ║
║  │  └──────────────────────┘     └────────────────────────────┘ │   ║
║  │                                                              │   ║
║  └──────────────────────────────────────────────────────────────┘   ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## 13. ASCII Wireframe — Mobile (375px)

```
╔══════════════════════════════╗
║  bg-gradient  py-12 px-4    ║
║                              ║
║  ┌──────────────────────┐   ║
║  │  FREE RESOURCE       │   ║
║  └──────────────────────┘   ║
║                              ║
║  Not ready to start yet?     ║
║  Get the free playbook.      ║
║                              ║
║  The 5-Minute AI Lead        ║
║  Response Playbook...        ║
║                              ║
║  ✓ The exact framework       ║
║  ✓ Why 5 min matters        ║
║  ✓ How AI handles it         ║
║                              ║
║      ┌──────────────┐        ║
║      │▓▓▓▓▓▓▓▓▓▓▓▓▓│        ║
║      │▓  5-MINUTE  ▓│        ║
║      │▓  PLAYBOOK  ▓│        ║
║      │▓ LeadFlow ⚡ ▓│        ║
║      │▓▓▓▓▓▓▓▓▓▓▓▓▓│        ║
║      └──────────────┘        ║
║                              ║
║  ┌────────────────────────┐  ║
║  │ your@email.com         │  ║
║  └────────────────────────┘  ║
║  ┌────────────────────────┐  ║
║  │  Send Me the Playbook →│  ║
║  └────────────────────────┘  ║
║                              ║
║  🔒 No spam. Unsubscribe     ║
║     anytime. 60 seconds.     ║
║                              ║
╚══════════════════════════════╝
```

---

## 14. Success State Wireframe

```
╔══════════════════════════════════════════════════════╗
║  [same gradient background]                          ║
║                                                      ║
║  ┌──────────────────────────────────────────────┐   ║
║  │         animate-in from bottom               │   ║
║  │                                              │   ║
║  │              ✅                              │   ║
║  │         (CheckCircle h-12 w-12              │   ║
║  │          text-emerald-500)                  │   ║
║  │                                              │   ║
║  │       Check your inbox!                     │   ║
║  │       text-xl font-semibold                 │   ║
║  │                                              │   ║
║  │   We just sent your playbook.               │   ║
║  │   text-sm text-muted-foreground             │   ║
║  │                                              │   ║
║  │   While you're here, see how LeadFlow       │   ║
║  │   puts this into practice ↓                 │   ║
║  │                                              │   ║
║  │   [ Try LeadFlow Free → ]                   │   ║
║  │     text-primary underline on hover         │   ║
║  │                                              │   ║
║  └──────────────────────────────────────────────┘   ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
```

---

## 15. Dev Handoff Checklist

- [ ] Implement `<LeadMagnetSection />` component in `frontend/src/components/LeadMagnetSection.tsx`
- [ ] Insert after `<Features>` section in `LandingPage.tsx`
- [ ] PDF mockup: pure CSS div (no image needed for v1)
- [ ] Form validation: email regex before API call
- [ ] `POST /api/lead-capture` endpoint (separate dev task)
- [ ] Success/error state transitions with animation
- [ ] IntersectionObserver for `lead_magnet_view` GA4 event
- [ ] UTM params: read from `window.location.search` on submit
- [ ] Mobile: test at 375px viewport width
- [ ] Dark mode: test all colors
- [ ] Keyboard accessible: focus management after success state
- [ ] Screen reader: add `aria-live="polite"` to success/error region

---

*Design spec complete. Dev agent to implement.*
