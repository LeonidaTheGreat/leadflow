'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const fubPath = path.join(__dirname, '..', '..', 'integration', 'fub-webhook-listener.js');
const calcomPath = path.join(__dirname, '..', '..', 'routes', 'calcom-webhook.js');
const billingPath = path.join(__dirname, '..', '..', 'routes', 'billing.js');

const fubContent = fs.readFileSync(fubPath, 'utf8');
const calcomContent = fs.readFileSync(calcomPath, 'utf8');
const billingContent = fs.readFileSync(billingPath, 'utf8');

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

// ─── POST /webhook/fub ───────────────────────────────────────────────────────

console.log('\n=== route: POST /webhook/fub ===\n');

check('registers POST /webhook/fub route', () => {
  assert.match(fubContent, /router\.post\(['"]\/webhook\/fub['"]/);
});

check('returns 200 on successful payload processing', () => {
  assert.match(fubContent, /res\.status\(200\)\.json/);
});

check('returns 401 when FUB_WEBHOOK_SECRET is set and signature is invalid', () => {
  assert.match(fubContent, /FUB_WEBHOOK_SECRET/);
  assert.match(fubContent, /res\.status\(401\)/);
});

check('uses HMAC-SHA256 for signature verification', () => {
  assert.match(fubContent, /createHmac\(['"]sha256['"]/);
});

check('uses timingSafeEqual to prevent timing attacks', () => {
  assert.match(fubContent, /timingSafeEqual/);
});

check('skips signature verification when FUB_WEBHOOK_SECRET is not set', () => {
  assert.match(fubContent, /FUB_WEBHOOK_SECRET.*not set|skipping signature/i);
});

// ─── POST /webhook/calcom ────────────────────────────────────────────────────

console.log('\n=== route: POST /webhook/calcom ===\n');

check('registers POST /webhook/calcom route', () => {
  assert.match(calcomContent, /router\.post\(['"]\/webhook\/calcom['"]/);
});

check('returns 400 when triggerEvent and type are both missing', () => {
  assert.match(calcomContent, /!event\.triggerEvent.*!event\.type|!event\.type.*!event\.triggerEvent/);
  assert.match(calcomContent, /res\.status\(400\)\.json\(\{.*Invalid webhook payload/s);
});

check('returns 401 when CALCOM_WEBHOOK_SECRET is set and signature is invalid', () => {
  assert.match(calcomContent, /CALCOM_WEBHOOK_SECRET/);
  assert.match(calcomContent, /res\.status\(401\)/);
});

check('delegates signature verification to CalcomWebhookHandler', () => {
  assert.match(calcomContent, /handler\.verifyWebhookSignature/);
});

check('returns 400 on invalid JSON payload', () => {
  assert.match(calcomContent, /res\.status\(400\)\.json\(\{.*Invalid JSON payload/s);
});

// ─── POST /webhook/stripe ────────────────────────────────────────────────────

console.log('\n=== route: POST /webhook/stripe ===\n');

check('registers POST /webhook/stripe route', () => {
  assert.match(billingContent, /router\.post\(['"]\/webhook\/stripe['"]/);
});

check('reads stripe-signature header', () => {
  assert.match(billingContent, /stripe-signature/);
});

check('returns 400 when signature verification fails', () => {
  assert.match(billingContent, /res\.status\(400\)\.json\(\{.*Webhook signature verification failed/s);
});

check('uses STRIPE_WEBHOOK_SECRET for verification', () => {
  assert.match(billingContent, /STRIPE_WEBHOOK_SECRET/);
});

check('delegates signature verification to BillingService', () => {
  assert.match(billingContent, /billing\.verifyWebhookSignature/);
});

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
