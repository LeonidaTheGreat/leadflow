'use strict'

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DASHBOARD_API_ROOT = path.join(ROOT, 'product/lead-response/dashboard/app/api')
const EXPRESS_ROUTES_ROOT = path.join(ROOT, 'routes')

const TARGET_PREFIXES = ['/api/debug/', '/api/admin/', '/api/smoke/', '/api/internal/']
const FAIL_PREFIXES = ['/api/debug/', '/api/admin/']

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
      continue
    }
    out.push(full)
  }
  return out
}

function isTargetPath(routePath) {
  return TARGET_PREFIXES.some(prefix => routePath.startsWith(prefix))
}

function normalizeDashboardRoutePath(filePath) {
  const rel = path.relative(path.join(ROOT, 'product/lead-response/dashboard/app'), filePath)
  if (!rel.startsWith('api/')) return null
  const routePath = `/${rel.replace(/\\/g, '/').replace(/\/route\.ts$/, '')}`
  return routePath
}

function nextRouteFileAuthStatus(content) {
  const checks = [
    'requirePrivilegedRouteAuth(',
    'isAdminUser(',
    'await auth(',
    "headers.get('authorization')",
    'headers.get("authorization")',
    "headers.get('x-admin-token')",
    'headers.get("x-admin-token")',
    'isAdmin(',
    'isAuthorized(',
  ]

  return checks.some(check => content.includes(check))
}

function extractNextRouteMethods(content) {
  const methods = []
  const regex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g
  let match
  while ((match = regex.exec(content)) !== null) {
    methods.push(match[1])
  }
  return methods.length > 0 ? methods : ['GET']
}

function extractExpressRouteRows(filePath, content) {
  const rows = []
  const regex = /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]\s*,\s*([\s\S]*?)\)\s*;/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const method = match[1].toUpperCase()
    const routePath = match[2]
    const handlerSegment = match[3]

    if (!isTargetPath(routePath)) continue

    const protectedRoute = [
      'requireApiKey',
      'requireCronSecret',
      'requireAuth',
      'requireAdmin',
    ].some(token => handlerSegment.includes(token))

    rows.push({
      file: path.relative(ROOT, filePath),
      method,
      routePath,
      protectedRoute,
    })
  }

  return rows
}

function collectDashboardRows() {
  const files = walk(DASHBOARD_API_ROOT)
    .filter(file => /\/route\.ts$/.test(file))

  const rows = []
  for (const filePath of files) {
    const routePath = normalizeDashboardRoutePath(filePath)
    if (!routePath || !isTargetPath(routePath.endsWith('/') ? routePath : `${routePath}/`)) {
      continue
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const protectedRoute = nextRouteFileAuthStatus(content)
    const methods = extractNextRouteMethods(content)

    for (const method of methods) {
      rows.push({
        file: path.relative(ROOT, filePath),
        method,
        routePath,
        protectedRoute,
      })
    }
  }

  return rows
}

function collectExpressRows() {
  const files = walk(EXPRESS_ROUTES_ROOT)
    .filter(file => /\.js$/.test(file))

  return files.flatMap(filePath => {
    const content = fs.readFileSync(filePath, 'utf8')
    return extractExpressRouteRows(filePath, content)
  })
}

function actionNeeded(row) {
  if (row.protectedRoute) return 'none'
  if (row.routePath.startsWith('/api/debug/') || row.routePath.startsWith('/api/admin/')) {
    return 'HARDEN: add auth middleware/guard'
  }
  return 'Review and harden if externally reachable'
}

function printTable(rows) {
  console.log('route path | auth status | action needed | method | file')
  console.log('---|---|---|---|---')

  const sorted = [...rows].sort((a, b) => {
    if (a.routePath !== b.routePath) return a.routePath.localeCompare(b.routePath)
    if (a.method !== b.method) return a.method.localeCompare(b.method)
    return a.file.localeCompare(b.file)
  })

  for (const row of sorted) {
    console.log(
      `${row.routePath} | ${row.protectedRoute ? 'protected' : 'unprotected'} | ${actionNeeded(row)} | ${row.method} | ${row.file}`
    )
  }
}

function main() {
  const rows = [...collectExpressRows(), ...collectDashboardRows()]

  printTable(rows)

  const failing = rows.filter(row => {
    return !row.protectedRoute && FAIL_PREFIXES.some(prefix => row.routePath.startsWith(prefix))
  })

  if (failing.length > 0) {
    console.error(`\nFAIL: found ${failing.length} unprotected debug/admin route(s).`)
    process.exit(1)
  }

  console.log('\nPASS: no unprotected /api/debug/* or /api/admin/* routes found.')
}

main()
