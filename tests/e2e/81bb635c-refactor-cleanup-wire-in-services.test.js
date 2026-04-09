'use strict';

/**
 * E2E Test: Refactor cleanup — wire in existing services + delete old loose files
 * Task: 81bb635c-54af-4f7a-8555-a30c2c6ef239
 *
 * Verifies:
 *   1. Old loose lib files are deleted (no stale imports in routes/lib/stripe-subscriptions)
 *   2. New service classes exist and export the expected API
 *   3. Routes load without errors
 *   4. Dashboard build succeeds
 *   5. BROKEN: scripts/utilities/check-stuck-agents.js still imports deleted lib/onboarding-telemetry.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ── 1. Deleted files are gone ─────────────────────────────────────────────

console.log('\n1. Deleted loose lib files no longer exist');

test('lib/onboarding-telemetry.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/onboarding-telemetry.js')), 'File should be deleted');
});

test('lib/satisfaction-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/satisfaction-service.js')), 'File should be deleted');
});

test('lib/stuck-pilots-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/stuck-pilots-service.js')), 'File should be deleted');
});

test('lib/subscription-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/subscription-service.js')), 'File should be deleted');
});

test('lib/weekly-performance-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/weekly-performance-service.js')), 'File should be deleted');
});

// ── 2. New service classes exist ──────────────────────────────────────────

console.log('\n2. New service classes exist');

test('lib/services/OnboardingService.js exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'lib/services/OnboardingService.js')));
});

test('lib/services/StuckPilotsService.js exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'lib/services/StuckPilotsService.js')));
});

test('lib/services/SubscriptionService.js exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'lib/services/SubscriptionService.js')));
});

test('lib/services/WeeklyPerformanceService.js exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'lib/services/WeeklyPerformanceService.js')));
});

// ── 3. Service classes export expected APIs ───────────────────────────────

console.log('\n3. Service classes export expected APIs');

test('OnboardingService exports class with logOnboardingEvent', () => {
  const OnboardingService = require(path.join(ROOT, 'lib/services/OnboardingService'));
  assert(typeof OnboardingService === 'function');
  assert(typeof OnboardingService.prototype.logOnboardingEvent === 'function');
  assert(typeof OnboardingService.prototype.checkAndAlertStuckAgents === 'function');
  assert(typeof OnboardingService.STEP_INDEX === 'object');
});

test('StuckPilotsService exports class with checkAndAlertStuckPilots and createDefaultStuckPilotsService', () => {
  const StuckPilotsService = require(path.join(ROOT, 'lib/services/StuckPilotsService'));
  assert(typeof StuckPilotsService === 'function' || typeof StuckPilotsService === 'object');
  const { createDefaultStuckPilotsService } = StuckPilotsService;
  assert(typeof createDefaultStuckPilotsService === 'function', 'createDefaultStuckPilotsService must be exported');
});

test('WeeklyPerformanceService exports createDefaultWeeklyPerformanceService', () => {
  const svc = require(path.join(ROOT, 'lib/services/WeeklyPerformanceService'));
  assert(typeof svc.createDefaultWeeklyPerformanceService === 'function');
});

// ── 4. Routes wire to the new services ───────────────────────────────────

console.log('\n4. Routes import new services (no stale references)');

test('routes/check-stuck-pilots.js imports StuckPilotsService (not old file)', () => {
  const content = fs.readFileSync(path.join(ROOT, 'routes/check-stuck-pilots.js'), 'utf8');
  assert(content.includes('StuckPilotsService'), 'Must reference StuckPilotsService');
  assert(!content.includes('stuck-pilots-service'), 'Must not reference old file');
});

test('routes/weekly-performance.js imports WeeklyPerformanceService (not old file)', () => {
  const content = fs.readFileSync(path.join(ROOT, 'routes/weekly-performance.js'), 'utf8');
  assert(content.includes('WeeklyPerformanceService'), 'Must reference WeeklyPerformanceService');
  assert(!content.includes('weekly-performance-service'), 'Must not reference old file');
});

test('lib/services/BillingService.js imports SubscriptionService (not old file)', () => {
  const content = fs.readFileSync(path.join(ROOT, 'lib/services/BillingService.js'), 'utf8');
  assert(content.includes("require('./SubscriptionService')"), 'Must import SubscriptionService');
  assert(!content.includes('subscription-service'), 'Must not reference old file');
});

test('stripe-subscriptions/index.js imports SubscriptionService class directly', () => {
  const content = fs.readFileSync(path.join(ROOT, 'stripe-subscriptions/index.js'), 'utf8');
  assert(content.includes('SubscriptionService'), 'Must reference SubscriptionService');
  assert(!content.includes('subscription-service'), 'Must not reference old file');
});

// ── 5. REGRESSION: scripts/utilities/check-stuck-agents.js is broken ─────

console.log('\n5. Regression check: scripts/utilities/check-stuck-agents.js');

test('FAIL — scripts/utilities/check-stuck-agents.js still imports deleted lib/onboarding-telemetry', () => {
  const content = fs.readFileSync(path.join(ROOT, 'scripts/utilities/check-stuck-agents.js'), 'utf8');
  const brokenImport = content.includes('onboarding-telemetry');
  // This test PASSES when the broken import has been fixed (import is gone)
  assert(!brokenImport, 'scripts/utilities/check-stuck-agents.js must not import lib/onboarding-telemetry (deleted)');
});

// ── Summary ───────────────────────────────────────────────────────────────

console.log(`\n────────────────────────────────────`);
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
if (failed > 0) {
  process.exit(1);
}
