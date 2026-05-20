# PRD-LEADFLOW-REPO-RESTRUCTURE-001: Repository Structure Cleanup

**Status:** Draft
**Author:** PM Agent
**Date:** 2026-05-19
**Use Case:** feature-repository-restructuring-apply-the-project
**Priority:** P2 (housekeeping — no user-facing impact, but reduces developer friction and genome noise)

---

## Problem

The LeadFlow repo has accumulated ~35 misplaced docs in `docs/` root (should be in subdirs), ~9 stale root-level .md files (QC reviews, implementation summaries, logs), ~25 loose test files in `tests/` root (should be in subdirs), and 2 root-level .txt files. The original task description listed dozens of root-level utility .js files, but those have **already been moved** to `scripts/` subdirectories — the repo is cleaner than expected.

**What actually needs doing (verified against current repo state):**

| Category | Count | Current Location | Target |
|----------|-------|-----------------|--------|
| Misplaced PRDs in docs/ root | 24 | `docs/PRD-*.md` | `docs/prd/` |
| Misplaced design docs in docs/ root | 2 | `docs/DESIGN-*.md` | `docs/design/` |
| Misplaced Stripe guides in docs/ root | 3 | `docs/STRIPE_*.md` | `docs/guides/` |
| Other misplaced docs in docs/ root | 6 | `docs/*.md` (content briefs, deployment, UC reports, etc.) | `docs/guides/` or `docs/reports/` |
| Stale root .md files | 9 | Root: `COMPLETION-*.md`, `QC-REVIEW-*.md`, `IMPLEMENTATION-*.md`, `LANDING-PAGE-*.md`, `LOG.md`, `DISCOVERIES.md`, `PILOT_CONVERSION_README.md`, `ORCHESTRATOR-HEARTBEAT-LOG.md` | `docs/reports/` |
| Root .txt files | 2 | `DEPLOYMENT_DRIFT_RESOLUTION.txt`, `REVENUE-ALERT-SUMMARY.txt` | `docs/reports/` |
| Loose test files in tests/ root | ~25 | `tests/*.test.js`, `tests/*.js` | `tests/e2e/`, `tests/integration/`, or `tests/unit/` (by type) |
| tests/routes/ subdir | 5 files | `tests/routes/` | `tests/integration/routes/` |
| tests/genome/ subdir | 12 files | `tests/genome/` | `tests/integration/genome/` |
| tests/browser/ subdir | 7 files | `tests/browser/` | `tests/e2e/browser/` |
| Update PROJECT_STRUCTURE.md | 1 | Already exists at root | Update to match final state |
| Update CLAUDE.md key dirs | 1 | Root | Update "Key Directories" section |

**What does NOT need doing (already done or N/A):**

- Root-level utility .js files → already in `scripts/` subdirs
- Root-level .sh files → none exist at root
- `strategy-config.json`, `swarm-config.json`, `budget-tracker.json` → do not exist at root (already moved or removed)
- `config/` directory creation → not needed (no config files to move)
- `test/` vs `tests/` consolidation → `test/` does not exist; `tests/` already has proper subdirs

---

## Scope

### In Scope

1. **Move docs/root .md files to proper subdirs** (24 PRDs, 2 design docs, 3 Stripe guides, 6 others)
2. **Move stale root .md files to docs/reports/** (9 files)
3. **Move root .txt files to docs/reports/** (2 files)
4. **Organize loose tests/root files into tests/ subdirs** (~25 files)
5. **Consolidate tests/ subdirs** — move `tests/routes/` → `tests/integration/routes/`, `tests/genome/` → `tests/integration/genome/`, `tests/browser/` → `tests/e2e/browser/`
6. **Update PROJECT_STRUCTURE.md** to reflect final layout
7. **Update CLAUDE.md** key directories section
8. **Verify nothing breaks** — server.js, symlinks, build, tests, Vercel deploy

### Out of Scope

- Moving or renaming any files in `lib/`, `routes/`, `integration/`, `product/`, `frontend/`
- Touching `server.js` content (only verify it still runs)
- Any auto-generated files (DASHBOARD.md, USE_CASES.md, etc.) — they regenerate every heartbeat
- Genome symlinks at root — leave them exactly as-is
- `project.config.json`, `vercel.json`, `.eslintrc.json`, `eslint.config.js`, `playwright.config.js` — stay at root
- `.project.json`, `.spawn-config.json`, and other dotfiles — stay at root (gitignored state files)
- `.tmp_pm_heartbeat.js` — transient file, ignore
- Renaming `tests/.archived/` — already organized

### Risks

- **server.js (43% historical success rate):** This task does NOT modify server.js. Dev must verify `node server.js` still starts after all moves.
- **Import path breakage:** None of the files being moved are `require()`'d by production code. Verify with `grep -r` before moving each batch.
- **Genome doc generation:** `scripts/generate-project-docs.js` outputs some root .md files. Do NOT move auto-generated files (listed in CLAUDE.md "Generated Files" section).
- **Test runner config:** Jest config in `package.json` may reference `tests/` glob patterns. Moving test files could break test discovery. Verify `npm test` passes after moves.

---

## User Stories

### US-1: Move misplaced docs/ root files to subdirs

**As a** developer navigating the docs/ directory,
**I want** PRDs in `docs/prd/`, design docs in `docs/design/`, guides in `docs/guides/`, and reports in `docs/reports/`,
**So that** I can find documentation by type without scanning 35 unsorted files.

**Acceptance Criteria:**
1. `ls docs/*.md` returns 0 files (all moved to subdirs)
2. All `docs/PRD-*.md` files are in `docs/prd/`
3. All `docs/DESIGN-*.md` files are in `docs/design/`
4. All `docs/STRIPE_*.md` files are in `docs/guides/`
5. Remaining files sorted into `docs/guides/` or `docs/reports/` by content type
6. No broken cross-references in moved files (grep for relative paths)

**File classification for "other" docs/ files:**
- `docs/CONTENT-BRIEF-LANDING-PAGE.md` → `docs/design/`
- `docs/DEPLOYMENT-MARKETING-LANDING-PAGE.md` → `docs/guides/`
- `docs/DOMAIN-ROUTING-VERIFICATION.md` → `docs/guides/`
- `docs/GA4_SETUP.md` → `docs/guides/`
- `docs/ROADMAP-WORLD-CLASS.md` → `docs/guides/`
- `docs/ROOT-CAUSE-ANALYSIS-*.md` → `docs/reports/`
- `docs/TRAFFIC-VS-CONVERSION-*.md` → `docs/reports/`
- `docs/UC-*-COMPLETION-REPORT.md` → `docs/reports/`
- `docs/UC-*-TESTING-INSTRUCTIONS.md` → `docs/guides/`
- `docs/UC-*-PM-SIGN-OFF.md` → `docs/reports/`
- `docs/calcom-api-research.md` → `docs/guides/`
- `docs/leadflow-api-design.md` → `docs/design/`

### US-2: Move stale root .md and .txt files to docs/reports/

**As a** developer looking at the repo root,
**I want** only essential project files at root (CLAUDE.md, README.md, ARCHITECTURE.md, etc.),
**So that** the root is navigable and not cluttered with one-off reports.

**Acceptance Criteria:**
1. These files moved to `docs/reports/`:
   - `COMPLETION-4cd35200-70ca-47cd-ad9f-488f849560cb-QC-REVIEW.md`
   - `QC-REVIEW-FIX-ONBOARDING-500.md`
   - `QC-REVIEW-fd0012f1.md`
   - `IMPLEMENTATION-PILOT-CONVERSION-EMAIL-SEQUENCE.md`
   - `LANDING-PAGE-IMPLEMENTATION-SUMMARY.md`
   - `LOG.md`
   - `DISCOVERIES.md`
   - `ORCHESTRATOR-HEARTBEAT-LOG.md`
   - `PILOT_CONVERSION_README.md`
   - `DEPLOYMENT_DRIFT_RESOLUTION.txt`
   - `REVENUE-ALERT-SUMMARY.txt`
2. `ls *.md` at root shows only: `CLAUDE.md`, `README.md`, `ARCHITECTURE.md`, `PMF.md`, `SCHEMA.md`, `CONVENTIONS.md`, `TECH_STACK.md`, `PROJECT_STRUCTURE.md`, `BOOTSTRAP.md`, and auto-generated files (`SERVICES.md`, `API.md`, `DASHBOARD.md`, `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md`, `INDEX.md`, `PROJECT_INDEX.md`, `PROJECT_GRAPH.md`, `CODE_GRAPH.md`)
3. Also at root (agent/orchestrator context): `SOUL.md`, `LEARNINGS.md`, `IDENTITY.md`, `USER.md`, `TOOLS.md`, `AGENTS.md`, `HEARTBEAT.md`, `SKILLS.md`, `ORCHESTRATOR_GUIDE.md`, `ORCHESTRATOR_AUTONOMY_RULES.md`
4. `ls *.txt` returns 0 files

### US-3: Organize loose test files in tests/ root

**As a** developer running or browsing tests,
**I want** all test files in categorized subdirs (e2e/, integration/, unit/),
**So that** I can run targeted test suites and find tests by type.

**Acceptance Criteria:**
1. `ls tests/*.test.js tests/*.js 2>/dev/null | wc -l` returns 0 (no loose files in tests/ root)
2. Each moved file placed in the appropriate subdir:
   - Files with `e2e` in name → `tests/e2e/`
   - Files testing routes or DB → `tests/integration/`
   - Files testing isolated logic → `tests/unit/`
   - `tests/db.test.js` → `tests/integration/`
   - `tests/index.test.js` → `tests/integration/`
   - `tests/logger.test.js` → `tests/unit/`
3. `tests/routes/` contents moved to `tests/integration/routes/`
4. `tests/genome/` contents moved to `tests/integration/genome/`
5. `tests/browser/` contents moved to `tests/e2e/browser/`
6. `npm test` passes after all moves (0 failures)
7. No duplicate file names in target directories

### US-4: Update PROJECT_STRUCTURE.md and CLAUDE.md

**As a** developer or agent reading project context,
**I want** PROJECT_STRUCTURE.md and CLAUDE.md to accurately describe the current directory layout,
**So that** I navigate the repo correctly.

**Acceptance Criteria:**
1. PROJECT_STRUCTURE.md tree reflects actual post-move layout
2. CLAUDE.md "Key Directories" section updated:
   - `docs/` description mentions all subdirs: `prd/`, `design/`, `guides/`, `reports/`, `task-specs/`, `marketing-handoff/`
   - `tests/` description mentions: `e2e/`, `integration/`, `unit/`
   - No references to moved files or old locations
3. No mention of `config/` directory (doesn't exist)

### US-5: Verify nothing breaks

**As a** developer deploying the product,
**I want** zero regressions from file moves,
**So that** this restructuring is purely organizational.

**Acceptance Criteria:**
1. `node server.js` starts without errors (ctrl-c after confirming listen)
2. All 3 genome symlinks at root still resolve: `ls -la task-store.js project-config-loader.js subagent-completion-report.js`
3. `npm test` exits 0
4. `cd product/lead-response/dashboard && npx next build` exits 0
5. `grep -r` for any moved filename in .js files returns 0 hits (no broken references)
6. No files in `scripts/generate-project-docs.js` output paths were moved

---

## Implementation Order

1. **Batch 1 — docs/ cleanup** (US-1): Move docs/ root files to subdirs. Low risk, no code references.
2. **Batch 2 — root .md/.txt cleanup** (US-2): Move stale root files to docs/reports/. Low risk.
3. **Batch 3 — tests/ cleanup** (US-3): Move loose tests, consolidate subdirs. Medium risk (test runner config).
4. **Batch 4 — docs update** (US-4): Update PROJECT_STRUCTURE.md and CLAUDE.md.
5. **Batch 5 — verification** (US-5): Run all checks.

Each batch should be a separate commit so regressions can be bisected.

---

## Verification Commands (for dev agent)

```bash
# After Batch 1:
ls docs/*.md 2>/dev/null | wc -l  # expect: 0

# After Batch 2:
ls *.txt 2>/dev/null | wc -l  # expect: 0
ls COMPLETION-*.md QC-REVIEW-*.md IMPLEMENTATION-*.md LOG.md DISCOVERIES.md 2>/dev/null | wc -l  # expect: 0

# After Batch 3:
ls tests/*.test.js tests/*.js 2>/dev/null | wc -l  # expect: 0
ls -d tests/routes/ tests/genome/ tests/browser/ 2>/dev/null | wc -l  # expect: 0
npm test  # expect: exit 0

# After Batch 5:
node -e "require('./server')" &
sleep 2 && kill %1  # expect: no require errors
ls -la task-store.js project-config-loader.js subagent-completion-report.js  # expect: all symlinks valid
cd product/lead-response/dashboard && npx next build  # expect: exit 0
grep -r 'COMPLETION-4cd35200\|QC-REVIEW-FIX-ONBOARDING\|QC-REVIEW-fd0012f1' --include='*.js' .  # expect: 0 hits
```

---

## What This PRD Does NOT Cover

- Refactoring any code logic
- Changing any import paths in production code (none of the moved files are imported)
- Modifying CI/CD pipelines
- Touching Vercel configuration
- Restructuring `lib/`, `routes/`, `integration/`, or `product/`
