# Design Spec: Product Status — Live UJ + Drillable UC Cards

**Task:** a23e9653-7f60-4d44-ac22-90e24cc0e27f
**File to edit:** `~/.openclaw/dashboard/product-status.html`
**Scope:** Replace hardcoded `journeyData` with live DB fetch; add inline UC drill-down per journey card.

---

## 1. Data Sources

### User Journeys
```
GET /rest/v1/user_journeys?project_id=eq.${PROJECT_ID}&order=priority.asc,id.asc&select=*
```
Returns 11 rows for leadflow. Map each to: `{ id, name, status, priority, description, success_metrics }`.

### Use Cases (per journey)
```
GET /rest/v1/use_cases?user_journey_id=eq.${uj.id}&project_id=eq.${PROJECT_ID}&select=id,name,description,implementation_status,workflow,order_in_journey&order=order_in_journey.asc,id.asc
```
Returns 4-12 UCs per journey. Rendered as clickable rows inside the journey card.

---

## 2. Layout Changes

### Current State
- `journeyData` is a hardcoded array of 3 journeys with manually defined steps
- Each journey card shows steps with smoke test pass/fail indicators
- No UC visibility within journey cards

### New State
- `loadJourneys()` fetches from `user_journeys` table (11 rows)
- Steps rendered from API data (if no steps column, show empty — no crash)
- Each journey card gets a new **UC list section** below the steps
- UCs are shown as a compact clickable list; clicking expands inline details

---

## 3. Component Specs

### 3a. Journey Card (updated)

```
+---------------------------------------------------------------+
| Journey Title                              status-badge  P1   |
| (description, if present, truncated to 1 line)                |
+---------------------------------------------------------------+
| UC List Header: "N Use Cases"           [chevron toggle all]  |
+---------------------------------------------------------------+
| [status-dot] UC Name                            status-badge  |
| [status-dot] UC Name                            status-badge  |
| [status-dot] UC Name (EXPANDED)                 status-badge  |
|   +-----------------------------------------------------------+
|   | Description: Full UC description text                     |
|   | Workflow: product -> dev -> qc                             |
|   | Status: in_progress                                       |
|   +-----------------------------------------------------------+
| [status-dot] UC Name                            status-badge  |
+---------------------------------------------------------------+
```

**Journey Card Container:**
- Same `.journey` card styling (dark card, border, rounded)
- Journey header: title (left) + status badge + priority badge (right)
- Description line: 1 line, `var(--text-muted)`, 12px, truncated with ellipsis
- Remove old `steps` rendering (the hardcoded smokeId-based steps)
- Replace with UC list

**Journey Status Badge:**
- Uses same `.status-badge` classes as UC table
- `complete` = green, `in_progress` = yellow, `not_started` = gray

**Priority Badge:**
- Small pill, muted: `P1`, `P2`, `P4` etc.
- 10px font, `var(--text-muted)`, subtle border

### 3b. UC List (inside journey card)

**UC List Header:**
- Text: `"6 Use Cases"` (count from fetched data)
- Right side: small chevron icon (CSS-only `::after` pseudo-element)
- Clickable — toggles the entire UC list open/closed
- Default state: **collapsed** (just shows count)
- Transition: `max-height` + `overflow: hidden` for smooth open/close

**UC Row (`.uc-row`):**
- Height: 36px, flex row
- Left: status dot (8px circle, colored by implementation_status)
  - `complete` = `var(--text-ok)` green
  - `in_progress` = `var(--text-warn)` yellow
  - `not_started` / `backlog` / `ready` = `#555` gray
  - `needs_merge` = `var(--accent)` blue
  - `stuck` = `var(--text-error)` red
- Center: UC name (13px, `var(--text-primary)`)
- Right: status badge (reuse `.status-badge .s-{status}` classes)
- Hover: `background: #1a2040` (same as existing table hover)
- Cursor: pointer
- Bottom border: `1px solid #1a2040`

**UC Detail Panel (`.uc-detail`, shown on click):**
- Appears directly below the clicked UC row
- Background: `#0d1425` (slightly darker than card)
- Padding: 12px 16px
- Border-left: 3px solid status color
- Max-width: 100% of card
- Animate open: `max-height` transition 200ms

**UC Detail Content:**
```
Description:  [full text, 12px, var(--text-primary)]
Workflow:     product → dev → qc  [12px, monospace, var(--text-muted)]
Status:       [status-badge, same as row]
```

- If `description` is null/empty: show `"No description"` in muted
- If `workflow` is null/empty array: show `"No workflow defined"` in muted
- Workflow array rendered as: items joined by ` → ` arrows

### 3c. Summary Card Update

The "Journeys" summary card value should update to show the count from the API (11), not the old hardcoded 3.

---

## 4. Interaction Design

### Journey Card
1. Card renders with UC count header collapsed
2. Click header → UC list slides open (CSS transition)
3. Click header again → collapses

### UC Row
1. Click UC row → detail panel toggles below that row
2. Only one UC detail panel open at a time per journey card
3. Clicking another UC row closes the previous one and opens the new one
4. Clicking the same row again closes it

### Keyboard
- No keyboard requirements for this internal dashboard

---

## 5. CSS Additions

```css
/* Journey card updates */
.journey-desc {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8px;
}

.journey-priority {
  font-size: 10px;
  color: var(--text-muted);
  padding: 2px 6px;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  margin-left: 8px;
}

/* UC list toggle */
.uc-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-default);
  user-select: none;
}

.uc-list-header::after {
  content: '\25B6';  /* right triangle */
  font-size: 8px;
  transition: transform 200ms;
}

.uc-list-header.open::after {
  transform: rotate(90deg);
}

.uc-list {
  max-height: 0;
  overflow: hidden;
  transition: max-height 300ms ease;
}

.uc-list.open {
  max-height: 2000px;  /* large enough for any list */
}

/* UC row */
.uc-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 4px;
  cursor: pointer;
  border-bottom: 1px solid #1a2040;
  font-size: 13px;
}

.uc-row:last-child { border-bottom: none; }
.uc-row:hover { background: #1a2040; }

.uc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.uc-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* UC detail panel */
.uc-detail {
  max-height: 0;
  overflow: hidden;
  transition: max-height 200ms ease;
  background: #0d1425;
  border-left: 3px solid var(--text-muted);
  margin: 0 4px;
}

.uc-detail.open {
  max-height: 300px;
  padding: 12px 16px;
}

.uc-detail-row {
  font-size: 12px;
  margin-bottom: 6px;
}

.uc-detail-label {
  color: var(--text-muted);
  display: inline-block;
  min-width: 80px;
}

.uc-detail-value {
  color: var(--text-primary);
}

.uc-workflow {
  font-family: monospace;
  color: var(--text-muted);
}
```

---

## 6. Visual Reference (ASCII)

### Collapsed state (default):
```
+----------------------------------------------------------------+
| Lead Response Flow                    [complete] [P1]          |
| Handles inbound leads via FUB webhook...                       |
|                                                                |
| 10 Use Cases                                              [>]  |
+----------------------------------------------------------------+
```

### Expanded journey with collapsed UCs shown:
```
+----------------------------------------------------------------+
| Lead Response Flow                    [complete] [P1]          |
| Handles inbound leads via FUB webhook...                       |
|                                                                |
| 10 Use Cases                                              [v]  |
|----------------------------------------------------------------|
| * Lead-Initiated SMS                          [complete]       |
| * FUB New Lead Auto-SMS                       [complete]       |
| * FUB Status Change                           [complete]       |
| * Dashboard Manual SMS (EXPANDED)             [complete]       |
|   +---------------------------------------------------------+  |
|   | Description: Send SMS from dashboard UI                 |  |
|   | Workflow:    product -> dev -> qc                        |  |
|   | Status:      complete                                   |  |
|   +---------------------------------------------------------+  |
| * Follow-up Sequences                         [complete]       |
+----------------------------------------------------------------+
```

---

## 7. Data Mapping

### Journey card fields:
| DB Column        | Rendered As                     |
|------------------|---------------------------------|
| `name`           | Journey title (bold, 15px)      |
| `description`    | Subtitle (muted, truncated)     |
| `status`         | Status badge (right of title)   |
| `priority`       | Priority pill (P1, P2, etc.)    |
| `id`             | Used for UC fetch key           |
| `success_metrics`| Not rendered in Stage 1         |

### UC row fields:
| DB Column              | Rendered As                        |
|------------------------|------------------------------------|
| `name`                 | Row text (13px)                    |
| `id`                   | Not displayed (used as key)        |
| `implementation_status`| Status dot color + badge           |
| `description`          | In detail panel                    |
| `workflow`             | In detail panel as `a -> b -> c`   |
| `order_in_journey`     | Sort order                         |

---

## 8. Error States

- **API fetch fails:** Show `"Failed to load journeys"` message in `#journeys` div (muted text, same as reviews fallback)
- **Journey has 0 UCs:** Show `"0 Use Cases"` header, list stays empty. No error.
- **UC has null description:** Show `"No description"` in muted italic
- **UC has null/empty workflow:** Show `"No workflow defined"` in muted italic

---

## 9. Boundaries (DO NOT change)

- Do NOT touch: Products section, Use Cases table, Reviews section, Readiness scoring, smoke tests panel
- Do NOT modify DB tables
- Do NOT add new API endpoints
- Do NOT add PRD or Task drill-downs (Stages 2 & 3)
- Keep using existing `apiHeaders` pattern and inline `fetch()` calls
- No frameworks, no build step, no new dependencies
- Plain CSS only (no CSS-in-JS, no preprocessors)
