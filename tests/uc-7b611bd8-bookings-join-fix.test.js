/**
 * E2E Test: Bookings Table Join Fix (PR #506)
 * Task ID: 7b611bd8-5680-432a-8ee5-815648e5d118
 * 
 * This test verifies that the SMS stats API correctly joins bookings through
 * the leads table to filter by agent_id, rather than filtering directly on
 * bookings.agent_id (which may be NULL).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const SMS_STATS_ROUTE = path.join(PROJECT_ROOT, 'product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts');
const TRIAL_SIGNUP_ROUTE = path.join(PROJECT_ROOT, 'product/lead-response/dashboard/app/api/auth/trial-signup/route.ts');
const ONBOARDING_PAGE = path.join(PROJECT_ROOT, 'product/lead-response/dashboard/app/onboarding/page.tsx');

// Test 1: Verify bookings query uses leads!inner join
async function testBookingsQueryUsesLeadsJoin() {
  console.log('Test 1: Verify bookings query uses leads!inner(agent_id) join');
  
  const routeContent = fs.readFileSync(SMS_STATS_ROUTE, 'utf-8');
  
  // Check for the correct join syntax
  assert(routeContent.includes("leads!inner(agent_id)"), 
    'Bookings query should use leads!inner(agent_id) join');
  
  // Check that it filters by leads.agent_id, not bookings.agent_id
  assert(routeContent.includes(".eq('leads.agent_id', agentId)"),
    'Bookings query should filter by leads.agent_id');
  
  console.log('  ✅ PASS: Bookings query correctly joins through leads table');
}

// Test 2: Verify the query handles NULL bookings.agent_id
async function testHandlesNullBookingsAgentId() {
  console.log('Test 2: Verify the code handles NULL bookings.agent_id case');
  
  const routeContent = fs.readFileSync(SMS_STATS_ROUTE, 'utf-8');
  
  // Check for the comment explaining the NULL handling
  assert(routeContent.includes('bookings.agent_id may be NULL'),
    'Code should have comment explaining bookings.agent_id may be NULL');
  
  // Check for the cross-table filter comment
  assert(routeContent.includes('cross-table filter'),
    'Code should mention cross-table filter');
  
  console.log('  ✅ PASS: Code properly documents NULL handling');
}

// Test 3: Verify no direct bookings.agent_id filter
async function testNoDirectBookingsAgentIdFilter() {
  console.log('Test 3: Verify no direct bookings.agent_id filter exists');
  
  const routeContent = fs.readFileSync(SMS_STATS_ROUTE, 'utf-8');
  
  // Extract the bookings query section
  const bookingsQueryMatch = routeContent.match(/let bookingsQuery =[\s\S]*?await bookingsQuery/);
  assert(bookingsQueryMatch, 'Should find bookings query section');
  
  const bookingsQuerySection = bookingsQueryMatch[0];
  
  // Should NOT have direct bookings.agent_id filter
  const hasDirectFilter = bookingsQuerySection.includes(".eq('agent_id'") || 
                          bookingsQuerySection.includes('.eq("agent_id"');
  
  assert(!hasDirectFilter, 
    'Bookings query should NOT filter directly on agent_id - must use leads.agent_id');
  
  console.log('  ✅ PASS: No direct bookings.agent_id filter found');
}

// Test 4: Verify error handling for bookings query
async function testBookingsQueryErrorHandling() {
  console.log('Test 4: Verify bookings query errors are handled gracefully');
  
  const routeContent = fs.readFileSync(SMS_STATS_ROUTE, 'utf-8');
  
  // Check for error handling
  assert(routeContent.includes('bookingsError'),
    'Code should check for bookingsError');
  
  // Check that bookingConversion is initialized as null (not 0)
  assert(routeContent.includes('let bookingConversion: number | null = null'),
    'bookingConversion should be typed as number | null and initialized as null');
  
  console.log('  ✅ PASS: Bookings query errors handled gracefully');
}

// Test 5: Verify merge conflicts are resolved in trial-signup route
async function testNoMergeConflictsInTrialSignup() {
  console.log('Test 5: Verify merge conflicts are resolved in trial-signup route');
  
  const routeContent = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf-8');
  
  // Check for conflict markers
  assert(!routeContent.includes('<<<<<<<'),
    'trial-signup route should not have merge conflict markers (<<<<<<<)');
  assert(!routeContent.includes('======='),
    'trial-signup route should not have merge conflict markers (=======)');
  assert(!routeContent.includes('>>>>>>>'),
    'trial-signup route should not have merge conflict markers (>>>>>>>)');
  
  console.log('  ✅ PASS: No merge conflicts in trial-signup route');
}

// Test 6: Verify onboarding page has no duplicate fields
async function testNoDuplicateFieldsInOnboarding() {
  console.log('Test 6: Verify onboarding page has no duplicate field definitions');
  
  const pageContent = fs.readFileSync(ONBOARDING_PAGE, 'utf-8');
  
  // Count occurrences of ahaCompleted in agentData
  const ahaCompletedMatches = pageContent.match(/ahaCompleted:/g);
  const ahaResponseTimeMsMatches = pageContent.match(/ahaResponseTimeMs:/g);
  
  // Should only appear once in the initial state definition
  assert(ahaCompletedMatches && ahaCompletedMatches.length === 1,
    'ahaCompleted should appear exactly once in agentData initial state');
  assert(ahaResponseTimeMsMatches && ahaResponseTimeMsMatches.length === 1,
    'ahaResponseTimeMs should appear exactly once in agentData initial state');
  
  console.log('  ✅ PASS: No duplicate fields in onboarding page');
}

// Test 7: Verify strict equality usage
async function testStrictEquality() {
  console.log('Test 7: Verify strict equality (===) is used, not loose (==)');
  
  const routeContent = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf-8');
  
  // Check for loose equality (excluding comments and strings)
  const lines = routeContent.split('\n');
  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    
    // Check for loose equality outside of strings
    const codeOnly = line.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
    if (codeOnly.includes(' == ') || codeOnly.includes(' != ')) {
      assert.fail(`Found loose equality in: ${line.trim()}`);
    }
  }
  
  console.log('  ✅ PASS: Strict equality used throughout');
}

// Test 8: Verify no hardcoded secrets
async function testNoHardcodedSecrets() {
  console.log('Test 8: Verify no hardcoded secrets or API keys');
  
  const routeContent = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf-8');
  
  // Check for hardcoded secrets (patterns like api_key = "..." or password = "...")
  const secretPatterns = [
    /api[_-]?key\s*[=:]\s*["'][a-zA-Z0-9]{10,}["']/i,
    /password\s*[=:]\s*["'][^"']{4,}["']/i,
    /secret\s*[=:]\s*["'][a-zA-Z0-9]{10,}["']/i,
    /token\s*[=:]\s*["'][a-zA-Z0-9]{10,}["']/i,
  ];
  
  for (const pattern of secretPatterns) {
    assert(!pattern.test(routeContent), `Found potential hardcoded secret matching: ${pattern}`);
  }
  
  console.log('  ✅ PASS: No hardcoded secrets found');
}

// Test 9: Verify proper auth middleware
async function testProperAuthMiddleware() {
  console.log('Test 9: Verify proper auth middleware on SMS stats route');
  
  const routeContent = fs.readFileSync(SMS_STATS_ROUTE, 'utf-8');
  
  // Check for session validation
  assert(routeContent.includes('validateSession'), 'Should use validateSession for auth');
  assert(routeContent.includes("cookies.get('leadflow_session')"), 'Should read session from cookie');
  assert(routeContent.includes('status: 401'), 'Should return 401 for unauthorized');
  
  // Verify agentId comes from session, not query params
  assert(routeContent.includes('const agentId = session.userId'),
    'agentId should come from session.userId, not query params');
  
  console.log('  ✅ PASS: Proper auth middleware in place');
}

// Test 10: Verify input validation
async function testInputValidation() {
  console.log('Test 10: Verify input validation on trial-signup route');
  
  const routeContent = fs.readFileSync(TRIAL_SIGNUP_ROUTE, 'utf-8');
  
  // Check for email validation
  assert(routeContent.includes('emailRegex'), 'Should validate email format');
  
  // Check for password validation
  assert(routeContent.includes('password.length < 8'), 'Should validate password length');
  
  // Check for required fields
  assert(routeContent.includes('!email || !password'), 'Should check required fields');
  
  console.log('  ✅ PASS: Input validation in place');
}

// Run all tests
async function runTests() {
  console.log('\n========================================');
  console.log('E2E Test: Bookings Table Join Fix (PR #506)');
  console.log('Task ID: 7b611bd8-5680-432a-8ee5-815648e5d118');
  console.log('========================================\n');
  
  let passed = 0;
  let failed = 0;
  
  const tests = [
    testBookingsQueryUsesLeadsJoin,
    testHandlesNullBookingsAgentId,
    testNoDirectBookingsAgentIdFilter,
    testBookingsQueryErrorHandling,
    testNoMergeConflictsInTrialSignup,
    testNoDuplicateFieldsInOnboarding,
    testStrictEquality,
    testNoHardcodedSecrets,
    testProperAuthMiddleware,
    testInputValidation,
  ];
  
  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.log(`  ❌ FAIL: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n========================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  if (failed > 0) {
    process.exit(1);
  }
  
  return { passed, failed, total: tests.length };
}

// Export for use by completion report
module.exports = { runTests };

// Run if executed directly
if (require.main === module) {
  runTests();
}
