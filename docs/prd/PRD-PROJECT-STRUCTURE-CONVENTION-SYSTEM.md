# PRD: Project Structure Convention System

- **PRD ID:** PRD-PROJECT-STRUCTURE-CONVENTION-SYSTEM
- **Project:** genome
- **Status:** draft
- **Owner:** Product
- **Related UC (proposed):** feat-project-structure-convention-system

## 1) Problem
Project file placement is inconsistent across agents and repos, creating root-level clutter, discoverability issues, and rework during implementation/review. There is no enforced canonical structure that all agents read before creating files.

## 2) Objective
Standardize repository structure for all projects managed by Genome via:
1. A canonical template (`PROJECT_STRUCTURE.template.md`)
2. Runtime context injection in `buildRoleContext()`
3. Bootstrap generation of `PROJECT_STRUCTURE.md` on new project registration
4. Explicit SOUL guardrail in all workspaces: read `PROJECT_STRUCTURE.md` before creating files

## 3) Scope
### In scope
- New template file at:
  `~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md`
- Canonical directory map and guardrails in template
- `workflow-engine.js` update so role context includes/uses project structure guidance
- Project registration bootstrap step to create `PROJECT_STRUCTURE.md` from template
- SOUL updates for:
  - workspace-dev
  - workspace-design
  - workspace-product-manager
  - workspace-qc
  - workspace-marketing
  - workspace-analytics
  - workspace-orchestrator

### Out of scope
- Retrofitting/migrating every existing project file automatically
- Enforcing via hard runtime write-blocks (this PRD is convention + bootstrap + context behavior)

## 4) Canonical Structure Requirement
Template MUST define this canonical structure and intent:
- `routes/`
- `lib/`
- `integrations/`
- `product/`
- `agents/`
- `docs/`
  - `prd/`
  - `design/`
  - `guides/`
  - `architecture/`
  - `reports/`
  - `auto-generated/`
- `scripts/`
  - `migrations/`
  - `diagnostics/`
  - `simulation/`
  - `one-off/`
- `sql/`
- `tests/`
  - `e2e/`
  - `integration/`
  - `unit/`

## 5) Rules (Must Be Explicit in Template)
1. **Do not create new implementation artifacts at repo root** unless explicitly listed as allowed root files.
2. **PRDs must live in `docs/prd/`**.
3. Design deliverables must live under `docs/design/`.
4. Diagnostic and migration scripts must live in `scripts/diagnostics/` and `scripts/migrations/` respectively.
5. Tests must be under `tests/{e2e,integration,unit}`.
6. Agents must read `PROJECT_STRUCTURE.md` before creating files.

## 6) User Stories
- As an agent, I can see the expected directory layout before I create files.
- As an orchestrator, I can bootstrap new projects with a structure contract from day zero.
- As PM/QC, I can validate whether output paths comply with convention.

## 7) Functional Requirements
- **FR-1 Template file exists** at the exact path and contains canonical directories + rules.
- **FR-2 Role context wiring:** `buildRoleContext()` incorporates project structure guidance so runtime prompts include convention expectations.
- **FR-3 Bootstrap generation:** when a new project is registered, `PROJECT_STRUCTURE.md` is created from template if missing.
- **FR-4 Workspace SOUL guardrail:** all listed workspaces include explicit instruction to read `PROJECT_STRUCTURE.md` before file creation.
- **FR-5 Idempotency:** bootstrap does not overwrite an existing `PROJECT_STRUCTURE.md` unless explicitly requested.

## 8) Non-Functional Requirements
- Clear, terse template language suitable for all role types.
- Backward-compatible behavior for existing projects.
- Deterministic output pathing guidance.

## 9) Acceptance Criteria
1. Template exists at `~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md` and contains full canonical tree + rules above.
2. `buildRoleContext()` includes project structure convention in generated role context for spawned tasks.
3. New project registration creates `PROJECT_STRUCTURE.md` from template when absent.
4. Re-register/bootstrap does not overwrite pre-existing project-specific `PROJECT_STRUCTURE.md`.
5. All target workspace `SOUL.md` files include rule: **Always read `PROJECT_STRUCTURE.md` before creating files.**
6. PRD placement rule explicitly states: PRDs go in `docs/prd/`.
7. Root-level anti-clutter rule explicitly states: do not create files at repo root (except allowed root files).

## 10) Risks & Mitigations
- **Risk:** Existing agent habits still produce root files.
  - **Mitigation:** Inject rule in both role context and workspace SOUL.
- **Risk:** Existing projects lack immediate adoption.
  - **Mitigation:** Add one-time bootstrap/backfill follow-up task after this feature ships.

## 11) Rollout
1. Ship template + context wiring + bootstrap + SOUL updates.
2. Validate on a newly registered test project.
3. Backfill existing projects in a separate implementation task if needed.

## 12) Dependencies
- Genome workflow engine (`workflow-engine.js`)
- Project registration/bootstrap flow in genome
- Workspace SOUL files in `.openclaw/workspace-*`

## 13) Definition of Done
- PRD approved and linked to UC
- E2E specs created for the UC
- Dev implementation task can execute with zero ambiguity on paths/rules
