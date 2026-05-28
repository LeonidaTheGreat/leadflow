# Design Spec: Lead Magnet / Email Capture on Landing Page
**Feature:** feat-lead-magnet-email-capture-landing-page
**Status:** Ready for integration

---

## Overview

Two complementary capture surfaces nurture visitors not ready to sign up:

1. **LeadMagnetSection** — inline section in the page, positioned between Testimonials and Pricing. Offers the free "5-Minute AI Lead Response Playbook."
2. **ProspectCaptureModal** — exit-intent / inactivity slide-in (bottom-right), positioned as a portal at the root page level. Offers "5 Scripts to Convert More Leads Instantly."

Together they cover two conversion moments: mid-scroll hesitation (inline) and pre-exit intent (modal).

---

## Page Placement

### LeadMagnetSection

Insert between the **Testimonials** and **Pricing** sections in `app/page.tsx`.

```
[Urgency Banner]
[Header/Nav]
[Hero + TrialSignupForm]
[Stats Bar]
[Features]
[How It Works]
[Testimonials]
[LeadMagnetSection]  ← INSERT HERE
[Pricing]
[FAQ]
[Final CTA]
[Footer]
```

**Rationale:** Visitors who read testimonials but haven't converted are the warmest low-intent audience. The lead magnet gives them a no-risk next step before hitting pricing, reducing bounce and capturing the email.

### ProspectCaptureModal

Render once at the root level of `HomePage` (alongside the page content, not inside any section). The component self-manages its own show/hide logic.

```tsx
return (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden">
    <ProspectCaptureModal />  {/* ← Portal-level, always present */}
    {/* ... rest of page sections ... */}
  </div>
)
```

**Trigger logic (already in component):**
- Fires on `mouseleave` when cursor exits top of viewport (exit intent)
- Fires after 60 seconds of inactivity
- Dismissed for 24 hours once closed
- Never shows for logged-in users

---

## LeadMagnetSection — Visual Spec

### Layout

```
┌─────────────────────────────────────────────────────┐
│                    [  📋  ]                          │
│                                                      │
│     Not ready to start yet? Get the free playbook.  │
│                                                      │
│   The 5-Minute AI Lead Response Playbook — how top  │
│       agents never miss a lead and convert 3×        │
│                                                      │
│  ┌──────────────────┐  ┌───────────────────────────┐ │
│  │ First name (opt) │  │   Your email address      │ │
│  └──────────────────┘  └───────────────────────────┘ │
│                                                      │
│         [ Send Me the Playbook            ]          │
│                                                      │
│    No spam. Unsubscribe anytime. Sent in 60 seconds. │
└─────────────────────────────────────────────────────┘
```

**Success state:**
```
┌─────────────────────────────────────────────────────┐
│                      [  🎉  ]                        │
│                  Check your inbox!                   │
│       We just sent your playbook. See you inside.    │
└─────────────────────────────────────────────────────┘
```

### Tokens

| Property | Value |
|----------|-------|
| Container max-width | `max-w-2xl` (672px) |
| Container padding | `px-8 py-12` |
| Background light | `bg-emerald-50` |
| Background dark | `bg-emerald-950/30` |
| Border light | `border-emerald-200` |
| Border dark | `border-emerald-800` |
| Border radius | `rounded-2xl` |
| Section vertical margin | `my-20` |
| Headline | `text-2xl md:text-3xl font-bold text-slate-900 dark:text-white` |
| Subheadline | `text-base md:text-lg text-slate-600 dark:text-slate-400` |
| CTA button | `bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg py-3 w-full` |
| Trust line | `text-xs text-slate-400 dark:text-slate-500` |

### Form states

| State | Input border | Button | Visual |
|-------|-------------|--------|--------|
| `idle` | `border-slate-300 dark:border-slate-600` | "Send Me the Playbook" / enabled | Default |
| `loading` | unchanged | "Sending…" / disabled + opacity-60 | Spinner implied |
| `success` | form hidden | — | 🎉 + success copy |
| `error` | `border-red-400` on email input | re-enabled | Inline error below form |

### Analytics events (GA4)

| Event | Fired when |
|-------|------------|
| `lead_magnet_view` | Section enters viewport (30% threshold, once) |
| `lead_magnet_submit` | Form submitted |
| `lead_magnet_success` | API returns success |
| `lead_magnet_error` | Client validation or API error |

---

## ProspectCaptureModal — Visual Spec

### Layout

```
┌─────────────────────────────── × ─┐  (fixed bottom-right, w-80)
│ FREE RESOURCE                      │
│ 5 Scripts to Convert More Leads    │  ← emerald→teal gradient header
│ Used by top agents to book more    │
│ appointments — no cc needed.       │
├────────────────────────────────────┤
│ [ First name              ]        │
│ [ Your email address      ]        │
│                                    │
│ [ Send Me the Scripts →   ]        │  ← emerald-500 CTA
│       No spam. Unsubscribe.        │
└────────────────────────────────────┘
```

**Success state:**
```
├────────────────────────────────────┤
│              🎉                    │
│         You're on the list!        │
│      We'll be in touch soon.       │
└────────────────────────────────────┘
```
Auto-closes 2.5 seconds after success.

### Tokens

| Property | Value |
|----------|-------|
| Position | `fixed bottom-6 right-6 z-50` |
| Width | `w-80` (320px) |
| Background | `bg-white dark:bg-slate-900` |
| Border | `border-slate-200 dark:border-slate-700` |
| Border radius | `rounded-2xl` |
| Shadow | `shadow-2xl` |
| Header gradient | `from-emerald-500 to-teal-600` |
| Header padding | `px-5 pt-5 pb-4` |
| Body padding | `px-5 py-4` |
| Input border | `border-slate-200 dark:border-slate-700` |
| CTA | `bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm py-2.5 w-full rounded-lg` |

### Behavior

- **Trigger 1:** Mouse exits top of viewport (`e.clientY <= 0`)
- **Trigger 2:** 60 seconds of user inactivity (no mouse, keyboard, scroll, or touch events)
- **Dedup:** Fires at most once per page load; dismissal stored in `localStorage` for 24 hours
- **Logged-in guard:** Never fires if `localStorage.leadflow_token` is present

---

## Integration Checklist (for dev)

These two components exist and are complete. Dev needs to wire them into `page.tsx`:

```tsx
// Add to imports in app/page.tsx:
import LeadMagnetSection from '@/components/LeadMagnetSection'
import ProspectCaptureModal from '@/components/ProspectCaptureModal'
```

```tsx
// In HomePage return, add ProspectCaptureModal before sections:
<div className="min-h-screen ...">
  <ProspectCaptureModal />
  {/* ... existing sections ... */}
```

```tsx
// Insert LeadMagnetSection between Testimonials and Pricing sections:
{/* Testimonials section */}
</section>

<LeadMagnetSection />

{/* Pricing section */}
<section ref={ref75} id="pricing" ...>
```

**Verification:**
```bash
# 1. Build passes
cd product/lead-response/dashboard && npx next build

# 2. Component renders on landing page
# Visit / and scroll past testimonials — LeadMagnetSection should appear
# Idle 60s or move cursor off top of viewport — ProspectCaptureModal should appear

# 3. Analytics events fire
# Open browser devtools → Network → filter 'collect' (GA4)
# Scroll section into view: lead_magnet_view event
# Submit form: lead_magnet_submit → lead_magnet_success events

# 4. Both capture surfaces write to DB
# LeadMagnetSection → POST /api/lead-capture → pilot_signups (source='lead_magnet')
# ProspectCaptureModal → POST /api/prospects/capture → prospect_waitlist (source='exit-intent')
```

---

## Dark Mode

Both components support dark mode via Tailwind `dark:` variants. No additional work needed — both are tested against the `dark:bg-slate-950` page background.

---

## Accessibility

| Component | Landmark | ARIA attributes |
|-----------|----------|-----------------|
| `LeadMagnetSection` | `<section aria-label="Lead magnet — get the free playbook">` | `aria-label` on both inputs, `aria-describedby` on email for error state |
| `ProspectCaptureModal` | `<div role="dialog" aria-modal="true" aria-label="Get free guide">` | Close button has `aria-label="Close"` |

---

## Related Files

| File | Role |
|------|------|
| `components/LeadMagnetSection.tsx` | Inline email capture section |
| `components/ProspectCaptureModal.tsx` | Exit-intent slide-in modal |
| `app/api/lead-capture/route.ts` | API endpoint for inline form |
| `app/api/prospects/capture/route.ts` | API endpoint for modal form |
| `lib/lead-magnet-email.ts` | 3-email nurture sequence (instant, day 3, day 7) |
| `lib/analytics/ga4.ts` | GA4 event definitions |
