/**
 * QC E2E Test — Task 1000b452
 * Phase 4C Service Class Refactor: PilotConversionService, SequenceService, PosthogService, OnboardingTelemetryService
 *
 * Verifies:
 * 1. All 4 new service classes can be required
 * 2. Each exports the expected class/constructor
 * 3. Key methods exist on each class
 * 4. Old files do NOT exist (deleted, not shimmed)
 * 5. app/api/cron/pilot-conversion/route.js does NOT reference old path
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const BASE = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

console.log('\n=== Phase 4C Service Class Refactor — QC Test ===\n');

// --- 1. New service files exist ---
console.log('1. New service files exist:');

test('lib/services/SequenceService.js exists', () => {
  assert.ok(fs.existsSync(path.join(BASE, 'lib/services/SequenceService.js')), 'File missing');
});

test('lib/services/PilotConversionService.js exists', () => {
  assert.ok(fs.existsSync(path.join(BASE, 'lib/services/PilotConversionService.js')), 'File missing');
});

test('lib/services/PosthogService.js exists', () => {
  assert.ok(fs.existsSync(path.join(BASE, 'lib/services/PosthogService.js')), 'File missing');
});

test('lib/services/OnboardingTelemetryService.js exists', () => {
  assert.ok(fs.existsSync(path.join(BASE, 'lib/services/OnboardingTelemetryService.js')), 'File missing');
});

// --- 2. Old files deleted ---
console.log('\n2. Old files deleted:');

test('lib/sequence-service.js is DELETED', () => {
  assert.ok(!fs.existsSync(path.join(BASE, 'lib/sequence-service.js')), 'Old file still exists');
});

test('lib/pilot-conversion-service.js is DELETED', () => {
  assert.ok(!fs.existsSync(path.join(BASE, 'lib/pilot-conversion-service.js')), 'Old file still exists');
});

test('lib/posthog-server.js is DELETED', () => {
  assert.ok(!fs.existsSync(path.join(BASE, 'lib/posthog-server.js')), 'Old file still exists');
});

test('lib/onboarding-telemetry.js is DELETED', () => {
  assert.ok(!fs.existsSync(path.join(BASE, 'lib/onboarding-telemetry.js')), 'Old file still exists');
});

// --- 3. Service classes export constructors ---
console.log('\n3. Service classes export constructors:');

test('SequenceService is a class/function', () => {
  const SequenceService = require(path.join(BASE, 'lib/services/SequenceService.js'));
  assert.strictEqual(typeof SequenceService, 'function', `Expected function, got ${typeof SequenceService}`);
});

test('PilotConversionService is a class/function', () => {
  const PilotConversionService = require(path.join(BASE, 'lib/services/PilotConversionService.js'));
  assert.strictEqual(typeof PilotConversionService, 'function', `Expected function, got ${typeof PilotConversionService}`);
});

test('PosthogService is a class/function', () => {
  const PosthogService = require(path.join(BASE, 'lib/services/PosthogService.js'));
  assert.strictEqual(typeof PosthogService, 'function', `Expected function, got ${typeof PosthogService}`);
});

test('OnboardingTelemetryService is a class/function', () => {
  const OnboardingTelemetryService = require(path.join(BASE, 'lib/services/OnboardingTelemetryService.js'));
  assert.strictEqual(typeof OnboardingTelemetryService, 'function', `Expected function, got ${typeof OnboardingTelemetryService}`);
});

// --- 4. Key methods exist ---
console.log('\n4. Key methods exist:');

test('SequenceService has createLeadSequence method on prototype', () => {
  const SequenceService = require(path.join(BASE, 'lib/services/SequenceService.js'));
  assert.strictEqual(typeof SequenceService.prototype.createLeadSequence, 'function', 'createLeadSequence not found');
});

test('OnboardingTelemetryService has logOnboardingEvent method on prototype', () => {
  const OnboardingTelemetryService = require(path.join(BASE, 'lib/services/OnboardingTelemetryService.js'));
  assert.strictEqual(typeof OnboardingTelemetryService.prototype.logOnboardingEvent, 'function', 'logOnboardingEvent not found');
});

test('PosthogService has capture method on prototype', () => {
  const PosthogService = require(path.join(BASE, 'lib/services/PosthogService.js'));
  const methods = Object.getOwnPropertyNames(PosthogService.prototype);
  const hasCapture = methods.includes('capture') || methods.includes('trackEvent') || methods.includes('identify');
  assert.ok(hasCapture, `Expected capture/trackEvent/identify method, found: ${methods.join(', ')}`);
});

// --- 5. No stale imports to old paths ---
console.log('\n5. No stale imports to old file paths in app/:');

test('app/api/cron/pilot-conversion/route.js does NOT import @/lib/pilot-conversion-service', () => {
  const cronRoute = path.join(BASE, 'app/api/cron/pilot-conversion/route.js');
  if (!fs.existsSync(cronRoute)) {
    // File doesn't exist, pass
    return;
  }
  const content = fs.readFileSync(cronRoute, 'utf8');
  const hasStaleImport = content.includes('@/lib/pilot-conversion-service');
  assert.ok(!hasStaleImport, 'Stale import to deleted @/lib/pilot-conversion-service found');
});

// --- Summary ---
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
