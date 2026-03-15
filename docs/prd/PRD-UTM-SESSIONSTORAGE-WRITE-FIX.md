# PRD-UTM-SESSIONSTORAGE-WRITE-FIX

**Status:** approved  
**Version:** 1.0  
**Date:** 2026-03-15  
**Severity:** High  
**Type:** Bug Fix  

---

## Problem

`product/lead-response/dashboard/app/onboarding/page.tsx` reads UTM attribution from `sessionStorage.leadflow_utm`, but **nothing in the codebase writes to that key**.

`LeadMagnetSection.tsx` and `trial-signup-form.tsx` read UTM from the **current page's URL** only (`window.location.search` / `searchParams`). This means:

- A user who lands on `/?utm_source=google&utm_campaign=pilot` and then navigates to `/onboarding` loses UTM attribution entirely.
- Attribution is captured only when signup happens on the exact page that received the UTM params in the URL.
- For any multi-page journey (landing → pricing → CTA → signup), attribution is broken.

**Root cause:** The `sessionStorage.leadflow_utm` write step is missing. Previous tasks patched the **read** side (`onboarding/page.tsx`) but never implemented the **write** side.

---

## Goal

Capture UTM parameters on first touch and persist them in `sessionStorage.leadflow_utm` so they survive navigation between pages within the same session.

---

## User Story

> As a marketing-attributed visitor who lands on the LeadFlow site via a campaign link and then signs up after browsing multiple pages, my signup should be attributed to the original campaign so that marketing ROI can be measured accurately.

---

## Functional Requirements

### FR-1: UTM Capture Component

Create a client-side React component `UtmCaptureTracker` (or equivalent inline `useEffect` in root layout) that:

1. Runs on **every page load** (client-side mount) — place in root layout (`app/layout.tsx`) as a `'use client'` component.
2. Reads the following UTM params from `window.location.search`:
   - `utm_source`
   - `utm_medium`
   - `utm_campaign`
   - `utm_content`
   - `utm_term`
3. If **any** UTM param is present in the current URL:
   - Check if `sessionStorage.getItem('leadflow_utm')` already has a value (first-touch protection).
   - If **not set**, write: `sessionStorage.setItem('leadflow_utm', JSON.stringify(capturedParams))` where `capturedParams` is a plain object with only the non-null UTM keys.
   - If **already set**, do NOT overwrite (first-touch attribution wins).
4. If NO UTM params are present in the URL, do nothing — do not clear existing sessionStorage value.
5. Wrap all sessionStorage access in `try/catch` (SSR safety, private browsing).

### FR-2: Integration with Root Layout

- The component must render as `null` (no visible output).
- It must be a `'use client'` component to use browser APIs.
- It must be included in `app/layout.tsx`'s `<body>` before `{children}`.
- Pattern reference: `components/page-view-tracker.tsx` uses the same approach.

### FR-3: No Breaking Changes to Existing Reads

- `onboarding/page.tsx`'s `readUtmParams()` function already handles the read correctly (falls back to URL if sessionStorage is missing). Do not modify it.
- `LeadMagnetSection.tsx` reads UTM from current URL directly — this is acceptable for forms on the landing page itself. Do not modify it.

---

## File to Create

```
product/lead-response/dashboard/components/utm-capture-tracker.tsx
```

And update:
```
product/lead-response/dashboard/app/layout.tsx
```

---

## Acceptance Criteria

### AC-1: First-Touch Write
- Given: user lands on `/?utm_source=google&utm_campaign=pilot`
- When: page mounts
- Then: `sessionStorage.leadflow_utm` = `{"utm_source":"google","utm_campaign":"pilot"}`

### AC-2: First-Touch Protection (No Overwrite)
- Given: `sessionStorage.leadflow_utm` already has `{"utm_source":"google"}`
- When: user navigates to a page with `?utm_source=facebook`
- Then: `sessionStorage.leadflow_utm` remains `{"utm_source":"google"}` (unchanged)

### AC-3: No UTM — No Write
- Given: user lands on `/pricing` with no UTM params
- When: page mounts
- Then: `sessionStorage.leadflow_utm` is NOT set (if previously unset)

### AC-4: Cross-Page Attribution
- Given: user lands on `/?utm_source=email&utm_campaign=march-pilot`, navigates to `/onboarding`
- When: onboarding form is submitted
- Then: agent record is created with `utm_source=email`, `utm_campaign=march-pilot`

### AC-5: SSR Safety
- Given: component is rendered server-side
- Then: no error is thrown; sessionStorage access is skipped gracefully

### AC-6: Layout Integration
- Given: any page in the Next.js app
- When: page loads in browser
- Then: `UtmCaptureTracker` has run its `useEffect` within that session

---

## E2E Test Scenarios

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| T1 | First-touch UTM captured | Load `/?utm_source=google` | sessionStorage key `leadflow_utm` = `{"utm_source":"google"}` |
| T2 | First-touch not overwritten | Load page with utm_source=google, navigate to page with utm_source=fb | sessionStorage still has google |
| T3 | No UTM, no write | Load `/` with no UTM params | sessionStorage key `leadflow_utm` not set |
| T4 | Multi-page attribution persists to onboarding | Land with UTM, navigate to /onboarding, complete form | Agent record has correct utm fields |
| T5 | SSR safe | No server-side crash | Component renders null without error |

---

## Implementation Notes for Dev Agent

- Follow the exact pattern of `components/page-view-tracker.tsx`:
  - `'use client'` directive at top
  - `useEffect` with empty deps `[]` (run once on mount)
  - `try/catch` around all sessionStorage calls
  - Component returns `null`
- In `app/layout.tsx`, import and add `<UtmCaptureTracker />` to the `<body>` tag
- The component file should be: `components/utm-capture-tracker.tsx`
- Keep it under 60 lines total

---

## Out of Scope

- Server-side UTM attribution
- Cross-session persistence (localStorage)
- UTM attribution for returning visitors
- Attribution dashboard UI (covered by separate PRD)
