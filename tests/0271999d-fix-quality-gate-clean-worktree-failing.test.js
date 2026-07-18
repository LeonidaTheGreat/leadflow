'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = '/Users/clawdbot/projects/leadflow';
const GITIGNORE_PATH = path.join(PROJECT_DIR, '.gitignore');

const REQUIRED_ENTRIES = [
  'dashboard/architecture.html',
  'docs/ARCHITECTURE-MAP.md',
];

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// Test that the PR branch has both entries in .gitignore
test('PR branch .gitignore contains dashboard/architecture.html', () => {
  const content = execSync(
    `git show origin/dev/0271999d-fix-quality-gate-clean-worktree-failing:.gitignore`,
    { cwd: PROJECT_DIR, encoding: 'utf8' }
  );
  assert.ok(
    content.includes('dashboard/architecture.html'),
    'dashboard/architecture.html not found in .gitignore'
  );
});

test('PR branch .gitignore contains docs/ARCHITECTURE-MAP.md', () => {
  const content = execSync(
    `git show origin/dev/0271999d-fix-quality-gate-clean-worktree-failing:.gitignore`,
    { cwd: PROJECT_DIR, encoding: 'utf8' }
  );
  assert.ok(
    content.includes('docs/ARCHITECTURE-MAP.md'),
    'docs/ARCHITECTURE-MAP.md not found in .gitignore'
  );
});

// Test that both entries are under the correct section
test('New entries appear under # Auto-generated orchestrator docs section', () => {
  const content = execSync(
    `git show origin/dev/0271999d-fix-quality-gate-clean-worktree-failing:.gitignore`,
    { cwd: PROJECT_DIR, encoding: 'utf8' }
  );
  const sectionIdx = content.indexOf('# Auto-generated orchestrator docs');
  assert.ok(sectionIdx !== -1, 'Section header not found');
  const afterSection = content.slice(sectionIdx);
  assert.ok(afterSection.includes('dashboard/architecture.html'), 'entry not under section');
  assert.ok(afterSection.includes('docs/ARCHITECTURE-MAP.md'), 'entry not under section');
});

// Test that clean-worktree gate recognises both entries via the gate module directly
test('clean-worktree gate accepts both new entries in .gitignore', () => {
  const { evaluateCleanWorktree } = require('/Users/clawdbot/projects/genome/core/sensors/clean-worktree-gate');
  const { REQUIRED_IGNORES } = require('/Users/clawdbot/projects/genome/core/sensors/clean-worktree-gate');

  // Confirm both paths are in REQUIRED_IGNORES (the gate would require them)
  assert.ok(REQUIRED_IGNORES.includes('dashboard/architecture.html'), 'missing from REQUIRED_IGNORES');
  assert.ok(REQUIRED_IGNORES.includes('docs/ARCHITECTURE-MAP.md'), 'missing from REQUIRED_IGNORES');

  // Build a synthetic .gitignore that includes ALL required entries
  const syntheticIgnore = REQUIRED_IGNORES.join('\n') + '\n';
  const mockFs = {
    existsSync: (p) => p.endsWith('.gitignore') || p.endsWith('.git'),
    readFileSync: () => syntheticIgnore,
  };
  const mockExecSync = () => ''; // no dirty files
  const result = evaluateCleanWorktree('/fake/project', { fsModule: mockFs, execSyncFn: mockExecSync });
  assert.strictEqual(result.passed, true, `gate still failing: ${result.error}`);
});

// Confirm the task spec comment block is at the top of the file (documents the issue for the reject)
test('ISSUE DETECTION — task spec comment block embedded in .gitignore (should not be there)', () => {
  const content = execSync(
    `git show origin/dev/0271999d-fix-quality-gate-clean-worktree-failing:.gitignore`,
    { cwd: PROJECT_DIR, encoding: 'utf8' }
  );
  const hasTaskSpec = content.startsWith('# TASK SPEC');
  // We assert it IS present here so the test confirms the issue is real
  assert.ok(hasTaskSpec, 'Task spec comment not found — may have been fixed already');
});

console.log(`\n📋 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
