/**
 * E2E Test: fix-missing-how-it-works-section-ac-2-fails
 * Task: 186971a1-cfb0-4ca5-bc2d-69cb92d67f6c
 *
 * Acceptance Criteria 2: LandingPage must have a "How It Works" section
 * with 3 steps and a data-testid="how-it-works-section" wrapper.
 *
 * Reads the LandingPage component file (dashboard/app/page.tsx) and asserts:
 * - Contains data-testid="how-it-works-section"
 * - Contains "How It Works" text
 * - Contains all 3 steps (Connect Your CRM, AI Responds, Close the Deal)
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LANDING_PAGE = path.join(ROOT, 'product/lead-response/dashboard/app/page.tsx');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

console.log('Running How It Works section checks on LandingPage (app/page.tsx)');
console.log('');

// Load the landing page source
let src;
test('LandingPage (page.tsx) file exists', () => {
  assert(fs.existsSync(LANDING_PAGE), `Landing page not found at ${LANDING_PAGE}`);
  src = fs.readFileSync(LANDING_PAGE, 'utf-8');
});

// Only run content tests if file loaded
if (src) {
  test('LandingPage has data-testid="how-it-works-section" wrapper', () => {
    assert(
      src.includes('data-testid="how-it-works-section"'),
      'page.tsx must have data-testid="how-it-works-section" on the section wrapper'
    );
  });

  test('LandingPage contains "How It Works" heading text', () => {
    assert(
      src.includes('How It Works'),
      'page.tsx must contain "How It Works" heading text'
    );
  });

  test('LandingPage has a step about connecting CRM (FUB)', () => {
    assert(
      src.includes('Connect Your CRM') || src.includes('Connect') && src.includes('CRM'),
      'page.tsx How It Works must include step about connecting your CRM'
    );
  });

  test('LandingPage has a step about AI responding instantly', () => {
    assert(
      src.includes('AI Responds') || src.includes('AI Responds Instantly') ||
      (src.includes('Responds') && src.includes('30')),
      'page.tsx How It Works must include step about AI responding instantly'
    );
  });

  test('LandingPage has a step about closing deals', () => {
    assert(
      src.includes('Close the Deal') || src.includes('You Close') ||
      src.includes('Close the Deals'),
      'page.tsx How It Works must include step about closing deals'
    );
  });

  test('How It Works section has 3 steps (HowItWorksStep components or equivalent)', () => {
    // Count step references — either component usage or testid attributes
    const stepMatches = (src.match(/how-it-works-step-\d+|HowItWorksStep|step=\{[123]\}/g) || []);
    assert(
      stepMatches.length >= 3,
      `Expected at least 3 How It Works step references, found ${stepMatches.length}`
    );
  });
}

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
