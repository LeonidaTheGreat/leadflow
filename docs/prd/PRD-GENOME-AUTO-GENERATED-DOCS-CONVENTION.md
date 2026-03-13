# PRD: Auto-Generated Docs Directory Convention

**ID:** genome-auto-generated-docs-convention  
**Status:** approved  
**Priority:** P2  
**Author:** PM Agent  
**Date:** 2026-03-13  
**Use Case:** feat-genome-auto-generated-docs-convention  

---

## Problem Statement

`generate-project-docs.js` currently writes four auto-generated markdown files (`USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md`) directly to the project root. This pollutes the repo root with ephemeral, machine-generated files, makes it harder to distinguish hand-authored docs from auto-generated ones, and offers no per-project control over where these files land.

---

## Goal

Move all auto-generated markdown output to a dedicated subdirectory (`docs/auto-generated/` by default), keep every reference to these files in sync, and make the output path configurable per project in `project.config.json`.

---

## User Stories

### US-1 — Clean repo root
> As a developer browsing the repo root, I want to see only hand-authored files so that auto-generated noise doesn't obscure what I need to edit.

### US-2 — Predictable auto-generated location
> As an agent reading generated docs, I want to know that all auto-generated markdown lives in `docs/auto-generated/` so I can find them without guessing.

### US-3 — Configurable output directory
> As a project maintainer, I want to override the default output directory in `project.config.json` so that my project's structure is respected without changing engine code.

### US-4 — Backward-compatible transition
> As an operator running the heartbeat, I want the engine to automatically create the target directory if it doesn't exist, so there are no manual migration steps required.

---

## Requirements

### R-1: Output directory change in `generate-project-docs.js`
- All four write targets must be moved from `PROJECT_DIR` root to the configured output directory.
- Files affected: `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md`.
- Default output path: `<PROJECT_DIR>/docs/auto-generated/`.
- The directory must be created with `fs.mkdirSync(..., { recursive: true })` if absent.

### R-2: Configurable path via `project.config.json`
Add an optional `docs` section to `project.config.json`:

```json
{
  "docs": {
    "auto_generated_dir": "docs/auto-generated"
  }
}
```

- If `docs.auto_generated_dir` is present, it is resolved relative to `project_dir`.
- If absent, the engine falls back to `docs/auto-generated`.
- The `project-config-loader.js` must expose a helper (or the value via `getConfig()`) so callers can retrieve the resolved path without duplicating logic.

### R-3: Update all consumers that reference generated file paths
- `heartbeat-executor.js`: any code that reads or paths to `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, or `JOURNEYS.md` must be updated to use the configured output directory.
- `heartbeat-wrapper.js`: same as above if applicable.
- Any other scripts in `~/.openclaw/genome/` that directly reference these filenames at the project root must be updated.

### R-4: HEADER comment update
- The `HEADER` constant in `generate-project-docs.js` that reads `<!-- AUTO-GENERATED — DO NOT EDIT. Regenerated every heartbeat from Supabase. -->` must remain intact (or be improved to include the regeneration path for traceability).

### R-5: No breaking changes to file content
- The *content* and *format* of the generated markdown files must be identical before and after this change. Only the write path changes.

---

## Acceptance Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| AC-1 | `docs/auto-generated/` directory is created when it does not exist | Delete the directory, run `node scripts/generate-project-docs.js`, confirm directory and all four files appear |
| AC-2 | `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md` are written to `docs/auto-generated/` | After running the script, confirm files exist at the new path and are absent from repo root |
| AC-3 | Repo root no longer contains `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `JOURNEYS.md` | `ls ~/projects/leadflow/*.md` does not include these four files |
| AC-4 | `project.config.json` with `docs.auto_generated_dir: "docs/custom-gen"` causes files to be written to that directory | Add the config key, run the script, verify files appear at `docs/custom-gen/` |
| AC-5 | Heartbeat runs successfully end-to-end without errors | Run one heartbeat cycle, confirm no file-not-found or path errors in output |
| AC-6 | File content is unchanged (same markdown structure and data) | Diff output before and after refactor on identical Supabase data — zero content diffs |
| AC-7 | `docs/auto-generated/` is added to `.gitignore` (or documented as intentionally committed) | Confirm `.gitignore` entry exists OR a comment in CLAUDE.md explains the commit policy |

---

## Out of Scope

- Changes to the *content* of any generated file.
- Migration or deletion of existing root-level `.md` files (those are left for cleanup by a separate task or manual action).
- Changes to how Supabase data is fetched or structured.
- Any UI or product-facing changes.

---

## Affected Files (for Dev Agent)

| File | Location | Change |
|------|----------|--------|
| `generate-project-docs.js` | `~/.openclaw/genome/scripts/` | Change write targets to configurable output dir; create dir if missing |
| `heartbeat-executor.js` | `~/.openclaw/genome/core/` | Update any path references to generated files |
| `heartbeat-wrapper.js` | `~/.openclaw/genome/core/` | Update any path references if applicable |
| `project-config-loader.js` | `~/.openclaw/genome/core/` | Expose `docs.auto_generated_dir` or helper |
| `project.config.json` | `~/projects/leadflow/` | Add `docs.auto_generated_dir` entry (default value) |

---

## Definition of Done

- [ ] All four generated files land in `docs/auto-generated/` (or configured path) after any heartbeat.
- [ ] No generated files written to repo root by default.
- [ ] Heartbeat completes without errors.
- [ ] `project.config.json` override works.
- [ ] Human (Stojan) can verify by running `node scripts/generate-project-docs.js` and checking the output location.
