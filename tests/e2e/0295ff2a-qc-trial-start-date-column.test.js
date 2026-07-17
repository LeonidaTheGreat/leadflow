/**
 * QC E2E Test: PR #1899 — trial_start_date column name fix + test path fix
 * Task: 0295ff2a-485a-4c67-8229-c68f05f7dcb4
 *
 * Verifies:
 * 1. send-aha-day3 route uses trial_start_date (not trial_started_at) — matches migration 012
 * 2. E2E test paths from tests/e2e/ resolve correctly (../../ prefix)
 * 3. No stale trial_started_at references remain in send-aha-day3 route
 */

'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`  PASS: ${label}`);
  passed++;
}

function fail(label, reason) {
  console.error(`  FAIL: ${label} — ${reason}`);
  failed++;
}

async function run() {
  console.log('QC E2E: PR #1899 trial_start_date column fix\n');

  // Test 1: route.ts uses trial_start_date, not trial_started_at
  try {
    const routePath = path.join(ROOT, 'product/lead-response/dashboard/app/api/onboarding/send-aha-day3/route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    const hasWrongCol = content.includes("'trial_started_at'") || content.includes('"trial_started_at"') ||
      /\.select\([^)]*trial_started_at/.test(content) ||
      /\.gte\('trial_started_at'/.test(content) ||
      /\.lte\('trial_started_at'/.test(content);
    if (hasWrongCol) {
      fail('route uses correct column', 'still references trial_started_at in query — must use trial_start_date');
    } else {
      pass('route uses trial_start_date (not trial_started_at)');
    }
  } catch (e) {
    fail('route file readable', e.message);
  }

  // Test 2: migration 012 defines trial_start_date
  try {
    const migPath = path.join(ROOT, 'migrations/012_trial_aha_moment.sql');
    const sql = fs.readFileSync(migPath, 'utf8');
    assert.ok(sql.includes('trial_start_date'), 'migration must define trial_start_date column');
    assert.ok(!sql.includes('trial_started_at'), 'migration must not define trial_started_at (wrong name)');
    pass('migration 012 defines trial_start_date (not trial_started_at)');
  } catch (e) {
    fail('migration column name', e.message);
  }

  // Test 3: route and migration agree on column name
  try {
    const routePath = path.join(ROOT, 'product/lead-response/dashboard/app/api/onboarding/send-aha-day3/route.ts');
    const migPath = path.join(ROOT, 'migrations/012_trial_aha_moment.sql');
    const route = fs.readFileSync(routePath, 'utf8');
    const migration = fs.readFileSync(migPath, 'utf8');
    const routeUsesStartDate = route.includes('trial_start_date');
    const migHasStartDate = migration.includes('trial_start_date');
    assert.ok(routeUsesStartDate && migHasStartDate, 'both must use trial_start_date');
    pass('route and migration agree: both use trial_start_date');
  } catch (e) {
    fail('column name consistency', e.message);
  }

  // Test 4: E2E test file paths are correct (../../ from tests/e2e/)
  try {
    const testPath = path.join(ROOT, 'tests/e2e/5fd5ad2d-fix-e2e-flow-test-failures.test.js');
    const content = fs.readFileSync(testPath, 'utf8');
    // After fix: should use ../../ (not ../) for paths from tests/e2e/
    const hasOldRoutePath = content.includes("'../product/lead-response/dashboard/app/api/onboarding/send-aha-day3/route.ts'");
    const hasOldMigPath = content.includes("'../migrations/012_trial_aha_moment.sql'");
    if (hasOldRoutePath || hasOldMigPath) {
      fail('E2E test paths fixed', 'still has single-../ paths — should be ../../ from tests/e2e/');
    } else {
      pass('E2E test paths use correct ../../ prefix');
    }
  } catch (e) {
    fail('E2E test file readable', e.message);
  }

  // Test 5: resolved paths from tests/e2e/ with ../../ prefix actually exist
  try {
    const routeResolved = path.join(ROOT, 'product/lead-response/dashboard/app/api/onboarding/send-aha-day3/route.ts');
    const migResolved = path.join(ROOT, 'migrations/012_trial_aha_moment.sql');
    assert.ok(fs.existsSync(routeResolved), `route.ts must exist at ${routeResolved}`);
    assert.ok(fs.existsSync(migResolved), `migration must exist at ${migResolved}`);
    pass('both files resolve to existing paths from project root');
  } catch (e) {
    fail('file path resolution', e.message);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
