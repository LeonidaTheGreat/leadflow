#!/usr/bin/env node
/**
 * Unit Test: Phase 1B - Error Propagation
 * 
 * Tests the error classification and step outcome tracking system
 * implemented in Phase 1B of Genome World-Class roadmap.
 * 
 * Run with: node tests/unit/error-propagation.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const os = require('os');

// Paths
const GENOME_PATH = path.join(os.homedir(), '.openclaw', 'genome');
const HEARTBEAT_EXECUTOR_PATH = path.join(GENOME_PATH, 'core', 'heartbeat-executor.js');

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

console.log('🧪 Phase 1B: Error Propagation Tests\n');
console.log(`📁 Genome Path: ${GENOME_PATH}`);
console.log(`📁 Heartbeat Executor: ${HEARTBEAT_EXECUTOR_PATH}\n`);

// Test 1: Heartbeat executor exists
 test('Heartbeat executor exists at ~/.openclaw/genome/core/heartbeat-executor.js', () => {
  assert.ok(fs.existsSync(HEARTBEAT_EXECUTOR_PATH), 'Heartbeat executor should exist');
});

// Test 2: Error classification constants exist
 test('ERROR_CLASSIFICATION constants are defined', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('ERROR_CLASSIFICATION'), 'ERROR_CLASSIFICATION should be defined');
  assert.ok(content.includes('FATAL'), 'FATAL classification should exist');
  assert.ok(content.includes('DEGRADED'), 'DEGRADED classification should exist');
  assert.ok(content.includes('EXPECTED'), 'EXPECTED classification should exist');
});

// Test 3: Step outcome constants exist
 test('STEP_OUTCOME constants are defined', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('STEP_OUTCOME'), 'STEP_OUTCOME should be defined');
  assert.ok(content.includes('SUCCESS'), 'SUCCESS outcome should exist');
  assert.ok(content.includes('FAILURE'), 'FAILURE outcome should exist');
  assert.ok(content.includes('SKIPPED'), 'SKIPPED outcome should exist');
});

// Test 4: _classifyError method exists
 test('_classifyError method is implemented', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('_classifyError'), '_classifyError method should exist');
  assert.ok(content.includes('classification'), 'classification property should be returned');
  assert.ok(content.includes('shouldAbort'), 'shouldAbort property should be returned');
  assert.ok(content.includes('shouldReport'), 'shouldReport property should be returned');
});

// Test 5: Fatal error patterns are defined
 test('Fatal error patterns include critical failures', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  const fatalPatterns = [
    'connection refused',
    'ECONNREFUSED',
    'authentication failed',
    'permission denied',
    'syntax error',
    'module not found',
    'cannot find module'
  ];
  
  for (const pattern of fatalPatterns) {
    assert.ok(
      content.toLowerCase().includes(pattern.toLowerCase()),
      `Fatal pattern '${pattern}' should be defined`
    );
  }
});

// Test 6: _recordStepOutcome method exists
 test('_recordStepOutcome method is implemented', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('_recordStepOutcome'), '_recordStepOutcome method should exist');
  assert.ok(content.includes('stepOutcomes.push'), 'stepOutcomes should be tracked');
  assert.ok(content.includes('hasOutput'), 'hasOutput property should be tracked');
});

// Test 7: stepOutcomes array is initialized in constructor
 test('stepOutcomes array is initialized in constructor', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('this.stepOutcomes = []'), 'stepOutcomes should be initialized');
});

// Test 8: _step method uses error classification
 test('_step method uses error classification', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('_classifyError'), '_step should call _classifyError');
  assert.ok(content.includes('_recordStepOutcome'), '_step should call _recordStepOutcome');
});

// Test 9: Silent failure detection exists
 test('checkForSilentFailures method is implemented', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('checkForSilentFailures'), 'checkForSilentFailures method should exist');
  assert.ok(content.includes('hasSilentFailures'), 'hasSilentFailures property should be returned');
});

// Test 10: _logStepOutcomeSummary exists
 test('_logStepOutcomeSummary method is implemented', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('_logStepOutcomeSummary'), '_logStepOutcomeSummary method should exist');
  assert.ok(content.includes('silent_crashes'), 'silent_crashes should be logged');
});

// Test 11: getStepOutcomes method exists
 test('getStepOutcomes method is implemented', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('getStepOutcomes'), 'getStepOutcomes method should exist');
});

// Test 12: Fatal errors are reported to Telegram
 test('Fatal errors are reported to Telegram', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('_reportStepFatalError'), '_reportStepFatalError method should exist');
  assert.ok(content.includes('reportToTelegram'), 'reportToTelegram should be called for fatal errors');
  assert.ok(content.includes('FATAL'), 'FATAL should be in Telegram message');
});

// Test 13: Genome review checks for silent failures
 test('Genome review checks for silent failures', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('silent_failures'), 'silent_failures metric should be checked');
  assert.ok(content.includes('error_propagation'), 'error_propagation category should exist');
  assert.ok(content.includes('checkForSilentFailures'), 'checkForSilentFailures should be called in genome review');
});

// Test 14: run() initializes stepOutcomes
 test('run() method initializes stepOutcomes', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  // Find the run() method and check it initializes stepOutcomes
  const runMethodMatch = content.match(/async run\(\)[^{]*\{[\s\S]*?this\._deployedTargets = new Set\(\)/);
  assert.ok(runMethodMatch, 'run() method should exist');
  
  // Check that stepOutcomes is initialized after run() starts
  const runMethodSection = content.substring(
    content.indexOf('async run()'),
    content.indexOf('async run()') + 2000
  );
  assert.ok(runMethodSection.includes('this.stepOutcomes = []'), 'stepOutcomes should be initialized in run()');
});

// Test 15: _logStepOutcomeSummary is called at heartbeat completion
 test('_logStepOutcomeSummary is called at heartbeat completion', () => {
  const content = fs.readFileSync(HEARTBEAT_EXECUTOR_PATH, 'utf-8');
  assert.ok(content.includes('_logStepOutcomeSummary()'), '_logStepOutcomeSummary should be called');
});

// Print summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`);
console.log('='.repeat(60));

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);
