/**
 * Unit Tests: Platform-Owned Twilio Provisioning
 *
 * Verifies that:
 *   1. SMS uses platform credentials when no agent credentials are configured
 *   2. SMS uses customer credentials when an agent has their own Twilio account
 *   3. Fails fast with a clear error when neither platform nor customer creds exist
 *   4. Backward-compatible: selectFromNumber still works as before
 */

'use strict';

const assert = require('assert');
const TwilioService = require('../../lib/services/TwilioService');

// ============================================================
// Helpers
// ============================================================

function makeMockDb(queryResult) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: queryResult, error: null }),
        }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  };
}

// ============================================================
// Test Suite
// ============================================================

class PlatformTwilioProvisioningUnitSuite {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  record(name, ok, detail) {
    this.tests.push({ name, ok, detail });
    if (ok) {
      this.passed++;
      console.log(`  ✅ ${name}`);
    } else {
      this.failed++;
      console.error(`  ❌ ${name}: ${detail}`);
    }
  }

  async testPlatformFallback() {
    console.log('\n--- TEST 1: Platform fallback (no agent creds) ---');
    const platformPhone = '+15550001111';
    const origSid = process.env.TWILIO_ACCOUNT_SID;
    const origToken = process.env.TWILIO_AUTH_TOKEN;
    const origPhone = process.env.TWILIO_PHONE_NUMBER_US;
    process.env.TWILIO_ACCOUNT_SID = 'ACfakeplatformsid00000000000000000';
    process.env.TWILIO_AUTH_TOKEN = 'fakeplatformtoken';
    process.env.TWILIO_PHONE_NUMBER_US = platformPhone;
    try {
      const service = new TwilioService({ db: makeMockDb(null) });
      const ctx = await service.resolveTwilioContext('agent-123', '+14165551234', 'us');
      assert.strictEqual(ctx.mode, 'platform');
      assert.strictEqual(ctx.fromNumber, platformPhone);
      assert.ok(ctx.client);
      this.record('Uses platform credentials when no agent creds', true);
    } catch (err) {
      this.record('Uses platform credentials when no agent creds', false, err.message);
    } finally {
      if (origSid !== undefined) process.env.TWILIO_ACCOUNT_SID = origSid; else delete process.env.TWILIO_ACCOUNT_SID;
      if (origToken !== undefined) process.env.TWILIO_AUTH_TOKEN = origToken; else delete process.env.TWILIO_AUTH_TOKEN;
      if (origPhone !== undefined) process.env.TWILIO_PHONE_NUMBER_US = origPhone; else delete process.env.TWILIO_PHONE_NUMBER_US;
    }
  }

  async testCustomerCredentials() {
    console.log('\n--- TEST 2: Customer credentials (agent has own Twilio) ---');
    const customerRow = {
      twilio_account_sid: 'ACfakecustomersid000000000000000000',
      twilio_auth_token: 'fakecustomertoken',
      twilio_phone_e164: '+15559998888',
      twilio_phone_number: '5559998888',
    };
    try {
      const service = new TwilioService({ db: makeMockDb(customerRow) });
      const ctx = await service.resolveTwilioContext('agent-456', '+14165551234', 'us');
      assert.strictEqual(ctx.mode, 'customer');
      assert.strictEqual(ctx.fromNumber, '+15559998888');
      assert.ok(ctx.client);
      this.record('Uses customer credentials when agent has own Twilio account', true);
    } catch (err) {
      this.record('Uses customer credentials when agent has own Twilio account', false, err.message);
    }
  }

  async testNoCredentialsThrows() {
    console.log('\n--- TEST 3: No credentials → clear error ---');
    const origSid = process.env.TWILIO_ACCOUNT_SID;
    const origToken = process.env.TWILIO_AUTH_TOKEN;
    const origPhoneUs = process.env.TWILIO_PHONE_NUMBER_US;
    const origPhoneCa = process.env.TWILIO_PHONE_NUMBER_CA;
    const origPhoneLegacy = process.env.TWILIO_PHONE_NUMBER;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER_US;
    delete process.env.TWILIO_PHONE_NUMBER_CA;
    delete process.env.TWILIO_PHONE_NUMBER;
    let threw = false;
    try {
      const service = new TwilioService({ db: makeMockDb(null) });
      await service.resolveTwilioContext(null, '+14165551234', undefined);
    } catch (err) {
      threw = true;
      const hasGoodMessage = err.message.includes('No Twilio credentials') || err.message.includes('No Twilio phone number') || err.message.includes('not configured');
      this.record('Throws clear error when no credentials available', hasGoodMessage, hasGoodMessage ? '' : `Bad error message: ${err.message}`);
    }
    if (!threw) this.record('Throws clear error when no credentials available', false, 'Did not throw');
    if (origSid !== undefined) process.env.TWILIO_ACCOUNT_SID = origSid;
    if (origToken !== undefined) process.env.TWILIO_AUTH_TOKEN = origToken;
    if (origPhoneUs !== undefined) process.env.TWILIO_PHONE_NUMBER_US = origPhoneUs;
    if (origPhoneCa !== undefined) process.env.TWILIO_PHONE_NUMBER_CA = origPhoneCa;
    if (origPhoneLegacy !== undefined) process.env.TWILIO_PHONE_NUMBER = origPhoneLegacy;
  }

  async testSelectFromNumber() {
    console.log('\n--- TEST 4: selectFromNumber backward compatibility ---');
    const phone = '+15550001111';
    const origPhone = process.env.TWILIO_PHONE_NUMBER_US;
    process.env.TWILIO_PHONE_NUMBER_US = phone;
    try {
      const service = new TwilioService();
      const result = service.selectFromNumber('us', '+14165551234');
      assert.ok(typeof result === 'string');
      this.record('selectFromNumber returns string (backward compat)', true);
    } catch (err) {
      this.record('selectFromNumber returns string (backward compat)', false, err.message);
    } finally {
      if (origPhone !== undefined) process.env.TWILIO_PHONE_NUMBER_US = origPhone; else delete process.env.TWILIO_PHONE_NUMBER_US;
    }
  }

  async testValidateSmsInputRejectsEmpty() {
    console.log('\n--- TEST 5: validateSmsInput rejects empty inputs ---');
    const service = new TwilioService();
    let threw = false;
    try { service.validateSmsInput('', 'hello'); } catch { threw = true; }
    this.record('validateSmsInput throws on empty phone', threw, threw ? '' : 'Did not throw');
    threw = false;
    try { service.validateSmsInput('+14165551234', ''); } catch { threw = true; }
    this.record('validateSmsInput throws on empty message', threw, threw ? '' : 'Did not throw');
  }

  async testCustomerCredentialsTakePrecedenceOverPlatform() {
    console.log('\n--- TEST 6: Customer creds take precedence over platform ---');
    const customerRow = { twilio_account_sid: 'ACfakecustomersid000000000000000000', twilio_auth_token: 'fakecustomertoken', twilio_phone_e164: '+15559991111', twilio_phone_number: '5559991111' };
    const origSid = process.env.TWILIO_ACCOUNT_SID;
    const origToken = process.env.TWILIO_AUTH_TOKEN;
    process.env.TWILIO_ACCOUNT_SID = 'ACfakeplatform00000000000000000000';
    process.env.TWILIO_AUTH_TOKEN = 'fakeplatformtoken2';
    try {
      const service = new TwilioService({ db: makeMockDb(customerRow) });
      const ctx = await service.resolveTwilioContext('agent-789', '+14165551234', 'us');
      assert.strictEqual(ctx.mode, 'customer');
      assert.strictEqual(ctx.fromNumber, '+15559991111');
      this.record('Customer creds take precedence over platform when both present', true);
    } catch (err) {
      this.record('Customer creds take precedence over platform when both present', false, err.message);
    } finally {
      if (origSid !== undefined) process.env.TWILIO_ACCOUNT_SID = origSid; else delete process.env.TWILIO_ACCOUNT_SID;
      if (origToken !== undefined) process.env.TWILIO_AUTH_TOKEN = origToken; else delete process.env.TWILIO_AUTH_TOKEN;
    }
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('PLATFORM TWILIO PROVISIONING — UNIT TEST REPORT');
    console.log('='.repeat(60));
    const total = this.passed + this.failed;
    console.log(`Passed: ${this.passed}  Failed: ${this.failed}  Total: ${total}`);
    console.log(`Pass rate: ${total > 0 ? ((this.passed / total) * 100).toFixed(0) : 0}%`);
    this.tests.forEach((t, i) => {
      const icon = t.ok ? '✅' : '❌';
      const detail = t.detail ? ` (${t.detail})` : '';
      console.log(`${i + 1}. ${icon} ${t.name}${detail}`);
    });
    console.log('='.repeat(60));
    return { passed: this.passed, failed: this.failed, total };
  }
}

async function run() {
  const suite = new PlatformTwilioProvisioningUnitSuite();
  await suite.testPlatformFallback();
  await suite.testCustomerCredentials();
  await suite.testNoCredentialsThrows();
  await suite.testSelectFromNumber();
  await suite.testValidateSmsInputRejectsEmpty();
  await suite.testCustomerCredentialsTakePrecedenceOverPlatform();
  const report = suite.printReport();
  if (report.failed > 0) process.exitCode = 1;
  return report;
}

module.exports = { PlatformTwilioProvisioningUnitSuite };
if (require.main === module) run().catch(err => { console.error('Test runner error:', err); process.exitCode = 1; });
