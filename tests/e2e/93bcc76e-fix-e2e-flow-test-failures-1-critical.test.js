/**
 * QC E2E Test — Task 93bcc76e-b29e-4b2e-8cff-c0b5e263152e
 * Fix: E2E flow test failures (1 critical) — dashboard-no-errors
 *
 * Root cause: test_dashboard_no_errors searched for pre-existing agents with
 * onboarding_completed=true and non-expired trials, but all such agents had
 * expired trials (2026-04-10, 2026-04-13, 2026-04-26 — all before 2026-05-12).
 * Fix: use the freshly created E2E trial user (14-day trial), patching
 * onboarding_completed=true before dashboard session creation.
 *
 * Validates:
 * 1. e2e-flow-tests.sh references E2E_EMAIL to use the fresh trial user
 * 2. e2e-flow-tests.sh patches onboarding_completed=true for that user
 * 3. Running the script produces 0 critical failures (12/12 pass)
 */

'use strict'
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/e2e-flow-tests.sh')
const PROJECT_DIR = path.resolve(__dirname, '../..')

// ── Test 1: Script exists ─────────────────────────────────────────────────────
{
  assert(fs.existsSync(SCRIPT_PATH), `FAIL: e2e-flow-tests.sh not found at ${SCRIPT_PATH}`)
  console.log('PASS: e2e-flow-tests.sh exists')
}

// ── Test 2: Fix is present — E2E_EMAIL path and onboarding patch ──────────────
{
  const content = fs.readFileSync(SCRIPT_PATH, 'utf8')
  assert(
    content.includes('E2E_EMAIL'),
    'FAIL: test_dashboard_no_errors does not use E2E_EMAIL from test_trial_signup_flow'
  )
  assert(
    content.includes('"onboarding_completed":true'),
    'FAIL: test_dashboard_no_errors does not PATCH onboarding_completed=true for the E2E user'
  )
  assert(
    content.includes('real_estate_agents?id=eq.$user_id'),
    'FAIL: PATCH target must filter by agent id (real_estate_agents?id=eq.$user_id)'
  )
  console.log('PASS: Fix is present — E2E_EMAIL path and onboarding_completed PATCH')
}

// ── Test 3: Run the E2E flow script — 0 critical failures ────────────────────
{
  console.log('Running e2e-flow-tests.sh --json (30-60s)...')
  let output
  try {
    output = execSync(`bash "${SCRIPT_PATH}" --json`, {
      cwd: PROJECT_DIR,
      timeout: 120000,
      encoding: 'utf8',
      env: { ...process.env }
    }).trim()
  } catch (err) {
    output = (err.stdout || '').trim()
    if (!output) {
      console.error('FAIL: e2e-flow-tests.sh failed with no JSON output:', err.message)
      process.exit(1)
    }
  }

  let data
  try {
    data = JSON.parse(output)
  } catch (e) {
    console.error('FAIL: Could not parse e2e-flow-tests.sh JSON output:', output.slice(-500))
    process.exit(1)
  }

  const critFails = (data.results || []).filter(r => r.status === 'fail' && r.severity === 'critical')
  assert.strictEqual(
    data.critical_failed, 0,
    `FAIL: ${data.critical_failed} critical E2E failure(s): ${JSON.stringify(critFails)}`
  )
  assert(
    data.passed >= 11,
    `FAIL: Expected at least 11 passes, got ${data.passed}/${data.total}`
  )

  const dashResult = (data.results || []).find(r => r.id === 'dashboard-no-errors')
  assert(dashResult, 'FAIL: dashboard-no-errors test not found in results')
  assert.strictEqual(dashResult.status, 'pass', 'FAIL: dashboard-no-errors still failing')

  console.log(`PASS: E2E flow tests: ${data.passed}/${data.total} passed, 0 critical failures`)
  console.log(`PASS: dashboard-no-errors: ${dashResult.status}`)
}

console.log('\nALL CHECKS PASSED — dashboard-no-errors fix verified.')
