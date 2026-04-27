'use strict'

/**
 * Audit script: verify all /api/debug/* and /api/admin/* routes are protected.
 *
 * Debug routes must use requirePrivilegedRouteAuth.
 * Admin routes may use any of the recognised auth patterns.
 *
 * Exit 0 when all routes are protected. Exit 1 (with a list) when any are not.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.resolve(
  __dirname,
  '../product/lead-response/dashboard'
)

const DEBUG_DIR = path.join(DASHBOARD_ROOT, 'app/api/debug')
const ADMIN_DIR = path.join(DASHBOARD_ROOT, 'app/api/admin')

const ADMIN_AUTH_PATTERNS = [
  'requirePrivilegedRouteAuth(',
  'isAdminUser(',
  'await auth(',
  "headers.get('authorization')",
  'headers.get("authorization")',
  "headers.get('x-admin-token')",
  'headers.get("x-admin-token")',
  'isAdmin(',
  'isAuthorized(',
  'verifyAdminAuth(',
  'requireAdmin',
]

function walkRouteFiles(dir) {
  const files = []
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkRouteFiles(full))
    else if (entry.name === 'route.ts') files.push(full)
  }
  return files
}

function nextRouteFileAuthStatus(filePath, authPatterns) {
  const content = fs.readFileSync(filePath, 'utf8')
  const hasExport = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/.test(content)
  if (!hasExport) return 'no_handlers'
  const protected_ = authPatterns.some(p => content.includes(p))
  return protected_ ? 'protected' : 'unprotected'
}

const unprotected = []

for (const file of walkRouteFiles(DEBUG_DIR)) {
  if (nextRouteFileAuthStatus(file, ['requirePrivilegedRouteAuth(']) === 'unprotected') {
    unprotected.push(path.relative(DASHBOARD_ROOT, file))
  }
}

for (const file of walkRouteFiles(ADMIN_DIR)) {
  if (nextRouteFileAuthStatus(file, ADMIN_AUTH_PATTERNS) === 'unprotected') {
    unprotected.push(path.relative(DASHBOARD_ROOT, file))
  }
}

if (unprotected.length > 0) {
  console.log('FAIL: unprotected routes found:')
  for (const r of unprotected) {
    console.log(`  - ${r}`)
  }
  process.exit(1)
}

console.log('PASS: no unprotected /api/debug/* or /api/admin/* routes found.')
