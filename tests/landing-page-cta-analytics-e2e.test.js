/**
 * E2E Test: Landing Page CTA Analytics Instrumentation
 * 
 * Verifies that:
 * 1. All CTAs have data-cta-id attributes
 * 2. trackCTAClick is called with correct parameters
 * 3. Scroll milestone observers are attached
 * 4. GA4 script is present in layout
 * 
 * Run with: node tests/landing-page-cta-analytics-e2e.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.log(`${RED}✗${RESET} ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

const dashboardDir = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');
const pageFile = path.join(dashboardDir, 'app', 'page.tsx');
const layoutFile = path.join(dashboardDir, 'app', 'layout.tsx');
const ga4File = path.join(dashboardDir, 'lib', 'analytics', 'ga4.ts');

console.log('\n=== Landing Page CTA Analytics E2E Test ===\n');

// Test 1: page.tsx exists and contains CTA instrumentation
test('page.tsx contains trackCTAClick imports', () => {
  const content = fs.readFileSync(pageFile, 'utf8');
  assert(content.includes("import { trackCTAClick, attachScrollMilestoneObservers } from '@/lib/analytics/ga4'"),
    'Missing trackCTAClick import');
});

// Test 2: All required CTA IDs are present
test('page.tsx contains all required data-cta-id attributes', () => {
  const content = fs.readFileSync(pageFile, 'utf8');
  const requiredCtaIds = [
    'join_pilot_hero',
    'get_started_hero', 
    'see_how_it_works',
    'join_pilot_nav',
    'sign_in_nav',
    'pricing_starter',
    'pricing_pro',
    'pricing_team',
    'lead_magnet_cta'
  ];
  
  for (const ctaId of requiredCtaIds) {
    assert(content.includes(`data-cta-id="${ctaId}"`), 
      `Missing data-cta-id attribute: ${ctaId}`);
  }
});

// Test 3: trackCTAClick is called for each CTA
test('page.tsx calls trackCTAClick for each CTA', () => {
  const content = fs.readFileSync(pageFile, 'utf8');
  const ctaCalls = [
    "trackCTAClick('join_pilot_hero'",
    "trackCTAClick('get_started_hero'",
    "trackCTAClick('see_how_it_works'",
    "trackCTAClick('join_pilot_nav'",
    "trackCTAClick('sign_in_nav'",
    "trackCTAClick('pricing_starter'",
    "trackCTAClick('pricing_pro'",
    "trackCTAClick('pricing_team'",
    "trackCTAClick('lead_magnet_cta'"
  ];
  
  for (const call of ctaCalls) {
    assert(content.includes(call), `Missing trackCTAClick call: ${call}`);
  }
});

// Test 4: Scroll milestone observers are attached
test('page.tsx attaches scroll milestone observers', () => {
  const content = fs.readFileSync(pageFile, 'utf8');
  assert(content.includes('attachScrollMilestoneObservers'), 
    'Missing attachScrollMilestoneObservers call');
  assert(content.includes('useEffect'), 
    'Missing useEffect for scroll observers');
});

// Test 5: Scroll milestone refs are defined
test('page.tsx defines scroll milestone refs', () => {
  const content = fs.readFileSync(pageFile, 'utf8');
  assert(content.includes('ref25'), 'Missing ref25 for 25% scroll milestone');
  assert(content.includes('ref50'), 'Missing ref50 for 50% scroll milestone');
  assert(content.includes('ref75'), 'Missing ref75 for 75% scroll milestone');
});

// Test 6: layout.tsx includes GA4 script
test('layout.tsx includes GA4 script tag', () => {
  const content = fs.readFileSync(layoutFile, 'utf8');
  assert(content.includes('www.googletagmanager.com/gtag/js'), 
    'Missing GA4 script src');
  assert(content.includes('window.gtag'), 
    'Missing gtag initialization');
  assert(content.includes('NEXT_PUBLIC_GA4_MEASUREMENT_ID'), 
    'Missing GA4 env var reference');
});

// Test 7: layout.tsx uses Script component with afterInteractive strategy
test('layout.tsx uses Next.js Script component with afterInteractive', () => {
  const content = fs.readFileSync(layoutFile, 'utf8');
  assert(content.includes('import Script from') && content.includes('next/script'), 
    'Missing Script import');
  assert(content.includes('strategy="afterInteractive"'), 
    'Missing afterInteractive strategy');
});

// Test 8: ga4.ts exports trackCTAClick function
test('ga4.ts exports trackCTAClick function', () => {
  const content = fs.readFileSync(ga4File, 'utf8');
  assert(content.includes('export function trackCTAClick'), 
    'Missing trackCTAClick export');
});

// Test 9: ga4.ts exports attachScrollMilestoneObservers function
test('ga4.ts exports attachScrollMilestoneObservers function', () => {
  const content = fs.readFileSync(ga4File, 'utf8');
  assert(content.includes('export function attachScrollMilestoneObservers'), 
    'Missing attachScrollMilestoneObservers export');
});

// Test 10: ga4.ts includes SSR safety checks
test('ga4.ts includes SSR safety checks', () => {
  const content = fs.readFileSync(ga4File, 'utf8');
  assert(content.includes("typeof window === 'undefined'"), 
    'Missing SSR safety check for window');
  assert(content.includes("typeof window.gtag !== 'function'"), 
    'Missing gtag function check');
});

// Test 11: CTAId type includes all required identifiers
test('ga4.ts CTAId type includes required identifiers', () => {
  const content = fs.readFileSync(ga4File, 'utf8');
  assert(content.includes("'join_pilot_hero'"), 'Missing join_pilot_hero in CTAId');
  assert(content.includes("'see_how_it_works'"), 'Missing see_how_it_works in CTAId');
  assert(content.includes("'pricing_starter'"), 'Missing pricing_starter in CTAId');
  assert(content.includes("'pricing_pro'"), 'Missing pricing_pro in CTAId');
  assert(content.includes("'pricing_team'"), 'Missing pricing_team in CTAId');
  assert(content.includes("'lead_magnet_cta'"), 'Missing lead_magnet_cta in CTAId');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log(`\n${RED}FAILED${RESET}`);
  process.exit(1);
} else {
  console.log(`\n${GREEN}ALL TESTS PASSED${RESET}`);
  process.exit(0);
}
