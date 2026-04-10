'use strict';

/**
 * QC E2E test: EmailService class refactor (task 61bfa13a)
 * Verifies the EmailService class and checks for regressions introduced in this PR.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=== QC E2E: EmailService class (61bfa13a) ===\n');

const EmailService = require(path.join(__dirname, '..', 'lib', 'services', 'EmailService'));

// 1. EmailService class exists and is importable
check('EmailService class exports correctly', () => {
  assert.strictEqual(typeof EmailService, 'function', 'EmailService must be a constructor');
});

// 2. Constructor trims API key (regression: PR removed .trim() from email-service.ts)
check('constructor trims apiKey whitespace', () => {
  const svc = new EmailService({ apiKey: '  abc123  ' });
  assert.strictEqual(svc.apiKey, 'abc123', 'API key must be trimmed');
});

// 3. Constructor trims fromEmail whitespace
check('constructor trims fromEmail whitespace', () => {
  const svc = new EmailService({ apiKey: 'k', fromEmail: '  test@test.com  ' });
  assert.strictEqual(svc.fromEmail, 'test@test.com', 'fromEmail must be trimmed');
});

// 4. isConfigured() false without key
check('isConfigured() returns false without API key', () => {
  const svc = new EmailService({ apiKey: '' });
  assert.strictEqual(svc.isConfigured(), false);
});

// 5. isConfigured() true with key
check('isConfigured() returns true with API key', () => {
  const svc = new EmailService({ apiKey: 'test-key' });
  assert.strictEqual(svc.isConfigured(), true);
});

// --- Regression checks ---

// 6. email-service.ts still exports sendPasswordResetEmail (CRITICAL)
check('email-service.ts still exports sendPasswordResetEmail', () => {
  const emailServicePath = path.join(
    __dirname, '..', 'product', 'lead-response', 'dashboard', 'lib', 'email-service.ts'
  );
  const src = fs.readFileSync(emailServicePath, 'utf8');
  assert.ok(
    src.includes('sendPasswordResetEmail'),
    'sendPasswordResetEmail must be exported from email-service.ts — forgot-password/route.ts imports it'
  );
});

// 7. email-service.ts retains .trim() on RESEND_API_KEY (regression guard)
check('email-service.ts retains .trim() on RESEND_API_KEY', () => {
  const emailServicePath = path.join(
    __dirname, '..', 'product', 'lead-response', 'dashboard', 'lib', 'email-service.ts'
  );
  const src = fs.readFileSync(emailServicePath, 'utf8');
  assert.ok(
    src.includes('RESEND_API_KEY') && src.includes('.trim()'),
    'email-service.ts must .trim() the RESEND_API_KEY to guard against env file whitespace/newlines'
  );
});

// 8. FROM_EMAIL fallback must use verified Resend domain (regression guard)
check('email-service.ts FROM_EMAIL fallback is a verified Resend domain', () => {
  const emailServicePath = path.join(
    __dirname, '..', 'product', 'lead-response', 'dashboard', 'lib', 'email-service.ts'
  );
  const src = fs.readFileSync(emailServicePath, 'utf8');
  // billing@leadflow.ai is an unverified domain — will bounce in production
  assert.ok(
    !src.includes('billing@leadflow.ai'),
    'FROM_EMAIL fallback must not be billing@leadflow.ai (unverified domain). Use onboarding@resend.dev or a verified domain.'
  );
});

// 9. stripe-subscriptions/index.js must not require deleted routes/billing
check('stripe-subscriptions/index.js does not require deleted routes/billing.js', () => {
  const indexPath = path.join(__dirname, '..', 'stripe-subscriptions', 'index.js');
  const src = fs.readFileSync(indexPath, 'utf8');
  assert.ok(
    !src.includes("require('../routes/billing')"),
    "stripe-subscriptions/index.js requires deleted routes/billing.js — will throw at load time"
  );
});

// 10. click_tracking disabled in email sends (regression: protects reset token URLs)
check('email-service.ts disables click_tracking to protect reset token URLs', () => {
  const emailServicePath = path.join(
    __dirname, '..', 'product', 'lead-response', 'dashboard', 'lib', 'email-service.ts'
  );
  const src = fs.readFileSync(emailServicePath, 'utf8');
  assert.ok(
    src.includes('click_tracking'),
    'click_tracking must be explicitly disabled in email sends — Resend rewrites URLs through resend-clicks.com, breaking reset token query params'
  );
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
