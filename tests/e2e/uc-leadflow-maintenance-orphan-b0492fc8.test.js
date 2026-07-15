'use strict';

/**
 * QC E2E Test — PR #1858 / Task b0492fc8
 * Validates: completion report correctness for orphan branch investigation
 * dev/943b9f7f-dev-rescue-uc-admin-sales-cockpit-admin
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const { execSync } = require('child_process');

const PR_BRANCH = 'origin/dev/b0492fc8-investigate-orphan-branch-dev-943b9f7f-d';
const REPORT_BLOB = `${PR_BRANCH}:completion-reports/COMPLETION-b0492fc8-26c9-48e1-b281-00a9f7333853-20260715.json`;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function runAll() {
  console.log('\n🧪 QC — PR #1858 orphan branch investigation (b0492fc8)\n');

  // Read the completion report from the PR branch (not merged to main yet)
  const reportPath = path.join(ROOT, 'completion-reports', 'COMPLETION-b0492fc8-26c9-48e1-b281-00a9f7333853-20260715.json');

  let report;
  await test('completion report exists in PR branch and is valid JSON', async () => {
    let raw;
    if (fs.existsSync(reportPath)) {
      raw = fs.readFileSync(reportPath, 'utf8');
    } else {
      // Read from PR branch via git (not yet merged)
      raw = execSync(`git show ${REPORT_BLOB}`, { cwd: ROOT }).toString();
    }
    report = JSON.parse(raw);
    assert.strictEqual(report.taskId, 'b0492fc8-26c9-48e1-b281-00a9f7333853');
    assert.strictEqual(report.status, 'completed');
    assert.ok(report.rootCauseAnalysis, 'rootCauseAnalysis must be present');
    assert.ok(report.rootCauseAnalysis.failurePoint, 'failurePoint must be present');
    assert.ok(report.rootCauseAnalysis.why, 'why must be present');
    assert.ok(report.rootCauseAnalysis.fix, 'fix must be present');
    assert.ok(report.findings, 'findings must be present');
    // Guard: ensure subsequent tests can read `report`
    assert.ok(report, 'report must be truthy for subsequent tests');
  });

  await test('report claims AdminPilotsService is absent from main (verified)', async () => {
    const svcPath = path.join(ROOT, 'lib', 'services', 'AdminPilotsService.js');
    assert.ok(!fs.existsSync(svcPath), 'AdminPilotsService.js should NOT be on main — report says gap exists');
  });

  await test('report claims routes/admin/pilots.js is absent from main (verified)', async () => {
    const routePath = path.join(ROOT, 'routes', 'admin', 'pilots.js');
    assert.ok(!fs.existsSync(routePath), 'routes/admin/pilots.js should NOT be on main — report says gap exists');
  });

  await test('outreach_log schema file on main has CHECK constraints (report concern is real)', async () => {
    const schemaPath = path.join(ROOT, 'scripts', 'db', 'create-outreach-log-table.sql');
    assert.ok(fs.existsSync(schemaPath), 'create-outreach-log-table.sql must exist on main');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    assert.ok(sql.includes('CONSTRAINT'), 'main schema must have CHECK constraints');
    assert.ok(sql.includes("'email'") && sql.includes("'call'") && sql.includes("'sms'") && sql.includes("'linkedin'"),
      "main schema constrains channel to email/call/sms/linkedin");
  });

  await test('report claims 3 commits ahead of main', async () => {
    assert.strictEqual(report.findings.commitsAheadOfMain, 3);
  });

  await test('report identifies non-duplicate (isDuplicate: false)', async () => {
    assert.strictEqual(report.findings.isDuplicate, false);
  });

  await test('Next.js sales-cockpit API route exists on main (different path from orphan branch)', async () => {
    const nextApiDir = path.join(ROOT, 'product', 'lead-response', 'dashboard', 'app', 'api', 'admin', 'sales-cockpit');
    assert.ok(fs.existsSync(nextApiDir), 'Next.js /api/admin/sales-cockpit route must exist confirming different-path claim');
  });

  console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
