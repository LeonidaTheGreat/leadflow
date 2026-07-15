/**
 * E2E test for PR #1846: e2e-flow-tests.sh retry logic for test_dashboard_no_errors
 *
 * Reads directly from the PR branch so it validates the PR's actual content,
 * not the main branch state. This allows the test to be committed to the QC
 * branch now and re-run by the next dev agent after fixes.
 */
'use strict';

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

const PR_BRANCH = 'origin/dev/21f22fd6-fix-e2e-flow-test-failures-1-critical';
const SCRIPT_PATH = 'scripts/e2e-flow-tests.sh';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

let script;
try {
  script = execSync(`git show ${PR_BRANCH}:${SCRIPT_PATH}`, {
    cwd: path.join(__dirname, '..'),
    stdio: ['pipe', 'pipe', 'pipe'],
  }).toString();
} catch (err) {
  console.error(`Failed to read PR branch content: ${err.message}`);
  process.exit(1);
}

console.log('\n=== PR #1846: e2e-flow-tests.sh retry harness ===\n');

test('bash syntax is valid', () => {
  // Write to tmp file and syntax-check it
  const os = require('os');
  const fs = require('fs');
  const tmp = path.join(os.tmpdir(), 'e2e-flow-check.sh');
  fs.writeFileSync(tmp, script);
  try {
    execSync(`bash -n ${tmp}`, { stdio: 'pipe' });
  } finally {
    fs.unlinkSync(tmp);
  }
});

test('retry loop present in test_dashboard_no_errors (for attempt in 1 2 3)', () => {
  // Find the dashboard function and verify retry loop is inside it
  const fnStart = script.indexOf('test_dashboard_no_errors()');
  assert.ok(fnStart !== -1, 'test_dashboard_no_errors function not found');
  // Find closing brace after function start (simplified: check for loop after fnStart)
  const afterFn = script.slice(fnStart, fnStart + 3000);
  assert.ok(afterFn.includes('for attempt in 1 2 3'), 'Retry loop not found in test_dashboard_no_errors');
});

test('session DELETE cleanup inside retry loop', () => {
  const fnStart = script.indexOf('test_dashboard_no_errors()');
  const loopStart = script.indexOf('for attempt in 1 2 3', fnStart);
  const loopEnd = script.indexOf('\n  done', loopStart);
  assert.ok(loopStart !== -1 && loopEnd !== -1, 'Could not locate retry loop bounds');
  const loopBody = script.slice(loopStart, loopEnd);
  assert.ok(
    loopBody.includes('X DELETE') && loopBody.includes('sessions?id=eq.'),
    'Session DELETE not found inside retry loop body'
  );
});

test('return 0 on success inside loop (not after)', () => {
  const fnStart = script.indexOf('test_dashboard_no_errors()');
  const loopStart = script.indexOf('for attempt in 1 2 3', fnStart);
  const loopEnd = script.indexOf('\n  done', loopStart);
  const loopBody = script.slice(loopStart, loopEnd);
  assert.ok(loopBody.includes('return 0'), 'No "return 0" inside retry loop — success path missing');
});

test('return 1 as loop exhaustion fallback (after done)', () => {
  const fnStart = script.indexOf('test_dashboard_no_errors()');
  const doneIdx = script.indexOf('\n  done', script.indexOf('for attempt in 1 2 3', fnStart));
  const afterLoop = script.slice(doneIdx, doneIdx + 120);
  assert.ok(afterLoop.includes('return 1'), '"return 1" not found after retry loop — exhaustion path missing');
});

test('HTTP 5xx failure triggers retry inside loop', () => {
  const fnStart = script.indexOf('test_dashboard_no_errors()');
  const loopStart = script.indexOf('for attempt in 1 2 3', fnStart);
  const loopEnd = script.indexOf('\n  done', loopStart);
  const loopBody = script.slice(loopStart, loopEnd);
  assert.ok(loopBody.includes('5*'), 'HTTP 5xx check missing from retry loop');
});

test('Lead Feed content check present inside loop', () => {
  const fnStart = script.indexOf('test_dashboard_no_errors()');
  const loopStart = script.indexOf('for attempt in 1 2 3', fnStart);
  const loopEnd = script.indexOf('\n  done', loopStart);
  const loopBody = script.slice(loopStart, loopEnd);
  assert.ok(loopBody.includes("grep -q 'Lead Feed'"), 'Lead Feed content check missing inside retry loop');
});

test('fresh session created on each attempt (openssl rand inside loop)', () => {
  const fnStart = script.indexOf('test_dashboard_no_errors()');
  const loopStart = script.indexOf('for attempt in 1 2 3', fnStart);
  const loopEnd = script.indexOf('\n  done', loopStart);
  const loopBody = script.slice(loopStart, loopEnd);
  assert.ok(loopBody.includes('openssl rand'), 'openssl rand not inside loop — fresh token not generated per attempt');
});

console.log(`\n============================================================`);
console.log(`  Passed: ${passed}  Failed: ${failed}`);
console.log(`============================================================\n`);

if (failed > 0) process.exit(1);
