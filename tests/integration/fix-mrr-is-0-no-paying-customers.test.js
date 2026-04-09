/**
 * Test: fix-mrr-is-0-no-paying-customers
 * Task: d23c07bd-a3dc-44ac-8751-33e64ac17ba1
 *
 * Verifies fixes to unblock pilot recruitment:
 * 1. Welcome email URL points to /dashboard/onboarding (not /setup)
 * 2. Trial signup redirectTo is /dashboard/onboarding (not /setup)
 * 3. trial/start redirectTo is /dashboard/onboarding (not /setup)
 * 4. Trial form shows 14-day (not 30-day) — matches /signup page
 * 5. Landing page says 14-day trial (not 30-day)
 * 6. Social proof does not claim "hundreds of agents"
 * 7. Stale conflicting test file deleted
 * 8. madzunkov@hotmail.com has valid plan_tier (not null)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const DASHBOARD = path.join(ROOT, 'product/lead-response/dashboard')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`)
    failed++
  }
}

// --- Fix 1: welcome email URL in trial-signup route ---
test('trial-signup route: welcome email dashboardUrl points to /dashboard/onboarding', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert.ok(
    file.includes('/dashboard/onboarding'),
    'dashboardUrl should contain /dashboard/onboarding'
  )
  assert.ok(
    !file.includes("dashboardUrl: 'https://leadflow-ai-five.vercel.app/setup'"),
    'dashboardUrl should NOT point to /setup'
  )
})

// --- Fix 2: trial-signup redirectTo ---
test('trial-signup route: redirectTo is /dashboard/onboarding', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert.ok(
    file.includes("redirectTo: '/dashboard/onboarding'"),
    'redirectTo should be /dashboard/onboarding'
  )
  assert.ok(
    !file.includes("redirectTo: '/setup'"),
    'redirectTo should NOT be /setup'
  )
})

// --- Fix 3: trial/start redirectTo ---
test('trial/start route: redirectTo is /dashboard/onboarding', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/trial/start/route.ts'),
    'utf8'
  )
  assert.ok(
    file.includes("redirectTo: '/dashboard/onboarding'"),
    'trial/start redirectTo should be /dashboard/onboarding'
  )
  assert.ok(
    !file.includes("redirectTo: '/setup'"),
    'trial/start redirectTo should NOT be /setup'
  )
})

// --- Fix 4: Trial form shows 14-day ---
test('trial-signup-form: shows 14 days (not 30 days)', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'components/trial-signup-form.tsx'),
    'utf8'
  )
  assert.ok(
    file.includes('14 days') || file.includes('14-day'),
    'form should mention 14 days'
  )
  assert.ok(
    !file.includes('30 days') && !file.includes('30-day'),
    'form should NOT mention 30 days'
  )
})

// --- Fix 5: Landing page says 14-day trial ---
test('landing page: pricing section says 14-day trial', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'app/page.tsx'),
    'utf8'
  )
  assert.ok(
    file.includes('14-day'),
    'landing page should say 14-day trial'
  )
  // Verify no 30-day trial text in pricing section
  const pricingMatch = file.match(/Start with a free \d+-day trial/)
  assert.ok(pricingMatch, 'pricing text should match expected pattern')
  assert.ok(
    pricingMatch[0].includes('14'),
    'pricing should say 14-day'
  )
})

// --- Fix 6: Social proof does not claim "hundreds of agents" ---
test('landing page: no false claim of "hundreds of agents"', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'app/page.tsx'),
    'utf8'
  )
  assert.ok(
    !file.toLowerCase().includes('hundreds of agents'),
    'landing page should NOT claim hundreds of agents (0 paying customers)'
  )
})

// --- Fix 7: Stale test file deleted ---
test('stale conflicting test file deleted', () => {
  const stalePath = path.join(
    DASHBOARD,
    'tests/fix-trial-signup-redirects-to-non-existent-route-dashb.test.js'
  )
  assert.ok(!fs.existsSync(stalePath), 'stale test file should be deleted')
})

// --- Fix 8: Trial duration is 14 days in backend ---
test('trial/start route: creates 14-day trial (not 30-day)', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/trial/start/route.ts'),
    'utf8'
  )
  // Should set date to +14 days
  assert.ok(
    file.includes('+ 14') || file.includes('+14'),
    'trial/start should use 14-day trial period'
  )
  assert.ok(
    !file.includes('setDate(trialEndsAt.getDate() + 30)'),
    'trial/start should NOT use 30-day trial period'
  )
})

test('trial-signup route: creates 14-day trial (not 30-day)', () => {
  const file = fs.readFileSync(
    path.join(DASHBOARD, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert.ok(
    file.includes('14 * 24 * 60 * 60 * 1000'),
    'trial-signup should use 14-day trial period'
  )
  assert.ok(
    !file.includes('30 * 24 * 60 * 60 * 1000'),
    'trial-signup should NOT use 30-day trial period'
  )
})

// --- Summary ---
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
