/**
 * E2E test for task f92c8e98 — Fix: Supabase read access (smoke)
 * Verifies:
 *   1. project.config.json has no legacy supabase_read smoke check
 *   2. E2E suite exports testSmokeConfigHasNoLegacySupabaseRead and it passes
 *   3. Non-blocking env failures (FUB_API_KEY missing) do not cause exit code 1
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'project.config.json');

let passed = 0;
let failed = 0;

function ok(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.error(`FAIL: ${name} — ${e.message}`);
    failed++;
  }
}

// Test 1: No legacy supabase_read in project.config.json
ok('project.config.json has no supabase_read smoke check', () => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const smokeTests = Array.isArray(config.smoke_tests) ? config.smoke_tests : [];
  const legacy = smokeTests.find(t => t.id === 'supabase-read' || t.check_type === 'supabase_read');
  assert(!legacy, `Found legacy supabase entry: ${JSON.stringify(legacy)}`);
});

// Test 2: E2ETestSuite exports testSmokeConfigHasNoLegacySupabaseRead
ok('E2ETestSuite exports testSmokeConfigHasNoLegacySupabaseRead', () => {
  const { E2ETestSuite } = require(path.join(PROJECT_ROOT, 'integrations', 'test-e2e-flow.js'));
  assert(typeof E2ETestSuite === 'function', 'E2ETestSuite must be a class/function');
  const suite = new E2ETestSuite();
  assert(typeof suite.testSmokeConfigHasNoLegacySupabaseRead === 'function',
    'testSmokeConfigHasNoLegacySupabaseRead method must exist');
});

// Test 3: testSmokeConfigHasNoLegacySupabaseRead actually passes (async)
async function testAsyncPass() {
  const { E2ETestSuite } = require(path.join(PROJECT_ROOT, 'integrations', 'test-e2e-flow.js'));
  const suite = new E2ETestSuite();
  // Monkey-patch recordResult to capture outcome
  let recorded = null;
  suite.recordResult = (name, passed, details) => { recorded = { name, passed, details }; };
  await suite.testSmokeConfigHasNoLegacySupabaseRead();
  assert(recorded !== null, 'recordResult was not called');
  assert(recorded.passed === true, `Smoke config check failed: ${recorded.details}`);
  console.log('PASS: testSmokeConfigHasNoLegacySupabaseRead returns passing result');
  passed++;
}

// Test 4: npm test exits 0 (FUB_API_KEY missing is non-blocking)
ok('npm test exits 0 despite missing FUB_API_KEY', () => {
  const result = execSync('npm test', { cwd: PROJECT_ROOT, stdio: 'pipe' });
  // If we get here, exit code was 0
});

testAsyncPass().catch(e => {
  console.error(`FAIL: testSmokeConfigHasNoLegacySupabaseRead async — ${e.message}`);
  failed++;
}).finally(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
