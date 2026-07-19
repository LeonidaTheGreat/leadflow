const assert = require('assert');
const { execFileSync } = require('child_process');

const PR_REF = 'origin/dev/7ce78217-investigate-orphan-branch-dev-05cd51d7-f';
const ORPHAN_REF = 'origin/dev/05cd51d7-fix-signup-page-smoke';
const REPORT_PATH = 'docs/reports/orphan-branch-05cd51d7-verdict.json';
const SIGNUP_PATH = 'product/lead-response/dashboard/app/signup/page.tsx';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' });
}

const report = JSON.parse(git(['show', `${PR_REF}:${REPORT_PATH}`]));
assert.strictEqual(report.thisInvestigationPRContains.noCodeChanges, true);
assert.deepStrictEqual(report.thisInvestigationPRContains.filesChanged, [REPORT_PATH]);

const changedFiles = git(['diff', '--name-only', `origin/main...${PR_REF}`])
  .trim()
  .split('\n')
  .filter(Boolean);
assert.deepStrictEqual(changedFiles, [REPORT_PATH]);

const signupSource = git(['show', `${ORPHAN_REF}:${SIGNUP_PATH}`]);
const useClientIndex = signupSource.indexOf("'use client'");
const dynamicIndex = signupSource.indexOf("export const dynamic = 'force-static'");

assert.ok(useClientIndex >= 0, "orphan signup page must contain 'use client'");
assert.ok(dynamicIndex >= 0, 'orphan signup page must contain force-static export');
assert.ok(
  dynamicIndex < useClientIndex,
  "report claims dynamic was added before 'use client', but actual orphan source places it after"
);

console.log('uc-leadflow-maintenance report validation passed');
