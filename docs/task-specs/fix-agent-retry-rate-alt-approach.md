# Task Spec: fix-agent-retry-rate-23-vs-10-target (merge-only approach)

**Task ID:** 9ac42fa8-93b7-4bb3-9905-bac386d0599d
**Date:** 2026-07-17
**Approach:** merge-only — implementation complete in genome repo

## What Was Built

Implementation lives in the genome repo (`LeonidaTheGreat/genome`), merged via PR #484 (squash commit `dcc411d`).

### Files shipped in genome:

- `core/food/retry-context.js` — 7-category failure classifier
  - Categories: NO_COMMITS, BUILD_FAILURE, LINT_FAILURE, TEST_FAILURE, FILE_SIZE, IMPORT_ERROR, EXIT_CRITERIA
  - Each category: detection regex + step-by-step actionable guidance
  - `categorizeFailure(errorText)` returns `{category, title, guidance}` or fallback

- `core/food/spawn-message-builder.js` — structured RETRY CONTEXT block
  - Replaces plain "Previous Failure" text with `RETRY CONTEXT (attempt N/M)` header
  - Adds `⚠️ No Explicit Acceptance Criteria` warning for tasks without verify sections

- `tests/retry-context.test.js` — 20 tests covering all 7 categories + fallback
- `tests/spawn-message-builder.test.js` — updated assertions
- `tests/a3bf6cc2-retry-categorization-e2e.test.js` — E2E integration tests

## Why the Rescue-Only Approach

Four previous attempts on this task died as zombies. The underlying code (task 172bbb0b, claude-code runtime) was already complete and pushed to genome branch. Re-implementing was wrong — the PR just needed to be merged.

Root cause of pipeline stall: `codex-cli + gpt-5.5` was assigned to re-merge/rescue tasks. That runtime zombie-exits on sustained multi-step work. The PM spec called for `claude-code` runtime only.

## Verification

```bash
grep -r "categorizeFailure" ~/projects/genome/core/
# → core/food/spawn-message-builder.js, core/food/retry-context.js

npm test --prefix ~/projects/genome -- --testPathPattern="retry-context"
# → 20/20 passing

git -C ~/projects/genome log --oneline main | head -1
# → dcc411d Dev: fix-agent-retry-rate-23-vs-10-target-dev-task-completi (#484)
```

## Expected Impact

Dev tasks with failures now receive categorized RETRY CONTEXT blocks with actionable remediation steps per failure type. Missing acceptance criteria surfaces as a warning block. Expected to reduce retry rate from 23% toward the 10% target.
