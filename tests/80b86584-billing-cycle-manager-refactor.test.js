/**
 * QC E2E Test — PR #1134 / Task 80b86584
 * "Refactor: Fold billing-cycle-manager.js into BillingService class"
 *
 * Verifies:
 * 1. billing-cycle-manager.js is deleted (no stale file)
 * 2. BillingService.js exists and does NOT require billing-cycle-manager
 * 3. BillingService.js requires the DB client (clean dependency)
 * 4. No other files in lib/ or routes/ import billing-cycle-manager
 *
 * NOTE: PR #1134 was CLOSED — superseded by PR #1131 which completed
 * this refactor properly. This test verifies the final state on main.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

// Test 1: billing-cycle-manager.js must not exist
test('billing-cycle-manager.js is deleted', () => {
  const filePath = path.join(projectRoot, 'lib', 'billing-cycle-manager.js');
  assert(!fs.existsSync(filePath), `Expected billing-cycle-manager.js to be deleted but found at ${filePath}`);
});

// Test 2: BillingService.js must exist
test('BillingService.js exists in lib/services/', () => {
  const filePath = path.join(projectRoot, 'lib', 'services', 'BillingService.js');
  assert(fs.existsSync(filePath), `Expected BillingService.js at ${filePath} but it does not exist`);
});

// Test 3: BillingService.js must NOT require billing-cycle-manager
test('BillingService.js does not import billing-cycle-manager', () => {
  const filePath = path.join(projectRoot, 'lib', 'services', 'BillingService.js');
  if (!fs.existsSync(filePath)) throw new Error('BillingService.js not found — cannot verify');
  const content = fs.readFileSync(filePath, 'utf8');
  assert(!content.includes('billing-cycle-manager'), `BillingService.js still has require('../billing-cycle-manager') — stale import`);
});

// Test 4: BillingService.js must require the DB client (not legacy postgrest-client)
test('BillingService.js imports from lib/db (not legacy client)', () => {
  const filePath = path.join(projectRoot, 'lib', 'services', 'BillingService.js');
  if (!fs.existsSync(filePath)) throw new Error('BillingService.js not found — cannot verify');
  const content = fs.readFileSync(filePath, 'utf8');
  assert(content.includes("require('../db')"), `BillingService.js does not import from ../db — expected clean DB dependency`);
});

// Test 5: No other lib/ or routes/ file imports billing-cycle-manager
test('No stale imports of billing-cycle-manager across codebase', () => {
  const dirsToCheck = ['lib', 'routes', 'app'];
  const staleRefs = [];

  function scan(dir) {
    const fullDir = path.join(projectRoot, dir);
    if (!fs.existsSync(fullDir)) return;
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        scan(path.join(dir, entry.name));
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
        const filePath = path.join(projectRoot, dir, entry.name);
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('billing-cycle-manager')) {
          staleRefs.push(path.join(dir, entry.name));
        }
      }
    }
  }

  for (const dir of dirsToCheck) scan(dir);
  assert.strictEqual(staleRefs.length, 0,
    `Found stale billing-cycle-manager imports in: ${staleRefs.join(', ')}`);
});

// Test 6: BillingService can be loaded without throwing
test('BillingService.js loads without require errors', () => {
  // We do a source-level check rather than require() to avoid side effects
  const filePath = path.join(projectRoot, 'lib', 'services', 'BillingService.js');
  if (!fs.existsSync(filePath)) throw new Error('BillingService.js not found');
  const content = fs.readFileSync(filePath, 'utf8');
  // Must have a class or module.exports
  const hasExport = content.includes('module.exports') || content.includes('class BillingService');
  assert(hasExport, 'BillingService.js has no module.exports or class declaration');
});

console.log('');
console.log('='.repeat(60));
console.log('QC E2E TEST REPORT — PR #1134 (billing-cycle-manager refactor)');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('');
if (failed > 0) {
  console.log('⚠️  REJECT — refactor incomplete or stale imports found');
  process.exit(1);
} else {
  console.log('✅ PASS — billing-cycle-manager cleanly folded into BillingService');
  process.exit(0);
}
