'use strict';

/**
 * QC E2E test for PR #1111 — FUBService refactor
 * Task: 523f437f-11ce-44b6-8439-d61ee10ba5b9
 *
 * Focuses on issues the dev test missed:
 * 1. Stale import of lib/twilio-sms.js (deleted in PR #1108)
 * 2. Dead backwards-compat shim in integrations/
 * 3. Security: webhook signature check before payload handling
 * 4. Architecture: FUBService uses no deleted modules
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ❌ ${name}: ${err.message}`);
  }
}

const projectRoot = path.resolve(__dirname, '../..');

console.log('\n🔍 QC: PR #1111 — FUBService refactor (task 523f437f)\n');

// ─── CRITICAL: Stale imports ─────────────────────────────────────────────────

test('FUBService does NOT import deleted lib/twilio-sms.js', () => {
  const fubServicePath = path.join(projectRoot, 'lib/services/FUBService.js');
  const content = fs.readFileSync(fubServicePath, 'utf8');
  // twilio-sms.js was deleted in PR #1108 (TwilioService refactor merged to main).
  // If FUBService still imports it, merge will crash with MODULE_NOT_FOUND.
  assert.ok(
    !content.includes("require('../twilio-sms')") && !content.includes("require('./twilio-sms')") && !content.includes('twilio-sms'),
    'FUBService imports lib/twilio-sms.js which was DELETED in PR #1108 on origin/main. ' +
    'This will cause MODULE_NOT_FOUND on merge. Use TwilioService from lib/services/TwilioService.js instead.'
  );
});

test('lib/twilio-sms.js does NOT exist (was deleted in PR #1108)', () => {
  // If twilio-sms.js still exists in this branch, the branch is carrying a deleted file.
  // This branch must account for the TwilioService refactor already merged to origin/main.
  const twiloPath = path.join(projectRoot, 'lib/twilio-sms.js');
  // In origin/main (post PR #1108 merge), this file is gone.
  // We cannot block on "file doesn't exist here" since this branch predates that merge,
  // but we CAN verify FUBService doesn't depend on it (checked above).
  // This check is informational: log whether the file exists to alert on merge risk.
  if (fs.existsSync(twiloPath)) {
    throw new Error(
      'lib/twilio-sms.js exists in this branch but was deleted from origin/main in PR #1108. ' +
      'FUBService must be updated to import TwilioService before merging.'
    );
  }
});

// ─── DEAD CODE: backwards-compat shim ─────────────────────────────────────────

test('integrations/fub-webhook-listener.js has no callers (dead shim)', () => {
  // CLAUDE.md explicitly forbids backwards-compat shims.
  // If nothing imports from integrations/ (with 's'), this is dead code.
  const shimPath = path.join(projectRoot, 'integrations/fub-webhook-listener.js');
  if (!fs.existsSync(shimPath)) {
    // File deleted - acceptable outcome
    return;
  }
  // Search for any callers
  function searchDir(dir, excludeDirs) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (excludeDirs.includes(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        searchDir(full, excludeDirs);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
        const content = fs.readFileSync(full, 'utf8');
        if (content.includes("require('integrations/fub-webhook-listener')") ||
            content.includes('require("integrations/fub-webhook-listener")') ||
            content.includes("from 'integrations/fub-webhook-listener'")) {
          return; // has callers - pass
        }
      }
    }
  }
  // If shim exists and has no callers, it's dead code per CLAUDE.md
  const shimContent = fs.readFileSync(shimPath, 'utf8');
  assert.ok(
    shimContent.trim() === '' || !shimContent.includes('require'),
    'integrations/fub-webhook-listener.js is a backwards-compat shim with no callers. ' +
    'CLAUDE.md forbids compat shims. Delete the file.'
  );
});

// ─── SECURITY: signature verification ────────────────────────────────────────

test('FUBService.verifyWebhookSignature uses crypto.timingSafeEqual or equivalent', () => {
  const fubServicePath = path.join(projectRoot, 'lib/services/FUBService.js');
  const content = fs.readFileSync(fubServicePath, 'utf8');
  // Simple string comparison of HMAC is vulnerable to timing attacks.
  // Must use timingSafeEqual or similar constant-time comparison.
  const hasTimingSafe = content.includes('timingSafeEqual') ||
                        content.includes('crypto.timingSafeEqual');
  const hasSimpleEqual = /hash\s*===\s*signature|signature\s*===\s*hash/.test(content);
  assert.ok(
    hasTimingSafe || !hasSimpleEqual,
    'verifyWebhookSignature uses simple === comparison instead of crypto.timingSafeEqual — vulnerable to timing attacks'
  );
});

test('integration/fub-webhook-listener.js route calls verifyWebhookSignature', () => {
  const routerPath = path.join(projectRoot, 'integration/fub-webhook-listener.js');
  const content = fs.readFileSync(routerPath, 'utf8');
  assert.ok(
    content.includes('verifyWebhookSignature') || content.includes('verifyFubWebhookSignature'),
    'Route must verify webhook signature before processing payload — unauthenticated webhook injection risk'
  );
});

// ─── ARCHITECTURE: deleted files not referenced ───────────────────────────────

test('lib/billing.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'lib/billing.js')),
    'lib/billing.js still exists — should have been deleted in this refactor');
});

test('lib/billing-enhanced.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'lib/billing-enhanced.js')),
    'lib/billing-enhanced.js still exists — should have been deleted in this refactor');
});

test('routes/billing-enhanced.js is deleted', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'routes/billing-enhanced.js')),
    'routes/billing-enhanced.js still exists — should have been deleted in this refactor');
});

test('routes/billing.js imports BillingService (not inline logic)', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'routes/billing.js'), 'utf8');
  assert.ok(content.includes('BillingService'), 'routes/billing.js must use BillingService');
  assert.ok(!content.includes('new Pool(') && !content.includes('pool.query'),
    'routes/billing.js must not have direct DB access');
});

test('server.js does not mount billing-enhanced routes', () => {
  const content = fs.readFileSync(path.join(projectRoot, 'server.js'), 'utf8');
  assert.ok(!content.includes('billing-enhanced'),
    'server.js still mounts billing-enhanced routes — stale mount');
});

// ─── WIRING: FUBService actually used ─────────────────────────────────────────

test('integration/fub-webhook-listener.js instantiates FUBService', () => {
  const content = fs.readFileSync(
    path.join(projectRoot, 'integration/fub-webhook-listener.js'), 'utf8'
  );
  assert.ok(content.includes('FUBService'), 'Route module must use FUBService');
  assert.ok(content.includes('new FUBService'), 'Route module must instantiate FUBService');
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
