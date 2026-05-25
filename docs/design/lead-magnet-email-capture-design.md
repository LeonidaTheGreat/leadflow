# Design Spec: Lead Magnet Email Capture Section

**UC:** feat-lead-magnet-email-capture-landing-page  
**Task ID:** b3af030d-5703-4177-b612-95526dfb18d1  
**PRD:** docs/prd/PRD-LEAD-MAGNET-EMAIL-CAPTURE.md  
**Content brief:** docs/design/CONTENT-BRIEF-LEAD-MAGNET-EMAIL-CAPTURE.md  
**Component:** product/lead-response/dashboard/components/LeadMagnetCapture.tsx  

---

## 1. Component Breakdown

### New component
`LeadMagnetCapture` — standalone client component, replaces `LeadMagnetSection` in the landing page.

**Why a new component instead of editing LeadMagnetSection:**
- The content brief (marketing-approved) differs substantially from the current copy in `LeadMagnetSection.tsx`
- The new component adds value bullets, the correct label, updated copy, and all required `data-testid` attributes
- Dev agent wires one import; the old component stays available as fallback

### No new components needed
Everything is self-contained in `LeadMagnetCapture.tsx`. No sub-components. No external libraries beyond what's already in the project.

---

## 2. Layout Wireframe

### Desktop (768px+) — single-row form

```
┌─────────────────────────────────────────────────────────────────┐
│  bg-emerald-50 dark:bg-emerald-950/20                           │
│                                                                  │
│  [FREE RESOURCE FOR REAL ESTATE AGENTS]  ← small label, emerald │
│                                                                  │
│  Not ready to commit yet? That's okay.   ← h2, text-3xl bold    │
│                                                                  │
│  Get "The 5-Minute AI Lead Response Playbook" — free.            │
│  How top agents respond faster and convert more leads.           │
│                                           ← subheadline, lg      │
│                                                                  │
│  ✓  3 word-for-word SMS templates ready to send                 │
│  ✓  Why 78% of deals go to whoever responds first               │
│  ✓  The fast qualification system that books more showings      │
│                                           ← bullets, text-sm     │
│                                                                  │
│  ┌─────────────┐ ┌──────────────────────┐ ┌──────────────────┐ │
│  │ First name  │ │ your@email.com        │ │ Send Me the    → │ │
│  │ (optional)  │ │                      │ │ Playbook         │ │
│  └─────────────┘ └──────────────────────┘ └──────────────────┘ │
│                                                                  │
│  No spam. Unsubscribe anytime. Your guide arrives in 60 secs.   │
│                                           ← trust line, xs      │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (< 768px) — stacked

```
┌─────────────────────────────────┐
│  bg-emerald-50                  │
│                                 │
│  [FREE RESOURCE FOR AGENTS]     │
│                                 │
│  Not ready to commit yet?       │
│  That's okay.                   │
│                                 │
│  Get "The 5-Minute AI Lead      │
│  Response Playbook" — free.     │
│                                 │
│  ✓  3 SMS templates             │
│  ✓  Why 78% go to first         │
│  ✓  Fast qualification          │
│                                 │
│  ┌─────────────────────────┐    │
│  │ First name (optional)   │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │ your@email.com          │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  Send Me the Playbook → │    │
│  └─────────────────────────┘    │
│                                 │
│  No spam. Unsubscribe anytime.  │
└─────────────────────────────────┘
```

### Success state (replaces form, full section visible)

```
┌─────────────────────────────────────────────────────────┐
│  bg-emerald-50                                          │
│                                                         │
│                    ✅  (large icon)                     │
│                                                         │
│           Your playbook is on its way!                  │
│    Check your inbox — it should arrive in a minute.    │
│                                                         │
│           [Try the live AI demo →]                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Copy / Content Specifications

### Label (above headline)
```
FREE RESOURCE FOR REAL ESTATE AGENTS
```
Style: `text-xs font-semibold tracking-widest uppercase text-emerald-600`

### Headline
```
Not ready to commit yet? That's okay.
```
Style: `text-2xl md:text-3xl font-bold text-slate-900 dark:text-white`

### Subheadline
```
Get "The 5-Minute AI Lead Response Playbook" — free.
How top agents respond faster and convert more leads, in plain English.
```
Style: `text-base md:text-lg text-slate-600 dark:text-slate-400`

### Value bullets (3 items)
```
✓  3 word-for-word SMS templates to send the moment a lead arrives
✓  Why 78% of deals go to whoever responds first — and how to be that agent
✓  The fast qualification system that books more showings in fewer messages
```
Style: `text-sm text-slate-700 dark:text-slate-300`, emerald checkmark `text-emerald-500`

### Form fields
- First name: `placeholder="Your first name (optional)"`, `aria-label="First name (optional)"`
- Email: `placeholder="your@email.com"`, `aria-label="Email address"`, `type="email"`, `required`
- Submit: `"Send Me the Playbook →"`
- Loading state: `"Sending…"`

### Trust line
```
No spam. Unsubscribe anytime. Your guide arrives in under 60 seconds.
```
Style: `text-xs text-slate-400 dark:text-slate-500`

### Success state copy
```
Your playbook is on its way!
Check your inbox — it should arrive in the next minute.
[Try the live AI demo →]  (links to /demo)
```

### Error states
- Invalid email (client-side): `"Please enter a valid email address."`
- API error: `"Something went wrong. Please try again or email us at support@leadflow.ai."`

---

## 4. Visual Design Specs

### Colors (Tailwind — no custom values)

| Element | Light mode | Dark mode |
|---------|-----------|-----------|
| Section background | `bg-emerald-50` | `dark:bg-emerald-950/20` |
| Container border | `border-emerald-200` | `dark:border-emerald-800` |
| Label text | `text-emerald-600` | `dark:text-emerald-400` |
| Headline | `text-slate-900` | `dark:text-white` |
| Subheadline | `text-slate-600` | `dark:text-slate-400` |
| Bullet text | `text-slate-700` | `dark:text-slate-300` |
| Bullet checkmark | `text-emerald-500` | `text-emerald-400` |
| Input border (idle) | `border-slate-300` | `dark:border-slate-600` |
| Input border (error) | `border-red-400` | `border-red-400` |
| Input focus ring | `ring-emerald-500` | `ring-emerald-500` |
| Input bg | `bg-white` | `dark:bg-slate-900` |
| CTA button | `bg-emerald-500` | same |
| CTA button hover | `bg-emerald-600` | same |
| Trust line | `text-slate-400` | `dark:text-slate-500` |
| Error text | `text-red-600` | `dark:text-red-400` |
| Success text | `text-emerald-700` | `dark:text-emerald-400` |

### Spacing

| Element | Value |
|---------|-------|
| Section vertical padding | `py-20` |
| Section horizontal padding | `px-4` |
| Container max width | `max-w-2xl` |
| Container horizontal padding | `px-8 md:px-12` |
| Container vertical padding | `py-12` |
| Gap between label → headline | `mb-3` |
| Gap between headline → subheadline | `mb-4` |
| Gap between subheadline → bullets | `mb-6` |
| Gap between bullets → form | `mb-8` |
| Gap between form items | `gap-3` |
| Gap between form → trust line | `mt-4` |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Label | `text-xs` | `font-semibold` |
| Headline | `text-2xl md:text-3xl` | `font-bold` |
| Subheadline | `text-base md:text-lg` | normal |
| Bullets | `text-sm` | normal |
| Trust line | `text-xs` | normal |
| Error/success messages | `text-sm` | normal |

### Container style
```
rounded-2xl border px-8 md:px-12 py-12 text-center
```
(matches the card style used in `LeadMagnetSection.tsx` and other landing sections)

---

## 5. Mobile-First Responsive Notes

- **Base (mobile-first):** Form inputs and button are stacked full-width, each `w-full`
- **sm breakpoint (640px+):** First name + email go side-by-side in a row; button remains full width below
- **md breakpoint (768px+):** Single-row layout: name input | email input | button all inline, using `flex-row gap-3`
  - Name: `sm:w-36` (fixed narrow), email: `flex-1` (expands), button: `whitespace-nowrap` (fixed)
- **Container:** `max-w-2xl mx-auto` — naturally centered, readable at all sizes
- **Section outer:** `container mx-auto px-4` — matches the rest of the landing page pattern
- **Headline:** `text-2xl md:text-3xl` — readable but not overwhelming on small screens
- **Value bullets:** left-aligned under the centered headline block, `max-w-sm mx-auto` — keeps them tight and readable
- **Minimum tap target:** Inputs and button `py-3` gives ~48px height — meets WCAG 2.5.5

---

## 6. Animation / Interaction Notes

### IntersectionObserver (view tracking)
- Fires `lead_magnet_view` GA4 event when section crosses 30% viewport threshold
- One-shot — `hasTrackedView` ref prevents re-fire on scroll back
- No visible animation; purely for analytics

### Form loading state
- Submit button shows `"Sending…"` and `disabled` with `opacity-60`
- Inputs remain editable (don't disable — allows correction)
- No spinner needed for v1; the text change is sufficient feedback for a <2s call

### Success transition
- Form replaced by success message in-place (no re-layout, section height stable)
- No animation needed for v1 — instant swap is clean
- Success message includes a link to `/demo` to give the user a natural next step

### Error state
- Error message appears inline below the form (`role="alert"` for screen readers)
- Email input border turns red; clears back to default as the user types
- No shake animation — keep it calm, low-pressure

### No scroll-jacking, no modals, no pop-ups
The section is static — it sits in page flow and doesn't interrupt. This is intentional per the PRD ("non-intrusive").

---

## 7. Lead Magnet Offer Details

### What the offer is
**"The 5-Minute AI Lead Response Playbook"** — a practical guide for real estate agents on responding to leads faster and converting more.

### What it contains (email body, v1)
1. The problem: why speed beats skill (78% of deals go to the first responder)
2. The 5-minute rule (MIT research on web lead conversion)
3. 3 word-for-word SMS templates for different lead types
4. Fast qualification — 3 questions that handle 80% of situations
5. Follow-up sequence (Day 1 through 30+)
6. How AI removes the manual step (natural segue to LeadFlow)

### Delivery format
Rich HTML email via Resend — no PDF hosting needed for v1. The full content is in `docs/design/CONTENT-BRIEF-LEAD-MAGNET-EMAIL-CAPTURE.md` §2.

### Why this offer works for the target audience
- **Specific and concrete** — "5-minute" and "3 templates" are tangible
- **Non-threatening** — says "that's okay" to not being ready; zero pressure
- **Credibility signal** — data-backed (MIT, 78% stat) without feeling like marketing fluff
- **Naturally leads to product** — the playbook describes the manual version of what LeadFlow automates

### Position on page
Between Testimonials and Pricing. Visitors at this point have seen:
1. The pain (Hero — missing leads, after-hours)
2. The solution overview (Features)
3. How it works (3-step section)
4. Social proof (Testimonials)

They are warm but may not be ready to pay. The lead magnet catches them before the price anchoring hits, offering a low-friction alternative path.

---

## 8. Required data-testid Attributes

| Element | testid |
|---------|--------|
| Section wrapper (`<section>`) | `lead-magnet-section` |
| Form element (`<form>`) | `lead-magnet-form` |
| First name input | `lead-magnet-firstname` |
| Email input | `lead-magnet-email` |
| Submit button | `lead-magnet-submit` |
| Success state wrapper | `lead-magnet-success` |
| Error message | `lead-magnet-error` |

---

## 9. Landing Page Integration

The component should be placed in `app/page.tsx` between the Testimonials section and the Pricing section:

```tsx
{/* After testimonials section, before pricing section */}
<LeadMagnetCapture />
```

Import:
```tsx
import LeadMagnetCapture from '@/components/LeadMagnetCapture'
```

The component manages all its own state — no props needed.
