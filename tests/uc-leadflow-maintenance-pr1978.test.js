const assert = require('assert');
const { execFileSync } = require('child_process');

const branch = 'origin/dev/c779c953-investigate-orphan-branch-dev-1c19567f-d';
const verdictPath = 'docs/orphan-branch-verdict-1c19567f.json';
const raw = execFileSync('git', ['show', `${branch}:${verdictPath}`], {
  encoding: 'utf8',
});
const verdict = JSON.parse(raw);

assert.strictEqual(
  verdict.branch,
  'dev/1c19567f-dev-re-merge-fix-api-health-endpoint-wro',
  'verdict must identify the reviewed orphan branch'
);
assert.strictEqual(verdict.verdict, 'duplicate/superseded');
assert.strictEqual(verdict.recommendation.startsWith('safe-delete'), true);
assert.strictEqual(verdict.evidence.originalFix.pr, 132);
assert.strictEqual(verdict.evidence.originalFix.state, 'MERGED');
assert.strictEqual(verdict.evidence.sisterRemergeAttempt.pr, 1661);
assert.ok(
  verdict.evidence.filesChanged.includes(
    'product/lead-response/dashboard/tests/fix-api-health-endpoint-wrong-table.test.js'
  ),
  'verdict must name the changed test file'
);
assert.ok(
  verdict.commandsRun.includes('gh pr view 1661 --json state,mergedAt,closedAt,title,headRefName,commits'),
  'verdict should include the sister PR verification command'
);

console.log('PASS: PR #1978 orphan branch verdict document is valid');
