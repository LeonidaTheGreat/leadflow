/**
 * QC E2E Test: PR #1058 — AnalyticsService class refactor
 * Verifies:
 * 1. analytics-queries.ts is removed (moved to service class)
 * 2. AnalyticsService.js exists and exports correct class
 * 3. AnalyticsService has all 6 required analytics methods
 * 4. Analytics route uses service (no direct supabase calls in route body)
 * 5. AnalyticsKpiDashboard component no longer imports analytics-queries
 * 6. pg-pool.js shared singleton exists and exports getPool
 * 7. BillingService.js exists and exports all methods used by routes/billing.js
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_DIR = path.join(__dirname, '..', 'product', 'lead-response', 'dashboard');
const LIB_DIR = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function pass(name) { console.log(`PASS: ${name}`); passed++; }
function fail(name, reason) { console.error(`FAIL: ${name} — ${reason}`); failed++; }

// ── Test 1: analytics-queries.ts deleted ───────────────────────────────────────
try {
  const analyticsQueriesPath = path.join(DASHBOARD_DIR, 'lib', 'analytics-queries.ts');
  assert.ok(!fs.existsSync(analyticsQueriesPath),
    'analytics-queries.ts should not exist — it was replaced by AnalyticsService class');
  pass('analytics-queries.ts deleted (moved to AnalyticsService)');
} catch (e) {
  fail('analytics-queries.ts deleted', e.message);
}

// ── Test 2: AnalyticsService.js exists ────────────────────────────────────────
const analyticsServicePath = path.join(DASHBOARD_DIR, 'lib', 'services', 'AnalyticsService.js');
try {
  assert.ok(fs.existsSync(analyticsServicePath), 'AnalyticsService.js should exist in lib/services/');
  pass('AnalyticsService.js exists in lib/services/');
} catch (e) {
  fail('AnalyticsService.js exists', e.message);
}

// ── Test 3: AnalyticsService has all 6 required methods ───────────────────────
try {
  const content = fs.readFileSync(analyticsServicePath, 'utf8');
  const requiredMethods = [
    'getMessagesPerDay',
    'getDeliveryStats',
    'getResponseRate',
    'getSequenceCompletion',
    'getLeadConversion',
    'getAvgResponseTime',
  ];
  for (const method of requiredMethods) {
    assert.ok(content.includes(`async ${method}`), `AnalyticsService must have method: ${method}`);
  }
  pass('AnalyticsService has all 6 analytics methods');
} catch (e) {
  fail('AnalyticsService has all 6 analytics methods', e.message);
}

// ── Test 4: AnalyticsService is a class (not standalone functions) ─────────────
try {
  const content = fs.readFileSync(analyticsServicePath, 'utf8');
  assert.ok(content.includes('class AnalyticsService'), 'Must define class AnalyticsService');
  assert.ok(content.includes('constructor('), 'Must have a constructor (for DI)');
  pass('AnalyticsService is a class with constructor');
} catch (e) {
  fail('AnalyticsService is a class with constructor', e.message);
}

// ── Test 5: Analytics route delegates to service ──────────────────────────────
try {
  const routePath = path.join(DASHBOARD_DIR, 'app', 'api', 'analytics', 'dashboard', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  // Must import AnalyticsService
  assert.ok(content.includes('AnalyticsService'), 'Route must import AnalyticsService');
  // Must NOT directly import analytics-queries
  assert.ok(!content.includes('analytics-queries'), 'Route must NOT import analytics-queries directly');
  // Must NOT use supabase client inline in route body logic (only in DI setup)
  // The service should handle DB, the route should just call service methods
  assert.ok(content.includes('analyticsService.get'), 'Route must call service methods (analyticsService.get...)');
  pass('Analytics route properly delegates to AnalyticsService');
} catch (e) {
  fail('Analytics route properly delegates to AnalyticsService', e.message);
}

// ── Test 6: AnalyticsKpiDashboard no longer imports analytics-queries ──────────
try {
  const componentPath = path.join(DASHBOARD_DIR, 'components', 'dashboard', 'AnalyticsKpiDashboard.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  assert.ok(!content.includes('analytics-queries'), 'Component must NOT import analytics-queries');
  assert.ok(!content.includes("from '@/lib/analytics-queries'"), 'Component must NOT import from analytics-queries');
  pass('AnalyticsKpiDashboard does not import analytics-queries');
} catch (e) {
  fail('AnalyticsKpiDashboard does not import analytics-queries', e.message);
}

// ── Test 7: AnalyticsKpiDashboard uses API endpoint ───────────────────────────
try {
  const componentPath = path.join(DASHBOARD_DIR, 'components', 'dashboard', 'AnalyticsKpiDashboard.tsx');
  const content = fs.readFileSync(componentPath, 'utf8');
  assert.ok(content.includes('/api/analytics/dashboard'), 'Component must use API endpoint for analytics data');
  pass('AnalyticsKpiDashboard uses API endpoint (not direct DB)');
} catch (e) {
  fail('AnalyticsKpiDashboard uses API endpoint', e.message);
}

// ── Test 8: pg-pool.js shared singleton ───────────────────────────────────────
try {
  const pgPoolPath = path.join(LIB_DIR, 'lib', 'pg-pool.js');
  assert.ok(fs.existsSync(pgPoolPath), 'lib/pg-pool.js must exist');
  const content = fs.readFileSync(pgPoolPath, 'utf8');
  assert.ok(content.includes('function getPool'), 'pg-pool.js must export getPool');
  assert.ok(content.includes("module.exports = { getPool }"), 'pg-pool.js must export { getPool }');
  // Must NOT allow new Pool outside this file
  const poolCreations = (content.match(/new Pool\(/g) || []).length;
  assert.strictEqual(poolCreations, 1, 'pg-pool.js must only create one Pool instance');
  pass('pg-pool.js shared singleton is correct');
} catch (e) {
  fail('pg-pool.js shared singleton', e.message);
}

// ── Test 9: Routes use pg-pool (no duplicate Pool instances) ──────────────────
const routeFiles = [
  path.join(LIB_DIR, 'routes', 'admin', 'activation-outreach.js'),
  path.join(LIB_DIR, 'routes', 'admin', 'funnel-diagnostics.js'),
  path.join(LIB_DIR, 'lib', 'stuck-pilots-service.js'),
];
for (const routeFile of routeFiles) {
  const filename = path.relative(LIB_DIR, routeFile);
  try {
    if (!fs.existsSync(routeFile)) {
      fail(`${filename} exists`, 'File not found');
      continue;
    }
    const content = fs.readFileSync(routeFile, 'utf8');
    // Must NOT create its own Pool instance
    assert.ok(!content.includes('new Pool('), `${filename} must not create its own Pool instance`);
    pass(`${filename} uses shared pg-pool (no duplicate Pool)`);
  } catch (e) {
    fail(`${filename} uses shared pg-pool`, e.message);
  }
}

// ── Test 10: BillingService.js exists with required methods ───────────────────
try {
  const billingServicePath = path.join(LIB_DIR, 'lib', 'services', 'BillingService.js');
  assert.ok(fs.existsSync(billingServicePath), 'lib/services/BillingService.js must exist');
  const content = fs.readFileSync(billingServicePath, 'utf8');
  const requiredMethods = [
    'createCustomer', 'createSubscription', 'createSetupIntent',
    'getSubscriptionStatus', 'cancelSubscription', 'createPortalSession',
    'getCustomerSubscriptions', 'getCustomerInvoices', 'getCustomerPaymentMethods',
  ];
  for (const method of requiredMethods) {
    assert.ok(content.includes(`async ${method}`), `BillingService must have: ${method}`);
  }
  pass('BillingService.js has all required methods');
} catch (e) {
  fail('BillingService.js has all required methods', e.message);
}

// ── Test 11: routes/billing.js is thin (delegates to BillingService) ──────────
try {
  const billingRoutePath = path.join(LIB_DIR, 'routes', 'billing.js');
  const content = fs.readFileSync(billingRoutePath, 'utf8');
  assert.ok(content.includes('BillingService'), 'billing.js route must import BillingService');
  // No direct Stripe usage
  assert.ok(!content.includes("require('stripe')") && !content.includes('new Stripe('),
    'billing.js route must NOT use Stripe directly');
  pass('routes/billing.js is thin and delegates to BillingService');
} catch (e) {
  fail('routes/billing.js delegates to BillingService', e.message);
}

// ── Test 12: billing-enhanced.js files removed ────────────────────────────────
try {
  assert.ok(!fs.existsSync(path.join(LIB_DIR, 'lib', 'billing-enhanced.js')),
    'lib/billing-enhanced.js must be deleted');
  assert.ok(!fs.existsSync(path.join(LIB_DIR, 'routes', 'billing-enhanced.js')),
    'routes/billing-enhanced.js must be deleted');
  pass('Dead billing-enhanced.js files removed');
} catch (e) {
  fail('Dead billing-enhanced.js files removed', e.message);
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
