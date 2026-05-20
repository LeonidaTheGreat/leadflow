# PRD-LEADFLOW-REPO-RESTRUCTURE-PHASE2-001

## Status: Draft
## Priority: P2
## Owner: PM Agent
## Version: 1.0

---

## Summary

Phase 1 of the repository restructuring is complete: root-level utility JS files were moved to `scripts/`, config JSONs relocated, `PROJECT_STRUCTURE.md` created, and `tests/` consolidated (no duplicate `test/` directory). However, significant organizational debt remains across four areas: root `.md` files, unsorted `docs/` root files, unsorted `tests/` root files, and unsorted `scripts/` root files. This PRD specifies the remaining moves and the verification criteria.

## Problem

The repo root has 39 `.md` files (only ~12 belong there). The `docs/`, `tests/`, and `scripts/` directories each have dozens of files dumped at their root level instead of sorted into established subdirectories. This makes navigation hard, clutters `ls` output, and violates the structure defined in `PROJECT_STRUCTURE.md`.

## Scope

**In scope:** Moving existing files to established subdirectories, updating path references, updating `CLAUDE.md` and `PROJECT_STRUCTURE.md`.

**Out of scope:** Renaming files, changing file contents, creating new subdirectory categories beyond what exists, modifying server.js, changing test logic, modifying build/deploy pipelines.

---

## Work Items

### WI-1: Sort Root `.md` Files

**39 files currently at repo root.** Disposition:

#### KEEP AT ROOT (12 files — essential context + auto-generated)

| File | Reason |
|------|--------|
| `CLAUDE.md` | Primary project context (task spec) |
| `ARCHITECTURE.md` | System architecture (task spec) |
| `README.md` | Project overview (task spec) |
| `PMF.md` | Pricing/ICP/GTM (task spec) |
| `PROJECT_STRUCTURE.md` | Structure reference |
| `DASHBOARD.md` | Auto-generated every heartbeat |
| `USE_CASES.md` | Auto-generated every heartbeat |
| `E2E_MAPPINGS.md` | Auto-generated every heartbeat |
| `PRD_INDEX.md` | Auto-generated every heartbeat |
| `JOURNEYS.md` | Auto-generated every heartbeat |
| `SERVICES.md` | Auto-generated every heartbeat |
| `API.md` | Auto-generated every heartbeat |

#### MOVE TO `docs/guides/` (14 files — orchestrator/reference docs)

| File | Rationale |
|------|-----------|
| `AGENTS.md` | Agent configuration reference |
| `BOOTSTRAP.md` | Setup instructions |
| `CONVENTIONS.md` | Code conventions |
| `HEARTBEAT.md` | Heartbeat spec |
| `IDENTITY.md` | Agent identity |
| `INDEX.md` | Auto-generated topic index |
| `LEARNINGS.md` | System learnings |
| `ORCHESTRATOR_AUTONOMY_RULES.md` | Orchestrator rules |
| `ORCHESTRATOR_GUIDE.md` | Orchestrator guide |
| `SCHEMA.md` | Database schema reference |
| `SKILLS.md` | Orchestrator skills |
| `SOUL.md` | Agent soul doc |
| `TECH_STACK.md` | Technology reference |
| `TOOLS.md` | Tooling reference |

#### MOVE TO `docs/reports/` (8 files — logs, reviews, summaries)

| File |
|------|
| `COMPLETION-4cd35200-70ca-47cd-ad9f-488f849560cb-QC-REVIEW.md` |
| `DISCOVERIES.md` |
| `IMPLEMENTATION-PILOT-CONVERSION-EMAIL-SEQUENCE.md` |
| `LANDING-PAGE-IMPLEMENTATION-SUMMARY.md` |
| `LOG.md` |
| `ORCHESTRATOR-HEARTBEAT-LOG.md` |
| `PILOT_CONVERSION_README.md` |
| `QC-REVIEW-FIX-ONBOARDING-500.md` |
| `QC-REVIEW-fd0012f1.md` |

#### MOVE TO OTHER LOCATIONS (5 files)

| File | Destination | Rationale |
|------|-------------|-----------|
| `CODE_GRAPH.md` | `docs/reports/` | Generated reference |
| `PROJECT_GRAPH.md` | `docs/reports/` | Generated reference |
| `PROJECT_INDEX.md` | `docs/reports/` | Generated reference |
| `USER.md` | `docs/guides/` | User-facing reference |

**Note:** `CODE_GRAPH.json` and `PROJECT_GRAPH.json` are gitignored generated files — leave at root (moving gitignored files risks breaking generators).

#### REQUIRED REFERENCE UPDATES after moving root .md files

`CLAUDE.md` Key Files section currently references `HEARTBEAT.md`, `SKILLS.md`, `AGENTS.md` at root. Update paths to `docs/guides/HEARTBEAT.md`, `docs/guides/SKILLS.md`, `docs/guides/AGENTS.md`.

Check `scripts/generate-index-md.js` line 118 — references `SCHEMA.md` by name. Verify this is a display string (no path dependency) or update if it constructs a file path.

Check `scripts/clean-worktree.js` lines 10-13 — references `CODE_GRAPH.md`, `CODE_GRAPH.json`, `PROJECT_GRAPH.md`, `PROJECT_GRAPH.json`. Update paths if these files are moved.

---

### WI-2: Sort `docs/` Root Files

**35 files currently at `docs/` root.** Already have subdirectories: `prd/`, `design/`, `guides/`, `reports/`, `task-specs/`, `marketing-handoff/`, `design-assets/`.

#### Move to `docs/prd/` (18 files)

All `PRD-*.md` files at docs root:
- `PRD-AHA-MOMENT-LEAD-SIMULATOR.md`
- `PRD-AUTO-GENERATED-DOCS-DIRECTORY.md`
- `PRD-EMAIL-VERIFICATION-BEFORE-LOGIN.md`
- `PRD-EMAIL-VERIFICATION-DB-MIGRATION-FIX.md`
- `PRD-FIX-AGENTS-TABLE-MISMATCH-AUTH.md`
- `PRD-FIX-ONBOARDING-500-001.md`
- `PRD-FIX-TRIAL-SIGNUP-REDIRECT-001.md`
- `PRD-LANDING-PAGE-CONVERSION-001.md`
- `PRD-LIVE-AI-DEMO-WITHOUT-SIGNUP.md`
- `PRD-PILOT-CONVERSION-EMAIL-SEQUENCE.md`
- `PRD-PRODUCT-STATUS-REPORT-001.md`
- `PRD-REVENUE-RECOVERY-001.md`
- `PRD-SELF-SERVE-STRIPE-CHECKOUT.md`
- `PRD-SIGNUP-AUTH-TOKEN-FIX-001.md`
- `PRD-STATUS-REPORT-20260306.md`
- `PRD-TRIAL-SIGNUP-TSC-BUILD-BLOCKER.md`
- `PRD-UTM-CAPTURE-ATTRIBUTION.md`
- `PRD-fix-signup-login-table-mismatch.md`

#### Move to `docs/design/` (3 files)

- `CONTENT-BRIEF-LANDING-PAGE.md`
- `DESIGN-EMAIL-VERIFICATION.md`
- `DESIGN-LEAD-SATISFACTION-FEEDBACK.md`

#### Move to `docs/guides/` (9 files)

- `DEPLOYMENT-MARKETING-LANDING-PAGE.md`
- `DOMAIN-ROUTING-VERIFICATION.md`
- `GA4_SETUP.md`
- `ROADMAP-WORLD-CLASS.md`
- `STRIPE_CUSTOMER_PORTAL.md`
- `STRIPE_SUBSCRIPTIONS_GUIDE.md`
- `STRIPE_WEBHOOK_SETUP.md`
- `calcom-api-research.md`
- `leadflow-api-design.md`

#### Move to `docs/reports/` (5 files)

- `ROOT-CAUSE-ANALYSIS-UC-LANDING-ANALYTICS-GA4-001.md`
- `TRAFFIC-VS-CONVERSION-DIAGNOSIS-2025-02-14.md`
- `UC-9-COMPLETION-REPORT.md`
- `UC-9-TESTING-INSTRUCTIONS.md`
- `UC-REVENUE-RECOVERY-001-PM-SIGN-OFF.md`

#### REQUIRED REFERENCE UPDATES after moving docs/ files

Check the `prds` database table for `file_path` values pointing to `docs/PRD-*.md` — update to `docs/prd/PRD-*.md`:
```sql
SELECT id, file_path FROM prds WHERE file_path LIKE 'docs/PRD-%';
```

---

### WI-3: Sort `tests/` Root Files

**25 test files at `tests/` root.** Established subdirs: `e2e/`, `integration/`, `unit/`, `routes/`, `browser/`, `genome/`.

#### Classification rules

- Files with `e2e` in name → `tests/e2e/`
- Files with `qc` in name → `tests/e2e/` (QC tests are end-to-end by nature)
- Files testing specific features/fixes (named by task UUID or `feat-*/fix-*`) → `tests/integration/`
- Files testing core modules (`db.test.js`, `logger.test.js`, `index.test.js`) → `tests/unit/`

#### Specific moves

**To `tests/unit/` (3 files):**
- `db.test.js`
- `logger.test.js`
- `index.test.js`

**To `tests/e2e/` (7 files):**
- `5d0a2a23-uptime-rolling-window-e2e.test.js`
- `7c6c2de2-uptime-rolling-window.e2e.test.js`
- `9390baf2-phantom-mrr-e2e-verify.test.js`
- `feat-admin-pilot-invite-flow-e2e.test.js`
- `qc-629fb57f-phantom-mrr-e2e.js`
- `uc-pr1533-dashboard-deploy-regression.test.js`
- `da237aa5-needs-merge-rebase-verification.test.js`

**To `tests/integration/` (15 files):**
- `0b492286.test.js`
- `536f5ed5-security-audit-list-all-debug-admin-inte.test.js`
- `58e84c23-completion-reports-gate-fix.test.js`
- `82c869fc-invite-url-on-email-failure.test.js`
- `9390baf2-phantom-mrr-test-data.test.js`
- `a5f7e77c-pilot-conversion-cron-wiring.test.js`
- `c47360f2-fix-email-delivery-resend-from-domain-not-verified.test.js`
- `cb30fcaa-token-hash-stored-not-raw.test.js`
- `d8c81797-fix-quality-gate-build-failing-in-leadfl.test.js`
- `feat-admin-pilot-invite-flow-qc.test.js`
- `feat-onboarding-completion-telemetry.test.js`
- `feat-revenue-funnel-visibility-workflow-task.test.js`
- `feat-subscription-funnel-tracking-workflow-task.test.js`
- `fix-code-quality-npm-vuln-uuid-upgrade.test.js`
- `fix-no-urgency-or-scarcity-mechanism-workflow-task.test.js`

#### REQUIRED REFERENCE UPDATES

Check Jest config in `package.json` — verify `testMatch` or `testPathPattern` covers subdirectories (should already, since `tests/e2e/` etc. exist and pass).

---

### WI-4: Sort `scripts/` Root Files

**86 files (80 JS + 6 SH) at `scripts/` root.** Established subdirs: `db/`, `diagnostics/`, `migrations/`, `stripe/`, `tasks/`, `utilities/`, `pilots/`, `shell/`, `acceptance/`, `launchd/`.

#### Classification rules

| Pattern | Target Subdir |
|---------|---------------|
| `run-migration-*.js`, `migrate-*.js`, `apply-*-migration.js` | `migrations/` |
| `check-*.js`, `verify-*.js`, `validate-*.js`, `ensure-*.js` | `diagnostics/` |
| `fix-*.js` | `diagnostics/` |
| `generate-*.js` | `utilities/` |
| `insert-*.js`, `seed-*.js`, `update-*.js` | `db/` |
| `setup-*.js` | `utilities/` |
| `sync-*.js` | `utilities/` |
| `*stripe*.js`, `add-stripe-*.js` | `stripe/` |
| `test-*.js`, `load-test.js`, `*-smoke-test*.js` | `diagnostics/` |
| `*pilot*.js`, `enroll-pilot.js` | `pilots/` |
| `*.sh` | `shell/` |
| Remaining `.js` | `utilities/` |

#### Specific moves (86 files)

**To `scripts/migrations/` (17 files):**
- `apply-lead-sequences-migration.js`
- `migrate-lead-simulator.js`
- `migrate-onboarding-simulator.js`
- `migrate-pilot-conversion-schema.js`
- `run-customers-migration.js`
- `run-email-verification-migration.js`
- `run-migration-004.js`
- `run-migration-008-nps.js`
- `run-migration-008.js`
- `run-migration-009.js`
- `run-migration-012-pilot-signups.js`
- `run-migration-012.js`
- `run-migration-013.js`
- `run-migration-014.js`
- `run-migration-015.js`
- `run-migration-016-lead-capture-columns.js`
- `run-migration-016.js`
- `run-migration-nps-fk-fix.js`
- `run-migration-pilot-fields.js`
- `run-migrations-005-007.js`
- `run-pilot-conversion-migration.js`
- `run-weekly-performance-migration.js`

**To `scripts/diagnostics/` (17 files):**
- `check-email-columns.js`
- `check-findings-types.js`
- `check-migration-completeness.js`
- `check-revenue-alert-acceptance.js`
- `check-schema-coupling.js`
- `check-schema.js`
- `check-trial-email-columns.js`
- `ensure-actionable-rate-health.js`
- `fix-malformed-findings.js`
- `no-direct-db.js`
- `route-discovery-smoke-test.js`
- `smoke-test-email-verification.js`
- `test-actionable-rate.js`
- `validate-dashboard.js`
- `verify-chain-completion-fix.js`
- `verify-distribution-loop-fix.js`
- `verify-email-verification-migration.js`
- `verify-no-supabase-env-vars.js`
- `verify-resend-api-key.js`
- `verify-resend-key-live.js`
- `verify-stripe-webhook-secret.js`

**To `scripts/db/` (10 files):**
- `insert-e2e-sat.js`
- `insert-e2e-specs-stripe.js`
- `insert-prd-smoke-loop.js`
- `insert-pricing-e2e-specs.js`
- `insert-revenue-prd.js`
- `insert-revenue-recovery-use-cases.js`
- `seed-e2e-test-specs.js`
- `seed-project-hierarchy.js`
- `update-prd-dedup.js`
- `update-product-review-6eee0baf.js`
- `update-revenue-alert-idempotency-prd.js`

**To `scripts/stripe/` (4 files):**
- `add-stripe-webhook-secret.js`
- `setup-stripe-webhook.js`
- `setup-stripe-webhook-production.js`
- `test-stripe-webhook.js`

**To `scripts/pilots/` (2 files):**
- `enroll-pilot.js`
- `pilot-conversion-cron.js`

**To `scripts/utilities/` (21 files):**
- `clean-worktree.js`
- `create-forgot-password-task.js`
- `feedback-collector.js`
- `generate-api-docs.js`
- `generate-architecture-services.js`
- `generate-index-md.js`
- `generate-project-docs.js`
- `generate-services-docs.js`
- `load-test.js`
- `pm-fix-signup-plans-insert.js`
- `pm-review-submit.js`
- `pm-satisfaction-e2e.js`
- `pm-satisfaction-setup.js`
- `provision-phone-pool.js`
- `report-aha-feedback.js`
- `revenue-gap-analysis.js`
- `setup-posthog-experiment.js`
- `sync-dashboard-html.js`
- `sync-deploy-config.js`
- `sync-system-components.js`
- `schema-validator.sh` (non-shell-only script)

**To `scripts/shell/` (5 SH files):**
- `e2e-flow-tests.sh`
- `heartbeat.sh`
- `preflight-check.sh`
- `setup-autonomous.sh`
- `sync-dashboard.sh`

#### REQUIRED REFERENCE UPDATES after moving scripts/ files

1. **`generate-*.js` scripts** are called from genome heartbeat (`generate-project-docs.js`). Check how the heartbeat locates them — likely via `scripts/generate-project-docs.js` path. Update genome callers to `scripts/utilities/generate-project-docs.js`.

2. **E2E tests** reference scripts by path:
   - `tests/e2e/doc-generation.test.js` lines 45, 71: `require('../../scripts/generate-api-docs')` and `require('../../scripts/generate-services-docs')` → update to `../../scripts/utilities/generate-api-docs` and `../../scripts/utilities/generate-services-docs`
   - `tests/e2e/e01ea7cd-services-api-docs.test.js` lines 41, 45: uses `path.join(PROJECT_DIR, 'scripts', 'generate-services-docs.js')` → update to `path.join(PROJECT_DIR, 'scripts', 'utilities', 'generate-services-docs.js')`

3. **`scripts/clean-worktree.js`** references `CODE_GRAPH.md`, `PROJECT_GRAPH.md` — if these are moved, update paths in this file.

4. **`package.json` scripts** — check for any `node scripts/X.js` entries and update paths.

5. **Genome heartbeat** — check `~/.openclaw/genome/core/heartbeat-executor.js` for direct `scripts/` paths into this repo.

---

### WI-5: Update `CLAUDE.md` Key Files & Key Directories

After all moves, update the `CLAUDE.md` sections:

**Key Directories** — add entries for moved content:
```
- `docs/guides/` — orchestrator docs, setup guides, schema reference
- `docs/design/` — design specs, content briefs, wireframes
- `docs/reports/` — completion reports, QC reviews, analysis
- `docs/prd/` — Product Requirements Documents
```

**Key Files** — update paths:
```
- `docs/guides/HEARTBEAT.md` — heartbeat spec
- `docs/guides/SKILLS.md` — orchestrator skills
- `docs/guides/AGENTS.md` — agent configuration
- `docs/guides/SCHEMA.md` — database schema
```

### WI-6: Update `PROJECT_STRUCTURE.md`

Update the tree in `PROJECT_STRUCTURE.md` to reflect the actual post-restructure directory layout, including all `scripts/` subdirs (`migrations/`, `diagnostics/`, `db/`, `stripe/`, `utilities/`, `pilots/`, `shell/`, `acceptance/`, `launchd/`, `tasks/`) and all `docs/` subdirs.

---

## Risk Assessment

### HIGH: Broken script references
- **Genome heartbeat calls `scripts/generate-project-docs.js`** — if this moves to `scripts/utilities/`, the heartbeat will break every 5 minutes until updated.
- **Mitigation:** grep the entire genome codebase for LeadFlow script paths BEFORE moving. Update genome callers FIRST, then move files.

### HIGH: Broken test imports
- **Tests use relative `require()` paths** to scripts. Moving scripts changes paths.
- **Mitigation:** After every move batch, run `npm test` to catch broken requires immediately.

### MEDIUM: Auto-generated .md file paths
- `generate-project-docs.js`, `generate-index-md.js` etc. may write output to hardcoded root paths. If those generators reference `SCHEMA.md` etc. by root path, the generated output will have stale links.
- **Mitigation:** Read each generator's output path logic before moving referenced files.

### LOW: Database `file_path` references
- `prds` table stores `file_path` for PRD docs. Moved PRDs need DB updates.
- **Mitigation:** Run the SQL query in WI-2 to find and update affected rows.

### WARNING: `server.js` (43% historical success rate)
- This PRD does NOT touch `server.js`. No changes to server code, routes, or middleware.

---

## Acceptance Criteria

All criteria are runnable verification commands.

### AC-1: Root cleanliness
```bash
# Max 12 .md files at root (5 essential + 7 auto-generated)
test $(ls *.md | wc -l) -le 12

# Specific files present at root
for f in CLAUDE.md ARCHITECTURE.md README.md PMF.md PROJECT_STRUCTURE.md \
         DASHBOARD.md USE_CASES.md E2E_MAPPINGS.md PRD_INDEX.md \
         JOURNEYS.md SERVICES.md API.md; do
  test -f "$f" || echo "MISSING: $f"
done

# No stray .md files that should have been moved
for f in AGENTS.md BOOTSTRAP.md CONVENTIONS.md HEARTBEAT.md IDENTITY.md \
         SCHEMA.md SKILLS.md SOUL.md TOOLS.md USER.md; do
  test ! -f "$f" || echo "SHOULD BE MOVED: $f"
done
```

### AC-2: docs/ root clean
```bash
# Zero files at docs/ root (all sorted into subdirs)
test $(ls docs/*.md 2>/dev/null | wc -l) -eq 0
```

### AC-3: tests/ root clean
```bash
# Zero test files at tests/ root
test $(ls tests/*.test.js tests/*.js 2>/dev/null | wc -l) -eq 0
```

### AC-4: scripts/ root clean
```bash
# Zero JS/SH files at scripts/ root
test $(ls scripts/*.js scripts/*.sh 2>/dev/null | wc -l) -eq 0
```

### AC-5: Tests pass
```bash
npm test
# Exit code 0, 0 failures
```

### AC-6: Build passes
```bash
cd product/lead-response/dashboard && npx next build
# Exit code 0
```

### AC-7: Symlinks intact
```bash
# All 3 genome symlinks still valid
for f in project-config-loader.js subagent-completion-report.js task-store.js; do
  test -L "$f" && test -e "$f" || echo "BROKEN SYMLINK: $f"
done
```

### AC-8: CLAUDE.md updated
```bash
# Key files section references new paths
grep 'docs/guides/HEARTBEAT.md' CLAUDE.md
grep 'docs/guides/SKILLS.md' CLAUDE.md
grep 'docs/guides/AGENTS.md' CLAUDE.md
```

### AC-9: No broken requires
```bash
# Grep for old paths that should have been updated
grep -r "require.*'../../scripts/generate-api-docs'" tests/ && echo "STALE REQUIRE" || true
grep -r "require.*'../../scripts/generate-services-docs'" tests/ && echo "STALE REQUIRE" || true
grep -r "'scripts/generate-project-docs'" ~/.openclaw/genome/ && echo "STALE GENOME REF" || true
```

---

## Implementation Order (for dev agent)

1. **Audit phase** — grep all path references BEFORE moving anything
2. **Move `scripts/` root files** to subdirs (largest batch, lowest external risk)
3. **Move `tests/` root files** to subdirs → run `npm test`
4. **Move `docs/` root files** to subdirs → update `prds` table file_path entries
5. **Move root `.md` files** to `docs/guides/` and `docs/reports/`
6. **Update references** — CLAUDE.md, PROJECT_STRUCTURE.md, test imports, genome paths, clean-worktree.js
7. **Full verification** — run all AC commands

Each step should be a separate commit for easy rollback.

---

## What This PRD Does NOT Cover

- Renaming any files
- Changing file contents (beyond path references)
- Modifying `server.js`, routes, middleware, or lib/ code
- Creating new directory categories
- Moving dotfiles (`.orchestrator-state.json`, `.spawn-config.json`, etc.)
- Moving gitignored generated JSON files (`CODE_GRAPH.json`, `PROJECT_GRAPH.json`)
- Genome codebase changes (genome callers are updated in this repo's context only if they reference moved files)
