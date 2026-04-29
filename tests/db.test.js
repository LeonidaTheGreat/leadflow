'use strict';

/*
 * Spec:
 *   What:   Tests for lib/db.js — createClient(), QueryBuilder, and getPool().
 *           lib/db.js is a hub (10 dependents). This file provides Jest-compatible
 *           coverage so failures surface in the standard test suite.
 *   Verify: npx jest tests/db.test.js  → all green, exit 0
 *   Boundaries: Only tests lib/db.js public API. Does not touch routes, services,
 *               or any other file. Does not make real HTTP calls or DB connections.
 */

const path = require('path');

const DB_PATH = path.resolve(__dirname, '../lib/db');

// ─── Fetch mock helpers ──────────────────────────────────────────────────────

function makeFetchMock({ ok = true, status = 200, body = '[]', headers = {} } = {}) {
  return jest.fn().mockImplementation(async (url, opts) => ({
    ok,
    status,
    headers: { get: (name) => headers[name] || null },
    text: async () => body,
    json: async () => JSON.parse(body),
  }));
}

function freshDb() {
  jest.resetModules();
  return require(DB_PATH);
}

function qbFor(table, url = 'http://api.test', key = 'sk') {
  const { createClient } = freshDb();
  return createClient(url, key).from(table);
}

// ─── createClient() factory ──────────────────────────────────────────────────

describe('createClient()', () => {
  it('returns object with from, rpc, and auth', () => {
    const { createClient } = freshDb();
    const client = createClient('http://api.test', 'key');
    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
    expect(typeof client.auth.getUser).toBe('function');
    expect(typeof client.auth.getSession).toBe('function');
  });

  it('from(table) returns a thenable QueryBuilder', () => {
    const { createClient } = freshDb();
    const qb = createClient('http://api.test', 'k').from('leads');
    expect(typeof qb.then).toBe('function');
    expect(typeof qb.select).toBe('function');
    expect(typeof qb.eq).toBe('function');
  });

  it('defaults URL to NEXT_PUBLIC_API_URL env var', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://from-env.test';
    const { createClient } = freshDb();
    const qb = createClient(undefined, 'k').from('t');
    const url = qb._buildUrl();
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(url).toMatch(/^http:\/\/from-env\.test\//);
  });

  it('defaults key to API_SECRET_KEY env var', () => {
    process.env.API_SECRET_KEY = 'secret-from-env';
    const { createClient } = freshDb();
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.API_SECRET_KEY;
    expect(headers.apikey).toBe('secret-from-env');
  });

  it('falls back to LEADFLOW_API_KEY when API_SECRET_KEY absent', () => {
    delete process.env.API_SECRET_KEY;
    process.env.LEADFLOW_API_KEY = 'lf-fallback';
    const { createClient } = freshDb();
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.LEADFLOW_API_KEY;
    expect(headers.apikey).toBe('lf-fallback');
  });

  it('auth.getUser() returns stub', async () => {
    const { createClient } = freshDb();
    const result = await createClient('http://api.test', 'k').auth.getUser();
    expect(result).toEqual({ data: { user: null }, error: null });
  });

  it('auth.getSession() returns stub', async () => {
    const { createClient } = freshDb();
    const result = await createClient('http://api.test', 'k').auth.getSession();
    expect(result).toEqual({ data: { session: null }, error: null });
  });
});

// ─── createClient().rpc() ────────────────────────────────────────────────────

describe('createClient().rpc()', () => {
  let originalFetch;

  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(() => { global.fetch = originalFetch; });

  it('POSTs to /rpc/<name> with params', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify({ result: 42 }) });
    const { createClient } = freshDb();
    const { data, error } = await createClient('http://api.test', 'mykey').rpc('my_func', { x: 1 });
    const [calledUrl, calledOpts] = global.fetch.mock.calls[0];
    expect(error).toBeNull();
    expect(data.result).toBe(42);
    expect(calledUrl).toMatch(/\/rpc\/my_func$/);
    expect(calledOpts.method).toBe('POST');
    expect(JSON.parse(calledOpts.body)).toEqual({ x: 1 });
  });

  it('includes apikey and Authorization headers', async () => {
    global.fetch = makeFetchMock({ body: '{}' });
    const { createClient } = freshDb();
    await createClient('http://api.test', 'rpc-key').rpc('fn');
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.apikey).toBe('rpc-key');
    expect(headers.Authorization).toBe('Bearer rpc-key');
  });

  it('returns error on HTTP failure', async () => {
    global.fetch = makeFetchMock({ ok: false, body: 'permission denied' });
    const { createClient } = freshDb();
    const { data, error } = await createClient('http://api.test', 'k').rpc('boom');
    expect(data).toBeNull();
    expect(error.message).toMatch(/permission denied/);
  });

  it('returns error on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const { createClient } = freshDb();
    const { data, error } = await createClient('http://api.test', 'k').rpc('fn');
    expect(data).toBeNull();
    expect(error.message).toMatch(/ECONNREFUSED/);
  });

  it('sends empty object body when params omitted', async () => {
    global.fetch = makeFetchMock({ body: '{}' });
    const { createClient } = freshDb();
    await createClient('http://api.test', 'k').rpc('fn_no_params');
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toEqual({});
  });
});

// ─── QueryBuilder URL building ───────────────────────────────────────────────

describe('QueryBuilder URL building', () => {
  it('includes base URL and table name', () => {
    expect(qbFor('leads', 'http://api.test')._buildUrl()).toMatch(/^http:\/\/api\.test\/leads/);
  });

  it('select(cols) → ?select=cols', () => {
    const url = qbFor('t').select('id,name')._buildUrl();
    expect(decodeURIComponent(url)).toContain('select=id,name');
  });

  it('select() with no arg → ?select=*', () => {
    expect(qbFor('t').select()._buildUrl()).toContain('select=*');
  });

  it('eq() → ?col=eq.val', () => {
    expect(qbFor('t').eq('status', 'active')._buildUrl()).toContain('status=eq.active');
  });

  it('neq() → ?col=neq.val', () => {
    expect(qbFor('t').neq('status', 'deleted')._buildUrl()).toContain('status=neq.deleted');
  });

  it('gt() → ?col=gt.val', () => {
    expect(qbFor('t').gt('age', 18)._buildUrl()).toContain('age=gt.18');
  });

  it('gte() → ?col=gte.val', () => {
    expect(qbFor('t').gte('score', 100)._buildUrl()).toContain('score=gte.100');
  });

  it('lt() → ?col=lt.val', () => {
    expect(qbFor('t').lt('price', 50)._buildUrl()).toContain('price=lt.50');
  });

  it('lte() → ?col=lte.val', () => {
    expect(qbFor('t').lte('count', 10)._buildUrl()).toContain('count=lte.10');
  });

  it('in() → ?col=in.("a","b")', () => {
    const url = decodeURIComponent(qbFor('t').in('role', ['admin', 'user'])._buildUrl());
    expect(url).toContain('role=in.(');
    expect(url).toContain('"admin"');
    expect(url).toContain('"user"');
  });

  it('is(null) → ?col=is.null', () => {
    expect(qbFor('t').is('deleted_at', null)._buildUrl()).toContain('deleted_at=is.null');
  });

  it('is(true) → ?col=is.true', () => {
    expect(qbFor('t').is('active', true)._buildUrl()).toContain('active=is.true');
  });

  it('not(key, val) [2 args] → ?col=not.val', () => {
    expect(qbFor('t').not('status', 'deleted')._buildUrl()).toContain('status=not.deleted');
  });

  it('not(key, "is", null) → ?col=not.is.null', () => {
    expect(qbFor('t').not('deleted_at', 'is', null)._buildUrl()).toContain('deleted_at=not.is.null');
  });

  it('not(key, "eq", val) → ?col=not.eq.val', () => {
    expect(qbFor('t').not('role', 'eq', 'guest')._buildUrl()).toContain('role=not.eq.guest');
  });

  it('or() → ?or=(filterStr)', () => {
    const url = decodeURIComponent(qbFor('t').or('status.eq.active,role.eq.admin')._buildUrl());
    expect(url).toContain('or=');
    expect(url).toContain('status.eq.active');
  });

  it('order ascending → ?order=col.asc', () => {
    expect(qbFor('t').order('created_at', { ascending: true })._buildUrl()).toContain('order=created_at.asc');
  });

  it('order descending → ?order=col.desc', () => {
    expect(qbFor('t').order('created_at', { ascending: false })._buildUrl()).toContain('order=created_at.desc');
  });

  it('order default is ascending', () => {
    expect(qbFor('t').order('name')._buildUrl()).toContain('order=name.asc');
  });

  it('multiple order() calls → all columns in URL', () => {
    const url = decodeURIComponent(qbFor('t').order('name').order('created_at', { ascending: false })._buildUrl());
    expect(url).toContain('name.asc');
    expect(url).toContain('created_at.desc');
  });

  it('limit() → ?limit=N', () => {
    expect(qbFor('t').limit(25)._buildUrl()).toContain('limit=25');
  });

  it('range(0, 9) → ?offset=0&limit=10', () => {
    const url = qbFor('t').range(0, 9)._buildUrl();
    expect(url).toContain('offset=0');
    expect(url).toContain('limit=10');
  });

  it('multiple filters chain correctly', () => {
    const url = qbFor('t').eq('status', 'active').neq('role', 'guest').limit(5)._buildUrl();
    expect(url).toContain('status=eq.active');
    expect(url).toContain('role=neq.guest');
    expect(url).toContain('limit=5');
  });

  it('no select() call → no select param in URL', () => {
    expect(qbFor('t').eq('id', 1)._buildUrl()).not.toContain('select=');
  });

  it('range() overrides earlier limit()', () => {
    const url = qbFor('t').limit(5).range(10, 19)._buildUrl();
    expect(url).toContain('offset=10');
    expect(url).toContain('limit=10');
  });
});

// ─── QueryBuilder header building ────────────────────────────────────────────

describe('QueryBuilder header building', () => {
  it('GET includes Content-Type and Accept', () => {
    const h = qbFor('t')._buildHeaders();
    expect(h['Content-Type']).toBe('application/json');
    expect(h['Accept']).toBe('application/json');
  });

  it('includes apikey and Authorization when key is set', () => {
    const h = qbFor('t', 'http://x', 'my-api-key')._buildHeaders();
    expect(h.apikey).toBe('my-api-key');
    expect(h.Authorization).toBe('Bearer my-api-key');
  });

  it('omits apikey and Authorization when key is empty', () => {
    const h = qbFor('t', 'http://x', '')._buildHeaders();
    expect(h.apikey).toBeUndefined();
    expect(h.Authorization).toBeUndefined();
  });

  it('POST insert without select → no Prefer header', () => {
    const qb = qbFor('t').insert({ name: 'test' });
    expect(qb._buildHeaders()['Prefer']).toBeUndefined();
  });

  it('POST insert with select → Prefer: return=representation', () => {
    const prefer = qbFor('t').insert({ name: 'test' }).select('*')._buildHeaders()['Prefer'];
    expect(prefer).toMatch(/return=representation/);
    expect(prefer).not.toMatch(/merge-duplicates/);
  });

  it('PATCH update with select → Prefer: return=representation', () => {
    const prefer = qbFor('t').update({ name: 'new' }).select('id')._buildHeaders()['Prefer'];
    expect(prefer).toMatch(/return=representation/);
  });

  it('upsert with select → Prefer has merge-duplicates and return=representation', () => {
    const prefer = qbFor('t').upsert({ id: 1 }).select('*')._buildHeaders()['Prefer'];
    expect(prefer).toMatch(/resolution=merge-duplicates/);
    expect(prefer).toMatch(/return=representation/);
  });

  it('upsert without select → Prefer: resolution=merge-duplicates only', () => {
    const prefer = qbFor('t').upsert({ id: 1 })._buildHeaders()['Prefer'];
    expect(prefer).toMatch(/resolution=merge-duplicates/);
    expect(prefer).not.toMatch(/return=representation/);
  });

  it('count mode appends count=exact to Prefer', () => {
    const prefer = qbFor('t').select('*', { count: 'exact' })._buildHeaders()['Prefer'];
    expect(prefer).toMatch(/count=exact/);
  });
});

// ─── QueryBuilder method chains ───────────────────────────────────────────────

describe('QueryBuilder method chains', () => {
  it('select() returns this', () => { const qb = qbFor('t'); expect(qb.select('*')).toBe(qb); });
  it('eq() returns this', () => { const qb = qbFor('t'); expect(qb.eq('id', 1)).toBe(qb); });
  it('neq() returns this', () => { const qb = qbFor('t'); expect(qb.neq('id', 1)).toBe(qb); });
  it('gt() returns this', () => { const qb = qbFor('t'); expect(qb.gt('n', 1)).toBe(qb); });
  it('gte() returns this', () => { const qb = qbFor('t'); expect(qb.gte('n', 1)).toBe(qb); });
  it('lt() returns this', () => { const qb = qbFor('t'); expect(qb.lt('n', 1)).toBe(qb); });
  it('lte() returns this', () => { const qb = qbFor('t'); expect(qb.lte('n', 1)).toBe(qb); });
  it('in() returns this', () => { const qb = qbFor('t'); expect(qb.in('x', ['a'])).toBe(qb); });
  it('is() returns this', () => { const qb = qbFor('t'); expect(qb.is('x', null)).toBe(qb); });
  it('not() returns this', () => { const qb = qbFor('t'); expect(qb.not('x', 'y')).toBe(qb); });
  it('or() returns this', () => { const qb = qbFor('t'); expect(qb.or('x.eq.1')).toBe(qb); });
  it('order() returns this', () => { const qb = qbFor('t'); expect(qb.order('id')).toBe(qb); });
  it('limit() returns this', () => { const qb = qbFor('t'); expect(qb.limit(10)).toBe(qb); });
  it('range() returns this', () => { const qb = qbFor('t'); expect(qb.range(0, 9)).toBe(qb); });
  it('single() returns this', () => { const qb = qbFor('t'); expect(qb.single()).toBe(qb); });
  it('maybeSingle() returns this', () => { const qb = qbFor('t'); expect(qb.maybeSingle()).toBe(qb); });

  it('insert() sets method to POST', () => {
    const qb = qbFor('t').insert({ x: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(qb._bodyData).toEqual({ x: 1 });
  });

  it('update() sets method to PATCH', () => {
    const qb = qbFor('t').update({ x: 2 });
    expect(qb._httpMethod).toBe('PATCH');
    expect(qb._bodyData).toEqual({ x: 2 });
  });

  it('delete() sets method to DELETE', () => {
    expect(qbFor('t').delete()._httpMethod).toBe('DELETE');
  });

  it('upsert() wraps single object in array', () => {
    const qb = qbFor('t').upsert({ id: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(Array.isArray(qb._bodyData)).toBe(true);
    expect(qb._bodyData[0].id).toBe(1);
    expect(qb._isUpsert).toBe(true);
  });

  it('upsert() accepts array directly', () => {
    const qb = qbFor('t').upsert([{ id: 1 }, { id: 2 }]);
    expect(qb._bodyData).toHaveLength(2);
  });

  it('upsert() stores onConflict option', () => {
    expect(qbFor('t').upsert({ id: 1 }, { onConflict: 'id' })._upsertConflictColumn).toBe('id');
  });
});

// ─── QueryBuilder._execute() ─────────────────────────────────────────────────

describe('QueryBuilder._execute()', () => {
  let originalFetch;

  beforeEach(() => { originalFetch = global.fetch; });
  afterEach(() => { global.fetch = originalFetch; });

  it('successful GET returns { data, error: null, count: null }', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([{ id: 1, name: 'Alice' }]) });
    const result = await qbFor('leads').select('*');
    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ id: 1, name: 'Alice' }]);
    expect(result.count).toBeNull();
  });

  it('HTTP error returns { data: null, error } with message, code, status', async () => {
    global.fetch = makeFetchMock({ ok: false, status: 403, body: JSON.stringify({ message: 'Forbidden', code: '42501' }) });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/Forbidden/);
    expect(result.error.code).toBe('42501');
    expect(result.error.status).toBe(403);
  });

  it('HTTP error with non-JSON body wraps raw text in error', async () => {
    global.fetch = makeFetchMock({ ok: false, status: 500, body: 'Internal Server Error' });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/Internal Server Error/);
  });

  it('network error returns { data: null, error }', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network unreachable'));
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/Network unreachable/);
    expect(result.count).toBeNull();
  });

  it('non-Error thrown from fetch → stringified in error message', async () => {
    global.fetch = jest.fn().mockRejectedValue('connection reset');
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/connection reset/);
  });

  it('single() with array response returns first element', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([{ id: 1 }, { id: 2 }]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.error).toBeNull();
    expect(result.data.id).toBe(1);
  });

  it('single() with empty array returns PGRST116 error', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.data).toBeNull();
    expect(result.error.code).toBe('PGRST116');
  });

  it('maybeSingle() with array returns first element, no error', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([{ id: 5 }]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data.id).toBe(5);
    expect(result.error).toBeNull();
  });

  it('maybeSingle() with empty array returns null data, no error', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('DELETE without select → data is null', async () => {
    global.fetch = makeFetchMock({ body: '' });
    const result = await qbFor('leads').delete().eq('id', 1);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('DELETE with select → returns data from response', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([{ id: 1 }]) });
    const result = await qbFor('leads').delete().select('id').eq('id', 1);
    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('count mode parses count from content-range header', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (n) => (n === 'content-range' ? '0-9/42' : null) },
      text: async () => JSON.stringify([]),
    });
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBe(42);
  });

  it('count stays null when content-range total is wildcard', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (n) => (n === 'content-range' ? '0-9/*' : null) },
      text: async () => JSON.stringify([]),
    });
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBeNull();
  });

  it('empty response body → data is null', async () => {
    global.fetch = makeFetchMock({ body: '' });
    const result = await qbFor('leads').select('*').eq('id', 999);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('then() caches the promise (fetch called exactly once)', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true, status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify([{ id: 1 }]),
      };
    });
    const qb = qbFor('leads').select('*');
    await qb;
    await qb;
    expect(callCount).toBe(1);
  });

  it('insert() sends POST with JSON body to fetch', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([{ id: 99, name: 'Bob' }]) });
    const result = await qbFor('leads').insert({ name: 'Bob' }).select('*');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Bob' });
    expect(result.error).toBeNull();
    expect(result.data[0].name).toBe('Bob');
  });

  it('update() sends PATCH with JSON body and filter in URL', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([{ id: 5, status: 'closed' }]) });
    const result = await qbFor('leads').update({ status: 'closed' }).eq('id', 5).select('*');
    const [calledUrl, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ status: 'closed' });
    expect(calledUrl).toContain('id=eq.5');
    expect(result.error).toBeNull();
  });

  it('upsert() sends POST with Prefer: resolution=merge-duplicates header to fetch', async () => {
    global.fetch = makeFetchMock({ body: JSON.stringify([{ id: 1 }]) });
    await qbFor('leads').upsert({ id: 1, name: 'Test' }).select('*');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.headers['Prefer']).toMatch(/resolution=merge-duplicates/);
    expect(opts.headers['Prefer']).toMatch(/return=representation/);
  });

  it('delete() sends DELETE and includes eq filter in URL', async () => {
    global.fetch = makeFetchMock({ body: '' });
    await qbFor('leads').delete().eq('id', 7);
    const [calledUrl, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe('DELETE');
    expect(calledUrl).toContain('id=eq.7');
  });
});

// ─── getPool() ────────────────────────────────────────────────────────────────

describe('getPool()', () => {
  beforeEach(() => { jest.resetModules(); });
  afterEach(() => { jest.resetModules(); });

  it('throws when LOCAL_PG_URL is not set', () => {
    const savedUrl = process.env.LOCAL_PG_URL;
    delete process.env.LOCAL_PG_URL;
    try {
      expect(() => require(DB_PATH).getPool()).toThrow(/LOCAL_PG_URL/);
    } finally {
      if (savedUrl !== undefined) process.env.LOCAL_PG_URL = savedUrl;
    }
  });

  it('creates Pool with connectionString and max=10', () => {
    const MockPool = jest.fn();
    jest.doMock('pg', () => ({ Pool: MockPool }));
    process.env.LOCAL_PG_URL = 'postgresql://user:pass@localhost/testdb';
    require(DB_PATH).getPool();
    delete process.env.LOCAL_PG_URL;
    expect(MockPool).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:pass@localhost/testdb',
      max: 10,
    });
  });

  it('returns the same Pool instance on repeated calls (singleton)', () => {
    const MockPool = jest.fn();
    jest.doMock('pg', () => ({ Pool: MockPool }));
    process.env.LOCAL_PG_URL = 'postgresql://localhost/test';
    const db = require(DB_PATH);
    const pool1 = db.getPool();
    const pool2 = db.getPool();
    delete process.env.LOCAL_PG_URL;
    expect(pool1).toBe(pool2);
    expect(MockPool).toHaveBeenCalledTimes(1);
  });
});
