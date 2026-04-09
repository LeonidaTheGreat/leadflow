'use strict';
/**
 * QC E2E Test: PR #1060 — Fix browser test failures (cold-start timeouts)
 * Task: f7071cd0-e5a2-4baa-8d4d-7814cffcecd7
 *
 * Verifies:
 * 1. auth.spec.js uses getByTestId('login-error-message') — not the brittle [class*="red"]
 * 2. login/page.tsx has data-testid="login-error-message" on the error div
 * 3. auth.spec.js adds waitForResponse before checking login error (handles cold starts)
 * 4. auth.spec.js sets test.setTimeout >= 60000 for the slow tests
 * 5. health.spec.js bumps test timeouts >= 60000 for cold starts
 * 6. No [class*="red"] selector remains in auth.spec.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const authSpec = fs.readFileSync(path.join(ROOT, 'tests/browser/auth.spec.js'), 'utf8');
const healthSpec = fs.readFileSync(path.join(ROOT, 'tests/browser/health.spec.js'), 'utf8');
const loginPage = fs.readFileSync(
  path.join(ROOT, 'product/lead-response/dashboard/app/login/page.tsx'),
  'utf8'
);

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

// 1. Brittle selector is gone from auth.spec.js
check('brittle [class*="red"] selector removed from auth.spec.js', () => {
  assert.ok(
    !authSpec.includes('[class*="red"]'),
    'auth.spec.js must NOT use [class*="red"] selector'
  );
});

// 2. New data-testid selector is in auth.spec.js
check('auth.spec.js uses getByTestId("login-error-message")', () => {
  assert.ok(
    authSpec.includes("getByTestId('login-error-message')"),
    'auth.spec.js must use getByTestId("login-error-message")'
  );
});

// 3. login page source has the data-testid attribute
check('login/page.tsx has data-testid="login-error-message"', () => {
  assert.ok(
    loginPage.includes('data-testid="login-error-message"'),
    'login/page.tsx must have data-testid="login-error-message" on the error div'
  );
});

// 4. waitForResponse wired before login error check (cold-start resilience)
check('auth.spec.js waits for API response before checking login error', () => {
  // The PR adds responsePromise + await responsePromise before getByTestId
  assert.ok(
    authSpec.includes('/api/auth/login'),
    'auth.spec.js must wait for /api/auth/login response'
  );
  const responsePromiseIdx = authSpec.indexOf('/api/auth/login');
  const testidIdx = authSpec.indexOf("getByTestId('login-error-message')");
  assert.ok(
    responsePromiseIdx < testidIdx,
    'waitForResponse for /api/auth/login must appear before getByTestId check'
  );
});

// 5. test.setTimeout bumped to >= 60000 in the failing login test
check('auth.spec.js sets test.setTimeout >= 60000 for login error test', () => {
  // Match test.setTimeout(N) — N must be >= 60000
  const matches = [...authSpec.matchAll(/test\.setTimeout\((\d+)\)/g)];
  assert.ok(matches.length > 0, 'auth.spec.js must call test.setTimeout()');
  const adequate = matches.some(m => parseInt(m[1], 10) >= 60000);
  assert.ok(adequate, `No test.setTimeout >= 60000 found; got: ${matches.map(m => m[1]).join(', ')}`);
});

// 6. health.spec.js bumps individual test timeouts >= 60000
check('health.spec.js bumps individual test timeouts >= 60000', () => {
  const matches = [...healthSpec.matchAll(/test\.setTimeout\((\d+)\)/g)];
  assert.ok(matches.length > 0, 'health.spec.js must call test.setTimeout()');
  const adequate = matches.some(m => parseInt(m[1], 10) >= 60000);
  assert.ok(adequate, `No test.setTimeout >= 60000 found; got: ${matches.map(m => m[1]).join(', ')}`);
});

// 7. Error div is conditionally rendered (not always shown)
check('login error div is conditionally rendered in page.tsx', () => {
  assert.ok(
    loginPage.includes('{error && ('),
    'Error block must be conditionally rendered with {error && ('
  );
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
