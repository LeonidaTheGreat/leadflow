/**
 * E2E Test: Fix E2E Flow Test Failures (dashboard-no-errors — 3xx redirect hardening)
 * Task: 8aba9d4e-e8cc-478b-a7d5-55e90d6b7941
 *
 * Root cause: when the Cloudflare tunnel is slow from Vercel's side, the middleware's
 * 5s PostgREST timeout expires during session validation. The user is treated as
 * unauthenticated → middleware emits a 3xx redirect to /login → curl returns 3xx
 * status with no 'Lead Feed' content → test retries but sleeps only 5s.
 * If the tunnel stays slow for 15s+ all 3 attempts fail.
 *
 * Fix: explicit 3xx redirect detection with 10s sleep (vs 5s for other errors) to
 * give the tunnel more recovery time between attempts. General error sleep also
 * increased from 5s to 7s to reduce the chance of all 3 attempts falling in the
 * same slow tunnel window.
 *
 * Validates:
 * 1. The session/dashboard retry loop is present (for attempt in 1 2 3)
 * 2. Explicit 3xx redirect branch is present in the loop
 * 3. 3xx branch sleeps ≥ 7s (longer than the 5s default, to allow tunnel recovery)
 * 4. User lookup retry loop is still present (regression guard for PR #1921)
 * 5. Session creation and dashboard load are inside the retry loop (regression guard for PR #1846)
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')

const SCRIPT = path.resolve(__dirname, '../../scripts/e2e-flow-tests.sh')

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

const content = fs.readFileSync(SCRIPT, 'utf8')

const fnMatch = content.match(/test_dashboard_no_errors\(\)\s*\{([\s\S]*?)^\}/m)
if (!fnMatch) {
  fail('function exists', 'test_dashboard_no_errors not found in script')
  process.exit(1)
}
const fnBody = fnMatch[1]

// ── Test 1: Session/dashboard retry loop present ───────────────────────────────
{
  const hasLoop = /for attempt in 1 2 3/.test(fnBody)
  if (hasLoop) {
    pass('session/dashboard retry loop present (for attempt in 1 2 3)')
  } else {
    fail('session/dashboard retry loop present', 'no "for attempt in 1 2 3" found in function body')
  }
}

// ── Test 2: Explicit 3xx redirect branch present ──────────────────────────────
// The 3xx branch catches middleware redirects caused by session validation timeouts.
{
  const has3xx = /\[\[ "\$http_status" == 3\*/.test(fnBody)
  if (has3xx) {
    pass('explicit 3xx redirect branch present in dashboard load loop')
  } else {
    fail('explicit 3xx redirect branch present',
      'no `[[ "$http_status" == 3*` branch found — 3xx redirects (session validation timeout) are not explicitly handled')
  }
}

// ── Test 3: 3xx branch uses sleep ≥ 7s ────────────────────────────────────────
// The redirect means the Cloudflare tunnel timed out. Give it more recovery time
// than a generic error (which is already 7s). We verify sleep 10 is used.
{
  // Extract the 3xx branch line
  const lines = fnBody.split('\n')
  const redirect3xxLine = lines.find(l => /\[\[ "\$http_status" == 3\*/.test(l))
  if (redirect3xxLine) {
    const sleepMatch = redirect3xxLine.match(/sleep (\d+)/)
    const sleepSeconds = sleepMatch ? parseInt(sleepMatch[1], 10) : 0
    if (sleepSeconds >= 7) {
      pass(`3xx redirect branch sleeps ${sleepSeconds}s (≥ 7s for tunnel recovery)`)
    } else {
      fail('3xx redirect branch sleep ≥ 7s',
        `3xx branch sleeps only ${sleepSeconds}s — should be ≥ 7s to allow Cloudflare tunnel recovery`)
    }
  } else {
    fail('3xx redirect branch sleep ≥ 7s', '3xx branch not found — cannot check sleep duration')
  }
}

// ── Test 4: User lookup retry loop still present (regression guard PR #1921) ──
{
  const hasLookupLoop = /for lookup_attempt in 1 2 3/.test(fnBody)
  if (hasLookupLoop) {
    pass('user lookup retry loop still present (regression guard PR #1921)')
  } else {
    fail('user lookup retry loop regression guard',
      'no "for lookup_attempt in 1 2 3" — the user lookup retry from PR #1921 was removed')
  }
}

// ── Test 5: Session creation is inside the attempt retry loop ─────────────────
{
  // The raw_token generation (openssl rand) must be inside the `for attempt` loop
  // so each retry creates a fresh session (avoids reusing a potentially invalid one).
  const hasRawTokenInLoop = /for attempt in 1 2 3[\s\S]*?openssl rand/.test(fnBody)
  if (hasRawTokenInLoop) {
    pass('session creation (openssl rand) is inside the attempt retry loop (regression guard PR #1846)')
  } else {
    fail('session creation inside retry loop',
      'openssl rand not found inside "for attempt in 1 2 3" loop — session reuse bug may have regressed')
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
