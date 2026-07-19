# Orphan Branch Investigation: dev/319f2369-fix-inactivity-schedule

**Verdict: shippable-needs-task-pr**

## Branch Metadata
- **Branch:** `dev/319f2369-fix-inactivity-schedule`
- **Remote SHA:** `61d04f29`
- **Commits ahead of main:** 1
- **Commit date:** 2026-05-16

## Commit
```
61d04f29 fix: set inactivity-alerts cron to */30 schedule; add unit test
```

> FR-5 requires the cron to fire every 30 minutes. The vercel.json had
> daily schedule (0 9 * * *) from a conflicting re-merge. Also removes
> the duplicate inactivity-check entry and adds the extracted-logic unit
> test that validates dedup, dry-run, and alert paths without Next.js.

## Files Changed
| File | Lines |
|------|-------|
| `product/lead-response/dashboard/vercel.json` | 6 changed |
| `tests/unit/inactivity-alerts-cron.test.js` | 288 added |

## What the Fix Does
- **vercel.json:** Changes `inactivity-alerts` cron from `0 9 * * *` (daily at 9am) → `*/30 * * * *` (every 30 min), and removes the duplicate `inactivity-check` entry that also had the daily schedule
- **Test:** Adds 288-line unit test covering dedup, dry-run, and alert paths without requiring Next.js

## Why It Was Never Merged
No PR was created for this branch. Related PR #242 (merged 2026-03-11) was for the initial cron implementation — this branch is a later correction to the schedule.

## Current State on Main
`vercel.json` on `main` still has:
- `inactivity-alerts` with `0 9 * * *` (daily — wrong per FR-5)
- `inactivity-check` with `0 9 * * *` (duplicate — should be removed)

The fix from this branch has **not** landed on main.

## Risk
**Low.** Only a vercel.json cron schedule change (config, not code logic) and a new test file. No business logic, no database changes, no API changes.

## Recommendation
Create a task and PR for this branch. The fix is valid, small, and self-contained. The inactivity-alerts cron firing daily instead of every 30 minutes is a real functional gap per FR-5.
