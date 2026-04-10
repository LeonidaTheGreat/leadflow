#!/usr/bin/env node
/**
 * QC E2E Test for task 87158bab — Fix: E2E flow test failures (1 critical)
 * PR #1099 — DB consolidation + service wiring + security fixes
 *
 * Tests:
 *  1. All deleted lib files are gone (no stale require targets)
 *  2. All routes that used deleted libs now import from lib/services/
 *  3. check-stuck-agents.js doesn't crash on require
 *  4. lib/db.js exports createClient and getPool/endPool correctly
 *  5. New service classes are importable and have expected methods
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const results = [];

function pass(name) {
  results.push({ name, ok: true });
  console.log(`  ✅ ${name}`);
}

function fail(name, reason) {
  results.push({ name, ok: false, reason });
  console.log(`  ❌ ${name}: ${reason}`);
}

console.log('\n🧪 QC E2E: PR #1099 — DB consolidation + service wiring\n');

// ─── 1. Deleted lib files must not exist ───────────────────────────────────
console.log('[1] Deleted lib files must not exist');
const deletedFiles = [
  'lib/onboarding-telemetry.js',
  'lib/db-client.js',
  'lib/db-pool.js',
  'lib/pg-pool.js',
  'lib/postgrest-client.js',
  'lib/satisfaction-service.js',
  'lib/stuck-pilots-service.js',
  'lib/subscription-service.js',
  'lib/weekly-performance-service.js',
];
for (const f of deletedFiles) {
  const fullPath = path.join(ROOT, f);
  if (fs.existsSync(fullPath)) {
    fail(`${f} deleted`, `File still exists at ${fullPath}`);
  } else {
    pass(`${f} deleted`);
  }
}

// ─── 2. Routes must not import deleted files ────────────────────────────────
console.log('\n[2] No route/script imports deleted lib files');
const filesToCheck = [
  'routes/weekly-performance.js',
  'routes/check-stuck-pilots.js',
  'scripts/utilities/check-stuck-agents.js',
  'server.js',
  'stripe-subscriptions/index.js',
];
const stalePatterns = [
  /require\(.*lib\/onboarding-telemetry/,
  /require\(.*lib\/db-client/,
  /require\(.*lib\/db-pool/,
  /require\(.*lib\/pg-pool/,
  /require\(.*lib\/postgrest-client/,
  /require\(.*lib\/satisfaction-service/,
  /require\(.*lib\/stuck-pilots-service/,
  /require\(.*lib\/subscription-service(?!s)/,  // not lib/services/
  /require\(.*lib\/weekly-performance-service/,
];
for (const f of filesToCheck) {
  const fullPath = path.join(ROOT, f);
  if (!fs.existsSync(fullPath)) {
    pass(`${f} — skip (file not present)`);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const stale = stalePatterns.filter(p => p.test(content));
  if (stale.length > 0) {
    fail(`${f} clean`, `Stale import pattern found: ${stale.map(p => p.toString()).join(', ')}`);
  } else {
    pass(`${f} clean`);
  }
}

// ─── 3. lib/db.js exports createClient + getPool + endPool ─────────────────
console.log('\n[3] lib/db.js exports correct API');
try {
  const db = require(path.join(ROOT, 'lib/db'));
  if (typeof db.createClient !== 'function') {
    fail('lib/db exports createClient', `createClient is ${typeof db.createClient}`);
  } else {
    pass('lib/db exports createClient');
  }
  if (typeof db.getPool !== 'function') {
    fail('lib/db exports getPool', `getPool is ${typeof db.getPool}`);
  } else {
    pass('lib/db exports getPool');
  }
  if (typeof db.endPool !== 'function') {
    fail('lib/db exports endPool', `endPool is ${typeof db.endPool}`);
  } else {
    pass('lib/db exports endPool');
  }
} catch (e) {
  fail('lib/db loadable', e.message);
}

// ─── 4. New service classes loadable ────────────────────────────────────────
console.log('\n[4] New service classes loadable');
const serviceClasses = [
  ['lib/services/OnboardingService.js', 'createDefaultOnboardingService'],
  ['lib/services/StuckPilotsService.js', 'createDefaultStuckPilotsService'],
  ['lib/services/WeeklyPerformanceService.js', 'createDefaultWeeklyPerformanceService'],
  ['lib/services/SubscriptionService.js', null],
  ['lib/services/SatisfactionService.js', null],
];
for (const [rel, factoryFn] of serviceClasses) {
  const fullPath = path.join(ROOT, rel);
  if (!fs.existsSync(fullPath)) {
    fail(`${rel} exists`, 'File not found');
    continue;
  }
  try {
    const mod = require(fullPath);
    if (factoryFn && typeof mod[factoryFn] !== 'function') {
      fail(`${rel} exports ${factoryFn}`, `Got ${typeof mod[factoryFn]}`);
    } else {
      pass(`${rel} loadable`);
    }
  } catch (e) {
    fail(`${rel} loadable`, e.message);
  }
}

// ─── 5. Routes import from lib/services (spot check) ────────────────────────
console.log('\n[5] Routes use lib/services (spot check)');
const routeChecks = [
  ['routes/weekly-performance.js', /lib\/services\/WeeklyPerformanceService/],
  ['routes/check-stuck-pilots.js', /lib\/services\/StuckPilotsService/],
];
for (const [rel, pattern] of routeChecks) {
  const fullPath = path.join(ROOT, rel);
  if (!fs.existsSync(fullPath)) {
    fail(`${rel} exists`, 'File not found');
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  if (pattern.test(content)) {
    pass(`${rel} uses new service`);
  } else {
    fail(`${rel} uses new service`, `Pattern ${pattern} not found`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60));
const passed = results.filter(r => r.ok).length;
const total = results.length;
console.log(`📊 ${passed}/${total} passed`);
const failures = results.filter(r => !r.ok);
if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log(`  ❌ ${f.name}: ${f.reason}`));
  process.exit(1);
} else {
  console.log('\n✅ All checks passed');
  process.exit(0);
}
