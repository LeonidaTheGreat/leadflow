/**
 * TASK SPEC (934e1e13-13f2-4ad2-8c19-e5a25ad0b9f7)
 *
 * What:
 * - Add this maintenance investigation artifact:
 *   tests/uc-leadflow-maintenance-orphan-b0cea1ca.test.js.
 * - Functions changed: none. This task investigates orphan branch
 *   dev/b0cea1ca-investigate-stuck-uc-signup-page-shows-c using metadata-first
 *   triage and records whether its single signup-plan display regression test
 *   should be promoted, treated as shipped, or escalated.
 *
 * Verify:
 * - Run: node tests/uc-leadflow-maintenance-orphan-b0cea1ca.test.js
 *   Expected: all checks pass and output includes "6/6 passed".
 * - Run: npm test
 *   Expected: root test gate exits 0.
 * - Run: npm run build
 *   Expected: dashboard Next.js build exits 0.
 * - Run: npm run lint
 *   Expected: ESLint exits 0.
 *
 * Boundaries:
 * - Do not read or embed the orphan branch's full file contents or full diffs.
 * - Do not edit signup runtime code, routes, services, schemas, package files,
 *   generated protected docs, or dashboard/Tailscale settings.
 * - Do not delete the orphan branch, create a PR, merge, or touch live-checkout
 *   node_modules.
 *
 * ACCEPTANCE CRITERIA:
 * - This file exists and identifies the correct orphan branch, commit, changed
 *   path, and final verdict.
 * - The test proves the orphan branch has exactly one unique commit and that
 *   its only file object is already present on main.
 * - The test records that metadata search found main commit d248a9c9, which
 *   references PR #1886 for the same hand-ship marker.
 */
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ORPHAN_BRANCH = 'dev/b0cea1ca-investigate-stuck-uc-signup-page-shows-c';
const ORPHAN_COMMIT = '0e47c48c64e88ced9c1d55713eb3a763e88a29a9';
const MAIN_SHIPPED_COMMIT = 'd248a9c956955e5cd44b5f033211c5401821a32d';
const REGRESSION_TEST_PATH = 'tests/routes/signup-plans-display-regression.test.js';
const REGRESSION_TEST_OBJECT = '1e8b8bb8017b5c9106baeb576af8071b02084366';

const investigationVerdict = {
  verdict: 'already-shipped-safe-delete',
  recommendation:
    'Do not open a PR for the orphan branch; delete it after normal human approval because main already contains the identical regression test via PR #1886.',
};

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
  }).trim();
}

console.log(`\n=== Orphan branch investigation: ${ORPHAN_BRANCH} ===\n`);

check('orphan branch exists locally and as a remote-tracking ref', () => {
  const branches = git(['branch', '-a', '--list', `*${ORPHAN_BRANCH}`]);
  assert.ok(branches.includes(ORPHAN_BRANCH), `Missing local branch ${ORPHAN_BRANCH}`);
  assert.ok(
    branches.includes(`remotes/origin/${ORPHAN_BRANCH}`),
    `Missing remote-tracking branch origin/${ORPHAN_BRANCH}`
  );
});

check('orphan branch contains exactly one unique commit ahead of main', () => {
  const count = Number(git(['rev-list', '--count', `main..${ORPHAN_BRANCH}`]));
  assert.strictEqual(count, 1);
});

check('orphan unique commit is the expected regression guard commit', () => {
  const commit = git(['rev-parse', `${ORPHAN_BRANCH}^{commit}`]);
  assert.strictEqual(commit, ORPHAN_COMMIT);

  const subject = git(['show', '--format=%s', '--no-patch', ORPHAN_COMMIT]);
  assert.strictEqual(
    subject,
    'test: add regression guard for signup plan display (hand-ship b0cea1ca)'
  );
});

check('orphan commit only adds the signup plan display regression test path', () => {
  const changedPaths = git(['diff', '--name-status', `main...${ORPHAN_BRANCH}`])
    .split('\n')
    .filter(Boolean);
  assert.deepStrictEqual(changedPaths, [`A\t${REGRESSION_TEST_PATH}`]);
});

check('main already contains the identical regression test object', () => {
  const mainObject = git(['rev-parse', `main:${REGRESSION_TEST_PATH}`]);
  const orphanObject = git(['rev-parse', `${ORPHAN_BRANCH}:${REGRESSION_TEST_PATH}`]);
  assert.strictEqual(mainObject, REGRESSION_TEST_OBJECT);
  assert.strictEqual(orphanObject, REGRESSION_TEST_OBJECT);
});

check('main history records the same hand-ship marker through PR 1886', () => {
  const subject = git(['show', '--format=%s', '--no-patch', MAIN_SHIPPED_COMMIT]);
  assert.strictEqual(
    subject,
    'test: add regression guard for signup plan display (hand-ship b0cea1ca) (#1886)'
  );
  assert.strictEqual(investigationVerdict.verdict, 'already-shipped-safe-delete');
});

console.log(`\nVerdict: ${JSON.stringify(investigationVerdict)}\n`);
console.log(`${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
