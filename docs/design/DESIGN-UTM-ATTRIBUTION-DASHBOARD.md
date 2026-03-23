# Design Spec: Marketing Attribution Dashboard Section

**Document ID:** DESIGN-UTM-ATTRIBUTION-DASHBOARD  
**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Ready for Dev  
**Related PRD:** PRD-UTM-CAPTURE-ATTRIBUTION (FR-5)  
**Related Marketing Doc:** MARKETING-UTM-STRATEGY (§6.2)  
**Task ID:** 9787ee7b-41bc-4f38-8084-82a710cef65b

---

## 1. Scope

UTM parameter capture is **invisible to end users** (silent `sessionStorage` write on landing page load). No changes to the landing page visual design are required.

The **only visual deliverable** is a new "Marketing Attribution" section in the orchestration dashboard at `~/.openclaw/dashboard/dashboard.html`.

---

## 2. Design Principles Applied

- **Remove what doesn't need to be there:** No charts. No sparklines. No fancy visualizations. A clean table is sufficient for the data volume at pilot stage.
- **Consistency:** Use existing dashboard design tokens (`--bg-card`, `--text-muted`, CSS classes) verbatim — no new tokens.
- **Clarity:** Dev and Stojan scan this dashboard fast. Source → Medium → Campaign → Count → Share. Immediately readable.
- **Empty state:** Honest. If no data, say so plainly.

---

## 3. Placement

Insert the Marketing Attribution section **between "QC Status" and "Cost Summary"** in dashboard.html.

This ordering reflects information hierarchy: attribution is business intelligence, more important than cost but downstream of quality gates.

```
[existing sections above]
✅ QC Status
📣 Marketing Attribution   ← INSERT HERE
💰 Cost Summary
[footer]
```

---

## 4. Section Structure

### 4.1 Section Header

```html
<!-- MARKETING ATTRIBUTION -->
<h2 id="marketing-attribution">📣 Marketing Attribution</h2>
<div id="marketing-attribution-content" class="card">
  <div class="loading">Loading attribution data...</div>
</div>
```

**Header label:** `📣 Marketing Attribution`  
**Anchor ID:** `marketing-attribution`  
**Content wrapper ID:** `marketing-attribution-content`  
**Initial state:** Loading skeleton (consistent with all other sections)

---

### 4.2 Subheader (rendered inside card by JS)

```
Signups by channel — first-touch attribution
```

Style: `.muted` class (color: `#a8b3dd`, font-size: `12px`)  
Placement: Below `<h2>`, above the table, inside the card

---

### 4.3 Attribution Table

#### Columns

| # | Column Header | Data Source | Fallback Display | Alignment |
|---|--------------|-------------|------------------|-----------|
| 1 | **Source** | `utm_source` | `Direct` | Left |
| 2 | **Medium** | `utm_medium` | `—` | Left |
| 3 | **Campaign** | `utm_campaign` | `—` | Left |
| 4 | **Signups** | `COUNT(*)` | `0` | Right (numeric) |
| 5 | **Share** | `% of total` (1 decimal) | `0%` | Right (numeric) |

#### Column Widths (approximate)

| Column | Width |
|--------|-------|
| Source | 15% |
| Medium | 15% |
| Campaign | 35% |
| Signups | 15% |
| Share | 20% |

#### Row Styling

- **"Direct" row** (null UTM): render Source cell in `.muted` style (de-emphasized — it's the catch-all)
- **Top row** (highest signups): no special styling — sort order makes it obvious
- **Zebra stripes:** none — consistent with existing dashboard tables (no striping)
- **Hover:** no special hover state needed (this is a read-only dashboard)

#### Table CSS

Use existing classes — no new CSS required:

```
table, th, td   → existing styles
.table-wrapper  → horizontal scroll on mobile
.muted          → de-emphasis for null values / subheader
.mono           → NOT used (values are plain text, not code)
```

---

### 4.4 Summary KPI Row (above table)

Before the table, render a 3-cell inline stat bar:

```
┌─────────────────┬──────────────────┬─────────────────┐
│  Total Signups  │  Attribution Rate │  Top Source      │
│     [N]         │    [N%]           │  [source_name]  │
│  (all agents)   │  (has UTM / all)  │  (most signups)  │
└─────────────────┴──────────────────┴─────────────────┘
```

**Implementation:** 3-column CSS grid using existing `.grid` class and `.card` cards nested inside `marketing-attribution-content`. This matches the KPI card pattern used elsewhere in the dashboard.

**Stat labels (`.muted`):**
- `Total Signups`
- `Attribution Rate`
- `Top Source`

**Stat values (`.kpi.small`):**
- Total: integer, e.g. `12`
- Attribution rate: percentage to 1 decimal, e.g. `83.3%`
  - Color: `.ok` if ≥80%, `.warn` if 50–79%, `.bad` if <50%
- Top source: plain text, e.g. `stojan` → rendered as `stojan` (no caps transform in spec — dev keeps raw value)

---

### 4.5 Empty State

When the `agents` table has no rows with UTM columns at all (all NULL, zero attributable signups):

```html
<div class="muted" style="padding: 16px 0; text-align: center;">
  No attributed signups yet. 
  Start a campaign using the <a href="#" style="color:var(--accent);">UTM guide</a>.
</div>
```

**Note:** Even "Direct / unknown" rows should appear once agents exist. True empty state only occurs when the feature has never been tested end-to-end.

---

### 4.6 Pilot Mode Note (optional, low priority)

If total agents < 5 (pilot stage), optionally render a `.pill` badge:

```
[Pilot Mode — N signups]
```

This is **low priority** — skip if dev wants to keep it simple. Not worth a build-in for MVP.

---

## 5. Wireframe (ASCII)

```
┌─────────────────────────────────────────────────────────┐
│ 📣 Marketing Attribution                                 │
├─────────────────────────────────────────────────────────┤
│ Signups by channel — first-touch attribution            │ ← .muted
│                                                          │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│ │ Total Signups│ │ Attribution  │ │ Top Source       │  │
│ │     12       │ │   83.3% ✅   │ │    stojan        │  │
│ └──────────────┘ └──────────────┘ └──────────────────┘  │
│                                                          │
│ ┌──────────┬──────────┬─────────────────┬───────┬──────┐ │
│ │ Source   │ Medium   │ Campaign        │Signups│Share │ │
│ ├──────────┼──────────┼─────────────────┼───────┼──────┤ │
│ │ stojan   │ email    │ pilot-founder.. │   6   │ 50.0%│ │
│ │ reddit   │ community│ pilot-reddit-.. │   3   │ 25.0%│ │
│ │ facebook │ community│ pilot-facebook. │   1   │  8.3%│ │
│ │ google   │ cpc      │ pilot-free-q1.. │   1   │  8.3%│ │
│ │ Direct   │ —        │ —               │   1   │  8.3%│ │ ← .muted
│ └──────────┴──────────┴─────────────────┴───────┴──────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Data Loading Pattern

Follow the **exact same pattern** used by `loadQcStatus()` or `loadCompletedWork()` — query Supabase, render HTML string, set innerHTML on the content div. No new abstraction needed.

### Supabase Query (JavaScript)

```javascript
async function loadMarketingAttribution() {
  const { data, error } = await supabase
    .from('agents')
    .select('utm_source, utm_medium, utm_campaign');

  // Aggregate in JS (avoids needing a DB view)
  // Group by [source, medium, campaign], count, calc % of total
  // Sort descending by count
  // Render into #marketing-attribution-content
}
```

**Dev note:** The PRD provides a raw SQL aggregation query. In the dashboard context, JS-side aggregation is equally fine and avoids needing Supabase RPC. Use whichever is cleaner for dev.

### Auto-Refresh

Subscribe to the `agents` table in the existing real-time channel list (the dashboard already subscribes to multiple tables at page bottom). Add `'agents'` to the subscription array — or if already there, no change needed.

---

## 7. Responsive Behavior

| Breakpoint | Behavior |
|-----------|----------|
| Desktop (≥1025px) | 3-col KPI row + full table |
| Tablet (769–1024px) | KPI row: 3-col (compact). Table: horizontal scroll |
| Mobile (≤768px) | KPI row: 1-col stack. Table: horizontal scroll (`.table-wrapper`) |

**min-width for table:** `500px` (consistent with all other dashboard tables)

---

## 8. Color & Typography Reference

All from existing CSS variables — no new tokens:

| Element | Class/Style |
|---------|------------|
| Section heading | `<h2>` |
| Subheader / labels | `.muted` → `#a8b3dd`, `12px` |
| KPI numbers | `.kpi.small` → `20px`, `700` weight |
| Attribution rate: good | `.ok` → `#57d98d` |
| Attribution rate: warn | `.warn` → `#ffd166` |
| Attribution rate: bad | `.bad` → `#ff6b6b` |
| Direct row text | `.muted` |
| Table header bg | `#161f43` |
| Table border | `var(--border-default)` → `#24305f` |
| Card bg | `var(--bg-card)` → `#131a33` |
| Accent links | `var(--accent)` → `#9ecbff` |

---

## 9. What Dev Should NOT Do

- ❌ No charts / bar charts / pie charts — table is sufficient for pilot stage
- ❌ No new CSS classes — use existing tokens
- ❌ No new API endpoints — query Supabase directly from dashboard JS
- ❌ No modal / detail drilldown — out of scope for now
- ❌ No date range filters — out of scope (all-time view only)

---

## 10. Definition of Done (Design Perspective)

- [ ] Section appears between QC Status and Cost Summary
- [ ] 3-column KPI row renders correctly (Total, Attribution Rate, Top Source)
- [ ] Attribution Rate colored correctly (green ≥80%, yellow 50-79%, red <50%)
- [ ] Table shows Source | Medium | Campaign | Signups | Share columns
- [ ] NULL utm_source rows display as "Direct" in Source column
- [ ] NULL utm_medium / utm_campaign display as "—"
- [ ] Empty state renders when no data
- [ ] Section loads data on page load and auto-refreshes with rest of dashboard
- [ ] Mobile: table scrolls horizontally within `.table-wrapper`
- [ ] No visual regression in existing sections

---

_Design spec authored by Design Agent. Questions → Stojan._
