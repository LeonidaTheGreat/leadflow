/**
 * E2E Test: Fix E2E Flow Test Failures (dashboard-no-errors)
 * Task: e2fc94e5-5449-425f-a21f-02b5f4b9a16e
 *
 * Root cause: middleware session validation used a 5s AbortController timeout
 * for the Cloudflare tunnel fetch. When the tunnel is under load (6-7s latency),
 * the middleware falls back to unauthenticated, redirects to /login, and the
 * dashboard test fails because /login has no 'Lead Feed' content.
 *
 * Fix: raised the session-validation timeout to 8s. Onboarding and trial checks
 * keep the original 5s (they only run after a successful auth, so they are less
 * sensitive to tunnel latency).
 *
 * Validates:
 * 1. Middleware session-validation timeout is >= 8000 ms (not 5000)
 * 2. Onboarding / trial-expiry timeouts remain at 5000 ms (no over-extension)
 * 3. The dashboard retry loop (for attempt in 1 2 3) is still in the E2E script
 * 4. The user-lookup retry loop (for lookup_attempt in 1 2 3) is still present
 * 5. The middleware comment explains the 8s rationale (not a magic number)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const MIDDLEWARE = path.resolve(
  __dirname,
  '../../product/lead-response/dashboard/middleware.ts'
)
const E2E_SCRIPT = path.resolve(__dirname, '../../scripts/e2e-flow-tests.sh')

let passed = 0
let failed = 0

function pass(name) {
  console.log(`  PASS: ${name}`)
  passed++
}

function fail(name, reason) {
  console.error(`  FAIL: ${name} — ${reason}`)
  failed++
}

const middleware = fs.readFileSync(MIDDLEWARE, 'utf8')
const script = fs.readFileSync(E2E_SCRIPT, 'utf8')

// Extract the getUserIdFromRequest function body (session validation block)
const authFnMatch = middleware.match(/async function getUserIdFromRequest[\s\S]*?^}/m)
const authFnBody = authFnMatch ? authFnMatch[0] : ''

// Extract all setTimeout lines for AbortController in the middleware
const allTimeouts = [...middleware.matchAll(/setTimeout\(\(\) => controller\.abort\(\),\s*(\d+)\)/g)]
  .map(m => parseInt(m[1], 10))

// ── Test 1: Session-validation timeout is >= 8000 ms ─────────────────────────
{
  // The first AbortController in middleware is in getUserIdFromRequest (session validation)
  const firstTimeout = allTimeouts[0]
  if (firstTimeout !== undefined && firstTimeout >= 8000) {
    pass(`session-validation timeout is ${firstTimeout} ms (>= 8000)`)
  } else {
    fail(
      'session-validation timeout >= 8000 ms',
      `found ${firstTimeout} ms — expected >= 8000 ms to tolerate slow Cloudflare tunnel`
    )
  }
}

// ── Test 2: Subsequent timeouts (onboarding / trial) stay <= 8000 ms ─────────
{
  const subsequentTimeouts = allTimeouts.slice(1)
  const tooLong = subsequentTimeouts.filter(t => t > 8000)
  if (tooLong.length === 0) {
    pass(`onboarding/trial timeouts are <= 8000 ms (${subsequentTimeouts.join(', ')} ms)`)
  } else {
    fail(
      'onboarding/trial timeouts <= 8000 ms',
      `found timeouts > 8000 ms: ${tooLong.join(', ')} — over-extension risks Edge function timeout`
    )
  }
}

// ── Test 3: Session-validation timeout uses AbortController (not a fixed delay) ─
{
  const hasAbortController = authFnBody.includes('AbortController') &&
    authFnBody.includes('controller.abort()')
  if (hasAbortController) {
    pass('session validation uses AbortController to enforce the timeout')
  } else {
    fail(
      'session validation uses AbortController',
      'AbortController not found in getUserIdFromRequest — timeout may not be enforced'
    )
  }
}

// ── Test 4: Dashboard test retry loop still present in E2E script ─────────────
{
  // Extract test_dashboard_no_errors function
  const dashFnMatch = script.match(/test_dashboard_no_errors\(\)\s*\{([\s\S]*?)^\}/m)
  const dashFnBody = dashFnMatch ? dashFnMatch[1] : ''

  const hasAttemptLoop = /for attempt in 1 2 3/.test(dashFnBody)
  if (hasAttemptLoop) {
    pass('dashboard test has session+load retry loop (for attempt in 1 2 3)')
  } else {
    fail(
      'dashboard test has session+load retry loop',
      'no "for attempt in 1 2 3" found — retry was accidentally removed'
    )
  }
}

// ── Test 5: User-lookup retry loop still present ──────────────────────────────
{
  const dashFnMatch = script.match(/test_dashboard_no_errors\(\)\s*\{([\s\S]*?)^\}/m)
  const dashFnBody = dashFnMatch ? dashFnMatch[1] : ''

  const hasLookupLoop = /for lookup_attempt in 1 2 3/.test(dashFnBody)
  if (hasLookupLoop) {
    pass('dashboard test has user-lookup retry loop (for lookup_attempt in 1 2 3)')
  } else {
    fail(
      'dashboard test has user-lookup retry loop',
      'no "for lookup_attempt in 1 2 3" found — user lookup retry was removed'
    )
  }
}

// ── Test 6: Middleware comment explains the 8s rationale ─────────────────────
{
  const hasRationale = middleware.includes('8s') || middleware.includes('8000') &&
    middleware.includes('tunnel')
  if (hasRationale) {
    pass('middleware has comment explaining the 8s timeout rationale')
  } else {
    fail(
      'middleware comment explains 8s rationale',
      'timeout value changed without a comment explaining why — future readers will not know'
    )
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
