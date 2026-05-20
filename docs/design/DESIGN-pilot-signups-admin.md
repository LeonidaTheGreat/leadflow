# Design Specification: Pilot Signups Admin UI

**Feature:** Admin — Pilot Signups List, Filter, and Invite Flow
**Task ID:** 43378508-cfcb-46a3-986f-912ca8830567
**Date:** 2026-05-18
**Designer:** Design Agent

---

## Overview

This spec defines the admin page for `pilot_signups` — people who filled out the landing page interest form but have not yet been converted to active pilots. The page serves one job: let Stojan see who signed up, qualify them at a glance, and send an invite in one click.

The page sits at `/admin/pilot-signups`. It follows the existing admin design language (dark slate theme, emerald accents, lucide-react icons, shadcn/ui primitives).

---

## 1. Data Schema

The full `pilot_signups` table columns relevant to this page (from schema.sql + migrations 006 + follow_up migration):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `name` | TEXT NOT NULL | Full name from form |
| `email` | TEXT NOT NULL | Unique |
| `phone` | TEXT | Optional |
| `brokerage_name` | TEXT | Added migration 006 |
| `team_name` | TEXT | Added migration 006 |
| `monthly_leads` | TEXT | `'1-10'`, `'11-50'`, `'51-100'`, `'100+'` |
| `current_crm` | TEXT | `'follow_up_boss'`, `'liondesk'`, `'kvcore'`, `'other'`, `'none'` |
| `status` | TEXT | `'new'`, `'contacted'`, `'approved'`, `'declined'` |
| `source` | TEXT | `'landing_page'` or other |
| `utm_campaign` | TEXT | Optional, from migration 006 |
| `follow_up_sent` | BOOLEAN | `true` when welcome email was sent |
| `created_at` | TIMESTAMPTZ | Signup date |
| `updated_at` | TIMESTAMPTZ | |
| `contacted_at` | TIMESTAMPTZ | When status changed to contacted |

**Derived — joined from `pilot_invites`:**
- `invited` BOOLEAN — whether a `pilot_invites` row exists for this email

---

## 2. Page Layout

### URL
`/admin/pilot-signups`

### Nav Placement
Insert between "Outreach" and "Pilots" in the Execution Areas card on `/admin` (the GTM Command Center). Also add to the four-card grid as a new card:

```
Label (uppercase):   Signups
Title:               Pilot signup queue
Helper:              {count} new signups — {uninvited} not yet invited
CTA:                 Review & invite →
Accent:              violet-500 hover border
```

### Page-level Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  [breadcrumb: Admin / Pilot Signups]                                 │
│                                                                      │
│  Pilot Signups                          [Summary bar: 4 stats]       │
│  Landing page interest forms                                         │
│                                                                      │
│  [Filter bar]                                      [Export CSV]      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Table                                                          │ │
│  │  Name / Email | CRM | Monthly Leads | Status | Signed Up | ... │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  [Pagination footer]                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

When a row is clicked, a **slide-over panel** opens on the right (33% width on desktop, full-width drawer on mobile). No navigation away — the list stays visible for fast sequential review.

---

## 3. Summary Bar

Four stat cards, same design as the metric cards in `/admin/outreach` — `rounded-2xl border border-slate-800 bg-slate-900/80`:

| Card | Value | Helper text |
|------|-------|-------------|
| Total Signups | count | All time |
| New (not contacted) | count | status = 'new' |
| Follow-up Sent | count | follow_up_sent = true |
| Invited | count | has invite in pilot_invites |

---

## 4. Filter Bar

Single horizontal row, no secondary rows. All filters are instant (no submit button). Filters compose with AND logic.

```
[Status: All | New | Contacted | Approved | Declined]   [CRM: All ▾]   [Leads/mo: All ▾]   [Search name/email...]
```

### Status filter
Pill tabs, same pattern as the filter tabs in `/admin/outreach`. Options:
- All (default)
- New
- Contacted
- Approved
- Declined

Active pill: `bg-gray-900 text-white`
Inactive pill: `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`

### CRM dropdown
`<Select>` from `@/components/ui/select`. Options: All, Follow Up Boss, LionDesk, kvCORE, Other, None.

### Monthly leads dropdown
`<Select>`. Options: All, 1–10, 11–50, 51–100, 100+.

### Search input
`<Input type="text">` with placeholder "Search name or email...". Client-side substring filter — no server round-trip for search.

---

## 5. Table

Columns — ordered by importance. All columns are present on every viewport; on mobile, "CRM" and "Leads/mo" collapse into the detail row below the name.

| Column | Data | Notes |
|--------|------|-------|
| Name | `name` + `email` below | Primary identity |
| CRM | `current_crm` | Displayed as a short badge label |
| Leads/mo | `monthly_leads` | Displayed as a badge |
| Status | `status` | Color-coded badge |
| Signed Up | `created_at` | Relative time ("3 days ago") |
| Action | Invite button | Conditionally shown (see below) |

### Row states
- Default: `hover:bg-slate-800/50 cursor-pointer`
- Selected (panel open): `bg-slate-800 ring-1 ring-emerald-500/30`
- Declined: `opacity-50`

### Status badge colors
| Status | Class |
|--------|-------|
| new | `bg-blue-500/20 text-blue-300` |
| contacted | `bg-amber-500/20 text-amber-300` |
| approved | `bg-emerald-500/20 text-emerald-300` |
| declined | `bg-slate-500/20 text-slate-400` |

### Invite action column
- If signup has no invite: show `<Button size="sm" variant="default">Send Invite</Button>` (emerald).
- If invite sent: show `<span class="text-xs text-slate-400">Invited</span>` — no button. No re-send from the table; use the detail panel for that.
- If status is `declined`: no button, no label (row is dimmed).

Clicking "Send Invite" from the table fires the invite immediately (no confirmation modal). It calls `POST /api/admin/pilot-signups/invite` with `{ email, name }`. On success, the row's action column flips to "Invited" and status updates to "contacted" optimistically.

### Empty state

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   No signups match this filter.                          │
│   Try a different status or clear your search.           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

If no signups at all (total = 0):

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   No pilot signups yet.                                  │
│   Signups appear here when someone submits the           │
│   landing page interest form.                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Pagination
Server-side. Page size: 50 rows. Pagination controls in a footer bar:
```
Showing 1–50 of 312          [← Prev]  Page 1 of 7  [Next →]
```

---

## 6. Detail / Invite Panel (Slide-over)

Opens when a row is clicked. Closes via the X button or clicking outside.

### Panel layout (top to bottom)

```
┌─────────────────────────────────────┐
│  Jane Smith                    [X]  │
│  jane@realtypro.com                 │
│  (555) 123-4567                     │
│                                     │
│  ── Profile ───────────────────     │
│  CRM       Follow Up Boss           │
│  Leads/mo  51–100                   │
│  Brokerage  RE/MAX Metro            │
│  Team       The Smith Team          │
│  Source     landing_page            │
│  Campaign   spring-2026-fb          │
│  Signed Up  May 15 at 2:34 PM       │
│                                     │
│  ── Outreach ──────────────────     │
│  Follow-up email   Sent             │
│  Invited           Not yet          │
│                                     │
│  ── Actions ───────────────────     │
│  [Send Invite Email]                │
│  [Mark as Declined]                 │
│  [Mark as Contacted]                │
│                                     │
│  ── Status ────────────────────     │
│  [Status dropdown: new ▾]           │
│  [Save Status]                      │
└─────────────────────────────────────┘
```

### Panel behavior

**Send Invite Email** button:
- Calls `POST /api/admin/pilot-signups/invite` with `{ email, name }`.
- On success: button changes to `Invited — {date}` (disabled, green text). Status badge in the main table updates to "contacted".
- On error: shows inline error message below the button. Button re-enables.
- If already invited: shows `Invited on {date}` (no button).

**Mark as Declined**: calls `PATCH /api/admin/pilot-signups/{id}` with `{ status: 'declined' }`. Panel status badge and table row update immediately.

**Mark as Contacted**: calls `PATCH /api/admin/pilot-signups/{id}` with `{ status: 'contacted' }`. Useful for logging manual outreach.

**Status dropdown + Save Status**: full manual override if needed. Calls `PATCH /api/admin/pilot-signups/{id}` with `{ status }`.

---

## 7. Component Breakdown

### New components to build
All inside `product/lead-response/dashboard/app/admin/pilot-signups/`.

| File | Purpose |
|------|---------|
| `page.tsx` | Page shell — fetches data, owns filter state, renders table + panel |
| `PilotSignupTable.tsx` | Table component. Props: `signups`, `onRowClick`, `onInvite`, `loadingId` |
| `PilotSignupFilters.tsx` | Filter bar. Props: `filters`, `onChange` |
| `PilotSignupPanel.tsx` | Slide-over detail panel. Props: `signup`, `onClose`, `onInvite`, `onStatusChange` |
| `PilotSignupSummary.tsx` | Four stat cards. Props: `stats` |

### Reuse from existing components
- `@/components/ui/button` — Button
- `@/components/ui/badge` — Badge
- `@/components/ui/input` — Search input
- `@/components/ui/select` — CRM and leads dropdowns
- `@/components/ui/dialog` (or Radix Sheet) — Slide-over panel
- Lucide icons: `Users`, `Mail`, `Send`, `Check`, `X`, `Filter`, `Download`, `ChevronLeft`, `ChevronRight`

### Do NOT recreate
- Auth logic — use the same `auth()` pattern from `@/lib/services/AuthService` that all other admin routes use.
- Date formatting — replicate the `formatDate`/`daysSince` helpers already in `/admin/outreach/page.tsx`.
- Invite email sending — reuse the existing `POST /api/admin/pilot-signups/invite/route.ts` endpoint.

---

## 8. API Contract

### GET /api/admin/pilot-signups/list

**This endpoint needs to be created.** The existing `/api/admin/pilot-signups/invite` only handles invite dispatch; it does not return a filterable list.

**Request:**
```
GET /api/admin/pilot-signups/list?status=new&crm=follow_up_boss&page=1&limit=50
```

Query parameters:
| Param | Type | Default | Notes |
|-------|------|---------|-------|
| `status` | string | (all) | `new`, `contacted`, `approved`, `declined` |
| `crm` | string | (all) | `follow_up_boss`, `liondesk`, `kvcore`, `other`, `none` |
| `monthly_leads` | string | (all) | `1-10`, `11-50`, `51-100`, `100+` |
| `page` | int | 1 | |
| `limit` | int | 50 | Max 200 |

**Response:**
```json
{
  "signups": [
    {
      "id": "uuid",
      "name": "Jane Smith",
      "email": "jane@realtypro.com",
      "phone": "+15555551234",
      "brokerage_name": "RE/MAX Metro",
      "team_name": "The Smith Team",
      "monthly_leads": "51-100",
      "current_crm": "follow_up_boss",
      "status": "new",
      "source": "landing_page",
      "utm_campaign": "spring-2026-fb",
      "follow_up_sent": true,
      "invited": false,
      "created_at": "2026-05-15T14:34:00Z",
      "updated_at": "2026-05-15T14:34:00Z",
      "contacted_at": null
    }
  ],
  "total": 35,
  "page": 1,
  "limit": 50,
  "stats": {
    "total": 35,
    "new": 18,
    "follow_up_sent": 22,
    "invited": 7
  }
}
```

The `invited` boolean is derived by checking whether a `pilot_invites` row exists for the signup's email. This join happens server-side.

**Auth:** Same httpOnly cookie session used by all admin routes. Return `401` if not authenticated.

### PATCH /api/admin/pilot-signups/[id]

**This endpoint needs to be created.** Used by the detail panel to update status.

**Request body:**
```json
{ "status": "contacted" }
```

Valid values: `new`, `contacted`, `approved`, `declined`.

**Response:**
```json
{
  "success": true,
  "signup": { ...full signup row... }
}
```

### Existing endpoint used as-is
`POST /api/admin/pilot-signups/invite` — already implemented at `app/api/admin/pilot-signups/invite/route.ts`. Accepts `{ email, name }`, creates a `pilot_invites` row, sends email via Resend, returns `{ success, inviteId, emailSent, expiresAt }`.

---

## 9. Loading and Error States

### Loading state (initial page load)
Replace the table with a skeleton: three rows of `animate-pulse` grey blocks at the correct column widths. Summary bar shows four grey placeholder cards.

```tsx
// Pattern from /admin/outreach — full-page fallback:
<div className="min-h-screen bg-slate-950 p-8 text-slate-200">
  <h1 className="text-3xl font-semibold">Pilot Signups</h1>
  <p className="mt-3 text-slate-400">Loading...</p>
</div>
```

Do not use a spinner-only state — show the page header immediately so context is clear.

### Error state
```tsx
<div className="mt-4 rounded-2xl border border-red-800 bg-red-950/60 p-4 text-red-200">
  Failed to load signups — {error}
</div>
```

Matches the error pattern in `/admin/page.tsx`.

### Invite loading state
When invite is in flight for a row, the "Send Invite" button in that row (and the panel button if open) shows a `Loader2` spinner and is disabled. Other rows' invite buttons remain active.

### Invite success state
Button becomes `Invited` with a `Check` icon (emerald color). No toast — inline state change is enough. The status badge in the table row updates to "contacted".

### Invite error state
Inline error text below the button: `"Failed to send invite — {message}"`. Button re-enables.

---

## 10. Admin Nav Entry

In `product/lead-response/dashboard/app/admin/page.tsx`, inside the "Execution Areas" grid, add a new `<Link>` card after the "Outreach" card and before "Onboarding":

```tsx
<Link
  href="/admin/pilot-signups"
  className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-violet-500"
>
  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Signups</p>
  <p className="mt-2 text-lg font-medium text-white">Pilot signup queue</p>
  <p className="mt-2 text-sm text-slate-400">
    {data.outreach.pilotSignupCount} total — {data.outreach.uninvitedSignupCount} not yet invited.
  </p>
  <div className="mt-4 inline-flex items-center gap-2 text-sm text-violet-300">
    Review &amp; invite <ArrowRight className="h-4 w-4" />
  </div>
</Link>
```

This requires adding `pilotSignupCount` and `uninvitedSignupCount` to the `GtmStatusResponse` type and populating them from `GET /api/admin/gtm-status`. Both counts come from a single `SELECT count(*), count(*) FILTER (WHERE NOT invited)` query on `pilot_signups` joined to `pilot_invites`.

---

## 11. Design Decisions and Rationale

**Slide-over panel, not navigation.** Navigating to a detail page interrupts the workflow of reviewing multiple signups sequentially. A panel keeps the list visible. This is the same pattern used in `/admin/pilots` (click row, right panel appears).

**Instant invite from table row.** The most important action — sending an invite — must be achievable without opening a panel. One click, no modal, no confirmation. The risk of an accidental invite is low (invites can be re-sent); the cost of friction is high (Stojan reviewing 35 signups should not need 35 clicks to open panels).

**Status-based dimming for declined.** Declined signups are still shown (they represent real data) but visually recede. This avoids "where did it go?" confusion when someone marks a row declined.

**Server-side pagination at 50 rows.** There are currently 35 signups. This page will handle up to a few hundred. Client-side pagination of the full set is fine for now but server-side is specified to avoid performance issues as the list grows.

**No search server round-trip.** The total dataset is small. Client-side substring filter on the already-loaded page means instant feedback without debounce complexity.

**CRM as a filter, not a feature.** "Follow Up Boss" signups are the highest-priority leads since LeadFlow integrates directly. The CRM filter lets Stojan isolate them without building FUB-specific workflows into this page.

**Dark theme (slate-950 background).** Matches all other admin pages. Do not use the light background from `/admin/pilots/page.tsx` — that page is an outlier; the dominant admin design language is dark.

---

## 12. File Checklist for Dev Implementation

New files to create:
- `product/lead-response/dashboard/app/admin/pilot-signups/page.tsx`
- `product/lead-response/dashboard/app/api/admin/pilot-signups/list/route.ts`
- `product/lead-response/dashboard/app/api/admin/pilot-signups/[id]/route.ts`

Files to modify:
- `product/lead-response/dashboard/app/admin/page.tsx` — add nav card, extend `GtmStatusResponse` type
- `product/lead-response/dashboard/app/api/admin/gtm-status/route.ts` — add `pilotSignupCount` and `uninvitedSignupCount`

Do NOT modify:
- `product/lead-response/dashboard/app/api/admin/pilot-signups/invite/route.ts` — already correct, used as-is
- Any existing admin pages
- Database schema — all required columns already exist
