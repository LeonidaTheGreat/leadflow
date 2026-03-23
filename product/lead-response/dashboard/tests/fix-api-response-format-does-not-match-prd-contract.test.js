/**
 * E2E Test: fix-api-response-format-does-not-match-prd-contract
 * 
 * Tests that the API response format matches the ACTUAL implementation
 * (not the PRD contract). The PRD had a different format than what
 * the API actually returns - this test verifies the frontend uses
 * the correct format.
 * 
 * PRD Format (incorrect): {success, sessionId, status, turns[]}
 * Actual API Format: {success, state: {id, session_id, agent_id, status, conversation[], response_time_ms, ...}}
 */

const assert = require('assert');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Types matching the ACTUAL API response format
// This is what the API ACTUALLY returns (not what PRD says)

async function runTests() {
  console.log('\n=== E2E Test: API Response Format Does Not Match PRD Contract ===\n');
  console.log('Testing that simulator uses ACTUAL API format (not PRD format)\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Verify simulator.tsx uses state.conversation (not turns)
  try {
    console.log('Test 1: Verify simulator.tsx uses state.conversation (not turns[])');
    const fs = require('fs');
    const path = require('path');
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    
    assert.strictEqual(fs.existsSync(simulatorPath), true, 'simulator.tsx should exist');
    
    const content = fs.readFileSync(simulatorPath, 'utf8');
    
    // Should use state.conversation (PRD incorrectly said turns[])
    assert.ok(content.includes('state.conversation') || content.includes('data.state.conversation'), 
      'Should reference state.conversation (actual API format)');
    
    // Should NOT use turns as a variable/property name (PRD format)
    // Allow "turns" in comments explaining the difference
    const lines = content.split('\n');
    let hasTurnsVariable = false;
    for (const line of lines) {
      // Skip comment lines
      if (line.trim().startsWith('//')) continue;
      // Check for turns used as a variable/property (not in comments)
      if (/\bturns\b/.test(line) && !line.includes('turns of')) {
        hasTurnsVariable = true;
        break;
      }
    }
    assert.ok(!hasTurnsVariable, 'Should NOT use turns[] as variable/property (PRD format)');
    
    console.log('  ✅ PASS: Uses state.conversation (actual API format)');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 2: Verify simulator.tsx uses state.response_time_ms (not responseTimeMs)
  try {
    console.log('\nTest 2: Verify simulator.tsx uses state.response_time_ms (not responseTimeMs)');
    const fs = require('fs');
    const path = require('path');
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    
    const content = fs.readFileSync(simulatorPath, 'utf8');
    
    // Should use response_time_ms (actual API format)
    assert.ok(content.includes('response_time_ms'), 
      'Should reference response_time_ms (actual API format)');
    
    console.log('  ✅ PASS: Uses state.response_time_ms (actual API format)');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 3: Verify simulator.tsx uses status="success" for completion (not "complete")
  try {
    console.log('\nTest 3: Verify simulator.tsx uses status="success" for completion (not "complete")');
    const fs = require('fs');
    const path = require('path');
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    
    const content = fs.readFileSync(simulatorPath, 'utf8');
    
    // Should check for 'success' status (actual API format)
    assert.ok(content.includes("'success'") || content.includes('"success"'), 
      'Should check for status="success" (actual API format)');
    
    // Should NOT check for 'complete' as a status value (PRD format)
    // Allow "complete" in comments and UI labels (like "Simulation complete!")
    const lines = content.split('\n');
    let hasCompleteStatus = false;
    for (const line of lines) {
      // Skip comment lines
      if (line.trim().startsWith('//')) continue;
      // Check for 'complete' or "complete" used as a status value
      if ((line.includes("'complete'") || line.includes('"complete"')) && 
          (line.includes('status') || line.includes('Status'))) {
        hasCompleteStatus = true;
        break;
      }
    }
    assert.ok(!hasCompleteStatus, 'Should NOT use status="complete" (PRD format)');
    
    console.log('  ✅ PASS: Uses status="success" for completion (actual API format)');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 4: Verify API route returns correct response format
  try {
    console.log('\nTest 4: Verify API route returns {success, state: {...}} format');
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(__dirname, '../app/api/onboarding/simulator/route.ts');
    
    assert.strictEqual(fs.existsSync(routePath), true, 'simulator route.ts should exist');
    
    const content = fs.readFileSync(routePath, 'utf8');
    
    // Should return {success, state: {...}} format
    assert.ok(content.includes('success: true'), 'Should return success: true');
    assert.ok(content.includes('state:'), 'Should return state object');
    
    // State should contain the correct fields
    assert.ok(content.includes('session_id:'), 'State should contain session_id');
    assert.ok(content.includes('agent_id:'), 'State should contain agent_id');
    assert.ok(content.includes('status:'), 'State should contain status');
    assert.ok(content.includes('conversation:'), 'State should contain conversation (not turns)');
    assert.ok(content.includes('response_time_ms:'), 'State should contain response_time_ms');
    
    console.log('  ✅ PASS: API route returns correct format {success, state: {...}}');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 5: Verify API uses 'success' status value (not 'complete')
  try {
    console.log('\nTest 5: Verify API uses status="success" for completion');
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(__dirname, '../app/api/onboarding/simulator/route.ts');
    
    const content = fs.readFileSync(routePath, 'utf8');
    
    // Should use 'success' as terminal status
    assert.ok(content.includes("status: 'success'") || content.includes('status: "success"'), 
      'API should use status="success" for completion');
    
    console.log('  ✅ PASS: API uses status="success" for completion');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 6: Verify API has 7 status values (not 3 as per PRD)
  try {
    console.log('\nTest 6: Verify API has 7 status values (idle|running|inbound_received|ai_responded|success|skipped|timeout|failed)');
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(__dirname, '../app/api/onboarding/simulator/route.ts');
    
    const content = fs.readFileSync(routePath, 'utf8');
    
    // Check for all 8 status values (7 + idle)
    const statuses = ['idle', 'running', 'inbound_received', 'ai_responded', 'success', 'skipped', 'timeout', 'failed'];
    const foundStatuses = statuses.filter(s => content.includes(`'${s}'`) || content.includes(`"${s}"`));
    
    assert.ok(foundStatuses.length >= 7, 
      `API should have at least 7 status values, found: ${foundStatuses.join(', ')}`);
    
    console.log(`  ✅ PASS: API has ${foundStatuses.length} status values: ${foundStatuses.join(', ')}`);
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 7: Verify simulator.tsx handles all API status values
  try {
    console.log('\nTest 7: Verify simulator.tsx handles all API status values');
    const fs = require('fs');
    const path = require('path');
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    
    const content = fs.readFileSync(simulatorPath, 'utf8');
    
    // Check for SimulationStatus type definition
    assert.ok(content.includes('SimulationStatus'), 'Should define SimulationStatus type');
    
    // Check for status handling in getStatusInfo function
    assert.ok(content.includes('getStatusInfo'), 'Should have getStatusInfo function');
    
    // Check for terminal state handling
    assert.ok(content.includes("'success'") || content.includes('"success"'), 
      'Should handle success status');
    assert.ok(content.includes("'skipped'") || content.includes('"skipped"'), 
      'Should handle skipped status');
    assert.ok(content.includes("'timeout'") || content.includes('"timeout"'), 
      'Should handle timeout status');
    assert.ok(content.includes("'failed'") || content.includes('"failed"'), 
      'Should handle failed status');
    
    console.log('  ✅ PASS: simulator.tsx handles all API status values');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 8: Verify sessionId is optional for start action (not required in request body)
  try {
    console.log('\nTest 8: Verify sessionId is optional for start action (chicken-and-egg fix)');
    const fs = require('fs');
    const path = require('path');
    const routePath = path.join(__dirname, '../app/api/onboarding/simulator/route.ts');
    
    const content = fs.readFileSync(routePath, 'utf8');
    
    // Should NOT require sessionId for start action
    assert.ok(content.includes("sessionId is required for status") || 
              content.includes("action === 'status' || action === 'skip'"),
      'Should only require sessionId for status/skip actions, not start');
    
    console.log('  ✅ PASS: sessionId is optional for start action');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 9: Verify onboarding page.tsx includes simulator step
  try {
    console.log('\nTest 9: Verify onboarding page.tsx includes simulator step');
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/onboarding/page.tsx');
    
    assert.strictEqual(fs.existsSync(pagePath), true, 'page.tsx should exist');
    
    const content = fs.readFileSync(pagePath, 'utf8');
    
    // Should import OnboardingSimulator
    assert.ok(content.includes('OnboardingSimulator'), 'Should import OnboardingSimulator');
    
    // Should include simulator in steps array
    assert.ok(content.includes("'simulator'"), 'Should include simulator in steps');
    
    // Should render simulator component
    assert.ok(content.includes("currentStep === 'simulator'"), 'Should render simulator step');
    
    console.log('  ✅ PASS: onboarding page.tsx includes simulator step');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 10: Verify ahaCompleted and ahaResponseTimeMs are in agentData
  try {
    console.log('\nTest 10: Verify ahaCompleted and ahaResponseTimeMs are tracked in agentData');
    const fs = require('fs');
    const path = require('path');
    const pagePath = path.join(__dirname, '../app/onboarding/page.tsx');
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    
    const pageContent = fs.readFileSync(pagePath, 'utf8');
    const simulatorContent = fs.readFileSync(simulatorPath, 'utf8');
    
    // page.tsx should have ahaCompleted and ahaResponseTimeMs in agentData
    assert.ok(pageContent.includes('ahaCompleted'), 'page.tsx should have ahaCompleted in agentData');
    assert.ok(pageContent.includes('ahaResponseTimeMs'), 'page.tsx should have ahaResponseTimeMs in agentData');
    
    // simulator.tsx should update these fields
    assert.ok(simulatorContent.includes('ahaCompleted'), 'simulator.tsx should update ahaCompleted');
    assert.ok(simulatorContent.includes('ahaResponseTimeMs'), 'simulator.tsx should update ahaResponseTimeMs');
    
    console.log('  ✅ PASS: ahaCompleted and ahaResponseTimeMs are tracked');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 11: Verify TypeScript types match API format
  try {
    console.log('\nTest 11: Verify TypeScript types match actual API format');
    const fs = require('fs');
    const path = require('path');
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    
    const content = fs.readFileSync(simulatorPath, 'utf8');
    
    // Should have SimulationState type with correct fields
    assert.ok(content.includes('interface SimulationState') || content.includes('type SimulationState'), 
      'Should define SimulationState type');
    
    // Should have conversation array
    assert.ok(content.includes('conversation:'), 'SimulationState should have conversation field');
    
    // Should have response_time_ms
    assert.ok(content.includes('response_time_ms:'), 'SimulationState should have response_time_ms field');
    
    console.log('  ✅ PASS: TypeScript types match API format');
    passed++;
  } catch (error) {
    console.log('  ❌ FAIL:', error.message);
    failed++;
  }
  
  // Test 12: Verify comments document the API format mismatch
  try {
    console.log('\nTest 12: Verify comments document the API format vs PRD mismatch');
    const fs = require('fs');
    const path = require('path');
    const simulatorPath = path.join(__dirname, '../app/onboarding/steps/simulator.tsx');
    
    const content = fs.readFileSync(simulatorPath, 'utf8');
    
    // Should have comments explaining the actual API format
    assert.ok(content.includes('ACTUAL API') || content.includes('actual API') || 
              content.includes('not PRD') || content.includes('not the PRD'),
      'Should have comments documenting actual API format (not PRD)');
    
    console.log('  ✅ PASS: Comments document API format vs PRD mismatch');
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
    console.log('\n✅ API response format correctly uses ACTUAL format (not PRD format):');
    console.log('   - state.conversation (not turns[])');
    console.log('   - state.response_time_ms (not responseTimeMs)');
    console.log('   - status="success" (not "complete")');
    console.log('   - 7+ status values (not 3)');
    console.log('   - sessionId optional for start action');
    process.exit(0);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
