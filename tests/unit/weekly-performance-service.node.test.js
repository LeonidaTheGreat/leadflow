/*
TASK SPEC (22f958dd-0610-45c7-8b13-5e195d0296a9)
What:
- Consolidate the two duplicate weekly-performance-email test files
  (tests/unit/weekly-performance.test.js and
  tests/unit/weekly-performance-service.node.test.js) into this single
  canonical node:test-based file. Fold in every unique assertion from the
  legacy custom-runner file, then delete that legacy file.
Verify:
- `find tests -iname "*weekly*"` returns exactly one file.
- `node --test tests/unit/weekly-performance-service.node.test.js` exits 0.
- `npm test`, `npm run lint`, `node scripts/quality-audit.js` all still pass.
Boundaries:
- Do not modify lib/services/WeeklyPerformanceService.js,
  routes/internal/weekly-performance.js, or any audience/send-eligibility
  logic. Test-file hygiene only.
REUSE_DECLARATION: EXTEND — extending the existing node:test-based file with
the unique coverage from the legacy custom-runner test file so a single
canonical test file remains.
*/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { WeeklyPerformanceService } = require('../../lib/services/WeeklyPerformanceService');

const WEEK_RANGE = {
  weekStarting: '2026-03-30',
  weekEnding: '2026-04-05',
  weekStartingDate: new Date('2026-03-30'),
  weekEndingDate: new Date('2026-04-05')
};

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

test('WeeklyPerformanceService#generateEmailHtml renders the lead count', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Jane', plan_tier: 'pro' },
    { leadsResponded: 42, avgResponseTimeSeconds: 28, appointmentsBooked: 5, estimatedRevenueImpact: 5625 },
    WEEK_RANGE
  );

  assert.match(html, /42/);
});

test('WeeklyPerformanceService#generateEmailHtml includes starter upgrade CTA', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Bob', plan_tier: 'starter' },
    { leadsResponded: 3, avgResponseTimeSeconds: 28, appointmentsBooked: 1, estimatedRevenueImpact: 1125 },
    WEEK_RANGE
  );

  assert.match(html, /utm_campaign=starter_upgrade/);
  assert.match(html, /<!DOCTYPE html>/);
});

test('WeeklyPerformanceService#generateEmailHtml includes upgrade CTA for trial/pilot agents', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Alice', plan_tier: 'trial' },
    { leadsResponded: 2, avgResponseTimeSeconds: 30, appointmentsBooked: 0, estimatedRevenueImpact: 0 },
    WEEK_RANGE
  );

  assert.match(html, /utm_campaign=pilot_upgrade/);
});

test('WeeklyPerformanceService#generateEmailHtml omits upgrade CTA for pro agents', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Carol', plan_tier: 'pro' },
    { leadsResponded: 10, avgResponseTimeSeconds: 25, appointmentsBooked: 2, estimatedRevenueImpact: 2250 },
    WEEK_RANGE
  );

  assert.doesNotMatch(html, /utm_campaign=starter_upgrade/);
  assert.doesNotMatch(html, /utm_campaign=pilot_upgrade/);
});

test('WeeklyPerformanceService#generateEmailHtml shows response time faster than the 9-min benchmark', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Dave', plan_tier: 'pro' },
    { leadsResponded: 5, avgResponseTimeSeconds: 27, appointmentsBooked: 1, estimatedRevenueImpact: 1125 },
    WEEK_RANGE
  );

  assert.match(html, /faster than 9-min avg/);
});

test('WeeklyPerformanceService#generateEmailHtml returns a valid HTML document string', () => {
  const service = new WeeklyPerformanceService(null, null);
  const html = service.generateEmailHtml(
    { first_name: 'Eve', plan_tier: 'pro' },
    { leadsResponded: 0, avgResponseTimeSeconds: 0, appointmentsBooked: 0, estimatedRevenueImpact: 0 },
    WEEK_RANGE
  );

  assert.equal(typeof html, 'string');
  assert.match(html, /<!DOCTYPE html>/);
  assert.match(html, /<\/html>/);
});

test('WeeklyPerformanceService#isResendConfigured returns a boolean', () => {
  const service = new WeeklyPerformanceService(null, null);
  assert.equal(typeof service.isResendConfigured(), 'boolean');
});
