/**
 * E2E Test: Trial Duration Mismatch Fix
 * Task: fix-trial-duration-mismatch-landing-says-30-day-signup
 * Verifies all trial references are consistently 14 days (not 30 days)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DASHBOARD_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

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

// Test 1: Check LandingPage.tsx for correct trial duration
test('LandingPage.tsx shows 14-day trial (not 30-day)', () => {
  const filePath = path.join(FRONTEND_DIR, 'src', 'components', 'LandingPage.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Should contain "14-day trial"
  assert(content.includes('14-day trial'), 'Should contain "14-day trial"');
  
  // Should NOT contain "30-day trial"
  assert(!content.includes('30-day trial'), 'Should NOT contain "30-day trial"');
});

// Test 2: Check dashboard page.tsx for correct trial duration
test('Dashboard page.tsx shows 14-day trial (not 30-day)', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Should contain "14-day trial"
  assert(content.includes('14-day trial'), 'Should contain "14-day trial"');
  
  // Should NOT contain "30-day trial"
  assert(!content.includes('30-day trial'), 'Should NOT contain "30-day trial"');
});

// Test 3: Check pilot page.tsx for correct trial duration
test('Pilot page.tsx shows 14-day trial (not 30-day)', () => {
  const filePath = path.join(DASHBOARD_DIR, 'app', 'pilot', 'page.tsx');
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Should contain "14-day trial"
  assert(content.includes('14-day trial'), 'Should contain "14-day trial"');
  
  // Should NOT contain "30-day trial"
  assert(!content.includes('30-day trial'), 'Should NOT contain "30-day trial"');
});

// Test 4: Verify no remaining "30-day" references in modified files
test('No remaining "30-day" trial references in any modified files', () => {
  const filesToCheck = [
    path.join(FRONTEND_DIR, 'src', 'components', 'LandingPage.tsx'),
    path.join(DASHBOARD_DIR, 'app', 'page.tsx'),
    path.join(DASHBOARD_DIR, 'app', 'pilot', 'page.tsx'),
  ];
  
  for (const filePath of filesToCheck) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const has30Day = content.includes('30-day trial') || content.includes('30 day trial');
    assert(!has30Day, `File ${path.basename(filePath)} should not contain "30-day" trial reference`);
  }
});

// Test 5: Verify "14-day" references exist in all expected locations
test('All expected files contain "14-day" trial reference', () => {
  const expectedFiles = [
    { path: path.join(FRONTEND_DIR, 'src', 'components', 'LandingPage.tsx'), desc: 'LandingPage.tsx scarcity banner' },
    { path: path.join(DASHBOARD_DIR, 'app', 'page.tsx'), desc: 'Dashboard page.tsx pricing section' },
    { path: path.join(DASHBOARD_DIR, 'app', 'pilot', 'page.tsx'), desc: 'Pilot page.tsx trial link' },
  ];
  
  for (const { path: filePath, desc } of expectedFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const has14Day = content.includes('14-day trial') || content.includes('14 day trial');
    assert(has14Day, `${desc} should contain "14-day" trial reference`);
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
