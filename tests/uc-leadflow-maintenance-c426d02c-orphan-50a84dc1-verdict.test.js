/**
 * TASK SPEC (c426d02c-b7d5-4eb9-a64e-e6700a4aed40)
 *
 * What:
 * - Create this investigation artifact:
 *   tests/uc-leadflow-maintenance-c426d02c-orphan-50a84dc1-verdict.test.js
 * - Validate that orphan branch dev/50a84dc1-fix-e2e-flow-test-failures-1-critical
 *   has NO unshipped production value by proving its single commit is already in main.
 * - No product source files are changed. This file only adds repository-level
 *   assertions for the maintenance investigation.
 *
 * Verify:
 * - Run: node tests/uc-leadflow-maintenance-c426d02c-orphan-50a84dc1-verdict.test.js
 *   Expected: all assertions pass and the script exits 0.
 * - Run: npm test
 *   Expected: exits 0 (this file does not interfere with the root test suite).
 *
 * Boundaries:
 * - Do not modify send-aha-day3/route.ts or the E2E test file.
 * - Do not delete the orphan branch (orchestrator handles that).
 * - Do not touch generated/protected project docs/config.
 *
 * VERDICT: already-shipped-safe-delete
 *
 * Evidence:
 *   Orphan branch dev/50a84dc1-fix-e2e-flow-test-failures-1-critical has
 *   exactly 1 commit ahead of origin at the time of branching:
 *     commit a5c31e54 (2026-07-16)
 *     "fix: correct column name and test path in E2E flow test"
 *
 *   That commit made two changes:
 *     1. send-aha-day3 GET handler queried trial_started_at (non-existent
 *        column). Migration 012 adds trial_start_date. The fix aligns the
 *        route to use the correct column name.
 *     2. E2E test 7 used ../product/ from tests/e2e/ (resolves to
 *        tests/product/ — non-existent). Fixed to ../../product/ and
 *        ../../migrations/ so static analysis reads the correct files.
 *
 *   The identical fix landed on main via PR #1899 (commit 8a0d5f97,
 *   merged 2026-07-16 22:05 EDT). The commit message, description, author,
 *   and co-author on 8a0d5f97 are verbatim copies of a5c31e54. Both commits
 *   reference task 50a84dc1-be78-4018-b2bb-a737b1f07b2d.
 *
 *   Open PR #1876 on this branch is a duplicate — the original task is done.
 *
 * Recommended action: close PR #1876 and delete the branch.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let total = 0;

function test(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

const ROUTE_PATH = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/app/api/onboarding/send-aha-day3/route.ts'
);

const E2E_TEST_PATH = path.join(
  PROJECT_ROOT,
  'tests/e2e/5fd5ad2d-fix-e2e-flow-test-failures.test.js'
);

console.log('\nOrphan branch investigation: dev/50a84dc1-fix-e2e-flow-test-failures-1-critical');
console.log('Verdict: already-shipped-safe-delete\n');

test('send-aha-day3/route.ts exists on main', () => {
  assert.ok(fs.existsSync(ROUTE_PATH), `Expected file to exist: ${ROUTE_PATH}`);
});

test('send-aha-day3/route.ts uses trial_start_date (correct column from migration 012)', () => {
  const source = fs.readFileSync(ROUTE_PATH, 'utf8');
  assert.ok(
    source.includes('trial_start_date'),
    'trial_start_date not found — column name fix may be missing'
  );
  assert.ok(
    !source.includes('trial_started_at'),
    'trial_started_at still present — old non-existent column name not removed'
  );
});

test('E2E test file 5fd5ad2d exists on main', () => {
  assert.ok(fs.existsSync(E2E_TEST_PATH), `Expected file to exist: ${E2E_TEST_PATH}`);
});

test('E2E test 7 uses corrected ../../product/ path (not the old ../product/)', () => {
  const source = fs.readFileSync(E2E_TEST_PATH, 'utf8');
  assert.ok(
    source.includes("path.join(__dirname, '../../product/"),
    'Corrected ../../product/ path not found — E2E path fix may be missing'
  );
});

test('E2E test 7 uses corrected ../../migrations/ path (not the old ../migrations/)', () => {
  const source = fs.readFileSync(E2E_TEST_PATH, 'utf8');
  assert.ok(
    source.includes("path.join(__dirname, '../../migrations/"),
    'Corrected ../../migrations/ path not found — E2E path fix may be missing'
  );
});

test('send-aha-day3/route.ts does not reference the non-existent trial_started_at column', () => {
  const source = fs.readFileSync(ROUTE_PATH, 'utf8');
  const badColumn = (source.match(/trial_started_at/g) || []).length;
  assert.strictEqual(badColumn, 0, `Found ${badColumn} reference(s) to non-existent column trial_started_at`);
});

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
