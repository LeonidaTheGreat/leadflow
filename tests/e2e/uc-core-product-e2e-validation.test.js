'use strict';

/**
 * Core Product E2E Validation — uc-core-product-e2e-validation
 *
 * Validates: FUB webhook → FUBService → AI SMS → Twilio call path
 * within the 30-second SLA.
 *
 * Root cause fixed:
 *   1. fub-webhook-listener: 503 → skip when FUB_WEBHOOK_SECRET not set
 *   2. FUBService.handleLeadCreated: `!consents?.sms` → `consents?.sms === false`
 *      (FUB API doesn't return consents field; missing ≠ opted-out)
 */

const assert = require('assert');
const http = require('http');
const crypto = require('crypto');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function waitForCall(callLog, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (callLog.length > 0) {
        clearInterval(interval);
        resolve(callLog[0]);
      } else if (Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        reject(new Error(`Twilio not called within ${timeoutMs}ms`));
      }
    }, 50);
  });
}

function postJson(serverAddr, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const [host, port] = serverAddr.replace('http://', '').split(':');
    const req = http.request(
      { host, port: Number(port), path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers } },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

const mockAxios = {
  get: async () => ({ data: { id: 42, firstName: 'Jane', phoneNumber: '+14165550199' } }),
  post: async () => ({ data: {} }),
};

async function test_consent_check_allows_lead_without_consents_field() {
  const twilioCallLog = [];

  const FUBService = require('../../lib/services/FUBService');
  const svc = new FUBService({
    registerEventHandlers: false,
    sendSmsViatwilio: async (to, msg, opts) => {
      twilioCallLog.push({ to, msg, opts });
      return { sid: 'SM_test_123', status: 'queued' };
    },
    scheduleSatisfactionPing: async () => {},
    createLeadSequence: async () => {},
    findLeadByFubId: async () => null,
    axios: {
      get: async () => ({
        data: {
          id: 42,
          firstName: 'Jane',
          phoneNumber: '+14165550199',
          phones: [{ value: '+14165550199', type: 'mobile' }],
          // No consents field at all — FUB API default
        }
      }),
      post: async () => ({ data: {} }),
    }
  });

  svc.registerEventHandlers();

  const startMs = Date.now();
  await svc.handleLeadCreated({ id: 42, phoneNumber: '+14165550199', name: 'Jane Test' });
  const elapsedMs = Date.now() - startMs;

  assert.strictEqual(twilioCallLog.length, 1, 'Twilio should be called exactly once');
  assert.ok(twilioCallLog[0].to === '+14165550199', 'Twilio called with correct phone');
  assert.ok(typeof twilioCallLog[0].msg === 'string' && twilioCallLog[0].msg.length > 0, 'SMS message must be non-empty');
  assert.ok(elapsedMs < 30_000, `SMS should fire in <30s, took ${elapsedMs}ms`);
}

async function test_consent_check_blocks_lead_with_sms_false() {
  const twilioCallLog = [];

  const FUBService = require('../../lib/services/FUBService');
  const svc = new FUBService({
    registerEventHandlers: false,
    sendSmsViatwilio: async (to, msg, opts) => {
      twilioCallLog.push({ to, msg, opts });
      return { sid: 'SM_test_456', status: 'queued' };
    },
    scheduleSatisfactionPing: async () => {},
    createLeadSequence: async () => {},
    findLeadByFubId: async () => null,
    axios: {
      get: async () => ({
        data: {
          id: 99,
          firstName: 'Opt Out',
          phoneNumber: '+14165550100',
          phones: [{ value: '+14165550100', type: 'mobile' }],
          consents: { sms: false },
        }
      }),
      post: async () => ({ data: {} }),
    }
  });

  svc.registerEventHandlers();
  await svc.handleLeadCreated({ id: 99, phoneNumber: '+14165550100', name: 'Opt Out' });
  assert.strictEqual(twilioCallLog.length, 0, 'Twilio must NOT be called for opted-out lead');
}

async function test_consent_check_allows_lead_with_sms_true() {
  const twilioCallLog = [];

  const FUBService = require('../../lib/services/FUBService');
  const svc = new FUBService({
    registerEventHandlers: false,
    sendSmsViatwilio: async (to, msg, opts) => {
      twilioCallLog.push({ to, msg, opts });
      return { sid: 'SM_test_789', status: 'queued' };
    },
    scheduleSatisfactionPing: async () => {},
    createLeadSequence: async () => {},
    findLeadByFubId: async () => null,
    axios: {
      get: async () => ({
        data: {
          id: 77,
          firstName: 'Opted In',
          phoneNumber: '+14165550177',
          phones: [{ value: '+14165550177', type: 'mobile' }],
          consents: { sms: true },
        }
      }),
      post: async () => ({ data: {} }),
    }
  });

  svc.registerEventHandlers();
  await svc.handleLeadCreated({ id: 77, phoneNumber: '+14165550177', name: 'Opted In' });
  assert.strictEqual(twilioCallLog.length, 1, 'Twilio should be called for opted-in lead');
}

async function test_webhook_endpoint_accepts_post_without_secret() {
  // fub-webhook-listener now skips verification when FUB_WEBHOOK_SECRET is not set
  const saved = process.env.FUB_WEBHOOK_SECRET;
  delete process.env.FUB_WEBHOOK_SECRET;

  // Set production to prevent server.js from auto-starting a listener on port 3000
  const savedEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = require('../../server');
  process.env.NODE_ENV = savedEnv;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const addr = `http://127.0.0.1:${port}`;

  try {
    const payload = { event: 'peopleCreated', person: { id: 1, firstName: 'Test', phones: [] } };
    const res = await postJson(addr, '/webhook/fub', payload);
    assert.ok(
      res.status === 200,
      `Webhook should return 200 when no secret set, got ${res.status}`
    );
    assert.ok(res.body.received === true, 'Response should include received:true');
  } finally {
    server.close();
    if (saved !== undefined) process.env.FUB_WEBHOOK_SECRET = saved;
    else delete process.env.FUB_WEBHOOK_SECRET;
  }
}

async function test_webhook_endpoint_rejects_bad_signature_when_secret_set() {
  const saved = process.env.FUB_WEBHOOK_SECRET;
  process.env.FUB_WEBHOOK_SECRET = 'test-secret-for-rejection';

  // Avoid module cache from previous test
  Object.keys(require.cache)
    .filter((k) => k.includes('fub-webhook-listener'))
    .forEach((k) => delete require.cache[k]);

  const app = require('../../server');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const addr = `http://127.0.0.1:${port}`;

  try {
    const payload = { event: 'peopleCreated', person: { id: 2, firstName: 'Hacker' } };
    const res = await postJson(addr, '/webhook/fub', payload, {
      'x-followupboss-signature': 'wrong-signature',
    });
    assert.strictEqual(res.status, 401, `Should return 401 for bad signature, got ${res.status}`);
  } finally {
    server.close();
    if (saved !== undefined) process.env.FUB_WEBHOOK_SECRET = saved;
    else delete process.env.FUB_WEBHOOK_SECRET;
    Object.keys(require.cache)
      .filter((k) => k.includes('fub-webhook-listener'))
      .forEach((k) => delete require.cache[k]);
  }
}

async function test_webhook_endpoint_accepts_valid_hmac_signature() {
  const secret = 'test-hmac-secret-abc';
  const saved = process.env.FUB_WEBHOOK_SECRET;
  process.env.FUB_WEBHOOK_SECRET = secret;

  Object.keys(require.cache)
    .filter((k) => k.includes('fub-webhook-listener'))
    .forEach((k) => delete require.cache[k]);

  const app = require('../../server');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const addr = `http://127.0.0.1:${port}`;

  try {
    const payload = { event: 'peopleCreated', person: { id: 3, firstName: 'Valid' } };
    const bodyStr = JSON.stringify(payload);
    const sig = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

    const res = await postJson(addr, '/webhook/fub', payload, {
      'x-followupboss-signature': sig,
    });
    assert.strictEqual(res.status, 200, `Should accept valid HMAC signature, got ${res.status}`);
  } finally {
    server.close();
    if (saved !== undefined) process.env.FUB_WEBHOOK_SECRET = saved;
    else delete process.env.FUB_WEBHOOK_SECRET;
    Object.keys(require.cache)
      .filter((k) => k.includes('fub-webhook-listener'))
      .forEach((k) => delete require.cache[k]);
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('\n🧪 Core Product E2E Validation (uc-core-product-e2e-validation)\n');

  // Unit-level: SMS consent logic
  await test('lead without consents field → Twilio called (consent assumed)', test_consent_check_allows_lead_without_consents_field);
  await test('lead with consents.sms === false → Twilio NOT called', test_consent_check_blocks_lead_with_sms_false);
  await test('lead with consents.sms === true → Twilio called', test_consent_check_allows_lead_with_sms_true);

  // HTTP-level: webhook endpoint
  await test('POST /webhook/fub → 200 when FUB_WEBHOOK_SECRET not set', test_webhook_endpoint_accepts_post_without_secret);
  await test('POST /webhook/fub → 401 when secret set and signature wrong', test_webhook_endpoint_rejects_bad_signature_when_secret_set);
  await test('POST /webhook/fub → 200 when secret set and HMAC correct', test_webhook_endpoint_accepts_valid_hmac_signature);

  console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
