/**
 * E2E Regression Test: b09b87ad — Fix E2E flow test failures (8 critical)
 *
 * Root cause: Vercel production alias (leadflow-ai-five.vercel.app) was pointing
 * to a stale wrong-directory deployment (server.js Express server instead of
 * Next.js dashboard). This caused all Next.js-specific routes to 404.
 *
 * Fixes:
 * 1. Restored deployment identity field (app:'leadflow-dashboard') in /api/health
 * 2. E2E health test now verifies deployment identity to catch wrong-directory deploys
 * 3. Restored unit test assertion for the identity field
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`)
    failed++
  }
}

console.log('\n=== Regression Test: b09b87ad E2E flow failures ===\n')

const HEALTH_ROUTE = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'app', 'api', 'health', 'route.ts')
const E2E_SCRIPT = path.join(__dirname, '..', 'scripts', 'e2e-flow-tests.sh')
const HEALTH_TEST = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard', 'tests', 'fix-health-route-db-timeout-guard.test.js')

const healthSrc = fs.readFileSync(HEALTH_ROUTE, 'utf8')
const e2eSrc = fs.readFileSync(E2E_SCRIPT, 'utf8')
const healthTestSrc = fs.readFileSync(HEALTH_TEST, 'utf8')

test('health route includes app identity field (detects wrong-directory Vercel deploys)', () => {
  assert.ok(healthSrc.includes("app: 'leadflow-dashboard'"), 'app identity field missing from /api/health response')
})

test('E2E health test verifies deployment identity (app:"leadflow-dashboard")', () => {
  assert.ok(e2eSrc.includes('"app":"leadflow-dashboard"'), 'E2E health check does not verify deployment identity')
})

test('E2E health test still checks api_connectivity', () => {
  assert.ok(e2eSrc.includes('"api_connectivity":{"ok":true'), 'E2E health check must still verify api_connectivity')
})

test('health route unit test asserts app identity field', () => {
  assert.ok(healthTestSrc.includes("app: 'leadflow-dashboard'"), 'health route unit test does not assert app identity field')
})

test('E2E script uses exit code 42 for skip (not fail)', () => {
  assert.ok(e2eSrc.includes('return 42'), 'E2E script must support skip exit code (42) for precondition-not-met cases')
})

console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
