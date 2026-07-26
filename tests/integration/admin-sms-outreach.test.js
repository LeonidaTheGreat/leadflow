'use strict';

/**
 * Integration tests for Admin SMS Cold Outreach
 * UC: uc-leadflow-admin-sms-outreach
 *
 * Tests POST /api/admin/sms-outreach and GET /api/admin/sms-outreach/log
 * using stubbed DB and Twilio to avoid live API calls.
 */

const assert = require('assert');
const { test, beforeEach } = require('node:test');

const VALID_API_KEY = 'test-leadflow-api-key';
const JWT_SECRET = 'test-jwt-secret';
const APP_URL = 'https://leadflow-ai-five.vercel.app';
const AGENT_ID = '22222222-2222-4222-8222-222222222222';
const LOG_ID = '33333333-3333-4333-8333-333333333333';
const TWILIO_SID = 'SMtest123';

process.env.LEADFLOW_API_KEY = VALID_API_KEY;
process.env.JWT_SECRET = JWT_SECRET;
process.env.NEXT_PUBLIC_APP_URL = APP_URL;
process.env.TWILIO_ACCOUNT_SID = 'ACtest';
process.env.TWILIO_AUTH_TOKEN = 'authtest';
process.env.TWILIO_PHONE_NUMBER = '+15005550006';

const dbPath = require.resolve('../../lib/db');
const servicePath = require.resolve('../../lib/services/AdminSmsOutreachService');
const magicLinkServicePath = require.resolve('../../lib/services/AdminMagicLinkService');
const twilioServicePath = require.resolve('../../lib/services/TwilioService');
const routePath = require.resolve('../../routes/admin/sms-outreach');

let mockPool;
let mockTwilioService;
let mockMagicLinkService;
const MOCK_LOGIN_URL = `${APP_URL}/accept-invite?token=testtoken`;

function makePool({ logRows = [] } = {}) {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });

      if (/INSERT INTO admin_sms_outreach_log/i.test(sql)) {
        return {
          rows: [{
            id: LOG_ID,
            first_name: params[0],
            phone: params[1],
            market: params[2],
            email: params[3],
            login_url: params[4],
            twilio_sid: params[5],
            sms_status: params[6],
            reply_status: 'pending',
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }],
        };
      }

      if (/SELECT id, first_name, phone, market/i.test(sql)) {
        return { rows: logRows };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
}

function makeTwilioService({ shouldFail = false } = {}) {
  return {
    async sendSms() {
      if (shouldFail) throw Object.assign(new Error('Twilio error'), { code: 21211 });
      return { sid: TWILIO_SID, success: true };
    },
  };
}

function makeMagicLinkService() {
  return {
    async createMagicLink() {
      return { loginUrl: MOCK_LOGIN_URL };
    },
  };
}

function installStubs() {
  // Clear cached modules so stubs take effect
  delete require.cache[servicePath];
  delete require.cache[routePath];

  require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { getPool: () => mockPool },
  };
  require.cache[twilioServicePath] = {
    id: twilioServicePath, filename: twilioServicePath, loaded: true,
    exports: class MockTwilio {
      sendSms(...args) { return mockTwilioService.sendSms(...args); }
    },
  };
  require.cache[magicLinkServicePath] = {
    id: magicLinkServicePath, filename: magicLinkServicePath, loaded: true,
    exports: class MockMagicLink {
      createMagicLink(...args) { return mockMagicLinkService.createMagicLink(...args); }
    },
  };
}

function makeRequest(router, method, path, body, headers = {}) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/', router);

  return new Promise((resolve, reject) => {
    const http = require('http');
    const server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port,
        path,
        method: method.toUpperCase(),
        headers: { 'Content-Type': 'application/json', ...headers },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(data || '{}') });
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

// ─── POST /api/admin/sms-outreach ────────────────────────────────────────────

test('POST /api/admin/sms-outreach — missing API key returns 401', async () => {
  mockPool = makePool();
  mockTwilioService = makeTwilioService();
  mockMagicLinkService = makeMagicLinkService();
  installStubs();
  const router = require(routePath);

  const res = await makeRequest(router, 'POST', '/api/admin/sms-outreach',
    { firstName: 'Jane', phone: '+14165551234', market: 'Toronto', email: 'jane@example.com' },
    {});

  assert.strictEqual(res.status, 401);
  assert.ok(res.body.error);
});

test('POST /api/admin/sms-outreach — missing required fields returns 400', async () => {
  mockPool = makePool();
  mockTwilioService = makeTwilioService();
  mockMagicLinkService = makeMagicLinkService();
  installStubs();
  const router = require(routePath);

  const res = await makeRequest(router, 'POST', '/api/admin/sms-outreach',
    { firstName: 'Jane' },
    { 'x-api-key': VALID_API_KEY });

  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /phone|market|email/i);
});

test('POST /api/admin/sms-outreach — happy path sends SMS and returns log entry', async () => {
  mockPool = makePool();
  mockTwilioService = makeTwilioService();
  mockMagicLinkService = makeMagicLinkService();
  installStubs();
  const router = require(routePath);

  const res = await makeRequest(router, 'POST', '/api/admin/sms-outreach',
    { firstName: 'Jane', phone: '+14165551234', market: 'Toronto', email: 'jane@example.com' },
    { 'x-api-key': VALID_API_KEY });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.id);
  assert.ok(res.body.loginUrl);
  assert.strictEqual(res.body.twilio_sid, TWILIO_SID);
  assert.strictEqual(res.body.sms_status, 'sent');

  // Verify DB was written
  const insertCall = mockPool.calls.find(c => /INSERT INTO admin_sms_outreach_log/i.test(c.sql));
  assert.ok(insertCall, 'Should have inserted into admin_sms_outreach_log');
  assert.strictEqual(insertCall.params[0], 'Jane');
  assert.strictEqual(insertCall.params[1], '+14165551234');
  assert.strictEqual(insertCall.params[2], 'Toronto');
});

test('POST /api/admin/sms-outreach — Twilio failure still logs as failed', async () => {
  mockPool = makePool();
  mockTwilioService = makeTwilioService({ shouldFail: true });
  mockMagicLinkService = makeMagicLinkService();
  installStubs();
  const router = require(routePath);

  const res = await makeRequest(router, 'POST', '/api/admin/sms-outreach',
    { firstName: 'Jane', phone: '+14165551234', market: 'Toronto', email: 'jane@example.com' },
    { 'x-api-key': VALID_API_KEY });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.sms_status, 'failed');
});

// ─── GET /api/admin/sms-outreach/log ─────────────────────────────────────────

test('GET /api/admin/sms-outreach/log — missing API key returns 401', async () => {
  mockPool = makePool();
  mockTwilioService = makeTwilioService();
  mockMagicLinkService = makeMagicLinkService();
  installStubs();
  const router = require(routePath);

  const res = await makeRequest(router, 'GET', '/api/admin/sms-outreach/log', null, {});
  assert.strictEqual(res.status, 401);
});

test('GET /api/admin/sms-outreach/log — returns empty array when no entries', async () => {
  mockPool = makePool({ logRows: [] });
  mockTwilioService = makeTwilioService();
  mockMagicLinkService = makeMagicLinkService();
  installStubs();
  const router = require(routePath);

  const res = await makeRequest(router, 'GET', '/api/admin/sms-outreach/log', null,
    { 'x-api-key': VALID_API_KEY });

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body.log, []);
});

test('GET /api/admin/sms-outreach/log — returns log entries', async () => {
  const entry = {
    id: LOG_ID, first_name: 'Jane', phone: '+14165551234',
    market: 'Toronto', email: 'jane@example.com',
    login_url: MOCK_LOGIN_URL, twilio_sid: TWILIO_SID,
    sms_status: 'sent', reply_status: 'pending',
    sent_at: new Date().toISOString(), created_at: new Date().toISOString(),
  };
  mockPool = makePool({ logRows: [entry] });
  mockTwilioService = makeTwilioService();
  mockMagicLinkService = makeMagicLinkService();
  installStubs();
  const router = require(routePath);

  const res = await makeRequest(router, 'GET', '/api/admin/sms-outreach/log', null,
    { 'x-api-key': VALID_API_KEY });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.log.length, 1);
  assert.strictEqual(res.body.log[0].first_name, 'Jane');
});
