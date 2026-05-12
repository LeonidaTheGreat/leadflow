/**
 * E2E Test: Fix E2E Flow Test Failures (1 critical) — Task e8c721a2
 *
 * Root cause: CalcomClient.js had a syntax error at line 260 where
 * `this.logger.error(...)` was placed inside a return object literal,
 * making the module un-loadable. Any code path that required CalcomClient
 * would throw SyntaxError at import time.
 *
 * Fix: moved `this.logger.error(...)` before `return {`, making it a
 * valid statement in the catch block.
 *
 * Also validates the FUB 401 graceful-skip in test-e2e-flow.js so a
 * bad/expired API key doesn't hard-fail the E2E suite.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  PASS: ${name}`);
  passed++;
}

function fail(name, reason) {
  console.log(`  FAIL: ${name} — ${reason}`);
  failed++;
}

// ── Test 1: CalcomClient.js loads without a SyntaxError ─────────────────────
try {
  const CalcomClient = require('../../lib/services/CalcomClient.js');
  assert.strictEqual(typeof CalcomClient, 'function', 'CalcomClient should be a constructor');
  pass('CalcomClient.js has no syntax error and loads cleanly');
} catch (e) {
  fail('CalcomClient.js loads cleanly', e.message);
}

// ── Test 2: CalcomClient can be instantiated ─────────────────────────────────
try {
  const CalcomClient = require('../../lib/services/CalcomClient.js');
  const client = new CalcomClient({});
  assert.strictEqual(typeof client.getMe, 'function', 'getMe should be a method');
  pass('CalcomClient instantiates with getMe method');
} catch (e) {
  fail('CalcomClient instantiates', e.message);
}

// ── Test 3: getMe catch block logs then returns (not SyntaxError from bad literal) ──
try {
  const CalcomClient = require('../../lib/services/CalcomClient.js');
  const filePath = path.resolve(__dirname, '../../lib/services/CalcomClient.js');
  const src = fs.readFileSync(filePath, 'utf8');

  // Find the getMe catch block
  const catchBlock = src.match(/async getMe[\s\S]+?catch \(error\) \{([\s\S]+?)\}/);
  assert.ok(catchBlock, 'Should find catch block in getMe');
  const catchBody = catchBlock[1];

  // logger.error must come BEFORE return {
  const loggerPos = catchBody.indexOf('this.logger.error');
  const returnPos = catchBody.indexOf('return {');
  assert.ok(loggerPos !== -1, 'logger.error call must exist in catch block');
  assert.ok(returnPos !== -1, 'return { must exist in catch block');
  assert.ok(loggerPos < returnPos, 'logger.error must appear before return { in catch block');

  pass('CalcomClient.getMe catch block: logger.error precedes return {}');
} catch (e) {
  fail('CalcomClient.getMe catch block structure', e.message);
}

// ── Test 4: test-e2e-flow.js handles FUB 401 gracefully ──────────────────────
try {
  const flowPath = path.resolve(__dirname, '../../integrations/test-e2e-flow.js');
  const src = fs.readFileSync(flowPath, 'utf8');

  assert.ok(
    src.includes("'Unauthorised (401)'") || src.includes('"Unauthorised (401)"') ||
    src.includes("status === 401") || src.includes('httpStatus === 401'),
    'test-e2e-flow.js should handle FUB 401 responses gracefully'
  );
  pass('test-e2e-flow.js handles FUB 401 gracefully');
} catch (e) {
  fail('test-e2e-flow.js 401 handling', e.message);
}

// ── Test 5: Full E2E suite passes (re-run programmatically) ──────────────────
try {
  const { execSync } = require('child_process');
  const result = execSync('node integrations/test-e2e-flow.js', {
    cwd: path.resolve(__dirname, '../..'),
    timeout: 30000,
    encoding: 'utf8'
  });
  assert.ok(result.includes('ALL TESTS PASSED') || result.includes('Success Rate: 100%'),
    'E2E suite should report all tests passed');
  pass('Full E2E suite passes (100% success rate)');
} catch (e) {
  fail('Full E2E suite', e.stdout || e.message);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}
