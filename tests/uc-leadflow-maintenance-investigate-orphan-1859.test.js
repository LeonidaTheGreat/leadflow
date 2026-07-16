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
    console.log(`✅ ${name}`);
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
  }
}

test('Completion report file exists', () => {
  assert.ok(fs.existsSync(REPORT_PATH), 'Report file missing');
});

const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

test('Has required top-level fields', () => {
  for (const key of ['taskId', 'status', 'rootCauseAnalysis', 'investigation', 'testResults']) {
    assert.ok(key in report, `Missing field: ${key}`);
  }
});

test('Status is completed', () => {
  assert.strictEqual(report.status, 'completed');
});

test('rootCauseAnalysis has failurePoint, why, fix', () => {
  const rca = report.rootCauseAnalysis;
  assert.ok(rca.failurePoint, 'Missing failurePoint');
  assert.ok(rca.why, 'Missing why');
  assert.ok(rca.fix, 'Missing fix');
});

test('Investigation references the correct orphan branch', () => {
  assert.strictEqual(report.investigation.orphanBranch, 'dev/71003145-dev-rescue-uc-buyer-journey-pilot-signup');
});

test('Investigation includes PR history', () => {
  assert.strictEqual(report.investigation.prHistory.prNumber, 1787);
  assert.strictEqual(report.investigation.prHistory.state, 'CLOSED');
});

test('Recommendation is SHIP', () => {
  assert.ok(report.investigation.recommendation.startsWith('SHIP'), 'Expected SHIP recommendation');
});

console.log(`\n${passed}/${total} passed`);
process.exit(passed === total ? 0 : 1);
