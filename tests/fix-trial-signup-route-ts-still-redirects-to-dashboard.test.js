/**
 * E2E test: post-signup redirect to /dashboard/onboarding
 * Verifies all signup routes return redirectTo: '/dashboard/onboarding'
 * Use case: feat-post-signup-redirect-to-dashboard-onboarding
 *
 * Updated: stale assertion for /setup replaced with /dashboard/onboarding
 * per decision 4ff87559 approved by Stojan 2026-03-13.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TRIAL_SIGNUP_ROUTE = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
);

const PILOT_SIGNUP_ROUTE = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/auth/pilot-signup/route.ts'
);

const TRIAL_START_ROUTE = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/trial/start/route.ts'
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// Test 1: trial-signup route redirects to /dashboard/onboarding
test('trial-signup: redirectTo is /dashboard/onboarding', () => {
  const content = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/dashboard/onboarding'"),
    "trial-signup redirectTo should be '/dashboard/onboarding'"
  );
  assert.ok(
    !content.includes("redirectTo: '/setup'"),
    "trial-signup redirectTo must NOT be '/setup'"
  );
});

// Test 2: pilot-signup route redirects to /dashboard/onboarding
test('pilot-signup: redirectTo is /dashboard/onboarding', () => {
  const content = fs.readFileSync(PILOT_SIGNUP_ROUTE, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/dashboard/onboarding'"),
    "pilot-signup redirectTo should be '/dashboard/onboarding'"
  );
  assert.ok(
    !content.includes("redirectTo: '/setup'"),
    "pilot-signup redirectTo must NOT be '/setup'"
  );
});

// Test 3: trial/start route redirects to /dashboard/onboarding
test('trial/start: redirectTo is /dashboard/onboarding', () => {
  const content = fs.readFileSync(TRIAL_START_ROUTE, 'utf8');
  assert.ok(
    content.includes("redirectTo: '/dashboard/onboarding'"),
    "trial/start redirectTo should be '/dashboard/onboarding'"
  );
  assert.ok(
    !content.includes("redirectTo: '/setup'"),
    "trial/start redirectTo must NOT be '/setup'"
  );
});

// Test 4: /dashboard/onboarding page exists
test('/dashboard/onboarding page exists in Next.js app', () => {
  const onboardingPage = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/dashboard/onboarding/page.tsx'
  );
  assert.ok(fs.existsSync(onboardingPage), '/dashboard/onboarding/page.tsx must exist');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
