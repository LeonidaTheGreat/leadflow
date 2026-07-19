const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const reportPath = path.join(repoRoot, 'docs/reports/orphan-branch-319f2369-verdict.json');

assert.ok(fs.existsSync(reportPath), 'orphan branch verdict report must exist');

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

assert.strictEqual(
  report.investigatedBranch,
  'dev/319f2369-fix-inactivity-schedule',
  'report must identify the investigated orphan branch'
);
assert.strictEqual(
  report.verdict,
  'shippable-needs-task-pr',
  'report must preserve the shipping verdict'
);
assert.strictEqual(
  report.evidence.openPRs,
  'none — no PR was ever opened for this branch',
  'report must document that no PR exists for the orphan branch'
);
assert.match(
  report.recommendation,
  /create a task to review the schedule frequency justification/,
  'recommendation must require a follow-up task before shipping'
);
assert.match(
  report.recommendation,
  /Do NOT auto-merge/,
  'recommendation must prevent automatic merge of the stale branch'
);
assert.ok(
  report.commandsRun.includes('gh pr list --state all --head dev/319f2369-fix-inactivity-schedule'),
  'report must include the PR lookup command in evidence'
);

console.log('PASS uc-leadflow-maintenance report contract');
