'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const SystemStatusService = require('../../lib/services/SystemStatusService');

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

// ─── SystemStatusService: Stripe env var checks ───────────────────────────────

console.log('\n=== SystemStatusService: Stripe env var reporting ===\n');

check('getHealthStatus includes stripe_webhook_secret when missing', () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    const svc = new SystemStatusService();
    const status = svc.getHealthStatus();
    assert.strictEqual(status.stripe_webhook_secret, 'missing',
      `Expected 'missing', got '${status.stripe_webhook_secret}'`);
  } finally {
    if (original !== undefined) process.env.STRIPE_WEBHOOK_SECRET = original;
  }
});

check('getHealthStatus reports stripe_webhook_secret as configured when set', () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  try {
    const svc = new SystemStatusService();
    const status = svc.getHealthStatus();
    assert.strictEqual(status.stripe_webhook_secret, 'configured',
      `Expected 'configured', got '${status.stripe_webhook_secret}'`);
  } finally {
    if (original !== undefined) process.env.STRIPE_WEBHOOK_SECRET = original;
    else delete process.env.STRIPE_WEBHOOK_SECRET;
  }
});

check('getHealthStatus includes stripe_secret_key when missing', () => {
  const original = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    const svc = new SystemStatusService();
    const status = svc.getHealthStatus();
    assert.strictEqual(status.stripe_secret_key, 'missing',
      `Expected 'missing', got '${status.stripe_secret_key}'`);
  } finally {
    if (original !== undefined) process.env.STRIPE_SECRET_KEY = original;
  }
});

check('getHealthStatus reports stripe_secret_key as configured when set', () => {
  const original = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
  try {
    const svc = new SystemStatusService();
    const status = svc.getHealthStatus();
    assert.strictEqual(status.stripe_secret_key, 'configured',
      `Expected 'configured', got '${status.stripe_secret_key}'`);
  } finally {
    if (original !== undefined) process.env.STRIPE_SECRET_KEY = original;
    else delete process.env.STRIPE_SECRET_KEY;
  }
});

check('getHealthStatus still returns status ok and timestamp', () => {
  const svc = new SystemStatusService();
  const status = svc.getHealthStatus();
  assert.strictEqual(status.status, 'ok');
  assert.ok(status.timestamp, 'Missing timestamp');
});

// ─── Next.js health route: STRIPE vars in requiredEnvVars ─────────────────────

console.log('\n=== Next.js health route: STRIPE env vars required ===\n');

check('health route source includes STRIPE_SECRET_KEY in requiredEnvVars', () => {
  const routePath = path.join(
    __dirname, '..', '..', 'product', 'lead-response', 'dashboard',
    'app', 'api', 'health', 'route.ts'
  );
  const src = fs.readFileSync(routePath, 'utf8');
  assert.ok(src.includes("'STRIPE_SECRET_KEY'"),
    'STRIPE_SECRET_KEY not found in requiredEnvVars');
});

check('health route source includes STRIPE_WEBHOOK_SECRET in requiredEnvVars', () => {
  const routePath = path.join(
    __dirname, '..', '..', 'product', 'lead-response', 'dashboard',
    'app', 'api', 'health', 'route.ts'
  );
  const src = fs.readFileSync(routePath, 'utf8');
  assert.ok(src.includes("'STRIPE_WEBHOOK_SECRET'"),
    'STRIPE_WEBHOOK_SECRET not found in requiredEnvVars');
});

check('health route marks STRIPE_SECRET_KEY as critical', () => {
  const routePath = path.join(
    __dirname, '..', '..', 'product', 'lead-response', 'dashboard',
    'app', 'api', 'health', 'route.ts'
  );
  const src = fs.readFileSync(routePath, 'utf8');
  const criticalSection = src.match(/criticalKeys\s*=\s*\[([\s\S]*?)\]/)?.[0] || '';
  assert.ok(criticalSection.includes("'STRIPE_SECRET_KEY'"),
    'STRIPE_SECRET_KEY not in criticalKeys — health will not surface it as critical');
});

check('health route marks STRIPE_WEBHOOK_SECRET as critical', () => {
  const routePath = path.join(
    __dirname, '..', '..', 'product', 'lead-response', 'dashboard',
    'app', 'api', 'health', 'route.ts'
  );
  const src = fs.readFileSync(routePath, 'utf8');
  const criticalSection = src.match(/criticalKeys\s*=\s*\[([\s\S]*?)\]/)?.[0] || '';
  assert.ok(criticalSection.includes("'STRIPE_WEBHOOK_SECRET'"),
    'STRIPE_WEBHOOK_SECRET not in criticalKeys — health will not surface it as critical');
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
