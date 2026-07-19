#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// Fetch the verdict from origin/dev branch to test the PR's content
const verdictPath = path.join(ROOT, 'docs', 'orphan-branch-verdict-36c178f4.json');

test('verdict file exists at docs/orphan-branch-verdict-36c178f4.json', () => {
  assert.ok(fs.existsSync(verdictPath), `Missing: ${verdictPath}`);
});

let verdict;
test('verdict file is valid JSON', () => {
  const raw = fs.readFileSync(verdictPath, 'utf8');
  verdict = JSON.parse(raw);
});

test('verdict has required fields: verdict, branch, rootCauseAnalysis, recommendation', () => {
  assert.ok(verdict, 'Verdict not parsed');
  assert.ok(typeof verdict.verdict === 'string' && verdict.verdict.length > 0, 'Missing verdict.verdict');
  assert.ok(typeof verdict.branch === 'string' && verdict.branch.includes('36c178f4'), 'verdict.branch must reference 36c178f4');
  assert.ok(verdict.rootCauseAnalysis, 'Missing rootCauseAnalysis');
  assert.ok(typeof verdict.recommendation === 'string' && verdict.recommendation.length > 0, 'Missing recommendation');
});

test('rootCauseAnalysis has failurePoint, why, fix', () => {
  const rca = verdict && verdict.rootCauseAnalysis;
  assert.ok(rca, 'rootCauseAnalysis missing');
  assert.ok(typeof rca.failurePoint === 'string' && rca.failurePoint.length > 0, 'Missing failurePoint');
  assert.ok(typeof rca.why === 'string' && rca.why.length > 0, 'Missing why');
  assert.ok(typeof rca.fix === 'string' && rca.fix.length > 0, 'Missing fix');
});

test('verdict.verdict is a known classification', () => {
  const allowed = ['duplicate/superseded', 'shippable-needs-task-pr', 'safe-delete', 'needs-human-review', 'blocked'];
  const v = verdict && verdict.verdict;
  assert.ok(allowed.includes(v), `Unknown verdict: "${v}". Expected one of: ${allowed.join(', ')}`);
});

test('verdict.branch matches investigated branch', () => {
  const expected = 'dev/36c178f4-dev-uc-buyer-journey-real-reports-page-b';
  assert.strictEqual(verdict && verdict.branch, expected, `Expected ${expected}, got: ${verdict && verdict.branch}`);
});

test('evidence section is populated', () => {
  const e = verdict && verdict.evidence;
  assert.ok(e, 'Missing evidence');
  const hasContent = e.commitsAheadOfMain !== undefined || e.remoteTrackingRef || e.diffStat;
  assert.ok(hasContent, 'evidence must have commitsAheadOfMain, remoteTrackingRef, or diffStat');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
