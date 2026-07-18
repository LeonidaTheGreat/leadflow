'use strict';

/**
 * QC E2E test — uc-manual-prospect-intake-and-activation
 * Covers: email normalisation, expiresAt TTL, update path (existing agent),
 *         missing-field validation, and route registration in server.js.
 */

const assert = require('assert');
const crypto = require('crypto');
const { test } = require('node:test');

const JWT_SECRET = 'test-jwt-secret-qc';
const APP_URL = 'https://leadflow-ai-five.vercel.app';
const EXISTING_AGENT_ID = '22222222-2222-4222-8222-222222222222';
const EXISTING_EMAIL = 'existing@realtor.com';

function makePool({ existingAgent = null } = {}) {
  return {
    calls: [],
    queryCount: 0,
    async query(sql, params) {
      this.queryCount++;
      this.calls.push({ sql: sql.trim(), params });

      if (/SELECT id, email, first_name/.test(sql)) {
        return { rows: existingAgent ? [existingAgent] : [] };
      }
      if (/INSERT INTO real_estate_agents/.test(sql)) {
        return {
          rows: [{
            id: '33333333-3333-4333-8333-333333333333',
            email: params[0],
            first_name: params[1],
            last_name: params[2],
            status: params[4],
            email_verified: true,
          }],
        };
      }
      if (/UPDATE real_estate_agents/.test(sql)) {
        return {
          rows: [{
            id: params[0],
            email: existingAgent.email,
            first_name: params[1] || existingAgent.first_name,
            last_name: params[2] || existingAgent.last_name,
            status: params[3],
            email_verified: true,
          }],
        };
      }
      throw new Error(`Unexpected SQL: ${sql.slice(0, 80)}`);
    },
  };
}

function makeService(pool) {
  delete require.cache[require.resolve('../lib/services/AdminMagicLinkService')];
  const dbPath = require.resolve('../lib/db');
  const prev = require.cache[dbPath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPool: () => pool } };
  const AdminMagicLinkService = require('../lib/services/AdminMagicLinkService');
  require.cache[dbPath] = prev;
  return new AdminMagicLinkService({ pool, jwtSecret: JWT_SECRET, appUrl: APP_URL });
}

// ---- 1. Email normalisation -------------------------------------------------
test('email is lower-cased and trimmed before DB lookup and token payload', async () => {
  const pool = makePool();
  const svc = makeService(pool);
  const result = await svc.createMagicLink({ email: '  UPPER@DOMAIN.COM  ', firstName: 'A', lastName: 'B' });

  const [, payloadB64] = new URL(result.loginUrl).searchParams.get('token').split('.');
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  assert.strictEqual(payload.email, 'upper@domain.com', 'token payload email must be lowercased');

  const lookupCall = pool.calls.find(c => /SELECT id, email/.test(c.sql));
  assert.strictEqual(lookupCall.params[0], 'upper@domain.com', 'DB lookup uses normalised email');
});

// ---- 2. expiresAt is 24h from now ------------------------------------------
test('expiresAt is 24 hours after the time of generation', async () => {
  const fixedNow = new Date('2026-07-18T10:00:00.000Z');
  const pool = makePool();
  delete require.cache[require.resolve('../lib/services/AdminMagicLinkService')];
  const dbPath = require.resolve('../lib/db');
  const prev = require.cache[dbPath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPool: () => pool } };
  const AdminMagicLinkService = require('../lib/services/AdminMagicLinkService');
  require.cache[dbPath] = prev;

  const svc = new AdminMagicLinkService({
    pool,
    jwtSecret: JWT_SECRET,
    appUrl: APP_URL,
    now: () => fixedNow,
  });

  const result = await svc.createMagicLink({ email: 'ttl@test.com', firstName: 'T', lastName: 'T' });
  const expected = new Date(fixedNow.getTime() + 24 * 60 * 60 * 1000).toISOString();
  assert.strictEqual(result.expiresAt, expected, 'expiresAt must be exactly 24h from now');
});

// ---- 3. UPDATE path for existing agents ------------------------------------
test('existing agent gets UPDATEd, not INSERTed', async () => {
  const pool = makePool({
    existingAgent: {
      id: EXISTING_AGENT_ID,
      email: EXISTING_EMAIL,
      first_name: 'Old',
      last_name: 'Name',
      status: 'inactive',
      email_verified: false,
    },
  });
  const svc = makeService(pool);
  const result = await svc.createMagicLink({ email: EXISTING_EMAIL, firstName: 'New', lastName: 'Name' });

  assert.ok(result.loginUrl.includes('/accept-invite?token='), 'should return a login URL');
  const insertCall = pool.calls.find(c => /INSERT INTO/.test(c.sql));
  assert.strictEqual(insertCall, undefined, 'should NOT INSERT when agent exists');
  const updateCall = pool.calls.find(c => /UPDATE real_estate_agents/.test(c.sql));
  assert.ok(updateCall, 'should UPDATE the existing agent');
  assert.strictEqual(updateCall.params[0], EXISTING_AGENT_ID, 'UPDATE targets the correct agent id');
  assert.strictEqual(updateCall.params[3], 'onboarding', 'UPDATE sets status to onboarding');
});

// ---- 4. Validation rejects missing fields ----------------------------------
test('missing firstName throws 400', async () => {
  const pool = makePool();
  const svc = makeService(pool);
  await assert.rejects(
    () => svc.createMagicLink({ email: 'ok@test.com', firstName: '', lastName: 'X' }),
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /firstName/);
      return true;
    }
  );
});

test('invalid email throws 400', async () => {
  const pool = makePool();
  const svc = makeService(pool);
  await assert.rejects(
    () => svc.createMagicLink({ email: 'not-an-email', firstName: 'A', lastName: 'B' }),
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.match(err.message, /email/);
      return true;
    }
  );
});

// ---- 5. Route is registered in server.js -----------------------------------
test('admin-magic-link route is registered in server.js', () => {
  const serverSrc = require('fs').readFileSync(require.resolve('../server.js'), 'utf8');
  assert.ok(
    serverSrc.includes("require('./routes/admin-magic-link')"),
    'server.js must require the admin-magic-link route'
  );
  assert.ok(
    serverSrc.includes('adminMagicLinkRouter'),
    'server.js must register adminMagicLinkRouter via app.use'
  );
});

// ---- 6. JWT_SECRET missing throws 503 --------------------------------------
test('missing JWT_SECRET throws 503', async () => {
  const pool = makePool();
  delete require.cache[require.resolve('../lib/services/AdminMagicLinkService')];
  const dbPath = require.resolve('../lib/db');
  const prev = require.cache[dbPath];
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getPool: () => pool } };
  const AdminMagicLinkService = require('../lib/services/AdminMagicLinkService');
  require.cache[dbPath] = prev;

  const svc = new AdminMagicLinkService({ pool, jwtSecret: null, appUrl: APP_URL });
  await assert.rejects(
    () => svc.createMagicLink({ email: 'j@test.com', firstName: 'J', lastName: 'T' }),
    (err) => {
      assert.strictEqual(err.statusCode, 503);
      assert.match(err.message, /JWT_SECRET/);
      return true;
    }
  );
});
