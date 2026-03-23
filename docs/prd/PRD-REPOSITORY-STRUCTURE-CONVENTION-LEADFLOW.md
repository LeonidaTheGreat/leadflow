# PRD — Repository Structure Convention for LeadFlow

- **PRD ID:** prd-repo-structure-convention-leadflow
- **Project:** leadflow
- **Type:** Feature
- **Priority:** Medium
- **Status:** Draft
- **Owner:** Product

## 1) Problem
LeadFlow repo has high root-level sprawl (utility scripts, one-offs, docs, configs, duplicate test directories). This slows onboarding, increases deployment risk, and makes automation brittle.

## 2) Objective
Apply a consistent repository structure convention so files are predictable, discoverable, and safe to operate in CI/CD and local workflows.

## 3) Scope

### In Scope
1. Move root-level utility/diagnostic `.js` files into `scripts/` subdirectories:
   - `scripts/migrations/`
   - `scripts/diagnostics/`
   - `scripts/simulation/`
   - `scripts/one-off/`
2. Move root-level `.sh` files into `scripts/`.
3. Reorganize root-level docs into `docs/` subdirectories:
   - `PRD-*.md` → `docs/prd/`
   - `DESIGN-*.md` → `docs/design/`
   - `STRIPE_*.md`, `CALCOM*.md`, `RESEND*.md` → `docs/guides/`
   - `*COMPLETE*.md`, `PHASE*.md`, `*REPORT*.md`, `*SUMMARY*.md`, `*ANALYSIS*.md` → `docs/reports/`
4. Keep these files at root: `CLAUDE.md`, `ARCHITECTURE.md`, `README.md`, `PMF.md`.
5. Move root JSON configs to `config/`:
   - `strategy-config.json`
   - `swarm-config.json`
   - `budget-tracker.json`
   - Update references.
6. Consolidate `test/` + `tests/` into `tests/` with:
   - `tests/e2e/`
   - `tests/integration/`
   - `tests/unit/`
7. Create `PROJECT_STRUCTURE.md` using the genome template and adapt to LeadFlow.
8. Update `CLAUDE.md` Key Directories section to match new structure.
9. Verification checks:
   - existing symlinks still valid
   - `server.js` still runs
   - Vercel deploy still succeeds

### Out of Scope
- Feature behavior changes in product runtime.
- Refactoring business logic unrelated to path/reference updates.

## 4) User Stories
- As a developer, I can find scripts/docs/configs by convention without searching the repo root.
- As an orchestrator/agent, I can execute scripts reliably because paths are standardized.
- As release owner, I can deploy without regressions caused by moved files.

## 5) Requirements

### Functional Requirements
FR-1: Root-level utility/diagnostic JS files are relocated into `scripts/*` categorized by purpose.

FR-2: Root-level shell scripts are moved into `scripts/`.

FR-3: Root-level documentation files are relocated into the correct `docs/*` subfolders by naming rules.

FR-4: Root-level JSON config files are moved into `config/` and all code/script references are updated.

FR-5: Legacy `test/` and `tests/` duplication is resolved into one `tests/` hierarchy with `e2e`, `integration`, `unit`.

FR-6: `PROJECT_STRUCTURE.md` exists and reflects actual directory structure and conventions.

FR-7: `CLAUDE.md` Key Directories section reflects post-restructure paths and intent.

FR-8: Symlinks critical to orchestration (`task-store.js`, `project-config-loader.js`, `subagent-completion-report.js`) remain valid.

FR-9: Runtime/deploy smoke checks pass after moves.

### Non-Functional Requirements
NFR-1: No broken imports/require paths introduced.

NFR-2: Script invocations documented and runnable from repo root.

NFR-3: Deployability unchanged (Vercel build/deploy for root webhook and dashboard target).

## 6) Acceptance Criteria (Definition of Done)
1. All targeted root JS utility/diagnostic files are moved from root into the required `scripts/` subfolders.
2. No targeted root `.sh` file remains at root.
3. Documentation move rules are applied exactly; excluded root docs remain at root.
4. `config/` exists with the three JSON config files, and references are updated (search confirms no stale old paths).
5. Only one test root remains (`tests/`) with `e2e`, `integration`, `unit` subdirectories and test files correctly placed.
6. `PROJECT_STRUCTURE.md` exists and matches current repository layout.
7. `CLAUDE.md` Key Directories section is updated and accurate.
8. Symlink checks confirm the three orchestration symlinks resolve and are readable.
9. `node server.js` (or project-standard run command) starts without path-related failure.
10. Vercel deployment validation completes successfully (build + deploy checks pass in project-standard workflow).

## 7) Risks & Mitigations
- **Risk:** Hidden path dependencies in scripts/CI.  
  **Mitigation:** grep for old paths + run smoke scripts.
- **Risk:** Test discovery breaks after folder merge.  
  **Mitigation:** run full test command and ensure test runner globs match.
- **Risk:** Vercel root/dashboard project confusion.  
  **Mitigation:** validate both deployment contexts explicitly.

## 8) Rollout Plan
1. Inventory current files and map old→new paths.
2. Move files in coherent batches (scripts, docs, config, tests).
3. Update path references after each batch.
4. Run local verification and deployment smoke checks.
5. Submit PR with migration summary and before/after tree excerpt.

## 9) E2E Test Specs (for QC)
- E2E-1 Repo Structure Audit: all move rules satisfied via file-system assertions.
- E2E-2 Path Reference Audit: no stale references to old root paths for moved files.
- E2E-3 Orchestration Symlink Integrity: required symlinks resolve.
- E2E-4 Runtime Smoke: server boot command succeeds.
- E2E-5 Deployment Smoke: Vercel deploy command succeeds in both relevant deployment roots.

## 10) Dependencies
- Dev for implementation of file moves + path updates.
- QC for filesystem + runtime/deploy validation.

## 11) Workflow Recommendation
`["product","marketing","design","dev","qc"]` (default workflow retained per request context).