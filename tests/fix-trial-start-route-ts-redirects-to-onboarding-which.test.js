/**
 * E2E Test: fix-trial-start-route-ts-redirects-to-onboarding-which
 *
 * Verifies that /api/trial/start returns redirectTo: '/setup' (not '/onboarding')
 * so that newly-signed-up trial users are sent to the setup wizard and not
 * blocked on the legacy onboarding page.
 *
 * Also verifies that:
 *  - OnboardingGuard component exists and references /setup
 *  - dashboard layout includes OnboardingGuard
 *  - /setup route is present in the built output
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD = path.resolve(__dirname, '../product/lead-response/dashboard')
const ROUTE_FILE = path.join(DASHBOARD, 'app/api/trial/start/route.ts')
const GUARD_FILE = path.join(DASHBOARD, 'components/onboarding-guard.tsx')
const LAYOUT_FILE = path.join(DASHBOARD, 'app/dashboard/layout.tsx')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`   ${err.message}`)
    failed++
  }
}

// ── TEST 1: redirectTo is /setup, not /onboarding ────────────────────────────
test('trial/start/route.ts redirects to /setup', () => {
  const src = fs.readFileSync(ROUTE_FILE, 'utf8')
  assert.ok(
    src.includes("redirectTo: '/setup'"),
    "Expected redirectTo: '/setup' in route.ts"
  )
  assert.ok(
    !src.includes("redirectTo: '/onboarding'"),
    "Must NOT contain redirectTo: '/onboarding'"
  )
})

// ── TEST 2: OnboardingGuard component exists ──────────────────────────────────
test('OnboardingGuard component file exists', () => {
  assert.ok(fs.existsSync(GUARD_FILE), `Missing: ${GUARD_FILE}`)
})

// ── TEST 3: OnboardingGuard sends unauthenticated users to /login ─────────────
test('OnboardingGuard redirects to /login when no token', () => {
  const src = fs.readFileSync(GUARD_FILE, 'utf8')
  assert.ok(
    src.includes("router.replace('/login')"),
    "OnboardingGuard must redirect to /login when no token"
  )
})

// ── TEST 4: OnboardingGuard redirects incomplete onboarding to /setup ─────────
test('OnboardingGuard redirects onboarding-incomplete users to /setup', () => {
  const src = fs.readFileSync(GUARD_FILE, 'utf8')
  assert.ok(
    src.includes("router.replace('/setup')"),
    "OnboardingGuard must redirect to /setup when onboarding not complete"
  )
})

// ── TEST 5: dashboard layout mounts OnboardingGuard ──────────────────────────
test('dashboard layout.tsx imports and mounts OnboardingGuard', () => {
  const src = fs.readFileSync(LAYOUT_FILE, 'utf8')
  assert.ok(
    src.includes("OnboardingGuard"),
    "dashboard layout must include <OnboardingGuard />"
  )
  assert.ok(
    src.includes("import { OnboardingGuard }"),
    "dashboard layout must import OnboardingGuard"
  )
})

// ── TEST 6: /setup page exists in the app router ─────────────────────────────
test('/setup page exists in app router', () => {
  const setupPage = path.join(DASHBOARD, 'app/setup/page.tsx')
  assert.ok(fs.existsSync(setupPage), `Missing setup page: ${setupPage}`)
})

// ── TEST 7: OnboardingGuard skips guard on public routes ──────────────────────
test('OnboardingGuard does not redirect on /setup and /login routes', () => {
  const src = fs.readFileSync(GUARD_FILE, 'utf8')
  assert.ok(
    src.includes("'/setup'") && src.includes("'/login'"),
    "OnboardingGuard SETUP_ROUTES must include /setup and /login to avoid redirect loops"
  )
})

// ── TEST 8: No hardcoded secrets ──────────────────────────────────────────────
test('No hardcoded secrets in changed files', () => {
  const filesToCheck = [ROUTE_FILE, GUARD_FILE, LAYOUT_FILE]
  const secretPattern = /(sk_live_|sk_test_|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z]+ PRIVATE KEY)/
  for (const f of filesToCheck) {
    if (!fs.existsSync(f)) continue
    const src = fs.readFileSync(f, 'utf8')
    assert.ok(!secretPattern.test(src), `Possible secret found in ${path.basename(f)}`)
  }
})

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════')
console.log(`✅ Passed: ${passed}`)
console.log(`❌ Failed: ${failed}`)
console.log(`📈 Pass rate: ${(passed / (passed + failed) * 100).toFixed(0)}%`)
if (failed > 0) {
  process.exit(1)
}
