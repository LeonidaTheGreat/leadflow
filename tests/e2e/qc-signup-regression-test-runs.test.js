'use strict';

// QC verification: confirms the signup-plans-display regression test file
// exists, is syntactically valid, and exits 0 (all assertions pass).

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\n=== QC: signup regression test exists and passes ===\n');

const testFile = path.join(
  __dirname, '..', '..', 'tests', 'routes', 'signup-plans-display-regression.test.js'
);

check('regression test file exists', () => {
  assert.ok(fs.existsSync(testFile), `Not found: ${testFile}`);
});

check('regression test file is non-empty', () => {
  const size = fs.statSync(testFile).size;
  assert.ok(size > 100, `File too small (${size} bytes) — may be empty or truncated`);
});

check('regression test exits 0 (all assertions pass)', () => {
  try {
    execSync(`node ${testFile}`, { stdio: 'pipe' });
  } catch (err) {
    const output = (err.stdout || '').toString() + (err.stderr || '').toString();
    throw new Error(`Regression test failed:\n${output}`);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
