<!--
TASK SPEC (db4f9a12-e25c-4832-a7cf-a51e9c31974d)
What:
- Create docs/task-specs/investigate-orphan-branch-33f99fdf.md to record the
  investigation outcome for orphan branch
  dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl.
- Compare 4 commits ahead of main against main history for the single affected
  file (cleanup-next-build-lock.js) to determine if changes were shipped.
- Do not modify product code — this is orphan-branch triage only.

Verify:
- git log --oneline main..origin/dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl
  returns 4 commits (44e0f83b, caa9038b, 11bd8bd0, a1f4767a).
- git diff --stat main...origin/dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl
  shows 1 file changed (cleanup-next-build-lock.js).
- git log --oneline --follow -- product/lead-response/dashboard/scripts/cleanup-next-build-lock.js
  confirms 5 subsequent merges on main after the orphan branch date.

Boundaries:
- Do not delete the orphan branch.
- Do not create or merge a PR.
- Do not modify routes, services, database schema, or auto-generated protected docs.
-->

# Orphan Branch Investigation: dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl

Task ID: `db4f9a12-e25c-4832-a7cf-a51e9c31974d`
Investigated branch: `dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl`
Verdict: **duplicate/superseded**

## Commits ahead of main (4)

```text
44e0f83b fix: pgrep "next build" not "next" to avoid false-positive from dev servers  (2026-05-04)
caa9038b fix: detect and kill orphaned next build processes in lock cleanup             (2026-05-03)
11bd8bd0 fix: use lsof + orphan-check for build lock cleanup (replaces ps+awk)         (2026-05-03)
a1f4767a fix: prevent false-positive stuck-process detection in cleanup-next-build-lock (2026-05-03)
```

## Files changed

```text
product/lead-response/dashboard/scripts/cleanup-next-build-lock.js  (+65 -32)
```

## Finding

All 4 commits fix false-positive stuck-process detection in `cleanup-next-build-lock.js`.
The same logic was re-applied to `main` independently — commit `f4aa4e20` on main carries
the **identical message and timestamp** as branch tip `44e0f83b` (2026-05-04 01:13:11 -0400),
confirming the fix was cherry-picked or re-implemented rather than merged from this branch.

The affected file was then evolved through 5 subsequent merged PRs on main:

| Commit | PR | Message |
|--------|-----|---------|
| `62b7dc85` | #1471 | Improve build lock cleanup with lsof-based orphan detection |
| `2237297a` | #1482 | fix: tighten next build lock cleanup to avoid false positives from next dev |
| `6114e9d5` | #1534 | Fix: Quality gate "build" failing in leadflow |
| `54c28f46` | #1537 | fix: kill stuck builds after timeout to prevent lock interference |
| `a81e29dd` | #1922 | fix: clean stale Next build artifacts |

Merging this branch now would **regress** all of those improvements.

## Database

No task row with `branch_name = 'dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl'`
exists. The branch was created by an agent run that completed or failed before a task row
was persisted — classic orphan scenario.

## Risk

**Low.** Single file, fully superseded by 5 later PRs on main. No unique code survives.

## Recommendation

Safe to delete:

```bash
git push origin --delete dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl
```

## Commands run

```bash
git fetch origin dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl
git log --oneline main..origin/dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl
git diff --stat main...origin/dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl
git ls-remote --heads origin dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl
git log --format="%H %ai %s" origin/dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl | head -5
git log --format="%H %ai %s" origin/main | grep -i "cleanup-next-build\|pgrep.*next\|lsof.*orphan"
git show f4aa4e20 --stat
git show 44e0f83b --stat
git log --oneline --follow -- product/lead-response/dashboard/scripts/cleanup-next-build-lock.js
psql $LOCAL_PG_URL -c "SELECT id, title, status, branch_name FROM tasks WHERE branch_name LIKE '%33f99fdf%'"
psql $LOCAL_PG_URL -c "SELECT branch_name, status, pr_number FROM code_reviews WHERE branch_name LIKE '%quality-gate-build-failing%'"
```

## Verdict JSON

```json
{
  "verdict": "duplicate/superseded",
  "branch": "dev/33f99fdf-fix-quality-gate-build-failing-in-leadfl",
  "commitsAheadOfMain": 4,
  "filesChanged": ["product/lead-response/dashboard/scripts/cleanup-next-build-lock.js"],
  "evidence": {
    "identicalCommitOnMain": "f4aa4e20 (same message + timestamp as branch tip 44e0f83b)",
    "subsequentMergedPRs": ["#1471", "#1482", "#1534", "#1537", "#1922"],
    "noTaskRowFound": true,
    "noCodeReviewRow": true
  },
  "risk": "low",
  "recommendation": "safe-delete — all changes superseded by 5 later merged PRs; merging would regress main"
}
```
