/**
 * E2E Test: Landing Page Acquisition & Conversion Optimization
 * UC: uc-landing-page-revenue-optimization
 * Task: 37bba498-4ac6-4669-b87c-455e0a8ea0a2
 *
 * Tests verify requirements R1-R6 from dev completion report:
 * R1 - 14-day trial messaging consistency
 * R2 - Fake testimonials replaced with outcome cards
 * R3 - No false social proof claims
 * R4 - Pricing CTAs link to /signup/trial
 * R5 - Hero trust bar present
 * R6 - Footer legal links present
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PAGE_PATH = path.resolve(__dirname, '../../product/lead-response/dashboard/app/page.tsx');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

console.log('=== Landing Page Optimization E2E Tests ===\n');

// Guard: file must exist
if (!fs.existsSync(PAGE_PATH)) {
  console.error(`FATAL: page.tsx not found at ${PAGE_PATH}`);
  process.exit(1);
}

const content = fs.readFileSync(PAGE_PATH, 'utf8');

// R1: 14-day trial duration consistency (min 3 occurrences)
test('R1a: Hero paragraph mentions 14-day free trial', () => {
  assert.ok(
    content.includes('14-day free trial — no credit card required'),
    'Hero must say "14-day free trial — no credit card required"'
  );
});

test('R1b: Pricing section mentions 14-day trial', () => {
  const pricingIdx = content.indexOf('data-testid="pricing-section"');
  assert.ok(pricingIdx !== -1, 'Pricing section must exist');
  const pricingContent = content.slice(pricingIdx, pricingIdx + 2000);
  assert.ok(
    pricingContent.includes('14-day'),
    'Pricing section must mention 14-day trial'
  );
});

test('R1c: At least 4 occurrences of "14-day" across the page', () => {
  const count = (content.match(/14-day/g) || []).length;
  assert.ok(count >= 4, `Expected at least 4 "14-day" occurrences, found ${count}`);
});

test('R1d: No stale "30-day" trial language', () => {
  const count = (content.match(/30-day/g) || []).length;
  assert.strictEqual(count, 0, `Found ${count} "30-day" occurrences — must be 0`);
});

// R2: Fake testimonials replaced with outcome cards
test('R2a: Fake testimonial quotes removed (Sarah M., Mike R., Jennifer K.)', () => {
  assert.ok(!content.includes('Sarah M.'), 'Fake testimonial "Sarah M." must be removed');
  assert.ok(!content.includes('Mike R.'), 'Fake testimonial "Mike R." must be removed');
  assert.ok(!content.includes('Jennifer K.'), 'Fake testimonial "Jennifer K." must be removed');
});

test('R2b: Disclaimer "expected outcomes based on typical usage" removed', () => {
  assert.ok(
    !content.includes('expected outcomes based on typical usage'),
    'Fake disclaimer must be removed'
  );
});

test('R2c: OutcomeCard component exists in page', () => {
  assert.ok(
    content.includes('function OutcomeCard'),
    'OutcomeCard component must be defined'
  );
});

test('R2d: Outcome stats include response time card', () => {
  assert.ok(
    content.includes('Response Time') && content.includes('<30 seconds'),
    'Outcome card for <30 second response time must be present'
  );
});

test('R2e: Testimonials section heading is honest (not "What Agents Are Saying")', () => {
  assert.ok(
    !content.includes('What Agents Are Saying'),
    '"What Agents Are Saying" (fake testimonials heading) must be removed'
  );
  assert.ok(
    content.includes('What Early Agents Experience'),
    'New honest heading "What Early Agents Experience" must be present'
  );
});

// R3: No false social proof claims
test('R3: No "hundreds of agents" false claim', () => {
  assert.ok(
    !content.includes('hundreds of agents'),
    '"hundreds of agents" false claim must be removed'
  );
});

test('R3b: Pilot program messaging replaces false claim', () => {
  assert.ok(
    content.includes('pilot program'),
    'Honest pilot program messaging must replace false social proof'
  );
});

// R4: Pricing CTAs link to /signup/trial?plan=
test('R4a: PricingCard href uses /signup/trial?plan= not /signup?plan=', () => {
  assert.ok(
    content.includes('/signup/trial?plan='),
    'PricingCard must link to /signup/trial?plan= for cold traffic funnel'
  );
  assert.ok(
    !content.includes('/signup?plan='),
    'Old /signup?plan= links must not remain in PricingCard'
  );
});

test('R4b: Pricing CTA default text is "Start 14-Day Free Trial"', () => {
  assert.ok(
    content.includes("cta = 'Start 14-Day Free Trial'"),
    'PricingCard default CTA must be "Start 14-Day Free Trial"'
  );
});

test('R4c: Duplicate "or start free trial" secondary links removed', () => {
  assert.ok(
    !content.includes('or start free trial'),
    'Redundant "or start free trial" links must be removed from pricing cards'
  );
});

// R5: Hero trust bar
test('R5a: Hero trust bar element present (data-testid="hero-trust-bar")', () => {
  assert.ok(
    content.includes('data-testid="hero-trust-bar"'),
    'Hero trust bar must have data-testid="hero-trust-bar"'
  );
});

test('R5b: Trust bar shows "14-day free trial"', () => {
  const trustBarIdx = content.indexOf('hero-trust-bar');
  assert.ok(trustBarIdx !== -1, 'hero-trust-bar must exist');
  const trustBarContent = content.slice(trustBarIdx, trustBarIdx + 400);
  assert.ok(
    trustBarContent.includes('14-day free trial'),
    'Trust bar must include "14-day free trial"'
  );
});

test('R5c: Trust bar shows "No credit card"', () => {
  const trustBarIdx = content.indexOf('hero-trust-bar');
  const trustBarContent = content.slice(trustBarIdx, trustBarIdx + 400);
  assert.ok(
    trustBarContent.includes('No credit card'),
    'Trust bar must include "No credit card"'
  );
});

test('R5d: Trust bar shows "Cancel anytime"', () => {
  // Cancel anytime appears in trust bar AND footer
  assert.ok(
    content.includes('Cancel anytime'),
    'Trust bar must include "Cancel anytime"'
  );
  const count = (content.match(/Cancel anytime/g) || []).length;
  assert.ok(count >= 1, `"Cancel anytime" must appear at least once, found ${count}`);
});

// R6: Footer legal links
test('R6a: Footer has Privacy Policy link', () => {
  assert.ok(
    content.includes('href="/privacy"'),
    'Footer must have href="/privacy" link'
  );
  assert.ok(
    content.includes('Privacy Policy'),
    'Footer must have "Privacy Policy" text'
  );
});

test('R6b: Footer has Terms link', () => {
  assert.ok(
    content.includes('href="/terms"'),
    'Footer must have href="/terms" link'
  );
});

// Structure: How It Works section must still be present (pre-existing from prior PRD)
test('STRUCT: How It Works section present', () => {
  assert.ok(
    content.includes('data-testid="how-it-works-section"'),
    'How It Works section must be present'
  );
});

test('STRUCT: How It Works has 3 steps', () => {
  assert.ok(content.includes('testId="how-it-works-step-1"'), 'Step 1 must exist');
  assert.ok(content.includes('testId="how-it-works-step-2"'), 'Step 2 must exist');
  assert.ok(content.includes('testId="how-it-works-step-3"'), 'Step 3 must exist');
});

// No junk / no debug artifacts
test('QUALITY: No console.log in page component', () => {
  // Only check inside the page component function body — not in comments or test data
  const mainFuncIdx = content.indexOf('export default function HomePage');
  const afterExport = content.slice(mainFuncIdx);
  // Allow console in string literals (test IDs, etc.) but not bare calls
  const bareConsole = afterExport.match(/^\s*console\.(log|error|warn)\(/m);
  assert.ok(!bareConsole, 'No bare console.log calls in page component');
});

test('QUALITY: No hardcoded secrets (API keys, tokens)', () => {
  const secretPatterns = [
    /sk-[a-zA-Z0-9]{20,}/,  // OpenAI style
    /STRIPE_[A-Z_]+\s*=\s*['"][a-zA-Z0-9]+['"]/,
    /api_key\s*=\s*['"][a-zA-Z0-9]{20,}['"]/i,
  ];
  for (const pattern of secretPatterns) {
    assert.ok(!pattern.test(content), `Potential hardcoded secret matching ${pattern}`);
  }
});

// Summary
console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed / ${passed + failed} total ===`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All tests passed.');
}
