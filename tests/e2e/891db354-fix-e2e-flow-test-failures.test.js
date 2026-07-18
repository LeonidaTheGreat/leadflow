/**
 * E2E Test: Fix E2E Flow Test Failures (dashboard-no-errors)
 * Task: 891db354-7ee1-4033-8d28-87fe177e0e17
 *
 * Validates:
 * 1. test_dashboard_no_errors user lookup has retry logic (3 attempts, 5s apart)
 * 2. User lookup failures no longer immediately fail the test (no bare `|| return 1`)
 * 3. The retry loop exits early on success (`[ -n "$user_id" ] && break`)
 * 4. Session creation and dashboard load retry loop is still present
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

// Extract the test_dashboard_no_errors function body
const fnMatch = content.match(/test_dashboard_no_errors\(\)\s*\{([\s\S]*?)^\}/m)
if (!fnMatch) {
  fail('function exists', 'test_dashboard_no_errors not found in script')
  process.exit(1)
}
const fnBody = fnMatch[1]

// ── Test 1: User lookup wrapped in retry loop ──────────────────────────────────
{
  const hasLookupLoop = /for lookup_attempt in 1 2 3/.test(fnBody)
  if (hasLookupLoop) {
    pass('user lookup has retry loop (for lookup_attempt in 1 2 3)')
  } else {
    fail('user lookup has retry loop', 'no "for lookup_attempt in 1 2 3" found in function body')
  }
}

// ── Test 2: No bare `|| return 1` on curl for user lookup ─────────────────────
// Before the fix, the user lookup had `curl ... || return 1` which meant a single
// tunnel timeout would immediately fail the whole test. After the fix, failures
// fall through via `|| true` and the retry loop handles them.
{
  // The user lookup curls should use `|| true`, not `|| return 1`
  const lines = fnBody.split('\n')
  const lookupCurlLines = lines.filter(l =>
    l.includes('real_estate_agents') && l.includes('curl')
  )
  const bareReturn = lookupCurlLines.filter(l => /\|\|\s*return 1/.test(l))
  if (bareReturn.length === 0) {
    pass('user lookup curl lines do not use bare || return 1')
  } else {
    fail('user lookup curl lines do not use bare || return 1',
      `found ${bareReturn.length} bare return(s): ${bareReturn.join(' | ')}`)
  }
}

// ── Test 3: Retry loop breaks on success ──────────────────────────────────────
{
  const hasBreakOnSuccess = /\[ -n "\$user_id" \] && break/.test(fnBody)
  if (hasBreakOnSuccess) {
    pass('retry loop breaks early when user_id found')
  } else {
    fail('retry loop breaks early when user_id found',
      'no `[ -n "$user_id" ] && break` found in function body')
  }
}

// ── Test 4: Session/dashboard retry loop still present ────────────────────────
{
  const hasSessionLoop = /for attempt in 1 2 3/.test(fnBody)
  if (hasSessionLoop) {
    pass('session creation and dashboard load retry loop still present')
  } else {
    fail('session creation and dashboard load retry loop still present',
      'no "for attempt in 1 2 3" found — existing retry was accidentally removed')
  }
}

// ── Test 5: Sleeps between user lookup retries ────────────────────────────────
{
  const hasSleep = /\[ "\$lookup_attempt" -lt 3 \] && sleep/.test(fnBody)
  if (hasSleep) {
    pass('user lookup retry has sleep between attempts')
  } else {
    fail('user lookup retry has sleep between attempts',
      'no sleep-between-attempts found in lookup retry loop')
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed`)
if (failed > 0) {
  process.exit(1)
}
