#!/usr/bin/env node
// QC verification: PR #1893 investigation findings for orphan rescue branch
// Confirms: feature shipped via Next.js routes, orphan branch superseded
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function pass(label) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, detail) { console.error(`  ❌ ${label}: ${detail}`); failed++; }

console.log('QC: Verifying PR #1893 investigation findings\n');

const PR_BRANCH = 'dev/750bb986-investigate-orphan-branch-dev-943b9f7f-d';
const REPORT_FILE = 'completion-reports/COMPLETION-750bb986-cb2e-4aab-b5ff-10445e8ba5c3-20260716.json';

// 1. Completion report exists on PR branch and is valid JSON with required fields
let report;
try {
  const raw = execSync(`git show origin/${PR_BRANCH}:${REPORT_FILE}`, { cwd: PROJECT_ROOT }).toString();
  report = JSON.parse(raw);
  assert.strictEqual(report.status, 'completed');
  assert.ok(report.rootCauseAnalysis, 'rootCauseAnalysis present');
  assert.ok(report.rootCauseAnalysis.failurePoint, 'failurePoint present');
  assert.ok(report.rootCauseAnalysis.why, 'why present');
  assert.ok(report.rootCauseAnalysis.fix, 'fix present');
  pass('completion report valid JSON with rootCauseAnalysis');
} catch (e) {
  fail('completion report', e.message);
}

// 2. Next.js sales cockpit route exists on main (feature was shipped via PR #1844)
const nextjsRoute = path.join(PROJECT_ROOT, 'product/lead-response/dashboard/app/api/admin/sales-cockpit/route.ts');
if (fs.existsSync(nextjsRoute)) {
  pass('Next.js sales cockpit route exists on main (shipped via PR #1844)');
} else {
  fail('Next.js sales cockpit route', `missing at ${nextjsRoute}`);
}

// 3. E2E test for the shipped feature exists on main
const e2eTest = path.join(PROJECT_ROOT, 'tests/e2e/92eafbe3-admin-sales-cockpit.test.js');
if (fs.existsSync(e2eTest)) {
  pass('E2E test for admin sales cockpit exists on main');
} else {
  fail('E2E test for admin sales cockpit', `missing at ${e2eTest}`);
}

// 4. Report correctly identifies safeToDelete = true
if (report) {
  try {
    assert.strictEqual(report.investigation.safeToDelete, true);
    assert.strictEqual(report.investigation.workAlreadyOnMain, true);
    assert.strictEqual(report.investigation.commitsAheadOfMain, 3);
    pass('investigation flags: safeToDelete=true, workAlreadyOnMain=true, 3 commits ahead');
  } catch (e) {
    fail('investigation flags', e.message);
  }
}

// 5. Express routes from orphan branch are NOT present on main (no duplicate implementation)
const orphanExpressRoute = path.join(PROJECT_ROOT, 'routes/admin/pilots.js');
const orphanService = path.join(PROJECT_ROOT, 'lib/services/AdminPilotsService.js');
if (!fs.existsSync(orphanExpressRoute) && !fs.existsSync(orphanService)) {
  pass('orphan Express routes absent from main (no duplicate implementation risk)');
} else {
  const which = [orphanExpressRoute, orphanService].filter(fs.existsSync).join(', ');
  fail('duplicate implementation', `orphan files present on main: ${which}`);
}

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  console.error('FAIL');
  process.exit(1);
} else {
  console.log('PASS');
}
