const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

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

console.log('PASS: orphan branch investigation reports are valid');

// ac55e92e investigation — uses flat schema (branch/taskId at root, no investigatedBranch key)
const ac55e92ePath = path.join(repoRoot, 'orphan-investigation-ac55e92e.json');
assert.ok(fs.existsSync(ac55e92ePath), 'orphan-investigation-ac55e92e.json should exist');
const ac55 = JSON.parse(fs.readFileSync(ac55e92ePath, 'utf8'));
assert.strictEqual(ac55.branch, 'dev/ac55e92e-fix-vercel-dashboard-health-smoke', 'should name the investigated branch');
assert.strictEqual(ac55.verdict, 'already-shipped-safe-delete', 'should classify as already shipped');
assert.ok(ac55.rootCauseAnalysis && ac55.rootCauseAnalysis.failurePoint && ac55.rootCauseAnalysis.why, 'should have root cause analysis');
assert.ok(ac55.evidence && ac55.evidence.matchingMainCommit, 'should reference the squash commit that shipped the work');
assert.ok(ac55.evidence.matchingMainCommitIsAncestorOfMain === true, 'squash commit must be confirmed as ancestor of main');
assert.ok(Array.isArray(ac55.commandsRun) && ac55.commandsRun.length >= 5, 'should document at least 5 commands run');
assert.ok(typeof ac55.recommendation === 'string' && ac55.recommendation.length > 20, 'should include a recommendation');
console.log('PASS: ac55e92e orphan investigation report is valid');
