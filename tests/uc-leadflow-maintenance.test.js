#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');

const PR_BRANCH = 'dev/ea231f24-investigate-orphan-branch-dev-13489e85-f';
const REPORT_PATH = 'docs/reports/orphan-branch-ea231f24-verdict.json';
const EXPECTED_ORPHAN_BRANCH = 'dev/13489e85-fix-quality-gate-completion-reports-fail';
const EXPECTED_MAIN_COMMIT = 'a21ba52f';

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

const report = JSON.parse(git(['show', `${PR_BRANCH}:${REPORT_PATH}`]));

assert.strictEqual(report.taskId, 'ea231f24-43c9-41ab-af93-86fff9b97cf0');
assert.strictEqual(report.branch, EXPECTED_ORPHAN_BRANCH);
assert.strictEqual(report.verdict, 'already-shipped-safe-delete');
assert.strictEqual(report.evidence.mainContainsWork, true);
assert.strictEqual(report.evidence.prState, 'MERGED');
assert.strictEqual(report.evidence.prNumber, 1518);
assert.strictEqual(report.evidence.prHeadBranch, EXPECTED_ORPHAN_BRANCH);
assert.match(report.recommendation, /Safe to delete remote branch/);

const mainCommit = git(['rev-parse', `${EXPECTED_MAIN_COMMIT}^{commit}`]);
git(['merge-base', '--is-ancestor', mainCommit, 'origin/main']);

assert(
  report.evidence.mainCommitSHA.startsWith(EXPECTED_MAIN_COMMIT),
  'report should cite the shipped main commit',
);

console.log('PASS: orphan branch ea231f24 maintenance verdict is internally consistent');
