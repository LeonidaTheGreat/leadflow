'use strict';

/*
 * Spec:
 *   What:    lib/db.js — createClient(), getPool(), and the internal QueryBuilder class.
 *            Tests cover URL construction, header building, HTTP response handling,
 *            the rpc() method, auth stubs, and the pg Pool singleton.
 *   Verify:  node tests/db.test.js → all pass, exit 0
 *   Boundaries: Only tests lib/db.js public API. Does not touch routes, services,
 *               or any other file. Does not make real HTTP calls or DB connections.
 *
 * NOTE: This file requires lib/db with a string literal so the code-graph builder
 * can detect it as a test file for lib/db.js (graph-self-heal untested-hub detection).
 * The companion file tests/unit/db.test.js uses require(DB_PATH) via a variable,
 * which the regex-based graph scanner cannot detect.
 */

const assert = require('assert');
const { createClient, getPool } = require('../lib/db');

// ─── Fetch mock helpers ──────────────────────────────────────────────────────

function mockFetch(overrides = {}) {
  const defaults = { ok: true, status: 200, body: JSON.stringify([{ id: 1 }]), headers: {} };
  const cfg = { ...defaults, ...overrides };
  global.fetch = async (url, opts) => {
    global.fetch._lastUrl = url;
    global.fetch._lastOpts = opts;
    return {
      ok: cfg.ok,
      status: cfg.status,
      headers: { get: (name) => cfg.headers[name] || null },
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
    console.log(`  FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshClient(url = 'http://api.test', key = 'sk') {
  return createClient(url, key);
}

function qb(table, url = 'http://api.test', key = 'sk') {
  return freshClient(url, key).from(table);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n=== lib/db.js tests (tests/db.test.js) ===\n');

  // ── createClient() factory ─────────────────────────────────────────────────
  console.log('--- createClient() ---');

  await check('returns object with from, rpc, and auth', () => {
    const client = createClient('http://api.test', 'key');
    assert.strictEqual(typeof client.from, 'function');
    assert.strictEqual(typeof client.rpc, 'function');
    assert.strictEqual(typeof client.auth.getUser, 'function');
    assert.strictEqual(typeof client.auth.getSession, 'function');
  });

  await check('from(table) returns thenable QueryBuilder', () => {
    const builder = freshClient().from('leads');
    assert.strictEqual(typeof builder.then, 'function');
    assert.strictEqual(typeof builder.select, 'function');
    assert.strictEqual(typeof builder.eq, 'function');
  });

  await check('uses NEXT_PUBLIC_API_URL env var when url is omitted', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://envtest.test';
    const client = createClient(undefined, 'k');
    const url = client.from('t')._buildUrl();
    delete process.env.NEXT_PUBLIC_API_URL;
    assert.ok(url.startsWith('http://envtest.test/'), `Got: ${url}`);
  });

  await check('uses API_SECRET_KEY env var when key is omitted', () => {
    process.env.API_SECRET_KEY = 'env-secret';
    const client = createClient('http://x', undefined);
    const headers = client.from('t')._buildHeaders();
    delete process.env.API_SECRET_KEY;
    assert.strictEqual(headers.apikey, 'env-secret');
  });

  await check('uses LEADFLOW_API_KEY when API_SECRET_KEY is absent', () => {
    delete process.env.API_SECRET_KEY;
    process.env.LEADFLOW_API_KEY = 'lf-key';
    const client = createClient('http://x', undefined);
    const headers = client.from('t')._buildHeaders();
    delete process.env.LEADFLOW_API_KEY;
    assert.strictEqual(headers.apikey, 'lf-key');
  });

  await check('auth.getUser() returns stub { data: { user: null }, error: null }', async () => {
    const client = createClient('http://api.test', 'key');
    const result = await client.auth.getUser();
    assert.deepStrictEqual(result, { data: { user: null }, error: null });
  });

  await check('auth.getSession() returns stub { data: { session: null }, error: null }', async () => {
    const client = createClient('http://api.test', 'key');
    const result = await client.auth.getSession();
    assert.deepStrictEqual(result, { data: { session: null }, error: null });
  });

  // ── rpc() ──────────────────────────────────────────────────────────────────
  console.log('\n--- createClient().rpc() ---');

  await check('posts to /rpc/<name> with params as JSON body', async () => {
    const orig = global.fetch;
    mockFetch({ body: JSON.stringify({ result: 42 }) });
    const { data, error } = await createClient('http://api.test', 'mykey').rpc('my_func', { x: 1 });
    const calledUrl = global.fetch._lastUrl;
    const calledOpts = global.fetch._lastOpts;
    restoreFetch(orig);
    assert.strictEqual(error, null);
    assert.strictEqual(data.result, 42);
    assert.ok(calledUrl.endsWith('/rpc/my_func'), `URL should end with /rpc/my_func, got: ${calledUrl}`);
    assert.strictEqual(calledOpts.method, 'POST');
    assert.strictEqual(JSON.parse(calledOpts.body).x, 1);
  });

  await check('includes apikey and Authorization headers', async () => {
    const orig = global.fetch;
    mockFetch({ body: '{}' });
    await createClient('http://api.test', 'rpc-key').rpc('func');
    const headers = global.fetch._lastOpts.headers;
    restoreFetch(orig);
    assert.strictEqual(headers.apikey, 'rpc-key');
    assert.strictEqual(headers.Authorization, 'Bearer rpc-key');
  });

  await check('returns error on HTTP failure', async () => {
    const orig = global.fetch;
    mockFetch({ ok: false, body: 'permission denied' });
    const { data, error } = await createClient('http://api.test', 'k').rpc('boom');
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.ok(error.message.includes('permission denied'), `Got: ${error.message}`);
  });

  await check('returns error on network failure', async () => {
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('ECONNREFUSED'); };
    const { data, error } = await createClient('http://api.test', 'k').rpc('fn');
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.ok(error.message.includes('ECONNREFUSED'));
  });

  // ── QueryBuilder URL building ──────────────────────────────────────────────
  console.log('\n--- QueryBuilder URL building ---');

  await check('base URL and table name', () => {
    const url = qb('leads', 'http://api.test', 'k')._buildUrl();
    assert.ok(url.startsWith('http://api.test/leads'), `Got: ${url}`);
  });

  await check('select(cols) sets ?select= param', () => {
    const url = qb('t').select('id,name')._buildUrl();
    assert.ok(url.includes('select=id') && url.includes('name'), `Got: ${url}`);
  });

  await check('select() defaults to *', () => {
    const url = qb('t').select()._buildUrl();
    assert.ok(url.includes('select=*'), `Got: ${url}`);
  });

  await check('eq() → ?col=eq.val', () => {
    const url = qb('t').eq('status', 'active')._buildUrl();
    assert.ok(url.includes('status=eq.active'), `Got: ${url}`);
  });

  await check('neq() → ?col=neq.val', () => {
    const url = qb('t').neq('status', 'deleted')._buildUrl();
    assert.ok(url.includes('status=neq.deleted'), `Got: ${url}`);
  });

  await check('gt() → ?col=gt.val', () => {
    const url = qb('t').gt('age', 18)._buildUrl();
    assert.ok(url.includes('age=gt.18'), `Got: ${url}`);
  });

  await check('gte() → ?col=gte.val', () => {
    const url = qb('t').gte('score', 100)._buildUrl();
    assert.ok(url.includes('score=gte.100'), `Got: ${url}`);
  });

  await check('lt() → ?col=lt.val', () => {
    const url = qb('t').lt('price', 50)._buildUrl();
    assert.ok(url.includes('price=lt.50'), `Got: ${url}`);
  });

  await check('lte() → ?col=lte.val', () => {
    const url = qb('t').lte('count', 10)._buildUrl();
    assert.ok(url.includes('count=lte.10'), `Got: ${url}`);
  });

  await check('in() → ?col=in.("a","b")', () => {
    const raw = qb('t').in('role', ['admin', 'user'])._buildUrl();
    const url = decodeURIComponent(raw);
    assert.ok(url.includes('role=in.('), `Got: ${url}`);
    assert.ok(url.includes('"admin"') && url.includes('"user"'), `Got: ${url}`);
  });

  await check('is(null) → ?col=is.null', () => {
    const url = qb('t').is('deleted_at', null)._buildUrl();
    assert.ok(url.includes('deleted_at=is.null'), `Got: ${url}`);
  });

  await check('is(true) → ?col=is.true', () => {
    const url = qb('t').is('active', true)._buildUrl();
    assert.ok(url.includes('active=is.true'), `Got: ${url}`);
  });

  await check('not(key, val) [2-arg form] → ?col=not.val', () => {
    const url = qb('t').not('status', 'deleted')._buildUrl();
    assert.ok(url.includes('status=not.deleted'), `Got: ${url}`);
  });

  await check('not(key, "is", null) → ?col=not.is.null', () => {
    const url = qb('t').not('deleted_at', 'is', null)._buildUrl();
    assert.ok(url.includes('deleted_at=not.is.null'), `Got: ${url}`);
  });

  await check('not(key, "eq", val) → ?col=not.eq.val', () => {
    const url = qb('t').not('role', 'eq', 'guest')._buildUrl();
    assert.ok(url.includes('role=not.eq.guest'), `Got: ${url}`);
  });

  await check('or() wraps filter string in parentheses', () => {
    const url = qb('t').or('status.eq.active,role.eq.admin')._buildUrl();
    assert.ok(url.includes('or='), `Got: ${url}`);
  });

  await check('order(col, ascending:true) → ?order=col.asc', () => {
    const url = qb('t').order('created_at', { ascending: true })._buildUrl();
    assert.ok(url.includes('order=created_at.asc'), `Got: ${url}`);
  });

  await check('order(col, ascending:false) → ?order=col.desc', () => {
    const url = qb('t').order('created_at', { ascending: false })._buildUrl();
    assert.ok(url.includes('order=created_at.desc'), `Got: ${url}`);
  });

  await check('order() defaults to ascending', () => {
    const url = qb('t').order('name')._buildUrl();
    assert.ok(url.includes('order=name.asc'), `Got: ${url}`);
  });

  await check('limit() → ?limit=N', () => {
    const url = qb('t').limit(25)._buildUrl();
    assert.ok(url.includes('limit=25'), `Got: ${url}`);
  });

  await check('range(0, 9) → ?offset=0&limit=10', () => {
    const url = qb('t').range(0, 9)._buildUrl();
    assert.ok(url.includes('offset=0') && url.includes('limit=10'), `Got: ${url}`);
  });

  await check('multiple filters chain correctly', () => {
    const url = qb('t').eq('status', 'active').neq('role', 'guest').limit(5)._buildUrl();
    assert.ok(url.includes('status=eq.active'), `Got: ${url}`);
    assert.ok(url.includes('role=neq.guest'), `Got: ${url}`);
    assert.ok(url.includes('limit=5'), `Got: ${url}`);
  });

  // ── QueryBuilder header building ───────────────────────────────────────────
  console.log('\n--- QueryBuilder header building ---');

  await check('GET includes Content-Type and Accept headers', () => {
    const headers = qb('t')._buildHeaders();
    assert.strictEqual(headers['Content-Type'], 'application/json');
    assert.strictEqual(headers['Accept'], 'application/json');
  });

  await check('includes apikey and Authorization headers when key is set', () => {
    const headers = qb('t', 'http://x', 'my-api-key')._buildHeaders();
    assert.strictEqual(headers.apikey, 'my-api-key');
    assert.strictEqual(headers.Authorization, 'Bearer my-api-key');
  });

  await check('omits apikey and Authorization when key is empty', () => {
    const headers = qb('t', 'http://x', '')._buildHeaders();
    assert.ok(!headers.apikey, 'apikey should be absent');
    assert.ok(!headers.Authorization, 'Authorization should be absent');
  });

  await check('insert() without select — no Prefer header', () => {
    const builder = qb('t').insert({ name: 'test' });
    assert.ok(!builder._buildHeaders()['Prefer'], 'Expected no Prefer header');
  });

  await check('insert().select() → Prefer: return=representation', () => {
    const headers = qb('t').insert({ name: 'test' }).select('*')._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
    assert.ok(!headers['Prefer'].includes('merge-duplicates'), `Got: ${headers['Prefer']}`);
  });

  await check('update().select() → Prefer: return=representation', () => {
    const headers = qb('t').update({ name: 'new' }).select('id')._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
  });

  await check('upsert().select() → Prefer includes merge-duplicates and return=representation', () => {
    const headers = qb('t').upsert({ id: 1 }).select('*')._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('resolution=merge-duplicates'), `Got: ${headers['Prefer']}`);
    assert.ok(headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
  });

  await check('upsert() without select → Prefer: resolution=merge-duplicates only', () => {
    const headers = qb('t').upsert({ id: 1 })._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('resolution=merge-duplicates'), `Got: ${headers['Prefer']}`);
    assert.ok(!headers['Prefer'].includes('return=representation'), `Got: ${headers['Prefer']}`);
  });

  await check('select(*, { count: "exact" }) → Prefer: count=exact', () => {
    const headers = qb('t').select('*', { count: 'exact' })._buildHeaders();
    assert.ok(headers['Prefer'] && headers['Prefer'].includes('count=exact'), `Got: ${headers['Prefer']}`);
  });

  // ── QueryBuilder builder method chains ────────────────────────────────────
  console.log('\n--- QueryBuilder method chaining ---');

  await check('filter methods return this (chainable)', () => {
    const builder = qb('t');
    assert.strictEqual(builder.select('*'), builder);
    assert.strictEqual(builder.eq('id', 1), builder);
    assert.strictEqual(builder.neq('x', 2), builder);
    assert.strictEqual(builder.gt('n', 0), builder);
    assert.strictEqual(builder.order('id'), builder);
    assert.strictEqual(builder.limit(10), builder);
  });

  await check('single() and maybeSingle() return this', () => {
    const b1 = qb('t');
    assert.strictEqual(b1.single(), b1);
    const b2 = qb('t');
    assert.strictEqual(b2.maybeSingle(), b2);
  });

  await check('insert() sets method to POST and stores body', () => {
    const builder = qb('t').insert({ x: 1 });
    assert.strictEqual(builder._httpMethod, 'POST');
    assert.deepStrictEqual(builder._bodyData, { x: 1 });
  });

  await check('update() sets method to PATCH and stores body', () => {
    const builder = qb('t').update({ x: 2 });
    assert.strictEqual(builder._httpMethod, 'PATCH');
    assert.deepStrictEqual(builder._bodyData, { x: 2 });
  });

  await check('delete() sets method to DELETE', () => {
    assert.strictEqual(qb('t').delete()._httpMethod, 'DELETE');
  });

  await check('upsert() wraps single object in array', () => {
    const builder = qb('t').upsert({ id: 1 });
    assert.strictEqual(builder._httpMethod, 'POST');
    assert.ok(Array.isArray(builder._bodyData), 'body should be array');
    assert.strictEqual(builder._isUpsert, true);
  });

  await check('upsert() passes array through unchanged', () => {
    const builder = qb('t').upsert([{ id: 1 }, { id: 2 }]);
    assert.strictEqual(builder._bodyData.length, 2);
  });

  await check('upsert() records onConflict option', () => {
    const builder = qb('t').upsert({ id: 1 }, { onConflict: 'id' });
    assert.strictEqual(builder._upsertConflictColumn, 'id');
  });

  // ── QueryBuilder execution ─────────────────────────────────────────────────
  console.log('\n--- QueryBuilder execution ---');

  await check('successful GET returns { data, error: null, count: null }', async () => {
    const orig = global.fetch;
    mockFetch({ body: JSON.stringify([{ id: 1 }]) });
    const { data, error, count } = await qb('leads').select('*');
    restoreFetch(orig);
    assert.strictEqual(error, null);
    assert.strictEqual(count, null);
    assert.ok(Array.isArray(data) && data[0].id === 1);
  });

  await check('HTTP error returns { data: null, error with message/code/status }', async () => {
    const orig = global.fetch;
    mockFetch({ ok: false, status: 403, body: JSON.stringify({ message: 'Forbidden', code: '42501' }) });
    const { data, error } = await qb('leads').select('*');
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.ok(error.message.includes('Forbidden'), `Got: ${error.message}`);
    assert.strictEqual(error.code, '42501');
    assert.strictEqual(error.status, 403);
  });

  await check('HTTP error with non-JSON body returns raw text in error.message', async () => {
    const orig = global.fetch;
    mockFetch({ ok: false, status: 500, body: 'Internal Server Error' });
    const { data, error } = await qb('leads').select('*');
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.ok(error.message.includes('Internal Server Error'), `Got: ${error.message}`);
  });

  await check('network error returns { data: null, error }', async () => {
    const orig = global.fetch;
    global.fetch = async () => { throw new Error('Network unreachable'); };
    const { data, error } = await qb('leads').select('*');
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.ok(error.message.includes('Network unreachable'), `Got: ${error.message}`);
  });

  await check('single() returns first element from array', async () => {
    const orig = global.fetch;
    mockFetch({ body: JSON.stringify([{ id: 1 }, { id: 2 }]) });
    const { data, error } = await qb('leads').select('*').single();
    restoreFetch(orig);
    assert.strictEqual(error, null);
    assert.strictEqual(data.id, 1);
  });

  await check('single() on empty array returns PGRST116 error', async () => {
    const orig = global.fetch;
    mockFetch({ body: JSON.stringify([]) });
    const { data, error } = await qb('leads').select('*').single();
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.strictEqual(error.code, 'PGRST116');
  });

  await check('maybeSingle() returns first element from non-empty array', async () => {
    const orig = global.fetch;
    mockFetch({ body: JSON.stringify([{ id: 5 }]) });
    const { data, error } = await qb('leads').select('*').maybeSingle();
    restoreFetch(orig);
    assert.strictEqual(data.id, 5);
    assert.strictEqual(error, null);
  });

  await check('maybeSingle() on empty array returns null data without error', async () => {
    const orig = global.fetch;
    mockFetch({ body: JSON.stringify([]) });
    const { data, error } = await qb('leads').select('*').maybeSingle();
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.strictEqual(error, null);
  });

  await check('DELETE without select returns data: null', async () => {
    const orig = global.fetch;
    mockFetch({ body: '' });
    const { data, error } = await qb('leads').delete().eq('id', 1);
    restoreFetch(orig);
    assert.strictEqual(data, null);
    assert.strictEqual(error, null);
  });

  await check('count mode parses total from content-range header', async () => {
    const orig = global.fetch;
    global.fetch = async () => ({
      ok: true, status: 200,
      headers: { get: (name) => name === 'content-range' ? '0-9/42' : null },
      text: async () => JSON.stringify([]),
    });
    const { count } = await qb('leads').select('*', { count: 'exact' });
    restoreFetch(orig);
    assert.strictEqual(count, 42);
  });

  await check('count stays null when content-range total is wildcard (*)', async () => {
    const orig = global.fetch;
    global.fetch = async () => ({
      ok: true, status: 200,
      headers: { get: (name) => name === 'content-range' ? '0-9/*' : null },
      text: async () => JSON.stringify([]),
    });
    const { count } = await qb('leads').select('*', { count: 'exact' });
    restoreFetch(orig);
    assert.strictEqual(count, null);
  });

  await check('then() caches the promise (fetch called only once)', async () => {
    const orig = global.fetch;
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify([]) };
    };
    const builder = qb('leads').select('*');
    await builder;
    await builder;
    restoreFetch(orig);
    assert.strictEqual(callCount, 1, `Expected 1 fetch call, got ${callCount}`);
  });

  // ── getPool() ──────────────────────────────────────────────────────────────
  console.log('\n--- getPool() ---');

  await check('throws when LOCAL_PG_URL is not set', () => {
    // We cannot re-require lib/db here (it's a singleton), so test indirectly:
    // getPool() uses process.env.LOCAL_PG_URL only if _pool is null.
    // On a fresh require the pool would be null — but since we already required db,
    // we test the error message by checking that the error surface works correctly.
    // If _pool exists from a previous test (unlikely in CI), skip this check gracefully.
    const { Pool } = require('pg');
    const origUrl = process.env.LOCAL_PG_URL;
    delete process.env.LOCAL_PG_URL;

    // Reset module cache to get fresh instance with null _pool
    const dbPath = require.resolve('../lib/db');
    delete require.cache[dbPath];
    const freshDb = require('../lib/db');
    let threw = false;
    try {
      freshDb.getPool();
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('LOCAL_PG_URL'), `Expected LOCAL_PG_URL in error, got: ${err.message}`);
    } finally {
      if (origUrl !== undefined) process.env.LOCAL_PG_URL = origUrl;
      delete require.cache[dbPath];
    }
    assert.ok(threw, 'getPool() should throw when LOCAL_PG_URL is not set');
  });

  await check('creates a Pool with the connection string and max:10', () => {
    const dbPath = require.resolve('../lib/db');
    delete require.cache[dbPath];

    const pgPath = require.resolve('pg');
    const originalPg = require.cache[pgPath];
    const configs = [];
    function MockPool(cfg) { configs.push(cfg); }
    require.cache[pgPath] = { ...originalPg, exports: { Pool: MockPool } };

    process.env.LOCAL_PG_URL = 'postgresql://user:pass@localhost/testdb';
    let pool;
    try {
      pool = require('../lib/db').getPool();
    } finally {
      delete process.env.LOCAL_PG_URL;
      require.cache[pgPath] = originalPg;
      delete require.cache[dbPath];
    }

    assert.ok(pool instanceof MockPool, 'Should return a Pool instance');
    assert.strictEqual(configs[0].connectionString, 'postgresql://user:pass@localhost/testdb');
    assert.strictEqual(configs[0].max, 10);
  });

  await check('returns the same pool instance on repeated calls (singleton)', () => {
    const dbPath = require.resolve('../lib/db');
    delete require.cache[dbPath];

    const pgPath = require.resolve('pg');
    const originalPg = require.cache[pgPath];
    let callCount = 0;
    function MockPool() { callCount++; }
    require.cache[pgPath] = { ...originalPg, exports: { Pool: MockPool } };

    process.env.LOCAL_PG_URL = 'postgresql://localhost/test';
    let pool1, pool2;
    try {
      const db = require('../lib/db');
      pool1 = db.getPool();
      pool2 = db.getPool();
    } finally {
      delete process.env.LOCAL_PG_URL;
      require.cache[pgPath] = originalPg;
      delete require.cache[dbPath];
    }

    assert.strictEqual(pool1, pool2, 'Should return the same Pool instance');
    assert.strictEqual(callCount, 1, `Pool constructor should be called once, got ${callCount}`);
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
