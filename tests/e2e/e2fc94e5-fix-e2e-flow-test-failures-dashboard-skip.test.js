/**
 * E2E Test: Fix E2E Flow Test Failures — dashboard-no-errors skip on no-user
 * Task: e2fc94e5-5449-425f-a21f-02b5f4b9a16e (source) / 4b392957 (hand-ship)
 *
 * Root cause: test_dashboard_no_errors returned exit 1 (critical fail) when no
 * agents with onboarding_completed=true and a valid plan existed. This creates
 * false-positive critical failures that spawn fix tasks in a loop.
 *
 * Fix: exit code 42 = skip (precondition not met). run_test now records status
 * "skip" and does NOT increment FAILED or trigger critical_failed. The test still
 * runs and fails correctly when a user exists but the dashboard errors out.
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

// ── Test 1: SKIPPED counter is declared ───────────────────────────────────────
{
  const hasSkippedCounter = /^SKIPPED=0$/m.test(content)
  if (hasSkippedCounter) {
    pass('SKIPPED=0 counter declared at top of script')
  } else {
    fail('SKIPPED=0 counter declared', 'not found in script')
  }
}

// ── Test 2: run_test captures exit code rather than using if/else ─────────────
{
  const hasExitCodeCapture = /eval "\$4" \|\| exit_code=\$\?/.test(content)
  if (hasExitCodeCapture) {
    pass('run_test captures exit code with "eval \\"$4\\" || exit_code=$?"')
  } else {
    fail('run_test captures exit code', 'pattern "eval \\"$4\\" || exit_code=$?" not found')
  }
}

// ── Test 3: exit code 42 produces status=skip ─────────────────────────────────
{
  const hasSkipBranch = /"\$exit_code" -eq 42/.test(content)
  if (hasSkipBranch) {
    pass('run_test has skip branch for exit code 42')
  } else {
    fail('run_test has skip branch', 'no [ "$exit_code" -eq 42 ] found')
  }
}

// ── Test 4: test_dashboard_no_errors returns 42 on no-user ────────────────────
{
  const fnMatch = content.match(/test_dashboard_no_errors\(\)\s*\{([\s\S]*?)^\}/m)
  if (!fnMatch) {
    fail('test_dashboard_no_errors function', 'not found in script')
  } else {
    const fnBody = fnMatch[1]
    const hasSkipReturn = /\[ -z "\$user_id" \] && return 42/.test(fnBody)
    if (hasSkipReturn) {
      pass('test_dashboard_no_errors returns 42 when no valid user found')
    } else {
      fail('test_dashboard_no_errors returns 42 on no-user',
        'still using "return 1" for no-user case — will produce false-positive critical failures')
    }
  }
}

// ── Test 5: JSON output includes skipped field ────────────────────────────────
{
  // In the raw shell file, double-quotes inside echo strings are escaped as \"
  // so we look for the literal pattern \"skipped\":$SKIPPED
  const hasSkippedInJson = /\\"skipped\\":\$SKIPPED/.test(content)
  if (hasSkippedInJson) {
    pass('JSON output includes "skipped":$SKIPPED field')
  } else {
    fail('JSON output includes skipped field', '"skipped":$SKIPPED not in output line')
  }
}

// ── Test 6: TOTAL includes SKIPPED in count ───────────────────────────────────
{
  const totalIncludesSkipped = /TOTAL=\$\(\(PASSED \+ FAILED \+ SKIPPED\)\)/.test(content)
  if (totalIncludesSkipped) {
    pass('TOTAL computation includes SKIPPED')
  } else {
    fail('TOTAL includes SKIPPED', 'TOTAL=$((PASSED + FAILED + SKIPPED)) not found')
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
process.exit(failed > 0 ? 1 : 0)
