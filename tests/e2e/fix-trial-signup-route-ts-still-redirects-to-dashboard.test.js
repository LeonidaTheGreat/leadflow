/**
 * E2E test: trial-signup/route.ts redirectTo fix
 * Verifies the route returns redirectTo: '/setup' (not '/dashboard/onboarding')
 * Use case: fix-trial-signup-route-ts-still-redirects-to-dashboard
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
test('redirectTo is /setup (not /dashboard/onboarding)', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  assert.ok(content.includes("redirectTo: '/setup'"), "redirectTo should be '/setup'");
  assert.ok(!content.includes("redirectTo: '/dashboard/onboarding'"), "redirectTo must NOT be '/dashboard/onboarding'");
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
test('No remaining /dashboard/onboarding redirect in trial-signup route', () => {
  const content = fs.readFileSync(ROUTE_FILE, 'utf8');
  // Allow it only in comments, not in code
  const codeLines = content.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'));
  const hasOldRedirect = codeLines.some(l => l.includes('/dashboard/onboarding'));
  assert.ok(!hasOldRedirect, '/dashboard/onboarding must not appear in non-comment code');
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
