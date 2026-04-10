'use strict';
/**
 * QC E2E Test: OnboardingService class refactor (task 9e3b5486)
 * PR #1110 — Refactor: Convert onboarding-telemetry.js to OnboardingService class
 *
 * Verifies the full "close the loop" checklist for this refactor:
 *   1. lib/onboarding-telemetry.js is deleted (old file gone)
 *   2. lib/services/OnboardingService.js exists and is a proper class
 *   3. scripts/utilities/check-stuck-agents.js does NOT import deleted file (runtime crash)
 *   4. lib/satisfaction-service.js is deleted (also replaced in this PR wave)
 *   5. No stale require('../../lib/onboarding-telemetry') in any test file
 *
 * Runnable: node product/lead-response/dashboard/tests/9e3b5486-onboarding-service-refactor.test.js
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
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

console.log('\n=== QC: OnboardingService refactor (PR #1110) ===\n');

// 1. Old file deleted
console.log('1. Old file is deleted');
test('lib/onboarding-telemetry.js does not exist', () => {
  assert(
    !fs.existsSync(path.join(ROOT, 'lib/onboarding-telemetry.js')),
    'lib/onboarding-telemetry.js was supposed to be deleted by this refactor'
  );
});

// 2. New service class exists and has correct shape
console.log('\n2. New OnboardingService class');
test('lib/services/OnboardingService.js exists', () => {
  assert(fs.existsSync(path.join(ROOT, 'lib/services/OnboardingService.js')));
});

test('OnboardingService is a class with required methods', () => {
  const OnboardingService = require(path.join(ROOT, 'lib/services/OnboardingService'));
  assert.strictEqual(typeof OnboardingService, 'function', 'Must be a class (function)');
  assert.strictEqual(typeof OnboardingService.prototype.logOnboardingEvent, 'function');
  assert.strictEqual(typeof OnboardingService.prototype.getFunnelStatus, 'function');
  assert.strictEqual(typeof OnboardingService.prototype.checkAndAlertStuckAgents, 'function');
  assert.strictEqual(typeof OnboardingService.prototype.getOnboardingEvents, 'function');
  assert.strictEqual(typeof OnboardingService.STEP_INDEX, 'object');
  assert.strictEqual(Object.keys(OnboardingService.STEP_INDEX).length, 5);
});

test('OnboardingService constructor accepts db dependency (injected)', () => {
  const OnboardingService = require(path.join(ROOT, 'lib/services/OnboardingService'));
  const fakeDb = {};
  const svc = new OnboardingService(fakeDb);
  assert.strictEqual(svc.db, fakeDb, 'db must be assigned to this.db');
});

// 3. No stale import of deleted file in scripts
console.log('\n3. No stale imports of deleted file');
test('scripts/utilities/check-stuck-agents.js does NOT import lib/onboarding-telemetry', () => {
  const filePath = path.join(ROOT, 'scripts/utilities/check-stuck-agents.js');
  assert(fs.existsSync(filePath), 'check-stuck-agents.js must exist');
  const content = fs.readFileSync(filePath, 'utf8');
  assert(
    !content.includes('onboarding-telemetry'),
    'check-stuck-agents.js must not import deleted lib/onboarding-telemetry (runtime crash)'
  );
});

test('No test file imports lib/onboarding-telemetry as shim', () => {
  // Only scan tests/unit and tests/e2e (not dashboard/tests which are QC-authored)
  const testDirs = [
    path.join(ROOT, 'tests', 'unit'),
    path.join(ROOT, 'tests', 'e2e'),
  ];
  const stalePaths = [];
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dir, file), 'utf8');
      // Look for actual require() calls to the deleted module
      if (/require\(['"](\.\.\/)*lib\/onboarding-telemetry['"]/.test(content)) {
        stalePaths.push(file);
      }
    }
  }
  assert.strictEqual(stalePaths.length, 0, `Test files still import deleted shim: ${stalePaths.join(', ')}`);
});

// 4. Companion old files also cleaned up
console.log('\n4. Other old loose lib files cleaned up');
test('lib/satisfaction-service.js is deleted', () => {
  assert(
    !fs.existsSync(path.join(ROOT, 'lib/satisfaction-service.js')),
    'lib/satisfaction-service.js should be deleted — replaced by lib/services/SatisfactionService.js'
  );
});

// 5. Grep check: zero code-path references to old filename
console.log('\n5. Zero stale references in source (routes, lib, server.js, integrations)');
test('grep check: no require of onboarding-telemetry in production code', () => {
  const dirs = ['routes', 'lib', 'integrations', 'stripe-subscriptions'];
  const stale = [];
  for (const dir of dirs) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath, { recursive: true })
      .filter(f => f.endsWith('.js'))
      .map(f => path.join(dirPath, f));
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('onboarding-telemetry')) {
        stale.push(path.relative(ROOT, file));
      }
    }
  }
  // Also check server.js
  const serverContent = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  if (serverContent.includes('onboarding-telemetry')) stale.push('server.js');

  assert.strictEqual(stale.length, 0, `Stale imports found: ${stale.join(', ')}`);
});

// Summary
console.log('\n────────────────────────────────────────');
console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
if (failed > 0) process.exit(1);
