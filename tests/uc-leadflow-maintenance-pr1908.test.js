'use strict';

/**
 * QC E2E: PR #1908 — orphan branch investigation (dev/fix-trial-expired-redirect-loop)
 * Verifies the investigation claims are accurate using plain Node.js + assert.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const MIDDLEWARE_PATH = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/middleware.ts'
);
const REGRESSION_TEST_PATH = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/tests/middleware-trial-expired-redirect-loop.test.ts'
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

console.log('=== QC E2E: PR #1908 — Orphan Branch Investigation ===\n');

test('middleware.ts exists on main', () => {
  assert.ok(fs.existsSync(MIDDLEWARE_PATH), `Missing: ${MIDDLEWARE_PATH}`);
});

test('middleware.ts EXPIRED_TRIAL_ALLOWED_ROUTES contains /dashboard/trial-expired', () => {
  const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
  const match = source.match(/EXPIRED_TRIAL_ALLOWED_ROUTES\s*=\s*\[([^\]]*)\]/s);
  assert.ok(match, 'EXPIRED_TRIAL_ALLOWED_ROUTES not found in middleware.ts');
  const routes = match[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean);
  assert.ok(
    routes.includes('/dashboard/trial-expired'),
    `Expected /dashboard/trial-expired in routes, got: ${JSON.stringify(routes)}`
  );
});

test('middleware.ts comment references the orphan branch name', () => {
  const source = fs.readFileSync(MIDDLEWARE_PATH, 'utf8');
  assert.ok(
    source.includes('dev/fix-trial-expired-redirect-loop'),
    'middleware.ts must contain a comment referencing dev/fix-trial-expired-redirect-loop'
  );
});

test('regression test file already exists on main', () => {
  assert.ok(
    fs.existsSync(REGRESSION_TEST_PATH),
    `Missing regression test: ${REGRESSION_TEST_PATH}`
  );
});

console.log(`\n=== REPORT ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) process.exit(1);
