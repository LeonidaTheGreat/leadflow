# PRD: Repository Structure Convention for LeadFlow

**ID:** prd-repository-structure-convention  
**Status:** draft  
**Version:** 1.0  
**Author:** Product Manager  
**Date:** 2026-03-13  
**Use Case:** feat-repository-structure-convention

---

## 1. Problem Statement

The LeadFlow root directory has accumulated 80+ files — utility scripts, diagnostic JS files, shell scripts, completion reports, strategy JSON configs, and documentation — all mixed together at the top level. This makes it:

- Difficult for new agents and developers to orient quickly
- Error-prone (wrong files edited, stale paths referenced)
- Inconsistent with the Genome convention used by other orchestrated projects

A well-defined directory convention reduces agent onboarding time, eliminates path confusion, and makes the codebase maintainable as it grows.

---

## 2. Goals

- Establish a canonical directory structure for LeadFlow that aligns with Genome conventions
- Move misplaced files to their correct locations without breaking any runtime behavior
- Document the convention in `PROJECT_STRUCTURE.md` so all agents follow it going forward
- Update `CLAUDE.md` Key Directories section to reflect the new layout
- Zero stale path references after reorganization
- Successful smoke checks post-move (server.js, Vercel webhook, Vercel dashboard)

---

## 3. Non-Goals

- Refactoring product code logic (routes, integrations, lib)
- Changing Supabase schema
- Modifying Genome files in `~/.openclaw/genome/`
- Moving symlinks: `task-store.js`, `project-config-loader.js`, `subagent-completion-report.js` (these STAY at root — they are Genome symlinks)

---

## 4. Proposed Directory Structure

```
leadflow/
├── server.js                          # KEEP AT ROOT — Vercel entry point
├── vercel.json                        # KEEP AT ROOT — Vercel config
├── package.json / package-lock.json   # KEEP AT ROOT — Node runtime
├── .env / .env.local / .env.template  # KEEP AT ROOT — credentials
├── agents.json                        # KEEP AT ROOT — agent config
├── project.config.json                # KEEP AT ROOT — Genome identity
├── task-store.js (symlink)            # KEEP AT ROOT — Genome symlink
├── project-config-loader.js (symlink) # KEEP AT ROOT — Genome symlink
├── subagent-completion-report.js (symlink) # KEEP AT ROOT — Genome symlink
├── CLAUDE.md                          # KEEP AT ROOT — primary context
├── README.md                          # KEEP AT ROOT — project overview
├── PROJECT_STRUCTURE.md               # NEW — this document's output
│
├── config/                            # Strategy & runtime config JSON
│   ├── strategy-config.json           # moved from root
│   ├── swarm-config.json              # moved from root
│   └── budget-tracker.json            # moved from root
│
├── scripts/                           # All utility / diagnostic / migration scripts
│   ├── db/                            # Database diagnostics & migrations
│   │   ├── check-db.js
│   │   ├── check-tables.js
│   │   ├── check-tasks.js
│   │   ├── check-project-metadata.js
│   │   ├── check-agents-table.js
│   │   ├── auto-create-tables.js
│   │   ├── execute-migration.js
│   │   ├── migrate-to-db.js
│   │   ├── run-*.js  (all migration runners)
│   │   └── setup-*.js (all setup scripts)
│   ├── stripe/                        # Stripe-specific utility scripts
│   │   ├── fix-stripe-status.js
│   │   ├── sync-stripe-tasks.js
│   │   ├── add-stripe-work.js
│   │   ├── add-stripe-completed-work.js
│   │   └── verify-stripe-env.js
│   ├── tasks/                         # Task management utility scripts
│   │   ├── mark-done.js
│   │   ├── cleanup-tasks.js
│   │   ├── cleanup-duplicates.js
│   │   ├── reset-tasks.js
│   │   ├── reset-zombies.js
│   │   ├── reset-all-inprogress.js
│   │   ├── update-task-status.js
│   │   └── query-tasks.js
│   ├── diagnostics/                   # General diagnostic scripts
│   │   ├── check-db.js (alias link)
│   │   ├── self-test.js
│   │   ├── self-test-v2.js
│   │   ├── query-project.js
│   │   ├── fix-null-agents.js
│   │   ├── fix-budget-models.js
│   │   ├── budget-approval-uc6.json
│   │   └── verify-*.js
│   └── (existing scripts/*.js remain in scripts/ top-level)
│
├── docs/                              # All documentation
│   ├── prd/                           # Product Requirements Documents
│   │   ├── PRD-BILLING.md
│   │   ├── PRD-CORE-SMS.md
│   │   ├── PRD-INTEGRATIONS.md
│   │   └── PRD-*.md (all PRD documents)
│   ├── design/                        # Design specs and briefs
│   │   ├── DESIGN-EMAIL-VERIFICATION.md
│   │   ├── DESIGN-UTM-ATTRIBUTION-DASHBOARD.md
│   │   └── CONTENT-BRIEF-*.md
│   ├── guides/                        # How-to and reference guides
│   │   ├── 4-LOOP-ARCHITECTURE.md
│   │   ├── MIGRATION_GUIDE.md
│   │   ├── ERROR_HANDLING.md
│   │   ├── CALCOM_WEBHOOK_HANDLER.md
│   │   └── MARKETING-*.md
│   └── reports/                       # Completion reports and analysis docs
│       ├── AB_TESTING_SUMMARY.md
│       ├── BILLING_SCHEMA_ALIGNMENT_COMPLETE.md
│       └── GENOME-ANALYSIS-*.md
│
├── tests/                             # Consolidated test directory
│   ├── e2e/                           # End-to-end tests (moved from test/ and tests/ root)
│   │   ├── billing-api-integration.test.js
│   │   ├── billing-schema-alignment-e2e.js
│   │   ├── calcom-integration.test.js
│   │   ├── stripe-subscriptions.test.js
│   │   └── twilio-sms-integration.test.js
│   ├── integration/                   # Integration tests
│   │   ├── calcom-webhook-handler.test.js
│   │   ├── calcom-webhook-management.test.js
│   │   └── uc-9-signup-flow-test.js
│   └── unit/                          # Unit tests
│       └── (future unit tests)
│
├── routes/                            # API routes (unchanged)
├── lib/                               # Core library (unchanged)
├── integrations/                      # Third-party integrations (unchanged)
├── product/                           # Product UI (unchanged)
├── frontend/                          # Dashboard UI (unchanged)
├── agents/                            # Agent configs (unchanged)
├── sql/                               # SQL migration files (unchanged)
├── supabase/                          # Supabase config (unchanged)
├── completion-reports/                # Auto-generated by Genome (unchanged)
└── docs/                              # Documentation (reorganized above)
```

---

## 5. Files That MUST Stay at Root

The following must never be moved — moving them breaks runtime or Vercel deploy:

| File | Reason |
|------|--------|
| `server.js` | Vercel entry point (`fub-inbound-webhook` project) |
| `vercel.json` | Vercel config — references server.js |
| `package.json` | Node.js runtime |
| `package-lock.json` | Dependency lock |
| `.env`, `.env.local`, `.env.template` | Credential lookup chain |
| `agents.json` | Agent configuration — referenced by OpenClaw |
| `project.config.json` | Genome identity card |
| `task-store.js` | Genome symlink |
| `project-config-loader.js` | Genome symlink |
| `subagent-completion-report.js` | Genome symlink |
| `CLAUDE.md` | Primary context file |
| `README.md` | GitHub landing page |
| `PROJECT_STRUCTURE.md` | NEW — convention reference (keep at root for discoverability) |
| `AGENTS.md`, `HEARTBEAT.md`, `SKILLS.md` | OpenClaw agent configs |
| `ARCHITECTURE.md` | Primary architecture reference |

---

## 6. Config Migration: strategy-config.json, swarm-config.json, budget-tracker.json

These three files are referenced in multiple scripts. Dev agent must:

1. Move files to `config/`
2. `grep -r "strategy-config.json\|swarm-config.json\|budget-tracker.json" . --include="*.js" --include="*.ts" --include="*.sh"` — find all references
3. Update each reference to use `config/` prefix (or `path.join(__dirname, 'config', 'filename.json')`)
4. Run a grep again to confirm zero stale references

---

## 7. Test Directory Consolidation

Current state: tests scattered across `test/` (13 files), `tests/` (18+ files), and root-level `test-*.js` files.

Target state: everything under `tests/{e2e,integration,unit}`.

### Classification Rules
- **e2e**: Tests that exercise the full stack (HTTP → DB → SMS → Stripe) — `billing-api-integration`, `stripe-subscriptions`, `twilio-sms-integration`, `calcom-integration`, `pilot-conversion-email-sequence`
- **integration**: Tests that exercise one integration boundary — `calcom-webhook-handler`, `uc-9-signup-flow-test`
- **unit**: Tests of pure logic functions with no external I/O

### Root-level test-*.js files
Files like `test-alex.js`, `test-emma.js`, `test-robert.js`, `test-fresh.js` are simulation/diagnostic scripts, not automated tests. Move to `scripts/diagnostics/`.

---

## 8. Documentation Reorganization

### docs/prd/
All `PRD-*.md` files currently in `docs/` move to `docs/prd/`.

### docs/design/
- `DESIGN-EMAIL-VERIFICATION.md`
- `DESIGN-UTM-ATTRIBUTION-DASHBOARD.md`
- `CONTENT-BRIEF-*.md`

### docs/guides/
- `4-LOOP-ARCHITECTURE.md`
- `MIGRATION_GUIDE.md`
- `ERROR_HANDLING.md`
- `CALCOM_WEBHOOK_HANDLER.md`
- `MARKETING-*.md` files

### docs/reports/
Completion/summary docs that are historical records:
- `BILLING_SCHEMA_ALIGNMENT_COMPLETE.md`
- `AB_TESTING_SUMMARY.md`
- `GENOME-ANALYSIS-*.md`

### Keep at docs/ root
- `leadflow-api-design.md` (referenced in CLAUDE.md)

---

## 9. PROJECT_STRUCTURE.md

Dev agent must create `PROJECT_STRUCTURE.md` at repo root documenting:
- The canonical directory layout
- What belongs in each directory
- Files that must stay at root (and why)
- Convention rules for new files

---

## 10. CLAUDE.md Update

The "Key Directories" section in CLAUDE.md must be updated to reflect:
- `config/` — strategy and runtime JSON configs
- `tests/e2e/`, `tests/integration/`, `tests/unit/` — test structure
- `docs/prd/`, `docs/design/`, `docs/guides/`, `docs/reports/` — docs structure
- Removal of references to `test/` (deprecated)

---

## 11. Acceptance Criteria

### AC-1: Config Files Moved
- [ ] `strategy-config.json` exists at `config/strategy-config.json`
- [ ] `swarm-config.json` exists at `config/swarm-config.json`
- [ ] `budget-tracker.json` exists at `config/budget-tracker.json`
- [ ] Zero references to these filenames without `config/` prefix in any `.js`, `.ts`, or `.sh` file

### AC-2: Test Consolidation
- [ ] `tests/e2e/` exists with E2E tests from former `test/` directory
- [ ] `tests/integration/` exists with integration tests
- [ ] Old `test/` directory is empty or removed
- [ ] `npm test` passes (no broken imports)

### AC-3: Docs Reorganization
- [ ] `docs/prd/` directory exists with all PRD-*.md files
- [ ] `docs/design/` directory exists with design docs
- [ ] `docs/guides/` directory exists with guide docs
- [ ] No `PRD-*.md` files remain at `docs/` root level

### AC-4: Scripts Consolidation
- [ ] Root-level diagnostic `test-*.js` and utility `check-*.js` files moved to `scripts/` subdirectories
- [ ] `scripts/db/`, `scripts/stripe/`, `scripts/tasks/`, `scripts/diagnostics/` subdirectories exist

### AC-5: PROJECT_STRUCTURE.md Created
- [ ] `PROJECT_STRUCTURE.md` exists at repo root
- [ ] Documents keep-at-root exceptions
- [ ] Documents all canonical directories

### AC-6: CLAUDE.md Updated
- [ ] "Key Directories" section reflects new layout
- [ ] References `config/`, `tests/e2e/`, `tests/integration/`, `docs/prd/`

### AC-7: Runtime Integrity
- [ ] `node server.js` starts without errors
- [ ] Vercel deploy check: `vercel --prod --dry-run` succeeds for both projects
- [ ] Smoke test: `scripts/route-discovery-smoke-test.js` passes
- [ ] Symlinks `task-store.js`, `project-config-loader.js`, `subagent-completion-report.js` still resolve correctly at root

### AC-8: Zero Stale Paths
- [ ] `grep -r "strategy-config.json" . --include="*.js" --include="*.sh" | grep -v "config/"` returns empty
- [ ] `grep -r "swarm-config.json" . --include="*.js" --include="*.sh" | grep -v "config/"` returns empty
- [ ] `grep -r "budget-tracker.json" . --include="*.js" --include="*.sh" | grep -v "config/"` returns empty
- [ ] No imports referencing `../test/` or `./test/` from product code

---

## 12. User Stories

**As a dev agent**, I want to know exactly where to place a new utility script so I don't pollute the root directory.

**As the orchestrator**, I want `CLAUDE.md` Key Directories to be accurate so I orient correctly on every heartbeat.

**As a QC agent**, I want a single `tests/` directory with clear e2e/integration/unit subdirectories so I can find and run the right tests quickly.

**As Stojan**, I want the root directory to be clean and navigable in under 10 seconds — I should only see core project files, not dozens of utility scripts.

---

## 13. Out of Scope for This PRD

- Deleting historical completion reports at root (these can be archived but not deleted — they are referenced by the Genome learning system)
- Changing how `completion-reports/` works (Genome manages this)
- Moving `e2e/` directory (this is a framework config directory used by playwright — dev agent must assess before moving)
- Refactoring product code

---

## 14. Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Broken `require()` paths after moves | Dev agent runs `npm test` and smoke tests before committing |
| Vercel deployment breaks | `server.js` and `vercel.json` stay at root; dry-run check before deploy |
| Genome symlinks break | Symlinks stay at root — never move |
| Config JSON refs missed | Grep check is part of AC-8 |
| Historical root docs needed by Genome | Genome reads from Supabase, not filesystem — safe to move |

---

## 15. Definition of Done

1. All acceptance criteria above pass
2. `npm test` exits 0
3. Smoke test passes (both Vercel projects reachable)
4. `PROJECT_STRUCTURE.md` exists at root
5. `CLAUDE.md` Key Directories section updated
6. Zero stale path references (AC-8 greps return empty)
7. Git commit with message: `refactor: apply repository structure convention`
