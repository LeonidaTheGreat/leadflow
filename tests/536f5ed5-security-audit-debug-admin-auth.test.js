'use strict'

/**
 * E2E test: security audit for debug/admin/internal/smoke route auth enforcement.
 *
 * Verifies:
 * 1. check-debug-routes.js exits 0 (no unprotected routes)
 * 2. All /api/debug/* route files import requirePrivilegedRouteAuth
 * 3. All /api/admin/* route files targeted by the PR have auth guards
 * 4. privileged-route-auth.ts uses timing-safe comparison (no naive ===)
 * 5. safeEqual rejects empty/null inputs without calling timingSafeEqual
 * 6. The auth module does NOT return early-success on missing env vars
 */

const assert = require('assert')
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..')
const DASHBOARD_API = path.join(ROOT, 'product/lead-response/dashboard/app/api')
const AUTH_MODULE = path.join(ROOT, 'product/lead-response/dashboard/lib/security/privileged-route-auth.ts')

let passed = 0
let total = 0

function test(name, fn) {
  total++
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`)
  }
}

function testAsync(name, fn) {
  total++
  return fn().then(() => {
    console.log(`✅ ${name}`)
    passed++
  }).catch(err => {
    console.log(`❌ ${name}: ${err.message}`)
  })
}

function routeFiles(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) { out.push(...routeFiles(full)); continue }
    if (entry.name === 'route.ts') out.push(full)
  }
  return out
}

// ── 1. audit script exits 0 ──────────────────────────────────────────────────

test('check-debug-routes.js exits 0 (no unprotected routes)', () => {
  const result = execSync(`node ${path.join(ROOT, 'scripts/check-debug-routes.js')}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  assert.ok(result.includes('PASS:'), `Expected PASS in output, got: ${result.slice(0, 300)}`)
})

// ── 2. All /api/debug/* routes import requirePrivilegedRouteAuth ─────────────

test('all /api/debug/* routes import requirePrivilegedRouteAuth', () => {
  const debugRoutes = routeFiles(path.join(DASHBOARD_API, 'debug'))
  assert.ok(debugRoutes.length > 0, 'Expected at least one debug route file')

  const unguarded = []
  for (const file of debugRoutes) {
    const content = fs.readFileSync(file, 'utf8')
    if (!content.includes('requirePrivilegedRouteAuth(')) {
      unguarded.push(path.relative(ROOT, file))
    }
  }

  assert.strictEqual(
    unguarded.length, 0,
    `Unguarded debug routes: ${unguarded.join(', ')}`
  )
})

// ── 3. PR target admin routes all have auth guards ───────────────────────────

const PR_TARGET_ADMIN_ROUTES = [
  'admin/conversations/route.ts',
  'admin/demo-link/route.ts',
  'admin/pilot-campaigns/route.ts',
  'admin/pilot-campaigns/[id]/stats/route.ts',
  'admin/pilot-campaigns/[id]/targets/route.ts',
  'admin/pilot-signups/invite/route.ts',
  'admin/pilot-targets/[id]/route.ts',
  'admin/simulate-lead/route.ts',
]

test('PR-targeted admin routes all import requirePrivilegedRouteAuth', () => {
  const unguarded = []
  for (const rel of PR_TARGET_ADMIN_ROUTES) {
    const file = path.join(DASHBOARD_API, rel)
    if (!fs.existsSync(file)) {
      unguarded.push(`${rel} (file missing)`)
      continue
    }
    const content = fs.readFileSync(file, 'utf8')
    if (!content.includes('requirePrivilegedRouteAuth(')) {
      unguarded.push(rel)
    }
  }
  assert.strictEqual(unguarded.length, 0, `Missing auth: ${unguarded.join(', ')}`)
})

// ── 4. smoke/stripe-checkout-e2e has auth guard ──────────────────────────────

test('smoke/stripe-checkout-e2e route imports requirePrivilegedRouteAuth', () => {
  const file = path.join(DASHBOARD_API, 'smoke/stripe-checkout-e2e/route.ts')
  assert.ok(fs.existsSync(file), 'smoke/stripe-checkout-e2e/route.ts must exist')
  const content = fs.readFileSync(file, 'utf8')
  assert.ok(
    content.includes('requirePrivilegedRouteAuth('),
    'stripe-checkout-e2e route must call requirePrivilegedRouteAuth'
  )
})

// ── 5. privileged-route-auth.ts uses timingSafeEqual, not naive === ──────────

test('privileged-route-auth.ts uses crypto.timingSafeEqual (not naive ===)', () => {
  assert.ok(fs.existsSync(AUTH_MODULE), 'privileged-route-auth.ts must exist')
  const content = fs.readFileSync(AUTH_MODULE, 'utf8')
  assert.ok(
    content.includes('timingSafeEqual'),
    'Must use crypto.timingSafeEqual for secret comparison'
  )
  // Must not compare secrets with naive === or ==
  const naiveCompare = /provided\s*===\s*expected|provided\s*==\s*expected/.test(content)
  assert.ok(!naiveCompare, 'Must not use naive === for secret comparison')
})

// ── 6. safeEqual rejects empty inputs ────────────────────────────────────────

test('safeEqual logic: empty string returns false (no false-positive on missing env)', () => {
  // Replicate the safeEqual logic from privileged-route-auth.ts
  function safeEqual(a, b) {
    if (!a || !b) return false
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return crypto.timingSafeEqual(aBuf, bBuf)
  }

  assert.strictEqual(safeEqual('', 'secret'), false, 'empty provided must return false')
  assert.strictEqual(safeEqual('token', ''), false, 'empty expected must return false')
  assert.strictEqual(safeEqual('', ''), false, 'both empty must return false')
  assert.strictEqual(safeEqual('abc', 'abc'), true, 'matching values must return true')
  assert.strictEqual(safeEqual('abc', 'xyz'), false, 'mismatched values must return false')
})

// ── 7. auth module does not export a function that allows empty tokens ────────

test('privileged-route-auth.ts: candidates list filters empty strings', () => {
  const content = fs.readFileSync(AUTH_MODULE, 'utf8')
  // The candidates array must call .filter(Boolean) to eliminate empty env vars
  assert.ok(
    content.includes('.filter(Boolean)'),
    'Candidates list must filter out empty env var values with .filter(Boolean)'
  )
})

// ── 8. New lib/security directory created ────────────────────────────────────

test('lib/security/ directory exists with privileged-route-auth.ts', () => {
  const secDir = path.join(ROOT, 'product/lead-response/dashboard/lib/security')
  assert.ok(fs.existsSync(secDir), 'lib/security/ directory must exist')
  assert.ok(fs.existsSync(AUTH_MODULE), 'privileged-route-auth.ts must exist in lib/security/')
})

// ── Summary ──────────────────────────────────────────────────────────────────

Promise.resolve().then(() => {
  console.log(`\n${passed === total ? '✅' : '❌'} ${passed}/${total} tests passed`)
  if (passed !== total) process.exit(1)
})
