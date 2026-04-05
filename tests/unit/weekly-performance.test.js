/**
 * Unit Tests: Weekly Performance Email Service
 *
 * Tests core logic without hitting the database or Resend API.
 */

'use strict';

const service = require('../../lib/weekly-performance-service');

describe('weekly-performance-service', () => {
  describe('getPreviousWeekRange()', () => {
    it('returns an object with weekStarting and weekEnding as ISO date strings', () => {
      const range = service.getPreviousWeekRange();
      expect(range).toHaveProperty('weekStarting');
      expect(range).toHaveProperty('weekEnding');
      expect(range).toHaveProperty('weekStartingDate');
      expect(range).toHaveProperty('weekEndingDate');
      expect(range.weekStarting).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.weekEnding).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('weekStarting is a Monday (day 1) and weekEnding is a Sunday (day 0)', () => {
      const range = service.getPreviousWeekRange();
      expect(range.weekStartingDate.getDay()).toBe(1);
      expect(range.weekEndingDate.getDay()).toBe(0);
    });

    it('weekEnding is in the same calendar week as weekStarting (6-7 days apart)', () => {
      const range = service.getPreviousWeekRange();
      const diffDays = (range.weekEndingDate - range.weekStartingDate) / (1000 * 60 * 60 * 24);
      // Monday 00:00 to Sunday 23:59:59.999 is ~6.9999 days
      expect(diffDays).toBeGreaterThanOrEqual(6);
      expect(diffDays).toBeLessThan(8);
    });
  });

  describe('generateEmailHtml()', () => {
    const weekRange = {
      weekStarting: '2026-03-30',
      weekEnding: '2026-04-05',
      weekStartingDate: new Date('2026-03-30'),
      weekEndingDate: new Date('2026-04-05')
    };

    it('renders lead count in the email body', () => {
      const agent = { first_name: 'Jane', plan_tier: 'pro' };
      const stats = { leadsResponded: 42, avgResponseTimeSeconds: 28, appointmentsBooked: 5, estimatedRevenueImpact: 5625 };
      const html = service.generateEmailHtml(agent, stats, weekRange);
      expect(html).toContain('42');
    });

    it('includes an upgrade CTA section for Starter plan agents', () => {
      const agent = { first_name: 'Bob', plan_tier: 'starter' };
      const stats = { leadsResponded: 3, avgResponseTimeSeconds: 28, appointmentsBooked: 1, estimatedRevenueImpact: 1125 };
      const html = service.generateEmailHtml(agent, stats, weekRange);
      expect(html).toContain('utm_campaign=starter_upgrade');
    });

    it('includes an upgrade CTA section for Trial/Pilot agents', () => {
      const agent = { first_name: 'Alice', plan_tier: 'trial' };
      const stats = { leadsResponded: 2, avgResponseTimeSeconds: 30, appointmentsBooked: 0, estimatedRevenueImpact: 0 };
      const html = service.generateEmailHtml(agent, stats, weekRange);
      expect(html).toContain('utm_campaign=pilot_upgrade');
    });

    it('does NOT include an upgrade CTA section for Pro agents', () => {
      const agent = { first_name: 'Carol', plan_tier: 'pro' };
      const stats = { leadsResponded: 10, avgResponseTimeSeconds: 25, appointmentsBooked: 2, estimatedRevenueImpact: 2250 };
      const html = service.generateEmailHtml(agent, stats, weekRange);
      expect(html).not.toContain('utm_campaign=starter_upgrade');
      expect(html).not.toContain('utm_campaign=pilot_upgrade');
    });

    it('shows response time faster than 9-min benchmark when avgResponseTimeSeconds is low', () => {
      const agent = { first_name: 'Dave', plan_tier: 'pro' };
      const stats = { leadsResponded: 5, avgResponseTimeSeconds: 27, appointmentsBooked: 1, estimatedRevenueImpact: 1125 };
      const html = service.generateEmailHtml(agent, stats, weekRange);
      // 540 / 27 = 20 → "20.0x faster than 9-min avg"
      expect(html).toContain('faster than 9-min avg');
    });

    it('returns a valid HTML document string', () => {
      const agent = { first_name: 'Eve', plan_tier: 'pro' };
      const stats = { leadsResponded: 0, avgResponseTimeSeconds: 0, appointmentsBooked: 0, estimatedRevenueImpact: 0 };
      const html = service.generateEmailHtml(agent, stats, weekRange);
      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });
  });

  describe('isResendConfigured()', () => {
    it('returns false when RESEND_API_KEY is not set', () => {
      const original = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;
      // Re-require fresh instance to pick up env change
      jest.resetModules();
      const freshService = require('../../lib/weekly-performance-service');
      expect(freshService.isResendConfigured()).toBe(false);
      if (original !== undefined) process.env.RESEND_API_KEY = original;
    });
  });
});
