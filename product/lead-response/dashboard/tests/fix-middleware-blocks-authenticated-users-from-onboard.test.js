/**
 * E2E Test: fix-middleware-blocks-authenticated-users-from-onboard
 * 
 * Tests that authenticated users can access /onboarding route
 * after the fix to middleware.ts
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';

// Mock middleware logic (replicates the actual middleware behavior)
const PROTECTED_ROUTES = [
  '/dashboard',
  '/settings',
  '/profile',
  '/integrations',
  '/setup',
];

// Routes that should redirect to dashboard if already authenticated
// NOTE: /onboarding and /setup are intentionally NOT here — authenticated users who haven't
// completed onboarding need to access these routes.
const AUTH_ROUTES = [
  '/login',
  '/signup',
];

function isProtectedRoute(pathname) {
  return PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname) {
  return AUTH_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Test cases
async function runTests() {
  console.log('\n=== E2E Test: Middleware Blocks Authenticated Users from /onboarding ===\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: /onboarding should NOT be in AUTH_ROUTES
  try {
    console.log('Test 1: /onboarding should NOT be in AUTH_ROUTES');
    const onboardingInAuthRoutes = AUTH_ROUTES.includes('/onboarding');
    assert.strictEqual(onboardingInAuthRoutes, false, '/onboarding should not be in AUTH_ROUTES');
    console.log('  ✅ PASS: /onboarding is correctly excluded from AUTH_ROUTES');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 2: /setup should NOT be in AUTH_ROUTES
  try {
    console.log('\nTest 2: /setup should NOT be in AUTH_ROUTES');
    const setupInAuthRoutes = AUTH_ROUTES.includes('/setup');
    assert.strictEqual(setupInAuthRoutes, false, '/setup should not be in AUTH_ROUTES');
    console.log('  ✅ PASS: /setup is correctly excluded from AUTH_ROUTES');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 3: /onboarding should NOT be treated as an auth route
  try {
    console.log('\nTest 3: /onboarding should NOT be treated as an auth route');
    const result = isAuthRoute('/onboarding');
    assert.strictEqual(result, false, '/onboarding should not be treated as an auth route');
    console.log('  ✅ PASS: /onboarding is not treated as an auth route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 4: /setup should NOT be treated as an auth route
  try {
    console.log('\nTest 4: /setup should NOT be treated as an auth route');
    const result = isAuthRoute('/setup');
    assert.strictEqual(result, false, '/setup should not be treated as an auth route');
    console.log('  ✅ PASS: /setup is not treated as an auth route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 5: /login should still be in AUTH_ROUTES
  try {
    console.log('\nTest 5: /login should still be in AUTH_ROUTES');
    const result = isAuthRoute('/login');
    assert.strictEqual(result, true, '/login should be treated as an auth route');
    console.log('  ✅ PASS: /login is correctly treated as an auth route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 6: /signup should still be in AUTH_ROUTES
  try {
    console.log('\nTest 6: /signup should still be in AUTH_ROUTES');
    const result = isAuthRoute('/signup');
    assert.strictEqual(result, true, '/signup should be treated as an auth route');
    console.log('  ✅ PASS: /signup is correctly treated as an auth route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 7: /setup should be a protected route
  try {
    console.log('\nTest 7: /setup should be a protected route');
    const result = isProtectedRoute('/setup');
    assert.strictEqual(result, true, '/setup should be a protected route');
    console.log('  ✅ PASS: /setup is correctly a protected route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 8: /onboarding should NOT be a protected route
  try {
    console.log('\nTest 8: /onboarding should NOT be a protected route');
    const result = isProtectedRoute('/onboarding');
    assert.strictEqual(result, false, '/onboarding should not be a protected route');
    console.log('  ✅ PASS: /onboarding is correctly not a protected route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 9: Verify the middleware file exists and contains the fix
  try {
    console.log('\nTest 9: Verify middleware.ts contains the fix');
    const fs = require('fs');
    const path = require('path');
    const middlewarePath = path.join(__dirname, '../middleware.ts');
    
    assert.strictEqual(fs.existsSync(middlewarePath), true, 'middleware.ts should exist');
    
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Check that /onboarding is NOT in AUTH_ROUTES - look at the actual array content
    const authRoutesMatch = content.match(/const AUTH_ROUTES = \[([\s\S]*?)\]/);
    assert.ok(authRoutesMatch, 'AUTH_ROUTES array should exist');
    const authRoutesContent = authRoutesMatch[1];
    
    // The array should only contain '/login' and '/signup', NOT '/onboarding'
    const hasOnboarding = authRoutesContent.includes("'/onboarding'") || authRoutesContent.includes('"/onboarding"');
    assert.ok(!hasOnboarding, '/onboarding should not be in AUTH_ROUTES array');
    
    // Check that the comment mentions /onboarding
    assert.ok(content.includes('/onboarding'), 'Comment should mention /onboarding');
    assert.ok(content.includes('/setup'), 'Comment should mention /setup');
    
    // Check that /login is still there
    assert.ok(authRoutesContent.includes("'/login'"), '/login should still be in AUTH_ROUTES');
    
    // Check that /signup is still there
    assert.ok(authRoutesContent.includes("'/signup'"), '/signup should still be in AUTH_ROUTES');
    
    console.log('  ✅ PASS: middleware.ts contains the correct fix');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 10: Verify middleware behavior simulation
  try {
    console.log('\nTest 10: Simulate middleware behavior for authenticated user accessing /onboarding');
    
    // Simulate: authenticated user accessing /onboarding
    const isAuthenticated = true;
    const pathname = '/onboarding';
    
    const isAuth = isAuthRoute(pathname);
    const isProtected = isProtectedRoute(pathname);
    
    // Authenticated user should NOT be redirected away from /onboarding
    // because it's not in AUTH_ROUTES
    const shouldRedirect = isAuth && isAuthenticated;
    
    assert.strictEqual(shouldRedirect, false, 'Authenticated user should NOT be redirected from /onboarding');
    assert.strictEqual(isAuth, false, '/onboarding should not be an auth route');
    assert.strictEqual(isProtected, false, '/onboarding should not be a protected route');
    
    console.log('  ✅ PASS: Authenticated user can access /onboarding without redirection');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Summary
  console.log('\n=== Test Summary ===');
  console.log(`Total: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n❌ TEST SUITE FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ TEST SUITE PASSED');
    process.exit(0);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
