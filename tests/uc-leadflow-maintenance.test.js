#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const reportPath = path.join(
  __dirname,
  '..',
  'docs',
  'reports',
  'orphan-branch-05cd51d7-verdict.json'
);

function readReport() {
  if (fs.existsSync(reportPath)) {
    return fs.readFileSync(reportPath, 'utf8');
  }

  return execFileSync(
    'git',
    [
      'show',
      'origin/dev/7ce78217-investigate-orphan-branch-dev-05cd51d7-f:docs/reports/orphan-branch-05cd51d7-verdict.json',
    ],
    { encoding: 'utf8' }
  );
}

const report = JSON.parse(readReport());

assert.strictEqual(report.taskId, '7ce78217-0706-44ed-a8bb-c209e330a400');
assert.strictEqual(report.investigatedBranch, 'dev/05cd51d7-fix-signup-page-smoke');
assert.strictEqual(report.verdict, 'duplicate/superseded');
assert.strictEqual(report.thisInvestigationPRContains.noCodeChanges, true);
assert.deepStrictEqual(report.thisInvestigationPRContains.filesChanged, [
  'docs/reports/orphan-branch-05cd51d7-verdict.json',
]);

assert(Array.isArray(report.evidence.supersededBy), 'supersededBy must be an array');
assert(
  report.evidence.supersededBy.some((entry) => entry.pr === 1474 && entry.state === 'MERGED'),
  'report must identify merged PR #1474 as superseding evidence'
);
assert.strictEqual(report.evidence.signupPageTouchedOnMainAfterOrphanCommit, false);
assert.match(report.recommendation, /Safe to delete dev\/05cd51d7-fix-signup-page-smoke/);

console.log('PASS uc-leadflow-maintenance: orphan branch verdict report is valid');
