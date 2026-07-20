const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

// Reports using the `investigatedBranch` field name (older format)
const reports = [
  {
    path: 'docs/orphan-branch-verdict-3ed1dec0.json',
    expectedBranch: 'dev/3ed1dec0-fix-ci-final',
    allowedVerdicts: ['duplicate/superseded']
  },
  {
    path: 'docs/reports/orphan-branch-319f2369-verdict.json',
    expectedBranch: 'dev/319f2369-fix-inactivity-schedule',
    allowedVerdicts: ['shippable-needs-task-pr']
  }
];

for (const report of reports) {
  const absolutePath = path.join(repoRoot, report.path);
  assert.ok(fs.existsSync(absolutePath), `${report.path} should exist`);

  const data = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  assert.strictEqual(
    data.investigatedBranch,
    report.expectedBranch,
    `${report.path} should identify the investigated branch`
  );
  assert.ok(
    report.allowedVerdicts.includes(data.verdict),
    `${report.path} should contain an expected verdict`
  );
  assert.ok(
    typeof data.recommendation === 'string' && data.recommendation.length > 20,
    `${report.path} should include an actionable recommendation`
  );
  assert.ok(
    data.evidence && typeof data.evidence === 'object',
    `${report.path} should include structured evidence`
  );
  assert.ok(
    Array.isArray(data.commandsRun) && data.commandsRun.length >= 3,
    `${report.path} should include command provenance`
  );
}

// b8112be4 verdict uses `branch` (not `investigatedBranch`) — test it directly
{
  const verdictPath = path.join(repoRoot, 'docs/orphan-branch-verdict-b8112be4.json');
  assert.ok(fs.existsSync(verdictPath), 'docs/orphan-branch-verdict-b8112be4.json should exist');

  const data = JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
  assert.strictEqual(
    data.branch,
    'dev/b8112be4-write-tests-for-untested-hub-index',
    'b8112be4 verdict should identify the investigated branch via `branch` field'
  );
  assert.strictEqual(data.verdict, 'already-shipped-safe-delete', 'b8112be4 verdict should be already-shipped-safe-delete');
  assert.ok(
    data.rootCauseAnalysis && data.rootCauseAnalysis.failurePoint && data.rootCauseAnalysis.why && data.rootCauseAnalysis.fix,
    'b8112be4 verdict should have complete rootCauseAnalysis'
  );
  assert.ok(
    data.evidence && data.evidence.matchingMainCommit && typeof data.evidence.matchingMainCommit.samePatchId === 'string',
    'b8112be4 verdict should include patch-id match evidence'
  );
  assert.ok(
    typeof data.recommendation === 'string' && data.recommendation.length > 20,
    'b8112be4 verdict should include actionable recommendation'
  );
  assert.ok(
    Array.isArray(data.commandsRun) && data.commandsRun.length >= 3,
    'b8112be4 verdict should include command provenance'
  );
}

console.log('PASS: orphan branch investigation reports are valid');
