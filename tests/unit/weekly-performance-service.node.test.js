'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { WeeklyPerformanceService } = require('../../lib/services/WeeklyPerformanceService');

test('WeeklyPerformanceService#getPreviousWeekRange returns prior Monday-Sunday window', () => {
  const service = new WeeklyPerformanceService(null, null);
  const range = service.getPreviousWeekRange();

  assert.match(range.weekStarting, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(range.weekEnding, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(range.weekStartingDate.getDay(), 1);
  assert.equal(range.weekEndingDate.getDay(), 0);

  const diffDays = (range.weekEndingDate - range.weekStartingDate) / (1000 * 60 * 60 * 24);
  assert.ok(diffDays >= 6);
  assert.ok(diffDays < 8);
});

test('WeeklyPerformanceService#generateEmailHtml includes starter upgrade CTA', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Bob', plan_tier: 'starter' },
    { leadsResponded: 3, avgResponseTimeSeconds: 28, appointmentsBooked: 1, estimatedRevenueImpact: 1125 },
    {
      weekStarting: '2026-03-30',
      weekEnding: '2026-04-05',
      weekStartingDate: new Date('2026-03-30'),
      weekEndingDate: new Date('2026-04-05')
    }
  );

  assert.match(html, /utm_campaign=starter_upgrade/);
  assert.match(html, /<!DOCTYPE html>/);
});

test('WeeklyPerformanceService#generateEmailHtml omits upgrade CTA for pro agents', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Carol', plan_tier: 'pro' },
    { leadsResponded: 10, avgResponseTimeSeconds: 25, appointmentsBooked: 2, estimatedRevenueImpact: 2250 },
    {
      weekStarting: '2026-03-30',
      weekEnding: '2026-04-05',
      weekStartingDate: new Date('2026-03-30'),
      weekEndingDate: new Date('2026-04-05')
    }
  );

  assert.doesNotMatch(html, /utm_campaign=starter_upgrade/);
  assert.doesNotMatch(html, /utm_campaign=pilot_upgrade/);
});
