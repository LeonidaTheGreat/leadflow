'use strict';

/**
 * QC E2E test for PR #1327 — tests/logger.test.js runner
 * Verifies the hub runner executes all logger suites and exits clean.
 */

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const RUNNER = path.join(PROJECT_DIR, 'tests', 'logger.test.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

console.log('\n── QC: tests/logger.test.js runner smoke test ──\n');

const result = spawnSync(process.execPath, [RUNNER], {
  cwd: PROJECT_DIR,
  encoding: 'utf8',
  timeout: 30000,
});

test('runner exits with code 0', () => {
  assert.strictEqual(result.status, 0, `exit code was ${result.status}\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
});

test('runner reports 42 tests passed', () => {
  assert.match(result.stdout, /Passed:\s+42\s*\/\s*42/, `unexpected output:\n${result.stdout}`);
});

test('runner reports 0 failures', () => {
  assert.match(result.stdout, /Failed:\s+0/, `unexpected output:\n${result.stdout}`);
});

test('runner reports 100% pass rate', () => {
  assert.match(result.stdout, /Pass rate:\s+100%/, `unexpected output:\n${result.stdout}`);
});

test('runner covers unit suite (37 tests)', () => {
  assert.match(result.stdout, /Passed:\s+37/, `unit suite results not found:\n${result.stdout}`);
});

test('runner covers integration suite (5 tests)', () => {
  assert.match(result.stdout, /Passed:\s+5/, `integration suite results not found:\n${result.stdout}`);
});

console.log(`\n  Passed: ${passed} / ${passed + failed}`);
process.exit(failed > 0 ? 1 : 0);
