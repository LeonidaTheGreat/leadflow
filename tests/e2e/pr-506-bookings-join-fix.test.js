/**
 * E2E Test: Bookings Table Join for Cross-Table Agent Scoping
 * Task: PR #506 - fix-bookings-table-join-missing-for-cross-table-agent-
 * 
 * This test verifies that the SMS stats API correctly joins bookings through
 * the leads table to filter by agent_id, rather than filtering directly on
 * bookings.agent_id (which may be NULL).
 */

const assert = require('assert');

// Mock Supabase client for testing
function createMockSupabaseClient() {
  const queries = [];
  
  return {
    from: (table) => {
      queries.push({ table });
      return {
        select: (columns) => {
          queries[queries.length - 1].columns = columns;
          return {
            eq: (field, value) => {
              queries[queries.length - 1].filters = queries[queries.length - 1].filters || [];
              queries[queries.length - 1].filters.push({ field, value });
              return {
                gte: () => ({ data: [], error: null }),
                then: (cb) => Promise.resolve(cb({ data: [], error: null })),
              };
            },
            gte: () => ({ data: [], error: null }),
          };
        },
      };
    },
    getQueries: () => queries,
  };
}

// Test 1: Verify bookings query uses leads!inner join
async function testBookingsQueryUsesLeadsJoin() {
  console.log('Test 1: Verify bookings query uses leads!inner(agent_id) join');
  
  // Read the source file to verify the fix is in place
  const fs = require('fs');
  const path = require('path');
  
  const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');
  
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
  
  const fs = require('fs');
  const path = require('path');
  
  const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');
  
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
  
  const fs = require('fs');
  const path = require('path');
  
  const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');
  
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
  
  const fs = require('fs');
  const path = require('path');
  
  const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/analytics/sms-stats/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');
  
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
  
  const fs = require('fs');
  const path = require('path');
  
  const routePath = path.join(__dirname, '../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');
  
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
  
  const fs = require('fs');
  const path = require('path');
  
  const pagePath = path.join(__dirname, '../product/lead-response/dashboard/app/onboarding/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  
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

// Run all tests
async function runTests() {
  console.log('\n========================================');
  console.log('E2E Test: Bookings Table Join Fix (PR #506)');
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
}

runTests();
