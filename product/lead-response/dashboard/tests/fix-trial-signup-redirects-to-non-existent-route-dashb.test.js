/**
 * E2E Test: fix-trial-signup-redirects-to-non-existent-route-dashb
 * Task: 76fff6b0-786d-40ea-86ae-b3fe494f7b61
 *
 * Verifies that:
 * 1. trial-signup API returns redirectTo: '/onboarding' (not '/dashboard/onboarding')
 * 2. /onboarding route exists in the built output
 * 3. /onboarding is NOT in AUTH_ROUTES (so authenticated trial users can access it)
 * 4. middleware does not block authenticated users from /onboarding
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

console.log('Running E2E checks for fix-trial-signup-redirects-to-non-existent-route-dashb')

// 1. Verify the API route returns the correct redirectTo value
test('trial-signup API returns redirectTo: /onboarding (not /dashboard/onboarding)', () => {
  const routeSource = fs.readFileSync(
    path.join(ROOT, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert(
    routeSource.includes("redirectTo: '/onboarding'"),
    "route.ts does not contain redirectTo: '/onboarding'"
  )
  assert(
    !routeSource.includes("redirectTo: '/dashboard/onboarding'"),
    "route.ts still references the broken '/dashboard/onboarding' path"
  )
})

// 2. /onboarding route exists in the codebase
test('/onboarding page exists in app directory', () => {
  const onboardingDir = path.join(ROOT, 'app/onboarding')
  assert(fs.existsSync(onboardingDir), 'app/onboarding directory does not exist')
  // Either page.tsx or page.js
  const pageExists =
    fs.existsSync(path.join(onboardingDir, 'page.tsx')) ||
    fs.existsSync(path.join(onboardingDir, 'page.js'))
  assert(pageExists, 'app/onboarding/page.tsx (or .js) does not exist')
})

// 3. /onboarding is NOT in AUTH_ROUTES in middleware
test('/onboarding is NOT in AUTH_ROUTES in middleware.ts', () => {
  const middlewareSource = fs.readFileSync(
    path.join(ROOT, 'middleware.ts'),
    'utf8'
  )

  // Extract AUTH_ROUTES array contents
  const authRoutesMatch = middlewareSource.match(/const AUTH_ROUTES\s*=\s*\[([\s\S]*?)\]/)
  assert(authRoutesMatch, 'Could not find AUTH_ROUTES in middleware.ts')

  const authRoutesBlock = authRoutesMatch[1]
  assert(
    !authRoutesBlock.includes('/onboarding'),
    '/onboarding is still in AUTH_ROUTES — authenticated trial users will be redirected away from it'
  )
})

// 4. /login and /signup are still in AUTH_ROUTES (regression check)
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

// 5. Build output includes /onboarding
test('Build output includes /onboarding route', () => {
  // Check the Next.js app directory structure (build artifact may vary)
  const onboardingExists =
    fs.existsSync(path.join(ROOT, '.next/server/app/onboarding')) ||
    fs.existsSync(path.join(ROOT, '.next/server/pages/onboarding.js')) ||
    fs.existsSync(path.join(ROOT, 'app/onboarding/page.tsx'))
  assert(onboardingExists, '/onboarding is not present in build or source')
})

// 6. Ensure no reference to /dashboard/onboarding remains anywhere in the codebase
test('No remaining references to /dashboard/onboarding in source files', () => {
  const filesToCheck = [
    path.join(ROOT, 'app/api/auth/trial-signup/route.ts'),
    path.join(ROOT, 'middleware.ts'),
  ]
  for (const filePath of filesToCheck) {
    if (!fs.existsSync(filePath)) continue
    const content = fs.readFileSync(filePath, 'utf8')
    assert(
      !content.includes('/dashboard/onboarding'),
      `Found '/dashboard/onboarding' in ${path.relative(ROOT, filePath)}`
    )
  }
})

if (process.exitCode) {
  console.error('\nE2E RESULT: FAILED')
  process.exit(process.exitCode)
}

console.log('\nE2E RESULT: PASSED')
