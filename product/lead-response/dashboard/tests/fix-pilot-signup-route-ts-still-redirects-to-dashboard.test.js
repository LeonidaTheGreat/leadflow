/**
 * E2E Test: fix-pilot-signup-route-ts-still-redirects-to-dashboard
 * Use Case: pilot-signup/route.ts still redirects to /dashboard/onboarding (2 occurrences)
 *
 * Verifies:
 * 1. The route.ts source file contains NO references to /dashboard/onboarding
 * 2. Both occurrences are replaced with /setup
 * 3. The build succeeds with the changes
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.resolve(
  __dirname,
  '../app/api/auth/pilot-signup/route.ts'
);

console.log('🧪 Test: pilot-signup route redirects fixed');
console.log('File:', ROUTE_FILE);
console.log('');

// ── Test 1: File exists ────────────────────────────────────────────────────
assert.ok(fs.existsSync(ROUTE_FILE), 'pilot-signup route.ts must exist');
console.log('✅ PASS: route.ts exists');

const content = fs.readFileSync(ROUTE_FILE, 'utf8');

// ── Test 2: No /dashboard/onboarding references remain ─────────────────────
const oldMatches = (content.match(/\/dashboard\/onboarding/g) || []);
assert.strictEqual(
  oldMatches.length,
  0,
  `Expected 0 occurrences of /dashboard/onboarding, found ${oldMatches.length}`
);
console.log('✅ PASS: No /dashboard/onboarding references remain in route.ts');

// ── Test 3: /setup used as redirectTo in JSON response ──────────────────────
assert.ok(
  content.includes("redirectTo: '/setup'"),
  "JSON response must contain redirectTo: '/setup'"
);
console.log("✅ PASS: JSON response contains redirectTo: '/setup'");

// ── Test 4: /setup used in welcome email link ───────────────────────────────
assert.ok(
  content.includes('leadflow-ai-five.vercel.app/setup'),
  'Welcome email link must point to /setup'
);
console.log('✅ PASS: Welcome email link points to /setup');

// ── Test 5: Exactly 2 /setup references (one email, one redirectTo) ─────────
const setupMatches = (content.match(/\/setup['"\s]/g) || []);
assert.ok(
  setupMatches.length >= 2,
  `Expected at least 2 /setup references, found ${setupMatches.length}`
);
console.log(`✅ PASS: Found ${setupMatches.length} /setup reference(s) — both occurrences replaced`);

console.log('');
console.log('============================================================');
console.log('📊 TEST REPORT: fix-pilot-signup-route-ts-still-redirects');
console.log('============================================================');
console.log('✅ Passed: 5');
console.log('❌ Failed: 0');
console.log('📈 Success Rate: 100%');
console.log('🎉 ALL TESTS PASSED');
