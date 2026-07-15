#!/usr/bin/env node
// E2E test for PR #1847: orphan-branch investigation completion report
// Verifies (1) report is valid JSON with required fields,
// (2) rootCauseAnalysis meets QC depth bar, (3) the described branch/commit exist.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'completion-reports', 'COMPLETION-668c4ae1-e40f-4ccf-a9a6-a40ddff4e558-20260715.json');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.error(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// ── 1. File exists and is valid JSON ──────────────────────────────────────────
let report;
test('Completion report exists and is valid JSON', () => {
  assert.ok(fs.existsSync(REPORT_PATH), `Missing: ${REPORT_PATH}`);
  const raw = fs.readFileSync(REPORT_PATH, 'utf8');
  report = JSON.parse(raw);
});

// ── 2. Required top-level fields ─────────────────────────────────────────────
test('Report has required top-level fields', () => {
  assert.ok(report, 'Report not loaded');
  for (const f of ['taskId', 'status', 'rootCauseAnalysis', 'investigation']) {
    assert.ok(report[f] != null, `Missing field: ${f}`);
  }
});

// ── 3. rootCauseAnalysis depth (QC bar) ───────────────────────────────────────
test('rootCauseAnalysis has failurePoint, why, fix (all non-empty)', () => {
  const rca = report.rootCauseAnalysis;
  for (const f of ['failurePoint', 'why', 'fix']) {
    assert.ok(rca[f] && rca[f].trim().length > 0, `rootCauseAnalysis.${f} is empty`);
  }
});

test('rootCauseAnalysis.failurePoint names the specific orphan branch', () => {
  const fp = report.rootCauseAnalysis.failurePoint;
  assert.ok(
    fp.includes('dev/71003145-dev-rescue-uc-buyer-journey-pilot-signup'),
    `failurePoint must name the branch, got: ${fp}`
  );
});

// ── 4. Investigation findings ─────────────────────────────────────────────────
test('Investigation reports exactly 1 commit ahead of main', () => {
  assert.strictEqual(report.investigation.commitsAheadOfMain, 1,
    `Expected 1 commit ahead, got ${report.investigation.commitsAheadOfMain}`);
});

test('Investigation commit hash is 33131b7a', () => {
  assert.ok(
    report.investigation.commitHash && report.investigation.commitHash.startsWith('33131b7a'),
    `Expected commitHash 33131b7a, got ${report.investigation.commitHash}`
  );
});

// ── 5. Orphan branch actually exists on remote ───────────────────────────────
test('Orphan branch exists on remote (git ls-remote)', () => {
  const branch = report.investigation.orphanBranch;
  assert.ok(branch, 'investigation.orphanBranch not set');
  const out = execSync(
    `git ls-remote origin refs/heads/${branch} 2>/dev/null`,
    { cwd: ROOT, encoding: 'utf8', timeout: 15000 }
  ).trim();
  assert.ok(out.length > 0, `Branch ${branch} not found on remote`);
});

// ── 6. Described commit is the real tip ──────────────────────────────────────
test('Remote branch tip matches reported commitHash', () => {
  const branch = report.investigation.orphanBranch;
  const out = execSync(
    `git ls-remote origin refs/heads/${branch} 2>/dev/null`,
    { cwd: ROOT, encoding: 'utf8', timeout: 15000 }
  ).trim();
  const remoteHash = out.split('\t')[0];
  assert.ok(
    remoteHash.startsWith(report.investigation.commitHash),
    `Remote tip is ${remoteHash}, expected ${report.investigation.commitHash}`
  );
});

// ── 7. Recommendation is SHIP (work is real/complete) ─────────────────────────
test('Investigation recommendation is SHIP', () => {
  const rec = report.investigation.recommendation;
  assert.ok(rec && rec.toUpperCase().startsWith('SHIP'),
    `Expected SHIP recommendation, got: ${rec}`);
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n📊 ${passed + failed} tests — ✅ ${passed} passed, ❌ ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
