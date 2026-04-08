/**
 * E2E Test: Fix E2E Flow Test Failures (PR #1040)
 * Task: 5fd5ad2d-6569-4457-b52f-6688734a452f
 * 
 * Tests:
 * 1. /api/onboarding/simulator-status - new route exists and returns 401 for unauth
 * 2. /api/onboarding/simulator/status - duplicate route also returns 401
 * 3. /api/admin/metrics/aha-moment - returns 401 without auth
 * 4. /api/admin/metrics/aha-moment - returns 200 with valid API key
 * 5. /api/onboarding/send-aha-day1 - returns 400 on missing fields
 * 6. /api/onboarding/send-aha-day3 - returns 400 on missing fields
 * 7. Detects duplicate simulator status routes (spaghetti flag)
 * 8. Column name mismatch: trial_started_at vs trial_start_date in send-aha-day3 GET
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://leadflow-ai-five.vercel.app';
const API_KEY = process.env.LEADFLOW_API_KEY;

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`  PASS: ${name}`);
  passed++;
}

function fail(name, reason) {
  console.log(`  FAIL: ${name} — ${reason}`);
  failed++;
}

async function runTests() {
  console.log(`\nE2E Test: PR #1040 Fix E2E Flow Test Failures`);
  console.log(`Target: ${BASE_URL}`);
  console.log('');

  // Test 1: simulator-status returns 401 without auth
  try {
    const res = await fetch(`${BASE_URL}/api/onboarding/simulator-status`);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    pass('simulator-status: 401 without auth');
  } catch (e) {
    fail('simulator-status: 401 without auth', e.message);
  }

  // Test 2: simulator/status also returns 401 without auth (duplicate route detection)
  try {
    const res = await fetch(`${BASE_URL}/api/onboarding/simulator/status`);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    pass('simulator/status: 401 without auth');
    // Flag the duplication — both routes exist. This is spaghetti.
    console.log('  WARN: Duplicate routes detected: /simulator-status AND /simulator/status both exist');
  } catch (e) {
    fail('simulator/status: 401 without auth', e.message);
  }

  // Test 3: aha-moment metrics returns 401 without auth
  try {
    const res = await fetch(`${BASE_URL}/api/admin/metrics/aha-moment`);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    pass('aha-moment metrics: 401 without auth');
  } catch (e) {
    fail('aha-moment metrics: 401 without auth', e.message);
  }

  // Test 4: aha-moment metrics with valid API key
  if (API_KEY) {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/metrics/aha-moment`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
      });
      // Should be 200 or 500 (if DB unreachable), but NOT 401 or 403
      assert.ok(res.status !== 401 && res.status !== 403, `Auth should pass but got ${res.status}`);
      const body = await res.json();
      if (res.status === 200) {
        assert.ok('metrics' in body, 'Response should have metrics key');
        assert.ok('agents' in body, 'Response should have agents key');
      }
      pass(`aha-moment metrics: auth passes (status=${res.status})`);
    } catch (e) {
      fail('aha-moment metrics: auth passes', e.message);
    }
  } else {
    console.log('  SKIP: aha-moment metrics with auth (LEADFLOW_API_KEY not set)');
  }

  // Test 5: send-aha-day1 POST with missing fields returns 400
  try {
    const res = await fetch(`${BASE_URL}/api/onboarding/send-aha-day1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // missing agentId and agentEmail
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    const body = await res.json();
    assert.ok(body.error, 'Should have error message');
    pass('send-aha-day1: 400 on missing fields');
  } catch (e) {
    fail('send-aha-day1: 400 on missing fields', e.message);
  }

  // Test 6: send-aha-day3 POST with missing fields returns 400
  try {
    const res = await fetch(`${BASE_URL}/api/onboarding/send-aha-day3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // missing agentId and agentEmail
    });
    assert.strictEqual(res.status, 400, `Expected 400, got ${res.status}`);
    const body = await res.json();
    assert.ok(body.error, 'Should have error message');
    pass('send-aha-day3: 400 on missing fields');
  } catch (e) {
    fail('send-aha-day3: 400 on missing fields', e.message);
  }

  // Test 7: Static code analysis — column name mismatch in send-aha-day3
  try {
    const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/onboarding/send-aha-day3/route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    // The GET handler uses trial_started_at but migration adds trial_start_date — these must match
    const usesTrialStartedAt = content.includes('trial_started_at');
    const migrationPath = path.join(__dirname, '../migrations/012_trial_aha_moment.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    const migrationHasTrialStartedAt = migration.includes('trial_started_at');
    
    if (usesTrialStartedAt && !migrationHasTrialStartedAt) {
      fail('column name consistency: trial_started_at vs trial_start_date', 
           'send-aha-day3 GET handler queries trial_started_at but migration only adds trial_start_date — these are different columns');
    } else {
      pass('column name consistency: migration and route agree');
    }
  } catch (e) {
    fail('column name consistency check', e.message);
  }

  // Test 8: Spaghetti detection — count simulator status routes
  try {
    const statusRoute1 = path.join(__dirname, '../product/lead-response/dashboard/app/api/onboarding/simulator-status/route.ts');
    const statusRoute2 = path.join(__dirname, '../product/lead-response/dashboard/app/api/onboarding/simulator/status/route.ts');
    const both = fs.existsSync(statusRoute1) && fs.existsSync(statusRoute2);
    if (both) {
      fail('no duplicate status routes', 'Both /simulator-status AND /simulator/status/route.ts exist — duplicate routes doing the same thing');
    } else {
      pass('no duplicate status routes');
    }
  } catch (e) {
    fail('duplicate routes check', e.message);
  }

  // Test 9: SimulatorBanner vs AhaMomentBanner — both exist (spaghetti)
  try {
    const banner1 = path.join(__dirname, '../product/lead-response/dashboard/components/dashboard/AhaMomentBanner.tsx');
    const banner2 = path.join(__dirname, '../product/lead-response/dashboard/components/dashboard/SimulatorBanner.tsx');
    if (fs.existsSync(banner1) && fs.existsSync(banner2)) {
      fail('no duplicate banner components', 'Both AhaMomentBanner.tsx AND SimulatorBanner.tsx exist — duplicate banner components doing the same job');
    } else {
      pass('no duplicate banner components');
    }
  } catch (e) {
    fail('duplicate banners check', e.message);
  }

  // Test 10: Duplicate simulator pages (/simulator and /setup/simulator)
  try {
    const page1 = path.join(__dirname, '../product/lead-response/dashboard/app/simulator/page.tsx');
    const page2 = path.join(__dirname, '../product/lead-response/dashboard/app/setup/simulator/page.tsx');
    if (fs.existsSync(page1) && fs.existsSync(page2)) {
      fail('no duplicate simulator pages', 'Both /simulator/page.tsx AND /setup/simulator/page.tsx exist — two standalone simulator pages with nearly identical UI');
    } else {
      pass('no duplicate simulator pages');
    }
  } catch (e) {
    fail('duplicate pages check', e.message);
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
