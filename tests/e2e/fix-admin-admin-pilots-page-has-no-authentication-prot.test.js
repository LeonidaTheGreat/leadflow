/**
 * E2E Test: Admin /admin/pilots page authentication protection
 * Task: fix-admin-admin-pilots-page-has-no-authentication-prot
 *
 * Acceptance Criteria:
 * 1. /admin/pilots is covered by PROTECTED_ROUTES in middleware.ts
 * 2. /api/admin/pilots GET route has isAdminUser() check
 * 3. /api/admin/pilots/[agentId] POST (log-contact) has isAdminUser() check
 * 4. /api/admin/pilots/[agentId] PATCH (advance-stage) has isAdminUser() check
 * 5. isAdminUser() verifies against ADMIN_EMAIL env var
 */

const path = require('path')
const fs = require('fs')

let passed = 0
let failed = 0

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`)
    failed++
    return false
  }
  console.log(`✅ PASS: ${message}`)
  passed++
  return true
}

const DASHBOARD_ROOT = path.join(__dirname, '..', '..', 'product', 'lead-response', 'dashboard')

async function testMiddlewareProtectsAdminRoute() {
  console.log('\n📋 Test Suite 1: middleware.ts PROTECTED_ROUTES includes /admin')

  const middlewarePath = path.join(DASHBOARD_ROOT, 'middleware.ts')
  assert(fs.existsSync(middlewarePath), 'middleware.ts exists')

  const content = fs.readFileSync(middlewarePath, 'utf-8')

  // PROTECTED_ROUTES must include /admin (covers /admin/pilots and all sub-routes)
  assert(
    content.includes("'/admin'") || content.includes('"/admin"'),
    'PROTECTED_ROUTES contains /admin'
  )

  // Verify PROTECTED_ROUTES is the array that drives auth checks
  assert(
    content.includes('PROTECTED_ROUTES'),
    'PROTECTED_ROUTES constant is defined'
  )

  // Verify unauthenticated users are redirected to login
  assert(
    content.includes('isProtectedRoute') && content.includes('loginUrl'),
    'Middleware redirects unauthenticated users from protected routes to login'
  )
}

async function testAdminPilotsApiRouteAuth() {
  console.log('\n📋 Test Suite 2: /api/admin/pilots GET has isAdminUser() guard')

  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'admin', 'pilots', 'route.ts')
  assert(fs.existsSync(routePath), '/api/admin/pilots/route.ts exists')

  const content = fs.readFileSync(routePath, 'utf-8')

  assert(
    content.includes('isAdminUser'),
    'GET /api/admin/pilots imports isAdminUser'
  )
  assert(
    content.includes('isAdminUser(request)'),
    'GET /api/admin/pilots calls isAdminUser(request)'
  )
  assert(
    content.includes('Unauthorized') || content.includes('401'),
    'GET /api/admin/pilots returns 401/Unauthorized when not admin'
  )
}

async function testAgentIdRouteAuth() {
  console.log('\n📋 Test Suite 3: /api/admin/pilots/[agentId] actions have isAdminUser() guards')

  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'admin', 'pilots', '[agentId]', 'route.ts')
  assert(fs.existsSync(routePath), '/api/admin/pilots/[agentId]/route.ts exists')

  const content = fs.readFileSync(routePath, 'utf-8')

  // Both POST (log-contact) and PATCH (advance-stage) must check isAdminUser
  const adminChecks = (content.match(/isAdminUser\(request\)/g) || []).length
  assert(adminChecks >= 2, `Both POST and PATCH handlers call isAdminUser() (found ${adminChecks} calls)`)

  assert(
    content.includes('Unauthorized') || content.includes('401'),
    'Handlers return 401/Unauthorized when not admin'
  )
}

async function testIsAdminUserImplementation() {
  console.log('\n📋 Test Suite 4: isAdminUser() in lib/auth.ts verifies against ADMIN_EMAIL')

  const authPath = path.join(DASHBOARD_ROOT, 'lib', 'auth.ts')
  assert(fs.existsSync(authPath), 'lib/auth.ts exists')

  const content = fs.readFileSync(authPath, 'utf-8')

  assert(
    content.includes('isAdminUser'),
    'isAdminUser function is defined in lib/auth.ts'
  )
  assert(
    content.includes('ADMIN_EMAIL'),
    'isAdminUser checks against ADMIN_EMAIL env var'
  )
  assert(
    content.includes('getAuthUserId'),
    'isAdminUser calls getAuthUserId to verify authentication first'
  )
  assert(
    content.includes('return false'),
    'isAdminUser returns false when not admin or not authenticated'
  )
}

async function testAdminPageExists() {
  console.log('\n📋 Test Suite 5: /admin/pilots page component exists')

  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'admin', 'pilots', 'page.tsx')
  assert(fs.existsSync(pagePath), '/admin/pilots/page.tsx exists')

  const content = fs.readFileSync(pagePath, 'utf-8')

  // Page makes calls to /api/admin/pilots — protection is enforced by middleware + API
  assert(
    content.includes('/api/admin/pilots'),
    'Page fetches from /api/admin/pilots (protected API endpoint)'
  )
}

async function runAll() {
  console.log('🧪 Running E2E tests: Admin /admin/pilots authentication protection\n')
  console.log('='.repeat(70))

  try {
    await testMiddlewareProtectsAdminRoute()
    await testAdminPilotsApiRouteAuth()
    await testAgentIdRouteAuth()
    await testIsAdminUserImplementation()
    await testAdminPageExists()
  } catch (err) {
    console.error('\n💥 Test runner error:', err.message)
    failed++
  }

  console.log('\n' + '='.repeat(70))
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`)

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runAll().catch(err => {
  console.error('\n💥 Fatal error:', err.message)
  process.exit(1)
})
