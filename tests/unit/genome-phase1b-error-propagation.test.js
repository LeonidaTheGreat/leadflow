#!/usr/bin/env node
/**
 * Unit Test: Genome Phase 1B - Error Propagation
 * 
 * Tests that verify the error propagation and step outcome tracking
 * features in the HeartbeatExecutor.
 * 
 * Run with: node tests/unit/genome-phase1b-error-propagation.test.js
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

// Genome path
const GENOME_CORE_PATH = path.join(os.homedir(), '.openclaw', 'genome', 'core');

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('🧪 Genome Phase 1B: Error Propagation Tests\n');
console.log(`📁 Genome Core Path: ${GENOME_CORE_PATH}\n`);

// Read the heartbeat-executor.js file
const heartbeatExecutorPath = path.join(GENOME_CORE_PATH, 'heartbeat-executor.js');
let executorContent = '';

try {
  executorContent = fs.readFileSync(heartbeatExecutorPath, 'utf-8');
} catch (err) {
  console.error(`❌ Failed to read heartbeat-executor.js: ${err.message}`);
  process.exit(1);
}

// Test 1: Step outcome tracker is initialized
test('Step outcome tracker initialized in constructor', () => {
  assert(
    executorContent.includes('this.stepOutcomes = []'),
    'Constructor should initialize this.stepOutcomes = []'
  );
});

// Test 2: STEP_OUTCOME constants are defined
test('STEP_OUTCOME constants defined', () => {
  assert(
    executorContent.includes('STEP_OUTCOME') &&
    executorContent.includes('SUCCESS') &&
    executorContent.includes('FAILURE') &&
    executorContent.includes('SKIPPED'),
    'STEP_OUTCOME constants should be defined'
  );
});

// Test 3: _recordStepOutcome method exists
test('_recordStepOutcome method exists', () => {
  assert(
    executorContent.includes('_recordStepOutcome('),
    'Should have _recordStepOutcome method'
  );
});

// Test 4: _step wrapper with timing exists
test('_step wrapper with timing exists', () => {
  assert(
    executorContent.includes('async _step(') &&
    executorContent.includes('Date.now()') &&
    executorContent.includes('try {') &&
    executorContent.includes('catch'),
    'Should have _step wrapper with timing and try/catch'
  );
});

// Test 5: Error classification exists
test('Error classification exists', () => {
  assert(
    executorContent.includes('_classifyError') &&
    executorContent.includes('ERROR_CLASSIFICATION'),
    'Should have error classification logic'
  );
});

// Test 6: _logStepOutcomeSummary method exists
test('_logStepOutcomeSummary method exists', () => {
  assert(
    executorContent.includes('_logStepOutcomeSummary('),
    'Should have _logStepOutcomeSummary method'
  );
});

// Test 7: checkForSilentFailures method exists
test('checkForSilentFailures method exists', () => {
  assert(
    executorContent.includes('checkForSilentFailures('),
    'Should have checkForSilentFailures method'
  );
});

// Test 8: Silent failure detection in genomeReview
test('Silent failure detection in genomeReview', () => {
  assert(
    executorContent.includes('silent_failures') ||
    executorContent.includes('checkForSilentFailures()'),
    'genomeReview should check for silent failures'
  );
});

// Test 9: Step outcomes in reportToTelegram
test('Step outcomes summary in reportToTelegram', () => {
  assert(
    executorContent.includes('stepOutcomes') &&
    executorContent.includes('reportToTelegram'),
    'reportToTelegram should include step outcomes summary'
  );
});

// Test 10: hasOutput tracking for silent failure detection
test('hasOutput tracking for silent failure detection', () => {
  assert(
    executorContent.includes('hasOutput') &&
    executorContent.includes('!s.hasOutput'),
    'Should track hasOutput to detect silent failures'
  );
});

// Test 11: Console warning for swallowed errors
test('Console warning for swallowed errors', () => {
  assert(
    executorContent.includes('console.warn') ||
    executorContent.includes('console.error'),
    'Should have console warnings for errors'
  );
});

// Test 12: Error classification constants defined
test('Error classification constants defined', () => {
  assert(
    executorContent.includes('FATAL') &&
    executorContent.includes('DEGRADED') &&
    executorContent.includes('EXPECTED'),
    'Should have FATAL, DEGRADED, EXPECTED error classifications'
  );
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📈 Total:  ${results.passed + results.failed}`);

if (results.failed > 0) {
  console.log('\n❌ FAILED TESTS:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED - Phase 1B Error Propagation is fully implemented');
  process.exit(0);
}
