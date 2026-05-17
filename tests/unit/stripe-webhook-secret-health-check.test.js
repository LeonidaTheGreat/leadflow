'use strict';

const path = require('path');
const fs = require('fs');
const SystemStatusService = require('../../lib/services/SystemStatusService');

describe('SystemStatusService: Stripe env var reporting', () => {
  test('getHealthStatus includes stripe_webhook_secret as missing when not set', () => {
    const original = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    try {
      const svc = new SystemStatusService();
      const status = svc.getHealthStatus();
      expect(status.stripe_webhook_secret).toBe('missing');
    } finally {
      if (original !== undefined) process.env.STRIPE_WEBHOOK_SECRET = original;
    }
  });

  test('getHealthStatus reports stripe_webhook_secret as configured when set', () => {
    const original = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    try {
      const svc = new SystemStatusService();
      const status = svc.getHealthStatus();
      expect(status.stripe_webhook_secret).toBe('configured');
    } finally {
      if (original !== undefined) process.env.STRIPE_WEBHOOK_SECRET = original;
      else delete process.env.STRIPE_WEBHOOK_SECRET;
    }
  });

  test('getHealthStatus includes stripe_secret_key as missing when not set', () => {
    const original = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const svc = new SystemStatusService();
      const status = svc.getHealthStatus();
      expect(status.stripe_secret_key).toBe('missing');
    } finally {
      if (original !== undefined) process.env.STRIPE_SECRET_KEY = original;
    }
  });

  test('getHealthStatus reports stripe_secret_key as configured when set', () => {
    const original = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    try {
      const svc = new SystemStatusService();
      const status = svc.getHealthStatus();
      expect(status.stripe_secret_key).toBe('configured');
    } finally {
      if (original !== undefined) process.env.STRIPE_SECRET_KEY = original;
      else delete process.env.STRIPE_SECRET_KEY;
    }
  });

  test('getHealthStatus returns status ok and timestamp', () => {
    const svc = new SystemStatusService();
    const status = svc.getHealthStatus();
    expect(status.status).toBe('ok');
    expect(status.timestamp).toBeTruthy();
  });
});

describe('Next.js health route: STRIPE env vars required', () => {
  const routePath = path.join(
    __dirname, '..', '..', 'product', 'lead-response', 'dashboard',
    'app', 'api', 'health', 'route.ts'
  );
  let src;

  beforeAll(() => {
    src = fs.readFileSync(routePath, 'utf8');
  });

  test('health route source includes STRIPE_SECRET_KEY in requiredEnvVars', () => {
    expect(src).toContain("'STRIPE_SECRET_KEY'");
  });

  test('health route source includes STRIPE_WEBHOOK_SECRET in requiredEnvVars', () => {
    expect(src).toContain("'STRIPE_WEBHOOK_SECRET'");
  });

  test('health route marks STRIPE_SECRET_KEY as critical', () => {
    const criticalSection = src.match(/criticalKeys\s*=\s*\[([\s\S]*?)\]/)?.[0] || '';
    expect(criticalSection).toContain("'STRIPE_SECRET_KEY'");
  });

  test('health route marks STRIPE_WEBHOOK_SECRET as critical', () => {
    const criticalSection = src.match(/criticalKeys\s*=\s*\[([\s\S]*?)\]/)?.[0] || '';
    expect(criticalSection).toContain("'STRIPE_WEBHOOK_SECRET'");
  });
});

describe('routes/billing.js: 503 guard for missing STRIPE_WEBHOOK_SECRET', () => {
  test('billing route rejects with 503 when STRIPE_WEBHOOK_SECRET is missing', () => {
    const billingPath = path.join(__dirname, '..', '..', 'routes', 'billing.js');
    const src = fs.readFileSync(billingPath, 'utf8');
    expect(src).toContain('STRIPE_WEBHOOK_SECRET');
    expect(src).toMatch(/status\(503\)/);
  });
});
