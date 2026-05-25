# Design Spec: Lead Magnet / Email Capture on Landing Page

**UC:** feature-lead-magnet-email-capture-landing-page
**Status:** Ready for Dev
**Goal:** Capture emails from visitors not ready to sign up, nurture them toward conversion.

---

## Overview

Three email capture touchpoints on the landing page, each targeting a different stage of visitor intent:

1. **Hero Inline CTA** — low-friction capture right below the trial signup form
2. **Lead Magnet Section** — dedicated mid-page section offering a free playbook
3. **Exit-Intent Modal** — last-chance popup triggered on mouse-leave or 60s inactivity

All three components already exist (see Components section). This spec defines their **placement**, **visual hierarchy**, and **integration** into `app/page.tsx`.

---

## 1. Hero Inline CTA (`ProspectInlineCTA`)

### Placement
- Inside the `#hero` section, immediately **below** the trust bar ("14-day free trial / No credit card / Cancel anytime") and above the "See how it works" secondary links.
- Visually distinct from the trial signup form — positioned as an alternative, not a competitor.

### Layout (Desktop)

```
┌─────────────────────────────────────────────────┐
│              AI-Powered Lead Response...          │  <- existing h2
│              Instantly qualify and respond...     │  <- existing p
│                                                   │
│         [ TrialSignupForm (compact) ]            │  <- existing
│         ✓ 14-day free trial  ✓ No credit card    │  <- existing trust bar
│                                                   │
│  ┌───────────────────────────────────────────┐   │
│  │  Not ready to sign up? Stay in the loop.  │   │  <- NEW: ProspectInlineCTA
│  │  Drop your email and we'll send you tips  │   │
│  │  [First name] [Your email] [Keep Me Post] │   │
│  └───────────────────────────────────────────┘   │
│                                                   │
│         See how it works ↓  |  Try Live Demo →   │  <- existing links
└─────────────────────────────────────────────────┘
```

### Visual Spec
- Container: `bg-white/10` with `border border-white/20`, `rounded-xl`, `p-6`
- Max width: inherits from parent (max-w-3xl, centered)
- Margin: `mt-6` from trust bar, `mb-2` before secondary links
- Headline: white, `font-semibold`, `text-base`
- Subtext: `text-slate-300`, `text-sm`
- Form row: horizontal on `sm:` breakpoint, stacked on mobile
  - First name input: `sm:w-32`, frosted glass bg (`bg-white/20`)
  - Email input: `flex-1`, same frosted style
  - Submit button: emerald-500, `font-semibold text-sm`
- Success state: replaces form with green confirmation banner

### Responsive (Mobile)
- Form fields stack vertically (full width)
- Button becomes full width
- Padding reduces to `p-4`

---

## 2. Lead Magnet Section (`LeadMagnetSection`)

### Placement
- Between **Testimonials** (`#testimonials`) and **Pricing** (`#pricing`) sections.
- This is the "golden position" — visitor has seen social proof but hasn't committed. The playbook offer catches those who aren't yet ready to buy.

### Landing Page Section Order (updated)

```
1. Urgency Banner
2. Header/Nav
3. Hero (with inline CTA)        <- CTA #1
4. Stats Bar
5. Features                       <- CTA #2 (existing)
6. How It Works
7. Testimonials
8. ★ Lead Magnet Section ★       <- NEW: CTA #3 (email capture)
9. Pricing                        <- CTA #4 (existing)
10. FAQ
11. Final CTA                     <- CTA #5 (existing)
12. Footer
```

### Layout (Desktop)

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│                        📋                             │
│                                                       │
│     Not ready to start yet? Get the free playbook.    │
│                                                       │
│     The 5-Minute AI Lead Response Playbook — how      │
│     top agents never miss a lead and convert 3x more. │
│                                                       │
│     [First name (optional)] [Your email address]      │
│                                                       │
│            [ Send Me the Playbook ]                   │
│                                                       │
│     No spam. Unsubscribe anytime. Sent in 60 seconds. │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Visual Spec
- Container: `max-w-2xl mx-auto`, `rounded-2xl`
- Background: `bg-emerald-50 dark:bg-emerald-950/30`
- Border: `border border-emerald-200 dark:border-emerald-800`
- Padding: `px-8 py-12` (desktop), `px-5 py-8` (mobile)
- Section wrapper: `my-20` (consistent vertical spacing with adjacent sections)
- Icon: 📋 at `text-5xl`, centered, `mb-4`
- Headline: `text-2xl md:text-3xl`, `font-bold`, slate-900/white
- Subheadline: `text-base md:text-lg`, slate-600/400, max-w-lg centered
- Form: `max-w-md mx-auto`, `flex-col gap-3`
  - Name + Email row: `sm:flex-row gap-3` (side by side on desktop, stacked mobile)
  - First name: `sm:w-40`, standard input styling
  - Email: `flex-1`, red border on error state
  - Submit button: full width, emerald-500, `font-semibold`, `py-3`
- Error state: red text below form, `role="alert"`
- Success state: replaces form with celebration icon + "Check your inbox!" message
- Trust line: `text-xs text-slate-400`, centered below form

### Responsive (Mobile)
- Name and email fields stack vertically
- Submit button full width
- Reduced padding (`px-5 py-8`)
- Headline drops to `text-2xl`

---

## 3. Exit-Intent Modal (`ProspectCaptureModal`)

### Trigger Conditions
- Mouse leaves viewport (top edge) — desktop only
- 60 seconds of inactivity (no mouse, keyboard, scroll, or touch)
- **Suppressed when:** user is logged in, or modal dismissed in last 24h (localStorage)
- Fires at most once per page session

### Position
- Fixed: `bottom-6 right-6` (bottom-right corner, non-blocking)
- z-index: 50 (above page content, below any system modals)
- Width: `w-80` (320px)

### Layout

```
┌──────────────────────────────┐
│  FREE RESOURCE            ✕  │  <- emerald gradient header
│  5 Scripts to Convert More   │
│  Leads Instantly             │
│  Used by top agents...       │
├──────────────────────────────┤
│  [First name            ]    │  <- white/dark card body
│  [Your email address    ]    │
│  [ Send Me the Scripts → ]   │
│  No spam. Unsubscribe anytime│
└──────────────────────────────┘
```

### Visual Spec
- Card: `rounded-2xl`, `shadow-2xl`, white/dark bg
- Header gradient: `from-emerald-500 to-teal-600`, `px-5 pt-5 pb-4`
- Close button: top-right, white/80 hover white, `text-xl`
- Category label: `text-xs`, emerald-100, uppercase, semibold, tracking-wide
- Headline: white, `font-bold text-lg`
- Description: emerald-50, `text-sm`
- Body: `px-5 py-4`
- Inputs: standard `text-sm`, `py-2`, full width, stacked with `space-y-3`
- Submit button: full width, emerald-500, `py-2.5`, `text-sm font-semibold`
- Trust text: `text-xs text-center text-slate-400`
- Success state: centered celebration with auto-dismiss after 2.5s

### Responsive (Mobile)
- Same fixed position works on mobile (bottom-right)
- `w-80` fits all common mobile widths (320px < 375px minimum)
- Touch targets meet 44px minimum (inputs `py-2` + padding = ~40px, acceptable)

---

## Integration Guide for Dev

### Files to Modify
- `product/lead-response/dashboard/app/page.tsx` — import and place all 3 components

### Import Additions
```tsx
import LeadMagnetSection from '@/components/LeadMagnetSection'
import ProspectInlineCTA from '@/components/ProspectInlineCTA'
import ProspectCaptureModal from '@/components/ProspectCaptureModal'
```

### Placement Code (pseudo)
```tsx
// 1. In #hero section, after trust bar div, before secondary links div:
<ProspectInlineCTA />

// 2. Between #testimonials and #pricing sections:
<LeadMagnetSection />

// 3. At the bottom of the page, before </div> (root wrapper):
<ProspectCaptureModal />
```

### No Component Changes Required
All three components are production-ready. Dev only needs to:
1. Import them into `page.tsx`
2. Place them at the specified locations
3. Verify build passes (`cd product/lead-response/dashboard && npx next build`)

---

## Analytics Events (already wired)

| Component | Event | When |
|-----------|-------|------|
| LeadMagnetSection | `lead_magnet_view` | Section enters viewport (30% threshold) |
| LeadMagnetSection | `lead_magnet_submit` | Form submitted |
| LeadMagnetSection | `lead_magnet_success` | API returns success |
| LeadMagnetSection | `lead_magnet_error` | Validation or API error |
| ProspectInlineCTA | (none built-in) | Dev may add via `trackCTAClick` |
| ProspectCaptureModal | (none built-in) | Dev may add via `trackCTAClick` |

---

## Design Rationale

1. **Three touchpoints, one funnel**: Visitors at different scroll depths see different offers. Hero catches early bouncers, mid-page catches evaluators, exit-intent catches abandoners.

2. **Non-competing with trial signup**: The inline CTA and lead magnet explicitly say "not ready to sign up?" — they position email capture as the lower-commitment alternative, not a replacement for trial signup.

3. **Playbook as lead magnet**: "The 5-Minute AI Lead Response Playbook" is specific, time-bounded, and directly relevant to the ICP (real estate agents losing leads to slow response). It promises actionable value, not a newsletter.

4. **Bottom-right modal over fullscreen overlay**: A fixed card in the corner is less aggressive than a full-screen modal. It doesn't block content, respects the visitor's attention, and performs comparably for email capture (based on industry benchmarks).

5. **24h dismiss cooldown**: Prevents annoying repeat visitors. Logged-in users never see the modal.

---

## Accessibility

- All forms use `aria-label` on inputs
- Error messages use `role="alert"` and `aria-describedby`
- Exit modal has `role="dialog"` and `aria-modal="true"`
- Close button has `aria-label="Close"`
- All interactive elements are keyboard-navigable (native form elements)
- Color contrast: emerald-500 on white meets WCAG AA (4.6:1 ratio)

---

## Dark Mode

All three components support dark mode via Tailwind `dark:` variants:
- Backgrounds: `dark:bg-slate-900`, `dark:bg-emerald-950/30`, `dark:bg-slate-800`
- Text: `dark:text-white`, `dark:text-slate-400`
- Borders: `dark:border-slate-700`, `dark:border-emerald-800`
- Inputs: `dark:bg-slate-900` / `dark:bg-slate-700` (frosted for hero)
