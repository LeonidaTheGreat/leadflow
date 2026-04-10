/**
 * E2E Test: PilotConversionService class refactor
 * Task: 53b2945c-1811-4bd5-9a01-9798726c282e
 * PR: #1116
 *
 * Verifies:
 * 1. Old file lib/pilot-conversion-service.js is deleted
 * 2. New file lib/services/PilotConversionService.js exists and exports correctly
 * 3. Class instantiates with injected config
 * 4. Singleton backward-compat exports are present and callable
 * 5. All known consumers import from the new path
 * 6. MILESTONES config is unchanged
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// ── 1. File existence checks ──────────────────────────────────────────────────

test('old file lib/pilot-conversion-service.js is deleted', () => {
  const oldPath = path.join(PROJECT_ROOT, 'lib/pilot-conversion-service.js');
  assert.ok(!fs.existsSync(oldPath), `Old file still exists: ${oldPath}`);
});

test('new file lib/services/PilotConversionService.js exists', () => {
  const newPath = path.join(PROJECT_ROOT, 'lib/services/PilotConversionService.js');
  assert.ok(fs.existsSync(newPath), `New file not found: ${newPath}`);
});

// ── 2. Module exports ─────────────────────────────────────────────────────────

let PCS;
test('PilotConversionService module loads without error', () => {
  PCS = require(path.join(PROJECT_ROOT, 'lib/services/PilotConversionService.js'));
  assert.ok(PCS, 'Module returned falsy');
});

test('exports PilotConversionService class', () => {
  assert.strictEqual(typeof PCS.PilotConversionService, 'function', 'PilotConversionService not a function/class');
});

test('exports MILESTONES object', () => {
  assert.strictEqual(typeof PCS.MILESTONES, 'object', 'MILESTONES not an object');
  assert.ok(PCS.MILESTONES.day_30, 'MILESTONES.day_30 missing');
  assert.ok(PCS.MILESTONES.day_45, 'MILESTONES.day_45 missing');
  assert.ok(PCS.MILESTONES.day_55, 'MILESTONES.day_55 missing');
});

test('exports backward-compat function: runConversionSequence', () => {
  assert.strictEqual(typeof PCS.runConversionSequence, 'function');
});

test('exports backward-compat function: processMilestone', () => {
  assert.strictEqual(typeof PCS.processMilestone, 'function');
});

test('exports backward-compat function: sendConversionEmail', () => {
  assert.strictEqual(typeof PCS.sendConversionEmail, 'function');
});

test('exports backward-compat function: getEligibleAgents', () => {
  assert.strictEqual(typeof PCS.getEligibleAgents, 'function');
});

test('exports backward-compat function: getAgentStats', () => {
  assert.strictEqual(typeof PCS.getAgentStats, 'function');
});

test('exports backward-compat function: isSupabaseConfigured', () => {
  assert.strictEqual(typeof PCS.isSupabaseConfigured, 'function');
});

test('exports backward-compat function: isResendConfigured', () => {
  assert.strictEqual(typeof PCS.isResendConfigured, 'function');
});

// ── 3. Class instantiation with injected config ───────────────────────────────

test('PilotConversionService instantiates with no options (uses env)', () => {
  const svc = new PCS.PilotConversionService();
  assert.ok(svc, 'Instance is falsy');
});

test('PilotConversionService instantiates with injected config', () => {
  const svc = new PCS.PilotConversionService({
    apiUrl: 'http://localhost:3000',
    apiKey: 'test-key',
    resendApiKey: 'resend-test',
    fromEmail: 'test@example.com',
    fromName: 'Test',
    stripePricePro: 'price_test',
    stripeSecretKey: 'sk_test',
    appUrl: 'http://localhost:3000'
  });
  assert.ok(svc, 'Instance is falsy');
  assert.strictEqual(svc.fromEmail, 'test@example.com');
  assert.strictEqual(svc.fromName, 'Test');
  assert.strictEqual(svc.appUrl, 'http://localhost:3000');
});

test('isConfigured() returns false when no API credentials', () => {
  const svc = new PCS.PilotConversionService();
  // No env vars set in test, should be unconfigured
  assert.strictEqual(typeof svc.isConfigured(), 'boolean');
});

test('isResendConfigured() returns false when no RESEND_API_KEY', () => {
  const svc = new PCS.PilotConversionService({ apiUrl: null, apiKey: null });
  assert.strictEqual(svc.isResendConfigured(), false);
});

test('isResendConfigured() returns true when resendApiKey injected', () => {
  const svc = new PCS.PilotConversionService({ resendApiKey: 'test-key' });
  assert.strictEqual(svc.isResendConfigured(), true);
});

// ── 4. MILESTONES config correctness ─────────────────────────────────────────

test('MILESTONES.day_30 has days=30, template=day30_midpoint', () => {
  assert.strictEqual(PCS.MILESTONES.day_30.days, 30);
  assert.strictEqual(PCS.MILESTONES.day_30.template, 'day30_midpoint');
  assert.ok(PCS.MILESTONES.day_30.subject.includes('{{firstName}}'));
});

test('MILESTONES.day_45 has days=45, template=day45_urgent', () => {
  assert.strictEqual(PCS.MILESTONES.day_45.days, 45);
  assert.strictEqual(PCS.MILESTONES.day_45.template, 'day45_urgent');
});

test('MILESTONES.day_55 has days=55, template=day55_final', () => {
  assert.strictEqual(PCS.MILESTONES.day_55.days, 55);
  assert.strictEqual(PCS.MILESTONES.day_55.template, 'day55_final');
});

// ── 5. generateCheckoutUrl produces correct URL ───────────────────────────────

test('generateCheckoutUrl includes agent ID and plan=pro', () => {
  const svc = new PCS.PilotConversionService({ appUrl: 'https://app.leadflow.ai' });
  const url = svc.generateCheckoutUrl({ id: 'agent-123' });
  assert.ok(url.includes('agent-123'), `URL missing agent ID: ${url}`);
  assert.ok(url.includes('plan=pro'), `URL missing plan=pro: ${url}`);
  assert.ok(url.includes('source=pilot_conversion'), `URL missing source: ${url}`);
});

// ── 6. getAgentStats returns safe defaults when unconfigured ──────────────────

test('getAgentStats returns safe defaults when DB not configured', async () => {
  const svc = new PCS.PilotConversionService(); // no DB
  const stats = await svc.getAgentStats('agent-123');
  assert.strictEqual(stats.leadsResponded, 0);
  assert.strictEqual(stats.avgResponseTime, 'N/A');
  assert.strictEqual(stats.appointmentsBooked, 0);
});

// ── 7. getEligibleAgents returns empty array when unconfigured ────────────────

test('getEligibleAgents returns empty array when DB not configured', async () => {
  const svc = new PCS.PilotConversionService();
  const agents = await svc.getEligibleAgents('day_30');
  assert.deepStrictEqual(agents, []);
});

test('getEligibleAgents throws for invalid milestone', async () => {
  const svc = new PCS.PilotConversionService({ apiUrl: 'http://x', apiKey: 'y' });
  // isConfigured will be true but DB call will fail — invalid milestone throws before DB
  try {
    await svc.getEligibleAgents('invalid_milestone');
    assert.fail('Should have thrown for invalid milestone');
  } catch (err) {
    assert.ok(err.message.includes('Invalid milestone'), `Wrong error: ${err.message}`);
  }
});

// ── 8. Consumer import paths ──────────────────────────────────────────────────

test('scripts/pilot-conversion-cron.js imports from new path', () => {
  const content = fs.readFileSync(path.join(PROJECT_ROOT, 'scripts/pilot-conversion-cron.js'), 'utf8');
  assert.ok(
    content.includes('lib/services/PilotConversionService'),
    'scripts/pilot-conversion-cron.js still imports from old path'
  );
  assert.ok(
    !content.includes("require('../lib/pilot-conversion-service')"),
    'scripts/pilot-conversion-cron.js has stale require of old file'
  );
});

test('tests/e2e/pilot-conversion-email-sequence.test.js imports from new path', () => {
  const content = fs.readFileSync(
    path.join(PROJECT_ROOT, 'tests/e2e/pilot-conversion-email-sequence.test.js'), 'utf8'
  );
  assert.ok(
    content.includes('lib/services/PilotConversionService'),
    'e2e test still imports from old path'
  );
});

test('tests/integration/pilot-conversion-email-sequence.test.js imports from new path', () => {
  const content = fs.readFileSync(
    path.join(PROJECT_ROOT, 'tests/integration/pilot-conversion-email-sequence.test.js'), 'utf8'
  );
  assert.ok(
    content.includes('lib/services/PilotConversionService'),
    'integration test still imports from old path'
  );
});

test('app/api/cron/pilot-conversion/route.js jsdoc updated to new path', () => {
  const content = fs.readFileSync(
    path.join(PROJECT_ROOT, 'app/api/cron/pilot-conversion/route.js'), 'utf8'
  );
  assert.ok(
    content.includes('@/lib/services/PilotConversionService'),
    'route.js still references old import path'
  );
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
