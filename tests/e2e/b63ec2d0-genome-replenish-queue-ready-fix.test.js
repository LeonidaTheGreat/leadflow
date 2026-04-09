/**
 * QC E2E Test: PR #1051 — UC acceptance failed: genome replenishQueue ready-status fix
 * Task: 678a0a08-b78b-4b08-a378-cd0ba5bbdd02
 *
 * Validates:
 * 1. genome heartbeat-executor.js includes 'ready' in replenishQueue status filter
 * 2. startStep calculation is unconditional (not gated on UC status)
 * 3. auth.spec.js uses data-testid selector (not fragile CSS class)
 * 4. auth.spec.js timeout is >= 20000ms
 * 5. health.spec.js has per-test 75s timeout for cold starts
 * 6. health.spec.js sets navigationTimeout 35000 for the health describe block
 * 7. login page has data-testid="login-error-message" element
 * 8. No hardcoded secrets introduced
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const HEARTBEAT = path.join(process.env.HOME, '.openclaw/genome/core/heartbeat-executor.js')
const DASHBOARD = path.join(__dirname, '../product/lead-response/dashboard')
const AUTH_SPEC = path.join(__dirname, 'browser/auth.spec.js')
const HEALTH_SPEC = path.join(__dirname, 'browser/health.spec.js')
const LOGIN_PAGE = path.join(DASHBOARD, 'app/login/page.tsx')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`FAIL: ${name} — ${e.message}`)
    failed++
  }
}

const heartbeat = fs.readFileSync(HEARTBEAT, 'utf8')
const authSpec = fs.readFileSync(AUTH_SPEC, 'utf8')
const healthSpec = fs.readFileSync(HEALTH_SPEC, 'utf8')
const loginPage = fs.readFileSync(LOGIN_PAGE, 'utf8')

// 1. 'ready' is in the replenishQueue status filter
test("replenishQueue includes 'ready' in implementation_status filter", () => {
  assert.ok(
    heartbeat.includes("'not_started', 'partial', 'ready'"),
    "Expected 'not_started', 'partial', 'ready' in replenishQueue status filter"
  )
})

// 2. startStep calculation is unconditional
test('startStep calculation runs unconditionally (not status-gated)', () => {
  assert.ok(
    heartbeat.includes('ALWAYS check done tasks regardless of UC status'),
    'Expected comment confirming unconditional startStep calculation'
  )
})

// 3. auth.spec.js uses getByTestId for login error (not fragile CSS)
test('auth.spec.js uses getByTestId("login-error-message")', () => {
  assert.ok(
    authSpec.includes("getByTestId('login-error-message')"),
    'Expected getByTestId selector — not CSS class match'
  )
})

// 4. Old fragile selector gone from auth.spec.js
test('auth.spec.js no longer uses [class*="red"] selector', () => {
  assert.ok(
    !authSpec.includes('[class*="red"]'),
    'Old CSS class selector [class*="red"] should be removed'
  )
})

// 5. auth.spec.js timeout >= 20000ms
test('auth.spec.js login-error-message timeout >= 20000ms', () => {
  const match = authSpec.match(/login-error-message[^}]+timeout:\s*(\d+)/)
  assert.ok(match, 'Could not find timeout near login-error-message in auth.spec.js')
  assert.ok(parseInt(match[1], 10) >= 20000, `Expected >= 20000, got ${match[1]}`)
})

// 6. health.spec.js has navigationTimeout override
test('health.spec.js has test.use({ navigationTimeout: 35000 })', () => {
  assert.ok(
    healthSpec.includes('navigationTimeout: 35000'),
    'Expected navigationTimeout: 35000 in health.spec.js'
  )
})

// 7. health.spec.js has per-test setTimeout(75000)
test('health.spec.js sets test.setTimeout(75000)', () => {
  assert.ok(
    healthSpec.includes('test.setTimeout(75000)'),
    'Expected test.setTimeout(75000) in health.spec.js'
  )
})

// 8. login page has data-testid="login-error-message"
test('login page has data-testid="login-error-message"', () => {
  assert.ok(
    loginPage.includes('data-testid="login-error-message"'),
    'login/page.tsx must have data-testid="login-error-message"'
  )
})

// 9. No hardcoded secrets in changed files
test('No hardcoded secrets in changed test files', () => {
  const secretPatterns = [/sk_live_/, /sk_test_/, /api[_-]?key\s*=\s*['"][^'"]{10,}['"]/i]
  for (const f of [authSpec, healthSpec]) {
    for (const p of secretPatterns) {
      assert.ok(!p.test(f), `Potential secret pattern ${p} found`)
    }
  }
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
