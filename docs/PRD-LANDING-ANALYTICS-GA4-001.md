# PRD-LANDING-ANALYTICS-GA4-001 — Landing Page Analytics: GA4 CTA & Conversion Tracking

**Version:** 1.0  
**Status:** approved  
**Author:** Product Manager  
**Date:** 2026-03-10  
**Project:** LeadFlow AI (leadflow)

---

## 1. Problem Statement

The LeadFlow marketing landing page (`/`) has **zero analytics instrumentation**. We cannot measure:

- How many visitors arrive (traffic volume)
- Which CTAs they click (join pilot, see pricing, see how it works)
- How far they scroll (engagement depth)
- What UTM campaigns drive quality traffic
- How many visits convert to form submissions or signups

Without this data, every growth/distribution decision is guesswork. We are in Day ~12 of a 60-day pilot window — every week without funnel visibility is wasted learning.

---

## 2. Goal

Instrument the landing page with **Google Analytics 4 (GA4)** to capture CTA clicks, scroll depth, form interactions, and UTM parameters. Provide the minimum viable analytics required to evaluate landing page performance and iterate with confidence.

> **Platform decision:** GA4 (not PostHog). Rationale: GA4 is free, integrates with Google Ads (for future paid acquisition), is the industry standard, and does not require a self-hosted server. PostHog can be added later as a complementary product analytics layer if needed inside the app.

---

## 3. User Stories

| # | As a... | I want to... | So that... |
|---|---------|-------------|-----------|
| 1 | Stojan (founder) | See how many people visit the landing page each day | I know if our distribution channels are working |
| 2 | Stojan | See which CTA button is clicked most | I can optimize copy and layout |
| 3 | Stojan | See average scroll depth | I know if visitors reach pricing/FAQ |
| 4 | Stojan | See which UTM campaigns convert | I can double down on effective channels |
| 5 | Stojan | See how many visitors open and submit the pilot signup form | I can calculate top-of-funnel conversion rate |
| 6 | Product Manager | Pull GA4 event data to evaluate landing page A/B changes | I can make data-driven product decisions |

---

## 4. Functional Requirements

### FR-1: GA4 Script Integration

- Add the GA4 measurement script to `app/layout.tsx` (root layout, server component compatible)
- Use `next/script` with `strategy="afterInteractive"` to avoid blocking render
- GA4 Measurement ID must be stored in env var `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- Script must load on all public-facing pages (landing, pricing, signup) — not blocked to dashboard routes

### FR-2: CTA Click Events

Track every primary CTA click on the landing page as a GA4 custom event `cta_click`:

| CTA Label | `cta_location` | `cta_text` |
|-----------|---------------|-----------|
| Hero primary | `hero` | e.g. "Start Free Pilot" |
| Hero secondary | `hero` | e.g. "See How It Works" |
| Pricing tier CTA | `pricing` | e.g. "Start Starter Free Trial" |
| Final CTA section | `final_cta` | e.g. "Get Started Free" |
| Nav CTA | `nav` | e.g. "Get Started" |

Event schema:
```js
gtag('event', 'cta_click', {
  cta_location: 'hero',      // hero | nav | pricing | final_cta
  cta_text: 'Start Free Pilot',
  destination: '/signup'     // URL they navigate to
});
```

### FR-3: Pilot Signup Form Events

Track the inline pilot signup modal/form:

| Event | Trigger |
|-------|---------|
| `form_open` | User opens pilot signup form |
| `form_submit` | User submits the pilot signup form |
| `form_success` | Form submission API returns success |
| `form_error` | Form submission API returns error |

Event schema includes `form_name: 'pilot_signup'`.

### FR-4: Scroll Depth Tracking

Track scroll milestones as `scroll_depth` events:

```js
gtag('event', 'scroll_depth', { depth_percent: 25 }); // at 25%
// also at 50%, 75%, 90%
```

Use IntersectionObserver on section landmarks (`#how-it-works`, `#pricing`, `#faq`) as alternative or supplement.

### FR-5: UTM Parameter Capture

- GA4 natively captures UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) when set in the URL — no extra code needed IF the GA4 script is installed correctly
- Verify UTM capture works by testing with a sample URL: `?utm_source=telegram&utm_medium=organic&utm_campaign=pilot-launch`

### FR-6: Conversion Goal Configuration (GA4 Admin)

In the GA4 property admin, mark the following as **conversion events**:
- `form_submit`
- `form_success`

(This is a manual admin step; document it in the handoff notes for Stojan.)

---

## 5. Non-Functional Requirements

| NFR | Requirement |
|-----|-------------|
| Performance | GA4 script must NOT block LCP. `strategy="afterInteractive"` required. |
| Privacy | Add a brief analytics disclosure to the footer (e.g., "We use Google Analytics to improve this site."). Update privacy policy if one exists. |
| Env config | `NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX` in Vercel env vars (production + preview). Never hardcode the measurement ID. |
| SSR safety | No `window` references at module scope — all gtag calls must be wrapped in browser-environment guards. |
| No PII | Do not send email addresses, names, or any PII as GA4 event parameters. |

---

## 6. Implementation Notes for Dev

### 6.1 GA4 Script in layout.tsx

```tsx
// app/layout.tsx (simplified)
import Script from 'next/script';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head />
      <body>
        {GA4_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA4_ID}', { send_page_view: true });
              `}
            </Script>
          </>
        )}
        {children}
      </body>
    </html>
  );
}
```

### 6.2 Helper Utility (recommended)

Create `lib/analytics.ts`:

```ts
export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, params);
}
```

### 6.3 CTA Click Instrumentation

On each CTA button/link in `app/page.tsx`:

```tsx
import { trackEvent } from '@/lib/analytics';

<button
  onClick={() => {
    trackEvent('cta_click', { cta_location: 'hero', cta_text: 'Start Free Pilot', destination: '/signup' });
    router.push('/signup');
  }}
>
  Start Free Pilot
</button>
```

### 6.4 Vercel Environment Variables

Add to Vercel project `leadflow-ai`:
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` = `G-XXXXXXXXXX` (Stojan provides the real GA4 property ID)

### 6.5 GA4 Property Setup (Stojan Action Required)

If no GA4 property exists yet:
1. Go to analytics.google.com → Create property → "LeadFlow AI"
2. Add data stream → Web → `leadflow-ai-five.vercel.app`
3. Copy Measurement ID (G-XXXXXXXXXX)
4. Set `NEXT_PUBLIC_GA4_MEASUREMENT_ID` in Vercel

---

## 7. Out of Scope

- PostHog session recording / heatmaps (can be added later)
- A/B testing framework
- Server-side analytics (Mixpanel, Amplitude)
- Cookie consent banner (low priority until GDPR/CCPA compliance required)
- Analytics for dashboard routes (separate PRD if needed)

---

## 8. Acceptance Criteria

| # | Criterion | Test Method |
|---|-----------|-------------|
| AC-1 | GA4 script loads on landing page without blocking render | Chrome DevTools: Network tab shows gtag.js loaded; Lighthouse LCP unaffected |
| AC-2 | `cta_click` event fires for each CTA button on the page | GA4 DebugView: click each button, verify event + params appear within 5s |
| AC-3 | `cta_location` and `cta_text` params present on every `cta_click` event | GA4 DebugView: inspect event params |
| AC-4 | `form_open` fires when pilot signup modal/form is opened | GA4 DebugView: open form, verify event |
| AC-5 | `form_submit` fires on form submission attempt | GA4 DebugView: submit form, verify event |
| AC-6 | `form_success` fires only when API returns success | GA4 DebugView: complete valid submission, verify event |
| AC-7 | Scroll depth events fire at 25%, 50%, 75%, 90% | GA4 DebugView: scroll slowly through page, verify 4 events |
| AC-8 | UTM parameters captured correctly | Visit `/?utm_source=telegram&utm_medium=organic&utm_campaign=test` → GA4 DebugView shows session_start with UTM params |
| AC-9 | No PII in any event parameters | Code review: confirm no email/name fields in trackEvent calls |
| AC-10 | Script loads gracefully when env var is missing (no console errors) | Remove env var in dev; confirm page loads without JS errors |
| AC-11 | GA4 not loaded in development (optional but recommended) | Add `if (process.env.NODE_ENV !== 'production')` guard or use debug mode |
| AC-12 | Stojan can view CTA click data in GA4 Events report within 24h of deploy | Stojan logs into GA4, confirms events appear in "Events" tab |

---

## 9. Definition of Done

- [ ] `NEXT_PUBLIC_GA4_MEASUREMENT_ID` env var documented and set in Vercel
- [ ] GA4 script injected via `next/script` in root layout
- [ ] `lib/analytics.ts` helper created
- [ ] All CTA buttons on landing page instrumented with `cta_click`
- [ ] Form events instrumented (`form_open`, `form_submit`, `form_success`, `form_error`)
- [ ] Scroll depth tracking implemented (4 milestones)
- [ ] QC verifies all acceptance criteria in GA4 DebugView
- [ ] No Lighthouse performance regression (LCP within 10% of baseline)
- [ ] PR merged and deployed to production

---

## 10. Success Metrics (Post-Deploy)

| Metric | Target (30 days post-launch) |
|--------|------------------------------|
| Landing page sessions/week | Baseline established |
| Hero CTA click rate | ≥ 5% of sessions |
| Pilot form submission rate | ≥ 2% of sessions |
| Visitors reaching pricing section (75% scroll) | ≥ 40% of sessions |
| UTM-tagged traffic from campaigns | ≥ 20% of sessions (once campaigns launch) |
