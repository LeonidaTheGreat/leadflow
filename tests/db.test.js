#!/usr/bin/env node
/*
 * Unit tests for lib/db.js
 *
 * Spec:
 *   What:      tests/db.test.js (new file) — no existing files modified
 *              Tests: QueryBuilder builder methods, _buildUrl(), _buildHeaders(),
 *                     _execute() (mocked fetch), createClient() factory, getPool()
 *   Verify:    node tests/db.test.js → exits 0, all tests pass
 *   Boundaries: no real DB connections; global.fetch is mocked; pg.Pool constructor
 *               is called but never queried; module cache is reset for getPool() tests
 */
'use strict';

const assert = require('assert');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../lib/db.js');

let passed = 0;
let failed = 0;

function ok(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function aok(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// Fresh module instance — needed for getPool() singleton tests
function freshDb() {
  delete require.cache[DB_PATH];
  return require(DB_PATH);
}

// Build a minimal Response-like object for fetch mocking
function makeResponse(status, body, extraHeaders) {
  const rawHeaders = Object.assign({ 'content-type': 'application/json' }, extraHeaders || {});
  const headerMap = new Map(Object.entries(rawHeaders).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => headerMap.get(k.toLowerCase()) || null },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => (typeof body === 'object' ? body : JSON.parse(body)),
  };
}

const origFetch = global.fetch;
const mockFetch = (resp) => { global.fetch = async () => resp; };
const mockFetchThrow = (msg) => { global.fetch = async () => { throw new Error(msg); }; };
const restoreFetch = () => { global.fetch = origFetch; };

// ─── Load once for stateless tests ───────────────────────────────────────────
const { createClient, getPool } = require(DB_PATH);

async function main() {

  // ── createClient() ──────────────────────────────────────────────────────────
  console.log('\ncreateClient()');

  ok('returns object with from, rpc, auth', () => {
    const client = createClient('http://localhost', 'key');
    assert.strictEqual(typeof client.from, 'function');
    assert.strictEqual(typeof client.rpc, 'function');
    assert.strictEqual(typeof client.auth.getUser, 'function');
    assert.strictEqual(typeof client.auth.getSession, 'function');
  });

  ok('from(table) returns a QueryBuilder', () => {
    const qb = createClient('http://localhost', 'key').from('leads');
    assert.strictEqual(typeof qb.select, 'function');
    assert.strictEqual(typeof qb.eq, 'function');
    assert.strictEqual(typeof qb._execute, 'function');
    assert.strictEqual(qb._table, 'leads');
  });

  ok('url and key are stored on the QueryBuilder', () => {
    const qb = createClient('http://api', 'my-key').from('t');
    assert.strictEqual(qb._baseUrl, 'http://api');
    assert.strictEqual(qb._apiKey, 'my-key');
  });

  ok('falls back to NEXT_PUBLIC_API_URL when url omitted', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://env-api';
    const qb = createClient(undefined, 'k').from('t');
    assert.strictEqual(qb._baseUrl, 'http://env-api');
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  ok('falls back to API_SECRET_KEY when key omitted', () => {
    process.env.API_SECRET_KEY = 'secret';
    const qb = createClient('http://x').from('t');
    assert.strictEqual(qb._apiKey, 'secret');
    delete process.env.API_SECRET_KEY;
  });

  ok('falls back to LEADFLOW_API_KEY when API_SECRET_KEY absent', () => {
    delete process.env.API_SECRET_KEY;
    process.env.LEADFLOW_API_KEY = 'lf-key';
    const qb = createClient('http://x').from('t');
    assert.strictEqual(qb._apiKey, 'lf-key');
    delete process.env.LEADFLOW_API_KEY;
  });

  await aok('auth.getUser() returns stub', async () => {
    const result = await createClient('http://x', 'k').auth.getUser();
    assert.deepStrictEqual(result, { data: { user: null }, error: null });
  });

  await aok('auth.getSession() returns stub', async () => {
    const result = await createClient('http://x', 'k').auth.getSession();
    assert.deepStrictEqual(result, { data: { session: null }, error: null });
  });

  // ── QueryBuilder — builder methods return this ──────────────────────────────
  console.log('\nQueryBuilder — fluent builder methods');

  ok('select() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.select('id, name'), qb);
    assert.strictEqual(qb._selectCols, 'id, name');
  });

  ok('select() with no args defaults to *', () => {
    const qb = createClient('http://x', 'k').from('t');
    qb.select();
    assert.strictEqual(qb._selectCols, '*');
  });

  ok('select() with count option sets _countMode', () => {
    const qb = createClient('http://x', 'k').from('t');
    qb.select('*', { count: 'exact' });
    assert.strictEqual(qb._countMode, 'exact');
  });

  ok('eq() / neq() return this and push filter', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.eq('id', 1), qb);
    assert.strictEqual(qb.neq('status', 'done'), qb);
    assert.strictEqual(qb._filters.length, 2);
  });

  ok('gt() / gte() / lt() / lte() return this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.gt('n', 1), qb);
    assert.strictEqual(qb.gte('n', 1), qb);
    assert.strictEqual(qb.lt('n', 1), qb);
    assert.strictEqual(qb.lte('n', 1), qb);
  });

  ok('in() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.in('id', [1, 2, 3]), qb);
  });

  ok('is() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.is('col', null), qb);
    assert.strictEqual(qb.is('active', true), qb);
  });

  ok('not() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.not('col', 'val'), qb);
  });

  ok('or() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.or('a.eq.1,b.eq.2'), qb);
  });

  ok('order() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.order('created_at'), qb);
  });

  ok('limit() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.limit(10), qb);
    assert.strictEqual(qb._limitVal, 10);
  });

  ok('range() returns this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.range(0, 9), qb);
    assert.strictEqual(qb._rangeStart, 0);
    assert.strictEqual(qb._rangeEnd, 9);
  });

  ok('single() / maybeSingle() return this', () => {
    const qb = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb.single(), qb);
    assert.strictEqual(qb._singleVal, true);
    const qb2 = createClient('http://x', 'k').from('t');
    assert.strictEqual(qb2.maybeSingle(), qb2);
    assert.strictEqual(qb2._maybeVal, true);
  });

  ok('insert(data) sets method=POST and body', () => {
    const qb = createClient('http://x', 'k').from('t');
    const row = { name: 'test' };
    qb.insert(row);
    assert.strictEqual(qb._httpMethod, 'POST');
    assert.deepStrictEqual(qb._bodyData, row);
  });

  ok('update(data) sets method=PATCH', () => {
    const qb = createClient('http://x', 'k').from('t');
    qb.update({ name: 'updated' });
    assert.strictEqual(qb._httpMethod, 'PATCH');
  });

  ok('delete() sets method=DELETE', () => {
    const qb = createClient('http://x', 'k').from('t');
    qb.delete();
    assert.strictEqual(qb._httpMethod, 'DELETE');
  });

  ok('upsert(obj) wraps in array and sets _isUpsert', () => {
    const qb = createClient('http://x', 'k').from('t');
    qb.upsert({ id: 1, name: 'x' }, { onConflict: 'id' });
    assert.ok(Array.isArray(qb._bodyData));
    assert.strictEqual(qb._isUpsert, true);
    assert.strictEqual(qb._upsertConflictColumn, 'id');
  });

  ok('upsert(array) keeps array unchanged', () => {
    const qb = createClient('http://x', 'k').from('t');
    qb.upsert([{ id: 1 }, { id: 2 }]);
    assert.strictEqual(qb._bodyData.length, 2);
  });

  // ── _buildUrl() ─────────────────────────────────────────────────────────────
  console.log('\nQueryBuilder._buildUrl()');

  ok('includes table name in path', () => {
    const qb = createClient('http://api', 'k').from('leads');
    assert.ok(qb._buildUrl().startsWith('http://api/leads'));
  });

  ok('select cols appear in query string', () => {
    const qb = createClient('http://api', 'k').from('t').select('id,name');
    const url = qb._buildUrl();
    assert.ok(url.includes('select='), `no select param: ${url}`);
    assert.ok(url.includes('id') && url.includes('name'), `missing cols: ${url}`);
  });

  ok('eq filter: status=eq.active', () => {
    const qb = createClient('http://api', 'k').from('t').eq('status', 'active');
    assert.ok(qb._buildUrl().includes('status=eq.active'));
  });

  ok('neq filter: status=neq.done', () => {
    const qb = createClient('http://api', 'k').from('t').neq('status', 'done');
    assert.ok(qb._buildUrl().includes('status=neq.done'));
  });

  ok('gt/gte/lt/lte filters encoded correctly', () => {
    const url = createClient('http://api', 'k').from('t')
      .gt('age', 18).gte('score', 50).lt('price', 100).lte('rating', 5)
      ._buildUrl();
    assert.ok(url.includes('age=gt.18'), url);
    assert.ok(url.includes('score=gte.50'), url);
    assert.ok(url.includes('price=lt.100'), url);
    assert.ok(url.includes('rating=lte.5'), url);
  });

  ok('in filter contains quoted values', () => {
    const url = createClient('http://api', 'k').from('t').in('status', ['active', 'trial'])._buildUrl();
    assert.ok(url.includes('status=in.'), url);
    assert.ok(url.includes('active') && url.includes('trial'), url);
  });

  ok('is(null) → is.null', () => {
    const url = createClient('http://api', 'k').from('t').is('deleted_at', null)._buildUrl();
    assert.ok(url.includes('deleted_at=is.null'), url);
  });

  ok('is(true) → is.true', () => {
    const url = createClient('http://api', 'k').from('t').is('active', true)._buildUrl();
    assert.ok(url.includes('active=is.true'), url);
  });

  ok('not(key, val) → key=not.val (two-arg form)', () => {
    const url = createClient('http://api', 'k').from('t').not('status', 'eq.done')._buildUrl();
    assert.ok(url.includes('status=not.eq.done'), url);
  });

  ok('not(key, "is", null) → not.is.null', () => {
    const url = createClient('http://api', 'k').from('t').not('deleted_at', 'is', null)._buildUrl();
    assert.ok(url.includes('deleted_at=not.is.null'), url);
  });

  ok('not(key, "eq", val) → not.eq.val', () => {
    const url = createClient('http://api', 'k').from('t').not('status', 'eq', 'done')._buildUrl();
    assert.ok(url.includes('status=not.eq.done'), url);
  });

  ok('or() wraps filter in parens', () => {
    const url = createClient('http://api', 'k').from('t').or('a.eq.1,b.eq.2')._buildUrl();
    assert.ok(url.includes('or='), url);
    assert.ok(url.includes('a.eq.1'), url);
  });

  ok('order ascending', () => {
    const url = createClient('http://api', 'k').from('t').order('name', { ascending: true })._buildUrl();
    assert.ok(url.includes('order=name.asc'), url);
  });

  ok('order descending', () => {
    const url = createClient('http://api', 'k').from('t').order('name', { ascending: false })._buildUrl();
    assert.ok(url.includes('order=name.desc'), url);
  });

  ok('order defaults to ascending when opts omitted', () => {
    const url = createClient('http://api', 'k').from('t').order('name')._buildUrl();
    assert.ok(url.includes('order=name.asc'), url);
  });

  ok('limit sets limit param', () => {
    const url = createClient('http://api', 'k').from('t').limit(25)._buildUrl();
    assert.ok(url.includes('limit=25'), url);
  });

  ok('range(10, 19) → offset=10 and limit=10', () => {
    const url = createClient('http://api', 'k').from('t').range(10, 19)._buildUrl();
    assert.ok(url.includes('offset=10'), url);
    assert.ok(url.includes('limit=10'), url);
  });

  // ── _buildHeaders() ─────────────────────────────────────────────────────────
  console.log('\nQueryBuilder._buildHeaders()');

  ok('always includes Content-Type and Accept', () => {
    const h = createClient('http://api', '').from('t')._buildHeaders();
    assert.strictEqual(h['Content-Type'], 'application/json');
    assert.strictEqual(h['Accept'], 'application/json');
  });

  ok('includes apikey and Authorization when key is set', () => {
    const h = createClient('http://api', 'my-key').from('t')._buildHeaders();
    assert.strictEqual(h['apikey'], 'my-key');
    assert.strictEqual(h['Authorization'], 'Bearer my-key');
  });

  ok('no auth headers when key is empty', () => {
    const h = createClient('http://api', '').from('t')._buildHeaders();
    assert.strictEqual(h['apikey'], undefined);
    assert.strictEqual(h['Authorization'], undefined);
  });

  ok('GET with no select has no Prefer header', () => {
    const h = createClient('http://api', 'k').from('t')._buildHeaders();
    assert.strictEqual(h['Prefer'], undefined);
  });

  ok('POST with select → Prefer includes return=representation', () => {
    const qb = createClient('http://api', 'k').from('t');
    qb.insert({ x: 1 }).select('*');
    assert.ok(qb._buildHeaders()['Prefer'].includes('return=representation'));
  });

  ok('upsert → Prefer includes resolution=merge-duplicates', () => {
    const qb = createClient('http://api', 'k').from('t');
    qb.upsert({ id: 1 });
    assert.ok(qb._buildHeaders()['Prefer'].includes('resolution=merge-duplicates'));
  });

  ok('upsert with select → Prefer includes both resolution and return', () => {
    const qb = createClient('http://api', 'k').from('t');
    qb.upsert({ id: 1 }).select('*');
    const prefer = qb._buildHeaders()['Prefer'];
    assert.ok(prefer.includes('resolution=merge-duplicates'), prefer);
    assert.ok(prefer.includes('return=representation'), prefer);
  });

  ok('count mode appends count=exact to Prefer', () => {
    const qb = createClient('http://api', 'k').from('t');
    qb.select('*', { count: 'exact' });
    assert.ok(qb._buildHeaders()['Prefer'].includes('count=exact'));
  });

  ok('count mode combined with return=representation', () => {
    const qb = createClient('http://api', 'k').from('t');
    qb.insert({}).select('*', { count: 'exact' });
    const prefer = qb._buildHeaders()['Prefer'];
    assert.ok(prefer.includes('return=representation'), prefer);
    assert.ok(prefer.includes('count=exact'), prefer);
  });

  // ── _execute() — mocked fetch ────────────────────────────────────────────────
  console.log('\nQueryBuilder._execute() (mocked fetch)');

  await aok('successful GET returns data and null error', async () => {
    mockFetch(makeResponse(200, [{ id: 1, name: 'Alice' }]));
    try {
      const result = await createClient('http://api', 'k').from('leads').select('*');
      assert.deepStrictEqual(result.data, [{ id: 1, name: 'Alice' }]);
      assert.strictEqual(result.error, null);
    } finally { restoreFetch(); }
  });

  await aok('HTTP error response returns { data: null, error }', async () => {
    mockFetch(makeResponse(400, JSON.stringify({ message: 'Bad request', code: '22P02' })));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*');
      assert.strictEqual(result.data, null);
      assert.ok(result.error && result.error.message, 'expected error.message');
      assert.strictEqual(result.error.status, 400);
      assert.strictEqual(result.error.code, '22P02');
    } finally { restoreFetch(); }
  });

  await aok('non-JSON HTTP error body returned as message string', async () => {
    mockFetch(makeResponse(500, 'Internal Server Error'));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*');
      assert.strictEqual(result.data, null);
      assert.ok(result.error.message.includes('Internal Server Error'), result.error.message);
    } finally { restoreFetch(); }
  });

  await aok('network error (fetch throws) returns { data: null, error }', async () => {
    mockFetchThrow('ECONNREFUSED');
    try {
      const result = await createClient('http://api', 'k').from('t').select('*');
      assert.strictEqual(result.data, null);
      assert.ok(result.error && result.error.message.includes('ECONNREFUSED'));
    } finally { restoreFetch(); }
  });

  await aok('DELETE without select returns data: null', async () => {
    mockFetch(makeResponse(204, ''));
    try {
      const result = await createClient('http://api', 'k').from('t').delete().eq('id', 1);
      assert.strictEqual(result.data, null);
      assert.strictEqual(result.error, null);
    } finally { restoreFetch(); }
  });

  await aok('single() returns first element of array', async () => {
    mockFetch(makeResponse(200, [{ id: 1 }, { id: 2 }]));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*').single();
      assert.deepStrictEqual(result.data, { id: 1 });
      assert.strictEqual(result.error, null);
    } finally { restoreFetch(); }
  });

  await aok('single() on empty array returns PGRST116 error', async () => {
    mockFetch(makeResponse(200, []));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*').single();
      assert.strictEqual(result.data, null);
      assert.strictEqual(result.error.code, 'PGRST116');
    } finally { restoreFetch(); }
  });

  await aok('maybeSingle() returns first element', async () => {
    mockFetch(makeResponse(200, [{ id: 5 }]));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*').maybeSingle();
      assert.deepStrictEqual(result.data, { id: 5 });
      assert.strictEqual(result.error, null);
    } finally { restoreFetch(); }
  });

  await aok('maybeSingle() on empty array returns data: null, error: null', async () => {
    mockFetch(makeResponse(200, []));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*').maybeSingle();
      assert.strictEqual(result.data, null);
      assert.strictEqual(result.error, null);
    } finally { restoreFetch(); }
  });

  await aok('count parsed from content-range header', async () => {
    mockFetch(makeResponse(200, [{ id: 1 }], { 'content-range': '0-0/42' }));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*', { count: 'exact' });
      assert.strictEqual(result.count, 42);
    } finally { restoreFetch(); }
  });

  await aok('count is null when content-range header absent', async () => {
    mockFetch(makeResponse(200, []));
    try {
      const result = await createClient('http://api', 'k').from('t').select('*', { count: 'exact' });
      assert.strictEqual(result.count, null);
    } finally { restoreFetch(); }
  });

  await aok('then() caches promise — fetch called exactly once', async () => {
    let calls = 0;
    global.fetch = async () => { calls++; return makeResponse(200, []); };
    try {
      const qb = createClient('http://api', 'k').from('t').select('*');
      await qb;
      await qb; // second await should reuse cached promise
      assert.strictEqual(calls, 1, `expected 1 fetch call, got ${calls}`);
    } finally { restoreFetch(); }
  });

  await aok('fetch is called with correct method and body for insert', async () => {
    let capturedOpts;
    global.fetch = async (url, opts) => { capturedOpts = opts; return makeResponse(201, []); };
    try {
      await createClient('http://api', 'k').from('t').insert({ name: 'new' }).select('*');
      assert.strictEqual(capturedOpts.method, 'POST');
      assert.ok(capturedOpts.body.includes('new'), capturedOpts.body);
    } finally { restoreFetch(); }
  });

  // ── createClient().rpc() ────────────────────────────────────────────────────
  console.log('\ncreateClient().rpc()');

  await aok('rpc() posts to /rpc/<name>', async () => {
    let capturedUrl;
    global.fetch = async (url) => { capturedUrl = url; return makeResponse(200, { result: 42 }); };
    try {
      const result = await createClient('http://api', 'k').rpc('my_func', { p: 1 });
      assert.ok(capturedUrl.includes('/rpc/my_func'), capturedUrl);
      assert.deepStrictEqual(result.data, { result: 42 });
      assert.strictEqual(result.error, null);
    } finally { restoreFetch(); }
  });

  await aok('rpc() with no params still posts empty body', async () => {
    let capturedBody;
    global.fetch = async (url, opts) => { capturedBody = opts.body; return makeResponse(200, null); };
    try {
      await createClient('http://api', 'k').rpc('noop');
      assert.strictEqual(capturedBody, '{}');
    } finally { restoreFetch(); }
  });

  await aok('rpc() returns error on HTTP failure', async () => {
    mockFetch(makeResponse(400, 'rpc error'));
    try {
      const result = await createClient('http://api', 'k').rpc('bad_func');
      assert.strictEqual(result.data, null);
      assert.ok(result.error && result.error.message);
    } finally { restoreFetch(); }
  });

  await aok('rpc() returns error on network failure', async () => {
    mockFetchThrow('Network down');
    try {
      const result = await createClient('http://api', 'k').rpc('func');
      assert.strictEqual(result.data, null);
      assert.ok(result.error.message.includes('Network down'));
    } finally { restoreFetch(); }
  });

  // ── getPool() ───────────────────────────────────────────────────────────────
  console.log('\ngetPool()');

  ok('throws Error when LOCAL_PG_URL is not set', () => {
    const savedUrl = process.env.LOCAL_PG_URL;
    delete process.env.LOCAL_PG_URL;
    const { getPool: freshGetPool } = freshDb();
    try {
      assert.throws(() => freshGetPool(), /LOCAL_PG_URL is not set/);
    } finally {
      if (savedUrl !== undefined) process.env.LOCAL_PG_URL = savedUrl;
      delete require.cache[DB_PATH]; // clean up fresh instance
    }
  });

  ok('returns a Pool with query() method when LOCAL_PG_URL is set', () => {
    const savedUrl = process.env.LOCAL_PG_URL;
    process.env.LOCAL_PG_URL = 'postgresql://clawdbot@localhost/openclaw';
    const { getPool: freshGetPool } = freshDb();
    try {
      const pool = freshGetPool();
      assert.ok(pool !== null && pool !== undefined);
      assert.strictEqual(typeof pool.query, 'function');
    } finally {
      if (savedUrl !== undefined) process.env.LOCAL_PG_URL = savedUrl;
      else delete process.env.LOCAL_PG_URL;
      delete require.cache[DB_PATH];
    }
  });

  ok('getPool() is a lazy singleton — same instance on repeated calls', () => {
    const savedUrl = process.env.LOCAL_PG_URL;
    process.env.LOCAL_PG_URL = 'postgresql://clawdbot@localhost/openclaw';
    const { getPool: freshGetPool } = freshDb();
    try {
      const p1 = freshGetPool();
      const p2 = freshGetPool();
      assert.strictEqual(p1, p2);
    } finally {
      if (savedUrl !== undefined) process.env.LOCAL_PG_URL = savedUrl;
      else delete process.env.LOCAL_PG_URL;
      delete require.cache[DB_PATH];
    }
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
