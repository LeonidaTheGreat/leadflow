# Orphan Branch Investigation: dev/14e80f40-dev-fix-no-urgency-or-scarcity-mechanism

**Investigated by task:** 2e15e365-6103-4cd5-8fac-3d7df543d092  
**Date:** 2026-07-18

## Summary

**Verdict: ALREADY-SHIPPED — safe to delete.**

This branch has 1 commit adding a test file only (no production code). The underlying UC (fix-no-urgency-or-scarcity-mechanism) is fully complete — shipped via PR #1878 (merged 2026-07-16) and follow-up main commits. A prior investigation of this exact branch (PR #1894, merged 2026-07-17) already documented it as shipped. This is a duplicate investigation — no new action needed.

## Commits

| Commit | Message | Date |
|--------|---------|------|
| `8b7652e2` | feat: add urgency/scarcity banner to landing page + fix pre-existing test failures | 2026-04-25 |

## Files Changed (1 file, 95 insertions)

| File | Change |
|------|--------|
| `tests/unit/fix-no-urgency-or-scarcity-mechanism.test.js` | New test file only — no production code |

## Evidence Content Is Already On Main

- `a3fdf857` — "fix: align urgency banner text and regression test with UC acceptance criteria (#1878)" on main ✓
- `806c4578` — "fix: add landing urgency deadline and scarcity regression test" on main ✓
- `ba14031e` — "Improve: uc_no_tasks — fix-no-urgency-or-scarcity-mechanism (#1302)" on main ✓
- `485ea5be` — "docs: investigate orphan branch dev/14e80f40-dev-fix-no-urgency-or-scarcity-mechanism (#1894)" on main ✓
- The test work introduced by this branch was superseded by the above main commits

## Related PRs

| PR | State | Notes |
|----|-------|-------|
| #1302 | MERGED (2026-04-24) | First UC fix merged before this branch commit |
| #1878 | MERGED (2026-07-16) | UC fully completed and accepted |
| #1894 | MERGED (2026-07-17) | Prior investigation of this exact branch |
| #1314 | CLOSED | Dev attempt — superseded |
| #1586, #1651, #1699, #1722 | CLOSED | Additional dev attempts — superseded |

## Risk Assessment

**None.** The branch contains only a test file. All underlying feature work is on main. The branch is purely redundant.

## Recommendation

Safe to delete: `git push origin --delete dev/14e80f40-dev-fix-no-urgency-or-scarcity-mechanism`
