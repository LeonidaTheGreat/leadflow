/**
 * QC E2E test for PR #1127 — Fix: E2E flow test failures (1 critical)
 * Task: 68b497d9-e18d-4e85-84db-f3bac5510cf6
 *
 * Verifies the logic changes in scripts/e2e-flow-tests.sh test_dashboard_no_errors():
 * 1. E2E_EMAIL path: looks up user by email, patches onboarding_completed=true, uses that user
 * 2. Fallback path: filters on trial_ends_at=gte.<now> in addition to onboarding_completed=true
 * 3. Old path (no trial filter) no longer present
 * 4. No secrets or magic values introduced
 */

'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const SCRIPT_PATH = path.resolve(__dirname, '../scripts/e2e-flow-tests.sh');
const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`      ${err.message}`);
    failed++;
  }
}

// 1. E2E_EMAIL lookup path exists
test('E2E_EMAIL branch: looks up user by email', () => {
  assert.ok(
    script.includes('real_estate_agents?select=id&email=eq.${E2E_EMAIL}'),
    'Script must query real_estate_agents by E2E_EMAIL'
  );
});

// 2. E2E_EMAIL branch: patches onboarding_completed=true for the found user
test('E2E_EMAIL branch: PATCH sets onboarding_completed=true', () => {
  assert.ok(
    script.includes('"onboarding_completed":true}'),
    'Script must PATCH onboarding_completed=true for the E2E user'
  );
  assert.ok(
    script.includes('-X PATCH'),
    'PATCH HTTP method must be used'
  );
});

// 3. Fallback path: filters by trial_ends_at to avoid expired accounts
test('Fallback path: includes trial_ends_at=gte. filter', () => {
  assert.ok(
    script.includes('trial_ends_at=gte.'),
    'Fallback query must filter on trial_ends_at to avoid expired trials'
  );
});

// 4. Old bug: fallback had no trial_ends_at filter and could pick expired accounts
//    Verify the old bare query (onboarding_completed=eq.true&order=created_at.desc) is gone
test('Old unfiltered fallback query is removed', () => {
  assert.ok(
    !script.includes('onboarding_completed=eq.true&order=created_at.desc'),
    'Old unfiltered query (no trial_ends_at check) must not exist'
  );
});

// 5. The E2E_EMAIL block only runs when E2E_EMAIL is set (guarded by [ -n ... ])
test('E2E_EMAIL block is guarded by non-empty check', () => {
  assert.ok(
    script.includes('if [ -n "${E2E_EMAIL:-}" ]'),
    'E2E_EMAIL path must be guarded by [ -n "${E2E_EMAIL:-}" ]'
  );
});

// 6. Fallback still returns 1 (failure) if no user found — safety preserved
test('Fallback still hard-fails if user_id empty', () => {
  assert.ok(
    script.includes('[ -z "$user_id" ] && return 1'),
    'Fallback must still return 1 when no valid user found'
  );
});

// 7. No hardcoded magic values (prices, day counts) introduced
test('No magic numeric thresholds for business logic', () => {
  // The only new literal is timeout values (10/15 sec) which already existed - fine
  // Check no bare trial day counts introduced
  assert.ok(
    !script.match(/trial_days\s*=\s*\d+/),
    'No magic trial day count variables should be introduced'
  );
});

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
