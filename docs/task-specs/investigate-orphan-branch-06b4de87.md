<!--
TASK SPEC (8f68f0a2-6a0d-4d6c-9cfe-f3b74d805fd8)
What:
- Create docs/task-specs/investigate-orphan-branch-06b4de87.md to record the
  investigation outcome for orphan branch
  dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl.
- Inspect commit 2f345bc0355f3013cec5bc5f4d349221479ac176 and compare it with
  origin/main plus related quality-gate branch
  dev/97173791-fix-quality-gate-tests-failing-in-leadfl.
- Do not modify product code because this task is an orphan-branch triage task,
  not the quality-gate repair itself.

Verify:
- Run git log --oneline origin/main..origin/dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl
  and expect exactly commit 2f345bc0.
- Run git diff --name-only origin/main...origin/dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl
  and expect the five files listed in this report.
- Run npm test, npm run build, and npm run lint after dependency state is usable;
  expected result for this documentation-only branch is no new product regressions.

Boundaries:
- Do not delete the orphan branch.
- Do not create or merge a PR.
- Do not modify routes, services, database schema, dashboard code, generated
  protected docs, project.config.json, or live-checkout node_modules.
-->

# Orphan Branch Investigation: dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl

Task ID: `8f68f0a2-6a0d-4d6c-9cfe-f3b74d805fd8`
Investigated branch: `dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl`
Commit reviewed: `2f345bc0355f3013cec5bc5f4d349221479ac176`

## Finding

The orphan branch contains one quality-gate repair commit:

```text
2f345bc0 fix: make npm test independent of missing jest binary
```

The commit changes:

```text
.github/workflows/ci.yml
docs/task-specs/fix-agent-retry-rate-alt-approach.md
integrations/test-e2e-flow.js
package.json
scripts/test-suite-gate.js
```

The branch is not the best candidate for shipment as-is. A newer related branch,
`dev/97173791-fix-quality-gate-tests-failing-in-leadfl`, contains commit
`604df6ed00d01c5ef3cc13f134469d0e981f04ab` with a broader fix for the same
quality-gate area. That newer fix keeps the existing `npm test` entrypoint,
makes optional runtime clients resilient when dependencies are absent, adds a
test assertion that Jest is declared, and updates `package.json`/`package-lock.json`
to declare Jest so Genome's suite discovery gate can find `node_modules/.bin/jest`
after install.

## Root Cause Analysis

Failure point: the orphan branch exists with one commit ahead of `origin/main`
and no matching task row, so the orchestration system cannot decide whether it
should be promoted, superseded, or deleted without human review.

Why: the branch appears to be an earlier repair attempt for a failing tests
quality gate. Its fix avoids a missing Jest binary by moving the root test script
to `scripts/test-suite-gate.js`, but it does not address the broader clean-worktree
failure where required runtime modules such as `dotenv`/`axios` may be absent
and where Genome still expects Jest to be declared for suite discovery.

Minimal correct fix: do not promote `dev/06b4de87...` as-is. Prefer the newer
`dev/97173791...` quality-gate repair if that work has not already shipped. Once
the newer repair is merged or otherwise confirmed redundant, delete the orphan
`dev/06b4de87...` branch.

## Verification Evidence

Reviewed orphan commit list:

```text
git log --oneline origin/main..origin/dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl
2f345bc0 fix: make npm test independent of missing jest binary
```

Reviewed orphan changed files:

```text
git diff --name-only origin/main...origin/dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl
.github/workflows/ci.yml
docs/task-specs/fix-agent-retry-rate-alt-approach.md
integrations/test-e2e-flow.js
package.json
scripts/test-suite-gate.js
```

Reproduced the current clean-worktree test failure before making any changes:

```text
npm test
Error: Cannot find module 'dotenv'
Require stack:
- integrations/test-e2e-flow.js
```

This confirms a real test-gate fragility exists, but it also shows the orphan
branch's stated Jest-binary fix is incomplete for the current failure mode.

## Recommendation

Do not file a PR for `dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl`.
Treat it as superseded by `dev/97173791-fix-quality-gate-tests-failing-in-leadfl`
unless that newer branch is abandoned. If the newer branch is merged, delete the
`dev/06b4de87...` orphan branch.
