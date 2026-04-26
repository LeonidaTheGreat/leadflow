'use strict'

/*
Task Spec (f5ead7ff-a668-4628-bac6-20d40e511899)
What:
- Add /Users/clawdbot/projects/leadflow/scripts/no-direct-db.js with a route-layer guard that scans backend route files and fails if database-style `.from()` calls are present.
- Update /Users/clawdbot/projects/leadflow/package.json scripts to expose `npm run no_direct_db`.

Verify:
- Run `npm run no_direct_db` and expect exit code 0 plus a pass message when no backend route violations exist.
- Run `node ~/.openclaw/genome/scripts/quality-audit.js /Users/clawdbot/projects/leadflow --json` and confirm the current no_direct_db failure source is dashboard `app/api` files, while backend routes remain clean.
- Run project quality gates: `npm run build`, `npm run lint`, `npm test`, `npm audit --audit-level=high` and expect success.

Boundaries:
- Do not refactor dashboard API route implementations in `product/lead-response/dashboard/app/api`.
- Do not modify database schema, migrations, or business logic services/routes.
- Do not alter unrelated scripts or generated documentation files.
*/

const fs = require('fs')
const path = require('path')

const projectDir = path.resolve(__dirname, '..')
const routeDirs = [
  path.join(projectDir, 'routes'),
  path.join(projectDir, 'app', 'api')
]

const routeFilePattern = /\.(js|ts|tsx)$/

function listRouteFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
        continue
      }
      if (routeFilePattern.test(entry.name)) {
        files.push(fullPath)
      }
    }
  }

  walk(dir)
  return files
}

function countDirectDbFromCalls(content) {
  const callPattern = /([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*from\s*\(/g
  let match
  let count = 0

  while ((match = callPattern.exec(content)) !== null) {
    const target = match[1].replace(/\s+/g, '')
    if (/(^|\.)(db|supabase)(\.|$)/i.test(target)) {
      count += 1
    }
  }

  return count
}

const violations = []

for (const dir of routeDirs) {
  for (const filePath of listRouteFiles(dir)) {
    const content = fs.readFileSync(filePath, 'utf8')
    const matches = countDirectDbFromCalls(content)
    if (matches > 0) {
      violations.push(`${path.relative(projectDir, filePath)}: ${matches} direct DB .from() calls`)
    }
  }
}

if (violations.length > 0) {
  console.error(`${violations.length} route files with direct .from() calls`)
  for (const violation of violations) {
    console.error(violation)
  }
  process.exit(1)
}

console.log('PASS no_direct_db: no direct database .from() calls in backend route handlers')
