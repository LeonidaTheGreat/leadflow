'use strict';

/**
 * Unit tests for lib/db.js
 *
 * Spec:
 *   WHAT: lib/db.js — createClient(), getPool(), and the internal QueryBuilder class
 *         Tests cover URL construction, header building, HTTP response handling,
 *         the rpc() method, auth stubs, and the pg Pool singleton.
 *   VERIFY: node tests/unit/db.test.js → all pass, exit 0
 *   BOUNDARIES: Only tests lib/db.js public API. Does not touch routes, services,
 *               or any other file. Does not make real HTTP calls or DB connections.
 */

const assert = require('assert');

// Use static require path so code graph analysis detects test coverage for lib/db.js.
// Cache is busted inside freshDb() before each require to allow env var isolation.
const DB_MODULE_ID = require.resolve('../../lib/db');

// ─── Fetch mock helpers ──────────────────────────────────────────────────────

function mockFetch(overrides = {}) {
  const defaults = {
    ok: true,
    status: 200,
    statusText: 'OK',
    body: JSON.stringify([{ id: 1 }]),
    headers: new Map(),
  };
  const cfg = { ...defaults, ...overrides };

  global.fetch = async (url, opts) => {
    global.fetch._lastUrl = url;
    global.fetch._lastOpts = opts;
    return {
      ok: cfg.ok,
      status: cfg.status,
      headers: {
        get: (name) => cfg.headers.get ? cfg.headers.get(name) : (cfg.headers[name] || null),
      },
      text: async () => cfg.body,
      json: async () => JSON.parse(cfg.body),
    };
  };
}

function restoreFetch(original) {
  global.fetch = original;
}

// ─── Test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
    failed++;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshDb() {
  delete require.cache[DB_MODULE_ID];
  return require('../../lib/db');
}

function qbFor(table, url = 'http://api.test', key = 'sk') {
  return freshDb().createClient(url, key).from(table);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== lib/db.js unit tests ===\n');

  // ── createClient() factory ─────────────────────────────────────────────────
  console.log('--- createClient ---');

  await check('returns object with from, rpc, auth', () => {
    const client = freshDb().createClient('http://api.test', 'key');
    assert.strictEqual(typeof client.from, 'function');
    assert.strictEqual(typeof client.rpc, 'function');
    assert.ok(client.auth);
    assert.strictEqual(typeof client.auth.getUser, 'function');
    assert.strictEqual(typeof client.auth.getSession, 'function');
  });

  await check('from(table) returns thenable QueryBuilder', () => {
    const qb = qbFor('leads');
    assert.strictEqual(typeof qb.then, 'function');
    assert.strictEqual(typeof qb.select, 'function');
    assert.strictEqual(typeof qb.eq, 'function');
  });

  await check('uses NEXT_PUBLIC_API_URL env var when url omitted', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://envtest.test';
    const { createClient } = freshDb();
    const qb = createClient(undefined, 'k').from('t');
    const url = qb._buildUrl();
    delete process.env.NEXT_PUBLIC_API_URL;
    assert.ok(url.startsWith('http://envtest.test/'));
  });

  await check('uses API_SECRET_KEY env var when key omitted', () => {
    process.env.API_SECRET_KEY = 'env-secret';
    const { createClient } = freshDb();
    const headers = createClient('http://x', undefined)._buildHeaders
      ? createClient('http://x', undefined).from('t')._buildHeaders()
      : createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.API_SECRET_KEY;
    assert.strictEqual(headers.apikey, 'env-secret');
  });

  await check('uses LEADFLOW_API_KEY when API_SECRET_KEY absent', () => {
    delete process.env.API_SECRET_KEY;
    process.env.LEADFLOW_API_KEY = 'lf-key';
    const { createClient } = freshDb();
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.LEADFLOW_API_KEY;
    assert.strictEqual(headers.apikey, 'lf-key');
  });

  await check('auth.getUser() returns stub', async () => {
    const client = freshDb().createClient('http://api.test', 'key');
    const result = await client.auth.getUser();
    assert.deepStrictEqual(result, { data: { user: null }, error: null });
  });

  await check('auth.getSession() returns stub', async () => {
    const client = freshDb().createClient('http://api.test', 'key');
    const result = await client.auth.getSession();
    assert.deepStrictEqual(result, { data: { session: null }, error: null });
  });

  // ── createClient().rpc() ───────────────────────────────────────────────────
  console.log('\n--- createClient().rpc() ---');

  await check('rpc() posts to /rpc/<name> with params', async () => {
    const original = global.fetch;
    mockFetch({ body: JSON.stringify({ result: 42 }) });
    const client = freshDb().createClient('http://api.test', 'mykey');
    const { data, error } = await client.rpc('my_func', { x: 1 });
    const calledUrl = global.fetch._lastUrl;
    const calledOpts = global.fetch._lastOpts;
    restoreFetch(original);
    assert.strictEqual(data.result, 42);
    assert.strictEqual(error, null);
    assert.ok(calledUrl.endsWith('/rpc/my_func'), `URL should end with /rpc/my_func, got: ${calledUrl}`);
    assert.strictEqual(calledOpts.method, 'POST');
    assert.strictEqual(JSON.parse(calledOpts.body).x, 1);
  });

  await check('rpc() sends apikey + Authorization headers', async () => {
    const original = global.fetch;
    mockFetch({ body: '{}' });
    const client = freshDb().createClient('http://api.test', 'rpc-key');
    await client.rpc('func');
    const headers = global.fetch._lastOpts.headers;
    restoreFetch(original);
    assert.strictEqual(headers.apikey, 'rpc-key');
    assert.strictEqual(headers.Authorization, 'Bearer rpc-key');
  });

  await check('rpc() returns error on HTTP failure', async () => {
    const original = global.fetch;
    mockFetch({ ok: false, body: 'permission denied' });
    const client = freshDb().createClient('http://api.test', 'k');
    const { data, error } = await client.rpc('boom');
    restoreFetch(original);
    assert.strictEqual(data, null);
    assert.ok(error.message.includes('permission denied'), `Expected error message, got: ${error.message}`);
  });

  await check('rpc() returns error on network failure', async () => {
    const original = global.fetch;
    global.fetch = async () => { throw new Error('ECONNREFUSED'); };
    const client = freshDb().createClient('http://api.test', 'k');
    const { data, error } = await client.rpc('fn');
    restoreFetch(original);
    assert.strictEqual(data, null);
    assert.ok(error.message.includes('ECONNREFUSED'));
  });

  // ── QueryBuilder URL building ──────────────────────────────────────────────
  console.log('\n--- QueryBuilder URL building ---');

  await check('_buildUrl() includes base URL and table name', () => {
    const url = qbFor('leads', 'http://api.test', 'k')._buildUrl();
    assert.ok(url.startsWith('http://api.test/leads'), `Got: ${url}`);
  });

  await check('select() sets ?select= param', () => {
    const url = qbFor('t').select('id,name')._buildUrl();
    assert.ok(url.includes('select=id%2Cname') || url.includes('select=id,name'), `Got: ${url}`);
  });

  await check('select(*) sets ?select=* param', () => {
    const url = qbFor('t').select()._buildUrl();
    assert.ok(url.includes('select=*'), `Got: ${url}`);
  });

  await check('eq() → ?col=eq.val', () => {
    const url = qbFor('t').eq('status', 'active')._buildUrl();
    assert.ok(url.includes('status=eq.active'), `Got: ${url}`);
  });

  await check('neq() → ?col=neq.val', () => {
    const url = qbFor('t').neq('status', 'deleted')._buildUrl();
    assert.ok(url.includes('status=neq.deleted'), `Got: ${url}`);
  });

  await check('gt() → ?col=gt.val', () => {
    const url = qbFor('t').gt('age', 18)._buildUrl();
    assert.ok(url.includes('age=gt.18'), `Got: ${url}`);
  });

  await check('gte() → ?col=gte.val', () => {
    const url = qbFor('t').gte('score', 100)._buildUrl();
    assert.ok(url.includes('score=gte.100'), `Got: ${url}`);
  });

  await check('lt() → ?col=lt.val', () => {
    const url = qbFor('t').lt('price', 50)._buildUrl();
    assert.ok(url.includes('price=lt.50'), `Got: ${url}`);
  });

  await check('lte() → ?col=lte.val', () => {
    const url = qbFor('t').lte('count', 10)._buildUrl();
    assert.ok(url.includes('count=lte.10'), `Got: ${url}`);
  });

  await check('in() → ?col=in.("a","b")', () => {
    const raw = qbFor('t').in('role', ['admin', 'user'])._buildUrl();
    const url = decodeURIComponent(raw);
    assert.ok(url.includes('role=in.('), `Got: ${url}`);
    assert.ok(url.includes('"admin"'), `Got: ${url}`);
    assert.ok(url.includes('"user"'), `Got: ${url}`);
  });

  await check('is(null) → ?col=is.null', () => {
    const url = qbFor('t').is('deleted_at', null)._buildUrl();
    assert.ok(url.includes('deleted_at=is.null'), `Got: ${url}`);
  });

  await check('is(value) → ?col=is.true', () => {
    const url = qbFor('t').is('active', true)._buildUrl();
    assert.ok(url.includes('active=is.true'), `Got: ${url}`);
  });

  await check('not(key, val) [2 args] → ?col=not.val', () => {
    const url = qbFor('t').not('status', 'deleted')._buildUrl();
    assert.ok(url.includes('status=not.deleted'), `Got: ${url}`);
  });

  await check('not(key, "is", null) → ?col=not.is.null', () => {
    const url = qbFor('t').not('deleted_at', 'is', null)._buildUrl();
    assert.ok(url.includes('deleted_at=not.is.null'), `Got: ${url}`);
  });

  await check('not(key, "eq", val) → ?col=not.eq.val', () => {
    const url = qbFor('t').not('role', 'eq', 'guest')._buildUrl();
    assert.ok(url.includes('role=not.eq.guest'), `Got: ${url}`);
  });

  await check('or() → ?or=(filterStr)', () => {
    const url = qbFor('t').or('status.eq.active,role.eq.admin')._buildUrl();
    assert.ok(url.includes('or='), `Got: ${url}`);
    assert.ok(url.includes('status.eq.active') || url.includes('status'), `Got: ${url}`);
  });

  await check('order(col, ascending:true) → ?order=col.asc', () => {
    const url = qbFor('t').order('created_at', { ascending: true })._buildUrl();
    assert.ok(url.includes('order=created_at.asc'), `Got: ${url}`);
  });

  await check('order(col, ascending:false) → ?order=col.desc', () => {
    const url = qbFor('t').order('created_at', { ascending: false })._buildUrl();
    assert.ok(url.includes('order=created_at.desc'), `Got: ${url}`);
  });

  await check('order() default is ascending', () => {
    const url = qbFor('t').order('name')._buildUrl();
    assert.ok(url.includes('order=name.asc'), `Got: ${url}`);
  });

  await check('limit() → ?limit=N', () => {
    const url = qbFor('t').limit(25)._buildUrl();
    assert.ok(url.includes('limit=25'), `Got: ${url}`);
  });

  await check('range(0, 9) → ?offset=0&limit=10', () => {
    const url = qbFor('t').range(0, 9)._buildUrl();
    assert.ok(url.includes('offset=0'), `Got: ${url}`);
    assert.ok(url.includes('limit=10'), `Got: ${url}`);
  });

  await check('multiple filters chain correctly', () => {
    const url = qbFor('t').eq('status', 'active').neq('role', 'guest').limit(5)._buildUrl();
    assert.ok(url.includes('status=eq.active'), `Got: ${url}`);
    assert.ok(url.includes('role=neq.guest'), `Got: ${url}`);
    assert.ok(url.includes('limit=5'), `Got: ${url}`);
  });

  // ── QueryBuilder header building ───────────────────────────────────────────
  console.log('\n--- QueryBuilder header building ---');

  await check('GET includes Content-Type and Accept', () => {
    const headers = qbFor('t')._buildHeaders();
    assert.strictEqual(headers['Content-Type'], 'application/json');
    assert.strictEqual(headers['Accept'], 'application/json');
  });

  await check('GET includes apikey and Authorization when key set', () => {
    const headers = qbFor('t', 'http://x', 'my-api-key')._buildHeaders();
    assert.strictEqual(headers.apikey, 'my-api-key');
    assert.strictEqual(headers.Authorization, 'Bearer my-api-key');
  });

  await check('GET does not include apikey when no key', () => {
    const headers = qbFor('t', 'http://x', '')._buildHeaders();
    assert.ok(!headers.apikey);
    assert.ok(!headers.Authorization);
  });

  await check('POST (insert) without select — no Prefer header', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' });
    const headers = qb._buildHeaders();
    assert.ok(!headers['Prefer'], `Expected no Prefer, got: ${headers['Prefer']}`);
  });

  await check('POST (insert) with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' }).select('*');
    const headers = qb._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
    assert.ok(!headers['Prefer'].includes('merge-duplicates'), `Got: ${headers['Prefer']}`);
  });

  await check('PATCH (update) with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.update({ name: 'new' }).select('id');
    const headers = qb._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
  });

  await check('upsert with select → Prefer includes merge-duplicates and return=representation', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1, name: 'x' }).select('*');
    const headers = qb._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('resolution=merge-duplicates'), `Got: ${headers['Prefer']}`);
    assert.ok(headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
  });

  await check('upsert without select → Prefer: resolution=merge-duplicates', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1 });
    const headers = qb._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('resolution=merge-duplicates'), `Got: ${headers['Prefer']}`);
    assert.ok(!headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
  });

  await check('count mode appends count=exact to Prefer', () => {
    const qb = qbFor('t');
    qb.select('*', { count: 'exact' });
    const headers = qb._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('count=exact'), `Got: ${headers['Prefer']}`);
  });

  // ── QueryBuilder builder method chains ────────────────────────────────────
  console.log('\n--- QueryBuilder builder method chains ---');

  await check('select() returns this', () => {
    const qb = qbFor('t');
    assert.strictEqual(qb.select('*'), qb);
  });

  await check('eq() returns this', () => {
    const qb = qbFor('t');
    assert.strictEqual(qb.eq('id', 1), qb);
  });

  await check('order() returns this', () => {
    const qb = qbFor('t');
    assert.strictEqual(qb.order('id'), qb);
  });

  await check('limit() returns this', () => {
    const qb = qbFor('t');
    assert.strictEqual(qb.limit(10), qb);
  });

  await check('single() returns this', () => {
    const qb = qbFor('t');
    assert.strictEqual(qb.single(), qb);
  });

  await check('maybeSingle() returns this', () => {
    const qb = qbFor('t');
    assert.strictEqual(qb.maybeSingle(), qb);
  });

  await check('insert() sets method to POST', () => {
    const qb = qbFor('t').insert({ x: 1 });
    assert.strictEqual(qb._httpMethod, 'POST');
    assert.deepStrictEqual(qb._bodyData, { x: 1 });
  });

  await check('update() sets method to PATCH', () => {
    const qb = qbFor('t').update({ x: 2 });
    assert.strictEqual(qb._httpMethod, 'PATCH');
    assert.deepStrictEqual(qb._bodyData, { x: 2 });
  });

  await check('delete() sets method to DELETE', () => {
    const qb = qbFor('t').delete();
    assert.strictEqual(qb._httpMethod, 'DELETE');
  });

  await check('upsert() sets method to POST and wraps object in array', () => {
    const qb = qbFor('t').upsert({ id: 1 });
    assert.strictEqual(qb._httpMethod, 'POST');
    assert.ok(Array.isArray(qb._bodyData), 'body should be array');
    assert.strictEqual(qb._bodyData[0].id, 1);
    assert.strictEqual(qb._isUpsert, true);
  });

  await check('upsert() accepts array directly', () => {
    const qb = qbFor('t').upsert([{ id: 1 }, { id: 2 }]);
    assert.ok(Array.isArray(qb._bodyData));
    assert.strictEqual(qb._bodyData.length, 2);
  });

  await check('upsert() sets onConflict from opts', () => {
    const qb = qbFor('t').upsert({ id: 1 }, { onConflict: 'id' });
    assert.strictEqual(qb._upsertConflictColumn, 'id');
  });

  // ── QueryBuilder._execute() — HTTP behavior ────────────────────────────────
  console.log('\n--- QueryBuilder._execute() ---');

  await check('successful GET returns { data, error: null, count: null }', async () => {
    const original = global.fetch;
    mockFetch({ body: JSON.stringify([{ id: 1, name: 'Alice' }]) });
    const result = await qbFor('leads').select('*');
    restoreFetch(original);
    assert.deepStrictEqual(result.error, null);
    assert.ok(Array.isArray(result.data));
    assert.strictEqual(result.data[0].id, 1);
    assert.strictEqual(result.count, null);
  });

  await check('HTTP error response returns { data: null, error }', async () => {
    const original = global.fetch;
    mockFetch({ ok: false, status: 403, body: JSON.stringify({ message: 'Forbidden', code: '42501' }) });
    const result = await qbFor('leads').select('*');
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.ok(result.error);
    assert.ok(result.error.message.includes('Forbidden'), `Got: ${result.error.message}`);
    assert.strictEqual(result.error.code, '42501');
    assert.strictEqual(result.error.status, 403);
  });

  await check('HTTP error with non-JSON body returns error with raw text', async () => {
    const original = global.fetch;
    mockFetch({ ok: false, status: 500, body: 'Internal Server Error' });
    const result = await qbFor('leads').select('*');
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.ok(result.error.message.includes('Internal Server Error'), `Got: ${result.error.message}`);
  });

  await check('network error returns { data: null, error }', async () => {
    const original = global.fetch;
    global.fetch = async () => { throw new Error('Network unreachable'); };
    const result = await qbFor('leads').select('*');
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.ok(result.error.message.includes('Network unreachable'), `Got: ${result.error.message}`);
    assert.strictEqual(result.count, null);
  });

  await check('single() with array response returns first element', async () => {
    const original = global.fetch;
    mockFetch({ body: JSON.stringify([{ id: 1 }, { id: 2 }]) });
    const result = await qbFor('leads').select('*').single();
    restoreFetch(original);
    assert.strictEqual(result.error, null);
    assert.strictEqual(result.data.id, 1);
  });

  await check('single() with empty array returns PGRST116 error', async () => {
    const original = global.fetch;
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').single();
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.ok(result.error);
    assert.strictEqual(result.error.code, 'PGRST116');
  });

  await check('maybeSingle() with array returns first element', async () => {
    const original = global.fetch;
    mockFetch({ body: JSON.stringify([{ id: 5 }]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    restoreFetch(original);
    assert.strictEqual(result.data.id, 5);
    assert.strictEqual(result.error, null);
  });

  await check('maybeSingle() with empty array returns null data, no error', async () => {
    const original = global.fetch;
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.strictEqual(result.error, null);
  });

  await check('DELETE without select → data is null', async () => {
    const original = global.fetch;
    mockFetch({ body: '' });
    const result = await qbFor('leads').delete().eq('id', 1);
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.strictEqual(result.error, null);
  });

  await check('count mode reads count from content-range header', async () => {
    const original = global.fetch;
    const headerMap = { 'content-range': '0-9/42' };
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: (name) => headerMap[name] || null },
      text: async () => JSON.stringify([]),
    });
    const result = await qbFor('leads').select('*', { count: 'exact' });
    restoreFetch(original);
    assert.strictEqual(result.count, 42);
  });

  await check('count stays null when content-range has wildcard total', async () => {
    const original = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: (name) => (name === 'content-range' ? '0-9/*' : null) },
      text: async () => JSON.stringify([]),
    });
    const result = await qbFor('leads').select('*', { count: 'exact' });
    restoreFetch(original);
    assert.strictEqual(result.count, null);
  });

  await check('then() caches the promise (executes only once)', async () => {
    const original = global.fetch;
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      return {
        ok: true, status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify([{ id: 1 }]),
      };
    };
    const qb = qbFor('leads').select('*');
    // Await twice — should only call fetch once
    await qb;
    await qb;
    restoreFetch(original);
    assert.strictEqual(callCount, 1, `Expected 1 fetch call, got ${callCount}`);
  });

  // ── getPool() ──────────────────────────────────────────────────────────────
  console.log('\n--- getPool() ---');

  await check('getPool() throws when LOCAL_PG_URL is not set', () => {
    // Reset db module so _pool is null
    delete require.cache[DB_MODULE_ID];
    const savedUrl = process.env.LOCAL_PG_URL;
    delete process.env.LOCAL_PG_URL;

    let threw = false;
    try {
      require('../../lib/db').getPool();
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('LOCAL_PG_URL'), `Expected LOCAL_PG_URL in error, got: ${err.message}`);
    } finally {
      if (savedUrl !== undefined) process.env.LOCAL_PG_URL = savedUrl;
      // Restore module cache (re-require with env restored)
      delete require.cache[DB_MODULE_ID];
    }
    assert.ok(threw, 'Expected getPool() to throw when LOCAL_PG_URL is not set');
  });

  await check('getPool() creates a Pool with the connection string', () => {
    // Mock pg.Pool before requiring db fresh
    delete require.cache[DB_MODULE_ID];
    const pgPath = require.resolve('pg');
    const originalPg = require.cache[pgPath];

    const createdConfigs = [];
    function MockPool(config) { createdConfigs.push(config); }
    require.cache[pgPath] = { ...originalPg, exports: { Pool: MockPool } };

    process.env.LOCAL_PG_URL = 'postgresql://user:pass@localhost/testdb';
    let pool;
    try {
      pool = require('../../lib/db').getPool();
    } finally {
      delete process.env.LOCAL_PG_URL;
      require.cache[pgPath] = originalPg;
      delete require.cache[DB_MODULE_ID];
    }

    assert.ok(pool instanceof MockPool, 'Should return a Pool instance');
    assert.strictEqual(createdConfigs[0].connectionString, 'postgresql://user:pass@localhost/testdb');
    assert.strictEqual(createdConfigs[0].max, 10);
  });

  await check('getPool() returns same pool on repeated calls (singleton)', () => {
    delete require.cache[DB_MODULE_ID];
    const pgPath = require.resolve('pg');
    const originalPg = require.cache[pgPath];

    let callCount = 0;
    function MockPool(config) { callCount++; }
    require.cache[pgPath] = { ...originalPg, exports: { Pool: MockPool } };

    process.env.LOCAL_PG_URL = 'postgresql://localhost/test';
    let pool1, pool2;
    try {
      const db = require('../../lib/db');
      pool1 = db.getPool();
      pool2 = db.getPool();
    } finally {
      delete process.env.LOCAL_PG_URL;
      require.cache[pgPath] = originalPg;
      delete require.cache[DB_MODULE_ID];
    }

    assert.strictEqual(pool1, pool2, 'Should return same Pool instance on repeated calls');
    assert.strictEqual(callCount, 1, `Pool constructor should be called once, got ${callCount}`);
  });

  // ── Additional edge cases ─────────────────────────────────────────────────
  console.log('\n--- Edge cases ---');

  await check('no select() call → no select param in URL', () => {
    const url = qbFor('t').eq('id', 1)._buildUrl();
    assert.ok(!url.includes('select='), `Expected no select param, got: ${url}`);
  });

  await check('limit() then range() → range takes precedence', () => {
    const url = qbFor('t').limit(5).range(10, 19)._buildUrl();
    assert.ok(url.includes('offset=10'), `Got: ${url}`);
    assert.ok(url.includes('limit=10'), `Got: ${url}`);
  });

  await check('multiple order() calls → all columns in URL', () => {
    const raw = qbFor('t').order('name').order('created_at', { ascending: false })._buildUrl();
    const url = decodeURIComponent(raw);
    assert.ok(url.includes('name.asc'), `Got: ${url}`);
    assert.ok(url.includes('created_at.desc'), `Got: ${url}`);
  });

  await check('DELETE with select set → data returned from response body', async () => {
    const original = global.fetch;
    mockFetch({ body: JSON.stringify([{ id: 1 }]) });
    const result = await qbFor('leads').delete().select('id').eq('id', 1);
    restoreFetch(original);
    assert.strictEqual(result.error, null);
    assert.ok(Array.isArray(result.data), `Expected data array, got: ${JSON.stringify(result.data)}`);
  });

  await check('GET with empty response body → data is null', async () => {
    const original = global.fetch;
    mockFetch({ body: '' });
    const result = await qbFor('leads').select('*').eq('id', 999);
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.strictEqual(result.error, null);
  });

  await check('rpc() with no params sends empty object body', async () => {
    const original = global.fetch;
    mockFetch({ body: '{}' });
    const client = freshDb().createClient('http://api.test', 'k');
    await client.rpc('fn_no_params');
    const sentBody = JSON.parse(global.fetch._lastOpts.body);
    restoreFetch(original);
    assert.deepStrictEqual(sentBody, {});
  });

  await check('non-Error thrown from fetch → stringified in error message', async () => {
    const original = global.fetch;
    global.fetch = async () => { throw 'connection reset'; };
    const result = await qbFor('leads').select('*');
    restoreFetch(original);
    assert.strictEqual(result.data, null);
    assert.ok(result.error.message.includes('connection reset'), `Got: ${result.error.message}`);
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n=== Results: ${passed}/${total} passed ===\n`);
  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  run().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}

module.exports = { run };
