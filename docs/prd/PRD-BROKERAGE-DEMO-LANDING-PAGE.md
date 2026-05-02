# PRD: Brokerage/Team Sales Landing Page — Convert $999/mo Inbound via Cal.com Demo Booking

**PRD ID:** prd-brokerage-demo-landing-page
**Status:** ready
**Priority:** P0 (Revenue — one brokerage deal = 6x Pro subscriber)
**Use Case:** feat-brokerage-demo-landing-page
**Owner:** Product Manager (spec) → Dev → QC
**Last Updated:** 2026-05-01
**Revenue Impact:** A single Brokerage deal ($999/mo) or Team deal ($399/mo) dwarfs individual Pro conversions. Currently, the only CTA for these tiers is `mailto:sales@leadflow.ai` — a dead end. Zero capture, zero booking.

---

## Executive Summary

The pricing page has "Contact Sales" CTAs for the Brokerage ($999+/mo) and Team ($399/mo) tiers. Both redirect to `mailto:sales@leadflow.ai`, which:
1. Requires the visitor to have a mail client configured (many don't on mobile/web)
2. Provides zero structure — the email has no subject context, no qualifying info
3. Captures nothing if the visitor abandons the mailto flow
4. Has no booking mechanism — Stojan must email back to schedule a call

This PRD specifies a dedicated `/brokerage` landing page with: brokerage-specific value props, a Cal.com demo booking widget, a lead capture form, Telegram notification to Stojan, and updated CTAs on the pricing page.

---

## 1. Problem Statement

**Current state:** Pricing page → "Contact Sales" → `mailto:sales@leadflow.ai` → nothing captured, no booking.

**Evidence the gap matters:**
- Brokerage tier ($999+/mo) = 6.7x a Pro subscriber ($149/mo). One conversion = transformative MRR.
- Team tier ($399/mo) = 2.7x a Pro subscriber. Significant uplift.
- Zero inbound mechanism exists for either tier. No form, no booking, no capture.
- `mailto:` links have notoriously low completion rates on mobile (~10-20%).

**Why now:** Day 79 of 90 toward first paying customer, extended to Day 180 for $20K MRR. Brokerage/team deals are the fastest path to meaningful MRR — but only if inbound interest can be captured and converted.

---

## 2. Solution Overview

| Component | What | Where |
|-----------|------|-------|
| Landing page | Brokerage-specific page with hero, value props, Cal.com booking, lead capture | `app/brokerage/page.tsx` |
| Lead capture API | Inserts inquiry into `pilot_signups` + sends Telegram notification | `app/api/brokerage-inquiry/route.ts` |
| Pricing page update | "Contact Sales" CTAs → `/brokerage` link for Team and Brokerage tiers | `app/pricing/page.tsx` |
| SEO | Meta tags for real estate team/brokerage AI lead response | `app/brokerage/page.tsx` head |

---

## 3. Requirements

### 3.1 Page: `/brokerage`

**File:** `product/lead-response/dashboard/app/brokerage/page.tsx`

This is a `'use client'` Next.js page. Matches the existing dark theme from the pricing page (slate-900 gradient background, emerald accents).

#### 3.1.1 Hero Section

- Headline: **"AI That Answers Every Lead in 30 Seconds — For Your Entire Team"**
- Subheadline: "Stop losing leads to slow response times. LeadFlow AI responds to every inbound inquiry within 30 seconds, qualifies prospects, and books appointments — automatically."
- Primary CTA: "Book a Demo" → scrolls to Cal.com booking section (`#book-demo`)
- Secondary CTA: "See Pricing" → scrolls to pricing callout section (`#pricing`)
- `data-testid="brokerage-hero"`

#### 3.1.2 Social Proof / Stats Bar

Three stats in a horizontal row:
- **< 30s** — "Average response time"
- **24/7** — "AI coverage, nights & weekends"
- **FUB** — "Follow Up Boss native integration"

`data-testid="brokerage-stats"`

#### 3.1.3 Value Props Section

Four cards in a 2x2 grid (lg:grid-cols-2), each with an icon, title, and 2-line description:

| # | Title | Description |
|---|-------|-------------|
| 1 | Team Lead Routing | Incoming leads automatically routed to the right agent based on territory, availability, or round-robin rules |
| 2 | Compliance & Reporting | Full audit trail of every AI response. Export compliance reports for your brokerage's records |
| 3 | White-Label Options | Your brokerage name, your brand. Clients see your identity, not ours |
| 4 | SLA Guarantee (99.9%) | Dedicated infrastructure with 99.9% uptime SLA. Dedicated account manager for onboarding and support |

`data-testid="brokerage-value-props"`

#### 3.1.4 How It Works Section

Three numbered steps:
1. **Connect Follow Up Boss** — "Link your FUB account in 2 minutes. LeadFlow syncs your team roster and lead sources automatically."
2. **AI Responds Instantly** — "Every new lead gets a personalized SMS within 30 seconds. AI qualifies interest, answers questions, and handles objections."
3. **Appointments Get Booked** — "Qualified leads are booked directly onto your agents' calendars via Cal.com. No manual follow-up needed."

`data-testid="brokerage-how-it-works"`

#### 3.1.5 Pricing Callout

Anchor: `id="pricing"`

Two cards side-by-side (md:grid-cols-2):

| Card | Title | Price | Includes |
|------|-------|-------|----------|
| Team | For small teams | $399/mo | 5 agents included, unlimited SMS, full AI, team analytics, priority support |
| Brokerage | For large brokerages | $999+/mo | 20+ agents, white-label, compliance reporting, SLA, dedicated AM, custom integrations |

Below both cards: "Custom pricing available for 10+ agents. Book a demo to discuss."

Each card has a "Book a Demo" button that scrolls to `#book-demo`.

`data-testid="brokerage-pricing"`

#### 3.1.6 Cal.com Booking Section

Anchor: `id="book-demo"`

- Section heading: **"Book a 15-Minute Demo"**
- Subheading: "Talk directly with Stojan, our founder. No sales team — just a conversation about how LeadFlow can work for your brokerage."
- Cal.com embed: **iframe** pointing to `NEXT_PUBLIC_DEMO_BOOKING_URL` (env var already exists, currently used on pricing page demo CTA)
  - Iframe dimensions: `width="100%" height="700" frameBorder="0"`
  - Fallback: if env var not set, show a direct link: "Schedule via Cal.com" pointing to `https://cal.com`
- `data-testid="brokerage-cal-embed"`

**Important:** The `NEXT_PUBLIC_DEMO_BOOKING_URL` env var should point to Stojan's Cal.com booking page. This is the same env var used by the pricing page demo CTA. If a separate "Brokerage Demo" event type is needed, Stojan will configure it in Cal.com separately — the code just uses whatever URL the env var provides.

#### 3.1.7 Lead Capture Form (Below the Fold)

Anchor: `id="inquiry-form"`

- Section heading: **"Not Ready to Book? Tell Us About Your Team"**
- Subheading: "We'll follow up within 24 hours with a custom proposal."
- Fields:
  - **Name** (required) — text input, `data-testid="inquiry-name"`
  - **Brokerage Name** (required) — text input, `data-testid="inquiry-brokerage"`
  - **Team Size** (required) — select dropdown: "1-5 agents", "6-10 agents", "11-20 agents", "20+ agents", `data-testid="inquiry-team-size"`
  - **Email** (required) — email input, `data-testid="inquiry-email"`
  - **Phone** (optional) — tel input, `data-testid="inquiry-phone"`
- Submit button: "Get a Custom Proposal" → calls `POST /api/brokerage-inquiry`
- States:
  - **Loading:** Button disabled, spinner, "Submitting..."
  - **Success:** Form replaced with "Thanks, [Name]! We'll reach out within 24 hours with a proposal for [Brokerage Name]."
  - **Error:** Inline error below form: "Something went wrong. Please try again or email sales@leadflow.ai directly."
- `data-testid="brokerage-inquiry-form"`

GA4 events (via existing `trackEvent` from `@/lib/analytics/ga4`):
- `trackEvent('brokerage_inquiry_submit', { team_size: selectedSize, source: 'brokerage_landing' })`
- `trackEvent('brokerage_page_view', { source: 'pricing_cta' })` on page load

#### 3.1.8 SEO Metadata

Use Next.js `metadata` export (or `<head>` for client component):
- **Title:** "LeadFlow AI for Real Estate Teams and Brokerages"
- **Description:** "AI lead response for real estate teams. Respond to every lead in under 30 seconds. FUB integration, Cal.com booking, compliance reporting. Starting at $399/mo."
- **OG tags:** Same title and description, type `website`

Since this is a `'use client'` page, SEO metadata should be set via a `<head>` block or by exporting `metadata` from a separate `layout.tsx` file at `app/brokerage/layout.tsx`. The dev should use whichever pattern other pages in the project use.

---

### 3.2 API: POST /api/brokerage-inquiry

**File:** `product/lead-response/dashboard/app/api/brokerage-inquiry/route.ts`

This is a Next.js API route (runs on Vercel). Follows the same database connectivity pattern as other working Next.js API routes in the project.

#### Request Body

```json
{
  "name": "Jane Smith",
  "brokerageName": "Keller Williams Downtown",
  "teamSize": "6-10 agents",
  "email": "jane@kwdowntown.com",
  "phone": "555-123-4567"
}
```

#### Validation

| Field | Required | Validation |
|-------|----------|------------|
| `name` | Yes | Non-empty string, trim, max 200 chars |
| `brokerageName` | Yes | Non-empty string, trim, max 200 chars |
| `teamSize` | Yes | One of: `"1-5 agents"`, `"6-10 agents"`, `"11-20 agents"`, `"20+ agents"` |
| `email` | Yes | Valid email format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` |
| `phone` | No | Trim, max 20 chars |

#### Behavior

1. Validate all fields. Return 400 with specific error message for first invalid field.
2. Insert into `pilot_signups` table:
   ```sql
   INSERT INTO pilot_signups (name, email, phone, brokerage_name, team_name, monthly_leads, source, status)
   VALUES ($1, $2, $3, $4, $4, $5, 'brokerage_landing', 'new')
   ON CONFLICT (email) DO UPDATE SET
     brokerage_name = EXCLUDED.brokerage_name,
     team_name = EXCLUDED.team_name,
     monthly_leads = EXCLUDED.monthly_leads,
     phone = COALESCE(EXCLUDED.phone, pilot_signups.phone),
     updated_at = NOW()
   ```
   - `brokerage_name` and `team_name` both set to the submitted `brokerageName` value
   - `monthly_leads` set to `teamSize` value (e.g., "6-10 agents")
   - `source` = `'brokerage_landing'`
   - Upsert on email conflict to prevent duplicates while updating info
3. Send Telegram notification to Stojan (fire-and-forget — don't block the response):
   ```
   🏢 New Brokerage Inquiry

   Name: Jane Smith
   Brokerage: Keller Williams Downtown
   Team Size: 6-10 agents
   Email: jane@kwdowntown.com
   Phone: 555-123-4567
   ```
   Use `sendTelegramMessage()` from `@/lib/telegram-service` (already exists in the Next.js app).
4. Return `{ success: true }` with 200.

#### Error Responses

- 400: `{ success: false, error: "Name is required" }` (specific to failed field)
- 405: `{ success: false, error: "Method not allowed" }` (non-POST)
- 500: `{ success: false, error: "Something went wrong. Please try again." }` (never leak DB errors)

#### Database Connection

Use the same pattern as the working `/api/auth/trial-signup/route.ts` or `/api/prospects/capture/route.ts` (from the pre-signup capture UC). The dev agent should check which DB client these routes use and follow the same pattern. The database is local PostgreSQL accessed via the public API at `api.imagineapi.org` from Vercel.

---

### 3.3 Pricing Page Update

**File:** `product/lead-response/dashboard/app/pricing/page.tsx`

#### Current Behavior (line 169-171)

```typescript
if (tier === 'brokerage') {
  window.location.href = 'mailto:sales@leadflow.ai?subject=Brokerage Plan Inquiry'
  return
}
```

#### New Behavior

Replace the `mailto:` redirect for the `brokerage` tier:

```typescript
if (tier === 'brokerage') {
  window.location.href = '/brokerage'
  return
}
```

Also add a check for the `team` tier to redirect to `/brokerage`:

```typescript
if (tier === 'team') {
  window.location.href = '/brokerage'
  return
}
```

**Wait — the Team tier has Stripe checkout.** Team is a self-serve plan with Stripe pricing. Do NOT replace the Team checkout flow. Instead:

**Revised approach for Team tier:** Add a secondary "Or talk to sales" link below the Team tier CTA button that links to `/brokerage`. The primary "Get Started" button keeps its Stripe checkout behavior.

**Implementation for Team tier card only:**
After the CTA button for the `team` tier, add:
```tsx
{plan.tier === 'team' && (
  <a href="/brokerage" className="block text-center text-xs text-slate-400 hover:text-slate-300 mt-2">
    Or talk to sales for custom pricing →
  </a>
)}
```

**For Brokerage tier:** Change `handleSelectPlan` to navigate to `/brokerage` instead of `mailto:`.

---

### 3.4 Landing Page Link (Optional Enhancement)

**File:** `product/lead-response/dashboard/app/page.tsx`

If the main landing page has a pricing section that shows the Brokerage tier with a "Contact Sales" link, update it to point to `/brokerage` as well. This is the same pattern — replace any `mailto:sales@leadflow.ai` reference with `/brokerage`.

**Scope:** Only if the landing page already has a Brokerage CTA. Do not add a new section to the landing page.

---

## 4. User Stories

### US-1: Brokerage Owner Discovers Page via Pricing

> As a brokerage owner viewing the LeadFlow pricing page, when I click "Contact Sales" on the Brokerage tier, I am taken to a dedicated page that speaks to my needs as a brokerage, shows relevant pricing, and lets me book a demo or submit my team info.

### US-2: Brokerage Owner Books a Demo

> As a brokerage owner on the /brokerage page, I can book a 15-minute demo directly via the Cal.com widget without leaving the page. The booking flow is embedded and requires no email exchange.

### US-3: Brokerage Owner Submits Inquiry

> As a brokerage owner who isn't ready to book a call, I can fill out a short form with my name, brokerage, team size, email, and phone. I receive confirmation that someone will follow up within 24 hours.

### US-4: Stojan Gets Notified

> As the founder, when a brokerage inquiry is submitted, I receive a Telegram notification within seconds containing the prospect's name, brokerage, team size, and contact info so I can follow up immediately.

### US-5: Team Lead Explores Sales Page

> As a team lead viewing the pricing page, I see a "talk to sales" link under the Team tier CTA. Clicking it takes me to /brokerage where I can learn about team features and book a demo.

---

## 5. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | `/brokerage` page renders without errors | `curl -s -o /dev/null -w "%{http_code}" https://leadflow-ai-five.vercel.app/brokerage` returns 200 |
| AC-2 | Hero section displays correct headline and CTAs | Visual inspection + `document.querySelector('[data-testid="brokerage-hero"]')` is non-null |
| AC-3 | Cal.com booking widget is visible and interactive | `document.querySelector('[data-testid="brokerage-cal-embed"] iframe')` is non-null and has valid `src` |
| AC-4 | Lead capture form validates required fields | Submit empty form — error shown. Submit with valid data — success message shown |
| AC-5 | POST /api/brokerage-inquiry inserts into `pilot_signups` with `source='brokerage_landing'` | Submit form, then `psql openclaw -c "SELECT * FROM pilot_signups WHERE source='brokerage_landing' ORDER BY created_at DESC LIMIT 1"` shows the row |
| AC-6 | Telegram notification sent to Stojan on inquiry submit | Submit form, check Telegram chat for notification with brokerage name and team size |
| AC-7 | Duplicate email upserts (no error, updates info) | Submit same email twice with different brokerage name — only 1 row, latest brokerage name |
| AC-8 | Pricing page Brokerage "Contact Sales" navigates to `/brokerage` (not mailto) | Click "Contact Sales" on Brokerage tier — URL changes to `/brokerage` |
| AC-9 | Pricing page Team tier has "talk to sales" link to `/brokerage` | Visual inspection below Team CTA button |
| AC-10 | `npm run build` exits 0 | `cd product/lead-response/dashboard && npx next build` completes without errors |
| AC-11 | SEO meta tags present | View page source — `<title>` contains "LeadFlow AI for Real Estate Teams" |
| AC-12 | Page matches existing dark theme | Visual inspection — slate-900 background, emerald accents, consistent with /pricing |

---

## 6. E2E Test Spec

**File:** `tests/e2e/brokerage-landing-page.test.js`

| # | Test Case | What to verify |
|---|-----------|----------------|
| 1 | `/brokerage` page renders hero section | GET /brokerage returns 200, response contains "brokerage-hero" testid |
| 2 | Cal.com embed section exists | Response contains "brokerage-cal-embed" testid |
| 3 | Inquiry form has all required fields | Response contains all 5 form field testids |
| 4 | POST /api/brokerage-inquiry with valid data returns success | POST with valid payload → `{ success: true }` with 200 |
| 5 | POST /api/brokerage-inquiry with missing name returns 400 | POST with empty name → 400 |
| 6 | POST /api/brokerage-inquiry with invalid email returns 400 | POST with "not-an-email" → 400 |
| 7 | POST /api/brokerage-inquiry with invalid teamSize returns 400 | POST with "100 agents" → 400 |
| 8 | Duplicate email upserts without error | POST same email twice → both return 200, `pilot_signups` has 1 row for that email |
| 9 | `pilot_signups` row has `source='brokerage_landing'` | After POST, query DB and verify source field |
| 10 | Pricing page Brokerage CTA links to /brokerage | Verify `handleSelectPlan('brokerage')` navigates to /brokerage, not mailto |

---

## 7. Technical Spec

### 7.1 Files to Create

| File | Type | Purpose |
|------|------|---------|
| `product/lead-response/dashboard/app/brokerage/page.tsx` | Next.js page | Brokerage landing page |
| `product/lead-response/dashboard/app/api/brokerage-inquiry/route.ts` | Next.js API route | Lead capture endpoint |
| `tests/e2e/brokerage-landing-page.test.js` | Jest E2E test | Acceptance verification |

### 7.2 Files to Modify

| File | Change |
|------|--------|
| `product/lead-response/dashboard/app/pricing/page.tsx` | Brokerage CTA → `/brokerage`, Team tier "talk to sales" link |

### 7.3 No New Database Tables or Migrations

The `pilot_signups` table already has all needed columns:
- `name` TEXT NOT NULL
- `email` TEXT NOT NULL (with unique index from migration 006)
- `phone` TEXT
- `brokerage_name` TEXT
- `team_name` TEXT
- `monthly_leads` TEXT
- `source` TEXT DEFAULT 'landing_page'
- `status` TEXT DEFAULT 'new'

No schema changes needed. The `source='brokerage_landing'` value distinguishes these from other signup sources.

### 7.4 Env Vars

No new env vars required. Uses existing:
- `NEXT_PUBLIC_DEMO_BOOKING_URL` — Cal.com booking URL (already configured)
- `TELEGRAM_BOT_TOKEN` / `ORCHESTRATOR_BOT_TOKEN` — for notifications (already configured)
- `TELEGRAM_CHAT_ID` — notification target (already configured)
- Database connection — same as existing Next.js API routes

### 7.5 Design Tokens (Match Existing Theme)

The page must use the same visual language as `/pricing`:
- Background: `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
- Accent: `emerald-500` / `emerald-400`
- Cards: `bg-slate-800/30 border border-slate-700/50 rounded-2xl`
- Text: `text-white` (headings), `text-slate-300` (body), `text-slate-400` (muted)
- CTA buttons: `bg-gradient-to-r from-emerald-500 to-emerald-600 text-white`
- Header: Reuse the same header pattern from pricing page

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cal.com embed blocked by browser/iframe policy | Low | Medium | Cal.com allows iframe embedding by default. Fallback: direct link "Schedule via Cal.com" |
| Low traffic to /brokerage (no organic discovery) | Medium | Low | Primary traffic source is pricing page CTA. SEO provides long-tail discovery. Page exists at near-zero maintenance cost. |
| Telegram notification fails silently | Low | Medium | `sendTelegramMessage` already has error logging. Inquiry is still captured in DB regardless. Stojan can check `pilot_signups` table. |
| DB connection from Vercel fails | Medium | Medium | Dev must verify DB connectivity pattern from existing Next.js API routes before implementing. Fallback: proxy through Express API at `api.imagineapi.org`. |

---

## 9. Out of Scope

- **Custom Cal.com event type for "Brokerage Demo"** — Stojan configures this in Cal.com admin. The code just uses `NEXT_PUBLIC_DEMO_BOOKING_URL`.
- **Email auto-responder to inquiry submitter** — Stojan follows up personally within 24h. Automated email can be added later.
- **CRM integration for brokerage leads** — pilot_signups is the CRM for now. FUB integration for brokerage pipeline is a separate UC.
- **Brokerage-specific onboarding flow** — This page captures interest only. Onboarding is manual at this stage.
- **A/B testing** — Ship it, measure conversion, iterate.
- **White-label demo or interactive product tour** — Future enhancement. Static page is sufficient for lead capture.
- **Changes to Team tier Stripe checkout** — Team self-serve checkout stays intact. Only adding a secondary "talk to sales" link.
- **Changes to landing page (/) pricing section** — Only update if it already has a Brokerage CTA pointing to mailto. Do not add new sections.

---

## 10. Definition of Done

- [ ] `/brokerage` page renders with hero, value props, how-it-works, pricing callout, Cal.com embed, and inquiry form
- [ ] POST /api/brokerage-inquiry inserts into `pilot_signups` with `source='brokerage_landing'`
- [ ] Telegram notification fires on form submission
- [ ] Pricing page Brokerage CTA navigates to `/brokerage`
- [ ] Pricing page Team tier has secondary "talk to sales" link to `/brokerage`
- [ ] Page uses consistent dark theme with emerald accents
- [ ] SEO metadata present (title, description, OG)
- [ ] `npm run build` exits 0
- [ ] E2E tests written and passing
- [ ] All existing tests still pass (`npm test` exits 0)
