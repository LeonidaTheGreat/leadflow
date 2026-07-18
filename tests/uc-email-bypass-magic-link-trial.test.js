'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { test } = require('node:test');

const JWT_SECRET = 'test-jwt-secret-qc';
const APP_URL = 'https://leadflow-ai-five.vercel.app';
const AGENT_ID = '22222222-2222-4222-8222-222222222222';
const NOW = new Date('2026-07-18T10:00:00.000Z');

function makePool({ existingAgent = null } = {}) {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      const s = sql.replace(/\s+/g, ' ').trim().toUpperCase();
      if (s.startsWith('SELECT') && s.includes('FROM REAL_ESTATE_AGENTS')) {
        return { rows: existingAgent ? [existingAgent] : [] };
      }
      if (s.startsWith('INSERT INTO REAL_ESTATE_AGENTS')) {
        return {
          rows: [{
            id: AGENT_ID,
            email: params[0],
            first_name: params[1],
            last_name: params[2],
            status: params[4],
            email_verified: true,
          }],
        };
      }
      if (s.startsWith('UPDATE REAL_ESTATE_AGENTS')) {
        return {
          rows: [{
            id: params[0],
            email: existingAgent ? existingAgent.email : params[0],
            first_name: params[1] || (existingAgent ? existingAgent.first_name : ''),
            last_name: params[2] || (existingAgent ? existingAgent.last_name : ''),
            status: params[3],
            email_verified: true,
          }],
        };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
}

function loadService(pool) {
  const dbPath = require.resolve('../lib/db');
  const svcPath = require.resolve('../lib/services/AdminMagicLinkService');
  delete require.cache[svcPath];
  require.cache[dbPath] = {
    id: dbPath, filename: dbPath, loaded: true,
    exports: { getPool: () => pool },
  };
  return require('../lib/services/AdminMagicLinkService');
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  assert.strictEqual(parts.length, 3, 'expected 3-part JWT');
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET)
    .update(`${parts[0]}.${parts[1]}`).digest('base64url');
  assert.strictEqual(parts[2], expectedSig, 'JWT signature must verify with JWT_SECRET');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

function makeService(opts = {}) {
  const pool = opts.pool || makePool();
  const Svc = loadService(pool);
  return new Svc({
    pool,
    jwtSecret: opts.jwtSecret !== undefined ? opts.jwtSecret : JWT_SECRET,
    appUrl: APP_URL,
    now: () => NOW,
  });
}

test('input validation: missing email throws 400', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createMagicLink({ firstName: 'A', lastName: 'B' }),
    (err) => { assert.strictEqual(err.statusCode, 400); assert.match(err.message, /email/i); return true; }
  );
});

test('input validation: invalid email throws 400', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createMagicLink({ email: 'not-an-email', firstName: 'A', lastName: 'B' }),
    (err) => { assert.strictEqual(err.statusCode, 400); return true; }
  );
});

test('input validation: missing firstName throws 400', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createMagicLink({ email: 'a@b.com', lastName: 'B' }),
    (err) => { assert.strictEqual(err.statusCode, 400); assert.match(err.message, /firstName/); return true; }
  );
});

test('input validation: missing lastName throws 400', async () => {
  const svc = makeService();
  await assert.rejects(
    () => svc.createMagicLink({ email: 'a@b.com', firstName: 'A' }),
    (err) => { assert.strictEqual(err.statusCode, 400); assert.match(err.message, /lastName/); return true; }
  );
});

test('missing JWT_SECRET throws 503', async () => {
  const saved = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    const svc = makeService({ jwtSecret: null });
    await assert.rejects(
      () => svc.createMagicLink({ email: 'a@b.com', firstName: 'A', lastName: 'B' }),
      (err) => { assert.strictEqual(err.statusCode, 503); return true; }
    );
  } finally {
    if (saved !== undefined) process.env.JWT_SECRET = saved;
  }
});

test('new agent: INSERT issued, JWT contains correct claims', async () => {
  const pool = makePool();
  const svc = makeService({ pool });

  const result = await svc.createMagicLink({ email: 'new@agent.com', firstName: 'Jane', lastName: 'Smith' });

  assert.strictEqual(typeof result.loginUrl, 'string');
  const insertCall = pool.calls.find((c) => /INSERT INTO real_estate_agents/i.test(c.sql));
  assert(insertCall, 'INSERT must be issued for new agent');
  assert.strictEqual(insertCall.params[0], 'new@agent.com');
  assert.strictEqual(insertCall.params[4], 'onboarding');

  const token = new URL(result.loginUrl).searchParams.get('token');
  const payload = decodeJwtPayload(token);
  assert.strictEqual(payload.agentId, AGENT_ID);
  assert.strictEqual(payload.email, 'new@agent.com');
  assert.strictEqual(payload.purpose, 'trial-activation');
  assert.strictEqual(payload.iss, 'leadflow-admin-magic-link');
});

test('existing agent: UPDATE issued, no INSERT', async () => {
  const existing = {
    id: AGENT_ID, email: 'existing@broker.com',
    first_name: 'Old', last_name: 'Name', status: 'inactive', email_verified: false,
  };
  const pool = makePool({ existingAgent: existing });
  const svc = makeService({ pool });

  const result = await svc.createMagicLink({
    email: 'Existing@Broker.com', firstName: 'New', lastName: 'Name',
  });

  const insertCall = pool.calls.find((c) => /INSERT INTO real_estate_agents/i.test(c.sql));
  assert.strictEqual(insertCall, undefined, 'no INSERT for existing agent');

  const updateCall = pool.calls.find((c) => /UPDATE real_estate_agents/i.test(c.sql));
  assert(updateCall, 'UPDATE must be issued for existing agent');
  assert.strictEqual(updateCall.params[0], AGENT_ID);

  const payload = decodeJwtPayload(new URL(result.loginUrl).searchParams.get('token'));
  assert.strictEqual(payload.agentId, AGENT_ID);
  assert.strictEqual(payload.email, 'existing@broker.com');
});

test('JWT TTL is exactly 24 hours', async () => {
  const svc = makeService();
  const { loginUrl } = await svc.createMagicLink({ email: 'ttl@test.com', firstName: 'T', lastName: 'T' });
  const payload = decodeJwtPayload(new URL(loginUrl).searchParams.get('token'));
  assert.strictEqual(payload.exp - payload.iat, 24 * 60 * 60, 'TTL must be 24h');
});

test('loginUrl uses /accept-invite?token= path', async () => {
  const svc = makeService();
  const { loginUrl } = await svc.createMagicLink({ email: 'url@test.com', firstName: 'U', lastName: 'R' });
  assert(loginUrl.startsWith(APP_URL), `loginUrl must start with appUrl — got: ${loginUrl}`);
  assert(loginUrl.includes('/accept-invite?token='), 'loginUrl must target /accept-invite');
});

test('email is normalised to lowercase in DB and JWT', async () => {
  const pool = makePool();
  const svc = makeService({ pool });
  const { loginUrl } = await svc.createMagicLink({ email: 'UPPER@CASE.COM', firstName: 'U', lastName: 'C' });
  const payload = decodeJwtPayload(new URL(loginUrl).searchParams.get('token'));
  assert.strictEqual(payload.email, 'upper@case.com', 'email in JWT must be lowercase');
  const insertCall = pool.calls.find((c) => /INSERT INTO real_estate_agents/i.test(c.sql));
  assert(insertCall, 'INSERT must be issued');
  assert.strictEqual(insertCall.params[0], 'upper@case.com', 'email inserted must be lowercase');
});
