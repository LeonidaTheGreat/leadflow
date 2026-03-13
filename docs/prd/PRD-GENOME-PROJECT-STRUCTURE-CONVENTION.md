# PRD: Project Structure Convention System

**PRD ID:** genome-project-structure-convention  
**Status:** draft  
**Version:** 1.0  
**Target:** Genome Orchestration Engine  
**Related UC:** feat-genome-project-structure-convention

---

## 1. Objective

Establish a canonical project structure convention system that:
1. Defines a template for PROJECT_STRUCTURE.md at the Genome level
2. Injects project structure context into all agent spawn messages
3. Bootstraps new projects with PROJECT_STRUCTURE.md automatically
4. Ensures all agents respect the canonical directory layout

This system reduces cognitive load on agents, prevents files from being created in wrong locations, and ensures consistency across all orchestrated projects.

---

## 2. Problem Statement

Currently:
- Agents create files in inconsistent locations
- No central source of truth for "where things go"
- New projects start without structure guidance
- Agents must infer directory structure from CLAUDE.md or exploration
- File organization drifts over time as different agents add code

This leads to:
- Files scattered in wrong directories
- Duplicate utility files in multiple locations
- Inconsistent naming conventions
- Harder code reviews and maintenance
- Confusion for new agents joining a project

---

## 3. Solution Overview

Create a **template-based convention system** with four components:

1. **Template** (`~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md`)
   - Defines canonical directory structure
   - Includes placeholders for project-specific values
   - Establishes naming conventions

2. **Context Injection** (`buildRoleContext()` in workflow-engine.js)
   - Injects "Project Structure" section into dev, design, PM spawn messages
   - Tells agents where to read the structure doc
   - Reminds agents to follow conventions before creating files

3. **Bootstrap Integration** (`bootstrap-project.js`)
   - Creates PROJECT_STRUCTURE.md from template when registering new projects
   - Substitutes project-specific variables
   - Places file at project root

4. **Agent Rules** (workspace SOUL.md files)
   - All agent SOUL.md files include rule: "Always read PROJECT_STRUCTURE.md before creating files"
   - Makes structure awareness part of agent identity

---

## 4. User Stories

### US-1: Dev Agent Creating New Feature
As a dev agent, when I need to create a new API route, I want to know exactly where to place it (routes/ vs app/api/) so that I don't create files in the wrong location.

**Acceptance Criteria:**
- Spawn message includes Project Structure section
- Section references PROJECT_STRUCTURE.md path
- Section reminds me to read it before creating files

### US-2: New Project Bootstrap
As the orchestrator, when I register a new project, I want PROJECT_STRUCTURE.md to be created automatically from the template so that all agents working on it have clear structure guidance.

**Acceptance Criteria:**
- bootstrap-project.js creates PROJECT_STRUCTURE.md
- Template variables are substituted correctly
- File is placed at project root

### US-3: Design Agent Creating Components
As a design agent, when I create component specifications, I want to know the canonical component directory so that my specs align with where dev will implement them.

**Acceptance Criteria:**
- Design spawn message includes Project Structure section
- Section describes component directory conventions
- References PROJECT_STRUCTURE.md for details

### US-4: PM Agent Writing PRDs
As a PM agent, when I specify file paths in PRDs, I want to reference the canonical structure so that my specifications are accurate and actionable.

**Acceptance Criteria:**
- PM spawn message includes Project Structure section
- Section describes docs/ structure (prd/, design/, guides/)
- Reminds PM to specify canonical paths in requirements

---

## 5. Technical Requirements

### FR-1: Template File Location
Create template at `~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md`

**Content Requirements:**
- Overview section explaining the document
- Root-Level Files table (keep-at-root exceptions)
- Directory Map showing full tree structure
- Naming Conventions section with patterns per directory
- Placeholder syntax for project-specific values: `{{PROJECT_NAME}}`, `{{PROJECT_ID}}`

### FR-2: Context Injection in buildRoleContext()
Modify `buildRoleContext()` in `~/.openclaw/genome/core/workflow-engine.js`

For dev, design, and product agents, append to spawnRole:
```markdown
## Project Structure
Before creating any files, read `PROJECT_STRUCTURE.md` in the project root.
Key conventions:
- Routes/API handlers: `routes/` or `app/api/`
- Business logic: `lib/`
- Tests: `tests/{e2e,integration,unit}/`
- Documentation: `docs/{prd,design,guides,reports}/`
- Scripts: `scripts/{migrations,diagnostics,simulation,one-off}/`

Always place files in their canonical locations. If unsure, check PROJECT_STRUCTURE.md first.
```

### FR-3: Bootstrap Integration
Modify `~/.openclaw/genome/bootstrap/bootstrap-project.js`

When registering a new project:
1. Read template from `~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md`
2. Substitute variables:
   - `{{PROJECT_NAME}}` → project config `project_name`
   - `{{PROJECT_ID}}` → project config `project_id`
   - `{{PROJECT_DIR}}` → project config `project_dir`
3. Write result to `{project_dir}/PROJECT_STRUCTURE.md`
4. Add to git (if project is a git repo)

### FR-4: SOUL.md Updates
Update all workspace SOUL.md files at `~/.openclaw/workspace-*/SOUL.md`

Add to SOUL.md (in the "What You Don't Do" or "How You Work" section):
```markdown
## Project Structure Rule
Always read `PROJECT_STRUCTURE.md` in the project root before creating files.
Follow the canonical directory structure defined there.
If a location is ambiguous, ask rather than guess.
```

Affected workspaces:
- workspace-dev
- workspace-design
- workspace-product-manager
- workspace-qc
- workspace-marketing
- workspace-analytics

### FR-5: Template Variables
Template supports these substitution variables:

| Variable | Source | Example |
|----------|--------|---------|
| `{{PROJECT_NAME}}` | project.config.json `project_name` | LeadFlow AI |
| `{{PROJECT_ID}}` | project.config.json `project_id` | leadflow |
| `{{PROJECT_DIR}}` | project.config.json `project_dir` | /Users/clawdbot/projects/leadflow |
| `{{DATE_CREATED}}` | Current date | 2026-03-13 |

---

## 6. Acceptance Criteria

### AC-1: Template File Exists
- `~/.openclaw/genome/templates/PROJECT_STRUCTURE.template.md` exists
- File contains all required sections (Overview, Root-Level Files, Directory Map, Naming Conventions)
- File uses valid markdown

### AC-2: Context Injection Works
- Dev spawn messages include Project Structure section
- Design spawn messages include Project Structure section
- PM spawn messages include Project Structure section
- Section references PROJECT_STRUCTURE.md path

### AC-3: Bootstrap Creates Structure Doc
- New project registration creates PROJECT_STRUCTURE.md
- Template variables are substituted
- File is placed at project root
- Content is valid markdown

### AC-4: SOUL.md Files Updated
- All workspace SOUL.md files include PROJECT_STRUCTURE.md rule
- Rule is clear and actionable
- Rule appears in appropriate section (identity/how you work)

### AC-5: Existing Projects Unaffected
- Existing projects keep their current PROJECT_STRUCTURE.md
- No forced overwrite of existing files
- Template only used for new projects or explicit regeneration

---

## 7. Implementation Notes

### Template Structure
The template should be generic enough to work for any project type (Node.js, Python, multi-product, etc.) while providing clear guidance.

Key sections:
1. **Overview** — Purpose of the document
2. **Root-Level Files** — What must stay at root (symlinks, entry points, config)
3. **Directory Map** — Full tree with descriptions
4. **Naming Conventions** — Patterns per directory type
5. **Symlinks** — Document any orchestration symlinks

### Context Injection Placement
Add the Project Structure section at the end of spawnRole, after the role-specific instructions. This ensures it's fresh in the agent's mind before they start working.

### Bootstrap Timing
Create PROJECT_STRUCTURE.md early in bootstrap, after project.config.json is written but before any agents are spawned. This ensures the first agents see the structure doc.

---

## 8. Testing Strategy

### E2E Tests
1. **Template Existence** — Verify template file exists with required sections
2. **Context Injection** — Verify spawn messages include Project Structure section
3. **Bootstrap** — Register test project, verify PROJECT_STRUCTURE.md created
4. **SOUL.md** — Verify all workspace SOUL.md files include the rule

### Manual Verification
1. Spawn dev task → check spawn message includes Project Structure section
2. Spawn design task → check spawn message includes Project Structure section
3. Spawn PM task → check spawn message includes Project Structure section
4. Register new test project → verify PROJECT_STRUCTURE.md created correctly

---

## 9. Rollout Plan

1. **Phase 1:** Create template file and update workflow-engine.js
2. **Phase 2:** Update bootstrap-project.js
3. **Phase 3:** Update all workspace SOUL.md files
4. **Phase 4:** Test with new project registration
5. **Phase 5:** Verify context injection in spawn messages

---

## 10. Future Enhancements

- Per-project-type templates (Next.js, Express, Python, etc.)
- Auto-regeneration when template changes
- Validation that agents actually follow the structure
- Metrics on file placement accuracy

---

## 11. Related Documents

- `~/.openclaw/genome/ARCHITECTURE.md` — Genome architecture
- `~/.openclaw/genome/core/workflow-engine.js` — Context injection point
- `~/.openclaw/genome/bootstrap/bootstrap-project.js` — Bootstrap integration point
- `~/projects/leadflow/PROJECT_STRUCTURE.md` — Example output (LeadFlow-specific)
