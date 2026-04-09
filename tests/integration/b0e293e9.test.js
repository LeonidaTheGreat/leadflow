/**
 * QC E2E Test: b0e293e9 — Fix supabase read access smoke check
 * Verifies:
 * 1. project.config.json has no legacy supabase_read smoke entries
 * 2. testSmokeConfigHasNoLegacySupabaseRead() guard method works correctly
 * 3. Non-blocking env failures do not cause process.exit(1)
 * 4. Guard detects injected legacy entries
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_DIR = '/Users/clawdbot/projects/leadflow';
const CONFIG_PATH = path.join(PROJECT_DIR, 'project.config.json');
const E2E_PATH = path.join(PROJECT_DIR, 'integrations/test-e2e-flow.js');

let passed = 0;
let failed = 0;

function pass(name) { console.log(`PASS: ${name}`); passed++; }
function fail(name, reason) { console.error(`FAIL: ${name} — ${reason}`); failed++; }

// Test 1: project.config.json has no supabase_read smoke entries
try {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const smokeTests = Array.isArray(config.smoke_tests) ? config.smoke_tests : [];
  const legacyEntry = smokeTests.find(
    (t) => t.id === 'supabase-read' || t.check_type === 'supabase_read'
  );
  assert.ok(!legacyEntry, `Legacy supabase entry found: ${JSON.stringify(legacyEntry)}`);
  pass('project.config.json has no supabase_read smoke entries');
} catch (e) {
  fail('project.config.json has no supabase_read smoke entries', e.message);
}

// Test 2: E2ETestSuite exports and new guard method exists
try {
  const { E2ETestSuite } = require(E2E_PATH);
  assert.ok(typeof E2ETestSuite === 'function', 'E2ETestSuite should be a class/function');
  const suite = new E2ETestSuite();
  assert.ok(
    typeof suite.testSmokeConfigHasNoLegacySupabaseRead === 'function',
    'testSmokeConfigHasNoLegacySupabaseRead should be a method'
  );
  pass('E2ETestSuite exports with new guard method');
} catch (e) {
  fail('E2ETestSuite exports with new guard method', e.message);
}

(async () => {
  // Test 3: Guard passes on the real config
  try {
    const { E2ETestSuite } = require(E2E_PATH);
    const suite = new E2ETestSuite();
    await suite.testSmokeConfigHasNoLegacySupabaseRead();
    const result = suite.results.tests.find(
      (t) => t.name === 'Smoke config has no legacy supabase_read'
    );
    assert.ok(result, 'Result for smoke config test should be recorded');
    assert.ok(result.passed, `Guard should pass on real config, details: ${result.details}`);
    pass('Guard passes on real project.config.json');
  } catch (e) {
    fail('Guard passes on real project.config.json', e.message);
  }

  // Test 4: Guard detects injected legacy entry
  try {
    const { E2ETestSuite } = require(E2E_PATH);
    const suite = new E2ETestSuite();
    const originalReadFileSync = fs.readFileSync;
    const fakeConfig = JSON.parse(originalReadFileSync(CONFIG_PATH, 'utf8'));
    fakeConfig.smoke_tests = fakeConfig.smoke_tests || [];
    fakeConfig.smoke_tests.push({ id: 'supabase-read', check_type: 'supabase_read' });
    const fakeJson = JSON.stringify(fakeConfig);
    fs.readFileSync = (filePath, enc) => {
      if (filePath === CONFIG_PATH) return fakeJson;
      return originalReadFileSync(filePath, enc);
    };
    await suite.testSmokeConfigHasNoLegacySupabaseRead();
    fs.readFileSync = originalReadFileSync;
    const result = suite.results.tests.find(
      (t) => t.name === 'Smoke config has no legacy supabase_read'
    );
    assert.ok(result, 'Result should be recorded for injected legacy config');
    assert.ok(!result.passed, 'Guard should FAIL when legacy entry is injected');
    pass('Guard correctly detects injected legacy supabase_read entry');
  } catch (e) {
    fail('Guard correctly detects injected legacy supabase_read entry', e.message);
  }

  // Test 5: Non-blocking env failures exit 0
  try {
    const result = execSync(
      `node ${E2E_PATH} 2>&1; echo "EXIT:$?"`,
      { cwd: PROJECT_DIR, env: { ...process.env, FUB_API_KEY: '' } }
    ).toString();
    assert.ok(result.includes('EXIT:0'), `Expected EXIT:0, got: ${result.slice(-150)}`);
    pass('Non-blocking env failures produce exit code 0');
  } catch (e) {
    fail('Non-blocking env failures produce exit code 0', e.message);
  }

  // Test 6: No supabase_read in smoke-tests.js
  try {
    const smokeTestsPath = path.join(PROJECT_DIR, 'smoke-tests.js');
    if (fs.existsSync(smokeTestsPath)) {
      const content = fs.readFileSync(smokeTestsPath, 'utf8');
      const hasLegacy = /supabase.?read|supabase_read/i.test(content);
      assert.ok(!hasLegacy, 'smoke-tests.js contains supabase_read pattern');
    }
    pass('No supabase_read patterns in smoke-tests.js (or file absent)');
  } catch (e) {
    fail('No supabase_read patterns in smoke-tests.js', e.message);
  }

  const total = passed + failed;
  console.log(`\n--- Results: ${passed}/${total} passed ---`);
  if (failed > 0) process.exit(1);
})();
