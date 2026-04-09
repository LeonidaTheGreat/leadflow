/**
 * E2E test for task 65f36537 — Fix: E2E flow test failures (2 critical)
 * PR #1053 — branch: dev/cd5e6ccf-fix-e2e-flow-test-failures-2-critical-
 *
 * Validates:
 * 1. No merge conflict markers remain in the two fixed test files
 * 2. bcrypt-password-verify.test.ts mocks @/lib/db (not @supabase/supabase-js) for auth routes
 * 3. upgrade-checkout.test.ts uses correct PostgREST API URL (not Supabase URL)
 * 4. Both test files are syntactically valid (no leftover conflict syntax)
 * 5. makeMockQueryBuilder is present and correctly structured
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const DASHBOARD_TESTS = path.join(__dirname, '../../product/lead-response/dashboard/__tests__')
const BCRYPT_TEST = path.join(DASHBOARD_TESTS, 'bcrypt-password-verify.test.ts')
const UPGRADE_TEST = path.join(DASHBOARD_TESTS, 'upgrade-checkout.test.ts')

// Helpers
function readFile(filePath) {
  assert.ok(fs.existsSync(filePath), `File must exist: ${filePath}`)
  return fs.readFileSync(filePath, 'utf-8')
}

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`  FAIL: ${name}`)
    console.error(`        ${err.message}`)
    failed++
  }
}

console.log('\nE2E Test: Fix E2E flow test failures (2 critical)\n')

// --- bcrypt-password-verify.test.ts ---
console.log('bcrypt-password-verify.test.ts:')
const bcryptContent = readFile(BCRYPT_TEST)

test('No merge conflict markers (<<<<<<)', () => {
  assert.ok(!bcryptContent.includes('<<<<<<<'), 'Found <<<<<< conflict marker')
})

test('No merge conflict markers (=======)', () => {
  // avoid matching the one in this test file
  const lines = bcryptContent.split('\n')
  const conflictLines = lines.filter(l => l.trim() === '=======')
  assert.strictEqual(conflictLines.length, 0, `Found ======= conflict separator on ${conflictLines.length} lines`)
})

test('No merge conflict markers (>>>>>>>)', () => {
  assert.ok(!bcryptContent.includes('>>>>>>>'), 'Found >>>>>>> conflict marker')
})

test('Mocks @/lib/db not @supabase/supabase-js for primary DB mock', () => {
  assert.ok(bcryptContent.includes("jest.mock('@/lib/db'"), "Expected jest.mock('@/lib/db') — auth routes use PostgREST, not Supabase SDK")
})

test('makeMockQueryBuilder function is present', () => {
  assert.ok(bcryptContent.includes('function makeMockQueryBuilder'), 'makeMockQueryBuilder must be defined')
})

test('QueryBuilder has maybeSingle method', () => {
  assert.ok(bcryptContent.includes('maybeSingle'), 'maybeSingle must be included in mock builder')
})

test('QueryBuilder has then() for promise-like usage', () => {
  assert.ok(bcryptContent.includes('qb.then'), 'qb.then must exist to allow awaiting the builder directly')
})

test('postgrestAdmin and postgrestPublic are mocked', () => {
  assert.ok(bcryptContent.includes('postgrestAdmin'), 'postgrestAdmin must be mocked')
  assert.ok(bcryptContent.includes('postgrestPublic'), 'postgrestPublic must be mocked')
})

test('Uses PostgREST URL (not Supabase URL) in env setup', () => {
  assert.ok(
    bcryptContent.includes('http://localhost:8788/rest/v1'),
    'NEXT_PUBLIC_API_URL must point to PostgREST endpoint, not Supabase'
  )
  assert.ok(!bcryptContent.includes('supabase.co'), 'No supabase.co references should remain in env setup')
})

test('Session mocks are present (createSession, logSessionStart)', () => {
  assert.ok(bcryptContent.includes("jest.mock('@/lib/session'"), 'session mock missing')
  assert.ok(bcryptContent.includes('createSession'), 'createSession mock missing')
})

// --- upgrade-checkout.test.ts ---
console.log('\nupgrade-checkout.test.ts:')
const upgradeContent = readFile(UPGRADE_TEST)

test('No merge conflict markers (<<<<<<)', () => {
  assert.ok(!upgradeContent.includes('<<<<<<<'), 'Found <<<<<< conflict marker')
})

test('No merge conflict markers (>>>>>>>)', () => {
  assert.ok(!upgradeContent.includes('>>>>>>>'), 'Found >>>>>>> conflict marker')
})

test('Uses PostgREST URL not Supabase URL', () => {
  assert.ok(
    upgradeContent.includes('http://localhost:8788/rest/v1'),
    'NEXT_PUBLIC_API_URL must be PostgREST URL'
  )
  assert.ok(
    !upgradeContent.includes('supabase.co'),
    'Supabase URL must not appear in upgrade-checkout env setup'
  )
})

// --- Summary ---
console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
if (failed > 0) {
  process.exit(1)
}
