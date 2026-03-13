# LeadFlow Project Structure

This document defines the organization and conventions for the LeadFlow repository.

## Directory Structure

```
leadflow/
├── agents/                 # Agent configuration files
├── agents.json            # Agent registry
├── ARCHITECTURE.md        # System architecture documentation
├── BOOTSTRAP.md           # Project bootstrap guide
├── CLAUDE.md              # Main project context (keep at root)
├── completion-reports/    # Task completion reports
├── config/                # Configuration files
│   ├── budget-tracker.json
│   ├── strategy-config.json
│   └── swarm-config.json
├── docs/                  # Documentation
│   ├── 4-LOOP-ARCHITECTURE.md
│   ├── design/            # Design documents
│   │   ├── DESIGN-FRICTIONLESS-ONBOARDING-001.md
│   │   ├── DESIGN-PRICING-SECTION-4-TIERS.md
│   │   └── ...
│   ├── guides/            # How-to guides and tutorials
│   ├── prd/               # Product Requirements Documents
│   │   ├── PRD-LANDING-PAGE.md
│   │   ├── PRD-CORE-SMS.md
│   │   └── ...
│   ├── reports/           # Analysis reports and summaries
│   └── api-design/        # API design documents
├── e2e/                   # End-to-end tests
├── email-sequence/        # Email sequence templates
├── frontend/              # Legacy frontend code
├── integrations/          # Third-party integrations
├── lib/                   # Shared libraries/utilities
├── node_modules/          # Node.js dependencies
├── orchestrator/          # Orchestrator-specific files
├── package.json           # Node.js dependencies manifest
├── package-lock.json      # Locked dependency versions
├── PMF.md                 # Product-Market Fit documentation
├── product/               # Product code
│   └── lead-response/
│       └── dashboard/     # Next.js dashboard application
├── project.config.json    # Project configuration
├── README.md              # Project readme
├── reports/               # Runtime reports (deprecated, use docs/reports)
├── routes/                # Express API routes
├── scripts/               # Utility scripts
│   ├── generate-project-docs.js
│   ├── shell/             # Shell scripts
│   │   ├── orchestrator-heartbeat-runner.sh
│   │   ├── run-simulation-test.sh
│   │   └── ...
│   └── utilities/         # JavaScript utilities
│       ├── auto-create-tables.js
│       ├── check-tables.js
│       └── ...
├── server.js              # Main application entry point
├── sql/                   # SQL migrations and schemas
├── supabase/              # Supabase-specific files
├── tests/                 # Test suites
│   ├── feat-*.test.js     # Feature tests
│   ├── fix-*.test.js      # Bug fix tests
│   └── integrated/        # Integrated/legacy tests
│       ├── billing-api-integration.test.js
│       └── ...
└── vercel.json            # Vercel deployment config
```

## File Organization Rules

### Root Level Files (Keep at Root)

These files must remain at the repository root:

- **CLAUDE.md** - Primary project context for AI agents
- **ARCHITECTURE.md** - System architecture overview
- **README.md** - Project introduction and setup
- **PMF.md** - Product-Market Fit strategy
- **server.js** - Main application entry point
- **package.json** - Node.js dependencies
- **project.config.json** - Project configuration
- **agents.json** - Agent registry
- **vercel.json** - Vercel deployment configuration

### Symlinks (Do Not Move)

These are symlinks to the Genome orchestration system:

- `task-store.js` → `~/.openclaw/genome/core/task-store.js`
- `project-config-loader.js` → `~/.openclaw/genome/core/project-config-loader.js`
- `subagent-completion-report.js` → `~/.openclaw/genome/core/subagent-completion-report.js`

### Scripts Organization

#### `scripts/` - Main Scripts Directory

Contains utility scripts organized by type:

- **Root level** - Primary orchestration and generation scripts
- **`scripts/shell/`** - Shell/bash scripts (.sh files)
- **`scripts/utilities/`** - JavaScript helper scripts

### Documentation Organization

#### `docs/` - Documentation Directory

- **`docs/prd/`** - Product Requirements Documents (PRD-*.md)
- **`docs/design/`** - Design specifications (DESIGN-*.md)
- **`docs/guides/`** - How-to guides and tutorials
- **`docs/reports/`** - Analysis reports and summaries
- **`docs/api-design/`** - API design documents

### Test Organization

#### `tests/` - Test Directory

- **Root level** - Feature and fix tests (feat-*.test.js, fix-*.test.js)
- **`tests/integrated/`** - Integration and E2E tests

### Config Organization

#### `config/` - Configuration Directory

Contains project configuration files:
- `budget-tracker.json`
- `strategy-config.json`
- `swarm-config.json`

## Naming Conventions

### Files

- **Scripts**: `kebab-case.js` or `kebab-case.sh`
- **Tests**: `feat-<feature-name>.test.js` or `fix-<bug-name>.test.js`
- **PRDs**: `PRD-<FEATURE-NAME>.md`
- **Design Docs**: `DESIGN-<FEATURE-NAME>.md`
- **SQL**: `descriptive-name.sql`

### Directories

- Use `kebab-case` for directory names
- Use plural names for collections (e.g., `scripts`, `tests`, `docs`)

## Adding New Files

When adding new files to the project:

1. **Scripts** → Place in `scripts/` (or `scripts/shell/` / `scripts/utilities/`)
2. **Documentation** → Place in appropriate `docs/` subdirectory
3. **Tests** → Place in `tests/` (feature tests at root, integration tests in `integrated/`)
4. **Configuration** → Place in `config/` if it's project config
5. **SQL** → Place in `sql/`

## Migration Notes

This structure was established during the repository restructuring initiative. Files were moved from the root level to appropriate subdirectories to improve organization and maintainability.

### Key Moves

- Root utility `.js` files → `scripts/utilities/`
- Root `.sh` files → `scripts/shell/`
- `docs/PRD-*.md` → `docs/prd/`
- `test/` contents → `tests/integrated/`
- Root config `.json` files → `config/` (where appropriate)

## Verification

To verify the structure is correct:

1. Check that `server.js` is at root
2. Check that symlinks resolve correctly
3. Run `npm test` to ensure tests pass
4. Verify Vercel deployment works
