/**
 * E2E Test: UC-LANDING-ANALYTICS-GA4-001
 * Landing Page Analytics — GA4 CTA & Conversion Tracking
 * 
 * Verifies:
 * - GA4 script is present in layout.tsx
 * - CTA click tracking is implemented on all buttons
 * - Scroll depth tracking (25%, 50%, 75%) is configured
 * - Form events (form_open, form_submit, form_success, form_error) are tracked
 * - No PII is included in event tracking
 * - SSR-safe implementation (no window references at module scope)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DASHBOARD_DIR = path.join(__dirname, '..');

// Test results tracking
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

// Read files
const layoutContent = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/layout.tsx'), 'utf8');
const pageContent = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/page.tsx'), 'utf8');
const ga4Content = fs.readFileSync(path.join(DASHBOARD_DIR, 'lib/analytics/ga4.ts'), 'utf8');
const signupContent = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/signup/page.tsx'), 'utf8');
const pilotContent = fs.readFileSync(path.join(DASHBOARD_DIR, 'app/pilot/page.tsx'), 'utf8');

console.log('\n=== UC-LANDING-ANALYTICS-GA4-001 E2E Test ===\n');

// AC-1: GA4 script loads on landing page without blocking render
test('GA4 script is present in layout.tsx with afterInteractive strategy', () => {
  assert(layoutContent.includes('googletagmanager.com/gtag/js'), 'GA4 script URL not found');
  assert(layoutContent.includes('strategy="afterInteractive"'), 'afterInteractive strategy not found');
  assert(layoutContent.includes('NEXT_PUBLIC_GA4_MEASUREMENT_ID'), 'Env var reference not found');
});

test('GA4 script is conditional on env var presence', () => {
  assert(layoutContent.includes('GA_ID &&'), 'Conditional rendering not found');
  assert(layoutContent.includes('process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID'), 'Env var not used');
});

test('GA4 initialization includes anonymize_ip for privacy', () => {
  assert(layoutContent.includes('anonymize_ip: true'), 'anonymize_ip not enabled');
});

// AC-2: CTA click events are tracked
test('trackCTAClick is imported in page.tsx', () => {
  assert(pageContent.includes('trackCTAClick'), 'trackCTAClick import not found');
});

test('Hero CTA buttons have click tracking', () => {
  assert(pageContent.includes("trackCTAClick('join_pilot_hero'"), 'join_pilot_hero tracking not found');
  assert(pageContent.includes("trackCTAClick('get_started_hero'"), 'get_started_hero tracking not found');
  assert(pageContent.includes("trackCTAClick('see_how_it_works'"), 'see_how_it_works tracking not found');
});

test('Navigation CTA has click tracking', () => {
  assert(pageContent.includes("trackCTAClick('join_pilot_nav'"), 'join_pilot_nav tracking not found');
  assert(pageContent.includes("trackCTAClick('sign_in_nav'"), 'sign_in_nav tracking not found');
});

test('Pricing CTAs have click tracking', () => {
  assert(pageContent.includes("trackCTAClick('pricing_starter'"), 'pricing_starter tracking not found');
  assert(pageContent.includes("trackCTAClick('pricing_pro'"), 'pricing_pro tracking not found');
  assert(pageContent.includes("trackCTAClick('pricing_team'"), 'pricing_team tracking not found');
});

// AC-3: CTA params include cta_location and cta_text
test('CTA tracking includes section parameter', () => {
  assert(pageContent.includes("'hero'") || pageContent.includes("'navigation'") || pageContent.includes("'pricing'"), 
    'Section parameter not found in CTA tracking');
});

// AC-4, AC-5, AC-6: Form events are tracked
test('Form events are tracked in signup page', () => {
  assert(signupContent.includes('trackFormEvent'), 'trackFormEvent not imported in signup');
  assert(signupContent.includes("trackFormEvent('form_open'"), 'form_open event not found');
  assert(signupContent.includes("trackFormEvent('form_submit'"), 'form_submit event not found');
  assert(signupContent.includes("trackFormEvent('form_success'"), 'form_success event not found');
  assert(signupContent.includes("trackFormEvent('form_error'"), 'form_error event not found');
});

test('Form events are tracked in pilot page', () => {
  assert(pilotContent.includes('trackFormEvent'), 'trackFormEvent not imported in pilot');
  assert(pilotContent.includes("trackFormEvent('form_open'"), 'form_open event not found in pilot');
  assert(pilotContent.includes("trackFormEvent('form_submit'"), 'form_submit event not found in pilot');
  assert(pilotContent.includes("trackFormEvent('form_success'"), 'form_success event not found in pilot');
  assert(pilotContent.includes("trackFormEvent('form_error'"), 'form_error event not found in pilot');
});

// AC-7: Scroll depth tracking
test('Scroll depth tracking is implemented', () => {
  assert(pageContent.includes('attachScrollMilestoneObservers'), 'Scroll observer not imported');
  assert(pageContent.includes('ref25') && pageContent.includes('ref50') && pageContent.includes('ref75'),
    'Scroll milestone refs not found');
});

test('trackScrollMilestone function exists in ga4.ts', () => {
  assert(ga4Content.includes('trackScrollMilestone'), 'trackScrollMilestone not found');
  assert(ga4Content.includes('scroll_milestone'), 'scroll_milestone event name not found');
});

// AC-9: No PII in event parameters
test('No PII is passed to trackEvent functions', () => {
  // Check that no email, phone, or name variables are passed to tracking
  // We look for patterns that suggest actual user data is being passed
  const trackingCalls = [
    ...pageContent.matchAll(/trackCTAClick\([^)]+\)/g),
    ...signupContent.matchAll(/trackFormEvent\([^)]+\)/g),
    ...pilotContent.matchAll(/trackFormEvent\([^)]+\)/g),
  ];
  
  for (const call of trackingCalls) {
    const callStr = call[0];
    // Check for variable references (formData.email, formData.name, etc.) but not string literals
    // 'duplicate_email' is an error type string, not PII
    const piiPatterns = [
      /formData\.(email|name|phone)/,
      /\bemail\b[^']*(?![a-zA-Z_])/,  // email as a variable, not part of a string like 'duplicate_email'
      /\bname\b[^']*(?!\w)/,         // name as a variable
      /\bphone\b[^']*(?!\w)/,        // phone as a variable
    ];
    
    for (const pattern of piiPatterns) {
      assert(!pattern.test(callStr), `Potential PII in tracking call: ${callStr}`);
    }
  }
});

// AC-10: SSR-safe implementation
test('SSR-safe: window check in trackEvent', () => {
  assert(ga4Content.includes("typeof window === 'undefined'"), 'Window undefined check not found');
});

test('SSR-safe: gtag function check', () => {
  assert(ga4Content.includes("typeof window.gtag !== 'function'"), 'gtag function check not found');
});

// AC-11: Type safety
test('FormFunnelEvent type includes required events', () => {
  assert(ga4Content.includes("'form_open'"), 'form_open not in FormFunnelEvent type');
  assert(ga4Content.includes("'form_submit'"), 'form_submit not in FormFunnelEvent type');
  assert(ga4Content.includes("'form_success'"), 'form_success not in FormFunnelEvent type');
  assert(ga4Content.includes("'form_error'"), 'form_error not in FormFunnelEvent type');
});

test('CTAId type includes required CTA identifiers', () => {
  assert(ga4Content.includes("'join_pilot_hero'"), 'join_pilot_hero not in CTAId type');
  assert(ga4Content.includes("'pricing_starter'"), 'pricing_starter not in CTAId type');
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
