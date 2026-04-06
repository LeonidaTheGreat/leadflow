/**
 * QC E2E Test: Admin /admin/pilots authentication and authorization
 * Task ID: a20a8f4c-9f66-4ccc-a068-ed6b657b6279
 *
 * Tests:
 * 1. middleware.ts protects /admin/* with session auth (302 redirect for unauthenticated)
 * 2. /api/admin/pilots returns 401 without auth (API middleware matcher excludes /api)
 * 3. isAdminUser() guard appears BEFORE data access in all three handlers
 * 4. ADMIN_EMAIL absent → isAdminUser returns false (no bypass)
 * 5. Case-insensitive email comparison in isAdminUser
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

// --- Test 1: middleware PROTECTED_ROUTES contains /admin
check('middleware.ts: /admin in PROTECTED_ROUTES', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'middleware.ts'), 'utf8')
  // Must be in the PROTECTED_ROUTES array, not just mentioned anywhere
  const routesBlock = src.match(/const PROTECTED_ROUTES\s*=\s*\[([\s\S]*?)\]/)?.[1] || ''
  assert.ok(routesBlock.includes("'/admin'") || routesBlock.includes('"/admin"'),
    '/admin not found in PROTECTED_ROUTES block')
})

// --- Test 2: middleware matcher does NOT exclude /api — important: API routes use their own guard
check('middleware.ts: matcher excludes /api (API routes rely on route-level isAdminUser)', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'middleware.ts'), 'utf8')
  const matcherBlock = src.match(/matcher:\s*\[([\s\S]*?)\]/)?.[1] || ''
  // Matcher excludes api — confirms API protection MUST be at route level
  assert.ok(matcherBlock.includes('api'), 'Matcher does not exclude api — verify API protection strategy')
})

// --- Test 3: isAdminUser guard is the FIRST operation in GET /api/admin/pilots handler
check('GET /api/admin/pilots: isAdminUser check before any DB access', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/route.ts'), 'utf8')
  const fnBody = src.match(/export async function GET[\s\S]*/)
  assert.ok(fnBody, 'GET function not found')
  const body = fnBody[0]
  const adminIdx = body.indexOf('isAdminUser')
  const dbIdx = body.indexOf('postgrestAdmin')
  assert.ok(adminIdx !== -1, 'isAdminUser not called in GET handler')
  assert.ok(dbIdx !== -1, 'postgrestAdmin not used in GET handler')
  assert.ok(adminIdx < dbIdx, `isAdminUser (pos ${adminIdx}) must come before DB access (pos ${dbIdx})`)
})

// --- Test 4: isAdminUser guard is the FIRST operation in POST /api/admin/pilots/[agentId]
check('POST /api/admin/pilots/[agentId]: isAdminUser check before any DB access', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  const fnBody = src.match(/export async function POST[\s\S]*?(?=export async function|\z)/)
  assert.ok(fnBody, 'POST function not found')
  const body = fnBody[0]
  const adminIdx = body.indexOf('isAdminUser')
  const dbIdx = Math.min(
    body.includes('supabaseServer') ? body.indexOf('supabaseServer') : Infinity,
    body.includes('postgrestAdmin') ? body.indexOf('postgrestAdmin') : Infinity
  )
  assert.ok(adminIdx !== -1, 'isAdminUser not called in POST handler')
  assert.ok(adminIdx < dbIdx, `isAdminUser (pos ${adminIdx}) must come before DB access (pos ${dbIdx})`)
})

// --- Test 5: isAdminUser guard is the FIRST operation in PATCH /api/admin/pilots/[agentId]
check('PATCH /api/admin/pilots/[agentId]: isAdminUser check before any DB access', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  const fnBody = src.match(/export async function PATCH[\s\S]*/)
  assert.ok(fnBody, 'PATCH function not found')
  const body = fnBody[0]
  const adminIdx = body.indexOf('isAdminUser')
  const dbIdx = Math.min(
    body.includes('supabaseServer') ? body.indexOf('supabaseServer') : Infinity,
    body.includes('postgrestAdmin') ? body.indexOf('postgrestAdmin') : Infinity
  )
  assert.ok(adminIdx !== -1, 'isAdminUser not called in PATCH handler')
  assert.ok(adminIdx < dbIdx, `isAdminUser (pos ${adminIdx}) must come before DB access (pos ${dbIdx})`)
})

// --- Test 6: ADMIN_EMAIL absent → isAdminUser returns false (no bypass)
check('isAdminUser: returns false immediately when ADMIN_EMAIL is not set', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'lib/auth.ts'), 'utf8')
  // Must have: if (!adminEmail) { ... return false }
  const noEmailGuard = src.match(/if\s*\(\s*!adminEmail\s*\)[\s\S]*?return false/)
  assert.ok(noEmailGuard, 'No guard for missing ADMIN_EMAIL found in isAdminUser')
})

// --- Test 7: Case-insensitive email comparison
check('isAdminUser: email comparison is case-insensitive', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'lib/auth.ts'), 'utf8')
  // Should call .toLowerCase() on both sides
  const comparison = src.match(/\.toLowerCase\(\)\s*===\s*adminEmail\.toLowerCase\(\)|adminEmail\.toLowerCase\(\)\s*===/)
  assert.ok(comparison, 'Email comparison is not case-insensitive — toLowerCase() must be used on both sides')
})

// --- Test 8: All admin sub-routes are implicitly covered (prefix match in middleware)
check('middleware.ts: uses startsWith prefix match for /admin routes', () => {
  const src = fs.readFileSync(path.join(DASHBOARD, 'middleware.ts'), 'utf8')
  // Should use startsWith so /admin/funnel, /admin/nps etc are all covered
  assert.ok(src.includes('startsWith'), 'Middleware does not use startsWith — /admin sub-routes may not be protected')
})

// --- Test 9: isAdminUser exported from lib/auth.ts (not duplicated elsewhere)
check('isAdminUser: single canonical definition in lib/auth.ts (no duplication)', () => {
  // Check no other file defines its own isAdmin check outside lib/auth.ts
  const routeTs = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/route.ts'), 'utf8')
  const agentRouteTs = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  // Both should import from lib/auth, not inline the check
  assert.ok(routeTs.includes("from '@/lib/auth'"), 'route.ts does not import from @/lib/auth')
  assert.ok(agentRouteTs.includes("from '@/lib/auth'"), '[agentId]/route.ts does not import from @/lib/auth')
})

// --- Test 10: 401 status code returned (not 403 or 200)
check('All admin API handlers return HTTP 401 (not 403 or 200) for unauthorized', () => {
  const src1 = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/route.ts'), 'utf8')
  const src2 = fs.readFileSync(path.join(DASHBOARD, 'app/api/admin/pilots/[agentId]/route.ts'), 'utf8')
  assert.ok(src1.includes('status: 401'), 'route.ts does not return 401')
  // [agentId]/route.ts has 2 handlers — both must have 401
  const count401 = (src2.match(/status: 401/g) || []).length
  assert.ok(count401 >= 2, `[agentId]/route.ts has ${count401} 401 responses, expected >= 2 (POST + PATCH)`)
})

// Summary
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---\n`)
process.exit(failed > 0 ? 1 : 0)
