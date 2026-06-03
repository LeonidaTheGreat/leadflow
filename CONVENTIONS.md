# LeadFlow Code Conventions

## Module Format
- CommonJS only: `module.exports = {}`, `require()`. Never ESM (`export`, `import`).
- `'use strict'` at top of every file (except Next.js React components which use `'use client'`).

## Architecture
- Services in `lib/services/`: one class per file, constructor injection, no singletons.
- Routes in `routes/`: Express router, thin handlers that delegate to services.
- Middleware in `lib/middleware/`: pure functions, no business logic.
- Tests in `tests/`: Jest, organized as `tests/unit/`, `tests/integration/`, `tests/e2e/`.

## Error Handling
- Services throw; routes catch and respond with appropriate HTTP status.
- No `console.log` in service files — use structured logger.
- Validate at API boundaries (request params, webhook payloads). Trust internal calls.

## Database
- Local PostgreSQL via TaskStore query builder. No raw SQL in route handlers.
- Migrations in `~/projects/genome/migrations/`. Never modify schema directly.

## Git
- Stage only changed files: `git add <file1> <file2>`. Never `git add -A`.
- Commit prefixes: `feat:`, `fix:`, `test:`, `docs:`.
- Never commit: DASHBOARD.md, USE_CASES.md, E2E_MAPPINGS.md, PRD_INDEX.md, JOURNEYS.md, project.config.json.

## Frontend (Next.js Dashboard)
- Components in `product/lead-response/dashboard/app/` or `components/`.
- Client components: `'use client'` directive at top.
- Tailwind CSS for styling. No inline styles except dynamic values.
- Verify build: `cd product/lead-response/dashboard && npx next build`.

## Files
- Max 1500 lines per file.
- Service files: PascalCase class name, kebab-case file (`LeadService` → `lead-service.js`).
- Test files: `<module>.test.js` in `tests/`.

## Naming
- Functions: camelCase. Classes: PascalCase. Files: kebab-case. Constants: UPPER_SNAKE.
- API routes: kebab-case paths (`/api/lead-response`, not `/api/leadResponse`).
- Database columns: snake_case.

## Quality Gates (non-negotiable)
Before marking any task as done, verify your work passes these gates:
- `npm run build` must exit 0 (root AND dashboard)
- `npm run lint` must produce 0 errors
- `npm test` must exit 0 (0 failures)
- `npm audit --audit-level=high` must show 0 high/critical
If any gate fails, fix it before completing. These are enforced by the genome's quality audit.

## Deployment
- Dashboard: `cd product/lead-response/dashboard && vercel --prod`
- Webhook API: `cd ~/projects/leadflow && vercel --prod`
- Never run `vercel link` — projects are already linked.
