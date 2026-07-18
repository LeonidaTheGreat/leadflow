'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ORPHAN = 'origin/dev/e46c7656-dev-rescue-uc-admin-email-verify-overrid';
const ORPHAN_HASH = 'f504a21963a2be04894f8f3125b2098ef07b314e';

let passed = 0;
let total = 0;

function check(name, fn) {
  total++;
  try { fn(); passed++; console.log(`PASS: ${name}`); }
  catch (e) { console.log(`FAIL: ${name}: ${e.message}`); }
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

check('orphan commit hash matches', () => {
  assert.strictEqual(git('rev-parse', ORPHAN), ORPHAN_HASH);
});

check('orphan is exactly 1 commit ahead of main', () => {
  assert.strictEqual(Number(git('rev-list', '--count', `origin/main..${ORPHAN}`)), 1);
});

check('orphan introduced root Express route (routes/api/admin-verify-email.js)', () => {
  const files = git('diff-tree', '--no-commit-id', '--name-only', '-r', ORPHAN_HASH).split('\n');
  assert.ok(files.includes('routes/api/admin-verify-email.js'));
});

check('main already ships dashboard admin verify-email API route', () => {
  const p = path.join(ROOT, 'product/lead-response/dashboard/app/api/admin/verify-email/route.ts');
  assert.ok(fs.existsSync(p));
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(src.includes('export async function GET'));
  assert.ok(src.includes('export async function POST'));
});

check('main already ships dashboard admin email-verification page', () => {
  const p = path.join(ROOT, 'product/lead-response/dashboard/app/admin/email-verification/page.tsx');
  assert.ok(fs.existsSync(p));
  const src = fs.readFileSync(p, 'utf8');
  assert.ok(src.includes('Email Verification Override'));
});

check('main already ships admin verify-email tests', () => {
  const p = path.join(ROOT, 'product/lead-response/dashboard/tests/admin-verify-email.test.ts');
  assert.ok(fs.existsSync(p));
});

check('orphan root Express route not present on main', () => {
  assert.ok(!fs.existsSync(path.join(ROOT, 'routes/api/admin-verify-email.js')));
});

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
