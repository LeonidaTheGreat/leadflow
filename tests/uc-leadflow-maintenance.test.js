const assert = require('assert');
const { execFileSync } = require('child_process');

const branchRef = 'origin/dev/5129e487-investigate-orphan-branch-dev-0b492286-w';
const reportPath = 'docs/reports/orphan-branch-0b492286-verdict.json';

function readReportFromBranch() {
  const raw = execFileSync('git', ['show', `${branchRef}:${reportPath}`], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  return JSON.parse(raw);
}

const report = readReportFromBranch();

assert.strictEqual(report.investigationTaskId, '5129e487-b13f-4a0c-9b87-df8933cec67e');
assert.strictEqual(report.verdict, 'shippable-needs-task-pr');
assert.strictEqual(report.evidence.productionCodeChanged, false);
assert.deepStrictEqual(
  report.evidence.filesChanged.map((entry) => entry.file),
  ['tests/0b492286.test.js', 'tests/unit/db.test.js']
);
assert.ok(report.recommendation.includes('Create a task and PR'));
assert.ok(Array.isArray(report.commandsRun));
assert.ok(report.commandsRun.length >= 5);

console.log('PASS: orphan branch verdict report contract is valid');
