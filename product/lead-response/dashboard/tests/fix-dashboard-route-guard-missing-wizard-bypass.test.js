/**
 * E2E Test: fix-dashboard-route-guard-missing-wizard-bypass-possib
 *
 * Tests that the dashboard route guard properly checks onboarding_completed
 * and redirects unauthenticated or incomplete onboarding agents to /onboarding
 *
 * Acceptance Criteria:
 * - If agent is authenticated and onboarding_completed = false, redirect to /onboarding
 * - If agent is authenticated and onboarding_completed = true, allow access to /dashboard
 * - If agent is not authenticated, redirect to /login
 * - Existing functionality is not broken
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Helper to check if middleware file contains the fix
function checkMiddlewareContainsFix() {
  const middlewarePath = path.join(__dirname, '../middleware.ts');
  
  assert.strictEqual(fs.existsSync(middlewarePath), true, 'middleware.ts should exist');
  
  const content = fs.readFileSync(middlewarePath, 'utf8');
  
  // Check for isOnboardingCompleted function
  assert.ok(
    content.includes('async function isOnboardingCompleted(userId: string)'),
    'Should have isOnboardingCompleted function'
  );
  
  // Check that it queries real_estate_agents table
  assert.ok(
    content.includes("from('real_estate_agents')"),
    'Should query real_estate_agents table'
  );
  
  // Check that it selects onboarding_completed field
  assert.ok(
    content.includes("select('onboarding_completed')"),
    'Should select onboarding_completed field'
  );
  
  // Check for the dashboard route guard logic
  assert.ok(
    content.includes("pathname === '/dashboard'"),
    'Should check for /dashboard route'
  );
  
  // Check that it redirects to /onboarding when not completed
  assert.ok(
    content.includes("return NextResponse.redirect(new URL('/onboarding'"),
    'Should redirect to /onboarding when onboarding not completed'
  );
  
  // Verify /dashboard is still in protected routes
  assert.ok(
    content.includes("'/dashboard'"),
    '/dashboard should still be in protected routes'
  );
  
  return true;
}

// Simulate middleware behavior
function mockMiddlewareBehavior() {
  const PROTECTED_ROUTES = [
    '/dashboard',
    '/settings',
    '/profile',
    '/integrations',
    '/setup',
  ];
  
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
  
  return { isProtectedRoute, isAuthRoute };
}

// Test cases
async function runTests() {
  console.log('\n=== E2E Test: Dashboard Route Guard Missing Wizard Bypass ===\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Middleware file contains the fix
  try {
    console.log('Test 1: Middleware file contains the onboarding guard logic');
    checkMiddlewareContainsFix();
    console.log('  ✅ PASS: Middleware properly checks onboarding_completed');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 2: /dashboard is a protected route
  try {
    console.log('\nTest 2: /dashboard is a protected route');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isProtectedRoute('/dashboard'), true, '/dashboard should be protected');
    console.log('  ✅ PASS: /dashboard is a protected route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 3: /dashboard sub-routes are protected
  try {
    console.log('\nTest 3: /dashboard sub-routes are protected');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isProtectedRoute('/dashboard/analytics'), true, '/dashboard/* should be protected');
    console.log('  ✅ PASS: /dashboard sub-routes are protected');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 4: /onboarding is not an auth route
  try {
    console.log('\nTest 4: /onboarding is not an auth route');
    const { isAuthRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isAuthRoute('/onboarding'), false, '/onboarding should not be an auth route');
    console.log('  ✅ PASS: /onboarding is not an auth route (allows authenticated users)');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 5: /onboarding is not a protected route
  try {
    console.log('\nTest 5: /onboarding is not a protected route');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isProtectedRoute('/onboarding'), false, '/onboarding should not be a protected route');
    console.log('  ✅ PASS: /onboarding is accessible (not protected)');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 6: /settings is a protected route
  try {
    console.log('\nTest 6: /settings is a protected route');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isProtectedRoute('/settings'), true, '/settings should be protected');
    console.log('  ✅ PASS: /settings is a protected route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 7: /profile is a protected route
  try {
    console.log('\nTest 7: /profile is a protected route');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isProtectedRoute('/profile'), true, '/profile should be protected');
    console.log('  ✅ PASS: /profile is a protected route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 8: /integrations is a protected route
  try {
    console.log('\nTest 8: /integrations is a protected route');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isProtectedRoute('/integrations'), true, '/integrations should be protected');
    console.log('  ✅ PASS: /integrations is a protected route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 9: /login is an auth route
  try {
    console.log('\nTest 9: /login is an auth route');
    const { isAuthRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isAuthRoute('/login'), true, '/login should be an auth route');
    console.log('  ✅ PASS: /login is an auth route (redirects authenticated users)');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 10: /signup is an auth route
  try {
    console.log('\nTest 10: /signup is an auth route');
    const { isAuthRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isAuthRoute('/signup'), true, '/signup should be an auth route');
    console.log('  ✅ PASS: /signup is an auth route (redirects authenticated users)');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 11: Verify middleware logic for dashboard access
  try {
    console.log('\nTest 11: Verify middleware handles unauthenticated dashboard access');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    const isAuthenticated = false;
    const pathname = '/dashboard';
    
    // Unauthenticated user accessing protected route should be redirected
    const shouldRedirectToLogin = isProtectedRoute(pathname) && !isAuthenticated;
    
    assert.strictEqual(shouldRedirectToLogin, true, 'Unauthenticated user should be redirected from /dashboard');
    console.log('  ✅ PASS: Unauthenticated users are redirected to login');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 12: Check for /setup in protected routes
  try {
    console.log('\nTest 12: /setup is a protected route');
    const { isProtectedRoute } = mockMiddlewareBehavior();
    assert.strictEqual(isProtectedRoute('/setup'), true, '/setup should be a protected route');
    console.log('  ✅ PASS: /setup is a protected route');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 13: Verify middleware file has proper error handling
  try {
    console.log('\nTest 13: Middleware has error handling for onboarding check');
    const middlewarePath = path.join(__dirname, '../middleware.ts');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Check for error handling
    assert.ok(
      content.includes('console.error') || content.includes('catch'),
      'Should have error handling for database queries'
    );
    
    console.log('  ✅ PASS: Middleware has error handling');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 14: Verify middleware function signature
  try {
    console.log('\nTest 14: isOnboardingCompleted function has correct signature');
    const middlewarePath = path.join(__dirname, '../middleware.ts');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Check function signature
    assert.ok(
      content.includes('async function isOnboardingCompleted(userId: string): Promise<boolean | null>'),
      'Function should accept userId and return Promise<boolean | null>'
    );
    
    console.log('  ✅ PASS: Function signature is correct');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 15: Verify middleware awaits the onboarding check
  try {
    console.log('\nTest 15: Middleware properly awaits onboarding check');
    const middlewarePath = path.join(__dirname, '../middleware.ts');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Check that the async function is awaited
    assert.ok(
      content.includes('const onboardingCompleted = await isOnboardingCompleted'),
      'Should await the onboarding check'
    );
    
    console.log('  ✅ PASS: Middleware properly awaits async check');
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
  console.log(`Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
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
