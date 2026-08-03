/**
 * E2E Test: PR #2183 — convert API_KEY/session precondition failures to skip (42)
 * Branch: dev/27f6e4c8-fix-e2e-flow-test-failures-1-critical
 *
 * Root cause: tests 8 (reset-password-chain), 10 (dashboard-no-errors), 11
 * (billing-no-errors) and 12 (sms-stats-no-crash) returned exit 1 (critical fail)
 * when API_KEY was not set in the run environment (e.g. worktrees/CI without
 * product/lead-response/dashboard/.env.local), even though a missing API_KEY is
 * an environment precondition, not a code defect. This produced false-positive
 * critical failures.
 *
 * Fix: those API_KEY guards — and, in tests 11/12, the session-lookup curl and
 * empty-token checks that follow — now `return 42` (skip) instead of `return 1`
 * (fail), matching the pattern already used by test_dashboard_no_errors's
 * no-user-found branch.
 */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

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

function fnBody(fnName) {
  const m = content.match(new RegExp(`${fnName}\\(\\)\\s*\\{([\\s\\S]*?)^\\}`, 'm'))
  return m ? m[1] : null
}

// ── Static: the 4 fixed functions no longer fail on missing API_KEY ───────────
for (const [fnName, label] of [
  ['test_reset_password_chain', 'reset-password-chain (test 8)'],
  ['test_dashboard_no_errors', 'dashboard-no-errors (test 10)'],
  ['test_billing_no_errors', 'billing-no-errors (test 11)'],
  ['test_sms_stats_no_crash', 'sms-stats-no-crash (test 12)'],
]) {
  const body = fnBody(fnName)
  if (!body) {
    fail(`${label} function present`, `${fnName} not found in script`)
    continue
  }
  if (/\[ -z "\$\{API_KEY:-\}" \] && return 42/.test(body)) {
    pass(`${label} skips (42) rather than fails when API_KEY is missing`)
  } else {
    fail(`${label} API_KEY skip`, 'still uses "return 1" for missing API_KEY')
  }
}

// ── Static: billing/sms-stats also skip on session-lookup infra failure ───────
for (const [fnName, label] of [
  ['test_billing_no_errors', 'billing-no-errors (test 11)'],
  ['test_sms_stats_no_crash', 'sms-stats-no-crash (test 12)'],
]) {
  const body = fnBody(fnName)
  const sessionCurlSkips = /apikey: \$API_KEY" 2>\/dev\/null\) \|\| return 42/.test(body)
  const emptyTokenSkips = /\[ -z "\$token" \] && return 42/.test(body)
  if (sessionCurlSkips) {
    pass(`${label} skips (42) when session lookup curl fails`)
  } else {
    fail(`${label} session-curl skip`, 'session lookup failure still returns 1')
  }
  if (emptyTokenSkips) {
    pass(`${label} skips (42) when no session token exists`)
  } else {
    fail(`${label} empty-token skip`, 'empty token still returns 1')
  }
}

// ── Static: test 8's precondition on E2E_EMAIL is untouched (out of scope) ────
{
  const body = fnBody('test_reset_password_chain')
  if (body && /\[ -z "\$\{E2E_EMAIL:-\}" \] && return 1/.test(body)) {
    pass('reset-password-chain still fails (not skips) when E2E_EMAIL is missing — unrelated precondition, correctly untouched')
  } else {
    fail('reset-password-chain E2E_EMAIL guard unchanged', 'E2E_EMAIL guard was unexpectedly modified')
  }
}

// ── Live: actually run the script in this environment (no API_KEY configured
//    here — no .env/.env.local under product/lead-response/dashboard) and
//    verify the real runtime behavior: tests 8/10/11/12 skip, nothing fails,
//    and the overall script exits 0. Best-effort — network-dependent.
{
  const hasApiKey = !!(process.env.LEADFLOW_API_KEY || process.env.API_SECRET_KEY)
  const result = spawnSync('bash', [SCRIPT, '--json'], {
    cwd: path.resolve(__dirname, '../..'),
    timeout: 90000,
    encoding: 'utf8',
  })

  if (result.error || result.status === null) {
    console.log(`  SKIP: live script run unavailable (${result.error ? result.error.message : 'timed out'}) — network/infra dependent, not asserting`)
  } else {
    let json
    try {
      json = JSON.parse(result.stdout.trim())
    } catch (e) {
      fail('live script run produces valid JSON', `could not parse stdout: ${e.message}`)
      json = null
    }

    if (json) {
      assert.strictEqual(result.status, 0, `script should exit 0, got ${result.status}`)
      pass('live script run exits 0')

      assert.strictEqual(json.critical_failed, 0, `expected 0 critical failures, got ${json.critical_failed}`)
      pass('live script run has 0 critical failures')

      if (!hasApiKey) {
        // Without an API_KEY configured in this worktree, tests 8/10/11/12 must
        // skip (not fail) — this is exactly the regression PR #2183 fixes.
        const byId = Object.fromEntries(json.results.map((r) => [r.id, r.status]))
        for (const id of ['reset-password-chain', 'dashboard-no-errors', 'billing-no-errors', 'sms-stats-no-crash']) {
          if (byId[id] === 'skip') {
            pass(`live run: ${id} status is "skip" (no API_KEY in this worktree)`)
          } else {
            fail(`live run: ${id} skips without API_KEY`, `status was "${byId[id]}", expected "skip"`)
          }
        }
      } else {
        console.log('  SKIP: API_KEY is set in this environment — skip-on-missing-key assertions not applicable')
      }
    }
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`)
process.exit(failed > 0 ? 1 : 0)
