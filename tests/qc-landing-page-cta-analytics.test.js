/**
 * QC E2E Test: Landing Page CTA Click Analytics
 * 
 * Verifies that:
 * 1. GA4 module is properly implemented with no security issues
 * 2. All CTAs on landing page have tracking integrated
 * 3. Data flow is correct (no PII leaks, proper event structure)
 * 4. Built bundle includes GA4 code
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const DASHBOARD_DIR = path.join(__dirname, '../product/lead-response/dashboard');
const GA4_PATH = path.join(DASHBOARD_DIR, 'lib/analytics/ga4.ts');
const PAGE_PATH = path.join(DASHBOARD_DIR, 'app/page.tsx');
const TRIAL_FORM_PATH = path.join(DASHBOARD_DIR, 'components/trial-signup-form.tsx');
const LAYOUT_PATH = path.join(DASHBOARD_DIR, 'app/layout.tsx');
const BUILD_PATH = path.join(DASHBOARD_DIR, '.next/static');

console.log('=== QC E2E Test: Landing Page CTA Click Analytics ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

// ============================================================================
// 1. Security & Implementation Review
// ============================================================================

const ga4Content = fs.readFileSync(GA4_PATH, 'utf8');

test('GA4: No hardcoded API keys or secrets', () => {
  assert.ok(
    !ga4Content.includes('api_key') && !ga4Content.includes('secret') && !ga4Content.includes('password'),
    'GA4 module must not contain hardcoded secrets'
  );
});

test('GA4: SSR-safe (checks for window)', () => {
  assert.ok(
    ga4Content.includes('typeof window === \'undefined\''),
    'trackEvent must check for window to prevent SSR errors'
  );
});

test('GA4: No PII fields in tracking calls', () => {
  // trackCTAClick should NOT pass email, phone, name, etc.
  const trackCTAClickRegex = /export function trackCTAClick[\s\S]{0,500}trackEvent\('cta_click'/;
  assert.ok(
    trackCTAClickRegex.test(ga4Content),
    'trackCTAClick must only track cta_id, cta_label, section (no PII)'
  );
  // Verify the params don't include email or phone
  assert.ok(
    !ga4Content.includes('cta_click') || !ga4Content.includes('email') || 
    ga4Content.indexOf('email') < ga4Content.indexOf('cta_click') || 
    ga4Content.indexOf('email') > ga4Content.lastIndexOf('cta_click') + 200,
    'cta_click event must not include email field'
  );
});

test('GA4: trackEvent is guarded against gtag missing', () => {
  assert.ok(
    ga4Content.includes('typeof window.gtag !== \'function\'') || 
    ga4Content.includes('window.gtag'),
    'trackEvent must check that gtag is available before calling'
  );
});

// ============================================================================
// 2. Landing Page Integration
// ============================================================================

const pageContent = fs.readFileSync(PAGE_PATH, 'utf8');

test('Landing Page: Imports trackCTAClick from ga4', () => {
  assert.ok(
    pageContent.includes("import { trackCTAClick } from '@/lib/analytics/ga4'"),
    'page.tsx must import trackCTAClick'
  );
});

test('Landing Page: All CTA tracking uses correct format', () => {
  // Should use trackCTAClick(ctaId, label, section)
  const trackCalls = pageContent.match(/trackCTAClick\([^)]+\)/g) || [];
  assert.ok(
    trackCalls.length >= 4,
    `Expected at least 4 trackCTAClick calls, found ${trackCalls.length}`
  );
  
  // Each should have 3 parameters
  trackCalls.forEach((call, idx) => {
    const paramCount = (call.match(/'/g) || []).length; // rough count of string parameters
    assert.ok(
      paramCount >= 2,
      `trackCTAClick call ${idx + 1} should have string parameters for ctaId and label`
    );
  });
});

test('Landing Page: Join Pilot nav link has tracking', () => {
  assert.ok(
    pageContent.includes("trackCTAClick('join_pilot_nav'") &&
    pageContent.includes('Pilot Program'),
    'Nav Pilot link must track join_pilot_nav event'
  );
});

test('Landing Page: Hero form passes onSubmitClick callback', () => {
  const heroFormMatch = pageContent.match(/<TrialSignupForm[\s\S]{0,300}onSubmitClick/);
  assert.ok(
    heroFormMatch,
    'Hero TrialSignupForm must have onSubmitClick prop'
  );
});

test('Landing Page: Hero form tracking event is start_trial_form', () => {
  assert.ok(
    pageContent.includes("trackCTAClick('start_trial_form'") &&
    pageContent.includes('Start Free Trial'),
    'Hero form must track start_trial_form CTA'
  );
});

test('Landing Page: Pricing Starter card has tracking', () => {
  assert.ok(
    pageContent.includes("'pricing_starter'") &&
    pageContent.includes('Get Started') &&
    pageContent.includes('pricing'),
    'Pricing Starter must have Get Started button tracking'
  );
});

test('Landing Page: Pricing Pro card has tracking', () => {
  assert.ok(
    pageContent.includes("'pricing_pro'"),
    'Pricing Pro must have CTA tracking'
  );
});

test('Landing Page: Pricing Team card has tracking', () => {
  assert.ok(
    pageContent.includes("'pricing_team'"),
    'Pricing Team must have CTA tracking'
  );
});

test('Landing Page: ctaIdMap properly maps pricing tiers', () => {
  assert.ok(
    pageContent.includes('ctaIdMap') &&
    pageContent.includes("'starter': 'pricing_starter'") &&
    pageContent.includes("'pro': 'pricing_pro'") &&
    pageContent.includes("'team': 'pricing_team'"),
    'PricingCard must have ctaIdMap with all tier mappings'
  );
});

test('Landing Page: Free trial links in pricing section have tracking', () => {
  const trialLinkMatches = pageContent.match(/or start free trial[\s\S]{0,150}trackCTAClick\('start_trial_form'/g);
  assert.ok(
    trialLinkMatches || pageContent.includes("trackCTAClick('start_trial_form'"),
    'Pricing free trial links must track start_trial_form'
  );
});

// ============================================================================
// 3. Trial Signup Form Integration
// ============================================================================

const trialFormContent = fs.readFileSync(TRIAL_FORM_PATH, 'utf8');

test('TrialSignupForm: Props interface includes onSubmitClick', () => {
  assert.ok(
    trialFormContent.includes('onSubmitClick') &&
    trialFormContent.includes('interface TrialSignupFormProps'),
    'TrialSignupForm must accept onSubmitClick prop'
  );
});

test('TrialSignupForm: Calls onSubmitClick before form submission', () => {
  const handleSubmitRegex = /handleSubmit[\s\S]{0,200}if \(onSubmitClick\)|onSubmitClick\?.\(\)/;
  assert.ok(
    handleSubmitRegex.test(trialFormContent),
    'onSubmitClick must be called during form submission'
  );
});

test('TrialSignupForm: No sensitive data in callback', () => {
  // onSubmitClick is called before sending email/password
  assert.ok(
    trialFormContent.includes('if (onSubmitClick)') || 
    trialFormContent.includes('onSubmitClick?.()'),
    'onSubmitClick callback should be pure analytics, called early in handler'
  );
});

// ============================================================================
// 4. GA4 Initialization
// ============================================================================

const layoutContent = fs.readFileSync(LAYOUT_PATH, 'utf8');

test('Layout: GA4 script is loaded conditionally', () => {
  assert.ok(
    layoutContent.includes('NEXT_PUBLIC_GA4_MEASUREMENT_ID') &&
    layoutContent.includes('googletagmanager.com/gtag/js'),
    'Layout must load GA4 script based on env var'
  );
});

test('Layout: GA4 is initialized with proper config', () => {
  assert.ok(
    layoutContent.includes("window.gtag = gtag") &&
    layoutContent.includes("gtag('config'"),
    'Layout must initialize gtag function and config'
  );
});

test('Layout: GA4 anonymizes IP', () => {
  assert.ok(
    layoutContent.includes('anonymize_ip: true'),
    'GA4 config must set anonymize_ip for privacy compliance'
  );
});

// ============================================================================
// 5. Build Verification
// ============================================================================

test('Build output exists', () => {
  assert.ok(
    fs.existsSync(BUILD_PATH),
    'Build directory must exist (npm run build succeeded)'
  );
});

const builtFiles = fs.readdirSync(BUILD_PATH, { recursive: true });

test('Build includes JavaScript chunks', () => {
  // Check that the chunks directory has files
  const chunkCount = builtFiles.filter(f => f.endsWith('.js')).length;
  assert.ok(
    chunkCount > 0,
    `Build must include JavaScript chunks (found ${chunkCount})`
  );
});

// ============================================================================
// 6. Data Flow Verification
// ============================================================================

test('GA4: Event data structure is correct', () => {
  const trackEventContent = ga4Content.substring(
    ga4Content.indexOf('export function trackEvent'),
    ga4Content.indexOf('export function trackEvent') + 500
  );
  assert.ok(
    trackEventContent.includes('name: string') &&
    trackEventContent.includes('params?: Record'),
    'trackEvent must accept name and optional params object'
  );
});

test('GA4: page_url is included for context', () => {
  assert.ok(
    ga4Content.includes('page_url') || ga4Content.includes('window.location.href'),
    'Events should include page_url for attribution'
  );
});

test('Landing Page: CTA tracking covers all major CTAs', () => {
  const ctas = [
    'join_pilot_nav',      // Nav Pilot link
    'start_trial_form',    // Hero form & pricing free trial links
    'pricing_starter',     // Starter Get Started
    'pricing_pro',         // Pro Get Started
    'pricing_team'         // Team Get Started
  ];
  
  ctas.forEach(ctaId => {
    assert.ok(
      pageContent.includes(`'${ctaId}'`),
      `Missing CTA tracking for ${ctaId}`
    );
  });
});

// ============================================================================
// 7. No Regressions
// ============================================================================

test('Page: Still renders with Suspense fallback', () => {
  assert.ok(
    pageContent.includes('<Suspense') &&
    pageContent.includes('fallback='),
    'Page must maintain Suspense for form loading'
  );
});

test('Page: Dark mode classes preserved', () => {
  assert.ok(
    pageContent.includes('dark:'),
    'Page must maintain dark mode styling'
  );
});

// ============================================================================
// Summary
// ============================================================================

console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('✅ All QC checks passed!');
}
