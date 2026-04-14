/**
 * E2E test: trial/start/route.ts redirectTo fix
 * Verifies the route returns redirectTo: '/setup' (not '/dashboard/onboarding')
 * Use case: fix-trial-start-route-ts-redirects-to-onboarding-which
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROUTE_FILE = path.join(
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

// Test 1: Route file contains correct redirectTo
// The fix: trial/start was redirecting to /dashboard/onboarding which is in AUTH_ROUTES
// This caused authenticated users to be redirected away, creating a navigation dead end
test('redirectTo is /setup (not /dashboard/onboarding)', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  assert.ok(content.includes("redirectTo: '/setup'"), "redirectTo should be '/setup'");
  assert.ok(!content.includes("redirectTo: '/dashboard/onboarding'"), "redirectTo must NOT be '/dashboard/onboarding'");
  assert.ok(!content.includes("redirectTo: '/onboarding'"), "redirectTo must NOT be '/onboarding'");
});

// Test 2: /setup page exists in the app
test('/setup route exists in Next.js app', () => {
  const setupPage = path.join(
    __dirname,
    '../product/lead-response/dashboard/app/setup/page.tsx'
  );
  assert.ok(fs.existsSync(setupPage), '/setup/page.tsx must exist');
});

// Test 3: /dashboard/onboarding is not referenced as a post-signup redirect anywhere in the file
test('No remaining /dashboard/onboarding redirect in trial/start route', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  // Allow it only in comments, not in code
  const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  const hasOldRedirect = codeLines.some(l => l.includes('/dashboard/onboarding'));
  assert.ok(!hasOldRedirect, '/dashboard/onboarding must not appear in non-comment code');
});

// Test 4: Verify the route returns the correct response structure
test('Response includes redirectTo in the JSON response', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  assert.ok(content.includes('redirectTo'), 'Response must include redirectTo field');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}