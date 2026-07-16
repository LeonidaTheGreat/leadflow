/**
 * E2E Test: Admin email verification override (PR #1878)
 * Task: 5937ff87-42bd-4055-9861-e2e1d23143ec
 * UC: uc-leadflow-maintenance
 *
 * Verifies:
 * 1. API route file exists and exports GET + POST
 * 2. Page file exists with correct UI anchors
 * 3. Auth guard pattern is present on both handlers
 * 4. "all" mode targets only unverified agents
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')

const DASHBOARD = path.resolve(__dirname, '../../product/lead-response/dashboard')
const ROUTE_FILE = path.join(DASHBOARD, 'app/api/admin/verify-email/route.ts')
const PAGE_FILE = path.join(DASHBOARD, 'app/admin/email-verification/page.tsx')

let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
    passed++
  } catch (err) {
    console.log(`FAIL: ${name}`)
    console.log(`  ${err.message}`)
    failed++
  }
}

console.log('=== E2E: Admin Email Verification Override (PR #1878) ===\n')

// ── API route checks ────────────────────────────────────────────────────────

assert.ok(fs.existsSync(ROUTE_FILE), `Route file missing: ${ROUTE_FILE}`)
const route = fs.readFileSync(ROUTE_FILE, 'utf8')

test('Route exports GET handler', () => {
  assert.ok(route.includes('export async function GET'), 'Missing GET export')
})

test('Route exports POST handler', () => {
  assert.ok(route.includes('export async function POST'), 'Missing POST export')
})

test('GET handler requires admin auth', () => {
  const getBlock = route.slice(route.indexOf('export async function GET'))
  assert.ok(getBlock.includes('requireAdmin'), 'GET handler missing requireAdmin check')
})

test('POST handler requires admin auth', () => {
  const postBlock = route.slice(route.indexOf('export async function POST'))
  assert.ok(postBlock.includes('requireAdmin'), 'POST handler missing requireAdmin check')
})

test('POST handler validates agentId or all required', () => {
  assert.ok(route.includes('agentId or all required'), 'Missing validation for missing agentId/all')
})

test('"all" mode only updates unverified agents (eq email_verified false)', () => {
  assert.ok(
    route.includes('.eq(\'email_verified\', false)'),
    'Update query does not filter to email_verified=false — could overwrite verified agents'
  )
})

test('Auth returns 401 on failure', () => {
  assert.ok(route.includes("{ status: 401 }"), 'Missing 401 response for unauthorized')
})

test('No hardcoded credentials in route', () => {
  const forbidden = ['password', 'secret', 'sk_live', 'api_key']
  for (const term of forbidden) {
    assert.ok(!route.toLowerCase().includes(term), `Potential secret: "${term}" found in route`)
  }
})

// ── Page component checks ───────────────────────────────────────────────────

assert.ok(fs.existsSync(PAGE_FILE), `Page file missing: ${PAGE_FILE}`)
const page = fs.readFileSync(PAGE_FILE, 'utf8')

test('Page has verify-all button testid', () => {
  assert.ok(page.includes('data-testid="verify-all-btn"'), 'Missing data-testid="verify-all-btn"')
})

test('Page has verify-email-table testid', () => {
  assert.ok(page.includes('data-testid="verify-email-table"'), 'Missing data-testid="verify-email-table"')
})

test('Page redirects to admin login on 401', () => {
  assert.ok(page.includes('/admin/login'), 'Page does not redirect to /admin/login on 401')
})

test('Page fetches from /api/admin/verify-email', () => {
  assert.ok(page.includes('/api/admin/verify-email'), 'Page does not call the correct API endpoint')
})

// ── Landing page urgency text check ────────────────────────────────────────

const LANDING = path.join(DASHBOARD, 'app/page.tsx')
assert.ok(fs.existsSync(LANDING), `Landing page missing: ${LANDING}`)
const landing = fs.readFileSync(LANDING, 'utf8')

test('Landing page urgency banner uses "pilot spots" wording', () => {
  assert.ok(
    landing.includes('Only 10 pilot spots remaining'),
    'Expected "Only 10 pilot spots remaining" in urgency banner'
  )
})

// ── Summary ────────────────────────────────────────────────────────────────

console.log('\n=== REPORT ===')
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)

if (failed > 0) process.exit(1)
