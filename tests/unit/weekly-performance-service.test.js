/**
 * Unit Tests: Weekly Performance Email Service
 * 
 * Tests the core logic of the weekly performance email service
 * without requiring external API calls.
 */

const {
  getPreviousWeekRange,
  generateEmailHtml,
  isSupabaseConfigured,
  isResendConfigured
} = require('../../lib/weekly-performance-service');

// Mock environment for tests
const originalEnv = process.env;

describe('Weekly Performance Email Service', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getPreviousWeekRange', () => {
    it('should return Monday-Sunday date range for the previous week', () => {
      // Mock current date to a Wednesday (2024-01-10)
      const mockDate = new Date('2024-01-10T12:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const result = getPreviousWeekRange();

      // Previous week should be Jan 1 (Monday) to Jan 7 (Sunday)
      expect(result.weekStarting).toBe('2024-01-01');
      expect(result.weekEnding).toBe('2024-01-07');
      expect(result.weekStartingDate.getDay()).toBe(1); // Monday
      expect(result.weekEndingDate.getDay()).toBe(0); // Sunday

      jest.useRealTimers();
    });

    it('should handle Sunday as current day correctly', () => {
      // Mock current date to Sunday (2024-01-14)
      const mockDate = new Date('2024-01-14T12:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const result = getPreviousWeekRange();

      // Previous week should be Jan 1 (Monday) to Jan 7 (Sunday)
      expect(result.weekStarting).toBe('2024-01-01');
      expect(result.weekEnding).toBe('2024-01-07');

      jest.useRealTimers();
    });

    it('should handle Monday as current day correctly', () => {
      // Mock current date to Monday (2024-01-15)
      const mockDate = new Date('2024-01-15T12:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);

      const result = getPreviousWeekRange();

      // Previous week should be Jan 8 (Monday) to Jan 14 (Sunday)
      expect(result.weekStarting).toBe('2024-01-08');
      expect(result.weekEnding).toBe('2024-01-14');

      jest.useRealTimers();
    });
  });

  describe('generateEmailHtml', () => {
    const mockAgent = {
      id: 'test-agent-id',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      plan_tier: 'starter'
    };

    const mockStats = {
      leadsResponded: 5,
      avgResponseTimeSeconds: 28,
      appointmentsBooked: 2,
      estimatedRevenueImpact: 2250
    };

    const mockWeekRange = {
      weekStarting: '2024-01-01',
      weekEnding: '2024-01-07'
    };

    it('should generate HTML with agent name', () => {
      const html = generateEmailHtml(mockAgent, mockStats, mockWeekRange);
      expect(html).toContain('Hi John');
    });

    it('should generate HTML with correct stats', () => {
      const html = generateEmailHtml(mockAgent, mockStats, mockWeekRange);
      expect(html).toContain('5'); // leads responded
      expect(html).toContain('28s'); // avg response time
      expect(html).toContain('2'); // appointments booked
      expect(html).toContain('$2,250'); // revenue impact
    });

    it('should include upgrade CTA for starter plan', () => {
      const html = generateEmailHtml(mockAgent, mockStats, mockWeekRange);
      expect(html).toContain('Upgrade to Pro');
      expect(html).toContain('starter_upgrade');
    });

    it('should include upgrade CTA for trial plan', () => {
      const trialAgent = { ...mockAgent, plan_tier: 'trial' };
      const html = generateEmailHtml(trialAgent, mockStats, mockWeekRange);
      expect(html).toContain('Upgrade to Pro - 50% Off');
      expect(html).toContain('PILOT50');
    });

    it('should not include upgrade CTA for pro plan', () => {
      const proAgent = { ...mockAgent, plan_tier: 'pro' };
      const html = generateEmailHtml(proAgent, mockStats, mockWeekRange);
      expect(html).not.toContain('Ready for Unlimited AI Power?');
    });

    it('should handle zero stats gracefully', () => {
      const zeroStats = {
        leadsResponded: 0,
        avgResponseTimeSeconds: 0,
        appointmentsBooked: 0,
        estimatedRevenueImpact: 0
      };
      const html = generateEmailHtml(mockAgent, zeroStats, mockWeekRange);
      expect(html).toContain('0');
      expect(html).toContain('$0');
    });

    it('should format response time in minutes when over 60 seconds', () => {
      const slowStats = { ...mockStats, avgResponseTimeSeconds: 125 };
      const html = generateEmailHtml(mockAgent, slowStats, mockWeekRange);
      expect(html).toContain('2m 5s');
    });

    it('should show benchmark comparison when faster than 9 minutes', () => {
      const fastStats = { ...mockStats, avgResponseTimeSeconds: 30 };
      const html = generateEmailHtml(mockAgent, fastStats, mockWeekRange);
      expect(html).toContain('18.0x faster than 9-min avg');
    });

    it('should use "Agent" as default first name', () => {
      const agentNoName = { ...mockAgent, first_name: null };
      const html = generateEmailHtml(agentNoName, mockStats, mockWeekRange);
      expect(html).toContain('Hi Agent');
    });

    it('should include week date range in header', () => {
      const html = generateEmailHtml(mockAgent, mockStats, mockWeekRange);
      expect(html).toContain('Week of');
    });

    it('should include dashboard link in footer', () => {
      const html = generateEmailHtml(mockAgent, mockStats, mockWeekRange);
      expect(html).toContain('https://leadflow.ai/dashboard');
    });
  });

  describe('isSupabaseConfigured', () => {
    it('should return false when environment variables are missing', () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.SUPABASE_URL;
      delete process.env.API_SECRET_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.LEADFLOW_API_KEY;

      const result = isSupabaseConfigured();
      expect(result).toBe(false);
    });

    it('should return true when environment variables are present', () => {
      process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
      process.env.API_SECRET_KEY = 'test-key';

      const result = isSupabaseConfigured();
      expect(result).toBe(true);
    });
  });

  describe('isResendConfigured', () => {
    it('should return false when RESEND_API_KEY is missing', () => {
      delete process.env.RESEND_API_KEY;

      const result = isResendConfigured();
      expect(result).toBe(false);
    });

    it('should return true when RESEND_API_KEY is present', () => {
      process.env.RESEND_API_KEY = 'test-resend-key';

      const result = isResendConfigured();
      expect(result).toBe(true);
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  const { execSync } = require('child_process');
  try {
    execSync('npx jest ' + __filename, { stdio: 'inherit' });
  } catch (e) {
    process.exit(1);
  }
}
