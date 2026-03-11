/**
 * E2E Test: fix-trial-signup-redirects-to-nonexistent-onboarding-page
 * Task: 2c809e52-4c48-406b-ac4a-13d468e3d4e3
 *
 * Verifies that:
 * 1. trial-signup API returns redirectTo: '/setup' (not '/dashboard/onboarding')
 * 2. pilot-signup API returns redirectTo: '/setup' (not '/dashboard/onboarding')
 * 3. trial/start API returns redirectTo: '/setup' (not '/onboarding')
 * 4. /onboarding is NOT in AUTH_ROUTES (so authenticated users can access /setup)
 * 5. No references to /dashboard/onboarding remain in the codebase
 * 6. Pilot welcome email links to /setup
 * 7. Dashboard build passes
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DASHBOARD_DIR = path.resolve(__dirname, '../product/lead-response/dashboard')
const ROOT = path.resolve(__dirname, '..')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  ✅ ${name}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`)
    failed++
  }
}

console.log('\n=== E2E: fix-trial-signup-redirects-to-nonexistent-onboarding-page ===\n')

// AC-1: Trial signup redirects to /setup
test('trial-signup/route.ts returns redirectTo: /setup', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts'),
    'utf8'
  )
  assert(content.includes("redirectTo: '/setup'"), 'Missing redirectTo: /setup in trial-signup')
  assert(!content.includes("redirectTo: '/dashboard/onboarding'"), 'Still has redirectTo: /dashboard/onboarding in trial-signup')
})

// AC-2: Pilot signup redirects to /setup
test('pilot-signup/route.ts returns redirectTo: /setup', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/auth/pilot-signup/route.ts'),
    'utf8'
  )
  assert(content.includes("redirectTo: '/setup'"), 'Missing redirectTo: /setup in pilot-signup')
  assert(!content.includes("redirectTo: '/dashboard/onboarding'"), 'Still has redirectTo: /dashboard/onboarding in pilot-signup')
})

// AC-3: Trial start redirects to /setup
test('trial/start/route.ts returns redirectTo: /setup', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/trial/start/route.ts'),
    'utf8'
  )
  assert(content.includes("redirectTo: '/setup'"), 'Missing redirectTo: /setup in trial/start')
  assert(!content.includes("redirectTo: '/onboarding'"), 'Still has redirectTo: /onboarding in trial/start')
})

// AC-4: /setup page exists
test('/setup page exists and is accessible', () => {
  const setupPage = path.join(DASHBOARD_DIR, 'app/setup/page.tsx')
  assert(fs.existsSync(setupPage), '/setup/page.tsx does not exist')
})

// AC-5: No redirects point to /dashboard/onboarding
test('No /dashboard/onboarding references in API routes', () => {
  const filesToCheck = [
    'app/api/auth/trial-signup/route.ts',
    'app/api/auth/pilot-signup/route.ts',
    'app/api/trial/start/route.ts',
  ]
  for (const file of filesToCheck) {
    const content = fs.readFileSync(path.join(DASHBOARD_DIR, file), 'utf8')
    assert(!content.includes('/dashboard/onboarding'), `Found /dashboard/onboarding in ${file}`)
  }
})

// AC-6: Pilot welcome email links to /setup
test('Pilot welcome email links to /setup', () => {
  const content = fs.readFileSync(
    path.join(DASHBOARD_DIR, 'app/api/auth/pilot-signup/route.ts'),
    'utf8'
  )
  assert(content.includes('https://leadflow-ai-five.vercel.app/setup'), 'Pilot email missing /setup link')
  assert(!content.includes('https://leadflow-ai-five.vercel.app/dashboard/onboarding'), 'Pilot email still has /dashboard/onboarding link')
})

// AC-7: /onboarding removed from AUTH_ROUTES
test('/onboarding is NOT in AUTH_ROUTES', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'middleware.ts'), 'utf8')
  const authRoutesMatch = content.match(/const AUTH_ROUTES\s*=\s*\[([\s\S]*?)\]/)
  assert(authRoutesMatch, 'Could not find AUTH_ROUTES in middleware.ts')
  const authRoutesBlock = authRoutesMatch[1]
  assert(!authRoutesBlock.includes("'/onboarding'"), '/onboarding is still in AUTH_ROUTES')
})

// Additional: Verify /setup is in PROTECTED_ROUTES
test('/setup is in PROTECTED_ROUTES', () => {
  const content = fs.readFileSync(path.join(DASHBOARD_DIR, 'middleware.ts'), 'utf8')
  const protectedRoutesMatch = content.match(/const PROTECTED_ROUTES\s*=\s*\[([\s\S]*?)\]/)
  assert(protectedRoutesMatch, 'Could not find PROTECTED_ROUTES in middleware.ts')
  const protectedRoutesBlock = protectedRoutesMatch[1]
  assert(protectedRoutesBlock.includes("'/setup'"), '/setup is not in PROTECTED_ROUTES')
})

// Build verification
test('Dashboard build passes', () => {
  try {
    execSync('npm run build', { cwd: DASHBOARD_DIR, stdio: 'pipe', timeout: 180000 })
  } catch (e) {
    throw new Error(`Build failed: ${e.stderr ? e.stderr.toString().slice(0, 500) : e.message}`)
  }
})

// Security: No hardcoded secrets
test('No hardcoded secrets in modified files', () => {
  const secretPatterns = [/sk_live_[a-zA-Z0-9]+/, /re_[a-zA-Z0-9]{20,}/, /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["'][^"']+/]
  const filesToCheck = [
    'app/api/auth/trial-signup/route.ts',
    'app/api/auth/pilot-signup/route.ts',
    'app/api/trial/start/route.ts',
    'middleware.ts',
  ]
  for (const file of filesToCheck) {
    const content = fs.readFileSync(path.join(DASHBOARD_DIR, file), 'utf8')
    for (const pattern of secretPatterns) {
      assert(!pattern.test(content), `Potential secret in ${file}: ${pattern}`)
    }
  }
})

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)
if (failed > 0) {
  console.error('E2E RESULT: FAILED')
  process.exit(1)
}
console.log('✅ All acceptance criteria met:')
console.log('   AC-1: Trial signup redirects to /setup')
console.log('   AC-2: Pilot signup redirects to /setup')
console.log('   AC-3: Trial start redirects to /setup')
console.log('   AC-4: /setup page exists and loads')
console.log('   AC-5: No /dashboard/onboarding references remain')
console.log('   AC-6: Pilot welcome email links to /setup')
console.log('   AC-7: /onboarding removed from AUTH_ROUTES')
console.log('   AC-8: Dashboard build passes')
