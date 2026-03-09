/**
 * Email Configuration Validation Tests
 */

import { validateEmailConfig } from '../email-config-validation';

describe('validateEmailConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should fail validation when RESEND_API_KEY is missing', () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.FROM_EMAIL;

    const result = validateEmailConfig();

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('RESEND_API_KEY is not configured'))).toBe(true);
  });

  test('should pass validation when RESEND_API_KEY is present', () => {
    process.env.RESEND_API_KEY = 're_test_key_12345678901234567890';
    process.env.FROM_EMAIL = 'test@leadflow.ai';

    const result = validateEmailConfig();

    expect(result.isValid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  test('should warn when FROM_EMAIL is not configured', () => {
    process.env.RESEND_API_KEY = 're_test_key_12345678901234567890';
    delete process.env.FROM_EMAIL;

    const result = validateEmailConfig();

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('FROM_EMAIL not configured');
  });

  test('should flag invalid email address', () => {
    process.env.RESEND_API_KEY = 're_test_key_12345678901234567890';
    process.env.FROM_EMAIL = 'not-an-email';

    const result = validateEmailConfig();

    expect(result.isValid).toBe(false);
    expect(result.issues.some(i => i.includes('FROM_EMAIL appears invalid'))).toBe(true);
  });

  test('should use default FROM_EMAIL when not configured', () => {
    process.env.RESEND_API_KEY = 're_test_key_12345678901234567890';
    delete process.env.FROM_EMAIL;

    const result = validateEmailConfig();

    // Should have a warning about using default
    expect(result.warnings.some(w => w.includes('stojan@leadflow.ai'))).toBe(true);
  });

  test('should have multiple issues when configuration is incomplete', () => {
    delete process.env.RESEND_API_KEY;
    process.env.FROM_EMAIL = 'invalid-email';

    const result = validateEmailConfig();

    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(1);
  });
});
