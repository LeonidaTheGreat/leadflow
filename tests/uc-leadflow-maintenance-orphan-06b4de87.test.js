'use strict';

/**
 * QC E2E test for PR #1925 (task 8f68f0a2-6a0d-4d6c-9cfe-f3b74d805fd8)
 * Verifies every factual claim in docs/task-specs/investigate-orphan-branch-06b4de87.md
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ORPHAN_BRANCH = 'dev/06b4de87-fix-quality-gate-tests-failing-in-leadfl';
const NEWER_BRANCH = 'dev/97173791-fix-quality-gate-tests-failing-in-leadfl';
const PR_BRANCH = 'dev/8f68f0a2-investigate-orphan-branch-dev-06b4de87-f';
const DOC_REL = 'docs/task-specs/investigate-orphan-branch-06b4de87.md';
const DOC_PATH = path.join(PROJECT_ROOT, DOC_REL);

const EXPECTED_COMMIT = '2f345bc0';
const EXPECTED_FILES = [
  '.github/workflows/ci.yml',
  'docs/task-specs/fix-agent-retry-rate-alt-approach.md',
  'integrations/test-e2e-flow.js',
  'package.json',
  'scripts/test-suite-gate.js',
];

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

function git(args) {
  return execSync(`git ${args}`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

console.log('\n=== QC: orphan branch 06b4de87 investigation doc verification ===\n');

function docContent() {
  // Read from working tree if merged; fall back to PR branch if still pending
  if (fs.existsSync(DOC_PATH)) return fs.readFileSync(DOC_PATH, 'utf8');
  return git(`show origin/${PR_BRANCH}:${DOC_REL}`);
}

check('investigation doc file exists (on disk or PR branch)', () => {
  const content = docContent();
  assert.ok(content && content.length > 0, `Doc not found in working tree or on origin/${PR_BRANCH}`);
});

check('orphan branch exists on origin', () => {
  const refs = execSync(`git ls-remote origin '${ORPHAN_BRANCH}'`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.ok(refs.includes(ORPHAN_BRANCH), `Branch ${ORPHAN_BRANCH} not found on origin`);
});

check('orphan branch has exactly one commit ahead of origin/main', () => {
  const count = Number(
    git(`rev-list --count origin/main..origin/${ORPHAN_BRANCH}`).trim()
  );
  assert.strictEqual(count, 1, `Expected 1 unique commit, got ${count}`);
});

check(`that commit starts with ${EXPECTED_COMMIT}`, () => {
  const sha = git(`rev-list origin/main..origin/${ORPHAN_BRANCH}`).trim();
  assert.ok(
    sha.startsWith(EXPECTED_COMMIT),
    `Expected SHA starting with ${EXPECTED_COMMIT}, got ${sha}`
  );
});

check('commit message matches doc claim', () => {
  const msg = git(`log --format=%s origin/main..origin/${ORPHAN_BRANCH}`).trim();
  assert.strictEqual(msg, 'fix: make npm test independent of missing jest binary');
});

check('changed files match the five files listed in doc', () => {
  const files = git(`diff --name-only origin/main...origin/${ORPHAN_BRANCH}`)
    .trim()
    .split('\n')
    .filter(Boolean)
    .sort();
  const expected = EXPECTED_FILES.slice().sort();
  assert.deepStrictEqual(files, expected);
});

check('newer superseding fix branch exists on origin', () => {
  const refs = execSync(`git ls-remote origin '${NEWER_BRANCH}'`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.ok(refs.includes(NEWER_BRANCH), `Newer branch ${NEWER_BRANCH} not found on origin`);
});

check('doc contains recommendation not to file PR for orphan branch', () => {
  const content = docContent();
  assert.ok(
    content.includes('Do not file a PR for'),
    'Doc missing recommendation against promoting orphan branch'
  );
});

console.log(`\n${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
