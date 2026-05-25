# Design Spec: Lead Magnet Email Capture Section

**Feature:** `feature-lead-magnet-email-capture`
**Task ID:** `b3af030d-5703-4177-b612-95526dfb18d1`
**PRD:** `docs/prd/PRD-LEADFLOW-LEAD-MAGNET-NURTURE-CAPTURE-001.md`
**Content Brief:** `docs/design/CONTENT-BRIEF-LEAD-MAGNET-EMAIL-CAPTURE.md`
**Existing component:** `product/lead-response/dashboard/components/LeadMagnetSection.tsx`
**Mockup:** `docs/design/mockup-lead-magnet-capture.html`

---

## 1. Concept

A **generous pause** in the conversion flow — not another push to sign up. Visitors who have seen the product demo and social proof (Testimonials) but are not ready to pay need an off-ramp that feels helpful, not desperate. This section says "no pressure — here's something valuable" before they hit the pricing decision.

---

## 2. Placement

Insert `<LeadMagnetSection />` into `app/page.tsx` between the **Testimonials** section and the **Pricing** section.

```tsx
{/* Testimonials */}
<section id="testimonials" ...>...</section>

{/* Lead Magnet — insert here */}
<LeadMagnetSection />

{/* Pricing — CTA Placement #3 */}
<section ref={ref75} id="pricing" ...>
```

Import at the top of `app/page.tsx`:
```tsx
import LeadMagnetSection from '@/components/LeadMagnetSection'
```

Note: The component file already exists at `components/LeadMagnetSection.tsx`. The dev agent must wire it into `page.tsx` and close the gaps listed in Section 8 below.

---

## 3. Full Section Layout

### Desktop

```
┌─────────────────────────────────────────────────────────────┐
│  [bg-emerald-50 / dark:bg-emerald-950/30, py-20]            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  [max-w-2xl card, bg-emerald-50, border-emerald-200,│   │
│  │   rounded-2xl, px-8 py-12, text-center]             │   │
│  │                                                     │   │
│  │              📋                                     │   │
│  │                                                     │   │
│  │    FREE RESOURCE FOR REAL ESTATE AGENTS             │   │  ← label
│  │                                                     │   │
│  │    Not ready to commit yet? That's okay.            │   │  ← h2
│  │                                                     │   │
│  │    Get "The 5-Minute AI Lead Response Playbook"     │   │  ← subheadline
│  │    — free. How top agents respond faster and        │   │
│  │    convert more leads, in plain English.            │   │
│  │                                                     │   │
│  │    ✓  3 word-for-word SMS templates                 │   │  ← bullets
│  │    ✓  Why 78% of deals go to first responder        │   │
│  │    ✓  The fast qualification system                 │   │
│  │                                                     │   │
│  │  [First name (optional)] [your@email.com] [Send →]  │   │  ← single-row form
│  │                                                     │   │
│  │  No spam. Unsubscribe anytime. Arrives in 60s.      │   │  ← trust line
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Mobile (< 640px)

Inputs and button stack vertically, all full-width. Icon, label, headline, bullets remain centered.

```
┌──────────────────────────────────┐
│  📋                              │
│  FREE RESOURCE FOR RE AGENTS     │
│  Not ready to commit yet?        │
│  That's okay.                    │
│  Get "The 5-Minute Playbook"...  │
│  ✓  3 SMS templates              │
│  ✓  78% of deals...              │
│  ✓  Fast qualification...        │
│  [First name (optional)       ]  │  ← full width
│  [your@email.com              ]  │  ← full width
│  [    Send Me the Playbook    ]  │  ← full width button
│  No spam. Unsubscribe anytime.   │
└──────────────────────────────────┘
```

---

## 4. Interaction States

### 4.1 Idle (default)

- Form fully visible, all inputs enabled
- Button text: "Send Me the Playbook →"

### 4.2 Loading

- Button text changes to "Sending…"
- Button: `disabled` attribute + `opacity-60 cursor-not-allowed`
- Inputs remain editable
- No spinner needed for v1

### 4.3 Validation error (client-side)

- Email input border: `border-red-400 focus:ring-red-400`
- Error message appears below form with `role="alert"`
- Copy: "Please enter a valid email address."
- `data-testid="lead-magnet-error"` on the error element

### 4.4 API error

- Error message below CTA button: "Something went wrong. Please try again or email us at support@leadflow.ai."
- Same `text-red-600` treatment as validation error
- `data-testid="lead-magnet-error"`

### 4.5 Success

Replace entire form block with success content. The section container and card remain visible.

```
┌──────────────────────────────────────────────┐
│                                              │
│                    ✅                         │
│                                              │
│  Your playbook is on its way!                │
│  Check your inbox — it should arrive in      │
│  the next minute.                            │
│                                              │
│  While you wait: Try the live AI demo →      │  ← /demo link
│                                              │
└──────────────────────────────────────────────┘
```

- `data-testid="lead-magnet-success"` on this wrapper
- Trust line is hidden in success state

### 4.6 Duplicate email

Treat as success — show the identical success state. Never reveal the email was already captured.

---

## 5. Visual Tokens

All tokens match the existing `page.tsx` patterns. No new colors introduced.

| Element | Tailwind classes |
|---------|-----------------|
| Section outer | `my-20` |
| Card | `bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl px-8 py-12 text-center` |
| Icon | `text-5xl mb-4` |
| Label | `text-xs font-semibold tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-3` |
| Headline (h2) | `text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3` |
| Subheadline | `text-base md:text-lg text-slate-600 dark:text-slate-400 mb-6 max-w-lg mx-auto` |
| Bullet list | `text-left max-w-sm mx-auto space-y-2 mb-8` |
| Bullet checkmark | `text-emerald-500 mr-2` |
| Bullet text | `text-sm text-slate-600 dark:text-slate-400` |
| Name input | `flex-shrink-0 w-full sm:w-36 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500` |
| Email input (normal) | `flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500` |
| Email input (error) | Same as above, with `border-red-400 focus:ring-red-400` replacing slate-300/emerald-500 |
| CTA button | `w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors whitespace-nowrap` |
| Trust line | `mt-4 text-xs text-slate-400 dark:text-slate-500` |
| Error message | `mt-3 text-sm text-red-600 dark:text-red-400` |
| Success icon | `text-4xl mb-3` |
| Success headline | `text-lg font-semibold text-emerald-700 dark:text-emerald-400` |
| Success body | `text-sm text-slate-600 dark:text-slate-400 mt-1` |
| Success link | `mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium` |

---

## 6. Typography

Consistent with the rest of `page.tsx` (Geist Sans):

| Element | Size | Weight |
|---------|------|--------|
| Label | `text-xs` | `font-semibold` |
| Headline | `text-2xl` / `md:text-3xl` | `font-bold` |
| Subheadline | `text-base` / `md:text-lg` | normal |
| Bullets | `text-sm` | normal |
| Input text | `text-sm` | normal |
| CTA button | `text-base` | `font-semibold` |
| Trust line | `text-xs` | normal |

---

## 7. Required `data-testid` Attributes

| Element | `data-testid` |
|---------|---------------|
| `<section>` wrapper | `lead-magnet-section` |
| `<form>` element | `lead-magnet-form` |
| First name input | `lead-magnet-firstname` |
| Email input | `lead-magnet-email` |
| Submit button | `lead-magnet-submit` |
| Success state wrapper | `lead-magnet-success` |
| Inline error message | `lead-magnet-error` |

---

## 8. Dev Agent: Gaps to Close in Existing Component

The existing `components/LeadMagnetSection.tsx` has the right structure but is missing several required elements. The dev agent must address these:

### 8.1 Missing: `data-testid` attributes

The current component has **none** of the required testids. Add all seven per the table above.

### 8.2 Missing: value bullets

The current component has no bullet list. Add three bullets between the subheadline (`<p>`) and the `<form>`. Copy:
- "3 word-for-word SMS templates to send the moment a lead arrives"
- "Why 78% of deals go to whoever responds first — and how to be that agent"
- "The fast qualification system that books more showings in fewer messages"

### 8.3 Missing: small label above headline

Add `FREE RESOURCE FOR REAL ESTATE AGENTS` as a `<p>` above the `<h2>`.

### 8.4 Incomplete: success state

Current success state shows only "Check your inbox! / We just sent your playbook." Expand to match the content brief:
- Headline: "Your playbook is on its way! Check your inbox — it should arrive in the next minute."
- CTA: `<a href="/demo">While you wait: Try the live AI demo →</a>`
- Wrap success content in `data-testid="lead-magnet-success"`

### 8.5 Missing: wire into `page.tsx`

The component exists but is not imported or rendered in `app/page.tsx`. Add it between Testimonials and Pricing.

---

## 9. What Not To Touch

- No other section of `page.tsx` except the insertion of `<LeadMagnetSection />`
- No Pricing, Testimonials, Hero, or FAQ sections
- No new analytics infrastructure — use the existing `window.gtag` pattern already in the component
- No PDF or hosted asset — the playbook is delivered inline as a rich HTML email (Email 1 in the nurture sequence)
- No new npm packages
