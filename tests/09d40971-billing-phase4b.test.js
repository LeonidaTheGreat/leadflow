/**
 * E2E Test: Phase 4B BillingService Refactor
 * Task: 09d40971-9678-44f9-ac8b-f1db6569359c
 *
 * Verifies the refactor is complete by inspecting the PR branch's committed state.
 * NOTE: Must be run while the PR branch is checked out.
 *
 * Checks:
 * 1. BillingService (committed HEAD) does NOT import deleted modules
 * 2. stripe-subscriptions/index.js only imports BillingService
 * 3. Old billing module files are deleted from git tree
 * 4. BillingService has key methods from all folded modules
 */

const path = require('path');
const { execSync } = require('child_process');

let passed = 0;
let failed = 0;

function pass(msg) { console.log('PASS:', msg); passed++; }
function fail(msg, detail) { console.error('FAIL:', msg, detail ? ` — ${detail}` : ''); failed++; }

const ROOT = path.join(__dirname, '..');

function gitShow(filePath) {
  try {
    return execSync(`git show HEAD:${filePath}`, { cwd: ROOT, encoding: 'utf-8' });
  } catch (e) { return null; }
}

function gitLsFiles(filePath) {
  try {
    execSync(`git ls-files --error-unmatch ${filePath}`, { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch (e) { return false; }
}

// Test 1: BillingService (committed) does NOT import deleted modules
const bsSource = gitShow('lib/services/BillingService.js');
if (!bsSource) { fail('Cannot read committed lib/services/BillingService.js'); process.exit(1); }

const deletedModules = ['../subscription-service', '../billing-cycle-manager', '../webhook-processor', '../stripe-portal'];
for (const mod of deletedModules) {
  const pattern = new RegExp(`require\\(['"]${mod.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`);
  if (pattern.test(bsSource)) {
    fail(`BillingService still imports deleted module: ${mod}`);
  } else {
    pass(`BillingService does not import deleted module: ${mod}`);
  }
}

// Test 2: BillingService has key methods
const requiredMethods = [
  'createCompleteSubscription',  // from subscription-service
  'cancelManagedSubscription',   // from subscription-service
  'getBillingCycleInfo',         // from billing-cycle-manager
  'getRenewalHistory',           // from billing-cycle-manager
  'createCustomerPortal',        // from stripe-portal
  'handleWebhook',               // from webhook-processor
  'initializeBilling',           // core
];
for (const method of requiredMethods) {
  if (bsSource.includes(`${method}(`)) {
    pass(`BillingService defines method: ${method}`);
  } else {
    fail(`BillingService missing method: ${method}`);
  }
}

// Test 3: stripe-subscriptions/index.js only imports BillingService
const siSource = gitShow('stripe-subscriptions/index.js');
if (!siSource) { fail('Cannot read committed stripe-subscriptions/index.js'); } else {
  for (const mod of ['subscription-service', 'billing-cycle-manager', 'webhook-processor', 'stripe-portal']) {
    if (siSource.includes(mod)) {
      fail(`stripe-subscriptions/index.js still references: ${mod}`);
    } else {
      pass(`stripe-subscriptions/index.js does not reference: ${mod}`);
    }
  }
  if (siSource.includes('BillingService')) {
    pass('stripe-subscriptions/index.js imports BillingService');
  } else {
    fail('stripe-subscriptions/index.js does not import BillingService');
  }
}

// Test 4: Old billing files not tracked by git
for (const f of ['lib/billing-cycle-manager.js', 'lib/stripe-portal.js', 'lib/webhook-processor.js', 'lib/subscription-service.js', 'lib/webhook-handler.js']) {
  if (gitLsFiles(f)) {
    fail(`Old file still tracked by git: ${f}`);
  } else {
    pass(`Old file deleted from git: ${f}`);
  }
}

// Summary
console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
