'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const routePath = path.join(__dirname, '..', '..', 'routes', 'calcom-webhook.js');
const routeContent = fs.readFileSync(routePath, 'utf8');

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

console.log('\n=== route: Cal.com admin API ===\n');

// ─── Auth middleware ──────────────────────────────────────────────────────────

check('defines requireApiKey middleware', () => {
  assert.match(routeContent, /function requireApiKey/);
});

check('requireApiKey checks x-api-key header', () => {
  assert.match(routeContent, /x-api-key/);
});

check('requireApiKey returns 401 when key is missing or wrong', () => {
  assert.match(routeContent, /res\.status\(401\)/);
});

check('requireApiKey compares against LEADFLOW_API_KEY env var', () => {
  assert.match(routeContent, /LEADFLOW_API_KEY/);
});

// ─── GET /api/calcom/webhooks ────────────────────────────────────────────────

check('registers GET /api/calcom/webhooks route', () => {
  assert.match(routeContent, /router\.get\(['"]\/api\/calcom\/webhooks['"]/);
});

check('GET /api/calcom/webhooks is protected by requireApiKey', () => {
  assert.match(routeContent, /router\.get\(['"]\/api\/calcom\/webhooks['"],\s*requireApiKey/);
});

check('GET /api/calcom/webhooks delegates to CalcomWebhookManagement.listWebhooks', () => {
  assert.match(routeContent, /management\.listWebhooks/);
});

// ─── POST /api/calcom/webhooks ───────────────────────────────────────────────

check('registers POST /api/calcom/webhooks route', () => {
  assert.match(routeContent, /router\.post\(['"]\/api\/calcom\/webhooks['"]/);
});

check('POST /api/calcom/webhooks is protected by requireApiKey', () => {
  assert.match(routeContent, /router\.post\(['"]\/api\/calcom\/webhooks['"],\s*requireApiKey/);
});

check('POST /api/calcom/webhooks delegates to CalcomWebhookManagement.registerWebhook', () => {
  assert.match(routeContent, /management\.registerWebhook/);
});

// ─── Service wiring ───────────────────────────────────────────────────────────

check('imports CalcomWebhookManagement service', () => {
  assert.match(routeContent, /require\('\.\.\/lib\/services\/CalcomWebhookManagement'\)/);
});

check('instantiates CalcomWebhookManagement', () => {
  assert.match(routeContent, /new CalcomWebhookManagement\(\)/);
});

check('imports CalcomWebhookHandler service', () => {
  assert.match(routeContent, /require\('\.\.\/lib\/services\/CalcomWebhookHandler'\)/);
});

check('instantiates CalcomWebhookHandler', () => {
  assert.match(routeContent, /new CalcomWebhookHandler\(\)/);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
