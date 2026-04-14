/**
 * E2E Test: Cookie Name Mismatch Fix
 * Use Case: fix-cookie-name-mismatch-trial-start-sets-auth-token-u
 * 
 * Verifies that trial/start route sets auth-token (hyphen) cookie
 * that matches what /api/auth/me expects to read.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');

function readFile(relativePath) {
  return fs.readFileSync(path.join(DASHBOARD_DIR, relativePath), 'utf-8');
}

console.log('=== E2E Test: Cookie Name Mismatch Fix ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

// Test 1: Verify trial/start sets auth-token (hyphen)
test('trial/start/route.ts sets cookie with auth-token (hyphen)', () => {
  const src = readFile('app/api/trial/start/route.ts');
  assert.ok(
    src.includes("cookies.set('auth-token'"),
    "Must set cookie as 'auth-token' (hyphen)"
  );
});

// Test 2: Verify trial/start does NOT set auth_token (underscore)
test('trial/start/route.ts does NOT set auth_token (underscore)', () => {
  const src = readFile('app/api/trial/start/route.ts');
  assert.ok(
    !src.includes("cookies.set('auth_token'"),
    "Must NOT set cookie as 'auth_token' (underscore)"
  );
});

// Test 3: Verify /api/auth/me reads auth-token (hyphen)
test('/api/auth/me reads auth-token cookie (hyphen)', () => {
  const src = readFile('app/api/auth/me/route.ts');
  assert.ok(
    src.includes("cookies.get('auth-token')") || src.includes('cookies.get("auth-token")'),
    "Must read cookie as 'auth-token' (hyphen)"
  );
});

// Test 4: Verify cookie options are secure
test('trial/start cookie has secure options (httpOnly, secure, sameSite)', () => {
  const src = readFile('app/api/trial/start/route.ts');
  assert.ok(src.includes('httpOnly: true'), 'Cookie must be httpOnly');
  assert.ok(src.includes('secure:'), 'Cookie must have secure option');
  assert.ok(src.includes('sameSite:'), 'Cookie must have sameSite option');
});

// Test 5: Verify cookie maxAge is 30 days
test('trial/start cookie has 30-day maxAge', () => {
  const src = readFile('app/api/trial/start/route.ts');
  // 30 days in seconds = 30 * 24 * 60 * 60 = 2592000
  assert.ok(
    src.includes('maxAge: 30 * 24 * 60 * 60') || src.includes('2592000'),
    'Cookie maxAge should be 30 days'
  );
});

// Test 6: Verify trial/start works with /api/auth/me for session check
test('trial/start auth-token cookie is readable by /api/auth/me', () => {
  const trialStart = readFile('app/api/trial/start/route.ts');
  const authMe = readFile('app/api/auth/me/route.ts');
  
  // Both should reference the same cookie name
  assert.ok(
    trialStart.includes("cookies.set('auth-token'") || trialStart.includes('cookies.set("auth-token")'),
    'trial/start must set auth-token (hyphen)'
  );
  
  assert.ok(
    authMe.includes("cookies.get('auth-token')") || authMe.includes('cookies.get("auth-token")'),
    '/api/auth/me must read auth-token (hyphen)'
  );
  
  // Ensure no underscore version in either
  assert.ok(
    !trialStart.includes("cookies.set('auth_token'"),
    'trial/start must NOT set auth_token (underscore)'
  );
  assert.ok(
    !authMe.includes("cookies.get('auth_token'"),
    '/api/auth/me must NOT read auth_token (underscore)'
  );
});

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  console.log('\n❌ TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED');
  process.exit(0);
}
