'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const Module = require('module');
const path = require('path');
const { test, beforeEach } = require('node:test');

const VALID_API_KEY = 'test-api-secret-key';
const JWT_SECRET = 'test-jwt-secret';
const APP_URL = 'https://leadflow-ai-five.vercel.app';
const AGENT_ID = '11111111-1111-4111-8111-111111111111';
const CREATED_AT = new Date('2026-07-18T12:00:00.000Z');
const EXPIRED_NOW = new Date('2026-07-18T12:00:00.000Z');

const dbPath = require.resolve('../../lib/db');
const servicePath = require.resolve('../../lib/services/AdminMagicLinkService');
const routePath = require.resolve('../../routes/admin-magic-link');

let mockPool;

process.env.API_SECRET_KEY = VALID_API_KEY;
process.env.JWT_SECRET = JWT_SECRET;
process.env.NEXT_PUBLIC_APP_URL = APP_URL;

function makePool({ existingAgent = null } = {}) {
  const pool = {
    calls: [],
    queryCount: 0,
    async query(sql, params) {
      this.queryCount += 1;
      this.calls.push({ sql, params });

      if (/SELECT id, email, first_name, last_name, status, email_verified\s+FROM real_estate_agents/i.test(sql)) {
        return { rows: existingAgent ? [existingAgent] : [] };
      }

      if (/INSERT INTO real_estate_agents/i.test(sql)) {
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

      if (/UPDATE real_estate_agents/i.test(sql)) {
        return {
          rows: [{
            id: params[0],
            email: existingAgent.email,
            first_name: params[1],
            last_name: params[2],
            status: params[3],
            email_verified: true,
          }],
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  return pool;
}

function installDbStub() {
  delete require.cache[servicePath];
  delete require.cache[routePath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { getPool: () => mockPool },
  };
}

function withExpressStub(fn) {
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'express') {
      return {
        Router() {
          return {
            routes: [],
            post(pathName, ...handlers) {
              this.routes.push({ method: 'POST', path: pathName, handlers });
            },
          };
        },
      };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return fn();
  } finally {
    Module._load = originalLoad;
  }
}

function decodeAndVerifyJwt(token, { now = CREATED_AT } = {}) {
  const parts = token.split('.');
  assert.strictEqual(parts.length, 3, 'token should be a three-part JWT');

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${parts[0]}.${parts[1]}`)
    .digest('base64url');
  assert.strictEqual(parts[2], expectedSignature, 'JWT signature should verify');

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    throw err;
  }
  return payload;
}

function makeRoute() {
  installDbStub();
  return withExpressStub(() => require('../../routes/admin-magic-link'));
}

async function postJson(router, pathName, { body, apiKey = VALID_API_KEY }) {
  const route = router.routes.find((candidate) => candidate.method === 'POST' && candidate.path === pathName);
  assert(route, `route not found: POST ${pathName}`);

  const req = {
    body,
    headers: {
      ...(apiKey ? { 'x-api-key': apiKey } : {}),
    },
  };
  const res = {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  await route.handlers[0](req, res);
  return { status: res.statusCode, body: res.payload };
}

beforeEach(() => {
  mockPool = makePool();
});

test('POST /api/admin/magic-link returns loginUrl and creates verified onboarding trial agent', async () => {
  const router = makeRoute();
  const response = await postJson(router, '/api/admin/magic-link', {
    body: {
      email: 'TEST@RealDomain.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  });

  assert.strictEqual(response.status, 200);
  assert.match(response.body.loginUrl, new RegExp(`^${APP_URL}/accept-invite\\?token=`));

  const token = new URL(response.body.loginUrl).searchParams.get('token');
  const payload = decodeAndVerifyJwt(token);
  assert.deepStrictEqual(
    {
      agentId: payload.agentId,
      email: payload.email,
      purpose: payload.purpose,
      iss: payload.iss,
    },
    {
      agentId: AGENT_ID,
      email: 'test@realdomain.com',
      purpose: 'trial-activation',
      iss: 'leadflow-admin-magic-link',
    }
  );
  assert.strictEqual(payload.exp - payload.iat, 24 * 60 * 60);

  const insertCall = mockPool.calls.find((call) => /INSERT INTO real_estate_agents/i.test(call.sql));
  assert(insertCall, 'expected an agent insert');
  assert(insertCall.sql.includes('email_verified'), 'insert should set email_verified');
  assert(insertCall.sql.includes('status'), 'insert should set status');
  assert.strictEqual(insertCall.params[0], 'test@realdomain.com');
  assert.strictEqual(insertCall.params[4], 'onboarding');
});

test('POST /api/admin/magic-link rejects invalid API key before touching DB', async () => {
  const router = makeRoute();
  const response = await postJson(router, '/api/admin/magic-link', {
    apiKey: 'wrong-key',
    body: {
      email: 'test@realdomain.com',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  });

  assert.strictEqual(response.status, 401);
  assert.deepStrictEqual(response.body, { error: 'Unauthorized' });
  assert.strictEqual(mockPool.queryCount, 0);
});

test('expired trial-activation token is rejected as 401 on use', async () => {
  installDbStub();
  const AdminMagicLinkService = require('../../lib/services/AdminMagicLinkService');
  const service = new AdminMagicLinkService({
    pool: mockPool,
    jwtSecret: JWT_SECRET,
    appUrl: APP_URL,
    now: () => EXPIRED_NOW,
  });
  const { loginUrl } = await service.createMagicLink({
    email: 'expired@realdomain.com',
    firstName: 'Expired',
    lastName: 'Agent',
  });

  const token = new URL(loginUrl).searchParams.get('token');
  assert.throws(
    () => decodeAndVerifyJwt(token, {
      now: new Date(EXPIRED_NOW.getTime() + 25 * 60 * 60 * 1000),
    }),
    /jwt expired/
  );

  const routeSource = fs.readFileSync(
    path.join(__dirname, '../../product/lead-response/dashboard/app/api/auth/accept-invite/route.ts'),
    'utf8'
  );
  assert(routeSource.includes("err?.name === 'TokenExpiredError'"), 'dashboard route should identify expired JWTs');
  assert(routeSource.includes('{ status: 401 }'), 'dashboard route should return 401 for rejected JWTs');
});
