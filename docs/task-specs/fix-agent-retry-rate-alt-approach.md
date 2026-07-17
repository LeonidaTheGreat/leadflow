# PM Re-Spec: fix-agent-retry-rate-23-vs-10-target-dev-task-completi

**Date:** 2026-07-17
**Task:** 8b43bcc8-d6d7-4e4d-bc75-33e37885f7be
**Category:** needs_alternative_approach

## Diagnosis

Four tasks failed after the original dev work completed successfully. The failure chain:

| Task | Agent | Runtime | Outcome | Root Cause |
|------|-------|---------|---------|------------|
| 172bbb0b (attempt 1) | dev | codex-cli | FAILED | codex-cli exit 1, died in <2min |
| 172bbb0b (attempt 2) | dev | claude-code | SUCCESS | 1945 tests pass, branch pushed to genome |
| a3bf6cc2 | qc | claude-code | SUCCESS | QC approved — BUT reviewed wrong PR (#484 belongs to task 318744f7) |
| 1832e3a3 (re-merge) | dev | codex-cli/gpt-5.5 | FAILED | Zombie: PID died after ~5min |
| 9ac42fa8 (rescue) | dev | codex-cli/gpt-5.5 | FAILED | Zombie: PID died after ~5min |

**The code is already complete** on genome branch `dev/172bbb0b-dev-fix-agent-retry-rate-23-vs-10-target`.

Files changed (genome repo, all committed):
- `core/food/retry-context.js` — 7-category failure classifier with actionable guidance
- `core/food/spawn-message-builder.js` — structured RETRY CONTEXT block + missing-acceptance-criteria warning
- `tests/retry-context.test.js` — 20 tests covering all categories
- `tests/spawn-message-builder.test.js` — updated assertions
- `tests/a3bf6cc2-retry-categorization-e2e.test.js` — E2E integration tests

**Why the pipeline is stuck:**
1. `code_reviews` table has `pr_number=484` for task 172bbb0b — that PR belongs to a different task (`318744f7`, feat-post-login-onboarding-wizard). Wrong PR was linked.
2. No actual PR was opened for the genome branch.
3. Re-merge/rescue tasks both used `codex-cli + gpt-5.5` → zombie death. Spawn infrastructure problem, not task content.

## Alternative Approach

**Do NOT re-implement.** The next dev task must:

```bash
# 1. Go to genome repo
cd ~/projects/genome

# 2. Fetch and rebase (branch exists, 3 commits ahead of main)
git fetch origin
git checkout dev/172bbb0b-dev-fix-agent-retry-rate-23-vs-10-target
git rebase origin/main

# 3. Run tests to confirm still passing
npm test -- --testPathPattern="retry-context|spawn-message-builder"

# 4. Create PR for genome repo
gh pr create \
  --repo LeonidaTheGreat/openclaw-genome \
  --title "feat(retry): structured failure categorization to reduce retry rate" \
  --body "Adds retry-context.js with 7 failure categories (NO_COMMITS, BUILD_FAILURE, LINT_FAILURE, TEST_FAILURE, FILE_SIZE, IMPORT_ERROR, EXIT_CRITERIA). Each category includes detection regex + actionable step-by-step guidance. spawn-message-builder now produces structured RETRY CONTEXT block. Reduces agent retry rate by making failure context actionable. UC: fix-agent-retry-rate-23-vs-10-target-dev-task-completi" \
  --base main

# 5. Merge
gh pr merge <pr_number> --squash --delete-branch
```

## Verification

```bash
grep -r "categorizeFailure" ~/projects/genome/core/
# Expected: hits in spawn-message-builder.js + retry-context.js

npm test --prefix ~/projects/genome -- --testPathPattern="retry-context"
# Expected: 20/20 passing

git -C ~/projects/genome log --oneline main | head -3
# Expected: feat(retry) commit at top
```

## Runtime Constraint

**MUST use `claude-code` runtime, NOT `codex-cli`.**
`codex-cli + gpt-5.5` dies as zombie on this task — confirmed across 4 attempts (tasks 172bbb0b attempt 1, 1832e3a3, 9ac42fa8). Only `claude-code` completed successfully.

## What Was Built (already done)

`retry-context.js` exports:
- `FAILURE_CATEGORIES` — map of category → {regex, title, guidance}
- `categorizeFailure(errorText)` — returns {category, title, guidance} or fallback

`spawn-message-builder.js` improvements:
- Replaces plain "Previous Failure" block with `RETRY CONTEXT (attempt N/M)` header
- Adds `⚠️ No Explicit Acceptance Criteria` warning for tasks missing verify sections
