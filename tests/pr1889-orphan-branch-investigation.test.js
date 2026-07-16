// E2E verification for PR #1889 — Orphan branch investigation report
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = '/Users/clawdbot/projects/leadflow';
const REPORT_PATH = path.join(ROOT, 'docs/reports/ORPHAN-BRANCH-06d32f1c-investigation.md');

let passed = 0; let failed = 0;
function check(label, fn) {
  try { fn(); console.log(`✅ ${label}`); passed++; }
  catch (e) { console.log(`❌ ${label}: ${e.message}`); failed++; }
}

// Must checkout the PR branch to read the file
execSync('git -C ' + ROOT + ' fetch origin dev/8170e4f4-investigate-orphan-branch-dev-06d32f1c-d --quiet', { stdio: 'pipe' });

// Read report from branch (not from working tree since we're on main)
let report;
check('Investigation report exists on PR branch', () => {
  report = execSync(
    'git -C ' + ROOT + ' show origin/dev/8170e4f4-investigate-orphan-branch-dev-06d32f1c-d:docs/reports/ORPHAN-BRANCH-06d32f1c-investigation.md',
    { stdio: 'pipe' }
  ).toString();
  assert.ok(report.length > 0, 'Report is empty');
});

check('Report states SHIPPABLE verdict', () => assert.ok(report.includes('SHIPPABLE')));
check('Report references fix commit bfedb7f', () => assert.ok(report.includes('bfedb7f')));
check('Report references test commit 21bb0f9', () => assert.ok(report.includes('21bb0f9')));
check('Report describes accepted_at fix', () => assert.ok(report.includes('accepted_at')));
check('Report explains agent_id root cause', () => assert.ok(report.includes('agent_id')));
check('Report mentions new set-password endpoint', () => assert.ok(report.includes('set-password')));

// Verify the orphan branch itself
execSync('git -C ' + ROOT + ' fetch origin dev/06d32f1c-dev-rescue-fix-invite-accept-409-broken --quiet', { stdio: 'pipe' });

check('Orphan branch has fix commit bfedb7f', () => {
  const log = execSync('git -C ' + ROOT + ' log origin/main..origin/dev/06d32f1c-dev-rescue-fix-invite-accept-409-broken --oneline', { stdio: 'pipe' }).toString();
  assert.ok(log.includes('bfedb7f'), `Not found: ${log}`);
});
check('Orphan branch has test commit 21bb0f9', () => {
  const log = execSync('git -C ' + ROOT + ' log origin/main..origin/dev/06d32f1c-dev-rescue-fix-invite-accept-409-broken --oneline', { stdio: 'pipe' }).toString();
  assert.ok(log.includes('21bb0f9'), `Not found: ${log}`);
});
check('Orphan branch has exactly 5 changed files', () => {
  const files = execSync('git -C ' + ROOT + ' diff main...origin/dev/06d32f1c-dev-rescue-fix-invite-accept-409-broken --name-only', { stdio: 'pipe' }).toString().trim().split('\n');
  assert.strictEqual(files.length, 5, `Expected 5, got ${files.length}: ${files.join(', ')}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
