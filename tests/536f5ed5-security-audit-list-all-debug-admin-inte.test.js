'use strict'

/**
 * E2E test: Security audit — all /api/debug and /api/admin routes must be protected.
 * Task: 536f5ed5-baae-418c-9220-8a99ff9cbd2f
 *
 * Tests:
 * 1. check-debug-routes.js exits 0 (no unprotected admin/debug routes)
 * 2. Each patched route file contains requirePrivilegedRouteAuth
 * 3. privileged-route-auth.ts uses crypto.timingSafeEqual (constant-time comparison)
 * 4. safeEqual guards against empty-string bypass
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const DASHBOARD_ROOT = path.join(ROOT, 'product/lead-response/dashboard')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`)
    failed++
  }
}

// 1. Audit script passes
console.log('\n[1] Route audit script')
test('check-debug-routes.js exits 0', () => {
  const script = path.join(ROOT, 'scripts/check-debug-routes.js')
  assert.ok(fs.existsSync(script), 'check-debug-routes.js must exist at scripts/')
  const output = execSync(`node ${script}`, { encoding: 'utf8' })
  assert.ok(
    output.includes('PASS: no unprotected /api/debug/* or /api/admin/* routes found.'),
    `Expected PASS in output, got:\n${output}`
  )
})

// 2. All targeted routes contain the auth guard
console.log('\n[2] Route files contain requirePrivilegedRouteAuth')
const targetedRoutes = [
  'app/api/debug/ai-config/route.ts',
  'app/api/debug/env/route.ts',
  'app/api/debug/fub-test/route.ts',
  'app/api/debug/test-formdata/route.ts',
  'app/api/debug/test-fub-flow/route.ts',
  'app/api/debug/test-full-flow/route.ts',
  'app/api/debug/test-twilio-flow/route.ts',
  'app/api/debug/twilio-raw/route.ts',
  'app/api/admin/conversations/route.ts',
  'app/api/admin/demo-link/route.ts',
  'app/api/admin/pilot-campaigns/route.ts',
  'app/api/admin/pilot-campaigns/[id]/stats/route.ts',
  'app/api/admin/pilot-campaigns/[id]/targets/route.ts',
  'app/api/admin/pilot-signups/invite/route.ts',
  'app/api/admin/pilot-targets/[id]/route.ts',
  'app/api/admin/simulate-lead/route.ts',
  'app/api/smoke/stripe-checkout-e2e/route.ts',
]

for (const rel of targetedRoutes) {
  test(`${rel} imports and calls requirePrivilegedRouteAuth`, () => {
    const fullPath = path.join(DASHBOARD_ROOT, rel)
    assert.ok(fs.existsSync(fullPath), `File not found: ${fullPath}`)
    const content = fs.readFileSync(fullPath, 'utf8')
    assert.ok(
      content.includes("from '@/lib/security/privileged-route-auth'"),
      'Missing import of requirePrivilegedRouteAuth'
    )
    assert.ok(
      content.includes('requirePrivilegedRouteAuth(request)'),
      'Missing call to requirePrivilegedRouteAuth(request)'
    )
    assert.ok(
      content.includes('if (unauthorized) return unauthorized'),
      'Missing early-return guard'
    )
  })
}

// 3. Security module uses timingSafeEqual and handles empty strings
console.log('\n[3] privileged-route-auth.ts security properties')
const authFile = path.join(DASHBOARD_ROOT, 'lib/security/privileged-route-auth.ts')

test('privileged-route-auth.ts exists', () => {
  assert.ok(fs.existsSync(authFile), 'privileged-route-auth.ts must exist')
})

test('uses crypto.timingSafeEqual', () => {
  const content = fs.readFileSync(authFile, 'utf8')
  assert.ok(content.includes('timingSafeEqual'), 'Must use crypto.timingSafeEqual for token comparison')
})

test('guards against empty-string bypass in safeEqual', () => {
  const content = fs.readFileSync(authFile, 'utf8')
  // Must reject empty/falsy values before comparison
  assert.ok(
    content.includes('if (!a || !b) return false'),
    'safeEqual must reject empty strings — otherwise empty-env tokens auto-match'
  )
})

test('exports requirePrivilegedRouteAuth', () => {
  const content = fs.readFileSync(authFile, 'utf8')
  assert.ok(
    content.includes('export async function requirePrivilegedRouteAuth'),
    'Must export requirePrivilegedRouteAuth'
  )
})

test('returns null on success, NextResponse on failure', () => {
  const content = fs.readFileSync(authFile, 'utf8')
  assert.ok(content.includes('return null'), 'Must return null when auth passes')
  assert.ok(
    content.includes("NextResponse.json({ error: 'Unauthorized' }, { status: 401 })"),
    "Must return 401 NextResponse when auth fails"
  )
})

// 4. No remaining unprotected exports in any debug/admin file
console.log('\n[4] No unprotected handler exports (belt-and-suspenders check)')
test('no export async function without auth in any debug/ route file', () => {
  const debugDir = path.join(DASHBOARD_ROOT, 'app/api/debug')
  const routeFiles = []
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name === 'route.ts') routeFiles.push(full)
    }
  }
  walk(debugDir)
  for (const f of routeFiles) {
    const content = fs.readFileSync(f, 'utf8')
    assert.ok(
      content.includes('requirePrivilegedRouteAuth'),
      `Unprotected debug route file: ${path.relative(ROOT, f)}`
    )
  }
})

test('no export async function without auth in any admin/ route file', () => {
  // Uses the same detection heuristics as check-debug-routes.js nextRouteFileAuthStatus()
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
  const adminDir = path.join(DASHBOARD_ROOT, 'app/api/admin')
  const routeFiles = []
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name === 'route.ts') routeFiles.push(full)
    }
  }
  walk(adminDir)
  for (const f of routeFiles) {
    const rel = path.relative(ROOT, f)
    const content = fs.readFileSync(f, 'utf8')
    const hasExport = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/.test(content)
    if (!hasExport) continue
    const isProtected = AUTH_CHECKS.some(check => content.includes(check))
    assert.ok(isProtected, `Unprotected admin route file: ${rel}`)
  }
})

// Summary
console.log(`\n${'='.repeat(50)}`)
console.log(`RESULT: ${passed} passed, ${failed} failed`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
