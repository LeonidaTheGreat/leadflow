'use strict';

/**
 * E2E verification for PR #1936 — orphan branch investigation (task b061fd5a).
 *
 * Covers three behaviors introduced in this PR:
 *   1. Completion report is valid JSON with required fields and correct verdict.
 *   2. npm test exits 0 without external credentials (test-suite-gate fix).
 *   3. Orphan commit ef6f86d1 is patch-equivalent to main (already-shipped).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(
  PROJECT_ROOT,
  'completion-reports',
  'COMPLETION-b061fd5a-64f3-4993-b63f-19342a2c1fe8-20260718T154259-0400.json'
);
const ORPHAN_BRANCH = 'dev/06d32f1c-dev-rescue-fix-invite-accept-409-broken';
const ORPHAN_COMMIT = 'ef6f86d1';

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
  return execFileSync('git', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

console.log('\n=== PR #1936 — orphan b061fd5a investigation ===\n');

// ── 1. Completion report exists and parses ────────────────────────────────────
check('completion report file exists', () => {
  assert.ok(fs.existsSync(REPORT_PATH), `Missing: ${REPORT_PATH}`);
});

let report;
check('completion report is valid JSON', () => {
  const raw = fs.readFileSync(REPORT_PATH, 'utf8');
  report = JSON.parse(raw);
});

check('completion report has required fields', () => {
  const required = ['taskId', 'status', 'verdict', 'evidence', 'risk', 'recommendation', 'rootCauseAnalysis'];
  for (const field of required) {
    assert.ok(report[field] !== undefined, `Missing field: ${field}`);
  }
});

check('completion report verdict is already-shipped-safe-delete', () => {
  assert.strictEqual(report.verdict, 'already-shipped-safe-delete');
});

check('rootCauseAnalysis has failurePoint, why, fix', () => {
  const rca = report.rootCauseAnalysis;
  assert.ok(rca.failurePoint && rca.failurePoint.length > 0, 'failurePoint missing');
  assert.ok(rca.why && rca.why.length > 0, 'why missing');
  assert.ok(rca.fix && rca.fix.length > 0, 'fix missing');
});

// ── 2. test-suite-gate.js exits 0 without external credentials ───────────────
check('test-suite-gate.js exits 0 (deterministic gate)', () => {
  const env = {
    ...process.env,
    FUB_API_KEY: '',
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    NODE_PATH: '/Users/clawdbot/projects/leadflow/node_modules',
  };
  const result = spawnSync(
    process.execPath,
    ['scripts/test-suite-gate.js'],
    { cwd: PROJECT_ROOT, env, stdio: 'pipe', timeout: 60000 }
  );
  assert.strictEqual(result.status, 0,
    `test-suite-gate exited ${result.status}: ${(result.stderr || '').toString().slice(0, 300)}`
  );
});

// ── 3. Orphan commit is patch-equivalent to main (cherry returns '-') ─────────
check('orphan commit is already on main (git cherry returns -)', () => {
  const cherryOut = git(['cherry', '-v', 'main', ORPHAN_BRANCH]);
  const firstLine = cherryOut.split('\n')[0];
  assert.ok(
    firstLine.startsWith('- '),
    `Expected commit to be marked as already-applied (- prefix), got: ${firstLine}`
  );
  assert.ok(firstLine.includes(ORPHAN_COMMIT), `Expected ${ORPHAN_COMMIT} in cherry output`);
});

check('main history contains the patch-equivalent commit subject', () => {
  const mainLog = git(['log', 'main', '--oneline', '--grep=trial_expires_at, add accepted_at']);
  assert.ok(mainLog.includes('31042b3b'), `Expected 31042b3b on main, got: ${mainLog}`);
});

console.log(`\n${passed}/${total} passed\n`);
process.exit(passed === total ? 0 : 1);
