# PRD: Landing Page Analytics — GA4/PostHog Integration

**Document ID:** PRD-LANDING-PAGE-ANALYTICS-001  
**Version:** 1.0  
**Date:** 2026-03-10  
**Status:** Approved  
**Author:** Product Manager  

---

## 1. Overview

### Purpose
Instrument the LeadFlow AI marketing landing page with event-level analytics so we can measure CTA click-through rates, scroll depth, and conversion funnel drop-off. Currently there is zero visibility into how prospects interact with the page — we cannot optimize what we cannot measure.

### Business Context
- Day ~12 of 60-day pilot window to $20K MRR
- Landing page is live but generating zero measured conversions
- No way to identify which CTAs are being clicked, where users drop off, or what campaigns drive signups
- GA4 is referenced in the original landing page PRD (FR-9) but was never implemented

### Tool Selection
**Recommendation: GA4 (primary) + PostHog (secondary/optional)**

| Criterion | GA4 | PostHog |
|-----------|-----|---------|
| Cost | Free | Free up to 1M events/mo |
| Setup complexity | Low (gtag.js) | Medium (SDK) |
| Funnels | Yes | Yes (more powerful) |
| Session replay | No | Yes (PostHog) |
| Self-hosted option | No | Yes |
| Real estate agent use case | Sufficient for pilot | Overkill for pilot |

**Decision:** Implement GA4 first (faster, free, sufficient for pilot scale). PostHog can be layered in later if session replay or more powerful funnels are needed. The dev agent should follow this priority unless Stojan overrides.

---

## 2. Target User

**Persona:** Stojan (operator) reviewing how pilot prospects interact with the landing page  
**Need:** Know which sections are being engaged, which CTAs convert, and where the funnel leaks

---

## 3. User Stories

### US-1: Operator Measures CTA Effectiveness
**As** the product operator  
**I want** to see how many visitors click each CTA on the landing page  
**So that** I can identify which calls-to-action drive signup intent  

**Acceptance Criteria:**
- GA4 event `cta_click` fires for every CTA button click
- Event includes parameters: `cta_id`, `cta_label`, `section`, `page_url`
- GA4 dashboard shows event counts per CTA within 24h of implementation

### US-2: Operator Measures Scroll Depth
**As** the product operator  
**I want** to know what percentage of visitors reach each section of the page  
**So that** I can identify content that causes drop-off  

**Acceptance Criteria:**
- Scroll depth events fire at 25%, 50%, 75%, 90% of page height
- GA4 event `scroll_depth` with parameter `percent_scrolled`
- Alternatively: GA4's native Enhanced Measurement scroll tracking enabled

### US-3: Operator Measures Conversion Funnel
**As** the product operator  
**I want** to see the full funnel: land → engage → CTA click → form open → form submit  
**So that** I can calculate conversion rate and identify the biggest drop-off stage  

**Acceptance Criteria:**
- GA4 conversion events tracked:
  1. `page_view` (automatic)
  2. `cta_click` (custom)
  3. `form_open` — when signup form becomes visible/focused
  4. `form_submit` — on successful form submission
  5. `pilot_signup_complete` — marked as conversion in GA4
- GA4 Funnel Exploration report shows progression through all 5 stages

### US-4: UTM Parameters Preserved
**As** the operator running paid/social campaigns  
**I want** UTM parameters captured from traffic sources and associated with signups  
**So that** I can attribute conversions to campaigns  

**Acceptance Criteria:**
- GA4 automatically captures UTM params via `utm_source`, `utm_medium`, `utm_campaign`
- These are visible in GA4 Acquisition reports per session
- (Note: separate UTM-to-Supabase persistence covered by PRD-UTM-CAPTURE-ATTRIBUTION)

---

## 4. Functional Requirements

### FR-1: GA4 Base Integration (P0)
- Add GA4 measurement script to `product/lead-response/dashboard/src/app/layout.tsx`
- Use Next.js `Script` component with `strategy="afterInteractive"` for performance
- Measurement ID stored in environment variable: `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- GA4 property to be created by Stojan; dev agent should use env var placeholder

### FR-2: CTA Click Events (P0)
Track clicks on ALL call-to-action buttons. Event: `cta_click`

| CTA | `cta_id` | `section` |
|-----|---------|-----------|
| "Join the Pilot — It's Free" (hero) | `join_pilot_hero` | `hero` |
| "See How It Works" (hero) | `see_how_it_works` | `hero` |
| "Join Free Pilot" (nav) | `join_pilot_nav` | `navigation` |
| "Start My Free Trial" (signup form) | `start_trial_form` | `signup` |
| Pricing tier CTAs (3x) | `pricing_starter`, `pricing_pro`, `pricing_team` | `pricing` |
| Lead magnet "Get the Guide" | `lead_magnet_cta` | `lead_magnet` |

Event parameters:
```javascript
gtag('event', 'cta_click', {
  cta_id: 'join_pilot_hero',
  cta_label: 'Join the Pilot — It\'s Free',
  section: 'hero',
  page_url: window.location.href
});
```

### FR-3: Scroll Depth Tracking (P1)
- Enable GA4 Enhanced Measurement → Scrolls (tracks 90% scroll depth automatically)
- Additionally fire custom `scroll_milestone` events at 25%, 50%, 75% via IntersectionObserver on section headings
- IntersectionObserver preferred over scroll listeners for performance

### FR-4: Form Funnel Events (P0)
Track the form engagement lifecycle:

| Stage | Event | Trigger |
|-------|-------|---------|
| Form visible | `form_view` | Form section enters viewport |
| First interaction | `form_start` | User focuses any form field |
| Submission attempt | `form_submit_attempt` | Submit button clicked |
| Successful submission | `pilot_signup_complete` | API returns 200 OK |
| Failed submission | `form_submit_error` | API returns error |

Mark `pilot_signup_complete` as a **conversion** in GA4 admin.

### FR-5: PostHog (P2 — Optional)
If dev agent has bandwidth after GA4:
- Install `posthog-js` package
- Initialize with `NEXT_PUBLIC_POSTHOG_KEY` env var
- Enable session replay (with PII masking on form fields)
- PostHog and GA4 can coexist

---

## 5. Non-Functional Requirements

### NFR-1: Performance
- Analytics must not block page render
- Use `strategy="afterInteractive"` on GA4 script (Next.js Script component)
- Total added page weight from analytics scripts < 50KB

### NFR-2: Privacy
- No PII sent to GA4 (names, emails, phone numbers must NOT be event parameters)
- Form fields must be masked in any session replay tool (if PostHog enabled)
- GA4 IP anonymization enabled (on by default in GA4)

### NFR-3: Environment Isolation
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID` must only be set in production Vercel env
- In local dev: analytics script loads but sends no data (GA4 debug mode acceptable)
- Add `NEXT_PUBLIC_GA4_MEASUREMENT_ID` to Vercel project env vars (Stojan to configure the actual ID)

---

## 6. Implementation Notes for Dev Agent

### Files to modify
- `product/lead-response/dashboard/src/app/layout.tsx` — add GA4 Script tag
- Landing page component(s) — add onClick handlers for CTA events and IntersectionObserver for scroll milestones
- `product/lead-response/dashboard/src/app/page.tsx` or landing page component — add form lifecycle event tracking

### Analytics helper pattern (recommended)
Create `product/lead-response/dashboard/src/lib/analytics.ts`:
```typescript
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, params);
  }
}
```

### GA4 Script tag in layout.tsx
```tsx
import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

// In <head> or after </body>:
{GA_ID && (
  <>
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      strategy="afterInteractive"
    />
    <Script id="ga4-init" strategy="afterInteractive">
      {`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_ID}', { anonymize_ip: true });
      `}
    </Script>
  </>
)}
```

### Deploy
After dev implementation, deploy with:
```bash
cd product/lead-response/dashboard && vercel --prod --scope stojans-projects-7db98187
```

---

## 7. Acceptance Criteria (Human-Testable)

Stojan verifies the following after deployment:

1. **GA4 DebugView:** Open Chrome DevTools → Network tab, filter for `collect`. On page load, a `page_view` request should fire to Google Analytics.

2. **CTA Click Tracking:** Click "Join the Pilot" hero button. In GA4 DebugView (Realtime → Events), `cta_click` event appears with `cta_id: join_pilot_hero`.

3. **Scroll Depth:** Scroll to 90% of the page. GA4 `scroll` event fires (Enhanced Measurement).

4. **Form Events:** Focus a field in the signup form → `form_start` fires. Submit the form → `pilot_signup_complete` fires.

5. **No PII in Events:** Inspect all event parameters. No email, phone, or name appears in any event payload.

6. **No Performance Regression:** Page loads in < 2s with analytics loaded (measure with Chrome Lighthouse).

---

## 8. E2E Test Specs

### E2E-ANA-1: GA4 Base Load
**Given** a visitor navigates to the landing page  
**When** the page finishes loading  
**Then** a GA4 `page_view` event is dispatched  
**And** no JavaScript errors appear in the console  

### E2E-ANA-2: CTA Click Tracking
**Given** a visitor is on the landing page  
**When** they click the hero "Join the Pilot" CTA  
**Then** a `cta_click` event fires with `cta_id: join_pilot_hero`  

### E2E-ANA-3: Form Funnel
**Given** a visitor sees the signup form  
**When** they interact with and submit the form  
**Then** events `form_start` → `form_submit_attempt` → `pilot_signup_complete` fire in sequence  

### E2E-ANA-4: No PII Leak
**Given** a visitor submits the signup form  
**When** analytics events are captured  
**Then** no event contains name, email, or phone number in its parameters  

### E2E-ANA-5: Scroll Depth
**Given** a visitor scrolls through the full landing page  
**When** they reach 90% of the page height  
**Then** GA4 Enhanced Measurement fires a scroll event  

---

## 9. Success Metrics (30 days post-launch)

| Metric | Target |
|--------|--------|
| CTA click-through rate (hero) | ≥ 15% |
| Form start rate (of page views) | ≥ 10% |
| Form completion rate (of form starts) | ≥ 50% |
| Pilot signup conversion (of page views) | ≥ 5% |
| Scroll depth to 75% | ≥ 40% of sessions |

---

## 10. Workflow

| Step | Owner | Status |
|------|-------|--------|
| PRD | PM | ✅ Complete |
| Design | N/A — no UI changes | Skipped |
| Dev | leadflow-dev | ⏳ Ready |
| QC | leadflow-qc | ⏳ Waiting |
