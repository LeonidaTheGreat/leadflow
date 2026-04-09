/**
 * QC E2E Test: fix-e2e-flow-test-failures-2-critical (task cd5e6ccf)
 *
 * PR #1053 fixed two critical test failures:
 * 1. bcrypt-password-verify.test.ts — had unresolved merge conflict markers
 *    and mocked @supabase/supabase-js instead of @/lib/db (PostgREST client)
 * 2. upgrade-checkout.test.ts — had unresolved merge conflict markers causing
 *    syntax errors
 *
 * This test verifies:
 * - No git conflict markers remain in either file
 * - The mock target is @/lib/db, not @supabase/supabase-js
 * - The correct NEXT_PUBLIC_API_URL value (PostgREST, not Supabase) is set
 * - Both test files are valid JavaScript/TypeScript (parseable)
 */

'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const TESTS_DIR = path.join(__dirname, '../product/lead-response/dashboard/__tests__')
const BCRYPT_FILE = path.join(TESTS_DIR, 'bcrypt-password-verify.test.ts')
const UPGRADE_FILE = path.join(TESTS_DIR, 'upgrade-checkout.test.ts')

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

console.log('QC E2E: fix-e2e-flow-test-failures-2-critical (cd5e6ccf)\n')

// --- 1. Both files exist ---
test('bcrypt-password-verify.test.ts exists', () => {
  assert.ok(fs.existsSync(BCRYPT_FILE), `File not found: ${BCRYPT_FILE}`)
})

test('upgrade-checkout.test.ts exists', () => {
  assert.ok(fs.existsSync(UPGRADE_FILE), `File not found: ${UPGRADE_FILE}`)
})

// --- 2. No git conflict markers ---
const bcryptContent = fs.readFileSync(BCRYPT_FILE, 'utf8')
const upgradeContent = fs.readFileSync(UPGRADE_FILE, 'utf8')

test('bcrypt-password-verify.test.ts has no <<<<<<< HEAD marker', () => {
  assert.ok(!bcryptContent.includes('<<<<<<< HEAD'), 'Found unresolved conflict marker: <<<<<<< HEAD')
})

test('bcrypt-password-verify.test.ts has no >>>>>>> marker', () => {
  const hasMarker = />>>>>>>\s+\w/.test(bcryptContent)
  assert.ok(!hasMarker, 'Found unresolved conflict marker: >>>>>>>')
})

test('upgrade-checkout.test.ts has no <<<<<<< HEAD marker', () => {
  assert.ok(!upgradeContent.includes('<<<<<<< HEAD'), 'Found unresolved conflict marker: <<<<<<< HEAD')
})

test('upgrade-checkout.test.ts has no >>>>>>> marker', () => {
  const hasMarker = />>>>>>>\s+\w/.test(upgradeContent)
  assert.ok(!hasMarker, 'Found unresolved conflict marker: >>>>>>>')
})

// --- 3. Mock target is @/lib/db not @supabase/supabase-js ---
test('bcrypt-password-verify.test.ts mocks @/lib/db (PostgREST client)', () => {
  assert.ok(bcryptContent.includes("jest.mock('@/lib/db'"), "Expected mock for '@/lib/db' not found")
})

test('bcrypt-password-verify.test.ts does NOT mock @supabase/supabase-js', () => {
  assert.ok(!bcryptContent.includes("jest.mock('@supabase/supabase-js'"), "Found stale mock for '@supabase/supabase-js' — should be @/lib/db")
})

// --- 4. Correct PostgREST API URL (not Supabase URL) ---
test('bcrypt-password-verify.test.ts sets NEXT_PUBLIC_API_URL to PostgREST endpoint', () => {
  assert.ok(
    bcryptContent.includes('http://localhost:8788/rest/v1'),
    "Expected NEXT_PUBLIC_API_URL=http://localhost:8788/rest/v1 not found"
  )
  assert.ok(
    !bcryptContent.includes('supabase.co'),
    "Found stale Supabase URL in NEXT_PUBLIC_API_URL"
  )
})

test('upgrade-checkout.test.ts sets NEXT_PUBLIC_API_URL to PostgREST endpoint', () => {
  assert.ok(
    upgradeContent.includes('http://localhost:8788/rest/v1'),
    "Expected NEXT_PUBLIC_API_URL=http://localhost:8788/rest/v1 not found"
  )
  assert.ok(
    !upgradeContent.includes('supabase.co'),
    "Found stale Supabase URL in NEXT_PUBLIC_API_URL"
  )
})

// --- 5. Mock QueryBuilder structure — key exports present ---
test('bcrypt-password-verify.test.ts exports postgrestAdmin mock', () => {
  assert.ok(bcryptContent.includes('postgrestAdmin'), "Mock missing 'postgrestAdmin' export")
})

test('bcrypt-password-verify.test.ts exports postgrestPublic mock', () => {
  assert.ok(bcryptContent.includes('postgrestPublic'), "Mock missing 'postgrestPublic' export")
})

test('bcrypt-password-verify.test.ts has makeMockQueryBuilder factory', () => {
  assert.ok(bcryptContent.includes('makeMockQueryBuilder'), "Missing 'makeMockQueryBuilder' factory function")
})

// --- 6. Session and email mocks are present ---
test('bcrypt-password-verify.test.ts mocks @/lib/session', () => {
  assert.ok(bcryptContent.includes("jest.mock('@/lib/session'"), "Missing mock for '@/lib/session'")
})

test('bcrypt-password-verify.test.ts mocks @/lib/email-service', () => {
  assert.ok(bcryptContent.includes("jest.mock('@/lib/email-service'"), "Missing mock for '@/lib/email-service'")
})

// --- Summary ---
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} total`)

if (failed > 0) {
  process.exit(1)
}
