'use strict';

/**
 * E2E test: quality-gate resilience for fresh worktrees (PR #1923)
 *
 * Verifies that:
 * 1. Jest is declared in devDependencies (required by genome jest-suite-gate)
 * 2. The optionalRequire pattern silently handles missing modules
 * 3. The test suite exits 0 when optional deps are absent
 * 4. Network error codes are classified as skips (not hard failures) in the
 *    FUB/Twilio connectivity tests
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const testSrcPath = path.join(ROOT, 'integrations', 'test-e2e-flow.js');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

// 1. Jest declared in devDependencies
check('jest declared in devDependencies', () => {
  const declared = pkg.devDependencies?.jest || pkg.dependencies?.jest;
  assert(declared, 'jest must be in devDependencies for genome jest-suite-gate to work');
  assert(/^\^?29\./.test(declared), `expected jest ^29.x, got ${declared}`);
});

// 2. npm test script runs the e2e file
check('npm test script references test-e2e-flow.js', () => {
  const testScript = pkg.scripts?.test || '';
  assert(
    testScript.includes('test-e2e-flow'),
    `npm test must run integrations/test-e2e-flow.js, got: ${testScript}`
  );
});

// 3. Test file can be loaded as plain text without syntax errors (Node parse check)
check('test-e2e-flow.js parses without syntax errors', () => {
  const result = execSync(`node --check "${testSrcPath}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  // If no throw, parse succeeded
});

// 4. optionalRequire pattern exists in the source
check('optionalRequire helper present in test-e2e-flow.js', () => {
  const src = fs.readFileSync(testSrcPath, 'utf8');
  assert(src.includes('function optionalRequire'), 'optionalRequire helper must be defined');
  assert(src.includes("error.code === 'MODULE_NOT_FOUND'"), 'must handle MODULE_NOT_FOUND specifically');
});

// 5. axios and dotenv are loaded via optionalRequire (not hard require)
check('axios and dotenv are optional (not hard-required)', () => {
  const src = fs.readFileSync(testSrcPath, 'utf8');
  // No bare require('axios') or require('dotenv') — only optionalRequire wrappers
  const bareAxios = src.match(/(?<!optionalRequire\()require\s*\(\s*['"]axios['"]\s*\)/);
  const bareDotenv = src.match(/(?<!optionalRequire\()require\s*\(\s*['"]dotenv['"]\s*\)/);
  assert(!bareAxios, 'axios must only be loaded via optionalRequire, found hard require');
  assert(!bareDotenv, 'dotenv must only be loaded via optionalRequire, found hard require');
});

// 6. Transient network codes handled as skips in FUB and Twilio tests
check('transient network codes defined for FUB connectivity skip', () => {
  const src = fs.readFileSync(testSrcPath, 'utf8');
  assert(src.includes('ENOTFOUND'), 'ENOTFOUND must be in the transient codes set');
  assert(src.includes('ETIMEDOUT'), 'ETIMEDOUT must be in the transient codes set');
  assert(src.includes('ECONNREFUSED'), 'ECONNREFUSED must be in the transient codes set');
  assert(src.includes('EAI_AGAIN'), 'EAI_AGAIN must be in the transient codes set');
});

// 7. Mock flow runs when axios unavailable (suite still exercises core logic)
check('mock flow branch present for no-axios environment', () => {
  const src = fs.readFileSync(testSrcPath, 'utf8');
  assert(
    src.includes('canRunExternalFubFlow'),
    'canRunExternalFubFlow guard must be defined'
  );
  assert(
    src.includes('External FUB flow unavailable. Running mocked remaining tests'),
    'mock flow fallback message must be present'
  );
});

// 8. npm test exits 0 in this environment
check('npm test exits 0', () => {
  const result = execSync('node integrations/test-e2e-flow.js', {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60000,
  });
  assert(result.includes('ALL TESTS PASSED') || result.includes('Success Rate: 100%'), 'Expected all tests to pass');
});

// Summary
console.log(`\n=== Quality Gate Resilience Tests: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
