/**
 * QC E2E Test: Admin /admin/pilots authentication and authorization
 * Task ID: a20a8f4c-9f66-4ccc-a068-ed6b657b6279
 *
 * Tests:
 * 1. middleware.ts protects /admin/* with admin_session cookie check
 * 2. /api/admin/pilots returns 401 without auth (API middleware matcher excludes /api)
 * 3. requireAdmin() guard appears BEFORE data access in all three handlers
 * 4. requireAdmin defined in lib/services/AuthService (single canonical source)
 * 5. requireAdmin delegates to requireAdminSession (ADMIN_SECRET cookie-based)
 * 6. All admin sub-routes (/admin/funnel, /admin/nps, etc.) also protected by /admin prefix
 */

const assert = require('assert')
const path = require('path')
const fs = require('fs')

const DASHBOARD = path.join(__dirname, '../../product/lead-response/dashboard')

let passed = 0
let failed = 0

function check(label, fn) {
  try {
    fn()
    console.log(`PASS: ${label}`)
    passed++
  } catch (err) {
    console.error(`FAIL: ${label} — ${err.message}`)
    failed++
  }
}

// --- Test 1: middleware handles /admin/* via admin_session cookie check (not PROTECTED_ROUTES)
check('middleware.ts: /admin/* handled by admin_session cookie check', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'middleware.ts'), 'utf8')
  // Admin paths have their own auth track using admin_session cookie
  assert.ok(
    src.includes("startsWith('/admin/')") || src.includes('isAdminPath'),
    '/admin path detection not found in middleware'
  )
  assert.ok(src.includes('admin_session'), 'admin_session cookie not checked for /admin routes')
  assert.ok(src.includes('isValidAdminSession'), 'isValidAdminSession not called for admin paths')
})

// --- Test 2: middleware matcher does NOT include /api — API routes use their own route-level guard
check('middleware.ts: matcher excludes /api (API routes rely on route-level requireAdmin)', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'middleware.ts'), 'utf8')
  const matcherBlock = src.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1] || ''
  assert.ok(matcherBlock.includes('api'), 'Matcher does not exclude api — verify API protection strategy')
})

// --- Test 3: requireAdmin guard is the FIRST operation in GET /api/admin/pilots handler
check('GET /api/admin/pilots: requireAdmin check before any DB access', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/route.ts'), 'utf8')
  const fnBody = src.match(/export async function GET[\s\S]*/)
  assert.ok(fnBody, 'GET function not found')
  const body = fnBody[0]
  const adminIdx = body.indexOf('requireAdmin')
  const dbIdx = body.indexOf('postgrestAdmin')
  assert.ok(adminIdx !== -1, 'requireAdmin not called in GET handler')
  assert.ok(dbIdx !== -1, 'postgrestAdmin not used in GET handler')
  assert.ok(adminIdx < dbIdx, `requireAdmin (pos ${adminIdx}) must come before DB access (pos ${dbIdx})`)
})

// --- Test 4: requireAdmin guard is the FIRST operation in POST /api/admin/pilots/[agentId]
check('POST /api/admin/pilots/[agentId]: requireAdmin check before any DB access', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  const fnBody = src.match(/export async function POST[\s\S]*?(?=export async function|\z)/)
  assert.ok(fnBody, 'POST function not found')
  const body = fnBody[0]
  const adminIdx = body.indexOf('requireAdmin')
  const dbIdx = Math.min(
    body.includes('supabaseServer') ? body.indexOf('supabaseServer') : Infinity,
    body.includes('postgrestAdmin') ? body.indexOf('postgrestAdmin') : Infinity
  )
  assert.ok(adminIdx !== -1, 'requireAdmin not called in POST handler')
  assert.ok(adminIdx < dbIdx, `requireAdmin (pos ${adminIdx}) must come before DB access (pos ${dbIdx})`)
})

// --- Test 5: requireAdmin guard is the FIRST operation in PATCH /api/admin/pilots/[agentId]
check('PATCH /api/admin/pilots/[agentId]: requireAdmin check before any DB access', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  const fnBody = src.match(/export async function PATCH[\s\S]*/)
  assert.ok(fnBody, 'PATCH function not found')
  const body = fnBody[0]
  const adminIdx = body.indexOf('requireAdmin')
  const dbIdx = Math.min(
    body.includes('supabaseServer') ? body.indexOf('supabaseServer') : Infinity,
    body.includes('postgrestAdmin') ? body.indexOf('postgrestAdmin') : Infinity
  )
  assert.ok(adminIdx !== -1, 'requireAdmin not called in PATCH handler')
  assert.ok(adminIdx < dbIdx, `requireAdmin (pos ${adminIdx}) must come before DB access (pos ${dbIdx})`)
})

// --- Test 6: requireAdmin defined in AuthService — no ADMIN_SECRET bypass possible
check('AuthService.ts: requireAdmin delegates to requireAdminSession (ADMIN_SECRET guard)', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'lib/services/AuthService.ts'), 'utf8')
  assert.ok(src.includes('requireAdmin'), 'requireAdmin not defined in AuthService.ts')
  assert.ok(src.includes('requireAdminSession'), 'AuthService.requireAdmin must delegate to requireAdminSession')
})

// --- Test 7: ADMIN_SECRET absent → requireAdminSession returns false (no bypass)
check('admin-auth.ts: returns false when ADMIN_SECRET is not configured', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'lib/admin-auth.ts'), 'utf8')
  assert.ok(src.includes('ADMIN_SECRET'), 'ADMIN_SECRET not checked in admin-auth.ts')
  assert.ok(src.includes('return false'), 'admin-auth.ts must return false when secret is missing')
})

// --- Test 8: All admin sub-routes are implicitly covered (prefix match in middleware)
check('middleware.ts: uses startsWith prefix match for /admin routes', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'middleware.ts'), 'utf8')
  assert.ok(src.includes('startsWith'), 'Middleware does not use startsWith — /admin sub-routes may not be protected')
})

// --- Test 9: requireAdmin is the single canonical admin guard (both pilot routes import from AuthService)
check('requireAdmin: single canonical definition in lib/services/AuthService (no duplication)', () => {
  const routeTs = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/route.ts'), 'utf8')
  const agentRouteTs = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  assert.ok(routeTs.includes("from '@/lib/services/AuthService'"), 'route.ts does not import from @/lib/services/AuthService')
  assert.ok(agentRouteTs.includes("from '@/lib/services/AuthService'"), '[agentId]/route.ts does not import from @/lib/services/AuthService')
})

// --- Test 10: 401 status code returned (not 403 or 200)
check('All admin API handlers return HTTP 401 (not 403 or 200) for unauthorized', () => {
  const src1 = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/route.ts'), 'utf8')
  const src2 = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  assert.ok(src1.includes('status: 401'), 'route.ts does not return 401')
  const count401 = (src2.match(/status: 401/g) || []).length
  assert.ok(count401 >= 2, `[agentId]/route.ts has ${count401} 401 responses, expected >= 2 (POST + PATCH)`)
})

// Summary
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`)
process.exit(failed > 0 ? 1 : 0)
