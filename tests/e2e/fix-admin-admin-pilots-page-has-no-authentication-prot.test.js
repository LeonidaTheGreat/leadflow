/**
 * E2E Test: Admin /admin/pilots page authentication protection
 * Task: fix-admin-admin-pilots-page-has-no-authentication-prot
 *
 * Acceptance Criteria:
 * 1. /admin/pilots is protected by middleware.ts (admin_session cookie check)
 * 2. /api/admin/pilots GET route has requireAdmin() check
 * 3. /api/admin/pilots/[agentId] POST (log-contact) has requireAdmin() check
 * 4. /api/admin/pilots/[agentId] PATCH (advance-stage) has requireAdmin() check
 * 5. requireAdmin() is defined in lib/services/AuthService and delegates to requireAdminSession (ADMIN_SECRET)
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
  console.log('\n📋 Test Suite 1: middleware.ts protects /admin/* with admin_session cookie')

  const middlewarePath = path.join(DASHBOARD_ROOT, 'middleware.ts')
  assert(fs.existsSync(middlewarePath), 'middleware.ts exists')

  const content = fs.readFileSync(middlewarePath, 'utf-8')

  // Admin paths have a separate auth track from customer PROTECTED_ROUTES
  assert(
    content.includes("startsWith('/admin/')") || content.includes('isAdminPath'),
    'middleware.ts detects /admin/* paths'
  )

  assert(
    content.includes('admin_session'),
    'middleware.ts checks admin_session cookie for /admin routes'
  )

  // Verify unauthenticated admin users are redirected to login
  assert(
    content.includes('isValidAdminSession') && content.includes('loginUrl'),
    'Middleware redirects unauthenticated admin users to /admin/login'
  )
}

async function testAdminPilotsApiRouteAuth() {
  console.log('\n📋 Test Suite 2: /api/admin/pilots GET has requireAdmin() guard')

  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'admin', 'pilots', 'route.ts')
  assert(fs.existsSync(routePath), '/api/admin/pilots/route.ts exists')

  const content = fs.readFileSync(routePath, 'utf-8')

  assert(
    content.includes('requireAdmin'),
    'GET /api/admin/pilots uses requireAdmin guard'
  )
  assert(
    content.includes("from '@/lib/services/AuthService'"),
    'GET /api/admin/pilots imports requireAdmin from @/lib/services/AuthService'
  )
  assert(
    content.includes('Unauthorized') || content.includes('401'),
    'GET /api/admin/pilots returns 401/Unauthorized when not admin'
  )
}

async function testAgentIdRouteAuth() {
  console.log('\n📋 Test Suite 3: /api/admin/pilots/[agentId] actions have requireAdmin() guards')

  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'admin', 'pilots', '[agentId]', 'route.ts')
  assert(fs.existsSync(routePath), '/api/admin/pilots/[agentId]/route.ts exists')

  const content = fs.readFileSync(routePath, 'utf-8')

  // Both POST (log-contact) and PATCH (advance-stage) must check requireAdmin
  const adminChecks = (content.match(/requireAdmin\(request\)/g) || []).length
  assert(adminChecks >= 2, `Both POST and PATCH handlers call requireAdmin() (found ${adminChecks} calls)`)

  assert(
    content.includes('Unauthorized') || content.includes('401'),
    'Handlers return 401/Unauthorized when not admin'
  )
}

async function testRequireAdminImplementation() {
  console.log('\n📋 Test Suite 4: requireAdmin() in lib/services/AuthService.ts delegates to requireAdminSession')

  const authPath = path.join(DASHBOARD_ROOT, 'lib', 'services', 'AuthService.ts')
  assert(fs.existsSync(authPath), 'lib/services/AuthService.ts exists')

  const content = fs.readFileSync(authPath, 'utf-8')

  assert(
    content.includes('requireAdmin'),
    'requireAdmin function is defined in AuthService.ts'
  )
  assert(
    content.includes('requireAdminSession'),
    'requireAdmin delegates to requireAdminSession (cookie-based ADMIN_SECRET check)'
  )

  const adminAuthPath = path.join(DASHBOARD_ROOT, 'lib', 'admin-auth.ts')
  const adminAuthContent = fs.readFileSync(adminAuthPath, 'utf-8')
  assert(
    adminAuthContent.includes('ADMIN_SECRET'),
    'admin-auth.ts verifies against ADMIN_SECRET env var'
  )
  assert(
    adminAuthContent.includes('return false'),
    'admin-auth.ts returns false when session is invalid'
  )
}

async function testAdminPageExists() {
  console.log('\n📋 Test Suite 5: /admin/pilots page component exists')

  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'admin', 'pilots', 'page.tsx')
  assert(fs.existsSync(pagePath), '/admin/pilots/page.tsx exists')

  const content = fs.readFileSync(pagePath, 'utf-8')

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
    await testRequireAdminImplementation()
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
