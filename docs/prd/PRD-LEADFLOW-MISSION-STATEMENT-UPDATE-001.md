# PRD: Mission Statement Update — Reflect Current Reality (Post-July-1 Deadline)

**ID:** PRD-LEADFLOW-MISSION-STATEMENT-UPDATE-001
**Status:** active
**Priority:** P0 — Genome calibration
**Version:** 1.0
**Date:** 2026-07-15
**Author:** PM Agent

---

## 1. Problem

The 2026-07-01 "first paying customer" deadline passed at $0 MRR. The mission statement in `project.config.json` and `CLAUDE.md` still reference 2026-07-01 as the active deadline. This causes genome priority logic to operate on stale data — it cannot correctly calculate urgency or set agent priorities when the deadline is in the past.

**Current state (incorrect):**
- `project.config.json → reporting.active_milestone_deadline`: `"2026-07-01"` (expired)
- `CLAUDE.md` line 23: "First paying customer by 2026-07-01. Day 90 (2026-05-15) missed at $0 MRR — archived."
- `CLAUDE.md` line 24: "Extended Goal: $20K MRR by Day 180 (2026-08-13) — original 90-day target mathematically unreachable as of Day 79 with $0 MRR."

**Required state:**
- Active goal: **First paying customer by 2026-07-31**
- Secondary goal: **$20K MRR by 2026-08-13**
- The 2026-07-01 deadline archived as missed (Day 135, $0 MRR)

---

## 2. Scope

This is a configuration and documentation update only. No product logic changes.

### Files to modify

#### `project.config.json`

Under `reporting`:

1. Archive the current active deadline. Add to `archived_milestones[]`:
   ```json
   {
     "name": "First paying customer (Day 135)",
     "deadline": "2026-07-01",
     "status": "missed",
     "note": "Archived 2026-07-15. $0 MRR at Day 135. Active goal moved to 2026-07-31."
   }
   ```

2. Update active milestone fields:
   ```json
   "active_milestone": "First paying customer by 2026-07-31 and $20K MRR by 2026-08-13",
   "active_milestone_deadline": "2026-07-31",
   "secondary_milestone": "$20K MRR",
   "secondary_milestone_deadline": "2026-08-13"
   ```

#### `CLAUDE.md`

Replace lines 23–24 (near-term and extended goal) with:
```
**Near-term Goal:** First paying customer by 2026-07-31. Day 135 (2026-07-01) missed at $0 MRR — archived. (Authoritative source: `project.config.json → reporting.active_milestone_deadline`)
**Extended Goal:** $20K MRR by 2026-08-13.
```

---

## 3. Acceptance Criteria

1. `grep "active_milestone_deadline" project.config.json` → outputs `"2026-07-31"`
2. `grep "2026-07-01" project.config.json` → appears only inside `archived_milestones`, not as the active deadline
3. `grep "2026-07-01" CLAUDE.md` → zero matches (old deadline completely removed from active text)
4. `grep "2026-07-31" CLAUDE.md` → matches the near-term goal line
5. `grep "2026-08-13" CLAUDE.md` → matches the extended goal line
6. `npm run build` exits 0
7. `npm test` exits 0

---

## 4. Out of Scope

- No changes to database tables
- No changes to product routes or UI
- No changes to agent configs
- No new features

---

## 5. Risk

Low. Pure text/config update. No runtime logic depends on these strings — `active_milestone_deadline` is read by the genome orchestrator for display and priority calibration, not for branching logic.
