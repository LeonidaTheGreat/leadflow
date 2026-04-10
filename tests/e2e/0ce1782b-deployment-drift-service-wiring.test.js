'use strict';

/**
 * E2E test for PR #1101 — Fix deployment drift (uncommitted dashboard changes)
 * Task: 0ce1782b-8d04-473f-892e-63718a09d64c
 *
 * Verifies:
 * 1. Service classes can be required without MODULE_NOT_FOUND errors
 * 2. No stale requires to deleted modules (onboarding-telemetry, postgrest-client, satisfaction-service, subscription-service)
 * 3. scripts/utilities/check-stuck-agents.js does NOT crash on require
 * 4. Dashboard build passes (checked separately via next build)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '../..');

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

console.log('\n🔍 PR #1101 — Deployment Drift Service Wiring Tests\n');

// 1. Service classes can be required
console.log('--- Service class imports ---');

test('SatisfactionService requires without error', () => {
  const SatisfactionService = require(path.join(ROOT, 'lib/services/SatisfactionService'));
  assert.strictEqual(typeof SatisfactionService, 'function', 'should export a class constructor');
  const instance = new SatisfactionService();
  assert.strictEqual(typeof instance.scheduleSatisfactionPing, 'function');
  assert.strictEqual(typeof instance.classifyReply, 'function');
});

test('SubscriptionService requires without error', () => {
  const SubscriptionService = require(path.join(ROOT, 'lib/services/SubscriptionService'));
  assert.strictEqual(typeof SubscriptionService, 'function');
});

test('OnboardingService requires without error', () => {
  const OnboardingService = require(path.join(ROOT, 'lib/services/OnboardingService'));
  assert.strictEqual(typeof OnboardingService, 'function');
  assert.ok(Array.isArray(OnboardingService.STEP_NAMES), 'should expose STEP_NAMES');
});

test('BillingService.js uses lib/db and SubscriptionService (static check)', () => {
  // Can't require BillingService in test env (stripe not installed), so verify source
  const content = fs.readFileSync(path.join(ROOT, 'lib/services/BillingService.js'), 'utf8');
  assert.ok(content.includes("require('../db')"), 'should use lib/db');
  assert.ok(!content.includes("require('../postgrest-client')"), 'should not use postgrest-client');
  assert.ok(content.includes('new SubscriptionService()'), 'should instantiate SubscriptionService class');
});

test('StuckPilotsService requires without error', () => {
  const StuckPilotsService = require(path.join(ROOT, 'lib/services/StuckPilotsService'));
  assert.strictEqual(typeof StuckPilotsService, 'function');
});

test('WeeklyPerformanceService requires without error and exports class', () => {
  const exports = require(path.join(ROOT, 'lib/services/WeeklyPerformanceService'));
  // Exports as named export: { WeeklyPerformanceService, createDefaultWeeklyPerformanceService }
  const WeeklyPerformanceService = exports.WeeklyPerformanceService || exports;
  assert.strictEqual(typeof WeeklyPerformanceService, 'function', 'should export a class');
});

// 2. Deleted modules do NOT exist (guard against resurrection)
console.log('\n--- Deleted modules are gone ---');

test('lib/onboarding-telemetry.js is deleted', () => {
  const filePath = path.join(ROOT, 'lib/onboarding-telemetry.js');
  assert.ok(!fs.existsSync(filePath), `${filePath} should not exist — it was deleted in this PR`);
});

test('lib/postgrest-client.js is deleted', () => {
  const filePath = path.join(ROOT, 'lib/postgrest-client.js');
  assert.ok(!fs.existsSync(filePath), `${filePath} should not exist — consolidated into lib/db.js`);
});

// 3. No stale requires in production code
console.log('\n--- No stale requires in routes/lib/server.js ---');

function scanForStaleRequire(directory, pattern, label) {
  test(`No stale "${label}" require in ${directory}`, () => {
    const dir = path.join(ROOT, directory);
    if (!fs.existsSync(dir)) return; // skip if dir doesn't exist
    const results = [];
    function scan(d) {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) { scan(full); continue; }
        if (!entry.name.endsWith('.js') && !entry.name.endsWith('.ts')) continue;
        const content = fs.readFileSync(full, 'utf8');
        if (pattern.test(content)) {
          results.push(full.replace(ROOT + '/', ''));
        }
      }
    }
    scan(dir);
    assert.deepStrictEqual(results, [], `Stale require found in: ${results.join(', ')}`);
  });
}

scanForStaleRequire('routes', /require\(['"].*postgrest-client['"]\)/, '../postgrest-client');
scanForStaleRequire('routes', /require\(['"].*satisfaction-service['"]\)/, '../satisfaction-service');
scanForStaleRequire('routes', /require\(['"].*subscription-service['"]\)/, '../subscription-service');
scanForStaleRequire('routes', /require\(['"].*onboarding-telemetry['"]\)/, '../onboarding-telemetry');

// 4. Broken caller detection — check-stuck-agents.js
console.log('\n--- Broken caller detection ---');

test('scripts/utilities/check-stuck-agents.js does NOT require deleted onboarding-telemetry', () => {
  const filePath = path.join(ROOT, 'scripts/utilities/check-stuck-agents.js');
  if (!fs.existsSync(filePath)) {
    // File was deleted — OK
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const hasStaleRef = /require\(['"].*onboarding-telemetry['"]\)/.test(content);
  assert.ok(
    !hasStaleRef,
    'check-stuck-agents.js still requires deleted lib/onboarding-telemetry — will crash at runtime. Update to use OnboardingService.'
  );
});

// 5. FUBService wires SatisfactionService (not old module)
console.log('\n--- FUBService wiring ---');

test('FUBService imports SatisfactionService class, not old satisfaction-service module', () => {
  const filePath = path.join(ROOT, 'lib/services/FUBService.js');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(!content.includes("require('../satisfaction-service')"), 'should not use old satisfaction-service module');
  assert.ok(content.includes("require('./SatisfactionService')"), 'should use new SatisfactionService class');
});

test('BillingService imports db (not postgrest-client) and SubscriptionService class', () => {
  const filePath = path.join(ROOT, 'lib/services/BillingService.js');
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(!content.includes("require('../postgrest-client')"), 'should not use postgrest-client');
  assert.ok(content.includes("require('../db')"), 'should use lib/db');
  assert.ok(!content.includes("require('../subscription-service')"), 'should not use old subscription-service module');
});

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
