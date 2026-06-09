# PRD: Milestone Reset — Archive Day 90, Activate 2026-07-01, Confirm Day 180

**ID:** PRD-LEADFLOW-MILESTONE-RESET-001  
**Status:** Approved  
**Date:** 2026-06-08  
**Author:** PM Agent

---

## Problem

The 'First paying customer by Day 90 (2026-05-15)' milestone permanently failed ($0 MRR at Day 90). It remains as an `active` gap in every review cycle, creating noise and demoralizing signal. The active milestone must be reset to reflect current reality.

---

## Goals

1. Remove Day 90 milestone from active tracking — mark as `missed`, preserve for audit.
2. Activate new milestone: **First paying customer by 2026-07-01** (25 days from today).
3. Confirm **$20K MRR by 2026-08-13** as the primary 180-day target.
4. Ensure `project.config.json` and `mission_metrics` DB row reflect the new reality.

---

## Non-Goals

- Do not delete the Day 90 milestone from history — audit trail must remain.
- Do not change any existing `mission_metrics` rows that are working correctly.
- Do not touch billing, agent onboarding, or Stripe configs.

---

## Requirements

### R1 — project.config.json
| Field | Old Value | New Value |
|---|---|---|
| `reporting.day_target` | `90` | `180` |
| `reporting.active_milestone` | `"First paying customer"` | `"First paying customer"` |
| `reporting.active_milestone_deadline` | `"2026-05-15"` | `"2026-07-01"` |
| `reporting.archived_milestones` | (empty) | Add Day 90 entry with `status: "missed"` and audit note |

### R2 — mission_metrics table
| Row | Change |
|---|---|
| `First Paying Customer` (id=43) | Update `description` to include deadline `2026-07-01`; `status` remains `active` — the goal is still valid, only the deadline changed |
| `MRR` (id=13) | `description` should clarify this is the Day 180 / $20K target; `status` remains `active` |

**No rows to delete.** The old Day 90 deadline lived in `project.config.json`, not in the DB schema, so no DB row needs to be archived.

### R3 — Reporting consistency
All heartbeat review reports and Telegram summaries must stop showing `First paying customer by Day 90` as an active gap. The `reporting.archived_milestones` array is the source of truth for suppressing that signal.

---

## Acceptance Criteria

```bash
# 1. day_target is 180
node -e "const c=require('./project.config.json'); console.assert(c.reporting.day_target===180, 'FAIL')"

# 2. Active milestone deadline is 2026-07-01
node -e "const c=require('./project.config.json'); console.assert(c.reporting.active_milestone_deadline==='2026-07-01', 'FAIL')"

# 3. Archived milestones contains Day 90 entry
node -e "const c=require('./project.config.json'); const m=c.reporting.archived_milestones||[]; console.assert(m.some(x=>x.status==='missed'), 'FAIL')"

# 4. mission_metrics First Paying Customer is still active (not deleted)
psql openclaw -c "SELECT status FROM mission_metrics WHERE project_id='leadflow' AND name='First Paying Customer'" | grep active

# 5. MRR metric target is 20000 (Day 180 goal intact)
psql openclaw -c "SELECT target FROM mission_metrics WHERE project_id='leadflow' AND name='MRR'" | grep 20000
```

---

## Implementation Notes

- `project.config.json` changes are already committed (65d1c096) — dev step should verify via acceptance criteria only.
- No migration script needed — the DB description fields are optional quality-of-life updates.
- If `mission_metrics.First Paying Customer.description` is blank, dev may update it to: `"First paying customer milestone — active deadline 2026-07-01"`.
