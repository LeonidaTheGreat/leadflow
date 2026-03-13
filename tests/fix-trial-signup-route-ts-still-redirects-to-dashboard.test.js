/**
 * E2E test: trial-signup/route.ts redirectTo /dashboard/onboarding
 * Verifies the route returns redirectTo: '/dashboard/onboarding' (not '/setup')
 * Use case: feat-post-signup-redirect-to-dashboard-onboarding
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROUTE_FILE = path.join(
  __dirname,
  '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
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

// Test 1: Route file contains correct redirectTo
test('redirectTo is /dashboard/onboarding (not /setup)', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  assert.ok(content.includes("redirectTo: '/dashboard/onboarding'"), "redirectTo should be '/dashboard/onboarding'");
});

// Test 2: /dashboard/onboarding page exists in the app
test('/dashboard/onboarding route exists in Next.js app', () => {
  const onboardingPage = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/dashboard/onboarding/page.tsx'
  );
  assert.ok(fs.existsSync(onboardingPage), '/dashboard/onboarding/page.tsx must exist');
});

// Test 3: Email URL points to /dashboard/onboarding
test('Welcome email URL points to /dashboard/onboarding', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  assert.ok(
    content.includes("dashboardUrl: 'https://leadflow-ai-five.vercel.app/dashboard/onboarding'"),
    "Email dashboardUrl should point to /dashboard/onboarding"
  );
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
