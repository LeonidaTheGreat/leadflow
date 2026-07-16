/**
 * E2E test: PR #1890 — dashboard .gitignore ignores *.pr-backup files
 * Verifies the orchestrator PR backup files won't surface as deployment drift.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GITIGNORE_PATH = path.resolve(__dirname, '../product/lead-response/dashboard/.gitignore');
const DASHBOARD_DIR = path.resolve(__dirname, '../product/lead-response/dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// 1. Pattern present in .gitignore
test('*.pr-backup pattern exists in dashboard .gitignore', () => {
  const content = fs.readFileSync(GITIGNORE_PATH, 'utf8');
  assert.ok(
    content.includes('*.pr-backup'),
    '.gitignore must contain *.pr-backup'
  );
});

// 2. The entry has an explanatory comment above it
test('.gitignore has comment explaining pr-backup origin', () => {
  const content = fs.readFileSync(GITIGNORE_PATH, 'utf8');
  assert.ok(
    content.includes('PR backup files') || content.includes('orchestrator'),
    'comment should explain why *.pr-backup is ignored'
  );
});

// 3. Git actually ignores a .pr-backup file in the dashboard dir
test('git check-ignore confirms *.pr-backup is ignored in dashboard', () => {
  const probe = path.join(DASHBOARD_DIR, 'probe-test.pr-backup');
  // git check-ignore exits 0 if the path is ignored, 1 if not
  let exitCode = 0;
  try {
    execSync(`git check-ignore -q "${probe}"`, {
      cwd: DASHBOARD_DIR,
      stdio: 'pipe',
    });
  } catch (err) {
    exitCode = err.status;
  }
  assert.strictEqual(exitCode, 0, 'git should report probe-test.pr-backup as ignored');
});

// 4. No existing *.pr-backup files are tracked in git index
test('no *.pr-backup files are tracked in the dashboard directory', () => {
  const tracked = execSync(
    'git ls-files | grep "\\.pr-backup$" || true',
    { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', shell: true }
  ).trim();
  assert.strictEqual(tracked, '', `tracked .pr-backup files found: ${tracked}`);
});

console.log('');
console.log('============================================================');
console.log('📊 PR #1890 — dashboard .gitignore *.pr-backup');
console.log('============================================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed > 0) {
  process.exit(1);
}
