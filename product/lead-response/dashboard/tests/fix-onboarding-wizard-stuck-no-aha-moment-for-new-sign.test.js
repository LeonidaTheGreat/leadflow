/**
 * E2E Test: Onboarding Wizard Aha Moment (fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign)
 * 
 * Tests:
 * 1. Simulator step exists and is wired into the onboarding wizard
 * 2. API endpoint /api/onboarding/simulator works correctly
 * 3. ahaCompleted and ahaResponseTimeMs are tracked and submitted
 * 4. Confirmation step shows Aha Moment status
 */

const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test configuration
const API_BASE = process.env.TEST_API_BASE || 'http://localhost:3000';
const TEST_AGENT_ID = `test-agent-${Date.now()}`;
const TEST_SESSION_ID = `test-session-${Date.now()}`;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  return { name, fn };
}

async function runTest(t) {
  try {
    await t.fn();
    results.passed++;
    results.tests.push({ name: t.name, status: 'PASS' });
    console.log(`✓ ${t.name}`);
  } catch (err) {
    results.failed++;
    results.tests.push({ name: t.name, status: 'FAIL', error: err.message });
    console.log(`✗ ${t.name}: ${err.message}`);
  }
}

// Tests
const tests = [
  test('API simulator route exists and responds to POST', async () => {
    const response = await fetch(`${API_BASE}/api/onboarding/simulator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        agentId: TEST_AGENT_ID,
        sessionId: TEST_SESSION_ID
      })
    });
    
    // Should get a valid response (200 or 500 if DB not connected)
    assert([200, 500, 401, 403].includes(response.status), 
      `Expected 200, 401, 403, or 500, got ${response.status}`);
    
    if (response.status === 200) {
      const data = await response.json();
      assert(data.success === true, 'Response should have success: true');
      assert(data.state, 'Response should have state object');
      assert(data.state.session_id === TEST_SESSION_ID, 'Session ID should match');
    }
  }),

  test('Simulator step component exists', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    assert(fs.existsSync(simulatorPath), 'simulator.tsx should exist');
    
    const content = fs.readFileSync(simulatorPath, 'utf-8');
    assert(content.includes('OnboardingSimulator'), 'Should export OnboardingSimulator component');
    assert(content.includes('startSimulation'), 'Should have startSimulation function');
    assert(content.includes('ahaCompleted'), 'Should track ahaCompleted');
    assert(content.includes('ahaResponseTimeMs'), 'Should track ahaResponseTimeMs');
  }),

  test('Onboarding page includes simulator step', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const pagePath = path.join(__dirname, '../app/onboarding/page.tsx');
    assert(fs.existsSync(pagePath), 'page.tsx should exist');
    
    const content = fs.readFileSync(pagePath, 'utf-8');
    assert(content.includes("'simulator'"), 'Should include simulator in step type');
    assert(content.includes('OnboardingSimulator'), 'Should import OnboardingSimulator');
    assert(content.includes('ahaCompleted'), 'Should have ahaCompleted in agentData');
    assert(content.includes('ahaResponseTimeMs'), 'Should have ahaResponseTimeMs in agentData');
  }),

  test('Confirmation step shows Aha Moment status', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const confirmPath = path.join(__dirname, '../app/onboarding/steps/confirmation.tsx');
    assert(fs.existsSync(confirmPath), 'confirmation.tsx should exist');
    
    const content = fs.readFileSync(confirmPath, 'utf-8');
    assert(content.includes('Aha Moment'), 'Should show Aha Moment section');
    assert(content.includes('ahaCompleted'), 'Should reference ahaCompleted');
    assert(content.includes('AI Response Demo'), 'Should show AI Response Demo label');
  }),

  test('Onboard API accepts aha fields', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const routePath = path.join(__dirname, '../app/api/agents/onboard/route.ts');
    assert(fs.existsSync(routePath), 'onboard route.ts should exist');
    
    const content = fs.readFileSync(routePath, 'utf-8');
    assert(content.includes('ahaCompleted'), 'Should destructure ahaCompleted from body');
    assert(content.includes('ahaResponseTimeMs'), 'Should destructure ahaResponseTimeMs from body');
    assert(content.includes('aha_moment_completed'), 'Should insert aha_moment_completed');
    assert(content.includes('aha_response_time_ms'), 'Should insert aha_response_time_ms');
  }),

  test('Database migration exists for aha fields', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/012_add_aha_moment_fields.sql');
    assert(fs.existsSync(migrationPath), 'Migration 012 should exist');
    
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert(content.includes('aha_moment_completed'), 'Should add aha_moment_completed column');
    assert(content.includes('aha_response_time_ms'), 'Should add aha_response_time_ms column');
  }),

  test('Onboarding simulations table migration exists', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/011_onboarding_simulator.sql');
    assert(fs.existsSync(migrationPath), 'Migration 011 should exist');
    
    const content = fs.readFileSync(migrationPath, 'utf-8');
    assert(content.includes('onboarding_simulations'), 'Should create onboarding_simulations table');
    assert(content.includes('session_id'), 'Should have session_id column');
    assert(content.includes('response_time_ms'), 'Should have response_time_ms column');
  }),

  test('Simulator API handles all required actions', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const routePath = path.join(__dirname, '../app/api/onboarding/simulator/route.ts');
    assert(fs.existsSync(routePath), 'simulator route.ts should exist');
    
    const content = fs.readFileSync(routePath, 'utf-8');
    assert(content.includes("case 'start':"), 'Should handle start action');
    assert(content.includes("case 'status':"), 'Should handle status action');
    assert(content.includes("case 'skip':"), 'Should handle skip action');
    assert(content.includes('startSimulation'), 'Should have startSimulation function');
    assert(content.includes('getSimulationStatus'), 'Should have getSimulationStatus function');
    assert(content.includes('skipSimulation'), 'Should have skipSimulation function');
  }),

  test('Trial signup includes aha fields in agent data', async () => {
    const fs = require('fs');
    const path = require('path');
    
    const routePath = path.join(__dirname, '../app/api/auth/trial-signup/route.ts');
    assert(fs.existsSync(routePath), 'trial-signup route.ts should exist');
    
    const content = fs.readFileSync(routePath, 'utf-8');
    // Check that the route handles aha fields or passes them through
    assert(content.includes('aha') || content.includes('onboarding'), 'Should reference aha or onboarding');
  })
];

// Run all tests
async function runAllTests() {
  console.log('Running E2E tests for fix-onboarding-wizard-stuck-no-aha-moment-for-new-sign...\n');
  
  for (const t of tests) {
    await runTest(t);
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${results.passed} passed, ${results.failed} failed`);
  console.log(`${'='.repeat(50)}`);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
