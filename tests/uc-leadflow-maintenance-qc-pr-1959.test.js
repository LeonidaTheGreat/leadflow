'use strict';

/**
 * QC E2E test for PR #1959: testSuiteFloor: 0 quality-gate opt-out
 *
 * Verifies that the genome jest-suite-gate correctly reads testSuiteFloor: 0
 * from package.json and opts this project out of Jest binary discovery.
 *
 * FINDING: Test 2 intentionally documents a DEFECT in the PR. The fix
 * (testSuiteFloor: 0) is silently ineffective because genome's
 * getMinimumTestSuites() uses pkg.testSuiteFloor || pkg.jestSuiteFloor — JS
 * falsy evaluation makes 0 || undefined === undefined, so the field is ignored
 * and the default floor (1) is used. The genome quality gate will still fail.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const GENOME_GATE = '/Users/clawdbot/projects/genome/scripts/jest-suite-gate';
const WORKTREE_ROOT = path.join(__dirname, '..');
const PR_BRANCH = 'origin/dev/ed2c22b4-fix-quality-gate-tests-failing-in-leadfl';

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
    failures.push({ name, error: err.message });
  }
}

console.log('\n=== PR #1959: testSuiteFloor: 0 quality-gate opt-out ===\n');

// --- Test 1: PR branch package.json has the field ---
test('PR branch package.json contains testSuiteFloor: 0', () => {
  const raw = execSync(`git show ${PR_BRANCH}:package.json`, { cwd: WORKTREE_ROOT, encoding: 'utf-8' });
  const pkg = JSON.parse(raw);
  assert.strictEqual(
    pkg.testSuiteFloor,
    0,
    `Expected testSuiteFloor: 0 in PR branch package.json, got ${pkg.testSuiteFloor}`
  );
});

// --- Test 2: genome gate module is loadable ---
let getMinimumTestSuites;
test('genome jest-suite-gate module loads', () => {
  ({ getMinimumTestSuites } = require(GENOME_GATE));
  assert.strictEqual(typeof getMinimumTestSuites, 'function');
});

// --- Test 3 (REGRESSION CHECK): testSuiteFloor: 0 must be honoured ---
// This test FAILS because genome uses `||` instead of `??`.
// Fix required in genome: pkg.testSuiteFloor ?? pkg.jestSuiteFloor
test('getMinimumTestSuites returns 0 when testSuiteFloor: 0 (requires genome ?? fix at jest-suite-gate.js:29)', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leadflow-qc-1959-'));
  try {
    fs.writeFileSync(
      path.join(tmpDir, 'package.json'),
      JSON.stringify({ name: 'fub-ai-lead-response', testSuiteFloor: 0 })
    );
    const minimum = getMinimumTestSuites(tmpDir);
    assert.strictEqual(
      minimum,
      0,
      `testSuiteFloor: 0 silently ignored — got minimum=${minimum} (not 0). ` +
      `Root cause: genome/scripts/jest-suite-gate.js:29 uses ` +
      `'pkg.testSuiteFloor || pkg.jestSuiteFloor'; JS falsy makes 0||undefined===undefined. ` +
      `Fix: use 'pkg.testSuiteFloor ?? pkg.jestSuiteFloor' instead.`
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true });
  }
});

// --- Test 4: npm test itself passes (independent of the bug) ---
test('npm test exits 0 (test-suite-gate.js delegates to e2e-flow.js correctly)', () => {
  const { spawnSync } = require('child_process');
  const result = spawnSync('npm', ['test'], {
    cwd: WORKTREE_ROOT,
    encoding: 'utf-8',
    timeout: 60000,
  });
  assert.strictEqual(result.status, 0, `npm test failed:\n${result.stderr || result.stdout}`);
});

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failures.length) {
  console.log('\nFailing tests:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
}
process.exit(failed > 0 ? 1 : 0);
