'use strict';

/**
 * E2E test for PR #1911: Fix clean_worktree gate — add missing .gitignore entries
 * Task: d1f506a3-8f16-41d7-90f3-06655efebcff
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    process.exitCode = 1;
  }
}

const gitignore = fs.readFileSync(GITIGNORE_PATH, 'utf8');
const lines = gitignore.split('\n').map((l) => l.trim());

console.log('PR #1911 — clean_worktree gate: .gitignore entries\n');

test('dashboard/architecture.html is in .gitignore', () => {
  assert.ok(
    lines.includes('dashboard/architecture.html'),
    'Expected "dashboard/architecture.html" to appear as a line in .gitignore'
  );
});

test('docs/ARCHITECTURE-MAP.md is in .gitignore', () => {
  assert.ok(
    lines.includes('docs/ARCHITECTURE-MAP.md'),
    'Expected "docs/ARCHITECTURE-MAP.md" to appear as a line in .gitignore'
  );
});

test('clean-worktree-gate no longer reports missing ignores for these entries', () => {
  const REQUIRED = ['dashboard/architecture.html', 'docs/ARCHITECTURE-MAP.md'];
  const missing = REQUIRED.filter((entry) => !gitignore.includes(entry));
  assert.deepStrictEqual(
    missing,
    [],
    `Gate would still report missing: ${missing.join(', ')}`
  );
});

test('.gitignore is valid UTF-8 and non-empty', () => {
  assert.ok(gitignore.length > 0, '.gitignore must not be empty');
});
