'use strict';
/**
 * E2E: Quality gate "clean_worktree" — taxonomy/capability artifacts ignored
 * Task: 6c4451a0-7d5d-44b5-a3cc-35d80bacb36a
 *
 * Verifies the four .gitignore patterns added in this PR actually match
 * the paths that the genome auto-generates, so the clean_worktree quality
 * gate stays green after heartbeat runs.
 *
 * Run with: node tests/e2e/uc-leadflow-maintenance-clean-worktree.test.js
 */

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

const EXPECTED_IGNORED = [
  'dashboard/taxonomy.html',
  'dashboard/taxonomy.json',
  'dashboard/capability.agents.html',
  'dashboard/capability.agents.json',
  'dashboard/capability.revenue.html',
  'dashboard/capability.revenue.json',
];

let passed = 0;
let failed = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${label}\n     ${err.message}`);
    failed++;
  }
}

console.log('\n=== QC: clean_worktree gitignore patterns ===\n');

for (const filePath of EXPECTED_IGNORED) {
  check(`${filePath} is matched by .gitignore`, () => {
    // git check-ignore exits 0 when the path IS ignored, 1 when it is not.
    let stdout = '';
    try {
      stdout = execFileSync('git', ['check-ignore', '-v', filePath], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      assert.fail(`git check-ignore did not match "${filePath}" — clean_worktree gate will fail`);
    }
    assert.ok(
      stdout.trim().length > 0,
      `Expected non-empty output from git check-ignore for "${filePath}"`
    );
  });
}

// Sanity check: an unrelated file is NOT accidentally ignored
check('dashboard/index.html is NOT ignored (sanity)', () => {
  let exited1 = false;
  try {
    execFileSync('git', ['check-ignore', '-v', 'dashboard/index.html'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    exited1 = true; // exit 1 = NOT ignored — correct
  }
  assert.ok(exited1, 'dashboard/index.html should NOT be ignored by the new patterns');
});

const total = passed + failed;
console.log(`\n${passed}/${total} passed`);
if (failed > 0) {
  console.log('\nFailed checks listed above.');
  process.exit(1);
}
