/**
 * Task Spec: e9253281-8dda-49ed-95ff-f8cf91b3afc4
 *
 * What:
 * - Add this maintenance investigation test at tests/uc-leadflow-maintenance-orphan-6d39ae0e.test.js.
 * - Verify that orphan branch dev/6d39ae0e-dev-rescue-fix-signup-page-shows-choose
 *   has no unshipped product change because its signup plan-card regression
 *   test already exists on main as
 *   product/lead-response/dashboard/tests/signup-page-plan-cards.test.tsx.
 *
 * Verify:
 * - Run: node tests/uc-leadflow-maintenance-orphan-6d39ae0e.test.js
 *   Expected: all checks pass and the output includes "6/6 passed".
 * - Run: npm test
 *   Expected: command exits 0 with the existing end-to-end flow checks passing.
 * - Run: npm run build
 *   Expected: dashboard Next.js build completes successfully.
 * - Run: npm run lint
 *   Expected: ESLint exits 0.
 *
 * Boundaries:
 * - Do not edit signup page runtime code, routes, services, migrations, or
 *   generated project docs.
 * - Do not delete the orphan branch from this task runtime.
 * - Do not create a PR or merge; the orchestrator owns that lifecycle.
 */
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ORPHAN_BRANCH = 'dev/6d39ae0e-dev-rescue-fix-signup-page-shows-choose';
const SHIPPED_TEST_PATH = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/tests/signup-page-plan-cards.test.tsx'
);

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
  return execSync(`git ${args}`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

console.log('\n=== Orphan branch investigation: dev/6d39ae0e signup page test ===\n');

check('orphan branch exists locally or on origin', () => {
  const branches = git(`branch -a --list "*${ORPHAN_BRANCH}"`);
  assert.ok(branches.includes(ORPHAN_BRANCH), `Missing branch ${ORPHAN_BRANCH}`);
});

check('orphan branch contains exactly one unique commit', () => {
  const count = Number(git(`rev-list --count ${ORPHAN_BRANCH} ^${ORPHAN_BRANCH}~1`).trim());
  assert.strictEqual(count, 1);
});

check('current main contains the shipped signup plan-card regression test', () => {
  assert.ok(fs.existsSync(SHIPPED_TEST_PATH), `Missing ${SHIPPED_TEST_PATH}`);
});

check('shipped test covers all three paid signup plan cards and prices', () => {
  const source = fs.readFileSync(SHIPPED_TEST_PATH, 'utf8');
  for (const expected of [
    'signup-plan-card-starter',
    'signup-plan-card-pro',
    'signup-plan-card-team',
    '$49',
    '$149',
    '$399',
  ]) {
    assert.ok(source.includes(expected), `Missing ${expected}`);
  }
});

check('orphan test content is byte-for-byte identical to current main', () => {
  const mainContent = fs.readFileSync(SHIPPED_TEST_PATH, 'utf8');
  const orphanContent = git(`show ${ORPHAN_BRANCH}:product/lead-response/dashboard/tests/signup-page-plan-cards.test.tsx`);
  assert.strictEqual(sha256(mainContent), sha256(orphanContent));
});

check('main history records this orphan as already rescued', () => {
  const log = git('log --oneline -- product/lead-response/dashboard/tests/signup-page-plan-cards.test.tsx');
  assert.ok(
    log.includes('from orphan branch 6d39ae0e'),
    'Expected main history to include the orphan rescue commit marker'
  );
});

console.log(`\n${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
