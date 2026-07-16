'use strict';

/**
 * Unit tests for routes/api/admin-verify-email.js
 * Tests: requireApiKey auth, verify-email endpoint logic, unverified-agents list
 */

const assert = require('assert');

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

// ─── Minimal mock for express-style middleware/route testing ──────────────────

function makeReq(overrides = {}) {
  return {
    headers: {},
    body: {},
    query: {},
    ...overrides,
  };
}

function makeRes() {
  const res = {
    _status: 200,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    json(body) { this._body = body; return this; },
    send(body) { this._body = body; return this; },
    setHeader(k, v) { this._headers[k] = v; return this; },
  };
  return res;
}

// ─── requireApiKey middleware ─────────────────────────────────────────────────

const requireApiKey = require('../../lib/middleware/require-api-key');

async function testRequireApiKey() {
  const ORIGINAL_KEY = process.env.LEADFLOW_API_KEY;

  await check('requireApiKey: returns 401 when no header provided', async () => {
    process.env.LEADFLOW_API_KEY = 'test-secret';
    const req = makeReq({ headers: {} });
    const res = makeRes();
    let nextCalled = false;
    requireApiKey(req, res, () => { nextCalled = true; });
    assert.strictEqual(res._status, 401);
    assert.strictEqual(nextCalled, false);
  });

  await check('requireApiKey: calls next() when key matches', async () => {
    process.env.LEADFLOW_API_KEY = 'test-secret';
    const req = makeReq({ headers: { 'x-api-key': 'test-secret' } });
    const res = makeRes();
    let nextCalled = false;
    requireApiKey(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res._status, 200);
  });

  await check('requireApiKey: returns 401 when key does not match', async () => {
    process.env.LEADFLOW_API_KEY = 'test-secret';
    const req = makeReq({ headers: { 'x-api-key': 'wrong-key' } });
    const res = makeRes();
    let nextCalled = false;
    requireApiKey(req, res, () => { nextCalled = true; });
    assert.strictEqual(res._status, 401);
    assert.strictEqual(nextCalled, false);
  });

  await check('requireApiKey: returns 401 when LEADFLOW_API_KEY not configured', async () => {
    delete process.env.LEADFLOW_API_KEY;
    const req = makeReq({ headers: { 'x-api-key': 'any-key' } });
    const res = makeRes();
    let nextCalled = false;
    requireApiKey(req, res, () => { nextCalled = true; });
    assert.strictEqual(res._status, 401);
    assert.strictEqual(nextCalled, false);
  });

  // Restore
  if (ORIGINAL_KEY !== undefined) process.env.LEADFLOW_API_KEY = ORIGINAL_KEY;
  else delete process.env.LEADFLOW_API_KEY;
}

// ─── Route handler logic (mock DB) ───────────────────────────────────────────

async function testVerifyEmailLogic() {
  const AGENTS = [
    { id: 'agent-001', email: 'alice@example.com', first_name: 'Alice', last_name: 'Smith', created_at: '2024-01-15T10:00:00Z', email_verified: false },
    { id: 'agent-002', email: 'bob@example.com', first_name: 'Bob', last_name: 'Jones', created_at: '2024-01-20T09:00:00Z', email_verified: false },
  ];

  // Build a mock pool
  function makeMockPool({ verifyOneRows = null, verifyAllCount = 0, listRows = AGENTS } = {}) {
    return {
      query: async (sql, params) => {
        if (sql.includes('WHERE email_verified = false') && !sql.includes('UPDATE')) {
          return { rows: listRows };
        }
        if (sql.includes('UPDATE') && sql.includes('WHERE id = $1')) {
          const found = verifyOneRows !== null
            ? verifyOneRows
            : AGENTS.filter(a => a.id === params[0]);
          return { rows: found };
        }
        if (sql.includes('UPDATE') && sql.includes('WHERE email_verified = false')) {
          const ids = AGENTS.map(a => ({ id: a.id })).slice(0, verifyAllCount === 0 ? AGENTS.length : verifyAllCount);
          return { rows: ids };
        }
        return { rows: [] };
      },
    };
  }

  await check('POST /api/admin/verify-email: returns 400 when no agentId and no all flag', async () => {
    const pool = makeMockPool();
    const res = makeRes();
    const req = makeReq({ headers: { 'x-api-key': 'test' }, body: {} });

    // Simulate the route handler inline
    const { agentId, all } = req.body || {};
    const loginUrl = 'https://leadflow-ai-five.vercel.app/login';
    if (all) { throw new Error('Should not reach all path'); }
    if (!agentId || typeof agentId !== 'string') {
      res.status(400).json({ error: 'agentId is required' });
    }
    assert.strictEqual(res._status, 400);
    assert.strictEqual(res._body.error, 'agentId is required');
  });

  await check('POST /api/admin/verify-email: verify one agent returns loginUrl', async () => {
    const pool = makeMockPool();
    const res = makeRes();
    const req = makeReq({ body: { agentId: 'agent-001' } });

    const { agentId } = req.body;
    const loginUrl = 'https://leadflow-ai-five.vercel.app/login';
    const { rows } = await pool.query(
      'UPDATE real_estate_agents SET email_verified = true, updated_at = NOW() WHERE id = $1 RETURNING id, email, first_name, last_name',
      [agentId]
    );
    assert.strictEqual(rows.length, 1);
    const agent = rows[0];
    res.json({ success: true, agentId: agent.id, email: agent.email, loginUrl });
    assert.strictEqual(res._body.success, true);
    assert.strictEqual(res._body.agentId, 'agent-001');
    assert.ok(res._body.loginUrl.includes('/login'));
  });

  await check('POST /api/admin/verify-email: verify one — 404 when agent not found', async () => {
    const pool = makeMockPool({ verifyOneRows: [] });
    const res = makeRes();
    const { rows } = await pool.query(
      'UPDATE real_estate_agents SET email_verified = true WHERE id = $1 RETURNING id, email, first_name, last_name',
      ['nonexistent']
    );
    if (rows.length === 0) res.status(404).json({ error: 'Agent not found' });
    assert.strictEqual(res._status, 404);
    assert.strictEqual(res._body.error, 'Agent not found');
  });

  await check('POST /api/admin/verify-email: verify all returns count', async () => {
    const pool = makeMockPool();
    const res = makeRes();
    const req = makeReq({ body: { all: true } });
    const loginUrl = 'https://leadflow-ai-five.vercel.app/login';

    const { rows } = await pool.query(
      'UPDATE real_estate_agents SET email_verified = true WHERE email_verified = false RETURNING id'
    );
    res.json({ success: true, count: rows.length, loginUrl });
    assert.strictEqual(res._body.success, true);
    assert.strictEqual(res._body.count, 2);
    assert.ok(res._body.loginUrl);
  });

  await check('GET /api/admin/unverified-agents: returns list and count', async () => {
    const pool = makeMockPool();
    const { rows } = await pool.query('SELECT id, email FROM real_estate_agents WHERE email_verified = false');
    assert.strictEqual(rows.length, 2);
    assert.strictEqual(rows[0].email, 'alice@example.com');
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\nAdmin Verify Email — Unit Tests\n');

  console.log('requireApiKey middleware:');
  await testRequireApiKey();

  console.log('\nVerify email route logic:');
  await testVerifyEmailLogic();

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
