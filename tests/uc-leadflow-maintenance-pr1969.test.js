const assert = require('assert');
const { execFileSync } = require('child_process');

const PR_BRANCH = 'origin/dev/4e4196b4-investigate-orphan-branch-dev-0e938cf5-d';
const BASE_BRANCH = 'origin/main';
const REPORT_PATH = 'docs/reports/orphan-branch-0e938cf5-verdict.json';

function git(args) {
  return execFileSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

test('PR 1969 only adds the orphan branch verdict report', () => {
  const changedFiles = git(['diff', '--name-only', `${BASE_BRANCH}...${PR_BRANCH}`])
    .split('\n')
    .filter(Boolean);

  assert.deepStrictEqual(changedFiles, [REPORT_PATH]);
});

test('orphan branch verdict report is valid and actionable', () => {
  const report = JSON.parse(git(['show', `${PR_BRANCH}:${REPORT_PATH}`]));

  assert.strictEqual(report.taskId, '4e4196b4-5bb1-4b3e-9b17-b025b2ec12d8');
  assert.strictEqual(report.investigatedBranch, 'dev/0e938cf5-dev-re-merge-fix-subscription-attempts-t');
  assert.strictEqual(report.verdict, 'needs-human-review');
  assert.strictEqual(report.thisInvestigationPRContains.noCodeChanges, true);
  assert.deepStrictEqual(report.thisInvestigationPRContains.filesChanged, [REPORT_PATH]);

  assert.match(report.keyFinding.netNewCode, /handleCheckoutSessionExpired\(\)/);
  assert.match(report.recommendation, /Do NOT auto-merge/);
  assert.ok(Array.isArray(report.commandsRun));
  assert.ok(report.commandsRun.length >= 10);
});
