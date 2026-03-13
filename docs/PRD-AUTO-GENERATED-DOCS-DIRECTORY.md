# PRD: Auto-Generated Docs Directory Convention

**ID:** feat-auto-generated-docs-directory  
**Status:** proposed  
**Created:** 2026-03-13  
**Priority:** medium  
**Type:** Infrastructure / Genome-level  

---

## Executive Summary

Currently, the Genome orchestration engine writes auto-generated documentation files (USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, DASHBOARD.md, JOURNEYS.md, ORCHESTRATOR-HEARTBEAT-LOG.md) to the project repository root directory. This causes clutter and mixing of auto-generated files with hand-authored documentation.

This PRD introduces a standard directory convention (`docs/auto-generated/`) for all auto-generated files and makes the output path configurable per project via `project.config.json`.

---

## Problem Statement

**Current State:**
- Auto-generated markdown files scatter across project root: `USE_CASES.md`, `E2E_MAPPINGS.md`, `PRD_INDEX.md`, `DASHBOARD.md`, `JOURNEYS.md`, `ORCHESTRATOR-HEARTBEAT-LOG.md`
- Completion reports directory (`completion-reports/`) also sits at repo root
- Projects have no way to customize where these files go
- Reference docs in `project.config.json` must hardcode these locations
- Makes `.gitignore` harder to maintain and visual clutter in repo root

**Impact:**
- Projects wanting a cleaner root structure have no option
- Future tooling that needs to locate these files must hardcode multiple possible paths
- Inconsistent conventions across projects (if manual workarounds are attempted)

---

## Proposed Solution

### 1. Add `docs` Configuration Section to `project.config.json`

Projects can now optionally define:
```json
{
  "docs": {
    "auto_generated_dir": "docs/auto-generated",
    "completion_reports_dir": "completion-reports"
  }
}
```

**Defaults:**
- `auto_generated_dir`: `"docs/auto-generated"`  
- `completion_reports_dir`: `"completion-reports"`  

This is **backward compatible**: if the `docs` section is absent, the engine uses defaults. Existing projects see no change in behavior.

### 2. Update `generate-project-docs.js`

Modify to:
- Read `docs.auto_generated_dir` from project config (default: `"docs/auto-generated"`)
- Write all auto-generated markdown files to that directory instead of project root
- Create the directory if it doesn't exist
- Continue to use `fs.writeFileSync()` and standard Node APIs (no build-specific dependencies)

**Files affected:**
- `USE_CASES.md` → `docs/auto-generated/USE_CASES.md`  
- `E2E_MAPPINGS.md` → `docs/auto-generated/E2E_MAPPINGS.md`  
- `PRD_INDEX.md` → `docs/auto-generated/PRD_INDEX.md`  
- `DASHBOARD.md` → `docs/auto-generated/DASHBOARD.md`  
- `JOURNEYS.md` → `docs/auto-generated/JOURNEYS.md`  
- `ORCHESTRATOR-HEARTBEAT-LOG.md` → `docs/auto-generated/ORCHESTRATOR-HEARTBEAT-LOG.md`  

### 3. Update `heartbeat-executor.js`

Update the `HEARTBEAT_LOG_PATH` constant to:
```javascript
const { getConfig } = require('./project-config-loader')
const config = getConfig()
const autoGenDir = config.docs?.auto_generated_dir || 'docs/auto-generated'
const HEARTBEAT_LOG_PATH = path.resolve(PROJECT_DIR, autoGenDir, 'ORCHESTRATOR-HEARTBEAT-LOG.md')
```

This ensures the heartbeat log writes to the correct auto-generated directory.

### 4. Update `completion-report.js`

Modify `subagent-completion-report.js` to:
- Read `docs.completion_reports_dir` from project config (default: `"completion-reports"`)
- Write completion reports to that directory
- Create the directory if it doesn't exist

### 5. Update Reference Docs in `project.config.json`

The `reference_docs` section may continue to reference these files by their logical names (e.g., `"use_cases": "USE_CASES.md"`), but tooling must resolve the full path considering the configured `docs` section.

**Recommendation:** Agents reading these files should use `resolveProjectPath()` or similar utilities that respect the config-defined location.

---

## Acceptance Criteria

### Code Changes (Dev/QC Responsibility)

1. **project-config-loader.js**
   - [ ] Exports a utility function `getDocsPath(docName)` that returns the full path to an auto-generated doc, respecting `config.docs.auto_generated_dir`
   - [ ] Example: `getDocsPath('USE_CASES.md')` returns `/path/to/project/docs/auto-generated/USE_CASES.md`
   - [ ] Defaults to `docs/auto-generated/` if config section missing

2. **generate-project-docs.js**
   - [ ] Reads `config.docs.auto_generated_dir` from project config
   - [ ] Creates the directory if it doesn't exist: `fs.mkdirSync(path, { recursive: true })`
   - [ ] All six auto-generated markdown files write to the configured directory
   - [ ] Script remains callable as: `node scripts/generate-project-docs.js`
   - [ ] Logs confirm correct output directory: `✅ USE_CASES.md generated to docs/auto-generated/ (N use cases)`

3. **heartbeat-executor.js**
   - [ ] Updates `HEARTBEAT_LOG_PATH` to use `getDocsPath()` or equivalent
   - [ ] Heartbeat log writes to `docs/auto-generated/ORCHESTRATOR-HEARTBEAT-LOG.md` by default
   - [ ] Respects custom `config.docs.auto_generated_dir` if provided

4. **subagent-completion-report.js**
   - [ ] Reads `config.docs.completion_reports_dir` from project config (default: `"completion-reports"`)
   - [ ] Creates the directory if it doesn't exist
   - [ ] Completion reports write to that directory
   - [ ] Report filename remains consistent: `COMPLETION-<task-id>-<timestamp>.json`

5. **Config Loader**
   - [ ] All uses of `PROJECT_DIR` to locate auto-generated files now use `getDocsPath()` or equivalent
   - [ ] No hardcoded paths like `path.join(PROJECT_DIR, 'USE_CASES.md')` for auto-generated files
   - [ ] Search and replace scan for any remaining hardcoded references

### Configuration Changes

6. **project.config.json (all projects)**
   - [ ] (Optional) Projects can add a `docs` section with `auto_generated_dir` and/or `completion_reports_dir`
   - [ ] Existing projects without this section continue to work (defaults apply)
   - [ ] LeadFlow project's `project.config.json` remains valid without modifications (backward compatible)

### Documentation & Examples

7. **project.config.json Schema Documentation**
   - [ ] In `~/.openclaw/genome/docs/CONFIG_SCHEMA.md` or `project-config.md`, document the new `docs` section
   - [ ] Provide example configurations
   - [ ] Clarify defaults

8. **Genome README / Docs**
   - [ ] Update any docs that mention auto-generated file locations to reference the new convention

### Testing & Verification

9. **Integration Testing**
   - [ ] Run heartbeat on LeadFlow project → verify files appear in `docs/auto-generated/`
   - [ ] Add custom config to test project → verify respects custom path
   - [ ] Verify completion reports write to configured directory
   - [ ] Manual smoke test: `grep -r "USE_CASES" /path/to/project/` finds file in correct location

10. **Backward Compatibility**
    - [ ] Projects without `docs` section in config still work (use defaults)
    - [ ] No breaking changes to public APIs or agent workflows

---

## Workflow & Timeline

**Typical Workflow:**
1. **Product** (this task): Write specification and UC
2. **Dev**: Implement changes to `generate-project-docs.js`, `heartbeat-executor.js`, `subagent-completion-report.js`, and config loaders
3. **QC**: Verify files generate to correct location, backward compatibility, and edge cases
4. **All Projects**: Once merged, auto-generated docs appear in `docs/auto-generated/` on next heartbeat

**Scope:** Genome-level change, affects all projects, but backward compatible (no action required for existing projects).

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Breaking existing references to root-level files | Backward compatibility: defaults preserve current behavior. New convention only applies if opted-in. |
| Agents hardcode file paths | Provide `getDocsPath()` utility; encourage use of project-config-loader utilities |
| Incomplete migration of references | Code review must find all hardcoded references to auto-generated files; update all found references |
| Directory creation failures | Use `fs.mkdirSync(..., { recursive: true })` with error handling |

---

## Success Metrics

- ✅ Auto-generated docs write to `docs/auto-generated/` by default  
- ✅ Completion reports write to `completion-reports/` by default  
- ✅ Heartbeat log respects configured paths  
- ✅ Backward compatibility verified (projects without `docs` config still work)  
- ✅ LeadFlow heartbeat completes successfully after merge  
- ✅ All auto-generated files appear in correct location on next heartbeat run  

---

## Related Issues / References

- Genome: `generate-project-docs.js`  
- Genome: `heartbeat-executor.js`  
- Genome: `subagent-completion-report.js`  
- Genome: `project-config-loader.js`  
