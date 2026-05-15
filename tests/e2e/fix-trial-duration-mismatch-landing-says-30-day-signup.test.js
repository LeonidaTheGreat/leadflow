/**
 * E2E Test: Trial Duration Mismatch Fix
 * Task: fix-trial-duration-mismatch-landing-says-30-day-signup
 * Verifies all trial references are consistently 14 days (not 30 days)
 *
 * Note: frontend/src/components/LandingPage.tsx was removed in PR #434 (repo restructure).
 * Landing page content now lives in product/lead-response/dashboard/app/*.tsx.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DASHBOARD_DIR = path.join(ROOT_DIR, 'product', 'lead-response', 'dashboard');

console.log('🧪 E2E Test: Trial Duration Consistency Check\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

// Test 1: Check dashboard home page for correct trial duration
test('Dashboard page.tsx shows 14-day trial (not 30-day)', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert(content.includes('14-day trial') || content.includes('14-day free trial'), 'Should contain "14-day trial"');
  assert(!content.includes('30-day trial'), 'Should NOT contain "30-day trial"');
});

// Test 2: Check pilot page for correct trial duration
test('Pilot page.tsx shows 14-day trial (not 30-day)', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app', 'pilot', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert(content.includes('14-day trial') || content.includes('14-day free trial'), 'Should contain "14-day trial"');
  assert(!content.includes('30-day trial'), 'Should NOT contain "30-day trial"');
});

// Test 3: Check demo page for correct trial duration (was "30 days free", must be "14 days free")
test('Demo page.tsx shows 14 days free (not 30 days)', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app', 'demo', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');

  assert(!content.includes('30 days free'), 'Should NOT contain "30 days free"');
  assert(content.includes('14 days free'), 'Should contain "14 days free"');
});

// Test 4: No "30-day trial" or "30 days free" in any user-facing trial-flow pages
test('No "30-day" trial copy in any trial-flow pages', () => {
  const filesToCheck = [
    path.join(DASHBOARD_DIR, 'app', 'page.tsx'),
    path.join(DASHBOARD_DIR, 'app', 'pilot', 'page.tsx'),
    path.join(DASHBOARD_DIR, 'app', 'demo', 'page.tsx'),
  ];

  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const has30Day = content.includes('30-day trial') || content.includes('30 day trial') || content.includes('30 days free');
    assert(!has30Day, `File ${path.basename(filePath)} should not contain "30-day" trial copy`);
  }
});

console.log('\n============================================================');
console.log('📊 TRIAL DURATION CONSISTENCY TEST REPORT');

console.log('============================================================');
console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('\n============================================================');

if (failed > 0) {
  console.log('❌ TESTS FAILED - Trial duration mismatch not fully fixed');
  process.exit(1);
} else {
  console.log('🎉 ALL TESTS PASSED - Trial duration is consistently 14 days across all pages');
  process.exit(0);
}
