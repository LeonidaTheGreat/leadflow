/**
 * TASK SPEC (edbc0675-20f6-4477-81ac-7e8f3de9a220)
 *
 * What:
 * - Add this maintenance investigation artifact:
 *   tests/uc-leadflow-maintenance-orphan-db9ec528.test.js.
 * - Add docs/orphan-branch-verdict-db9ec528.json with the metadata-only
 *   verdict for orphan branch
 *   dev/db9ec528-dev-uc-genome-broken-import-comment-filt.
 * - Functions changed: none. This task investigates Git/PR/task metadata only.
 *
 * Verify:
 * - Run: node tests/uc-leadflow-maintenance-orphan-db9ec528.test.js
 *   Expected: all checks pass and output includes "6/6 passed".
 * - Run: npm test
 *   Expected: root test gate exits 0.
 * - Run: npm run build
 *   Expected: dashboard Next.js build exits 0.
 * - Run: npm run lint
 *   Expected: ESLint exits 0.
 *
 * Boundaries:
 * - Do not read full branch file contents or full diffs over 200 lines.
 * - Do not modify product code, routes, services, schemas, package files,
 *   generated protected docs, dashboard/Tailscale settings, PRs, or task rows.
 * - Do not delete the orphan branch, create a PR, merge, or touch live-checkout
 *   node_modules.
 *
 * ACCEPTANCE CRITERIA:
 * - The JSON verdict file exists and contains verdict, evidence, risk,
 *   recommendation, rootCauseAnalysis, taskSpec, and commandsRun.
 * - This test proves the orphan branch has exactly one unique commit and zero
 *   changed paths relative to main.
 * - This test proves the orphan commit is an empty verification commit by
 *   comparing its tree hash with its parent tree hash.
 */
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ORPHAN_BRANCH = 'origin/dev/db9ec528-dev-uc-genome-broken-import-comment-filt';
const ORPHAN_COMMIT = '7ca36fbba057fb13538c358490eb74e0450367bf';
const ORPHAN_SHORT_SHA = '7ca36fbb';
const ORPHAN_SUBJECT = 'fix: add branch commit for db9ec528 verification';
const VERDICT_PATH = 'docs/orphan-branch-verdict-db9ec528.json';

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

function shell(command, args) {
  return execFileSync(command, args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

console.log(`\n=== Orphan branch investigation: ${ORPHAN_BRANCH} ===\n`);

check('orphan branch exists as a remote-tracking ref at expected commit', () => {
  const ref = git(['show-ref', '--verify', `refs/remotes/${ORPHAN_BRANCH}`]);
  assert.ok(ref.startsWith(`${ORPHAN_COMMIT} refs/remotes/${ORPHAN_BRANCH}`));
});

check('orphan branch contains exactly one unique commit ahead of main', () => {
  const count = Number(git(['rev-list', '--count', `main..${ORPHAN_BRANCH}`]));
  assert.strictEqual(count, 1);
});

check('unique commit has the expected subject', () => {
  const logLine = git(['log', '--oneline', `main..${ORPHAN_BRANCH}`]);
  assert.strictEqual(logLine, `${ORPHAN_SHORT_SHA} ${ORPHAN_SUBJECT}`);
});

check('orphan branch has zero changed paths relative to main', () => {
  const changedPaths = git(['diff', '--name-status', `main...${ORPHAN_BRANCH}`]);
  assert.strictEqual(changedPaths, '');
});

check('orphan commit tree is identical to parent tree', () => {
  const orphanTree = git(['show', '-s', '--format=%T', ORPHAN_COMMIT]);
  const parentTree = git(['show', '-s', '--format=%T', `${ORPHAN_COMMIT}^`]);
  assert.strictEqual(orphanTree, parentTree);
});

check('verdict file records safe-delete recommendation', () => {
  const verdict = JSON.parse(shell('node', ['-e', `process.stdout.write(JSON.stringify(require('./${VERDICT_PATH}')))`]));
  assert.strictEqual(verdict.verdict, 'already-shipped-safe-delete');
  assert.strictEqual(verdict.branch, 'dev/db9ec528-dev-uc-genome-broken-import-comment-filt');
  assert.ok(verdict.recommendation.includes('Do not auto-delete'));
});

console.log(`\n${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
