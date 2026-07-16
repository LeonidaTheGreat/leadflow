const assert = require('assert');
const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '..', 'completion-reports', 'COMPLETION-2f3d6fd6-bed8-4018-88a3-331358c78c23-20260716.json');

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

console.log('QC E2E: PR #1859 — Orphan branch investigation completion report\n');

test('completion report file exists', () => {
  assert.ok(fs.existsSync(REPORT_PATH), 'Report file missing');
});

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

test('has required top-level fields', () => {
  for (const key of ['taskId', 'status', 'rootCauseAnalysis', 'investigation', 'testResults']) {
    assert.ok(key in report, `Missing field: ${key}`);
  }
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

test('investigation identifies the orphan branch', () => {
  assert.ok(report.investigation.orphanBranch.includes('71003145'), 'Orphan branch name incorrect');
});

test('investigation documents prior PR history', () => {
  const pr = report.investigation.prHistory;
  assert.strictEqual(pr.prNumber, 1787);
  assert.strictEqual(pr.state, 'CLOSED');
  assert.strictEqual(pr.mergedAt, null);
});

test('investigation has a recommendation', () => {
  assert.ok(report.investigation.recommendation, 'Missing recommendation');
  assert.ok(report.investigation.recommendation.length > 10, 'Recommendation too short');
});

test('testResults passRate is valid', () => {
  assert.ok(report.testResults.passRate >= 0 && report.testResults.passRate <= 1, 'Invalid passRate');
});

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
