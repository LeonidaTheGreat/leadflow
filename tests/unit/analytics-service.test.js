'use strict';

/**
 * Unit tests for AnalyticsService (lib/services/AnalyticsService.js)
 *
 * Uses an injected mock pool so no real database connection is required.
 */

const AnalyticsService = require('../../lib/services/AnalyticsService');

function makePool(queryFn) {
  return { query: jest.fn(queryFn) };
}

describe('AnalyticsService', () => {
  describe('constructor', () => {
    test('accepts injected getPool', () => {
      const mockPool = makePool(async () => ({ rows: [] }));
      const svc = new AnalyticsService({ getPool: () => mockPool });
      expect(svc._getPool()).toBe(mockPool);
    });
  });

  describe('_startDate', () => {
    test('returns ISO string ~daysBack days ago', () => {
      const svc = new AnalyticsService({ getPool: () => {} });
      const before = Date.now();
      const result = new Date(svc._startDate(30)).getTime();
      const after = Date.now();
      const expected = before - 30 * 24 * 60 * 60 * 1000;
      expect(result).toBeGreaterThanOrEqual(expected - 1000);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('getMessagesPerDay', () => {
    test('maps rows to {date, count}', async () => {
      const rows = [
        { day: new Date('2026-03-01T00:00:00Z'), count: 5 },
        { day: new Date('2026-03-02T00:00:00Z'), count: 3 },
      ];
      const pool = makePool(async () => ({ rows }));
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getMessagesPerDay(7);
      expect(result.error).toBeNull();
      expect(result.data).toEqual([
        { date: '2026-03-01', count: 5 },
        { date: '2026-03-02', count: 3 },
      ]);
    });

    test('returns empty data on query error', async () => {
      const pool = makePool(async () => { throw new Error('db error'); });
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getMessagesPerDay();
      expect(result.data).toEqual([]);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getDeliveryStats', () => {
    test('sums status counts correctly', async () => {
      const rows = [
        { status: 'delivered', count: 10 },
        { status: 'failed', count: 2 },
        { status: 'pending', count: 1 },
      ];
      const pool = makePool(async () => ({ rows }));
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getDeliveryStats();
      expect(result.error).toBeNull();
      expect(result.delivered).toBe(10);
      expect(result.failed).toBe(2);
      expect(result.pending).toBe(1);
      expect(result.sent).toBe(0);
    });

    test('returns zeros on query error', async () => {
      const pool = makePool(async () => { throw new Error('db error'); });
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getDeliveryStats();
      expect(result.sent).toBe(0);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getResponseRate', () => {
    test('computes rate correctly', async () => {
      let callCount = 0;
      const pool = makePool(async () => {
        callCount += 1;
        if (callCount === 1) return { rows: [{ total: 100 }] }; // outbound leads
        return { rows: [{ total: 25 }] }; // inbound responders
      });
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getResponseRate();
      expect(result.error).toBeNull();
      expect(result.totalSent).toBe(100);
      expect(result.totalResponded).toBe(25);
      expect(result.responseRate).toBe(25);
    });

    test('returns zero rate when no outbound leads', async () => {
      const pool = makePool(async () => ({ rows: [{ total: 0 }] }));
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getResponseRate();
      expect(result.responseRate).toBe(0);
      expect(result.error).toBeNull();
    });

    test('returns zeros on query error', async () => {
      const pool = makePool(async () => { throw new Error('db error'); });
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getResponseRate();
      expect(result.totalSent).toBe(0);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getLeadConversion', () => {
    test('computes conversion rate correctly', async () => {
      let callCount = 0;
      const pool = makePool(async () => {
        callCount += 1;
        if (callCount === 1) return { rows: [{ total: 200 }] }; // leads
        return { rows: [{ total: 10 }] }; // converted
      });
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getLeadConversion();
      expect(result.error).toBeNull();
      expect(result.totalLeads).toBe(200);
      expect(result.convertedLeads).toBe(10);
      expect(result.conversionRate).toBe(5);
    });

    test('returns zero rate when no leads', async () => {
      const pool = makePool(async () => ({ rows: [{ total: 0 }] }));
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getLeadConversion();
      expect(result.conversionRate).toBe(0);
    });
  });

  describe('getAvgResponseTime', () => {
    test('computes avg and median in minutes', async () => {
      // 3 leads with response times of 10, 20, 30 minutes
      const rows = [
        { response_minutes: '10' },
        { response_minutes: '20' },
        { response_minutes: '30' },
      ];
      const pool = makePool(async () => ({ rows }));
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getAvgResponseTime();
      expect(result.error).toBeNull();
      expect(result.avgResponseTime).toBe(20);
      expect(result.medianResponseTime).toBe(20);
    });

    test('returns zeros when no data', async () => {
      const pool = makePool(async () => ({ rows: [] }));
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getAvgResponseTime();
      expect(result.avgResponseTime).toBe(0);
      expect(result.medianResponseTime).toBe(0);
      expect(result.error).toBeNull();
    });
  });

  describe('getAnalyticsDashboard', () => {
    test('returns all metric keys', async () => {
      const pool = makePool(async (sql) => {
        // messagesPerDay, deliveryStats, responseRate (×2), leadConversion (×2), avgResponseTime
        if (sql.includes('day,')) return { rows: [] };
        if (sql.includes('total')) return { rows: [{ total: 0 }] };
        return { rows: [] };
      });
      const svc = new AnalyticsService({ getPool: () => pool });
      const result = await svc.getAnalyticsDashboard();
      expect(result).toHaveProperty('messagesPerDay');
      expect(result).toHaveProperty('deliveryStats');
      expect(result).toHaveProperty('responseRate');
      expect(result).toHaveProperty('leadConversion');
      expect(result).toHaveProperty('responseTime');
    });
  });
});
