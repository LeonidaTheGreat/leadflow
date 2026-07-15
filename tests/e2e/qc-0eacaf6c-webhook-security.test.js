'use strict';

/**
 * QC: Webhook signature verification security regression test.
 *
 * PR #1849 changed fub-webhook-listener.js to skip HMAC verification
 * when FUB_WEBHOOK_SECRET is not set (fail-open). This test documents
 * the correct expected behavior (fail-closed when secret is absent).
 *
 * Correct fix: environment-gate the bypass so development can skip
 * verification but the endpoint still rejects when secret is missing:
 *
 *   if (!fubSecret) {
 *     if (process.env.NODE_ENV === 'production') {
 *       return res.status(503).json({ error: 'Webhook verification not configured' });
 *     }
 *     log.warn('FUB_WEBHOOK_SECRET not set — skipping verification (dev only)');
 *   }
 */

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');

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

function postJson(server, path, body, headers = {}) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request(
      {
        host: '127.0.0.1', port, path, method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function runAll() {
  console.log('\n🔒 QC: Webhook Security — PR #1849 regression check\n');

  // Load app once. Use PORT=0 so server.js auto-start picks a random port (no conflict).
  // NODE_ENV=test skips lib/config/index.js's production-only Stripe var check.
  const savedPort = process.env.PORT;
  const savedEnv = process.env.NODE_ENV;
  process.env.PORT = '0';
  process.env.NODE_ENV = 'test';
  const app = require('../../server');
  process.env.PORT = savedPort !== undefined ? savedPort : undefined;
  process.env.NODE_ENV = savedEnv;

  // Mount our own test server on a separate random port
  const testServer = http.createServer(app);
  await new Promise(r => testServer.listen(0, '127.0.0.1', r));

  const PAYLOAD = { event: 'peopleCreated', person: { id: 1, firstName: 'QC' } };

  try {
    // 1. Valid HMAC + secret set → 200
    await test('valid HMAC signature + secret set → 200', async () => {
      const secret = 'test-hmac-qc-abc123';
      const savedSecret = process.env.FUB_WEBHOOK_SECRET;
      process.env.FUB_WEBHOOK_SECRET = secret;
      try {
        const sig = crypto.createHmac('sha256', secret).update(JSON.stringify(PAYLOAD)).digest('hex');
        const res = await postJson(testServer, '/webhook/fub', PAYLOAD, { 'x-followupboss-signature': sig });
        assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
      } finally {
        if (savedSecret !== undefined) process.env.FUB_WEBHOOK_SECRET = savedSecret;
        else delete process.env.FUB_WEBHOOK_SECRET;
      }
    });

    // 2. Bad signature + secret set → 401
    await test('bad signature + secret set → 401', async () => {
      const savedSecret = process.env.FUB_WEBHOOK_SECRET;
      process.env.FUB_WEBHOOK_SECRET = 'some-secret-value';
      try {
        const res = await postJson(testServer, '/webhook/fub', PAYLOAD, { 'x-followupboss-signature': 'bad-sig' });
        assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
      } finally {
        if (savedSecret !== undefined) process.env.FUB_WEBHOOK_SECRET = savedSecret;
        else delete process.env.FUB_WEBHOOK_SECRET;
      }
    });

    // 3. SECURITY REGRESSION: No secret → should return 503 (fail-closed)
    //    PR #1849 changed this to 200 (fail-open). Fix: add env gate in fub-webhook-listener.js.
    await test('[REGRESSION] no FUB_WEBHOOK_SECRET → should be 503', async () => {
      const savedSecret = process.env.FUB_WEBHOOK_SECRET;
      delete process.env.FUB_WEBHOOK_SECRET;
      try {
        const res = await postJson(testServer, '/webhook/fub', PAYLOAD);
        assert.strictEqual(res.status, 503,
          `[REGRESSION] Should return 503 when FUB_WEBHOOK_SECRET is missing, got ${res.status}. ` +
          'PR #1849 changes this to fail-open (200). Fix: env-gate the bypass in fub-webhook-listener.js'
        );
      } finally {
        if (savedSecret !== undefined) process.env.FUB_WEBHOOK_SECRET = savedSecret;
        else delete process.env.FUB_WEBHOOK_SECRET;
      }
    });
  } finally {
    await new Promise(r => testServer.close(r));
  }

  console.log(`\n📊 Results: ${passed}/${passed + failed} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runAll().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
