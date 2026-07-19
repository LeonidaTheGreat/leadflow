# Orphan Branch Investigation: dev/0fd668fb-fix-codebase-architecture-md-drift

**Task ID:** 69d3c21f-1751-4735-9b9b-8f94c2b5f467  
**Verdict:** duplicate/superseded — safe to delete  
**Date:** 2026-07-19

## Branch Metadata

- **Branch:** `dev/0fd668fb-fix-codebase-architecture-md-drift`
- **Remote SHA:** `33621e15d02a630bffeb6b90bcd67e2ddf4d2a7e`
- **Commits ahead of main:** 2

## Commits on Branch

| SHA | Subject |
|-----|---------|
| `33621e15` | docs: fix TrialActivationService description in ARCHITECTURE.md |
| `04a0024a` | feat: add StripeService and EmailService upgrade offer methods |

## Files Changed (vs main)

```
ARCHITECTURE.md                        |   4 +
lib/services/EmailService.js           |  96 +++++
lib/services/StripeService.js          | 136 +++++
lib/services/TrialActivationService.js |   3 +
4 files changed, 239 insertions(+)
```

## Evidence

1. **UC already delivered:** `feat-personal-upgrade-offer-tool` was merged via PR #1264 on 2026-04-20T23:59:06Z. The branch's `feat` commit (`04a0024a`) references this UC — the work was completed.

2. **StripeService superseded:** The orphan's 136-line StripeService was replaced by a clean 49-line version in commit `4a803486` ("fix: add StripeService with createPromoCode to resolve broken import in upgrade-offer test") the same day (2026-04-21). Main's StripeService is smaller and canonical.

3. **EmailService superseded:** The orphan adds 96 lines to EmailService. Main's EmailService has grown to 248 lines through subsequent development — all orphan content is subsumed.

4. **ARCHITECTURE.md fix already applied:** Main's ARCHITECTURE.md already documents TrialActivationService at line 77, via later auto-regeneration (commit `b522a476`) and manual updates (commit `cda90bdd`). PR #1263 (a separate attempt to add the same docs) was CLOSED without merging — the fix landed via a different path.

5. **No open PR:** `gh pr list --head dev/0fd668fb-fix-codebase-architecture-md-drift` returns empty.

## Risk Assessment

**LOW.** All functional code from this branch has been superseded by better versions in main. No unique changes remain unshipped. Deleting this branch loses nothing.

## Recommendation

**Safe to delete.** The branch represents an intermediate dev state for `feat-personal-upgrade-offer-tool` (April 2026). All content — StripeService, EmailService upgrade methods, and ARCHITECTURE.md TrialActivation docs — has been delivered or superseded by subsequent commits on main.

## Commands Run

```
git fetch origin dev/0fd668fb-fix-codebase-architecture-md-drift
git log --oneline main..origin/dev/0fd668fb-fix-codebase-architecture-md-drift
git diff --stat main...origin/dev/0fd668fb-fix-codebase-architecture-md-drift
git ls-remote --heads origin dev/0fd668fb-fix-codebase-architecture-md-drift
gh pr list --state all --head dev/0fd668fb-fix-codebase-architecture-md-drift
gh pr list --state all --search "architecture-md-drift"
gh pr view 1263 --json state,mergedAt,mergeCommit
gh pr view 1264 --json state,mergedAt,mergeCommit,title
grep -n "TrialActivation" ARCHITECTURE.md
wc -l lib/services/StripeService.js lib/services/EmailService.js lib/services/TrialActivationService.js
git log --format="%H %aI %s" origin/main | grep "2026-04-2[0-1]"
```
