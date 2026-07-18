/**
 * TASK SPEC (e27fbd65-01ca-44f8-ad2a-9c998d7498a1)
 *
 * What:
 * - Create this investigation artifact:
 *   tests/uc-leadflow-maintenance-e27fbd65-orphan-admin-verify-email.test.js
 * - Validate the orphan branch
 *   dev/e46c7656-dev-rescue-uc-admin-email-verify-overrid by checking its
 *   unique commit, the current mainline dashboard implementation, and the
 *   absence of the orphan branch's older root Express route on this branch.
 * - No product functions are changed. This file only adds repository-level
 *   assertions for the maintenance investigation.
 *
 * Verify:
 * - Run: node tests/uc-leadflow-maintenance-e27fbd65-orphan-admin-verify-email.test.js
 *   Expected: all assertions pass and the script exits 0.
 * - Run: rg -n "admin-verify-email|unverified-agents" routes server.js
 *   Expected: no references to the orphan branch's root Express route.
 * - Run: npm test
 *   Expected: root test command exits 0.
 * - Run: npm run build
 *   Expected: dashboard build exits 0.
 *
 * Boundaries:
 * - Do not port the orphan branch's routes/api/admin-verify-email.js because it
 *   performs database work inside an Express route and duplicates the shipped
 *   dashboard admin implementation.
 * - Do not modify dashboard admin verification source in this investigation.
 * - Do not delete the orphan branch, create a PR, or touch generated/protected
 *   project docs/config.
 *
 * ACCEPTANCE CRITERIA:
 * - This file exists and identifies the correct orphan branch and commit.
 * - The test proves current mainline code already ships the admin email
 *   verification override through the dashboard route/page/tests.
 * - The test proves the older root Express route from the orphan branch has not
 *   been introduced into this investigation branch.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ORPHAN_BRANCH = 'dev/e46c7656-dev-rescue-uc-admin-email-verify-overrid';
const ORPHAN_REMOTE = `origin/${ORPHAN_BRANCH}`;
const ORPHAN_COMMIT = 'f504a21963a2be04894f8f3125b2098ef07b314e';

const DASHBOARD_API_ROUTE = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/app/api/admin/verify-email/route.ts'
);
const DASHBOARD_PAGE = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/app/admin/email-verification/page.tsx'
);
const DASHBOARD_TEST = path.join(
  PROJECT_ROOT,
  'product/lead-response/dashboard/tests/admin-verify-email.test.ts'
);
const ROOT_EXPRESS_ROUTE = path.join(PROJECT_ROOT, 'routes/api/admin-verify-email.js');
const SERVER_ENTRY = path.join(PROJECT_ROOT, 'server.js');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    console.log(`FAIL: ${name}: ${err.message}`);
  }
}

function read(relativeOrAbsolutePath) {
  return fs.readFileSync(relativeOrAbsolutePath, 'utf8');
}

function git(command) {
  return execSync(`git ${command}`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

console.log(`Orphan branch investigation: ${ORPHAN_BRANCH}\n`);

test('orphan branch exists on remote at expected commit', () => {
  const ref = git(`rev-parse ${ORPHAN_REMOTE}`);
  assert.strictEqual(ref, ORPHAN_COMMIT);
});

test('orphan branch has exactly one commit ahead of origin/main', () => {
  const count = Number(git(`rev-list --count origin/main..${ORPHAN_REMOTE}`));
  assert.strictEqual(count, 1);
});

test('orphan commit added the older root Express admin verification route', () => {
  const files = git(`diff-tree --no-commit-id --name-only -r ${ORPHAN_COMMIT}`).split('\n');
  assert.ok(files.includes('routes/api/admin-verify-email.js'));
  assert.ok(files.includes('tests/unit/admin-verify-email-route.test.js'));
  assert.ok(files.includes('server.js'));
});

test('current branch already has the shipped dashboard API implementation', () => {
  assert.ok(fs.existsSync(DASHBOARD_API_ROUTE), 'dashboard API route is missing');
  const source = read(DASHBOARD_API_ROUTE);
  assert.ok(source.includes('export async function GET'), 'GET handler missing');
  assert.ok(source.includes('export async function POST'), 'POST handler missing');
  assert.ok(source.includes("from('real_estate_agents')"), 'real_estate_agents update/query missing');
  assert.ok(source.includes('requireAdmin'), 'admin auth guard missing');
  assert.ok(source.includes('email_verified'), 'email verification filter/update missing');
});

test('current branch already has the shipped admin page for manual verification', () => {
  assert.ok(fs.existsSync(DASHBOARD_PAGE), 'dashboard admin page is missing');
  const source = read(DASHBOARD_PAGE);
  assert.ok(source.includes('Email Verification Override'));
  assert.ok(source.includes("fetch('/api/admin/verify-email'"));
  assert.ok(source.includes('verifySingle'));
  assert.ok(source.includes('verifyAll'));
  assert.ok(source.includes('Agent login'));
});

test('current branch already has dashboard route tests for the shipped implementation', () => {
  assert.ok(fs.existsSync(DASHBOARD_TEST), 'dashboard route test is missing');
  const source = read(DASHBOARD_TEST);
  assert.ok(source.includes("import { GET, POST } from '../app/api/admin/verify-email/route'"));
  assert.ok(source.includes('returns unverified agents'));
  assert.ok(source.includes('verifies a single agent by agentId'));
  assert.ok(source.includes('verifies all unverified agents when all=true'));
  assert.ok(source.includes('returns 401 without admin auth'));
});

test('current branch does not import the orphan root Express route', () => {
  assert.strictEqual(fs.existsSync(ROOT_EXPRESS_ROUTE), false);
  const server = read(SERVER_ENTRY);
  assert.ok(!server.includes('admin-verify-email'));
  assert.ok(!server.includes('adminVerifyEmailRouter'));
});

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
