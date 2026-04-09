/**
 * E2E Test: Legacy /api/trial-signup alias route
 * Task ID: 50de9c54-0088-49ac-9681-1acc07927480
 * 
 * Verifies that the /api/trial-signup alias route exists and correctly
 * forwards to /api/auth/trial-signup so legacy paths don't 404.
 * 
 * Run with: node tests/50de9c54-legacy-trial-signup-alias.test.js
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`  PASS: ${name}`)
    passed++
  } catch (e) {
    console.log(`  FAIL: ${name}`)
    console.log(`       ${e.message}`)
    failed++
  }
}

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard')
const ALIAS_ROUTE = path.join(DASHBOARD_DIR, 'app/api/trial-signup/route.ts')
const CANONICAL_ROUTE = path.join(DASHBOARD_DIR, 'app/api/auth/trial-signup/route.ts')

console.log('\nLegacy /api/trial-signup Alias Route Tests')
console.log('='.repeat(50))

// 1. Alias route file exists
test('alias route file exists at app/api/trial-signup/route.ts', () => {
  assert.ok(fs.existsSync(ALIAS_ROUTE), `Missing: ${ALIAS_ROUTE}`)
})

// 2. Canonical route file exists
test('canonical route file exists at app/api/auth/trial-signup/route.ts', () => {
  assert.ok(fs.existsSync(CANONICAL_ROUTE), `Missing: ${CANONICAL_ROUTE}`)
})

const aliasContent = fs.existsSync(ALIAS_ROUTE) ? fs.readFileSync(ALIAS_ROUTE, 'utf8') : ''
const canonicalContent = fs.existsSync(CANONICAL_ROUTE) ? fs.readFileSync(CANONICAL_ROUTE, 'utf8') : ''

// 3. Alias imports from canonical path
test('alias route imports from @/app/api/auth/trial-signup/route', () => {
  assert.ok(
    aliasContent.includes("from '@/app/api/auth/trial-signup/route'"),
    `Expected import from canonical path. Got:\n${aliasContent}`
  )
})

// 4. Alias exports POST handler
test('alias route exports POST (re-exports canonical handler)', () => {
  assert.ok(
    aliasContent.includes('POST'),
    `Expected POST export in alias route. Got:\n${aliasContent}`
  )
})

// 5. Alias does NOT define its own POST implementation (must delegate, not duplicate)
test('alias route does not duplicate POST logic (delegates only)', () => {
  // Should not contain business logic markers: json(, bcrypt, jwt, insert(
  const businessLogicPatterns = ['bcrypt', 'jwt.sign', '.insert(', 'NextResponse.json(']
  for (const pattern of businessLogicPatterns) {
    assert.ok(
      !aliasContent.includes(pattern),
      `Alias route contains business logic ('${pattern}') — it should only re-export`
    )
  }
})

// 6. Canonical route exports async POST function
test('canonical route exports async POST function', () => {
  assert.ok(
    canonicalContent.includes('export async function POST'),
    'Expected "export async function POST" in canonical route'
  )
})

// 7. Alias does not export GET, PUT, PATCH, DELETE (no widening of the API surface)
test('alias route does not export GET/PUT/PATCH/DELETE', () => {
  const forbidden = ['export { ', 'export function GET', 'export function PUT', 'export function PATCH', 'export function DELETE']
  // Only check for extra exports beyond POST
  const aliasLines = aliasContent.split('\n').filter(l => l.includes('export') && !l.includes('POST') && !l.includes('authTrialSignupPOST'))
  assert.strictEqual(
    aliasLines.length,
    0,
    `Unexpected exports in alias route:\n${aliasLines.join('\n')}`
  )
})

// 8. Canonical route validates required fields (no bypass via alias)
test('canonical route validates email and password fields', () => {
  assert.ok(
    canonicalContent.includes("'Email and password are required'"),
    'Canonical route must validate required fields'
  )
})

// 9. Canonical route sets trial_start_date (regression: was previously NULL)
test('canonical route sets trial_start_date on insert', () => {
  assert.ok(
    canonicalContent.includes('trial_start_date'),
    'trial_start_date must be set in the INSERT payload'
  )
})

// 10. No hardcoded secrets in alias route
test('alias route contains no hardcoded secrets', () => {
  const secretPatterns = [/sk_live_[a-zA-Z0-9]+/, /sk_test_[a-zA-Z0-9]+/, /password\s*=\s*["'][^"']+["']/, /secret\s*=\s*["'][^"']{8,}["']/i]
  for (const pattern of secretPatterns) {
    assert.ok(
      !pattern.test(aliasContent),
      `Potential hardcoded secret matched pattern ${pattern} in alias route`
    )
  }
})

console.log('\n' + '='.repeat(50))
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log('='.repeat(50) + '\n')

process.exit(failed > 0 ? 1 : 0)
