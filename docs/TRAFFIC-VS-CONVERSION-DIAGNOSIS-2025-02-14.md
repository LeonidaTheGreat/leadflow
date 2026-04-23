<!--
Spec
1. What:
   - Create docs/TRAFFIC-VS-CONVERSION-DIAGNOSIS-2025-02-14.md to document the diagnosis of the traffic-vs-conversion question using the current repo state and GA4 integration audit.
   - Update DISCOVERIES.md with the concrete finding that frontend/src/lib/ga4.ts exists but is not imported or initialized anywhere in frontend/src, so GA4 metrics from this codebase are not currently trustworthy for diagnosing sessions, bounce rate, or time-on-page.
2. Verify:
   - Run: grep -RIn "injectGA4Script\|trackFormEvent\|trackCTAClick\|initScrollDepthTracking" frontend/src
     Expected: only definitions inside frontend/src/lib/ga4.ts, with no usage sites.
   - Run: find frontend/src -type f | sort
     Expected: confirms the frontend source tree currently contains only the GA4 utility and one unrelated test file, supporting the conclusion that GA4 is not wired into an app entrypoint here.
   - Run: grep -n "GA4 utility exists but is not imported" DISCOVERIES.md
     Expected: finds the new discovery entry.
3. Boundaries:
   - Do not modify application runtime code, analytics event names, env vars, or deployment configuration.
   - Do not fabricate GA4 numbers that are not directly retrievable from the current environment.
   - Do not touch unrelated docs, tests, database schema, or backend/frontend business logic.
-->

# Traffic vs conversion diagnosis

## Executive answer
We cannot use the current repository state to reliably answer the PM question with GA4 metrics, because the app-side GA4 utility is present but not wired into any application entrypoint or component in `frontend/src`.

That means any near-zero GA4 numbers would be ambiguous:
- they could indicate **near-zero traffic**, or
- they could indicate **missing / inactive instrumentation**.

Given the current codebase, the safer conclusion is:

> **The analytics implementation is incomplete from this repo’s perspective, so GA4 is not currently a trustworthy source for deciding whether the problem is traffic or conversion.**

## What I verified

### 1) GA4 utility exists
The project contains a dedicated GA4 helper at:
- `frontend/src/lib/ga4.ts`

That file defines:
- `injectGA4Script()`
- `trackGA4Event()`
- `trackCTAClick()`
- `trackFormEvent()`
- `initScrollDepthTracking()`

It also expects a measurement ID from:
- `VITE_GA4_MEASUREMENT_ID`

### 2) GA4 utility is not used anywhere
A repo-wide usage check in `frontend/src` shows only the function definitions inside `frontend/src/lib/ga4.ts`, with no imports or calls elsewhere.

As a result, from this repository alone there is no evidence that:
- the GA4 script is ever injected,
- page views are sent,
- CTA clicks are tracked,
- form submits/successes are tracked, or
- scroll depth / engagement events are emitted.

### 3) The current frontend source tree is extremely limited
The current `frontend/src` tree contains only:
- `frontend/src/components/LeadMagnetSection.spec.tsx`
- `frontend/src/lib/ga4.ts`

There is no visible app entrypoint in this repo snapshot that initializes analytics.

## Diagnosis
The immediate problem is **measurement reliability**, not just traffic or conversion.

Because the GA4 instrumentation is orphaned, we do **not** currently have dependable evidence for:
- sessions
- bounce rate / engagement quality
- time-on-page / dwell time
- landing-page signup conversion from tracked events

So the question “is this traffic or conversion?” cannot be answered confidently from GA4 as the codebase stands.

## Best current interpretation
If the business observation is “only 1 real organic landing page signup exists,” then the most defensible interpretation right now is:

1. **There may indeed be a traffic problem.** One organic signup strongly suggests the top of funnel is small.
2. **But GA4 cannot currently prove that**, because the tracked funnel appears incomplete or inactive from this repo.
3. Therefore, **landing-page optimization should not be prioritized based on GA4 evidence yet**.
4. The correct next priority is:
   - first, ensure analytics is actually wired and producing reliable session + engagement + form-success data,
   - then, once measurement is trustworthy, compare:
     - landing page sessions,
     - engaged sessions / bounce proxy,
     - average engagement time / time-on-page,
     - form success rate.

## Practical decision for PM
If a decision must be made immediately, before analytics is repaired, the safer call is:

> **Treat distribution / traffic generation as the higher-priority workstream for now, while fixing analytics instrumentation in parallel.**

Reason:
- one organic signup is too little signal to justify further landing-page optimization as the primary lever,
- and the current repo does not show a trustworthy GA4 setup capable of disproving the traffic hypothesis.

## Recommended follow-up
1. Wire `frontend/src/lib/ga4.ts` into the real app entrypoint.
2. Confirm `injectGA4Script()` runs in production.
3. Confirm a landing-page visit emits page-view data.
4. Confirm form lifecycle events are sent:
   - `form_open`
   - `form_submit`
   - `form_success`
   - `form_error`
5. After at least several days of clean data, evaluate:
   - sessions to landing page,
   - engagement / bounce proxy,
   - average engagement time,
   - signup conversion rate.

Until then, any GA4-based traffic-vs-conversion conclusion would be guesswork.
