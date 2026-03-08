# PRD: UTM Parameter Capture & Marketing Attribution

**Document ID:** PRD-UTM-CAPTURE-ATTRIBUTION  
**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Approved  
**Owner:** Product Manager  
**Use Case:** feat-utm-capture-marketing-attribution

---

## 1. Overview

### Problem
LeadFlow AI is running marketing campaigns (ads, email, outreach) driving traffic to the landing page at `leadflow-ai-five.vercel.app`. There is currently no robust system to capture UTM parameters and persist them through the signup flow. This means:
- We cannot measure which channels drive signups
- We cannot calculate CAC (Customer Acquisition Cost) per channel
- We cannot shut off underperforming campaigns or scale winning ones
- Every pilot agent we recruit has unknown attribution

A previous quick-fix captured UTM params in form submission payload, but these are not stored in the database, not surfaced in the dashboard, and not tied to the agent lifecycle.

### Goal
Implement end-to-end UTM parameter capture and marketing attribution that tracks visitors from first click through signup, subscription, and MRR.

### Success Metrics
| Metric | Target |
|--------|--------|
| Attribution rate for new signups | 80%+ |
| UTM params stored on agent record | Yes |
| Attribution visible in dashboard | Yes |
| Conversion rate visible per channel | Yes |

---

## 2. Scope

### In Scope
- Capture UTM parameters on landing page load
- Persist across page navigation and form submission
- Store on agent record at signup
- Surface attribution in orchestration dashboard
- Track conversion rate per UTM source/medium/campaign

### Out of Scope
- Multi-touch attribution (first-touch only for now)
- Cross-device attribution
- Integration with paid ad platforms (Google Ads, Meta) beyond UTM
- Revenue attribution per campaign (Phase 2)

---

## 3. User Stories

### US-1: Marketing Campaign Visitor
**As a** real estate agent clicking a marketing email or ad  
**I want to** arrive at the LeadFlow landing page with my campaign context preserved  
**So that** LeadFlow can understand which campaign resonated with me

**Acceptance Criteria:**
- UTM parameters in URL are captured immediately on landing page load
- Parameters are stored in `sessionStorage` with key `lf_utm`
- Parameters survive page refreshes within the same session
- If no UTM params: no error, no tracking noise

### US-2: Signup Attribution
**As a** marketer at LeadFlow  
**I want to** know which campaign drove each agent signup  
**So that** I can calculate ROI per channel

**Acceptance Criteria:**
- When agent submits the trial signup form, UTM params from `sessionStorage` are included in the POST body
- API endpoint stores UTM params in `agents` table (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`)
- If agent signed up without UTM (direct), those fields are NULL — not an error
- Attribution is first-touch (first UTM seen in session wins)

### US-3: Attribution Dashboard
**As a** product manager / founder  
**I want to** see a breakdown of signups by UTM source/medium/campaign  
**So that** I can make channel investment decisions

**Acceptance Criteria:**
- Orchestration dashboard shows "Signups by Source" table
- Shows: source, medium, campaign, count of signups, conversion rate
- Updates in real time from `agents` table
- "Direct / Unknown" row for agents with no UTM

---

## 4. Functional Requirements

### FR-1: UTM Capture on Landing Page

**Location:** `product/lead-response/dashboard/app/page.tsx` (root route / landing page)

**Behavior:**
1. On component mount (`useEffect`), read URL search params: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
2. If any UTM param is present, write them to `sessionStorage` under key `lf_utm` as JSON
3. Do NOT overwrite if `lf_utm` already exists (first-touch wins)
4. No user-visible change — this is silent capture

```typescript
// Pseudocode — dev agent implements
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const utm = {
    utm_source: params.get('utm_source'),
    utm_medium: params.get('utm_medium'),
    utm_campaign: params.get('utm_campaign'),
    utm_content: params.get('utm_content'),
    utm_term: params.get('utm_term'),
  };
  const hasUtm = Object.values(utm).some(Boolean);
  if (hasUtm && !sessionStorage.getItem('lf_utm')) {
    sessionStorage.setItem('lf_utm', JSON.stringify(utm));
  }
}, []);
```

### FR-2: UTM Inclusion in Signup Form Submission

**Location:** Trial signup form component

**Behavior:**
1. On form submit, read `lf_utm` from `sessionStorage`
2. If present, parse JSON and include fields in POST body alongside form data
3. If absent, do not include (NULL in DB is acceptable)

```typescript
// Pseudocode — dev agent implements
const utmRaw = sessionStorage.getItem('lf_utm');
const utm = utmRaw ? JSON.parse(utmRaw) : {};
const payload = { ...formData, ...utm };
```

### FR-3: Database Column Addition

**Table:** `agents`  
**New columns:**
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `utm_source` | `text` | YES | e.g., google, facebook, email |
| `utm_medium` | `text` | YES | e.g., cpc, email, social |
| `utm_campaign` | `text` | YES | e.g., pilot-launch-2026 |
| `utm_content` | `text` | YES | e.g., hero-cta, sidebar-link |
| `utm_term` | `text` | YES | e.g., real-estate-crm |

Migration SQL (dev agent runs):
```sql
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text;
```

### FR-4: API Endpoint Update

**Endpoint:** POST `/api/trial-signup` (or equivalent registration endpoint)

**Behavior:**
- Accept optional UTM fields in request body
- Write them to `agents` record on insert
- No validation required (store as-is, sanitize to prevent injection)

### FR-5: Attribution View in Dashboard

**Location:** Orchestration dashboard at `~/.openclaw/dashboard/dashboard.html`

**New section:** "Marketing Attribution" (below pilot agents table)

**Columns:** Source | Medium | Campaign | Signups | % of Total

```sql
-- Query for dashboard
SELECT
  COALESCE(utm_source, 'direct') AS source,
  COALESCE(utm_medium, 'none') AS medium,
  COALESCE(utm_campaign, 'unknown') AS campaign,
  COUNT(*) AS signups,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct_of_total
FROM agents
WHERE project_id = 'leadflow' -- if column exists; else remove
GROUP BY 1, 2, 3
ORDER BY 4 DESC;
```

---

## 5. Non-Functional Requirements

| Requirement | Detail |
|-------------|--------|
| Performance | UTM capture adds <5ms to landing page load |
| Privacy | No PII in UTM params; no cross-session tracking |
| Resilience | sessionStorage unavailable → silent fail, no error |
| Backwards compat | Existing agents without UTM columns: no breakage |

---

## 6. Definition of Done

- [ ] Landing page captures UTM params and writes to `sessionStorage` on first load
- [ ] Signup form reads UTM from `sessionStorage` and includes in POST body
- [ ] `agents` table has 5 new UTM columns (migration run in production)
- [ ] API endpoint writes UTM fields to agent record on signup
- [ ] Dashboard shows attribution breakdown by source/medium/campaign
- [ ] Manual test: visit `?utm_source=test&utm_medium=email&utm_campaign=pm-test` → sign up → confirm fields in Supabase
- [ ] Direct visit (no UTM params) → all UTM fields remain NULL — no error

---

## 7. E2E Test Scenarios

### T-1: Happy Path — UTM Captured and Stored
1. Visit `/?utm_source=google&utm_medium=cpc&utm_campaign=pilot-q1`
2. Complete trial signup form
3. **Expected:** `agents` row has `utm_source=google`, `utm_medium=cpc`, `utm_campaign=pilot-q1`

### T-2: No UTM — Clean Null
1. Visit `/` with no query params
2. Complete trial signup form
3. **Expected:** `agents` row has all UTM fields as NULL

### T-3: First-Touch Wins
1. Visit `/?utm_source=email&utm_campaign=wave1`
2. Navigate internally (no new UTM)
3. Complete trial signup form
4. **Expected:** `utm_source=email` (first touch preserved)

### T-4: Dashboard Shows Attribution
1. Check dashboard attribution table
2. **Expected:** Rows showing source breakdowns; "direct" row for agents with no UTM

---

## 8. Workflow

`product → marketing → design → dev → qc`

**Marketing:** Define UTM naming convention (source/medium/campaign taxonomy)  
**Design:** No UI changes required (attribution is invisible to user)  
**Dev:** Implement FR-1 through FR-5  
**QC:** Run T-1 through T-4; verify Supabase rows; confirm no regression

---

## 9. Open Questions

1. Should we backfill UTM for existing pilot agents recruited via known channels? (Probably yes — manual data entry by Stojan)
2. Should we forward UTM to Stripe customer metadata for revenue attribution? (Phase 2)
3. GA4 event: should we fire a `utm_captured` event when params are detected? (Nice to have, not blocking)

---

_Document authored by Product Manager. Questions → Stojan._
