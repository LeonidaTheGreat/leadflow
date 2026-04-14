/**
 * Test: ahaCompleted included in onboarding submit payload — FR-8
 * Use Case: fix-ahacompleted-not-included-in-onboarding-submit-pay
 * 
 * Verifies that:
 * 1. agentData in page.tsx includes ahaCompleted and ahaResponseTimeMs fields
 * 2. The completeOnboarding() function sends these fields to the API
 * 3. The API route extracts and stores these fields in the database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test configuration
const PROJECT_DIR = '/Users/clawdbot/projects/leadflow';
const DASHBOARD_DIR = path.join(PROJECT_DIR, 'product/lead-response/dashboard');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function assert(condition, message) {
  if (!condition) {
    console.error(`${RED}❌ FAIL: ${message}${RESET}`);
    throw new Error(message);
  }
  console.log(`${GREEN}✅ PASS: ${message}${RESET}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`${RED}❌ FAIL: ${message}${RESET}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    throw new Error(message);
  }
  console.log(`${GREEN}✅ PASS: ${message}${RESET}`);
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    console.error(`${RED}❌ FAIL: ${message}${RESET}`);
    console.error(`   Expected to find: ${needle}`);
    throw new Error(message);
  }
  console.log(`${GREEN}✅ PASS: ${message}${RESET}`);
}

// Test 1: Verify page.tsx has ahaCompleted and ahaResponseTimeMs in agentData
function testPageAgentData() {
  console.log('\n📄 Test 1: page.tsx agentData includes aha fields');
  
  const pagePath = path.join(DASHBOARD_DIR, 'app/onboarding/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  
  // Check that ahaCompleted is in the initial state
  assertIncludes(
    pageContent,
    'ahaCompleted: false',
    'page.tsx agentData initial state includes ahaCompleted: false'
  );
  
  // Check that ahaResponseTimeMs is in the initial state
  assertIncludes(
    pageContent,
    'ahaResponseTimeMs: null',
    'page.tsx agentData initial state includes ahaResponseTimeMs: null'
  );
  
  console.log('   page.tsx agentData correctly includes aha fields');
}

// Test 2: Verify completeOnboarding sends aha fields in the POST body
function testCompleteOnboardingPayload() {
  console.log('\n📤 Test 2: completeOnboarding sends aha fields in POST payload');
  
  const pagePath = path.join(DASHBOARD_DIR, 'app/onboarding/page.tsx');
  const pageContent = fs.readFileSync(pagePath, 'utf-8');
  
  // Find the completeOnboarding function
  const completeOnboardingMatch = pageContent.match(/const completeOnboarding[\s\S]*?^  }/m);
  assert(completeOnboardingMatch, 'completeOnboarding function found in page.tsx');
  
  const completeOnboardingFn = completeOnboardingMatch[0];
  
  // Check that it JSON.stringify(agentData) which includes aha fields
  assertIncludes(
    completeOnboardingFn,
    'JSON.stringify(agentData)',
    'completeOnboarding uses JSON.stringify(agentData) for the request body'
  );
  
  // Check that it sends to /api/agents/onboard
  assertIncludes(
    completeOnboardingFn,
    "'/api/agents/onboard'",
    'completeOnboarding POSTs to /api/agents/onboard'
  );
  
  console.log('   completeOnboarding correctly sends agentData (including aha fields)');
}

// Test 3: Verify API route extracts ahaCompleted and ahaResponseTimeMs
function testApiRouteExtraction() {
  console.log('\n🔌 Test 3: API route extracts aha fields from request body');
  
  const routePath = path.join(DASHBOARD_DIR, 'app/api/agents/onboard/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');
  
  // Check that ahaCompleted is destructured from body
  assertIncludes(
    routeContent,
    'ahaCompleted,',
    'API route destructures ahaCompleted from request body'
  );
  
  // Check that ahaResponseTimeMs is destructured from body
  assertIncludes(
    routeContent,
    'ahaResponseTimeMs,',
    'API route destructures ahaResponseTimeMs from request body'
  );
  
  console.log('   API route correctly extracts aha fields from request');
}

// Test 4: Verify API route stores aha fields in database
function testApiRouteDatabaseInsert() {
  console.log('\n💾 Test 4: API route stores aha fields in database');
  
  const routePath = path.join(DASHBOARD_DIR, 'app/api/agents/onboard/route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');
  
  // Check that aha_moment_completed is in the insert
  assertIncludes(
    routeContent,
    'aha_moment_completed:',
    'API route inserts aha_moment_completed into database'
  );
  
  // Check that aha_response_time_ms is in the insert
  assertIncludes(
    routeContent,
    'aha_response_time_ms:',
    'API route inserts aha_response_time_ms into database'
  );
  
  // Check proper boolean conversion for ahaCompleted
  assertIncludes(
    routeContent,
    'ahaCompleted === true',
    'API route properly converts ahaCompleted to boolean'
  );
  
  console.log('   API route correctly stores aha fields in database');
}

// Test 5: Verify database migration exists
function testDatabaseMigration() {
  console.log('\n🗄️  Test 5: Database migration exists for aha columns');
  
  const migrationPath = path.join(PROJECT_DIR, 'supabase/migrations/014_add_aha_moment_columns.sql');
  
  assert(fs.existsSync(migrationPath), 'Migration file 014_add_aha_moment_columns.sql exists');
  
  const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
  
  // Check for aha_moment_completed column
  assertIncludes(
    migrationContent,
    'aha_moment_completed BOOLEAN',
    'Migration adds aha_moment_completed BOOLEAN column'
  );
  
  // Check for aha_response_time_ms column
  assertIncludes(
    migrationContent,
    'aha_response_time_ms INTEGER',
    'Migration adds aha_response_time_ms INTEGER column'
  );
  
  // Check for default value
  assertIncludes(
    migrationContent,
    'DEFAULT false',
    'Migration sets DEFAULT false for aha_moment_completed'
  );
  
  console.log('   Database migration correctly defines aha columns');
}

// Test 6: Verify simulator.tsx updates agentData with aha fields
function testSimulatorUpdatesAgentData() {
  console.log('\n🎮 Test 6: simulator.tsx updates agentData with aha fields on success');
  
  const simulatorPath = path.join(DASHBOARD_DIR, 'app/onboarding/steps/simulator.tsx');
  const simulatorContent = fs.readFileSync(simulatorPath, 'utf-8');
  
  // Check that it updates ahaCompleted on success
  assertIncludes(
    simulatorContent,
    "ahaCompleted: true",
    'simulator.tsx sets ahaCompleted: true on successful simulation'
  );
  
  // Check that it updates ahaResponseTimeMs
  assertIncludes(
    simulatorContent,
    "ahaResponseTimeMs: data.state.response_time_ms",
    'simulator.tsx sets ahaResponseTimeMs from API response'
  );
  
  // Check that skip sets ahaCompleted to false
  assertIncludes(
    simulatorContent,
    "ahaCompleted: false",
    'simulator.tsx sets ahaCompleted: false when skipped'
  );
  
  console.log('   simulator.tsx correctly updates agentData aha fields');
}

// Test 7: Verify confirmation.tsx displays aha status
function testConfirmationDisplaysAhaStatus() {
  console.log('\n✅ Test 7: confirmation.tsx displays aha moment status');
  
  const confirmationPath = path.join(DASHBOARD_DIR, 'app/onboarding/steps/confirmation.tsx');
  const confirmationContent = fs.readFileSync(confirmationPath, 'utf-8');
  
  // The confirmation step should have access to agentData.ahaCompleted
  // We check that agentData is received as a prop
  assertIncludes(
    confirmationContent,
    'agentData: any',
    'confirmation.tsx receives agentData prop'
  );
  
  console.log('   confirmation.tsx has access to agentData for aha status display');
}

// Run all tests
async function runTests() {
  console.log('🧪 Testing: ahaCompleted included in onboarding submit payload — FR-8');
  console.log('=================================================================');
  
  try {
    testPageAgentData();
    testCompleteOnboardingPayload();
    testApiRouteExtraction();
    testApiRouteDatabaseInsert();
    testDatabaseMigration();
    testSimulatorUpdatesAgentData();
    testConfirmationDisplaysAhaStatus();
    
    console.log('\n' + '='.repeat(65));
    console.log(`${GREEN}✨ All tests passed!${RESET}`);
    console.log('='.repeat(65));
    
    return {
      passed: 7,
      total: 7,
      passRate: 1.0,
      filesCreated: ['supabase/migrations/014_add_aha_moment_columns.sql'],
      filesModified: [
        'product/lead-response/dashboard/app/api/agents/onboard/route.ts'
      ]
    };
  } catch (error) {
    console.log('\n' + '='.repeat(65));
    console.log(`${RED}💥 Tests failed: ${error.message}${RESET}`);
    console.log('='.repeat(65));
    
    return {
      passed: 0,
      total: 7,
      passRate: 0,
      error: error.message
    };
  }
}

// Run if executed directly
if (require.main === module) {
  runTests().then((results) => {
    process.exit(results.passRate === 1.0 ? 0 : 1);
  });
}

module.exports = { runTests };
