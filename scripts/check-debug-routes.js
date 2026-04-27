'use strict'

/**
 * Audit script: verify all /api/debug/* and /api/admin/* routes are protected.
 * Exits 0 with PASS message when all routes have auth guards.
 * Exits 1 with FAIL details when any route is unprotected.
 */

const fs = require('fs')
const path = require('path')

const DASHBOARD_ROOT = path.join(__dirname, '..', 'product/lead-response/dashboard')

const AUTH_CHECKS = [
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

function walk(dir) {
  const results = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) results.push(...walk(fullPath))
      else if (entry.name === 'route.ts') results.push(fullPath)
    }
  } catch {
    // directory may not exist
  }
  return results
}

function nextRouteFileAuthStatus(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const hasExport = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/.test(content)
  if (!hasExport) return { protected: true, reason: 'no exported handlers' }
  const isProtected = AUTH_CHECKS.some((check) => content.includes(check))
  return { protected: isProtected, reason: isProtected ? 'auth found' : 'no auth guard' }
}

let failures = 0

// Check all debug routes
const debugDir = path.join(DASHBOARD_ROOT, 'app/api/debug')
const debugRoutes = walk(debugDir)
for (const f of debugRoutes) {
  const content = fs.readFileSync(f, 'utf8')
  if (!content.includes('requirePrivilegedRouteAuth')) {
    console.error(`FAIL: Unprotected debug route: ${path.relative(DASHBOARD_ROOT, f)}`)
    failures++
  }
}

// Check all admin routes
const adminDir = path.join(DASHBOARD_ROOT, 'app/api/admin')
const adminRoutes = walk(adminDir)
for (const f of adminRoutes) {
  const { protected: isProtected, reason } = nextRouteFileAuthStatus(f)
  if (!isProtected) {
    console.error(`FAIL: Unprotected admin route: ${path.relative(DASHBOARD_ROOT, f)} (${reason})`)
    failures++
  }
}

if (failures === 0) {
  console.log('PASS: no unprotected /api/debug/* or /api/admin/* routes found.')
  process.exit(0)
} else {
  console.error(`FAIL: ${failures} unprotected route(s) found.`)
  process.exit(1)
}
