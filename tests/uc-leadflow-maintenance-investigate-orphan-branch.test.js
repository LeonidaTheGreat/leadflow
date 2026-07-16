#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPORT_PATH = path.join(__dirname, '..', 'completion-reports', 'COMPLETION-2f3d6fd6-bed8-4018-88a3-331358c78c23-20260716.json');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`✅ PASS: ${name}`);
  } catch (e) {
    console.log(`❌ FAIL: ${name} — ${e.message}`);
  }
}

console.log('=== E2E: Orphan Branch Investigation Report ===\n');

test('Completion report file exists', () => {
  assert.ok(fs.existsSync(REPORT_PATH), 'Report file missing');
});

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

test('Report is valid JSON with required fields', () => {
  for (const field of ['taskId', 'status', 'rootCauseAnalysis', 'investigation', 'testResults']) {
    assert.ok(report[field], `Missing field: ${field}`);
  }
});

test('taskId matches expected value', () => {
  assert.strictEqual(report.taskId, '2f3d6fd6-bed8-4018-88a3-331358c78c23');
});

test('status is completed', () => {
  assert.strictEqual(report.status, 'completed');
});

test('rootCauseAnalysis has failurePoint, why, and fix', () => {
  const rca = report.rootCauseAnalysis;
  assert.ok(rca.failurePoint, 'Missing failurePoint');
  assert.ok(rca.why, 'Missing why');
  assert.ok(rca.fix, 'Missing fix');
});

test('investigation references correct orphan branch', () => {
  assert.strictEqual(report.investigation.orphanBranch, 'dev/71003145-dev-rescue-uc-buyer-journey-pilot-signup');
});

test('investigation references correct closed PR #1787', () => {
  const pr = report.investigation.prHistory;
  assert.strictEqual(pr.prNumber, 1787);
  assert.strictEqual(pr.state, 'CLOSED');
  assert.strictEqual(pr.mergedAt, null);
});

test('orphan branch actually exists on remote', () => {
  const out = execSync('git ls-remote --heads origin dev/71003145-dev-rescue-uc-buyer-journey-pilot-signup', { encoding: 'utf8' });
  assert.ok(out.trim().length > 0, 'Orphan branch not found on remote');
});

test('orphan branch has exactly 1 commit ahead of main', () => {
  const out = execSync('git rev-list --count origin/main..origin/dev/71003145-dev-rescue-uc-buyer-journey-pilot-signup', { encoding: 'utf8' });
  assert.strictEqual(parseInt(out.trim(), 10), report.investigation.commitsAheadOfMain);
});

test('PR #1787 is actually closed (gh cli check)', () => {
  const out = execSync('gh pr view 1787 --json state --jq .state', { encoding: 'utf8' });
  assert.strictEqual(out.trim(), 'CLOSED');
});

console.log(`\n=== Results: ${passed}/${total} passed ===`);
process.exit(passed === total ? 0 : 1);
