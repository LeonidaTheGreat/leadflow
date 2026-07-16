'use strict';
/**
 * QC test: uc-sms-activation-nudge
 * Verifies the FUBService consent fix covers all falsy-but-not-opted-out paths,
 * and that the webhook listener correctly soft-skips when no secret is set.
 *
 * Runnable without a live Next.js server.
 */

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.error(`  ❌ ${name}: ${e.message}`); failed++; }
}

// ── FUBService consent edge cases ────────────────────────────────────────────

function makeSvc(consentOverride, twilioCallLog) {
  const FUBService = require('../../lib/services/FUBService');
  const svc = new FUBService({
    registerEventHandlers: false,
    sendSmsViatwilio: async (to, msg) => { twilioCallLog.push({ to, msg }); return { sid: 'SM_qc', status: 'queued' }; },
    scheduleSatisfactionPing: async () => {},
    createLeadSequence: async () => {},
    findLeadByFubId: async () => null,
    axios: {
      get: async () => ({
        data: {
          id: 1, firstName: 'QC', phoneNumber: '+14165550001',
          phones: [{ value: '+14165550001', type: 'mobile' }],
          ...consentOverride
        }
      }),
      post: async () => ({ data: {} }),
    }
  });
  svc.registerEventHandlers();
  return svc;
}

// ── Webhook listener edge case: no secret ─────────────────────────────────────

function postJson(addr, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const [host, port] = addr.replace('http://', '').split(':');
    const req = http.request(
      { host, port: Number(port), path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers } },
      res => { let d = ''; res.on('data', c => { d += c; }); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) })); }
    );
    req.on('error', reject); req.write(bodyStr); req.end();
  });
}

async function run() {
  console.log('\n🔍 QC: uc-sms-activation-nudge consent + webhook edge cases\n');

  // ── Consent logic (FUBService.handleLeadCreated) ──────────────────────────

  await test('consents: null → Twilio called (no explicit opt-out)', async () => {
    const log = [];
    const svc = makeSvc({ consents: null }, log);
    await svc.handleLeadCreated({ id: 1, phoneNumber: '+14165550001', name: 'QC' });
    assert.strictEqual(log.length, 1, 'Twilio must be called when consents is null');
  });

  await test('consents: {} (present but no sms key) → Twilio called', async () => {
    const log = [];
    // Delete cache so we get a fresh instance with correct axios
    Object.keys(require.cache).filter(k => k.includes('FUBService')).forEach(k => delete require.cache[k]);
    const svc = makeSvc({ consents: {} }, log);
    await svc.handleLeadCreated({ id: 1, phoneNumber: '+14165550001', name: 'QC' });
    assert.strictEqual(log.length, 1, 'Twilio must be called when consents.sms key is absent');
  });

  await test('consents: { sms: false } → Twilio NOT called', async () => {
    const log = [];
    Object.keys(require.cache).filter(k => k.includes('FUBService')).forEach(k => delete require.cache[k]);
    const svc = makeSvc({ consents: { sms: false } }, log);
    await svc.handleLeadCreated({ id: 1, phoneNumber: '+14165550001', name: 'QC' });
    assert.strictEqual(log.length, 0, 'Twilio must NOT be called when consents.sms === false');
  });

  await test('consents: { sms: true } → Twilio called', async () => {
    const log = [];
    Object.keys(require.cache).filter(k => k.includes('FUBService')).forEach(k => delete require.cache[k]);
    const svc = makeSvc({ consents: { sms: true } }, log);
    await svc.handleLeadCreated({ id: 1, phoneNumber: '+14165550001', name: 'QC' });
    assert.strictEqual(log.length, 1, 'Twilio must be called when consents.sms === true');
  });

  // ── Webhook listener: security boundary when secret is missing ────────────

  await test('webhook returns 200 (not 503) when FUB_WEBHOOK_SECRET is unset', async () => {
    const saved = process.env.FUB_WEBHOOK_SECRET;
    delete process.env.FUB_WEBHOOK_SECRET;
    // clear webhook listener module cache so env change takes effect
    Object.keys(require.cache).filter(k => k.includes('fub-webhook-listener')).forEach(k => delete require.cache[k]);
    const savedEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const app = require('../../server');
    process.env.NODE_ENV = savedEnv;
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const res = await postJson(`http://127.0.0.1:${port}`, '/webhook/fub',
        { event: 'peopleCreated', person: { id: 99, firstName: 'QC', phones: [] } });
      assert.notStrictEqual(res.status, 503, 'Should not return 503 (missing-secret) — PR changed this to a soft skip');
      assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    } finally {
      server.close();
      if (saved !== undefined) process.env.FUB_WEBHOOK_SECRET = saved;
      else delete process.env.FUB_WEBHOOK_SECRET;
      Object.keys(require.cache).filter(k => k.includes('fub-webhook-listener')).forEach(k => delete require.cache[k]);
    }
  });

  await test('webhook returns 401 for wrong HMAC when secret IS set', async () => {
    const saved = process.env.FUB_WEBHOOK_SECRET;
    process.env.FUB_WEBHOOK_SECRET = 'qc-test-secret';
    Object.keys(require.cache).filter(k => k.includes('fub-webhook-listener')).forEach(k => delete require.cache[k]);
    const app = require('../../server');
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
      const res = await postJson(`http://127.0.0.1:${port}`, '/webhook/fub',
        { event: 'peopleCreated', person: { id: 100 } },
        { 'x-followupboss-signature': 'bad-sig' });
      assert.strictEqual(res.status, 401, `Expected 401 for bad sig, got ${res.status}`);
    } finally {
      server.close();
      if (saved !== undefined) process.env.FUB_WEBHOOK_SECRET = saved;
      else delete process.env.FUB_WEBHOOK_SECRET;
      Object.keys(require.cache).filter(k => k.includes('fub-webhook-listener')).forEach(k => delete require.cache[k]);
    }
  });

  // ── SQL migration check ───────────────────────────────────────────────────

  await test('add-activation-sms-timestamp.sql uses IF NOT EXISTS (idempotent)', async () => {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, '../../scripts/db/add-activation-sms-timestamp.sql'), 'utf8');
    assert.ok(sql.includes('IF NOT EXISTS'), 'Migration must be idempotent (ADD COLUMN IF NOT EXISTS)');
    assert.ok(sql.includes('last_activation_sms_at'), 'Migration must add last_activation_sms_at column');
    assert.ok(sql.includes('TIMESTAMPTZ'), 'Column must be timezone-aware (TIMESTAMPTZ)');
  });

  console.log(`\n📊 ${passed + failed} tests — ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
