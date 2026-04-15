/**
 * E2E Test: fix-onboarding-still-present-in-auth-routes-middleware
 * 
 * Tests that /onboarding is NOT in AUTH_ROUTES in middleware.ts
 * This ensures authenticated users can access /onboarding to complete onboarding.
 * 
 * Acceptance Criteria (from PRD):
 * - /onboarding should NOT be in AUTH_ROUTES array
 * - Authenticated users should be able to access /onboarding
 * - The comment should clarify both /onboarding and /setup are intentionally excluded
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('\n=== E2E Test: /onboarding removed from AUTH_ROUTES ===\n');
  
  let passed = 0;
  let failed = 0;
  
  const middlewarePath = path.join(__dirname, '../product/lead-response/dashboard/middleware.ts');
  
  // Test 1: middleware.ts exists
  try {
    console.log('Test 1: Verify middleware.ts exists');
    assert.strictEqual(fs.existsSync(middlewarePath), true, 'middleware.ts should exist');
    console.log('  ✅ PASS: middleware.ts exists');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 2: /onboarding is NOT in AUTH_ROUTES
  try {
    console.log('\nTest 2: Verify /onboarding is NOT in AUTH_ROUTES');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Find AUTH_ROUTES array
    const authRoutesMatch = content.match(/const AUTH_ROUTES = \[([\s\S]*?)\]/);
    assert.ok(authRoutesMatch, 'Should find AUTH_ROUTES array definition');
    
    const authRoutesContent = authRoutesMatch[1];
    
    // Check that /onboarding is NOT in the array
    assert.ok(!authRoutesContent.includes("'/onboarding'"), 
      'AUTH_ROUTES should NOT contain /onboarding');
    assert.ok(!authRoutesContent.includes('"/onboarding"'), 
      'AUTH_ROUTES should NOT contain /onboarding (double quotes)');
    
    console.log('  ✅ PASS: /onboarding is NOT in AUTH_ROUTES');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 3: /login and /signup ARE in AUTH_ROUTES (sanity check)
  try {
    console.log('\nTest 3: Verify /login and /signup ARE in AUTH_ROUTES (sanity check)');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    const authRoutesMatch = content.match(/const AUTH_ROUTES = \[([\s\S]*?)\]/);
    const authRoutesContent = authRoutesMatch[1];
    
    assert.ok(authRoutesContent.includes("'/login'"), 'AUTH_ROUTES should contain /login');
    assert.ok(authRoutesContent.includes("'/signup'"), 'AUTH_ROUTES should contain /signup');
    
    console.log('  ✅ PASS: /login and /signup are in AUTH_ROUTES');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 4: Comment clarifies /onboarding and /setup are intentionally excluded
  try {
    console.log('\nTest 4: Verify comment mentions both /onboarding and /setup');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Find the comment before AUTH_ROUTES
    const commentMatch = content.match(/\/\/ Routes that should redirect[\s\S]*?const AUTH_ROUTES/);
    assert.ok(commentMatch, 'Should find comment before AUTH_ROUTES');
    
    const commentContent = commentMatch[0];
    
    // Comment should mention /onboarding
    assert.ok(commentContent.includes('/onboarding'), 
      'Comment should mention /onboarding as intentionally excluded');
    
    // Comment should mention /setup
    assert.ok(commentContent.includes('/setup'), 
      'Comment should mention /setup as intentionally excluded');
    
    // Comment should say "intentionally NOT here" or similar
    assert.ok(commentContent.includes('intentionally') || commentContent.includes('intentionally NOT'), 
      'Comment should indicate intentional exclusion');
    
    console.log('  ✅ PASS: Comment clarifies /onboarding and /setup are intentionally excluded');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 5: Verify the middleware logic doesn't hardcode /onboarding check
  try {
    console.log('\nTest 5: Verify no hardcoded /onboarding redirect for authenticated users');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Should NOT have any logic that redirects authenticated users away from /onboarding
    // Look for patterns like: if (pathname === '/onboarding' && isAuthenticated)
    const lines = content.split('\n');
    let hasBadLogic = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (line.trim().startsWith('//')) continue;
      
      // Check for patterns that would block /onboarding for authenticated users
      if (line.includes("'/onboarding'") || line.includes('"/onboarding"')) {
        // If /onboarding is mentioned, make sure it's not in a redirect/block context
        if (line.includes('redirect') || line.includes('NextResponse.redirect')) {
          hasBadLogic = true;
          console.log(`    Found suspicious line ${i + 1}: ${line.trim()}`);
        }
      }
    }
    
    assert.ok(!hasBadLogic, 'Should not have hardcoded /onboarding redirect logic');
    
    console.log('  ✅ PASS: No hardcoded /onboarding redirect for authenticated users');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 6: Verify isAuthRoute check uses AUTH_ROUTES array (not hardcoded)
  try {
    console.log('\nTest 6: Verify isAuthRoute uses AUTH_ROUTES array (not hardcoded values)');
    const content = fs.readFileSync(middlewarePath, 'utf8');
    
    // Should use AUTH_ROUTES.some() to check
    assert.ok(content.includes('AUTH_ROUTES.some'), 
      'Should use AUTH_ROUTES.some() to check auth routes');
    
    // The redirect logic should reference isAuthRoute, not hardcoded paths
    assert.ok(content.includes('isAuthRoute && isAuthenticated'), 
      'Should check isAuthRoute && isAuthenticated for redirect logic');
    
    console.log('  ✅ PASS: isAuthRoute check uses AUTH_ROUTES array');
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
    console.log('\n✅ /onboarding is correctly excluded from AUTH_ROUTES:');
    console.log('   - Authenticated users CAN access /onboarding');
    console.log('   - /onboarding is NOT in AUTH_ROUTES array');
    console.log('   - Comment clarifies intentional exclusion');
    process.exit(0);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
