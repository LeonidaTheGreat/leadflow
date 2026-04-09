'use strict';
/**
 * E2E Test: Refactor cleanup — wire in existing services + delete old loose files
 * Task: 81bb635c-54af-4f7a-8555-a30c2c6ef239
 * PR: #1094
 *
 * Verifies:
 *   1. Old loose files are deleted (no stale code to require)
 *   2. New service classes are importable and structurally correct
 *   3. Routes import from services (not from the deleted loose files)
 *   4. OnboardingService is wired into at least one consumer (EXPECTED TO FAIL — dead code)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../../');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// ─── 1. Old loose files must be gone ─────────────────────────────────────────

test('lib/onboarding-telemetry.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/onboarding-telemetry.js')),
    'lib/onboarding-telemetry.js still exists — should have been deleted');
});

test('lib/satisfaction-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/satisfaction-service.js')),
    'lib/satisfaction-service.js still exists — should have been deleted');
});

test('lib/stuck-pilots-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/stuck-pilots-service.js')),
    'lib/stuck-pilots-service.js still exists — should have been deleted');
});

test('lib/subscription-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/subscription-service.js')),
    'lib/subscription-service.js still exists — should have been deleted');
});

test('lib/weekly-performance-service.js is deleted', () => {
  assert(!fs.existsSync(path.join(ROOT, 'lib/weekly-performance-service.js')),
    'lib/weekly-performance-service.js still exists — should have been deleted');
});

// ─── 2. New service classes exist and are importable ─────────────────────────

test('lib/services/OnboardingService.js is importable', () => {
  const OnboardingService = require(path.join(ROOT, 'lib/services/OnboardingService'));
  assert.strictEqual(typeof OnboardingService, 'function', 'Should export a class');
  assert.deepStrictEqual(OnboardingService.STEP_INDEX, {
    email_verified: 1, fub_connected: 2, phone_configured: 3, sms_verified: 4, aha_completed: 5,
  }, 'STEP_INDEX mismatch');
  const instance = new OnboardingService({});
  assert.strictEqual(typeof instance.logOnboardingEvent, 'function');
  assert.strictEqual(typeof instance.getFunnelStatus, 'function');
  assert.strictEqual(typeof instance.checkAndAlertStuckAgents, 'function');
});

test('lib/services/StuckPilotsService is importable', () => {
  const m = require(path.join(ROOT, 'lib/services/StuckPilotsService'));
  assert(m.createDefaultStuckPilotsService || m.default || typeof m === 'function',
    'StuckPilotsService should export createDefaultStuckPilotsService or a class');
});

test('lib/services/WeeklyPerformanceService is importable', () => {
  const m = require(path.join(ROOT, 'lib/services/WeeklyPerformanceService'));
  assert(m.createDefaultWeeklyPerformanceService || m.default || typeof m === 'function',
    'WeeklyPerformanceService should export createDefaultWeeklyPerformanceService or a class');
});

test('lib/services/SubscriptionService is importable', () => {
  const m = require(path.join(ROOT, 'lib/services/SubscriptionService'));
  assert(m.default || typeof m === 'function', 'SubscriptionService should export a class');
});

// ─── 3. Routes use the new service classes ────────────────────────────────────

test('routes/check-stuck-pilots.js imports from StuckPilotsService (not stuck-pilots-service)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'routes/check-stuck-pilots.js'), 'utf8');
  assert(src.includes('StuckPilotsService'), 'Missing StuckPilotsService import');
  assert(!src.includes('stuck-pilots-service'), 'Still imports old stuck-pilots-service.js');
});

test('routes/weekly-performance.js imports from WeeklyPerformanceService (not weekly-performance-service)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'routes/weekly-performance.js'), 'utf8');
  assert(src.includes('WeeklyPerformanceService'), 'Missing WeeklyPerformanceService import');
  assert(!src.includes("'../lib/weekly-performance-service'"), 'Still imports old loose file');
});

test('lib/services/BillingService.js imports SubscriptionService (not subscription-service)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/services/BillingService.js'), 'utf8');
  assert(src.includes('./SubscriptionService'), 'Missing ./SubscriptionService import');
  assert(!src.includes("'../subscription-service'"), 'Still imports old subscription-service.js');
});

test('lib/services/FUBService.js imports SatisfactionService (not satisfaction-service)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/services/FUBService.js'), 'utf8');
  assert(src.includes('SatisfactionService'), 'Missing SatisfactionService import');
  assert(!src.includes("'../satisfaction-service'"), 'Still imports old satisfaction-service.js');
});

// ─── 4. OnboardingService is wired into at least one consumer (CRITICAL CHECK) ─

test('OnboardingService has at least one consumer in routes/ lib/ server.js', () => {
  // Check all relevant files for any import of OnboardingService
  const dirsToSearch = [
    path.join(ROOT, 'routes'),
    path.join(ROOT, 'lib'),
    path.join(ROOT, 'app'),
    path.join(ROOT, 'stripe-subscriptions'),
  ];
  const serverJs = path.join(ROOT, 'server.js');

  function searchDir(dir) {
    if (!fs.existsSync(dir)) return false;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'OnboardingService.js') {
        if (searchDir(full)) return true;
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        if (full.includes('OnboardingService.js')) continue;
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes('OnboardingService')) return true;
      }
    }
    return false;
  }

  const foundInServer = fs.existsSync(serverJs) &&
    fs.readFileSync(serverJs, 'utf8').includes('OnboardingService');

  const found = foundInServer || dirsToSearch.some(d => searchDir(d));
  assert(found,
    'OnboardingService.js is created but not imported by any consumer — dead code, refactor is incomplete');
});

// ─── Results ─────────────────────────────────────────────────────────────────

console.log(`\n─── Results: ${passed} passed, ${failed} failed ───`);
if (failed > 0) process.exit(1);
