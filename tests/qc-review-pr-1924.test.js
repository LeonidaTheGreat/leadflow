'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const TEST_FILE = path.join(__dirname, 'uc-leadflow-maintenance-orphan-6d39ae0e.test.js');

let passed = 0;
let total = 0;

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (e) {
    console.log(`FAIL: ${name}: ${e.message}`);
  }
}

console.log('\n=== QC Review: PR #1924 — orphan investigation test validation ===\n');

check('test file exists at expected path', () => {
  assert.ok(fs.existsSync(TEST_FILE), 'Missing test file');
});

check('test file is runnable standalone (no framework deps)', () => {
  const src = fs.readFileSync(TEST_FILE, 'utf8');
  assert.ok(!src.includes("require('jest')"), 'Should not require jest');
  assert.ok(!src.includes("require('mocha')"), 'Should not require mocha');
  assert.ok(src.includes("require('assert')"), 'Should use Node assert');
});

check('test uses process.exit for pass/fail signaling', () => {
  const src = fs.readFileSync(TEST_FILE, 'utf8');
  assert.ok(src.includes('process.exit('), 'Should use process.exit for CI signaling');
});

check('no hardcoded secrets or API keys', () => {
  const src = fs.readFileSync(TEST_FILE, 'utf8');
  const patterns = [/sk_live_/, /sk_test_/, /AC[a-f0-9]{32}/, /AKIA[A-Z0-9]{16}/];
  for (const p of patterns) {
    assert.ok(!p.test(src), `Potential secret pattern: ${p}`);
  }
});

check('no production code modified (only test file added)', () => {
  const { execSync } = require('child_process');
  const names = execSync(
    'git diff main...origin/dev/e9253281-investigate-orphan-branch-dev-6d39ae0e-d --name-only',
    { encoding: 'utf8' }
  ).trim().split('\n').filter(Boolean);
  assert.strictEqual(names.length, 1, `Expected 1 changed file, got ${names.length}`);
  assert.ok(names[0].startsWith('tests/'), `Changed file should be in tests/, got: ${names[0]}`);
});

check('test covers all six verification checks', () => {
  const src = fs.readFileSync(TEST_FILE, 'utf8');
  const checkCalls = (src.match(/^check\(/gm) || []).length;
  assert.strictEqual(checkCalls, 6, `Expected 6 check() calls, got ${checkCalls}`);
});

console.log(`\n${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
