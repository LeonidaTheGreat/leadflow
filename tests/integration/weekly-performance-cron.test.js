/**
 * Integration Test: Weekly Performance Email Cron
 * 
 * Tests the full cron endpoint with mocked database and email service.
 */

const http = require('http');
const { URL } = require('url');

// Mock the weekly performance service
jest.mock('../../lib/weekly-performance-service', () => ({
  runWeeklyReportSequence: jest.fn()
}));

const weeklyPerformanceService = require('../../lib/weekly-performance-service');
const cronHandler = require('../../app/api/cron/weekly-performance/route');

describe('Weekly Performance Email Cron Integration', () => {
  let mockReq;
  let mockRes;
  let responseData;

  beforeEach(() => {
    responseData = null;
    jest.clearAllMocks();

    // Mock request
    mockReq = {
      headers: {},
      method: 'GET',
      url: '/api/cron/weekly-performance'
    };

    // Mock response
    mockRes = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
      setHeader(key, value) {
        this.headers[key] = value;
        return this;
      }
    };
  });

  describe('Successful execution', () => {
    it('should return 200 with success response when emails are sent', async () => {
      const mockResults = {
        weekStarting: '2024-01-01',
        weekEnding: '2024-01-07',
        totalEligible: 5,
        totalSent: 5,
        totalFailed: 0,
        totalSkipped: 0,
        agents: [
          { agentId: 'agent-1', email: 'agent1@test.com', status: 'sent', messageId: 'msg-1' },
          { agentId: 'agent-2', email: 'agent2@test.com', status: 'sent', messageId: 'msg-2' }
        ]
      };

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue(mockResults);

      await cronHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Weekly performance email sequence executed');
      expect(responseData.results).toEqual(mockResults);
      expect(responseData.timestamp).toBeDefined();
    });

    it('should handle partial failures gracefully', async () => {
      const mockResults = {
        weekStarting: '2024-01-01',
        weekEnding: '2024-01-07',
        totalEligible: 5,
        totalSent: 3,
        totalFailed: 2,
        totalSkipped: 0,
        agents: [
          { agentId: 'agent-1', email: 'agent1@test.com', status: 'sent', messageId: 'msg-1' },
          { agentId: 'agent-2', email: 'agent2@test.com', status: 'failed', error: 'Email bounce' }
        ]
      };

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue(mockResults);

      await cronHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(responseData.results.totalSent).toBe(3);
      expect(responseData.results.totalFailed).toBe(2);
    });

    it('should handle no eligible agents', async () => {
      const mockResults = {
        weekStarting: '2024-01-01',
        weekEnding: '2024-01-07',
        totalEligible: 0,
        totalSent: 0,
        totalFailed: 0,
        totalSkipped: 0,
        agents: []
      };

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue(mockResults);

      await cronHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(responseData.results.totalEligible).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should return 500 when service throws an error', async () => {
      weeklyPerformanceService.runWeeklyReportSequence.mockRejectedValue(
        new Error('Database connection failed')
      );

      await cronHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.message).toBe('Weekly performance email sequence failed');
      expect(responseData.error).toBe('Database connection failed');
      expect(responseData.timestamp).toBeDefined();
    });

    it('should handle service errors with no message', async () => {
      weeklyPerformanceService.runWeeklyReportSequence.mockRejectedValue({});

      await cronHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(500);
      expect(responseData.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('should process request without cron secret in non-production', async () => {
      const originalEnv = process.env.VERCEL_ENV;
      process.env.VERCEL_ENV = 'development';

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue({
        totalEligible: 1,
        totalSent: 1,
        totalFailed: 0,
        agents: []
      });

      await cronHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);

      process.env.VERCEL_ENV = originalEnv;
    });

    it('should warn but still process when cron secret is missing in production', async () => {
      const originalEnv = process.env.VERCEL_ENV;
      process.env.VERCEL_ENV = 'production';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue({
        totalEligible: 1,
        totalSent: 1,
        totalFailed: 0,
        agents: []
      });

      await cronHandler(mockReq, mockRes);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Weekly Performance Cron] Request without proper authorization header'
      );
      expect(mockRes.statusCode).toBe(200);

      consoleSpy.mockRestore();
      process.env.VERCEL_ENV = originalEnv;
    });

    it('should process request with valid cron secret in production', async () => {
      const originalEnv = process.env.VERCEL_ENV;
      process.env.VERCEL_ENV = 'production';

      mockReq.headers['x-vercel-cron-secret'] = 'valid-secret';

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue({
        totalEligible: 1,
        totalSent: 1,
        totalFailed: 0,
        agents: []
      });

      await cronHandler(mockReq, mockRes);

      expect(mockRes.statusCode).toBe(200);

      process.env.VERCEL_ENV = originalEnv;
    });
  });

  describe('Response format', () => {
    it('should include timestamp in ISO format', async () => {
      const beforeTest = new Date().toISOString();

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue({
        totalEligible: 1,
        totalSent: 1,
        totalFailed: 0,
        agents: []
      });

      await cronHandler(mockReq, mockRes);

      const afterTest = new Date().toISOString();
      expect(responseData.timestamp).toBeGreaterThanOrEqual(beforeTest);
      expect(responseData.timestamp).toBeLessThanOrEqual(afterTest);
    });

    it('should include complete results object', async () => {
      const mockResults = {
        weekStarting: '2024-01-01',
        weekEnding: '2024-01-07',
        totalEligible: 3,
        totalSent: 3,
        totalFailed: 0,
        totalSkipped: 0,
        agents: [
          { agentId: 'agent-1', email: 'agent1@test.com', status: 'sent' }
        ]
      };

      weeklyPerformanceService.runWeeklyReportSequence.mockResolvedValue(mockResults);

      await cronHandler(mockReq, mockRes);

      expect(responseData.results.weekStarting).toBe('2024-01-01');
      expect(responseData.results.weekEnding).toBe('2024-01-07');
      expect(responseData.results.totalEligible).toBe(3);
      expect(responseData.results.agents).toHaveLength(1);
    });
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running integration tests with Jest...');
  const { execSync } = require('child_process');
  try {
    execSync('npx jest ' + __filename, { stdio: 'inherit' });
  } catch (e) {
    process.exit(1);
  }
}
