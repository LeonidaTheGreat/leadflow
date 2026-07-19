#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { execFileSync } = require('child_process');

const REVIEW_BRANCH = 'dev/5129e487-investigate-orphan-branch-dev-0b492286-w';
const REQUIRED_VERDICT = 'docs/reports/orphan-branch-0b492286-verdict.json';

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

const changedFiles = git(['diff', '--name-only', `main...${REVIEW_BRANCH}`])
  .split('\n')
  .filter(Boolean);

assert(changedFiles.includes(REQUIRED_VERDICT), `${REQUIRED_VERDICT} must be present`);

const forbiddenSourceChanges = changedFiles.filter((file) => (
  file.startsWith('routes/')
  || file.startsWith('lib/')
  || file.startsWith('server.js')
  || file.startsWith('product/lead-response/dashboard/app/')
  || file.startsWith('product/lead-response/dashboard/lib/')
));

assert.deepStrictEqual(forbiddenSourceChanges, [], 'PR must not change application source files');

const verdictJson = git(['show', `${REVIEW_BRANCH}:${REQUIRED_VERDICT}`]);
const verdict = JSON.parse(verdictJson);

assert.strictEqual(verdict.investigationTaskId, '5129e487-b13f-4a0c-9b87-df8933cec67e');
assert.strictEqual(verdict.branch, 'dev/0b492286-write-tests-for-untested-hub-db');
assert.strictEqual(verdict.verdict, 'shippable-needs-task-pr');
assert.strictEqual(verdict.evidence.productionCodeChanged, false);
assert.match(verdict.recommendation, /Create a task and PR/i);

const packageDiff = git(['diff', `main...${REVIEW_BRANCH}`, '--', 'package.json']);
assert.match(packageDiff, /"testSuiteFloor": 0/);

console.log('PASS uc-leadflow-maintenance-pr1981: PR diff and orphan verdict contract verified');
