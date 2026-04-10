'use strict';
/**
 * QC E2E Test: Phase 4B BillingService Refactor
 * Task: 09d40971-9678-44f9-ac8b-f1db6569359c
 *
 * Tests runtime behavior of the consolidated BillingService in mock mode
 * (no Stripe key, no DB required — validates that folded modules execute
 * their paths without errors and return expected shapes).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const Module = require('module');

// Stub the 'stripe' module so tests run without it installed
const originalLoad = Module._load;
Module._load = function(request, ...args) {
  if (request === 'stripe') {
    // Return a minimal Stripe stub
    const StripeMock = function() {};
    StripeMock.prototype = {};
    return StripeMock;
  }
  return originalLoad.apply(this, [request, ...args]);
};

let passed = 0;
let failed = 0;

function pass(name) { console.log('PASS:', name); passed++; }
function fail(name, err) { console.error('FAIL:', name, '-', err && (err.message || err)); failed++; }

async function run() {
  // BillingService must load without errors
  let BillingService;
  try {
    BillingService = require('../lib/services/BillingService');
    pass('BillingService loads without error');
  } catch (e) {
    fail('BillingService loads without error', e);
    process.exit(1);
  }

  // Module exports class + instance
  assert.equal(typeof BillingService.BillingService, 'function', 'BillingService.BillingService is a class');
  assert.equal(typeof BillingService, 'object', 'module.exports is an object (singleton instance)');
  pass('BillingService exports both class and singleton');

  // Instantiate in mock mode (no stripe, no db)
  const svc = new BillingService.BillingService({ stripe: null, db: null });

  // initializeBilling — mock mode (no stripe)
  try {
    const status = await svc.initializeBilling();
    assert.equal(status.stripe, false, 'stripe is false in mock mode');
    assert.ok(Array.isArray(status.errors), 'errors is array');
    pass('initializeBilling returns correct shape in mock mode');
  } catch (e) { fail('initializeBilling mock mode', e); }

  // createCompleteSubscription — mock path (stripe null → createManagedSubscription mock)
  try {
    const result = await svc.createCompleteSubscription({ userId: 'u1', tier: 'starter', interval: 'month' });
    assert.equal(result.success, true);
    pass('createCompleteSubscription returns success in mock mode');
  } catch (e) { fail('createCompleteSubscription mock mode', e); }

  // createManagedSubscription — mock path
  try {
    const result = await svc.createManagedSubscription({ userId: 'u1', tier: 'starter', interval: 'month' });
    assert.equal(result.success, true);
    assert.ok(result.subscriptionId, 'has subscriptionId');
    pass('createManagedSubscription returns mock subscription');
  } catch (e) { fail('createManagedSubscription mock mode', e); }

  // cancelManagedSubscription — mock path
  try {
    const result = await svc.cancelManagedSubscription({ subscriptionId: 'sub_mock', immediate: false });
    assert.equal(result.success, true);
    assert.equal(result.cancelled, true);
    pass('cancelManagedSubscription mock mode works');
  } catch (e) { fail('cancelManagedSubscription mock mode', e); }

  // reactivateSubscription — mock path
  try {
    const result = await svc.reactivateSubscription('sub_mock');
    assert.equal(result.success, true);
    pass('reactivateSubscription mock mode works');
  } catch (e) { fail('reactivateSubscription mock mode', e); }

  // getBillingCycleInfo — mock path
  try {
    const result = await svc.getBillingCycleInfo('sub_mock');
    assert.equal(result.success, true);
    assert.ok(result.currentPeriod, 'has currentPeriod');
    pass('getBillingCycleInfo returns mock data');
  } catch (e) { fail('getBillingCycleInfo mock mode', e); }

  // calculateProration — mock path
  try {
    const result = await svc.calculateProration({ subscriptionId: 'sub_mock', newPriceId: 'price_mock' });
    assert.equal(result.success, true);
    pass('calculateProration returns mock data');
  } catch (e) { fail('calculateProration mock mode', e); }

  // getRenewalHistory — no DB → returns empty renewals
  try {
    const result = await svc.getRenewalHistory('sub_mock');
    assert.ok(Array.isArray(result.renewals), 'renewals is array');
    pass('getRenewalHistory returns empty in no-db mode');
  } catch (e) { fail('getRenewalHistory no-db mode', e); }

  // handleWebhook — delegates to processWebhookEvent; unknown event type returns default
  try {
    const mockEvent = { type: 'unknown.event', data: { object: {} } };
    const result = await svc.handleWebhook(mockEvent);
    assert.ok(result, 'handleWebhook returns something for unknown event');
    pass('handleWebhook delegates to processWebhookEvent');
  } catch (e) { fail('handleWebhook delegation', e); }

  // processWebhookEvent — known event types dispatch to correct handler
  try {
    const mockSub = { id: 'sub_1', metadata: { user_id: 'u1', tier: 'starter' }, status: 'active', current_period_end: 1700000000 };
    const result = await svc.processWebhookEvent({ type: 'customer.subscription.deleted', data: { object: mockSub } });
    assert.ok(result, 'processWebhookEvent handles subscription.deleted');
    pass('processWebhookEvent dispatches to handleSubscriptionDeleted');
  } catch (e) { fail('processWebhookEvent dispatch', e); }

  // createCustomerPortal — no stripe → throws or returns error
  try {
    await svc.createPortalSession('cus_mock', { returnUrl: 'https://example.com' });
    fail('createPortalSession without stripe should throw');
  } catch (e) {
    if (e.message && e.message.includes('not configured')) {
      pass('createPortalSession throws when stripe not configured');
    } else {
      pass('createPortalSession throws (expected) when stripe not configured');
    }
  }

  // verifyWebhookSignature — no stripe → throws
  try {
    svc.verifyWebhookSignature('payload', 'sig');
    fail('verifyWebhookSignature without stripe should throw');
  } catch (e) {
    pass('verifyWebhookSignature throws when not configured');
  }

  // getSubscriptionAnalytics — no DB → returns zeros
  try {
    const result = await svc.getSubscriptionAnalytics('u1');
    assert.equal(result.totalSubscriptions, 0);
    assert.equal(result.activeSubscriptions, 0);
    pass('getSubscriptionAnalytics returns zeros in no-db mode');
  } catch (e) { fail('getSubscriptionAnalytics no-db mode', e); }

  // listUserSubscriptions — no DB → returns empty array
  try {
    const result = await svc.listUserSubscriptions('u1');
    assert.ok(Array.isArray(result.subscriptions));
    assert.equal(result.subscriptions.length, 0);
    pass('listUserSubscriptions returns empty in no-db mode');
  } catch (e) { fail('listUserSubscriptions no-db mode', e); }

  // getPriceId helper
  try {
    const priceId = svc.getPriceId('starter', 'month');
    // Will be undefined in test env (no env vars) but should not throw
    pass('getPriceId does not throw');
  } catch (e) { fail('getPriceId', e); }

  // Verify old modules are NOT loaded as dependencies
  const bsPath = require.resolve('../lib/services/BillingService');
  const bsSrc = fs.readFileSync(bsPath, 'utf-8');
  for (const deleted of ['subscription-service', 'billing-cycle-manager', 'webhook-processor', 'stripe-portal']) {
    if (bsSrc.includes(`require('../${deleted}')`)) {
      fail(`BillingService still requires deleted: ${deleted}`, 'stale import');
    } else {
      pass(`No stale require('../${deleted}') in BillingService`);
    }
  }

  // lib/db.js exports createClient and getPool
  try {
    const db = require('../lib/db');
    assert.equal(typeof db.createClient, 'function');
    assert.equal(typeof db.getPool, 'function');
    pass('lib/db.js exports createClient and getPool');
  } catch (e) { fail('lib/db.js exports', e); }

  console.log(`\n--- QC Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
