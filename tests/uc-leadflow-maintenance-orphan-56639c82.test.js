/**
 * Task Spec: 37a5e383-b2bb-4cb3-85c0-127cb3a73f33
 *
 * What:
 * - Add this maintenance investigation test at
 *   tests/uc-leadflow-maintenance-orphan-56639c82.test.js.
 * - Functions changed: none; this task investigates orphan branch
 *   dev/56639c82-fix-quality-gate-clean-worktree-failing and documents
 *   whether its .gitignore-only work should be shipped or deleted.
 *
 * Verify:
 * - Run: node tests/uc-leadflow-maintenance-orphan-56639c82.test.js
 *   Expected: all checks pass and the output includes "7/7 passed".
 * - Run: npm test
 *   Expected: command exits 0 with the existing end-to-end flow checks passing.
 * - Run: npm run build
 *   Expected: dashboard Next.js build completes successfully.
 * - Run: npm run lint
 *   Expected: ESLint exits 0.
 *
 * Boundaries:
 * - Do not edit application runtime code, routes, services, database schema, or
 *   package manifests.
 * - Do not delete the orphan branch from this task runtime.
 * - Do not modify protected generated files or dashboard/Tailscale settings.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ORPHAN_BRANCH = 'dev/56639c82-fix-quality-gate-clean-worktree-failing';
const ORPHAN_COMMIT = 'afe40ca14bada8c770379e92dbb4e2de61b38d36';
const SHIPPED_COMMIT = '0fd180b66bb83c4221681fb7b6d1cad16083f424';
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');
const GENERATED_ARCHITECTURE_ARTIFACTS = [
  'dashboard/architecture.html',
  'docs/ARCHITECTURE-MAP.md',
];

let passed = 0;
let total = 0;

function check(name, fn) {
  total += 1;
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.log(`FAIL: ${name}: ${error.message}`);
  }
}

function git(args) {
  return execFileSync('git', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function addedNonCommentLines(commit, filePath) {
  return git(['show', '--format=', '--unified=0', commit, '--', filePath])
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1).trim())
    .filter((line) => line && !line.startsWith('#'));
}

console.log(`\n=== Orphan branch investigation: ${ORPHAN_BRANCH} ===\n`);

check('orphan branch exists locally or on origin', () => {
  const branches = git(['branch', '-a', '--list', `*${ORPHAN_BRANCH}`]);
  assert.ok(branches.includes(ORPHAN_BRANCH), `Missing branch ${ORPHAN_BRANCH}`);
});

check('orphan branch contains exactly one unique commit ahead of origin/main', () => {
  const count = Number(git(['rev-list', '--count', `origin/main..${ORPHAN_BRANCH}`]).trim());
  assert.strictEqual(count, 1);
});

check('orphan unique commit is the expected .gitignore-only fix', () => {
  const commit = git(['rev-parse', `${ORPHAN_BRANCH}^{commit}`]).trim();
  assert.strictEqual(commit, ORPHAN_COMMIT);

  const files = git(['show', '--name-only', '--format=', ORPHAN_COMMIT])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  assert.deepStrictEqual(files, ['.gitignore']);
});

check('orphan commit only adds generated architecture artifact ignore rules', () => {
  const addedLines = addedNonCommentLines(ORPHAN_COMMIT, '.gitignore');
  assert.deepStrictEqual(addedLines, GENERATED_ARCHITECTURE_ARTIFACTS);
});

check('current branch already ignores the generated architecture artifacts', () => {
  const gitignore = fs.readFileSync(GITIGNORE_PATH, 'utf8');
  for (const artifact of GENERATED_ARCHITECTURE_ARTIFACTS) {
    assert.ok(gitignore.includes(`${artifact}\n`), `Missing ignore rule for ${artifact}`);
  }
});

check('main history shows the same functional fix shipped via PR #1920', () => {
  const commitSubject = git(['show', '--format=%s', '--no-patch', SHIPPED_COMMIT]).trim();
  assert.strictEqual(commitSubject, 'fix: ignore generated architecture artifacts (#1920)');

  const shippedLines = addedNonCommentLines(SHIPPED_COMMIT, '.gitignore');
  assert.deepStrictEqual(shippedLines, GENERATED_ARCHITECTURE_ARTIFACTS);
});

check('investigation conclusion is delete orphan branch, not merge stale branch', () => {
  const currentCommit = git(['rev-parse', 'HEAD']).trim();
  const mergeBase = git(['merge-base', 'origin/main', ORPHAN_BRANCH]).trim();
  assert.notStrictEqual(mergeBase, currentCommit, 'Expected orphan branch to have a stale base');

  const staleDiffStat = git(['diff', '--stat', `origin/main..${ORPHAN_BRANCH}`]);
  assert.ok(
    staleDiffStat.includes('deletion') || staleDiffStat.includes('deletions'),
    'Expected stale branch diff to include deletions if merged directly'
  );
});

console.log(`\n${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
