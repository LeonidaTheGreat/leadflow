'use strict';

/**
 * QC verification for PR #1934 — orphan branch investigation artifact
 *
 * Verifies:
 * 1. The investigation test file is present and syntactically valid
 * 2. Running it exits 0 with "6/6 passed" in stdout
 * 3. npm test (test-suite-gate) still exits 0 after the file is added
 */

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ARTIFACT = path.join(PROJECT_ROOT, 'tests', 'uc-leadflow-maintenance-orphan-b0cea1ca.test.js');

let passed = 0;
let total = 0;

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.log(`FAIL: ${name}: ${err.message}`);
  }
}

function run(cmd, args, opts) {
  return spawnSync(cmd, args, { cwd: PROJECT_ROOT, encoding: 'utf8', ...opts });
}

console.log('\n=== QC: PR #1934 orphan investigation artifact ===\n');

check('investigation artifact file exists', () => {
  assert.ok(fs.existsSync(ARTIFACT), `Missing: ${ARTIFACT}`);
});

check('investigation artifact has no syntax errors', () => {
  const result = run(process.execPath, ['--check', ARTIFACT]);
  assert.strictEqual(result.status, 0, result.stderr);
});

check('investigation test runs and reports 6/6 passed', () => {
  const result = run(process.execPath, [ARTIFACT]);
  assert.strictEqual(result.status, 0, `exit ${result.status}:\n${result.stdout}\n${result.stderr}`);
  assert.ok(
    result.stdout.includes('6/6 passed'),
    `Expected "6/6 passed" in output:\n${result.stdout}`
  );
});

check('npm test (test-suite-gate) exits 0 with artifact present', () => {
  const result = run(process.execPath, ['scripts/test-suite-gate.js'], { timeout: 60000 });
  assert.strictEqual(
    result.status,
    0,
    `npm test gate failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`
  );
});

console.log(`\n${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
