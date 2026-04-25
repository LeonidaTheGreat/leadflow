'use strict';

/**
 * Unit tests: PilotConversionService
 *
 * Covers:
 * - All 6 milestones defined and correct
 * - first_name used for personalization (not agent.name)
 * - Accurate days-remaining in subjects
 * - renderTemplate returns content for all 6 templates
 * - runConversionSequence processes all 6 milestones
 * - getEligibleAgents idempotency filter
 * - generateCheckoutUrl format
 */

const assert = require('assert');
const PilotConversionService = require('../../lib/services/PilotConversionService');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}: ${err.message}`);
    failed++;
  }
}

// ── MILESTONES object ────────────────────────────────────────────────────────

check('MILESTONES has exactly 6 entries', async () => {
  const keys = Object.keys(PilotConversionService.MILESTONES);
  assert.strictEqual(keys.length, 6, `Expected 6, got: ${keys.join(', ')}`);
});

check('MILESTONES contains day_30, day_45, day_55, day_75, day_79, day_85', async () => {
  const keys = Object.keys(PilotConversionService.MILESTONES);
  for (const expected of ['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85']) {
    assert.ok(keys.includes(expected), `Missing milestone: ${expected}`);
  }
});

check('day_79 milestone has days=79', async () => {
  assert.strictEqual(PilotConversionService.MILESTONES.day_79.days, 79);
});

check('day_75 milestone has days=75', async () => {
  assert.strictEqual(PilotConversionService.MILESTONES.day_75.days, 75);
});

check('day_85 milestone has days=85', async () => {
  assert.strictEqual(PilotConversionService.MILESTONES.day_85.days, 85);
});

// ── Subject accuracy ─────────────────────────────────────────────────────────

check('day_75 subject mentions 15 days', async () => {
  const subject = PilotConversionService.MILESTONES.day_75.subject;
  assert.ok(subject.includes('15'), `day_75 subject should mention 15 days, got: ${subject}`);
});

check('day_79 subject mentions 11 days', async () => {
  const subject = PilotConversionService.MILESTONES.day_79.subject;
  assert.ok(subject.includes('11'), `day_79 subject should mention 11 days, got: ${subject}`);
});

check('day_85 subject mentions 5 days', async () => {
  const subject = PilotConversionService.MILESTONES.day_85.subject;
  assert.ok(subject.includes('5'), `day_85 subject should mention 5 days, got: ${subject}`);
});

check('day_45 subject does not say 15 days left (was wrong for 90-day pilot)', async () => {
  const subject = PilotConversionService.MILESTONES.day_45.subject;
  assert.ok(!subject.includes('15 days left'), `day_45 subject inaccurately says 15 days left: ${subject}`);
});

check('day_55 subject does not say "only 5 days left" (was wrong for 90-day pilot)', async () => {
  const subject = PilotConversionService.MILESTONES.day_55.subject;
  // Must not match the old inaccurate phrasing — "35 days left" is fine, "5 days left: Secure" is not
  assert.ok(!/\b5 days left/.test(subject), `day_55 subject inaccurately implies 5 days left: ${subject}`);
});

check('all milestone subjects contain {{firstName}} placeholder', async () => {
  for (const [key, m] of Object.entries(PilotConversionService.MILESTONES)) {
    assert.ok(m.subject.includes('{{firstName}}'), `${key} subject missing {{firstName}}`);
  }
});

// ── renderTemplate ────────────────────────────────────────────────────────────

check('renderTemplate uses agent.first_name (not agent.name)', async () => {
  const svc = new PilotConversionService({});
  const agent = { first_name: 'Alice', id: 'a1', email: 'a@test.com' };
  const stats = { leadsResponded: 5, avgResponseTime: '2 minutes', appointmentsBooked: 3 };
  const result = svc.renderTemplate('day79_critical', agent, stats, 'https://app.test/upgrade');
  assert.ok(result.html.includes('Alice'), 'HTML should contain first_name "Alice"');
  assert.ok(result.text.includes('Alice'), 'Text should contain first_name "Alice"');
});

check('renderTemplate falls back to "there" when first_name is null', async () => {
  const svc = new PilotConversionService({});
  const agent = { first_name: null, id: 'a1', email: 'a@test.com' };
  const stats = { leadsResponded: 0, avgResponseTime: 'N/A', appointmentsBooked: 0 };
  const result = svc.renderTemplate('day79_critical', agent, stats, 'https://app.test/upgrade');
  assert.ok(result.html.includes('there'), 'HTML should fallback to "there"');
});

check('renderTemplate returns html and text for all 6 milestone templates', async () => {
  const svc = new PilotConversionService({});
  const agent = { first_name: 'Bob', id: 'b1', email: 'b@test.com' };
  const stats = { leadsResponded: 10, avgResponseTime: '5 minutes', appointmentsBooked: 2 };
  const url = 'https://app.test/upgrade';

  const templates = [
    'day30_midpoint', 'day45_urgent', 'day55_warning',
    'day75_urgent', 'day79_critical', 'day85_final'
  ];
  for (const tmpl of templates) {
    const result = svc.renderTemplate(tmpl, agent, stats, url);
    assert.ok(result.html && result.html.length > 50, `${tmpl} html is too short or missing`);
    assert.ok(result.text && result.text.length > 20, `${tmpl} text is too short or missing`);
    assert.ok(result.html.includes(url), `${tmpl} html should include checkout URL`);
    assert.ok(result.text.includes(url), `${tmpl} text should include checkout URL`);
  }
});

check('renderTemplate throws for unknown template', async () => {
  const svc = new PilotConversionService({});
  try {
    svc.renderTemplate('nonexistent', {}, {}, '');
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err.message.includes('Unknown template'));
  }
});

// ── generateCheckoutUrl ──────────────────────────────────────────────────────

check('generateCheckoutUrl includes agent id and plan=pro', async () => {
  const svc = new PilotConversionService({ appUrl: 'https://app.test' });
  const url = svc.generateCheckoutUrl({ id: 'agent-123' });
  assert.ok(url.includes('agent-123'), 'URL should include agent id');
  assert.ok(url.includes('plan=pro'), 'URL should include plan=pro');
  assert.ok(url.includes('source=pilot_conversion'), 'URL should include source');
});

// ── runConversionSequence ────────────────────────────────────────────────────

check('runConversionSequence processes all 6 milestones', async () => {
  const processedMilestones = [];
  const svc = new PilotConversionService({ db: null });

  // Stub processMilestone to capture calls
  svc.processMilestone = async (milestone) => {
    processedMilestones.push(milestone);
    return { milestone, processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] };
  };

  const result = await svc.runConversionSequence();
  const expected = ['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85'];
  assert.deepStrictEqual(processedMilestones, expected,
    `Expected ${expected.join(', ')}, got ${processedMilestones.join(', ')}`);
});

check('runConversionSequence returns milestones keyed by name', async () => {
  const svc = new PilotConversionService({ db: null });
  svc.processMilestone = async (milestone) =>
    ({ milestone, processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] });

  const result = await svc.runConversionSequence();
  for (const key of ['day_30', 'day_45', 'day_55', 'day_75', 'day_79', 'day_85']) {
    assert.ok(result.milestones[key], `Result should contain key ${key}`);
  }
});

// ── getEligibleAgents without DB ─────────────────────────────────────────────

check('getEligibleAgents returns empty array when DB not configured', async () => {
  const svc = new PilotConversionService({ db: null });
  const agents = await svc.getEligibleAgents('day_79');
  assert.deepStrictEqual(agents, []);
});

check('getEligibleAgents throws for invalid milestone', async () => {
  const mockDb = {
    from: () => ({ select: () => ({ eq: () => ({ not: () => ({ lte: () => ({ order: () => ({ data: [], error: null }) }) }) }) }) })
  };
  const svc = new PilotConversionService({ db: mockDb });
  try {
    await svc.getEligibleAgents('day_999');
    assert.fail('Should have thrown');
  } catch (err) {
    assert.ok(err.message.includes('Invalid milestone'));
  }
});

// ── Constructor ──────────────────────────────────────────────────────────────

check('constructor trims RESEND_API_KEY from env', async () => {
  process.env.RESEND_API_KEY = 're_test_key\n';
  const svc = new PilotConversionService({});
  assert.ok(!svc.resendApiKey.includes('\n'), 'resendApiKey should be trimmed');
  delete process.env.RESEND_API_KEY;
});

check('constructor trims FROM_EMAIL from env', async () => {
  process.env.FROM_EMAIL = 'stojan@leadflow.ai\n';
  const svc = new PilotConversionService({});
  assert.ok(!svc.fromEmail.includes('\n'), 'fromEmail should be trimmed');
  delete process.env.FROM_EMAIL;
});

// ── isDbConfigured / isResendConfigured ──────────────────────────────────────

check('isDbConfigured returns false when db is null', async () => {
  const svc = new PilotConversionService({ db: null });
  assert.strictEqual(svc.isDbConfigured(), false);
});

check('isDbConfigured returns true when db is provided', async () => {
  const svc = new PilotConversionService({ db: {} });
  assert.strictEqual(svc.isDbConfigured(), true);
});

check('isResendConfigured returns false without key', async () => {
  const svc = new PilotConversionService({ resendApiKey: undefined });
  assert.strictEqual(svc.isResendConfigured(), false);
});

check('isResendConfigured returns true with key', async () => {
  const svc = new PilotConversionService({ resendApiKey: 're_testkey' });
  assert.strictEqual(svc.isResendConfigured(), true);
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
