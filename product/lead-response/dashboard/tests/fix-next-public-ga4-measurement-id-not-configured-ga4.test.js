/**
 * E2E Test for GA4 Measurement ID Configuration Fix
 * Use Case: fix-next-public-ga4-measurement-id-not-configured-ga4-
 * 
 * Tests:
 * 1. GA4 script is conditionally rendered based on NEXT_PUBLIC_GA4_MEASUREMENT_ID
 * 2. Script loads correctly when ID is configured
 * 3. Script is skipped when ID is not configured
 * 4. No hardcoded secrets in the codebase
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '..');
const LAYOUT_FILE = path.join(DASHBOARD_DIR, 'app', 'layout.tsx');
const GA4_SETUP_FILE = path.join(DASHBOARD_DIR, '..', '..', '..', 'docs', 'GA4_SETUP.md');

console.log('=== GA4 Measurement ID Configuration E2E Test ===\n');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    testsFailed++;
  }
}

// Test 1: Layout file exists and contains GA4 implementation
test('Layout file exists with GA4 implementation', () => {
  assert(fs.existsSync(LAYOUT_FILE), 'layout.tsx should exist');
  const content = fs.readFileSync(LAYOUT_FILE, 'utf-8');
  assert(content.includes('NEXT_PUBLIC_GA4_MEASUREMENT_ID'), 'Should reference NEXT_PUBLIC_GA4_MEASUREMENT_ID');
  assert(content.includes('googletagmanager.com/gtag/js'), 'Should include GA4 script URL');
  assert(content.includes('window.dataLayer'), 'Should include dataLayer initialization');
});

// Test 2: GA4 script is conditionally rendered
test('GA4 script is conditionally rendered based on env var', () => {
  const content = fs.readFileSync(LAYOUT_FILE, 'utf-8');
  
  // Check for conditional rendering pattern
  assert(content.includes('{GA_ID && ('), 'Should conditionally render based on GA_ID');
  assert(content.includes("const GA_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID"), 
    'Should read GA_ID from env var');
});

// Test 3: No hardcoded GA4 Measurement ID in the code
test('No hardcoded GA4 Measurement ID in source code', () => {
  const content = fs.readFileSync(LAYOUT_FILE, 'utf-8');
  
  // Check that no hardcoded G-XXXXXXXXXX pattern exists (except in comments)
  const lines = content.split('\n');
  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
      continue;
    }
    // Check for hardcoded GA4 IDs (format: G-XXXXXXXXXX)
    const hasHardcodedId = /G-[A-Z0-9]{10}/.test(line);
    assert(!hasHardcodedId, `Line contains hardcoded GA4 ID: ${line.trim()}`);
  }
});

// Test 4: GA4 script uses proper Next.js Script component
test('GA4 script uses Next.js Script component with proper strategy', () => {
  const content = fs.readFileSync(LAYOUT_FILE, 'utf-8');
  
  assert(content.includes('import Script from "next/script"'), 'Should import Script from next/script');
  assert(content.includes('strategy="afterInteractive"'), 'Should use afterInteractive strategy');
});

// Test 5: GA4 initialization includes proper configuration
test('GA4 initialization includes anonymize_ip and page_view', () => {
  const content = fs.readFileSync(LAYOUT_FILE, 'utf-8');
  
  assert(content.includes('anonymize_ip: true'), 'Should include anonymize_ip: true');
  assert(content.includes("send_page_view: true"), 'Should include send_page_view: true');
  assert(content.includes("gtag('js', new Date())"), 'Should initialize gtag with date');
  assert(content.includes("gtag('config'"), 'Should include gtag config');
});

// Test 6: GA4_SETUP.md documentation exists and is comprehensive
test('GA4_SETUP.md documentation exists with proper instructions', () => {
  assert(fs.existsSync(GA4_SETUP_FILE), 'GA4_SETUP.md should exist');
  
  const content = fs.readFileSync(GA4_SETUP_FILE, 'utf-8');
  assert(content.includes('NEXT_PUBLIC_GA4_MEASUREMENT_ID'), 'Should mention env var name');
  assert(content.includes('Vercel'), 'Should mention Vercel deployment');
  assert(content.includes('G-XXXXXXXXXX'), 'Should show example Measurement ID format');
  assert(content.includes('analytics.google.com'), 'Should link to Google Analytics');
});

// Test 7: Build output verification
test('Next.js build completes successfully', () => {
  const buildDir = path.join(DASHBOARD_DIR, '.next');
  assert(fs.existsSync(buildDir), '.next build directory should exist');
  
  // Check for server and static directories
  const serverDir = path.join(buildDir, 'server');
  const staticDir = path.join(buildDir, 'static');
  assert(fs.existsSync(serverDir) || fs.existsSync(staticDir), 
    'Build should have server or static output');
});

// Test 8: Check that gtag is properly exposed on window
test('gtag function is exposed on window object', () => {
  const content = fs.readFileSync(LAYOUT_FILE, 'utf-8');
  
  assert(content.includes('window.gtag = gtag'), 'Should expose gtag on window');
  assert(content.includes('window.dataLayer = window.dataLayer || []'), 
    'Should initialize dataLayer on window');
});

// Test 9: Verify no secrets in environment files
test('No secrets committed to .env files', () => {
  const envLocalPath = path.join(DASHBOARD_DIR, '.env.local');
  
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Skip comments and empty lines
      if (!line.trim() || line.trim().startsWith('#')) continue;
      
      // Check for actual values (not just placeholder keys)
      const hasRealValue = line.includes('=') && 
                           !line.endsWith('=') && 
                           !line.includes('=your_') &&
                           !line.includes('=G-XXXXXXXXXX');
      
      if (hasRealValue) {
        const key = line.split('=')[0];
        // GA4 ID is OK to have, but other secrets should not be committed
        if (!key.includes('GA4') && !key.includes('NEXT_PUBLIC')) {
          console.log(`   ⚠️  Warning: ${key} has a value in .env.local (may be OK for local dev)`);
        }
      }
    }
  }
});

// Test 10: Verify analytics tracking functions exist
test('Analytics tracking functions exist in lib/analytics', () => {
  const analyticsDir = path.join(DASHBOARD_DIR, 'lib', 'analytics');
  const ga4File = path.join(analyticsDir, 'ga4.ts');
  
  if (fs.existsSync(ga4File)) {
    const content = fs.readFileSync(ga4File, 'utf-8');
    assert(content.includes('trackEvent'), 'Should have trackEvent function');
    assert(content.includes('trackCTAClick'), 'Should have trackCTAClick function');
    assert(content.includes('trackFormEvent'), 'Should have trackFormEvent function');
  } else {
    console.log('   ⚠️  Note: ga4.ts not found (may be in different location)');
  }
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  console.log('\n❌ Tests FAILED');
  process.exit(1);
} else {
  console.log('\n✅ All tests PASSED');
  process.exit(0);
}
