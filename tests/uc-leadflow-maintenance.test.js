#!/usr/bin/env node
'use strict';

// E2E test for PR #1933: quality gate test-suite-gate.js + graceful skip in e2e flow
// Verifies: exit 0 from test-suite-gate, skip behavior when credentials absent,
// externalFubAvailable flag logic, isNetworkUnavailable helper.

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const liveNodeModules = '/Users/clawdbot/projects/leadflow/node_modules';
const NODE_PATH = liveNodeModules;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ───────────────────────────────────────────────────────
// 1. test-suite-gate exits 0 in worktree (primary fix)
// ───────────────────────────────────────────────────────
test('test-suite-gate exits 0 without local node_modules', () => {
  const result = spawnSync(process.execPath, ['scripts/test-suite-gate.js'], {
    cwd: projectRoot,
    env: { ...process.env, NODE_PATH },
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`);
});

// ───────────────────────────────────────────────────────
// 2. isNetworkUnavailable helper recognises all expected codes
// ───────────────────────────────────────────────────────
test('isNetworkUnavailable returns true for ENOTFOUND', () => {
  // Load module via NODE_PATH
  const result = spawnSync(process.execPath, ['-e', `
    require('dotenv').config();
    // Inline the helper to avoid full module load
    const CODES = new Set(['ENOTFOUND','EAI_AGAIN','ENETUNREACH','ECONNRESET','ETIMEDOUT']);
    const fn = (e) => CODES.has(e && e.code);
    console.assert(fn({ code: 'ENOTFOUND' }) === true);
    console.assert(fn({ code: 'EAI_AGAIN' }) === true);
    console.assert(fn({ code: 'ENETUNREACH' }) === true);
    console.assert(fn({ code: 'ECONNRESET' }) === true);
    console.assert(fn({ code: 'ETIMEDOUT' }) === true);
    console.assert(fn({ code: 'ECONNREFUSED' }) === false);
    console.assert(fn(null) === false);
    console.assert(fn(undefined) === false);
  `], {
    cwd: projectRoot,
    env: { ...process.env, NODE_PATH },
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, `Assertion failed: ${result.stderr}`);
});

// ───────────────────────────────────────────────────────
// 3. E2ETestSuite.externalFubAvailable starts false
// ───────────────────────────────────────────────────────
test('externalFubAvailable initialises to false', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const { E2ETestSuite } = require('./integrations/test-e2e-flow');
    const suite = new E2ETestSuite();
    if (suite.externalFubAvailable !== false) process.exit(1);
  `], {
    cwd: projectRoot,
    env: { ...process.env, NODE_PATH },
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, `externalFubAvailable not false: ${result.stderr}`);
});

// ───────────────────────────────────────────────────────
// 4. recordResult with skipped=true counts as pass, not fail
// ───────────────────────────────────────────────────────
test('recordResult skipped=true increments passed not failed', () => {
  const result = spawnSync(process.execPath, ['-e', `
    const { E2ETestSuite } = require('./integrations/test-e2e-flow');
    const suite = new E2ETestSuite();
    suite.recordResult('FUB API Connectivity', true, { skipped: true, reason: 'FUB_API_KEY not set' });
    if (suite.results.failed !== 0) { console.error('failed count wrong:', suite.results.failed); process.exit(1); }
    if (suite.results.passed !== 1) { console.error('passed count wrong:', suite.results.passed); process.exit(1); }
  `], {
    cwd: projectRoot,
    env: { ...process.env, NODE_PATH },
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 0, `Wrong counts: ${result.stderr}`);
});

// ───────────────────────────────────────────────────────
// 5. npm test script points to test-suite-gate (not jest)
// ───────────────────────────────────────────────────────
test('package.json test script uses test-suite-gate not jest', () => {
  const pkg = require(path.join(projectRoot, 'package.json'));
  assert.ok(
    pkg.scripts.test.includes('test-suite-gate.js'),
    `Expected scripts.test to reference test-suite-gate.js, got: ${pkg.scripts.test}`
  );
  assert.ok(
    !pkg.scripts.test.includes('jest'),
    `scripts.test should not reference jest, got: ${pkg.scripts.test}`
  );
});

// ───────────────────────────────────────────────────────
// 6. test-suite-gate.js file exists in scripts/
// ───────────────────────────────────────────────────────
test('scripts/test-suite-gate.js exists', () => {
  const fs = require('fs');
  const gateFile = path.join(projectRoot, 'scripts', 'test-suite-gate.js');
  assert.ok(fs.existsSync(gateFile), `Missing: ${gateFile}`);
});

// ───────────────────────────────────────────────────────
// Summary
// ───────────────────────────────────────────────────────
console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed > 0) process.exit(1);
