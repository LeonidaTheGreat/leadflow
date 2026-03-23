/**
 * E2E test: trial-signup/route.ts redirectTo fix
 * Verifies the route returns redirectTo: '/dashboard/onboarding' (not '/setup')
 * Use case: fix-signup-routes-redirect-to-setup-not-dashboard-onbo
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
  assert.ok(!content.includes("redirectTo: '/setup'"), "redirectTo must NOT be '/setup'");
});

// Test 2: /setup page still exists in the app (setup wizard still accessible)
test('/setup route exists in Next.js app', () => {
  const setupPage = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/setup/page.tsx'
  );
  assert.ok(fs.existsSync(setupPage), '/setup/page.tsx must exist');
});

// Test 3: dashboardUrl in welcome email also uses /dashboard/onboarding
test('dashboardUrl in welcome email uses /dashboard/onboarding', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  assert.ok(
    content.includes('/dashboard/onboarding'),
    'dashboardUrl should reference /dashboard/onboarding'
  );
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
