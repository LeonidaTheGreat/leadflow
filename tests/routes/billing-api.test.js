'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', '..', 'routes', 'billing.js');
const routeContent = fs.readFileSync(routePath, 'utf8');

const middlewarePath = path.join(__dirname, '..', '..', 'lib', 'middleware', 'require-api-key.js');
const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\n=== route: billing API ===\n');

// ─── Auth middleware ──────────────────────────────────────────────────────────

check('imports requireApiKey from shared middleware', () => {
  assert.match(routeContent, /require\(['"]\.\.\/lib\/middleware\/require-api-key['"]\)/);
});

check('shared middleware checks x-api-key header', () => {
  assert.match(middlewareContent, /x-api-key/);
});

check('shared middleware returns 401 when key is missing or wrong', () => {
  assert.match(middlewareContent, /res\.status\(401\)/);
});

check('shared middleware uses timingSafeEqual', () => {
  assert.match(middlewareContent, /timingSafeEqual/);
});

check('shared middleware compares against LEADFLOW_API_KEY env var', () => {
  assert.match(middlewareContent, /LEADFLOW_API_KEY/);
});

// ─── Dead letter logging ──────────────────────────────────────────────────────

check('defines writeDeadLetter function', () => {
  assert.match(routeContent, /function writeDeadLetter/);
});

check('calls writeDeadLetter on webhook processing failure', () => {
  assert.match(routeContent, /writeDeadLetter\(/);
});

check('inserts into webhook_dead_letters table', () => {
  assert.match(routeContent, /webhook_dead_letters/);
});

// ─── POST /api/billing/checkout ──────────────────────────────────────────────

check('registers POST /api/billing/checkout route', () => {
  assert.match(routeContent, /router\.post\(['"]\/api\/billing\/checkout['"]/);
});

check('POST /api/billing/checkout is protected by requireApiKey', () => {
  assert.match(routeContent, /router\.post\(['"]\/api\/billing\/checkout['"],\s*requireApiKey/);
});

check('POST /api/billing/checkout returns 400 when userId is missing', () => {
  assert.match(routeContent, /!userId.*!tier|!tier.*!userId/);
  assert.match(routeContent, /userId and tier are required/);
  assert.match(routeContent, /res\.status\(400\)/);
});

check('POST /api/billing/checkout delegates to BillingService.createCompleteSubscription', () => {
  assert.match(routeContent, /billing\.createCompleteSubscription/);
});

// ─── POST /api/billing/portal ────────────────────────────────────────────────

check('registers POST /api/billing/portal route', () => {
  assert.match(routeContent, /router\.post\(['"]\/api\/billing\/portal['"]/);
});

check('POST /api/billing/portal is protected by requireApiKey', () => {
  assert.match(routeContent, /router\.post\(['"]\/api\/billing\/portal['"],\s*requireApiKey/);
});

check('POST /api/billing/portal returns 400 when customerId is missing', () => {
  assert.match(routeContent, /!customerId/);
  assert.match(routeContent, /customerId is required/);
});

check('POST /api/billing/portal delegates to BillingService.createPortalSession', () => {
  assert.match(routeContent, /billing\.createPortalSession/);
});

// ─── GET /api/billing/status/:userId ─────────────────────────────────────────

check('registers GET /api/billing/status/:userId route', () => {
  assert.match(routeContent, /router\.get\(['"]\/api\/billing\/status\/:userId['"]/);
});

check('GET /api/billing/status/:userId is protected by requireApiKey', () => {
  assert.match(routeContent, /router\.get\(['"]\/api\/billing\/status\/:userId['"],\s*requireApiKey/);
});

check('GET /api/billing/status/:userId delegates to BillingService.getUserSubscriptionStatus', () => {
  assert.match(routeContent, /billing\.getUserSubscriptionStatus/);
});

// ─── Service wiring ───────────────────────────────────────────────────────────

check('imports BillingService class', () => {
  assert.match(routeContent, /require\('\.\.\/lib\/services\/BillingService'\)/);
});

check('instantiates BillingService', () => {
  assert.match(routeContent, /new BillingService\(\)/);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
