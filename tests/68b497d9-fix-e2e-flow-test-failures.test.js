/**
 * QC E2E Test — PR #1127: Fix dashboard E2E test failures
 * Task: 68b497d9-e18d-4e85-84db-f3bac5510cf6
 *
 * Verifies fixes in scripts/e2e-flow-tests.sh:
 * 1. User selection now prefers E2E test user from trial-signup (E2E_EMAIL path)
 * 2. Fallback filters by trial_ends_at >= now (not just onboarding_completed)
 * 3. onboarding_completed patched to true for E2E user
 * 4. Hash-in-DB / raw-in-cookie token pattern is maintained
 *
 * Run from the PR branch worktree:
 *   node tests/68b497d9-fix-e2e-flow-test-failures.test.js
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

console.log('\nPR #1127 -- e2e-flow-tests.sh dashboard fix verification\n');

const content = fs.existsSync(SCRIPT_PATH)
  ? fs.readFileSync(SCRIPT_PATH, 'utf8')
  : '';

// ============================================================
// Test 1: Script exists and is executable
// ============================================================
test('e2e-flow-tests.sh exists and is executable', () => {
  assert.ok(fs.existsSync(SCRIPT_PATH), 'e2e-flow-tests.sh must exist at ' + SCRIPT_PATH);
  const stat = fs.statSync(SCRIPT_PATH);
  assert.ok((stat.mode & 0o100) !== 0, 'e2e-flow-tests.sh must be executable');
});

// ============================================================
// Test 2: Old broken user query is removed
// Old code used created_at desc with no trial_ends_at filter — picked expired users
// ============================================================
test('old user query (created_at desc, no trial filter) is removed', () => {
  assert.ok(
    !content.includes('onboarding_completed=eq.true&order=created_at.desc'),
    'Old user query (no trial expiry check) must be removed'
  );
});

// ============================================================
// Test 3: Fallback uses trial_ends_at >= now
// ============================================================
test('fallback query filters users by trial_ends_at >= now', () => {
  assert.ok(
    content.includes('trial_ends_at=gte.'),
    'Fallback query must filter by trial_ends_at >= now to exclude expired accounts'
  );
});

// ============================================================
// Test 4: Primary path uses E2E_EMAIL (fresh trial user from test 6)
// ============================================================
test('primary path looks up user by E2E_EMAIL', () => {
  assert.ok(
    content.includes('E2E_EMAIL'),
    'Script must have an E2E_EMAIL-based lookup path to prefer fresh trial user'
  );
  // E2E_EMAIL should be used in a user lookup query
  assert.ok(
    content.includes('email=eq.$E2E_EMAIL') || content.includes('email=eq.${E2E_EMAIL}'),
    'E2E_EMAIL must be used in DB query to find the test user'
  );
});

// ============================================================
// Test 5: onboarding_completed patched to true for E2E user
// Without this, middleware redirects to /setup instead of /dashboard
// ============================================================
test('E2E user gets onboarding_completed patched to true', () => {
  assert.ok(
    content.includes('"onboarding_completed":true'),
    'Script must PATCH onboarding_completed=true for E2E user'
  );
});

// ============================================================
// Test 6: Fallback guarded by empty user_id check
// Ensures E2E_EMAIL path runs first and fallback only triggers when needed
// ============================================================
test('fallback path guarded by empty user_id check', () => {
  assert.ok(
    content.includes('[ -z "$user_id" ]'),
    'Fallback must be guarded by [ -z "$user_id" ]'
  );
});

// ============================================================
// Test 7: Session stores hash in DB, raw token in cookie
// ============================================================
test('session creates SHA-256 hash and stores it in DB', () => {
  assert.ok(
    content.includes('openssl rand -hex 32'),
    'Must generate raw_token with openssl rand'
  );
  assert.ok(
    content.includes('openssl dgst -sha256'),
    'Must compute SHA-256 hash with openssl dgst'
  );
  assert.ok(
    content.includes('token_hash='),
    'Must assign computed hash to token_hash variable'
  );
});

test('cookie sends raw_token (not hash)', () => {
  assert.ok(
    content.includes('leadflow_session=$raw_token'),
    'Cookie must send $raw_token (not hash) - middleware hashes it before DB lookup'
  );
});

// ============================================================
// Test 8: Script has valid bash syntax
// ============================================================
test('e2e-flow-tests.sh has valid bash syntax', () => {
  try {
    execSync('bash -n ' + SCRIPT_PATH, { stdio: 'pipe' });
  } catch (err) {
    const msg = (err.stdout || err.stderr || err.message || '').toString();
    throw new Error('Bash syntax check failed: ' + msg);
  }
});

// ============================================================
// Test 9: Fallback still fails hard when no user found
// Prevents silent pass when DB has no eligible users
// ============================================================
test('fallback path returns 1 when no eligible user found', () => {
  assert.ok(
    content.includes('[ -z "$user_id" ] && return 1'),
    'Fallback must hard-fail (return 1) if no eligible user found after query'
  );
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
