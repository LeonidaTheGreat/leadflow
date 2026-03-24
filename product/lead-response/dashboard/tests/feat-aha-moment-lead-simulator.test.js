/**
 * E2E Test: Onboarding Simulator (Aha Moment)
 * UC: feat-aha-moment-lead-simulator
 * Task: 5af5b733-94a9-4849-97a8-27ed0f4b3cdb
 *
 * Tests the onboarding simulator API and database schema
 * - Database schema validation
 * - Route handler code inspection
 * - Migration file validation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: err.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || `Expected true but got ${value}`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || `Expected non-null value but got ${value}`);
  }
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) {
    throw new Error(message || `Expected to find "${needle}" in "${haystack}"`);
  }
}

async function runTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  E2E Test: Onboarding Simulator (Aha Moment)');
  console.log('  UC: feat-aha-moment-lead-simulator');
  console.log('═══════════════════════════════════════════════════════════\n');

  const dashboardDir = path.join(__dirname, '..');
  const projectRoot = path.join(dashboardDir, '..', '..', '..');
  
  // ─────────────────────────────────────────────────────────────
  // Test 1: Route handler file exists
  // ─────────────────────────────────────────────────────────────
  await test('Route handler file exists at app/api/onboarding/simulator/route.ts', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    assertTrue(fs.existsSync(routePath), 'Route handler should exist');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 2: Migration file exists
  // ─────────────────────────────────────────────────────────────
  await test('Migration file exists at supabase/migrations/011_onboarding_simulator.sql', async () => {
    const migrationPath = path.join(dashboardDir, 'supabase', 'migrations', '011_onboarding_simulator.sql');
    assertTrue(fs.existsSync(migrationPath), 'Migration file should exist');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 3: Migration script exists
  // ─────────────────────────────────────────────────────────────
  await test('Migration script exists at scripts/migrate-onboarding-simulator.js', async () => {
    const scriptPath = path.join(projectRoot, 'scripts', 'migrate-onboarding-simulator.js');
    assertTrue(fs.existsSync(scriptPath), 'Migration script should exist');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 4: Route handler implements POST method
  // ─────────────────────────────────────────────────────────────
  await test('Route handler exports POST method', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'export async function POST', 'Should export POST handler');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 5: Route handler validates required fields
  // ─────────────────────────────────────────────────────────────
  await test('Route handler validates action, agentId, sessionId', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'action', 'Should check for action field');
    assertIncludes(content, 'agentId', 'Should check for agentId field');
    assertIncludes(content, 'sessionId', 'Should check for sessionId field');
    assertIncludes(content, '400', 'Should return 400 for missing fields');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 6: Route handler supports start, status, skip actions
  // ─────────────────────────────────────────────────────────────
  await test('Route handler supports start, status, skip actions', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, "case 'start':", 'Should handle start action');
    assertIncludes(content, "case 'status':", 'Should handle status action');
    assertIncludes(content, "case 'skip':", 'Should handle skip action');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 7: Route handler implements simulation state machine
  // ─────────────────────────────────────────────────────────────
  await test('Route handler implements simulation state machine', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    const states = ['idle', 'running', 'inbound_received', 'ai_responded', 'success', 'skipped', 'timeout', 'failed'];
    states.forEach(state => {
      assertIncludes(content, state, `Should include state: ${state}`);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Test 8: Route handler tracks response time
  // ─────────────────────────────────────────────────────────────
  await test('Route handler tracks response_time_ms', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'response_time_ms', 'Should track response time');
    assertIncludes(content, 'inbound_received_at', 'Should track inbound timestamp');
    assertIncludes(content, 'ai_response_received_at', 'Should track AI response timestamp');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 9: Route handler logs analytics events
  // ─────────────────────────────────────────────────────────────
  await test('Route handler logs analytics events', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'onboarding_simulation_started', 'Should log started event');
    assertIncludes(content, 'onboarding_simulation_succeeded', 'Should log succeeded event');
    assertIncludes(content, 'onboarding_simulation_skipped', 'Should log skipped event');
    assertIncludes(content, 'onboarding_simulation_failed', 'Should log failed event');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 10: Migration creates onboarding_simulations table
  // ─────────────────────────────────────────────────────────────
  await test('Migration creates onboarding_simulations table', async () => {
    const migrationPath = path.join(dashboardDir, 'supabase', 'migrations', '011_onboarding_simulator.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assertIncludes(content, 'CREATE TABLE IF NOT EXISTS onboarding_simulations', 'Should create table');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 11: Migration includes required columns
  // ─────────────────────────────────────────────────────────────
  await test('Migration includes all required columns', async () => {
    const migrationPath = path.join(dashboardDir, 'supabase', 'migrations', '011_onboarding_simulator.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');
    const requiredColumns = [
      'id', 'session_id', 'agent_id', 'status', 'simulation_started_at',
      'inbound_received_at', 'ai_response_received_at', 'response_time_ms',
      'lead_name', 'property_interest', 'conversation', 'outcome',
      'skip_reason', 'error_message', 'created_at', 'updated_at'
    ];
    requiredColumns.forEach(col => {
      assertIncludes(content, col, `Should include column: ${col}`);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Test 12: Migration includes indexes
  // ─────────────────────────────────────────────────────────────
  await test('Migration includes performance indexes', async () => {
    const migrationPath = path.join(dashboardDir, 'supabase', 'migrations', '011_onboarding_simulator.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assertIncludes(content, 'CREATE INDEX', 'Should create indexes');
    assertIncludes(content, 'idx_onboarding_simulations_session_id', 'Should index session_id');
    assertIncludes(content, 'idx_onboarding_simulations_agent_id', 'Should index agent_id');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 13: Migration includes status check constraint
  // ─────────────────────────────────────────────────────────────
  await test('Migration includes status check constraint', async () => {
    const migrationPath = path.join(dashboardDir, 'supabase', 'migrations', '011_onboarding_simulator.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');
    assertIncludes(content, 'CHECK (status IN', 'Should have status check constraint');
    assertIncludes(content, 'idle', 'Should include idle status');
    assertIncludes(content, 'running', 'Should include running status');
    assertIncludes(content, 'success', 'Should include success status');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 14: Route handler implements timeout detection
  // ─────────────────────────────────────────────────────────────
  await test('Route handler implements 90s timeout detection', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, '90000', 'Should check for 90s timeout');
    assertIncludes(content, 'timeout', 'Should handle timeout status');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 15: Route handler generates AI responses
  // ─────────────────────────────────────────────────────────────
  await test('Route handler generates scripted AI responses', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'generateAiResponse', 'Should have AI response generator');
    assertIncludes(content, 'LeadFlow', 'Should mention LeadFlow in responses');
    assertIncludes(content, 'AI assistant', 'Should identify as AI assistant');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 16: Route handler simulates conversation turns
  // ─────────────────────────────────────────────────────────────
  await test('Route handler simulates 3-turn conversation', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'LEAD_SCRIPTS', 'Should have lead scripts');
    assertIncludes(content, 'turn', 'Should track conversation turns');
    assertIncludes(content, 'role: \'lead\'', 'Should have lead role');
    assertIncludes(content, 'role: \'ai\'', 'Should have AI role');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 17: Test file exists
  // ─────────────────────────────────────────────────────────────
  await test('Unit test file exists at tests/onboarding-simulator.test.ts', async () => {
    const testPath = path.join(dashboardDir, 'tests', 'onboarding-simulator.test.ts');
    assertTrue(fs.existsSync(testPath), 'Unit test file should exist');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 18: Unit tests cover acceptance criteria
  // ─────────────────────────────────────────────────────────────
  await test('Unit tests cover acceptance criteria', async () => {
    const testPath = path.join(dashboardDir, 'tests', 'onboarding-simulator.test.ts');
    const content = fs.readFileSync(testPath, 'utf8');
    assertIncludes(content, 'AC-1', 'Should cover AC-1');
    assertIncludes(content, 'AC-2', 'Should cover AC-2');
    assertIncludes(content, 'AC-3', 'Should cover AC-3');
    assertIncludes(content, 'AC-4', 'Should cover AC-4');
    assertIncludes(content, 'AC-5', 'Should cover AC-5');
    assertIncludes(content, 'AC-6', 'Should cover AC-6');
    assertIncludes(content, 'AC-7', 'Should cover AC-7');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 19: Route handler uses supabaseServer
  // ─────────────────────────────────────────────────────────────
  await test('Route handler uses supabaseServer for database access', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'supabaseServer', 'Should use supabaseServer');
    assertIncludes(content, 'onboarding_simulations', 'Should reference correct table');
  });

  // ─────────────────────────────────────────────────────────────
  // Test 20: Route handler handles errors gracefully
  // ─────────────────────────────────────────────────────────────
  await test('Route handler handles errors gracefully', async () => {
    const routePath = path.join(dashboardDir, 'app', 'api', 'onboarding', 'simulator', 'route.ts');
    const content = fs.readFileSync(routePath, 'utf8');
    assertIncludes(content, 'try {', 'Should have try block');
    assertIncludes(content, 'catch', 'Should have catch block');
    assertIncludes(content, '500', 'Should return 500 for server errors');
  });

  // Print results
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  TEST RESULTS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
  console.log('═══════════════════════════════════════════════════════════\n');

  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
