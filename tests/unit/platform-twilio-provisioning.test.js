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

let _dbQueryResult = null;

function createMockDb() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: _dbQueryResult, error: null }),
        }),
      }),
      insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  };
}

/** Set env vars, create service, return { svc, restore }. Caller MUST call restore(). */
function createService(envOverrides = {}) {
  const saved = {};
  for (const [k, v] of Object.entries(envOverrides)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const svc = new TwilioService({ db: createMockDb() });
  const restore = () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
  return { svc, restore };
}

class PlatformTwilioProvisioningUnitSuite {
  constructor() { this.passed = 0; this.failed = 0; this.tests = []; }

  record(name, ok, detail) {
    this.tests.push({ name, ok, detail });
    if (ok) { this.passed++; console.log(`  \u2705 ${name}`); }
    else { this.failed++; console.error(`  \u274c ${name}: ${detail}`); }
  }

  async testPlatformFallback() {
    console.log('\n--- TEST 1: Platform fallback (no agent creds) ---');
    _dbQueryResult = null;
    const { svc, restore } = createService({
      TWILIO_ACCOUNT_SID: 'ACfakeplatformsid00000000000000000',
      TWILIO_AUTH_TOKEN: 'fakeplatformtoken',
      TWILIO_PHONE_NUMBER_US: '+15550001111',
    });
    try {
      const ctx = await svc.resolveTwilioContext('agent-123', '+14165551234', 'us');
      assert.strictEqual(ctx.mode, 'platform');
      assert.strictEqual(ctx.fromNumber, '+15550001111');
      assert.ok(ctx.client);
      this.record('Uses platform credentials when no agent creds', true);
    } catch (err) {
      this.record('Uses platform credentials when no agent creds', false, err.message);
    } finally { restore(); }
  }

  async testCustomerCredentials() {
    console.log('\n--- TEST 2: Customer credentials ---');
    _dbQueryResult = {
      twilio_account_sid: 'ACfakecustomersid000000000000000000',
      twilio_auth_token: 'fakecustomertoken',
      twilio_phone_e164: '+15559998888',
      twilio_phone_number: '5559998888',
    };
    const { svc, restore } = createService({
      TWILIO_ACCOUNT_SID: 'ACfakeplatform00000000000000000000',
      TWILIO_AUTH_TOKEN: 'fakeplatformtoken',
      TWILIO_PHONE_NUMBER_US: '+15550001111',
    });
    try {
      const ctx = await svc.resolveTwilioContext('agent-456', '+14165551234', 'us');
      assert.strictEqual(ctx.mode, 'customer');
      assert.strictEqual(ctx.fromNumber, '+15559998888');
      assert.ok(ctx.client);
      this.record('Uses customer credentials', true);
    } catch (err) {
      this.record('Uses customer credentials', false, err.message);
    } finally { _dbQueryResult = null; restore(); }
  }

  async testNoCredentialsThrows() {
    console.log('\n--- TEST 3: No credentials -> clear error ---');
    _dbQueryResult = null;
    const { svc, restore } = createService({
      TWILIO_ACCOUNT_SID: undefined, TWILIO_AUTH_TOKEN: undefined,
      TWILIO_PHONE_NUMBER_US: undefined, TWILIO_PHONE_NUMBER_CA: undefined,
      TWILIO_PHONE_NUMBER: undefined,
    });
    let threw = false;
    try { await svc.resolveTwilioContext(null, '+14165551234', undefined); }
    catch (err) {
      threw = true;
      const ok = err.message.includes('No Twilio credentials') ||
        err.message.includes('No Twilio phone number') ||
        err.message.includes('not configured');
      this.record('Throws clear error when no credentials', ok, ok ? '' : err.message);
    } finally { restore(); }
    if (!threw) this.record('Throws clear error when no credentials', false, 'Did not throw');
  }

  async testSelectFromNumber() {
    console.log('\n--- TEST 4: selectFromNumber backward compat ---');
    const { svc, restore } = createService({ TWILIO_PHONE_NUMBER_US: '+15550001111' });
    try {
      const r = svc.selectFromNumber('us', '+14165551234');
      assert.ok(typeof r === 'string');
      this.record('selectFromNumber returns string', true);
    } catch (err) { this.record('selectFromNumber returns string', false, err.message); }
    finally { restore(); }
  }

  async testValidateSmsInputRejectsEmpty() {
    console.log('\n--- TEST 5: validateSmsInput rejects empty ---');
    const { svc, restore } = createService();
    let threw = false;
    try { svc.validateSmsInput('', 'hello'); } catch { threw = true; }
    this.record('throws on empty phone', threw, threw ? '' : 'Did not throw');
    threw = false;
    try { svc.validateSmsInput('+14165551234', ''); } catch { threw = true; }
    this.record('throws on empty message', threw, threw ? '' : 'Did not throw');
    restore();
  }

  async testCustomerCredentialsTakePrecedence() {
    console.log('\n--- TEST 6: Customer creds take precedence ---');
    _dbQueryResult = {
      twilio_account_sid: 'ACfakecustomersid000000000000000000',
      twilio_auth_token: 'fakecustomertoken',
      twilio_phone_e164: '+15559991111',
      twilio_phone_number: '5559991111',
    };
    const { svc, restore } = createService({
      TWILIO_ACCOUNT_SID: 'ACfakeplatform00000000000000000000',
      TWILIO_AUTH_TOKEN: 'fakeplatformtoken2',
      TWILIO_PHONE_NUMBER_US: '+15550001111',
    });
    try {
      const ctx = await svc.resolveTwilioContext('agent-789', '+14165551234', 'us');
      assert.strictEqual(ctx.mode, 'customer');
      assert.strictEqual(ctx.fromNumber, '+15559991111');
      this.record('Customer creds take precedence', true);
    } catch (err) { this.record('Customer creds take precedence', false, err.message); }
    finally { _dbQueryResult = null; restore(); }
  }

  printReport() {
    console.log('\n' + '='.repeat(60));
    console.log('PLATFORM TWILIO PROVISIONING \u2014 UNIT TEST REPORT');
    console.log('='.repeat(60));
    const total = this.passed + this.failed;
    console.log(`Passed: ${this.passed}  Failed: ${this.failed}  Total: ${total}`);
    console.log(`Pass rate: ${total > 0 ? ((this.passed / total) * 100).toFixed(0) : 0}%`);
    this.tests.forEach((t, i) => {
      const icon = t.ok ? '\u2705' : '\u274c';
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
  await suite.testCustomerCredentialsTakePrecedence();
  const report = suite.printReport();
  if (report.failed > 0) process.exitCode = 1;
  return report;
}

module.exports = { PlatformTwilioProvisioningUnitSuite };
if (require.main === module) run().catch(e => { console.error(e); process.exitCode = 1; });
