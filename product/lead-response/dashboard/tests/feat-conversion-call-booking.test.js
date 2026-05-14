/**
 * TASK SPEC (370bf0df-0514-4a2f-954a-db73523237cc)
 * What:
 * - Update product/lead-response/dashboard/tests/feat-conversion-call-booking.test.js:
 *   - keep CTA + GA4 checks for pricing, billing, trial-expired pages
 *   - add acceptance check that /pricing renders demo CTA link wired to DEMO_BOOKING_URL with Cal.com fallback
 *   - correct stale trial-expired email fallback assertion to current support email domain used in page code
 * - Update product/lead-response/dashboard/app/pricing/page.tsx:
 *   - align CTA copy to explicit acceptance wording: "Questions? Book a 15-min demo"
 *
 * Verify:
 * - cd product/lead-response/dashboard && node tests/feat-conversion-call-booking.test.js
 *   Expected: all tests pass
 * - cd product/lead-response/dashboard && npm test
 *   Expected: full suite passes
 * - cd product/lead-response/dashboard && npx next build
 *   Expected: build succeeds
 *
 * Boundaries:
 * - Do not change checkout API logic, billing/trial routes, DB schema, or unrelated UI.
 * - Do not introduce FUB/Twilio dependencies for this task.
 * - Do not implement abandonment email flow in this patch (UI CTA scope only).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    return { passed: true, name };
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${error.message}`);
    return { passed: false, name, error: error.message };
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf-8');
}

const results = [];

// Test 1: Pricing page has CTA with correct testid and GA4 event
results.push(runTest('Pricing page has demo CTA with GA4 tracking', () => {
  const content = readFile('app/pricing/page.tsx');
  assert(content.includes('data-testid="demo-call-cta-pricing"'), 'Missing data-testid="demo-call-cta-pricing"');
  assert(content.includes('href={DEMO_BOOKING_URL}'), 'Missing DEMO_BOOKING_URL href wiring');
  assert(content.includes("|| 'https://cal.com'"), 'Missing Cal.com fallback URL on pricing page');
  assert(content.includes("demo_call_cta_click"), 'Missing demo_call_cta_click event');
  assert(content.includes("'pricing_page'"), 'Missing pricing_page source');
}));

// Test 2: Billing page has CTA with correct testid and GA4 event
results.push(runTest('Billing page has demo CTA with GA4 tracking', () => {
  const content = readFile('app/settings/billing/page.tsx');
  assert(content.includes('data-testid="demo-call-cta-billing"'), 'Missing data-testid="demo-call-cta-billing"');
  assert(content.includes("demo_call_cta_click"), 'Missing demo_call_cta_click event');
  assert(content.includes("'billing_page'"), 'Missing billing_page source');
}));

// Test 3: Trial-expired page has CTA with correct testid and GA4 event
results.push(runTest('Trial-expired page has demo CTA with GA4 tracking', () => {
  const content = readFile('app/dashboard/trial-expired/page.tsx');
  assert(content.includes('data-testid="demo-call-cta-trial-expired"'), 'Missing data-testid="demo-call-cta-trial-expired"');
  assert(content.includes("demo_call_cta_click"), 'Missing demo_call_cta_click event');
  assert(content.includes("'trial_expired'"), 'Missing trial_expired source');
  assert(content.includes('Talk to us'), 'Missing "Talk to us" CTA text');
}));

// Test 4: .env.example contains NEXT_PUBLIC_DEMO_BOOKING_URL
results.push(runTest('.env.example contains NEXT_PUBLIC_DEMO_BOOKING_URL', () => {
  const content = readFile('.env.example');
  assert(content.includes('NEXT_PUBLIC_DEMO_BOOKING_URL'), 'Missing NEXT_PUBLIC_DEMO_BOOKING_URL in .env.example');
}));

// Test 5: All three pages import trackEvent
results.push(runTest('All pages import trackEvent from ga4', () => {
  const pricing = readFile('app/pricing/page.tsx');
  const billing = readFile('app/settings/billing/page.tsx');
  const trialExpired = readFile('app/dashboard/trial-expired/page.tsx');
  assert(pricing.includes("from '@/lib/analytics/ga4'"), 'Pricing page missing ga4 import');
  assert(billing.includes("from '@/lib/analytics/ga4'"), 'Billing page missing ga4 import');
  assert(trialExpired.includes("from '@/lib/analytics/ga4'"), 'Trial-expired page missing ga4 import');
}));

// Test 6: Trial-expired page keeps email as secondary link
results.push(runTest('Trial-expired page keeps email as secondary fallback', () => {
  const content = readFile('app/dashboard/trial-expired/page.tsx');
  assert(content.includes('mailto:support@leadflow.ai'), 'Missing mailto fallback link');
  assert(content.includes('Email Support'), 'Missing "Email Support" text');
}));

// Summary
const passed = results.filter(r => r.passed).length;
const total = results.length;

console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passed}/${total}`);
console.log(`Pass Rate: ${(passed / total * 100).toFixed(0)}%`);

if (passed === total) {
  console.log('\n✅ All tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed!');
  process.exit(1);
}
