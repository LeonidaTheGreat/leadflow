# Design Spec: Lead Magnet / Email Capture Section

**UC:** feat-lead-magnet-email-capture  
**PRD:** `docs/prd/PRD-LEAD-MAGNET-EMAIL-CAPTURE.md`  
**Content:** `docs/design/CONTENT-BRIEF-LEAD-MAGNET-EMAIL-CAPTURE.md`  
**Component:** `product/lead-response/dashboard/components/LeadMagnetSection.tsx`  
**Placement:** In `app/page.tsx` between the Testimonials section and Pricing section

---

## 1. Purpose

Capture emails from visitors who are interested in LeadFlow but not ready to sign up. A "generous pause" in the conversion flow — low pressure, clear value.

---

## 2. Section Layout

```
┌─────────────────────────────────────────────────────────┐
│  bg-emerald-50 / dark:bg-emerald-950/20                 │
│  rounded-2xl, border-emerald-200, max-w-2xl, py-12 px-8 │
│  text-center                                            │
│                                                         │
│  [label]  FREE RESOURCE FOR REAL ESTATE AGENTS          │
│           text-xs, font-semibold, emerald-600, tracking  │
│                                                         │
│  [headline]  Not ready to commit yet? That's okay.      │
│              text-2xl md:text-3xl, font-bold, slate-900  │
│                                                         │
│  [subheadline]  Get "The 5-Minute AI Lead Response       │
│                 Playbook" — free. How top agents respond │
│                 faster and convert more leads.           │
│                 text-base md:text-lg, slate-600          │
│                                                         │
│  [value bullets — left-aligned block, centered on page] │
│    ✓ 3 word-for-word SMS templates to send the moment   │
│      a lead arrives                                     │
│    ✓ Why 78% of deals go to whoever responds first —   │
│      and how to be that agent                           │
│    ✓ The fast qualification system that books more      │
│      showings in fewer messages                         │
│    text-sm, slate-700, emerald-500 checkmarks           │
│                                                         │
│  ┌─ FORM ─────────────────────────────────────────────┐ │
│  │  Desktop: [First Name ▏] [Email ▏▏▏▏▏▏] [Send →]  │ │
│  │  Mobile:  [First Name ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏]           │ │
│  │           [Email ▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏▏]            │ │
│  │           [    Send Me the Playbook →    ]         │ │
│  └──────────────────────────────────────────────────── ┘ │
│                                                         │
│  [trust line]  No spam. Unsubscribe anytime.            │
│                Sent to your inbox in 60 seconds.        │
│                text-xs, slate-400                       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. States

### Idle / Loading
- Form visible with name + email inputs and CTA button
- Loading: button text → "Sending…", button disabled, opacity-60

### Success (replace form, keep section)
```
🎉
Your playbook is on its way!
Check your inbox — it should arrive in the next minute.
While you wait: [Try the live AI demo →]  ← /demo
```

### Validation Error (inline, below email input)
```
Please enter a valid email address.
text-sm, text-red-600, role="alert"
```

### API Error (inline, below CTA)
```
Something went wrong. Please try again or email us at support@leadflow.ai.
text-sm, text-red-600, role="alert"
```

### Duplicate Email
Treated as success — do not reveal. Same success message shown.

---

## 4. Visual Tokens

| Element | Value |
|---------|-------|
| Section background | `bg-emerald-50 dark:bg-emerald-950/20` |
| Section border | `border border-emerald-200 dark:border-emerald-800` |
| Container | `max-w-2xl mx-auto rounded-2xl px-8 py-12` |
| Label | `text-xs font-semibold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase` |
| Headline | `text-2xl md:text-3xl font-bold text-slate-900 dark:text-white` |
| Subheadline | `text-base md:text-lg text-slate-600 dark:text-slate-400` |
| Bullet checkmark | `text-emerald-500` |
| Bullet text | `text-sm text-slate-700 dark:text-slate-300` |
| Input | `border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500` |
| Input error state | `border-red-400 focus:ring-red-400` |
| CTA button | `bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg` |
| Trust line | `text-xs text-slate-400 dark:text-slate-500` |
| Error text | `text-sm text-red-600 dark:text-red-400` |
| Success text | `text-emerald-700 dark:text-emerald-400` |

---

## 5. Required data-testid Attributes

| Element | `data-testid` |
|---------|--------------|
| Section wrapper `<section>` | `lead-magnet-section` |
| Form `<form>` | `lead-magnet-form` |
| First name input | `lead-magnet-firstname` |
| Email input | `lead-magnet-email` |
| Submit button | `lead-magnet-submit` |
| Success state wrapper | `lead-magnet-success` |
| Error message | `lead-magnet-error` |

---

## 6. Analytics Events (GA4)

| Event | When |
|-------|------|
| `lead_magnet_view` | Section enters viewport (IntersectionObserver, threshold 0.3) |
| `lead_magnet_submit` | User clicks submit |
| `lead_magnet_success` | API returns `{ success: true }` |
| `lead_magnet_error` | Client validation fail or API error |

---

## 7. Form Behavior

- **Desktop:** first name + email inline, CTA button below (full-width)
- **Mobile:** stacked (first name → email → CTA button)
- Email field: `type="email"`, client-side regex validation before API call
- First name: optional, `type="text"`
- On submit: read UTM params from `window.location.search`, include in POST body
- On success: replace form with success message (no page redirect)
- On error: preserve entered data, show inline message

---

## 8. API Contract (for Dev)

```
POST /api/lead-capture
Content-Type: application/json

{
  "email": "agent@realty.com",
  "firstName": "Sarah",        // optional
  "source": "landing-page",
  "utmSource": "google",       // optional
  "utmMedium": "cpc",          // optional
  "utmCampaign": "spring2026"  // optional
}

→ { "success": true }          // always 200 for valid email (including duplicates)
→ { "success": false, "error": "Invalid email" }   // 400 for bad input
```

---

## 9. Page Integration

In `app/page.tsx`, insert `<LeadMagnetSection />` between:
- `</section>` closing tag of the Testimonials section (`id="testimonials"`)
- `<section ... id="pricing">` opening tag of the Pricing section

```tsx
import LeadMagnetSection from '@/components/LeadMagnetSection'

// ... inside return, after {/* Testimonials */} section:
<LeadMagnetSection />

// ... then Pricing section:
<section ref={ref75} id="pricing" ...>
```

The component manages its own margins (`my-20`) and wraps in a `<section>` with `data-testid="lead-magnet-section"`.

---

## 10. Accessibility

- Section has `aria-label="Lead magnet — get the free playbook"`
- Error messages: `role="alert"` + `aria-describedby` on email input
- Submit button: `disabled` attribute during loading
- CTA in success state: standard `<a>` link
