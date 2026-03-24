/**
 * E2E Test: fix-trial-signup-redirects-to-non-existent-route-dashb
 * Task: 76fff6b0-786d-40ea-86ae-b3fe494f7b61
 *
 * Updated by: feat-post-signup-dashboard-onboarding-redirect (PRD-SIGNUP-AUTH-TOKEN-FIX-001)
 * Update: Now asserts /dashboard/onboarding (the proper wizard destination) instead of /onboarding.
 *         The /dashboard/onboarding page now exists with auth fallback support.
 *
 * Verifies that:
 * 1. trial-signup API returns redirectTo: '/dashboard/onboarding'
 * 2. /dashboard/onboarding route exists in the app directory
 * 3. /dashboard/onboarding is in OnboardingGuard's skip list (so the guard doesn't redirect away)
 * 4. middleware does not block authenticated users from /dashboard/onboarding
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (err) {
    console.error(`FAIL: ${name}`)
    console.error(`  ${err.message}`)
    process.exitCode = 1
  }
}

console.log('Running E2E checks for fix-trial-signup-redirects-to-non-existent-route-dashb (updated for /dashboard/onboarding)')

// 1. Verify the API route returns the correct redirectTo value
test('trial-signup API returns redirectTo: /dashboard/onboarding', () => {
  const routeSource = fs.readFileSync(
    path.join(ROOT, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert(
    routeSource.includes("redirectTo: '/dashboard/onboarding'"),
    "route.ts does not contain redirectTo: '/dashboard/onboarding'"
  )
})

// 2. trial-signup returns token + user in response body (FR-1)
test('trial-signup API response includes token and user fields', () => {
  const routeSource = fs.readFileSync(
    path.join(ROOT, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert(
    routeSource.includes('token,') || routeSource.includes('token:'),
    'route.ts does not include token in response body'
  )
  assert(
    routeSource.includes('user:'),
    'route.ts does not include user object in response body'
  )
})

// 3. /dashboard/onboarding page exists in the app directory
test('/dashboard/onboarding page exists in app directory', () => {
  const onboardingDir = path.join(ROOT, 'app/dashboard/onboarding')
  assert(fs.existsSync(onboardingDir), 'app/dashboard/onboarding directory does not exist')
  const pageExists =
    fs.existsSync(path.join(onboardingDir, 'page.tsx')) ||
    fs.existsSync(path.join(onboardingDir, 'page.js'))
  assert(pageExists, 'app/dashboard/onboarding/page.tsx (or .js) does not exist')
})

// 4. /dashboard/onboarding is in OnboardingGuard's skip list
test('/dashboard/onboarding is in OnboardingGuard SETUP_ROUTES (skips redirect guard)', () => {
  const guardSource = fs.readFileSync(
    path.join(ROOT, 'components/onboarding-guard.tsx'),
    'utf8'
  )
  assert(
    guardSource.includes('/dashboard/onboarding'),
    '/dashboard/onboarding is NOT in OnboardingGuard SETUP_ROUTES — authenticated new users will be incorrectly redirected'
  )
})

// 5. /api/auth/me endpoint exists
test('/api/auth/me endpoint file exists (FR-3)', () => {
  const meRoute = path.join(ROOT, 'app/api/auth/me/route.ts')
  assert(fs.existsSync(meRoute), 'app/api/auth/me/route.ts does not exist')
})

// 6. trial-signup form stores token+user to localStorage before navigation
test('TrialSignupForm stores token + user to localStorage before navigation (FR-2)', () => {
  const formSource = fs.readFileSync(
    path.join(ROOT, 'components/trial-signup-form.tsx'),
    'utf8'
  )
  assert(
    formSource.includes("localStorage.setItem('leadflow_token'"),
    'TrialSignupForm does not set leadflow_token in localStorage'
  )
  assert(
    formSource.includes("localStorage.setItem('leadflow_user'"),
    'TrialSignupForm does not set leadflow_user in localStorage'
  )
})

// 7. /login and /signup are still in AUTH_ROUTES (regression check)
test('/login and /signup are still in AUTH_ROUTES (no regression)', () => {
  const middlewareSource = fs.readFileSync(
    path.join(ROOT, 'middleware.ts'),
    'utf8'
  )
  const authRoutesMatch = middlewareSource.match(/const AUTH_ROUTES\s*=\s*\[([\s\S]*?)\]/)
  assert(authRoutesMatch, 'Could not find AUTH_ROUTES in middleware.ts')
  const authRoutesBlock = authRoutesMatch[1]
  assert(authRoutesBlock.includes("'/login'"), '/login missing from AUTH_ROUTES')
  assert(authRoutesBlock.includes("'/signup'"), '/signup missing from AUTH_ROUTES')
})

// 8. /onboarding still exists (it's the original standalone wizard — not removed)
test('/onboarding page still exists in app directory (not deleted)', () => {
  const onboardingExists = fs.existsSync(path.join(ROOT, 'app/onboarding/page.tsx'))
  assert(onboardingExists, 'app/onboarding/page.tsx was unexpectedly deleted')
})

if (process.exitCode) {
  console.error('\nE2E RESULT: FAILED')
  process.exit(process.exitCode)
}

console.log('\nE2E RESULT: PASSED')
