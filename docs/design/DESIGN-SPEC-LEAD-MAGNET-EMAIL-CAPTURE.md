# Design Spec: Lead Magnet / Email Capture on Landing Page

**UC:** feature-lead-magnet-email-capture
**Task ID:** d9169ef6-de0a-488b-811f-082555bf417d
**Date:** 2026-05-25
**Status:** Ready for Dev

---

## 1. Current State

The component `product/lead-response/dashboard/components/LeadMagnetSection.tsx` already exists with:
- Email + optional first-name form
- Client-side validation
- `POST /api/lead-capture` submission with UTM params
- GA4 analytics (view, submit, success, error)
- Success/error states
- Trust line ("No spam. Unsubscribe anytime.")

**What's missing:** The component is NOT imported into `app/page.tsx`. It needs to be wired into the landing page at the correct placement.

Two sibling components also exist but serve different capture points:
- `ProspectCaptureModal.tsx` -- exit-intent popup (separate trigger)
- `ProspectInlineCTA.tsx` -- hero section inline CTA (separate placement)

---

## 2. Placement

Insert `<LeadMagnetSection />` between the **How It Works** section and the **Testimonials** section in `app/page.tsx`:

```
[Urgency Banner]
[Header / Nav]
[Hero]
[Stats Bar]
[Features]
[Features CTA]
[How It Works]
------------------------------
[LEAD MAGNET SECTION]    <-- INSERT HERE
------------------------------
[Testimonials]
[Pricing]
[FAQ]
[Final CTA]
[Footer]
```

**Rationale:** After How It Works establishes the value proposition, visitors who understand the product but aren't ready to commit are primed for a free resource offer. This catches them before they hit the pricing section (which filters for buyers only).

---

## 3. Visual Design -- Upgrade from Current Implementation

The current `LeadMagnetSection` uses a basic centered card. Upgrade to a two-column layout with a playbook mockup visual to increase perceived value.

### 3.1 Section Background

Replace the current `emerald-50` card-in-section approach with a full-width gradient section:

```
background: gradient from sky-50 via blue-50 to emerald-50 (light)
            gradient from slate-900 to slate-800 (dark)
border-y: border-sky-100 dark:border-slate-700
padding: py-16 lg:py-20
```

Tailwind: `bg-gradient-to-br from-sky-50 via-blue-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 border-y border-sky-100 dark:border-slate-700`

### 3.2 Desktop Layout (>= 768px)

Two-column grid inside `container max-w-5xl mx-auto`:

```
+-------------------------------+-------------------------------+
|         LEFT (45%)            |         RIGHT (55%)           |
|                               |                               |
|   +-------------------+      |  [FREE RESOURCE] pill          |
|   | ///////////////// |      |                               |
|   | /               / |      |  Not ready to start yet?      |
|   | /  THE 5-MINUTE / |      |  Get the free playbook.       |
|   | /  AI LEAD      / |      |                               |
|   | /  RESPONSE     / |      |  The 5-Minute AI Lead         |
|   | /  PLAYBOOK     / |      |  Response Playbook -- how top |
|   | /               / |      |  agents never miss a lead     |
|   | / LeadFlow      / |      |  (and convert 3x more).       |
|   | ///////////////// |      |                               |
|   +-------------------+      |  * Exact framework top agents |
|   w-40 h-52, rotate-3        |    use to respond first       |
|   centered in column          |  * Why 5 minutes is the      |
|                               |    make-or-break window       |
|                               |  * How AI handles it so you  |
|                               |    never miss a lead          |
|                               |                               |
|                               |  [First name  ] [Email      ]|
|                               |  [  Send Me the Playbook ->  ]|
|                               |                               |
|                               |  No spam. Unsubscribe anytime.|
+-------------------------------+-------------------------------+
```

### 3.3 Mobile Layout (< 768px)

Single column, stacked:

```
+----------------------------+
| [FREE RESOURCE] pill       |
|                            |
| Not ready to start yet?   |
| Get the free playbook.    |
|                            |
| Subheadline text...        |
|                            |
| * Bullet 1                |
| * Bullet 2                |
| * Bullet 3                |
|                            |
|    +----------------+      |
|    | PLAYBOOK COVER |      |
|    | (centered)     |      |
|    +----------------+      |
|                            |
| [First name (optional)   ] |
| [Your email address      ] |
| [Send Me the Playbook -> ] |
|                            |
| No spam. Unsubscribe...   |
+----------------------------+
```

---

## 4. Component Anatomy

### 4.1 Eyebrow Label
- Text: `FREE RESOURCE`
- Style: `text-xs font-semibold tracking-widest uppercase`
- Pill background: `bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-full px-3 py-1 inline-block`
- Margin: `mb-4`

### 4.2 Headline
- Text: "Not ready to start yet? Get the free playbook."
- Style: `text-2xl md:text-3xl font-bold text-slate-900 dark:text-white`
- Margin: `mb-3`

### 4.3 Subheadline
- Text: "**The 5-Minute AI Lead Response Playbook** -- how top agents never miss a lead and convert 3x more."
- Style: `text-base md:text-lg text-slate-600 dark:text-slate-400`
- Bold on playbook name
- Margin: `mb-6`

### 4.4 Benefit Bullets
Three lines with emerald checkmarks:
1. "The exact framework top-producing agents use to respond first"
2. "Why 5 minutes is the make-or-break window (with data)"
3. "How AI handles it automatically -- so you never miss a lead"

- Checkmark: `text-emerald-500` (use a simple check character or CheckCircle icon)
- Text: `text-sm text-slate-700 dark:text-slate-300`
- Layout: `flex items-start gap-2` per bullet, `space-y-2`
- Container margin: `mb-6`

### 4.5 Playbook Cover Mockup (CSS-only, no image)
A styled div that looks like a book cover:

```
Container: w-40 h-52 rounded-lg
Background: bg-gradient-to-b from-sky-700 to-sky-900
Shadow: shadow-xl shadow-sky-900/30
Rotation: rotate-3 hover:rotate-0 transition-transform duration-300
Inner padding: p-5 flex flex-col

Title: "THE 5-MINUTE AI LEAD RESPONSE PLAYBOOK"
  text-white text-sm font-bold leading-tight

Brand: "LeadFlow AI"
  text-sky-300 text-xs mt-auto
```

On desktop: centered vertically in left column with `flex items-center justify-center`.
On mobile: `mx-auto my-6`.

### 4.6 Form
Keep existing form behavior from `LeadMagnetSection.tsx`:
- First name (optional) + email on one row (desktop), stacked (mobile)
- CTA button: "Send Me the Playbook" -- full width
- Button color: `bg-emerald-500 hover:bg-emerald-600 text-white font-semibold`
- Loading: "Sending..." with disabled state
- Error: red border on email input + inline error text below

### 4.7 Trust Line
- Text: "No spam. Unsubscribe anytime. Sent to your inbox in 60 seconds."
- Style: `text-xs text-slate-400 dark:text-slate-500 mt-4`

### 4.8 Success State
Replace form area with:
- Large check icon or emoji
- "Check your inbox!" (bold)
- "We just sent your playbook. See you on the inside." (muted)
- Optional upsell: "While you're here -- [Try LeadFlow Free](/signup/trial)"

---

## 5. Responsive Specs

| Breakpoint | Layout | Playbook Cover |
|-----------|--------|----------------|
| < 640px   | Single column, stacked | Centered, below bullets |
| 640-767px | Single column, wider | Centered, below bullets |
| >= 768px  | Two-column grid (45/55) | Left column, centered vertically |

Grid: `grid grid-cols-1 md:grid-cols-2 gap-12 items-center`

---

## 6. Dark Mode

All colors specified above include dark variants. Key swaps:
- Section bg: gradient slate-900 to slate-800
- Border: slate-700
- Text: white / slate-300 / slate-400 / slate-500
- Inputs: `bg-slate-900 border-slate-600`
- Playbook cover: unchanged (already dark blue)

---

## 7. Dev Handoff Checklist

- [ ] Import `LeadMagnetSection` in `app/page.tsx`
- [ ] Place between How It Works (`#how-it-works`) and Testimonials (`#testimonials`)
- [ ] Upgrade `LeadMagnetSection.tsx` layout: full-width section with two-column grid
- [ ] Add eyebrow "FREE RESOURCE" pill
- [ ] Add benefit bullets (3 items with checkmark icons)
- [ ] Add CSS-only playbook cover mockup (left column on desktop)
- [ ] Keep all existing form logic, validation, GA4 tracking, and UTM capture
- [ ] Test at 375px mobile viewport
- [ ] Test dark mode
- [ ] Verify: `npx next build` passes
- [ ] Verify: component visible between How It Works and Testimonials on landing page

---

## 8. What NOT to Change

- Do not modify `ProspectCaptureModal.tsx` (exit-intent -- separate concern)
- Do not modify `ProspectInlineCTA.tsx` (hero inline -- separate concern)
- Do not change the `/api/lead-capture` route (backend is complete)
- Do not alter pricing, testimonials, or other landing page sections
- Do not change GA4 event names (they may already be tracked in analytics)

---

*Design spec complete. Component exists -- dev needs to upgrade layout and wire into page.tsx.*
