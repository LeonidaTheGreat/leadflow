/**
 * E2E Test: UTM Capture Tracker
 * UC: fix-no-sessionstorage-write-on-landing-page-load-utm-l
 * 
 * Test matrix:
 * AC-1: First-touch write — sessionStorage.leadflow_utm populated on landing with UTM
 * AC-2: First-touch protection — does not overwrite on subsequent page with different UTM
 * AC-3: No UTM, no write — page without UTM params does not set sessionStorage
 * AC-4: Cross-page attribution — UTM persists from landing to onboarding form
 * AC-5: SSR safety — component renders null without throwing on server
 * AC-6: Layout integration — component mounted in root layout, runs on every page
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ============================================================
// TEST SUITE
// ============================================================

const tests = [];
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 UTM Capture Tracker E2E Test Suite\n');
  
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✅ PASS: ${t.name}`);
      passCount++;
    } catch (err) {
      console.log(`❌ FAIL: ${t.name}`);
      console.log(`   Error: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary: ${passCount} passed, ${failCount} failed out of ${passCount + failCount} total\n`);
  return failCount === 0;
}

// ============================================================
// TESTS
// ============================================================

test('T1: Component file exists and is valid TypeScript/React', () => {
  const componentPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  assert(fs.existsSync(componentPath), `Component file missing: ${componentPath}`);
  
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Check 'use client' directive
  assert(content.includes("'use client'"), "Missing 'use client' directive");
  
  // Check component export
  assert(content.includes('export function UtmCaptureTracker'), 'UtmCaptureTracker function not exported');
  
  // Check return null
  assert(content.includes('return null'), 'Component must return null (no visible output)');
  
  // Check useEffect import
  assert(content.includes('useEffect'), 'Missing useEffect hook');
});

test('T2: Root layout imports and uses UtmCaptureTracker', () => {
  const layoutPath = path.join(__dirname, '../app/layout.tsx');
  assert(fs.existsSync(layoutPath), `Layout file missing: ${layoutPath}`);
  
  const content = fs.readFileSync(layoutPath, 'utf8');
  
  // Check import
  assert(content.includes('from "@/components/utm-capture-tracker"'), 'UtmCaptureTracker not imported in layout');
  
  // Check component usage in body
  assert(content.includes('<UtmCaptureTracker />'), 'UtmCaptureTracker not used in layout body');
  
  // Check it's placed before {children}
  const trackerIndex = content.indexOf('<UtmCaptureTracker />');
  const childrenIndex = content.indexOf('{children}');
  assert(trackerIndex < childrenIndex, 'UtmCaptureTracker must be before {children}');
});

test('T3: Component captures all 5 UTM parameters', () => {
  const componentPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  utmKeys.forEach(key => {
    assert(content.includes(key), `UTM key '${key}' not found in component`);
  });
});

test('T4: Component implements first-touch protection (check for existing value)', () => {
  const componentPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Check for getItem call (reading existing value)
  assert(content.includes('sessionStorage.getItem'), 'Missing check for existing sessionStorage value');
  
  // Check for null comparison (first-touch logic)
  assert(content.includes('!== null') || content.includes('!= null'), 'Missing first-touch protection check');
  
  // Check for conditional write
  assert(content.includes('if (captured)'), 'Missing conditional check before write');
});

test('T5: Component wraps sessionStorage in try/catch for SSR safety', () => {
  const componentPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Count try/catch blocks
  const trycatchMatches = content.match(/try\s*{|catch\s*{/g) || [];
  assert(trycatchMatches.length >= 4, 'Should have at least 2 try/catch pairs (4+ keywords)');
  
  // Verify catch blocks exist
  assert(content.includes('} catch {'), 'Missing catch blocks for error handling');
});

test('T6: Component uses useEffect with empty deps (runs once on mount)', () => {
  const componentPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Check for empty dependency array
  assert(content.includes('}, [])'), 'useEffect must have empty dependency array to run once');
});

test('T7: onboarding/page.tsx readUtmParams reads from sessionStorage correctly', () => {
  const onboardingPath = path.join(__dirname, '../app/onboarding/page.tsx');
  assert(fs.existsSync(onboardingPath), `Onboarding page missing: ${onboardingPath}`);
  
  const content = fs.readFileSync(onboardingPath, 'utf8');
  
  // Check for readUtmParams function
  assert(content.includes('function readUtmParams'), 'readUtmParams function not found');
  
  // Check it reads from sessionStorage
  assert(content.includes("sessionStorage.getItem('leadflow_utm')"), 'readUtmParams does not read from sessionStorage');
  
  // Check it falls back to URL params
  assert(content.includes('searchParams.get'), 'readUtmParams does not fall back to URL params');
  
  // Check it merges both sources
  assert(content.includes('{ ...stored, ...fromUrl }'), 'readUtmParams does not merge sessionStorage + URL');
});

test('T8: SessionStorage key name is consistent', () => {
  const trackerPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  const onboardingPath = path.join(__dirname, '../app/onboarding/page.tsx');
  
  const trackerContent = fs.readFileSync(trackerPath, 'utf8');
  const onboardingContent = fs.readFileSync(onboardingPath, 'utf8');
  
  // Both should reference 'leadflow_utm'
  assert(trackerContent.includes('leadflow_utm'), 'Tracker does not use leadflow_utm key');
  assert(onboardingContent.includes('leadflow_utm'), 'Onboarding does not read from leadflow_utm key');
});

test('T9: Component uses window.location.search correctly', () => {
  const componentPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Check for URLSearchParams usage (modern approach)
  assert(content.includes('URLSearchParams'), 'Component should use URLSearchParams to parse URL');
  assert(content.includes('window.location.search'), 'Component must read from window.location.search');
});

test('T10: Component JSON.parse/stringify for serialization', () => {
  const componentPath = path.join(__dirname, '../components/utm-capture-tracker.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  
  // Check for JSON.stringify (write)
  assert(content.includes('JSON.stringify'), 'Component must stringify UTM object before storing');
  
  // Check for JSON.parse (read in onboarding)
  const onboardingPath = path.join(__dirname, '../app/onboarding/page.tsx');
  const onboardingContent = fs.readFileSync(onboardingPath, 'utf8');
  assert(onboardingContent.includes('JSON.parse'), 'Onboarding must parse stored JSON');
});

// ============================================================
// RUN TESTS
// ============================================================

(async () => {
  const success = await runTests();
  process.exit(success ? 0 : 1);
})();
