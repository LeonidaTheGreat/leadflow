'use strict';

/*
 * Spec:
 *   What:   Test lib/config/index.js exports — constants, domain config groups,
 *           env-var resolution, defaults, and production startup guard.
 *   Verify: npx jest --testPathPatterns index  — all tests green.
 *   Boundaries: Do NOT touch lib/config/index.js or any service file.
 */

describe('lib/config/index — named constants', () => {
  const config = require('../lib/config/index');

  it('exports TRIAL_PERIOD_DAYS as 14', () => {
    expect(config.TRIAL_PERIOD_DAYS).toBe(14);
  });

  it('exports PILOT_TRIAL_DAYS as 90', () => {
    expect(config.PILOT_TRIAL_DAYS).toBe(90);
  });

  it('exports MAX_DEAD_LETTER_RETRIES as 5', () => {
    expect(config.MAX_DEAD_LETTER_RETRIES).toBe(5);
  });

  it('exports CIRCUIT_BREAKER_RESET_MS as 30000', () => {
    expect(config.CIRCUIT_BREAKER_RESET_MS).toBe(30_000);
  });
});

describe('lib/config/index — stripe config group', () => {
  const config = require('../lib/config/index');

  it('has all required stripe keys', () => {
    expect(config.stripe).toHaveProperty('secretKey');
    expect(config.stripe).toHaveProperty('webhookSecret');
    expect(config.stripe).toHaveProperty('portalReturnUrl');
    expect(config.stripe).toHaveProperty('prices');
  });

  it('stripe.portalReturnUrl defaults to landyourleads.com/dashboard', () => {
    const original = process.env.STRIPE_PORTAL_RETURN_URL;
    delete process.env.STRIPE_PORTAL_RETURN_URL;
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.stripe.portalReturnUrl).toBe('https://landyourleads.com/dashboard');
    if (original !== undefined) process.env.STRIPE_PORTAL_RETURN_URL = original;
  });

  it('stripe.portalReturnUrl reads from env when set', () => {
    process.env.STRIPE_PORTAL_RETURN_URL = 'https://custom.example.com/portal';
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.stripe.portalReturnUrl).toBe('https://custom.example.com/portal');
    delete process.env.STRIPE_PORTAL_RETURN_URL;
  });

  it('stripe prices object has starter/professional/enterprise tiers', () => {
    expect(config.stripe.prices).toHaveProperty('starter');
    expect(config.stripe.prices).toHaveProperty('professional');
    expect(config.stripe.prices).toHaveProperty('enterprise');
  });

  it('each stripe price tier has month and year keys', () => {
    for (const tier of ['starter', 'professional', 'enterprise']) {
      expect(config.stripe.prices[tier]).toHaveProperty('month');
      expect(config.stripe.prices[tier]).toHaveProperty('year');
    }
  });

  it('stripe.secretKey is null when STRIPE_SECRET_KEY not set', () => {
    const original = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.stripe.secretKey).toBeNull();
    if (original !== undefined) process.env.STRIPE_SECRET_KEY = original;
  });

  it('stripe.secretKey reads from env when set', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc123';
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.stripe.secretKey).toBe('sk_test_abc123');
    delete process.env.STRIPE_SECRET_KEY;
  });
});

describe('lib/config/index — twilio config group', () => {
  const config = require('../lib/config/index');

  it('has all required twilio keys', () => {
    expect(config.twilio).toHaveProperty('accountSid');
    expect(config.twilio).toHaveProperty('authToken');
    expect(config.twilio).toHaveProperty('phoneNumberUs');
    expect(config.twilio).toHaveProperty('phoneNumberCa');
    expect(config.twilio).toHaveProperty('phoneNumberLegacy');
    expect(config.twilio).toHaveProperty('statusCallbackUrl');
  });

  it('twilio fields are null when env vars not set', () => {
    const vars = [
      'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER_US',
      'TWILIO_PHONE_NUMBER_CA', 'TWILIO_PHONE_NUMBER', 'TWILIO_STATUS_CALLBACK_URL',
    ];
    const originals = {};
    for (const v of vars) { originals[v] = process.env[v]; delete process.env[v]; }

    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.twilio.accountSid).toBeNull();
    expect(fresh.twilio.authToken).toBeNull();
    expect(fresh.twilio.phoneNumberUs).toBeNull();
    expect(fresh.twilio.phoneNumberCa).toBeNull();
    expect(fresh.twilio.phoneNumberLegacy).toBeNull();
    expect(fresh.twilio.statusCallbackUrl).toBeNull();

    for (const v of vars) {
      if (originals[v] !== undefined) process.env[v] = originals[v];
    }
  });

  it('twilio.accountSid reads from env when set', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid';
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.twilio.accountSid).toBe('AC_test_sid');
    delete process.env.TWILIO_ACCOUNT_SID;
  });
});

describe('lib/config/index — fub config group', () => {
  const config = require('../lib/config/index');

  it('has all required fub keys', () => {
    expect(config.fub).toHaveProperty('apiKey');
    expect(config.fub).toHaveProperty('apiBaseUrl');
    expect(config.fub).toHaveProperty('webhookSecret');
  });

  it('fub fields are null when env vars not set', () => {
    const vars = ['FUB_API_KEY', 'FUB_API_BASE_URL', 'FUB_WEBHOOK_SECRET'];
    const originals = {};
    for (const v of vars) { originals[v] = process.env[v]; delete process.env[v]; }

    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.fub.apiKey).toBeNull();
    expect(fresh.fub.apiBaseUrl).toBeNull();
    expect(fresh.fub.webhookSecret).toBeNull();

    for (const v of vars) {
      if (originals[v] !== undefined) process.env[v] = originals[v];
    }
  });
});

describe('lib/config/index — calcom config group', () => {
  const config = require('../lib/config/index');

  it('has all required calcom keys', () => {
    expect(config.calcom).toHaveProperty('apiKey');
    expect(config.calcom).toHaveProperty('username');
    expect(config.calcom).toHaveProperty('webhookSecret');
    expect(config.calcom).toHaveProperty('apiUrl');
  });

  it('calcom fields are null when env vars not set', () => {
    const vars = ['CAL_API_KEY', 'CAL_USERNAME', 'CAL_WEBHOOK_SECRET', 'NEXT_PUBLIC_API_URL'];
    const originals = {};
    for (const v of vars) { originals[v] = process.env[v]; delete process.env[v]; }

    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.calcom.apiKey).toBeNull();
    expect(fresh.calcom.username).toBeNull();
    expect(fresh.calcom.webhookSecret).toBeNull();
    expect(fresh.calcom.apiUrl).toBeNull();

    for (const v of vars) {
      if (originals[v] !== undefined) process.env[v] = originals[v];
    }
  });
});

describe('lib/config/index — app config group', () => {
  it('has all required app keys', () => {
    const config = require('../lib/config/index');
    expect(config.app).toHaveProperty('pgUrl');
    expect(config.app).toHaveProperty('apiKey');
    expect(config.app).toHaveProperty('appUrl');
    expect(config.app).toHaveProperty('fromEmail');
    expect(config.app).toHaveProperty('nodeEnv');
  });

  it('app.appUrl defaults to vercel URL when env not set', () => {
    const orig = process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.appUrl).toBe('https://leadflow-ai-five.vercel.app');
    if (orig !== undefined) process.env.NEXT_PUBLIC_APP_URL = orig;
  });

  it('app.appUrl reads from env when set', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://my-custom-app.com';
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.appUrl).toBe('https://my-custom-app.com');
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('app.fromEmail defaults to stojan@landyourleads.com', () => {
    const orig = process.env.FROM_EMAIL;
    delete process.env.FROM_EMAIL;
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.fromEmail).toBe('stojan@landyourleads.com');
    if (orig !== undefined) process.env.FROM_EMAIL = orig;
  });

  it('app.fromEmail trims whitespace from env value', () => {
    process.env.FROM_EMAIL = '  hello@example.com  ';
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.fromEmail).toBe('hello@example.com');
    delete process.env.FROM_EMAIL;
  });

  it('app.nodeEnv defaults to development', () => {
    const orig = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.nodeEnv).toBe('development');
    if (orig !== undefined) process.env.NODE_ENV = orig;
  });

  it('app.apiKey prefers LEADFLOW_API_KEY over API_SECRET_KEY', () => {
    process.env.LEADFLOW_API_KEY = 'primary-key';
    process.env.API_SECRET_KEY = 'fallback-key';
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.apiKey).toBe('primary-key');
    delete process.env.LEADFLOW_API_KEY;
    delete process.env.API_SECRET_KEY;
  });

  it('app.apiKey falls back to API_SECRET_KEY when LEADFLOW_API_KEY absent', () => {
    const origLeadflow = process.env.LEADFLOW_API_KEY;
    delete process.env.LEADFLOW_API_KEY;
    process.env.API_SECRET_KEY = 'fallback-key';
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.apiKey).toBe('fallback-key');
    if (origLeadflow !== undefined) process.env.LEADFLOW_API_KEY = origLeadflow;
    delete process.env.API_SECRET_KEY;
  });

  it('app.apiKey is null when neither key is set', () => {
    const origLeadflow = process.env.LEADFLOW_API_KEY;
    const origSecret = process.env.API_SECRET_KEY;
    delete process.env.LEADFLOW_API_KEY;
    delete process.env.API_SECRET_KEY;
    jest.resetModules();
    const fresh = require('../lib/config/index');
    expect(fresh.app.apiKey).toBeNull();
    if (origLeadflow !== undefined) process.env.LEADFLOW_API_KEY = origLeadflow;
    if (origSecret !== undefined) process.env.API_SECRET_KEY = origSecret;
  });
});

describe('lib/config/index — production startup guard', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('throws on import when NODE_ENV=production and critical vars are missing', () => {
    const origEnv = process.env.NODE_ENV;
    const origStripeKey = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    const origPg = process.env.LOCAL_PG_URL;

    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.LOCAL_PG_URL;

    expect(() => require('../lib/config/index')).toThrow(/Missing critical env vars/);

    process.env.NODE_ENV = origEnv || 'test';
    if (origStripeKey !== undefined) process.env.STRIPE_SECRET_KEY = origStripeKey;
    if (origWebhook !== undefined) process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
    if (origPg !== undefined) process.env.LOCAL_PG_URL = origPg;
  });

  it('error message lists all missing critical vars', () => {
    const origEnv = process.env.NODE_ENV;
    const origStripeKey = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    const origPg = process.env.LOCAL_PG_URL;

    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.LOCAL_PG_URL;

    let err;
    try { require('../lib/config/index'); } catch (e) { err = e; }
    expect(err.message).toContain('STRIPE_SECRET_KEY');
    expect(err.message).toContain('STRIPE_WEBHOOK_SECRET');
    expect(err.message).toContain('LOCAL_PG_URL');

    process.env.NODE_ENV = origEnv || 'test';
    if (origStripeKey !== undefined) process.env.STRIPE_SECRET_KEY = origStripeKey;
    if (origWebhook !== undefined) process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
    if (origPg !== undefined) process.env.LOCAL_PG_URL = origPg;
  });

  it('does NOT throw in development mode even when critical vars are missing', () => {
    const origEnv = process.env.NODE_ENV;
    const origStripeKey = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    const origPg = process.env.LOCAL_PG_URL;

    process.env.NODE_ENV = 'development';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.LOCAL_PG_URL;

    expect(() => require('../lib/config/index')).not.toThrow();

    process.env.NODE_ENV = origEnv || 'test';
    if (origStripeKey !== undefined) process.env.STRIPE_SECRET_KEY = origStripeKey;
    if (origWebhook !== undefined) process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
    if (origPg !== undefined) process.env.LOCAL_PG_URL = origPg;
  });

  it('does NOT throw in test mode even when critical vars are missing', () => {
    const origStripeKey = process.env.STRIPE_SECRET_KEY;
    const origWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    const origPg = process.env.LOCAL_PG_URL;

    process.env.NODE_ENV = 'test';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.LOCAL_PG_URL;

    expect(() => require('../lib/config/index')).not.toThrow();

    if (origStripeKey !== undefined) process.env.STRIPE_SECRET_KEY = origStripeKey;
    if (origWebhook !== undefined) process.env.STRIPE_WEBHOOK_SECRET = origWebhook;
    if (origPg !== undefined) process.env.LOCAL_PG_URL = origPg;
  });

  it('does NOT throw in production when all critical vars are present', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    process.env.STRIPE_SECRET_KEY = 'sk_live_test';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    process.env.LOCAL_PG_URL = 'postgresql://localhost/test';

    expect(() => require('../lib/config/index')).not.toThrow();

    process.env.NODE_ENV = origEnv || 'test';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.LOCAL_PG_URL;
  });
});
