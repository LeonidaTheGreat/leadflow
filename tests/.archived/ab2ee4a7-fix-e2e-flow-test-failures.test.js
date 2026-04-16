/**
 * QC E2E Test — Fix: E2E flow test failures (dashboard-no-errors)
 * Task ID: ab2ee4a7-3c34-4395-a37c-8f18b16e4081
 *
 * Verifies that scripts/e2e-flow-tests.sh:
 * 1. Excludes expired-trial agents from the dashboard test user selection
 * 2. Prefers non-trial (paid/pilot) agents first
 * 3. Falls back to trial agents with trial_ends_at > now
 * 4. Removes the old broken query (ordered by created_at desc, no trial filter)
 * 5. Maintains hash-in-DB / raw-in-cookie token pattern
 *
 * Run: node tests/ab2ee4a7-fix-e2e-flow-test-failures.test.js
 */

'use strict';

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_PATH = path.resolve(__dirname, '../scripts/e2e-flow-tests.sh');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  PASS: ' + name);
    passed++;
  } catch (err) {
    console.error('  FAIL: ' + name);
    console.error('        ' + err.message);
    failed++;
  }
}

console.log('\nTask ab2ee4a7 — e2e-flow-tests.sh dashboard fix\n');

const content = fs.existsSync(SCRIPT_PATH)
  ? fs.readFileSync(SCRIPT_PATH, 'utf8')
  : '';

// ============================================================
// Test 1: Script exists and is executable
// ============================================================
test('e2e-flow-tests.sh exists and is executable', () => {
  assert.ok(fs.existsSync(SCRIPT_PATH), 'e2e-flow-tests.sh not found at ' + SCRIPT_PATH);
  const stat = fs.statSync(SCRIPT_PATH);
  assert.ok((stat.mode & 0o100) !== 0, 'e2e-flow-tests.sh must be executable');
});

// ============================================================
// Test 2: Old broken query is removed
// Old code: onboarding_completed=eq.true&order=created_at.desc (no trial expiry check)
// This picked the most recently created onboarded agent, who had an expired trial.
// The middleware then redirected to /upgrade, so 'Lead Feed' was never rendered.
// ============================================================
test('old user query without trial expiry check is removed', () => {
  assert.ok(
    !content.includes('onboarding_completed=eq.true&order=created_at.desc'),
    'Old query without trial expiry filter still present — expired trial users can be selected'
  );
});

// ============================================================
// Test 3: Non-trial agents are tried first (plan_tier != trial)
// Paid/pilot agents have no trial expiry and always have access to the dashboard.
// ============================================================
test('non-trial agents queried first (plan_tier=neq.trial)', () => {
  assert.ok(
    content.includes('plan_tier=neq.trial'),
    'Missing plan_tier=neq.trial filter — non-trial agents should be preferred'
  );
});

// ============================================================
// Test 4: Fallback filters by trial_ends_at > now
// When no non-trial agent exists, find a trial agent whose trial hasn't expired.
// ============================================================
test('fallback query filters by trial_ends_at > now', () => {
  assert.ok(
    content.includes('trial_ends_at=gt.') || content.includes('trial_ends_at=gte.'),
    'Missing trial_ends_at future filter in fallback query'
  );
});

// ============================================================
// Test 5: Empty user_id guard before session creation
// Prevents session creation for an empty user_id, which would crash PostgREST.
// ============================================================
test('empty user_id guard present', () => {
  assert.ok(
    content.includes('[ -z "$user_id" ] && return 1'),
    'Missing [ -z "$user_id" ] && return 1 guard'
  );
});

// ============================================================
// Test 6: Session token pattern — hash in DB, raw in cookie
// This matches how the deployed app validates sessions:
// middleware hashes the raw cookie value and looks up the hash in sessions.token.
// ============================================================
test('session stores SHA-256 hash in DB', () => {
  assert.ok(
    content.includes('openssl dgst -sha256') && content.includes('token_hash='),
    'Missing SHA-256 hash computation for session token'
  );
});

test('cookie sends raw token (not hash)', () => {
  assert.ok(
    content.includes('leadflow_session=$raw_token'),
    'Cookie must send $raw_token — middleware hashes it before DB lookup'
  );
});

// ============================================================
// Test 7: Bash syntax check
// ============================================================
test('e2e-flow-tests.sh passes bash -n syntax check', () => {
  try {
    execSync('bash -n ' + SCRIPT_PATH, { stdio: 'pipe' });
  } catch (err) {
    const msg = (err.stdout || err.stderr || err.message || '').toString();
    throw new Error('Bash syntax check failed: ' + msg);
  }
});

// ============================================================
// Summary
// ============================================================
console.log('\nResults: ' + passed + ' passed, ' + failed + ' failed out of ' + (passed + failed) + ' tests\n');
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
