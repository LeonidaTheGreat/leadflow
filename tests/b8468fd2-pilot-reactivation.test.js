#!/usr/bin/env node
/**
 * Tests: PilotReactivationService — UC uc-pilot-email-reactivation-zero-phone
 *
 * Verifies:
 * 1. Schema: pilot_email_log.agent_id column exists, pilot_signup_id nullable
 * 2. Service loads with required methods
 * 3. Email HTML: first_name fallback and content
 * 4. resolveEmailsToSend: email_1 for new agents, dedup guard, timing gates
 * 5. processSequence dry_run: returns cohort without sending
 * 6. Route: 401 without CRON_SECRET
 * 7. DB acceptance: pilot_email_log accepts agent_id inserts without pilot_signup_id
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const LOCAL_PG_URL = process.env.LOCAL_PG_URL || 'postgresql://clawdbot@localhost/openclaw';

let passed = 0;
let failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failures.push({ name, error: err.message });
    failed++;
  }
}

function psql(sql) {
  const r = spawnSync('psql', [LOCAL_PG_URL, '-c', sql], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout;
}

async function run() {
  // ─────────────────────────────────────────────────────────
  // 1. Schema
  // ─────────────────────────────────────────────────────────
  await test('pilot_email_log has agent_id column', () => {
    const out = psql(`SELECT column_name FROM information_schema.columns WHERE table_name='pilot_email_log' AND column_name='agent_id';`);
    assert.ok(out.includes('agent_id'), 'agent_id column must exist in pilot_email_log');
  });

  await test('pilot_email_log.pilot_signup_id is nullable', () => {
    const out = psql(`SELECT is_nullable FROM information_schema.columns WHERE table_name='pilot_email_log' AND column_name='pilot_signup_id';`);
    assert.ok(out.includes('YES'), 'pilot_signup_id must be nullable after migration');
  });

  await test('pilot_email_log.agent_id FK references real_estate_agents', () => {
    const out = psql(`
      SELECT ccu.table_name FROM information_schema.referential_constraints rc
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=rc.unique_constraint_name
      WHERE rc.constraint_name='pilot_email_log_agent_id_fkey';
    `);
    assert.ok(out.includes('real_estate_agents'), 'FK must reference real_estate_agents');
  });

  // ─────────────────────────────────────────────────────────
  // 2. Service loads
  // ─────────────────────────────────────────────────────────
  await test('PilotReactivationService exports class with required methods', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    assert.strictEqual(typeof PilotReactivationService, 'function');
    const proto = PilotReactivationService.prototype;
    ['getCohort', 'getSentLog', 'processSequence', 'resolveEmailsToSend', 'logSend',
      'buildEmail1Html', 'buildEmail2Html', 'buildEmail3Html'].forEach(m => {
      assert.strictEqual(typeof proto[m], 'function', `${m} must be a method`);
    });
  });

  // ─────────────────────────────────────────────────────────
  // 3. Email HTML
  // ─────────────────────────────────────────────────────────
  await test('buildEmail1Html falls back to "there" when no first_name', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const html = svc.buildEmail1Html(null);
    assert.ok(html.includes('Hi there'), '"Hi there" fallback must appear');
    assert.ok(html.includes('Log In to LeadFlow'), 'CTA must appear');
    assert.ok(html.includes('pilot_reactivation'), 'UTM campaign param must appear');
    assert.ok(html.includes('3-step'), '3-step quick start must appear');
  });

  await test('buildEmail1Html uses provided first_name', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    assert.ok(svc.buildEmail1Html('Sarah').includes('Hi Sarah'));
  });

  await test('buildEmail2Html renders correctly', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const html = svc.buildEmail2Html('John');
    assert.ok(html.includes('Hi John'));
    assert.ok(html.includes('5x faster'), 'email_2 must include 5x claim');
    assert.ok(html.includes('pilot_reactivation'), 'UTM param must appear');
  });

  await test('buildEmail3Html renders with "there" fallback and setup call CTA', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const html = svc.buildEmail3Html(null);
    assert.ok(html.includes('Hi there'), 'fallback must appear');
    assert.ok(html.includes('15-minute call'), 'setup call must be mentioned');
  });

  // ─────────────────────────────────────────────────────────
  // 4. Sequence logic
  // ─────────────────────────────────────────────────────────
  await test('resolveEmailsToSend → email_1 for agent with no history', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const agents = [{ id: 'a1', email: 'a@e.com', first_name: 'Alice' }];
    const toSend = svc.resolveEmailsToSend(agents, new Map());
    assert.strictEqual(toSend.length, 1);
    assert.strictEqual(toSend[0].emailType, 'pilot_reactivation_1');
    assert.ok(toSend[0].subject.includes('ready'), 'subject must say "ready"');
  });

  await test('resolveEmailsToSend → no email if email_1 sent within 24h', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const agents = [{ id: 'a1', email: 'a@e.com', first_name: 'Alice' }];
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const sentLog = new Map([['a1', new Map([['pilot_reactivation_1', twelveHoursAgo]])]]);
    const toSend = svc.resolveEmailsToSend(agents, sentLog, now);
    assert.strictEqual(toSend.length, 0, 'must not send within 24h of email_1');
  });

  await test('resolveEmailsToSend → email_2 after 3 days', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const agents = [{ id: 'a1', email: 'a@e.com', first_name: 'Alice' }];
    const now = new Date();
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
    const sentLog = new Map([['a1', new Map([['pilot_reactivation_1', fourDaysAgo]])]]);
    const toSend = svc.resolveEmailsToSend(agents, sentLog, now);
    assert.strictEqual(toSend.length, 1);
    assert.strictEqual(toSend[0].emailType, 'pilot_reactivation_2');
  });

  await test('resolveEmailsToSend → no email_2 before 3 days', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const agents = [{ id: 'a1', email: 'a@e.com', first_name: 'Alice' }];
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const sentLog = new Map([['a1', new Map([['pilot_reactivation_1', twoDaysAgo]])]]);
    const toSend = svc.resolveEmailsToSend(agents, sentLog, now);
    assert.strictEqual(toSend.length, 0, 'must not send email_2 before 3 days');
  });

  await test('resolveEmailsToSend → email_3 after 7 days when email_2 sent', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const agents = [{ id: 'a1', email: 'a@e.com', first_name: 'Alice' }];
    const now = new Date();
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const sentLog = new Map([['a1', new Map([
      ['pilot_reactivation_1', eightDaysAgo],
      ['pilot_reactivation_2', fiveDaysAgo],
    ])]]);
    const toSend = svc.resolveEmailsToSend(agents, sentLog, now);
    assert.strictEqual(toSend.length, 1);
    assert.strictEqual(toSend[0].emailType, 'pilot_reactivation_3');
  });

  await test('resolveEmailsToSend → email_2 (not email_3) when email_2 not yet sent', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const agents = [{ id: 'a1', email: 'a@e.com', first_name: 'Alice' }];
    const now = new Date();
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const sentLog = new Map([['a1', new Map([['pilot_reactivation_1', tenDaysAgo]])]]);
    const toSend = svc.resolveEmailsToSend(agents, sentLog, now);
    assert.strictEqual(toSend.length, 1);
    assert.strictEqual(toSend[0].emailType, 'pilot_reactivation_2', 'email_2 must come before email_3');
  });

  await test('resolveEmailsToSend → no more emails after all 3 sent', () => {
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const svc = new PilotReactivationService();
    const agents = [{ id: 'a1', email: 'a@e.com', first_name: 'Alice' }];
    const now = new Date();
    const old = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sentLog = new Map([['a1', new Map([
      ['pilot_reactivation_1', old],
      ['pilot_reactivation_2', old],
      ['pilot_reactivation_3', old],
    ])]]);
    const toSend = svc.resolveEmailsToSend(agents, sentLog, now);
    assert.strictEqual(toSend.length, 0, 'no emails after all 3 sent');
  });

  // ─────────────────────────────────────────────────────────
  // 5. processSequence dry_run
  // ─────────────────────────────────────────────────────────
  await test('processSequence dry_run returns cohort without sending', async () => {
    const { Pool } = require('pg');
    const PilotReactivationService = require(path.join(ROOT, 'lib/services/PilotReactivationService'));
    const pool = new Pool({ connectionString: LOCAL_PG_URL });
    let sendCalled = false;
    const mockEmail = { fromEmail: 'test@e.com', send: async () => { sendCalled = true; return { success: true }; } };
    try {
      const svc = new PilotReactivationService({ pool, emailService: mockEmail });
      const result = await svc.processSequence({ dryRun: true });
      assert.strictEqual(typeof result.total_cohort, 'number', 'must return total_cohort');
      assert.strictEqual(result.dry_run, true, 'dry_run flag must be true');
      assert.ok(!sendCalled, 'emailService.send must NOT be called in dry_run');
      result.results.forEach(r => assert.strictEqual(r.status, 'dry_run'));
    } finally {
      await pool.end();
    }
  });

  // ─────────────────────────────────────────────────────────
  // 6. Route auth
  // ─────────────────────────────────────────────────────────
  await test('GET /api/cron/pilot-reactivation returns 401 without auth', async () => {
    const http = require('http');
    const express = require('express');
    const router = require(path.join(ROOT, 'routes/internal/pilot-reactivation'));

    const app = express();
    app.use(express.json());
    app.use('/', router);

    const saved = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'test-secret-xyz';
    const server = http.createServer(app);
    await new Promise(r => server.listen(0, r));
    const { port } = server.address();

    try {
      const res = await new Promise((resolve, reject) =>
        http.get(`http://127.0.0.1:${port}/api/cron/pilot-reactivation`, resolve).on('error', reject)
      );
      assert.strictEqual(res.statusCode, 401, 'unauthenticated request must return 401');
    } finally {
      process.env.CRON_SECRET = saved;
      await new Promise(r => server.close(r));
    }
  });

  // ─────────────────────────────────────────────────────────
  // 7. DB acceptance
  // ─────────────────────────────────────────────────────────
  await test('pilot_email_log accepts insert with agent_id and no pilot_signup_id', () => {
    const agentOut = psql(`SELECT id FROM real_estate_agents WHERE email_verified=true AND plan_tier='pilot' AND last_login_at IS NULL LIMIT 1;`);
    const match = agentOut.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/);
    if (!match) {
      console.log('   (skipped: no pilot agents in DB)');
      return;
    }
    const agentId = match[1];
    const out = psql(`INSERT INTO pilot_email_log (agent_id, email_type, recipient, subject, status) VALUES ('${agentId}', 'pilot_reactivation_test', 'test@example.com', 'Test', 'sent') RETURNING id;`);
    assert.ok(out.includes('(1 row)'), 'insert must succeed');
    psql(`DELETE FROM pilot_email_log WHERE email_type='pilot_reactivation_test';`);
  });

  // ─────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f.name}: ${f.error}`));
  }
  console.log('='.repeat(60));
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
