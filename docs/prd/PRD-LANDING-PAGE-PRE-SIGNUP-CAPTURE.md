# PRD: Landing Page Pre-Signup Interest Capture

**PRD ID:** prd-landing-page-pre-signup-capture
**Status:** ready
**Priority:** P0
**Use Case:** feat-landing-page-pre-signup-capture
**Owner:** Product Manager (spec) -> Dev -> QC
**Last Updated:** 2026-04-29
**Revenue Impact:** Recovers 5-10% of landing page visitors currently lost permanently. 1 conversion at $149/mo pays for dev time within 1 week.

---

## Executive Summary

The landing page has a binary outcome: visitors either complete signup or leave forever. There is no mechanism to capture interest from visitors who are curious but not ready to commit. With A2P registration blocking outbound SMS and zero paying customers at Day 79, every warm lead that bounces is a missed conversion opportunity.

This PRD specifies two lightweight capture mechanisms and a simple admin retrieval endpoint so Stojan can personally follow up with each prospect.

---

## 1. Problem Statement

**Current funnel gap:** Landing page visitor -> (nothing) -> gone forever.

The only actions available to a visitor are:
1. Start a free trial (email + password signup)
2. Apply for pilot program
3. Leave

Visitors in the "interested but not ready" segment (estimated 5-10% of traffic) have no path to stay engaged. Unlike the previous lead magnet UC (which required a PDF download + email nurture sequence using now-removed Supabase), this approach is minimal: capture the email, let Stojan do personal outreach.

**Why not reuse the old lead magnet implementation?**
- `feat-lead-magnet-email-capture` was never merged to main
- Its API route (`/api/lead-capture/route.ts`) uses `supabaseServer` which is dead (Supabase removed)
- It targeted `pilot_signups` table with `source='lead_magnet'` — wrong table for this purpose
- It required a PDF playbook and 3-email nurture sequence — over-engineered for current stage
- This UC uses a dedicated `prospect_waitlist` table and Stojan's personal follow-up instead

---

## 2. Solution

Two capture mechanisms on the landing page, one backend table, one admin endpoint.

### 2.1 Inline Soft CTA (always visible)

**Placement:** After the Stats Bar section, before the Features section (line ~174 in `page.tsx`, between `#stats` and `#features`). This is the highest-visibility position that doesn't disrupt the existing signup flow.

**Design:**
- Full-width section with subtle background differentiation (light emerald/teal tint)
- Headline: "Not ready to start a trial? Get updates on LeadFlow AI."
- Subtext: "Join 300+ agents following our progress. No spam, just product updates."
- Two fields: Email (required), First Name (optional)
- Submit button: "Keep Me Updated"
- On success: fields replaced with "You're on the list! We'll be in touch." confirmation text
- `data-testid="inline-capture-form"`

**Behavior:**
- Does NOT render if `localStorage.getItem('leadflow_token')` exists (user already signed up)
- Does NOT render if `localStorage.getItem('prospect_captured')` is set (already submitted)
- On successful submit: set `localStorage.setItem('prospect_captured', 'true')`
- GA4 event: `trackCTAClick('inline_capture_submit', 'Keep Me Updated', 'inline_capture')`

### 2.2 Exit Intent Slide-In (triggered)

**Trigger conditions (any one):**
- Desktop: `mouseleave` event where `event.clientY < 0` (cursor exits viewport top)
- Mobile: 60 seconds on page without any `click`, `scroll`, or `touchstart` event

**Suppression conditions (do NOT show if ANY are true):**
- `localStorage.getItem('leadflow_token')` exists
- `localStorage.getItem('prospect_captured')` is set
- `localStorage.getItem('exit_intent_dismissed')` is set
- User has already interacted with the trial signup form (check for `input` event on TrialSignupForm)

**Design:**
- Bottom-right slide-in card (not a full modal — don't block the page)
- 400px max width, subtle shadow, rounded corners
- Headline: "Before you go..."
- Body: "Drop your email and we'll send you our best lead conversion tips — plus early access when we launch new features."
- Fields: Email (required), First Name (optional)
- Buttons: "Get Updates" (primary) and X close button
- On success: card content replaced with "Got it! Check your inbox." then auto-dismiss after 3s
- On dismiss (X): set `localStorage.setItem('exit_intent_dismissed', 'true')` — suppress for this browser session
- `data-testid="exit-intent-modal"`

**Animation:** Slide up from bottom-right with a 300ms ease-out transition. No aggressive popups.

**GA4 events:**
- `trackCTAClick('exit_intent_shown', 'Exit Intent Shown', 'exit_intent')` — on trigger
- `trackCTAClick('exit_intent_submit', 'Get Updates', 'exit_intent')` — on submit
- `trackCTAClick('exit_intent_dismissed', 'Dismissed', 'exit_intent')` — on close

---

## 3. Requirements

### 3.1 Database Schema

**New table: `prospect_waitlist`**

```sql
-- Migration: 030_prospect_waitlist.sql
CREATE TABLE IF NOT EXISTS prospect_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT,
  source TEXT NOT NULL DEFAULT 'inline_cta',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT prospect_waitlist_email_unique UNIQUE (email)
);

CREATE INDEX idx_prospect_waitlist_created_at ON prospect_waitlist (created_at DESC);
```

**Column notes:**
- `source`: one of `'inline_cta'`, `'exit_intent'` — identifies which capture mechanism
- `email`: UNIQUE constraint enables upsert dedup
- UTM fields captured from `sessionStorage` (existing UTM capture already writes to sessionStorage on landing page load)

Apply via genome migration runner: `~/.openclaw/genome/migrations/030_prospect_waitlist.sql`

### 3.2 API: POST /api/prospects/capture

**Location:** Next.js API route at `product/lead-response/dashboard/app/api/prospects/capture/route.ts`

This is a Next.js route (not Express) because it's called by the landing page frontend on Vercel.

**Request body:**
```json
{
  "email": "agent@example.com",
  "firstName": "Jane",
  "source": "inline_cta",
  "utmSource": "google",
  "utmMedium": "cpc",
  "utmCampaign": "pilot-launch"
}
```

**Validation:**
- `email` — required, validate format with regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `firstName` — optional, trim, max 100 chars
- `source` — optional, default `'inline_cta'`, must be one of `['inline_cta', 'exit_intent']`
- UTM fields — optional strings, trim

**Behavior:**
1. Validate email format. Return 400 if invalid.
2. Upsert into `prospect_waitlist` on email conflict — update `source`, UTM fields, but keep original `created_at`.
3. Return `{ success: true }` with 200.

**Database connection:** Use the same pattern as other Next.js API routes in this project. Check how `trial-signup/route.ts` connects to the database — if it uses a working database client, use the same. If it uses the dead Supabase client, use a direct PostgreSQL connection via the public API at `api.imagineapi.org` (Cloudflare tunnel to local Express server).

**Error responses:**
- 400: `{ success: false, error: "Invalid email address" }`
- 500: `{ success: false, error: "Something went wrong. Please try again." }` (never leak DB errors)

**CORS:** Include `Access-Control-Allow-Origin: *` headers (same pattern as existing `/api/lead-capture/route.ts`).

**Rate limiting:** Not required for MVP. The UNIQUE constraint on email prevents spam from creating duplicate rows. Worst case: someone hammers the endpoint — upsert is idempotent.

### 3.3 API: GET /api/admin/prospects

**Location:** Express route at `routes/admin/prospects.js`

This is an Express route (not Next.js) because it's an admin endpoint accessed via `api.imagineapi.org` with API key auth — same pattern as `routes/admin/activation-outreach.js`.

**Auth:** `requireApiKey` middleware (`x-api-key` header matching `LEADFLOW_API_KEY`).

**Response:**
```json
{
  "prospects": [
    {
      "email": "agent@example.com",
      "first_name": "Jane",
      "source": "exit_intent",
      "utm_source": "google",
      "created_at": "2026-04-29T14:30:00.000Z"
    }
  ],
  "total": 1
}
```

**Query:** `SELECT email, first_name, source, utm_source, created_at FROM prospect_waitlist ORDER BY created_at DESC LIMIT 200`

**Wire into Express app:** Register in `server.js` alongside other admin routes.

### 3.4 UI Components

**New files:**
1. `product/lead-response/dashboard/components/inline-capture-form.tsx` — inline soft CTA component
2. `product/lead-response/dashboard/components/exit-intent-capture.tsx` — exit intent slide-in component

Both components:
- Are `'use client'` components
- Read UTM from `sessionStorage` (keys: `utm_source`, `utm_medium`, `utm_campaign` — already captured by existing landing page UTM code)
- Call `POST /api/prospects/capture` on submit
- Handle loading, success, and error states
- Use Tailwind CSS for styling (no inline styles)

**Integration into `page.tsx`:**
- Import and render `InlineCaptureForm` between the Stats Bar and Features sections
- Import and render `ExitIntentCapture` once at the bottom of the page (it positions itself absolutely)

### 3.5 Analytics

Both components fire GA4 events via the existing `trackCTAClick()` function from `@/lib/analytics/ga4`. Event IDs listed in sections 2.1 and 2.2.

No new analytics infrastructure needed.

---

## 4. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `prospect_waitlist` table exists with correct schema | `psql openclaw -c "\d prospect_waitlist"` shows all columns with correct types and UNIQUE constraint on email |
| AC-2 | Inline CTA renders between Stats and Features sections | Load landing page, visually confirm placement. `document.querySelector('[data-testid="inline-capture-form"]')` is non-null |
| AC-3 | Inline CTA hidden for logged-in users | Set `localStorage.setItem('leadflow_token', 'x')`, reload — form must not render |
| AC-4 | Exit intent fires on cursor exit (desktop) | Move cursor above viewport top — slide-in appears. `document.querySelector('[data-testid="exit-intent-modal"]')` is non-null |
| AC-5 | Exit intent fires after 60s inactivity (mobile) | Wait 60s without interaction — slide-in appears |
| AC-6 | Exit intent suppressed after dismiss | Click X, reload page — slide-in does not reappear (check `localStorage.getItem('exit_intent_dismissed')`) |
| AC-7 | POST /api/prospects/capture creates row | Submit form, query `SELECT * FROM prospect_waitlist WHERE email = 'test@example.com'` — row exists |
| AC-8 | Dedup: same email twice yields 1 row | Submit same email twice. `SELECT count(*) FROM prospect_waitlist WHERE email = 'test@example.com'` returns 1 |
| AC-9 | GET /api/admin/prospects returns list | `curl -H "x-api-key: $LEADFLOW_API_KEY" https://api.imagineapi.org/api/admin/prospects` returns JSON with prospects array |
| AC-10 | GET /api/admin/prospects rejects unauthorized | `curl https://api.imagineapi.org/api/admin/prospects` returns 401 |
| AC-11 | UTM fields captured from sessionStorage | Set sessionStorage UTM values, submit form, verify UTM columns populated in DB row |
| AC-12 | No regression to existing signup flow | Existing trial signup E2E tests still pass. `npm test` exits 0 |
| AC-13 | Build passes | `npm run build` (root) AND `cd product/lead-response/dashboard && npx next build` exit 0 |

---

## 5. Testing

### 5.1 E2E Tests

File: `tests/e2e/prospect-capture.spec.ts`

**Test cases:**
1. **Inline form renders on landing page** — check `data-testid="inline-capture-form"` exists
2. **Inline form hidden for logged-in users** — set localStorage token, verify form not rendered
3. **Submit inline form creates prospect** — fill email + first name, submit, verify success state renders
4. **Submit with invalid email shows error** — submit "not-an-email", verify error message
5. **Dedup: second submit with same email succeeds** — submit same email twice, both return success, DB has 1 row
6. **Exit intent modal has correct structure** — check `data-testid="exit-intent-modal"` exists with expected child elements
7. **Exit intent dismiss sets localStorage** — verify `exit_intent_dismissed` flag is set after close
8. **Admin endpoint returns prospects** — call GET /api/admin/prospects with valid API key, verify response shape
9. **Admin endpoint rejects without API key** — call without header, verify 401

### 5.2 Unit Tests

File: `tests/unit/prospect-capture.test.js`

**Test cases:**
1. Email validation rejects malformed emails
2. Email validation accepts valid emails
3. Source field defaults to `'inline_cta'`
4. Source field rejects invalid values
5. firstName is trimmed and capped at 100 chars

### 5.3 Existing Test Regression

Run `npm test` — 0 failures. Existing landing page and signup tests must not break.

---

## 6. Implementation Notes for Dev Agent

### 6.1 Files to Create
- `~/.openclaw/genome/migrations/030_prospect_waitlist.sql`
- `product/lead-response/dashboard/app/api/prospects/capture/route.ts`
- `product/lead-response/dashboard/components/inline-capture-form.tsx`
- `product/lead-response/dashboard/components/exit-intent-capture.tsx`
- `routes/admin/prospects.js`
- `tests/e2e/prospect-capture.spec.ts`
- `tests/unit/prospect-capture.test.js`

### 6.2 Files to Modify
- `product/lead-response/dashboard/app/page.tsx` — import and render both new components
- `server.js` — register `routes/admin/prospects.js`

### 6.3 Watch Out For
- **Dead Supabase client:** `/api/lead-capture/route.ts` uses `supabaseServer` which is dead. Do NOT copy this pattern. Check how working Next.js API routes connect to the database.
- **Old lead magnet code:** Don't touch `/api/lead-capture/route.ts` or `lib/lead-magnet-email.ts`. They're dead code from a never-merged UC. This is a new, independent implementation.
- **localStorage availability:** Wrap `localStorage` access in try/catch for SSR safety (Next.js renders server-side first).
- **page.tsx size:** Currently ~600 lines. Adding two component imports keeps it well under 1500 line limit — the components themselves are in separate files.
- **UTM sessionStorage keys:** The existing UTM capture code on the landing page uses keys `utm_source`, `utm_medium`, `utm_campaign` in sessionStorage. Read from these exact keys.

### 6.4 Database Connection from Vercel
The Next.js capture endpoint runs on Vercel and needs to write to local PostgreSQL. Options:
1. If a working database client exists in the Next.js app (check `lib/` for pg/postgres clients), use it
2. Otherwise, POST to `https://api.imagineapi.org` (Cloudflare tunnel) which proxies to the local Express server — add an internal Express route that the Next.js route can call
3. As a last resort, add a `pg` dependency to the Next.js app and connect directly using `LOCAL_PG_URL` configured as a Vercel env var

The dev agent should investigate option 1 first, then fall back to 2 or 3.

---

## 7. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Exit intent annoys users | Medium | Low | Suppressed after dismiss, hidden for logged-in users, only triggers once per session |
| Low capture volume (< 5/month) | Medium | Low | Zero cost to maintain. Even 1 conversion covers the dev time. |
| Spam submissions | Low | Low | UNIQUE constraint prevents duplicate rows. No email sent on capture — no amplification vector. |
| Database connection from Vercel fails | Medium | Medium | Dev agent must verify DB connectivity pattern before implementing. Fallback: proxy through Express API. |

---

## 8. Out of Scope

- Email nurture sequence (the old lead magnet approach). Stojan does personal follow-up.
- PDF or downloadable resource. Not needed for capture-only flow.
- Admin UI in the dashboard. Stojan uses the API endpoint directly (or a simple curl command).
- A/B testing the capture form. Ship it, measure, iterate.
- GDPR consent checkbox. All prospects are US-based real estate agents (ICP). Add if/when international traffic appears.
