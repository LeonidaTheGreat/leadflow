# LeadFlow — Project Structure

## Overview
This document describes the canonical directory structure for the LeadFlow repository.
Files are organized by purpose so they are predictable, discoverable, and safe to operate in CI/CD and local workflows.

## Root-Level Files (Keep Here)
| File | Purpose |
|------|---------|
| `server.js` | Main application entry point |
| `CLAUDE.md` | Project context for AI agents |
| `ARCHITECTURE.md` | System architecture overview |
| `README.md` | Project introduction |
| `PMF.md` | Pricing, ICP, GTM strategy |
| `package.json` | Node.js dependencies and scripts |
| `vercel.json` | Vercel deployment config |
| `project.config.json` | Genome orchestration identity card |
| `task-store.js` | Symlink → `~/.openclaw/genome/core/task-store.js` |
| `project-config-loader.js` | Symlink → `~/.openclaw/genome/core/project-config-loader.js` |
| `subagent-completion-report.js` | Symlink → `~/.openclaw/genome/core/subagent-completion-report.js` |

## Directory Map

```
leadflow/
├── routes/          # Express API route handlers
├── lib/             # Shared business logic, utilities
├── integrations/    # External service integrations (FUB, Cal.com, Stripe, Twilio)
├── agents/          # Agent configs and prompts
├── product/         # Product-specific code
├── sql/             # SQL migration files and schema
├── supabase/        # Supabase-specific code
├── config/          # JSON configuration files
│   ├── budget-tracker.json
│   ├── strategy-config.json
│   └── swarm-config.json
├── scripts/         # Utility and operational scripts
│   ├── migrations/  # DB migration runners and table setup
│   ├── diagnostics/ # Diagnostic, self-test, and verification scripts
│   ├── simulation/  # Lead simulation scripts
│   └── one-off/     # One-time fix and cleanup scripts
├── tests/           # All test files
│   ├── e2e/         # End-to-end tests
│   ├── integration/ # Integration tests
│   └── unit/        # Unit tests
├── docs/            # All documentation
│   ├── prd/         # Product Requirements Documents (PRD-*.md)
│   ├── design/      # Design specs (DESIGN-*.md) and assets
│   ├── guides/      # How-to guides (STRIPE_*.md, CALCOM*.md, etc.)
│   └── reports/     # Completion reports, summaries, analyses
├── completion-reports/ # Agent task completion reports (auto-generated)
├── spawn-logs/      # Orchestration spawn logs
└── e2e/             # Legacy e2e test fixtures (Playwright)
```

## Naming Conventions

### Scripts (`scripts/`)
| Subdirectory | Contents |
|---|---|
| `migrations/` | DB migration scripts: `auto-create-tables.js`, `run-migration-*.js`, `setup-*-tables.js` |
| `diagnostics/` | Read-only diagnostic scripts: `check-*.js`, `verify-*.js`, `query-*.js`, `self-test*.js` |
| `simulation/` | Lead flow simulation scripts |
| `one-off/` | Scripts for one-time operations: `fix-*.js`, `reset-*.js`, `cleanup-*.js` |
| `scripts/*.sh` | Shell scripts for orchestration and deployment |

### Documentation (`docs/`)
| Subdirectory | Pattern | Examples |
|---|---|---|
| `prd/` | `PRD-*.md` | Product requirements docs |
| `design/` | `DESIGN-*.md` | Design specs and mockups |
| `guides/` | `STRIPE_*.md`, `CALCOM*.md`, `RESEND*.md`, `*_GUIDE.md`, `*_README.md` | Integration guides |
| `reports/` | `*COMPLETE*.md`, `PHASE*.md`, `*REPORT*.md`, `*SUMMARY*.md`, `*ANALYSIS*.md` | Completion reports and analyses |

### Tests (`tests/`)
| Subdirectory | Contents |
|---|---|
| `e2e/` | Full end-to-end tests against running system |
| `integration/` | Integration tests for APIs and services |
| `unit/` | Unit tests for individual functions |

## Config (`config/`)
Runtime JSON configuration files that are referenced by the application.
Do **not** put secrets here — use `.env` files.

## Symlinks (do not modify)
These three symlinks at the repo root link to the Genome orchestration core:
- `task-store.js`
- `project-config-loader.js`
- `subagent-completion-report.js`

They are managed by the Genome system and must remain intact.
