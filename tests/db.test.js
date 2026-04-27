'use strict';

/*
 * Spec:
 *   What:    tests/db.test.js — Jest tests for lib/db.js hub module.
 *            Covers createClient(), QueryBuilder methods, _execute(), and getPool().
 *   Verify:  npx jest --testPathPattern db.test.js — all tests green, exit 0.
 *   Boundaries: Only tests lib/db.js public API. No real HTTP calls or DB connections.
 *               Does not touch routes, services, or any other file.
 *
 * NOTE: This file uses a literal require('../lib/db') so the code-graph builder
 * can detect it as a test file for lib/db.js (graph-self-heal untested-hub detection).
 */

const { createClient, getPool } = require('../lib/db');

// ─── Fetch mock helpers ───────────────────────────────────────────────────────

function mockFetch(overrides = {}) {
  const cfg = {
    ok: true,
    status: 200,
    body: JSON.stringify([{ id: 1 }]),
    headers: {},
    ...overrides,
  };

  global.fetch = jest.fn(async () => ({
    ok: cfg.ok,
    status: cfg.status,
    headers: {
      get: (name) => (cfg.headers[name] || null),
    },
    text: async () => cfg.body,
    json: async () => JSON.parse(cfg.body),
  }));

  return global.fetch;
}

function qbFor(table, url = 'http://api.test', key = 'sk') {
  return createClient(url, key).from(table);
}

afterEach(() => {
  jest.restoreAllMocks();
  if (global.fetch && global.fetch.mockRestore) global.fetch.mockRestore();
});

// ─── createClient() ───────────────────────────────────────────────────────────

describe('createClient()', () => {
  it('returns an object with from, rpc, and auth', () => {
    const client = createClient('http://api.test', 'key');
    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
    expect(client.auth).toBeDefined();
    expect(typeof client.auth.getUser).toBe('function');
    expect(typeof client.auth.getSession).toBe('function');
  });

  it('from(table) returns a thenable QueryBuilder', () => {
    const qb = createClient('http://api.test', 'k').from('leads');
    expect(typeof qb.then).toBe('function');
    expect(typeof qb.select).toBe('function');
    expect(typeof qb.eq).toBe('function');
  });

  it('uses NEXT_PUBLIC_API_URL env var when url is omitted', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://envtest.test';
    const qb = createClient(undefined, 'k').from('t');
    const url = qb._buildUrl();
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(url.startsWith('http://envtest.test/')).toBe(true);
  });

  it('uses API_SECRET_KEY env var when key is omitted', () => {
    process.env.API_SECRET_KEY = 'env-secret';
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.API_SECRET_KEY;
    expect(headers.apikey).toBe('env-secret');
  });

  it('falls back to LEADFLOW_API_KEY when API_SECRET_KEY is absent', () => {
    const saved = process.env.API_SECRET_KEY;
    delete process.env.API_SECRET_KEY;
    process.env.LEADFLOW_API_KEY = 'lf-key';
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.LEADFLOW_API_KEY;
    if (saved !== undefined) process.env.API_SECRET_KEY = saved;
    expect(headers.apikey).toBe('lf-key');
  });

  it('auth.getUser() returns stub { data: { user: null }, error: null }', async () => {
    const result = await createClient('http://api.test', 'key').auth.getUser();
    expect(result).toEqual({ data: { user: null }, error: null });
  });

  it('auth.getSession() returns stub { data: { session: null }, error: null }', async () => {
    const result = await createClient('http://api.test', 'key').auth.getSession();
    expect(result).toEqual({ data: { session: null }, error: null });
  });
});

// ─── createClient().rpc() ─────────────────────────────────────────────────────

describe('createClient().rpc()', () => {
  it('posts to /rpc/<name> with params', async () => {
    mockFetch({ body: JSON.stringify({ result: 42 }) });
    const client = createClient('http://api.test', 'mykey');
    const { data, error } = await client.rpc('my_func', { x: 1 });
    const call = global.fetch.mock.calls[0];
    expect(data.result).toBe(42);
    expect(error).toBeNull();
    expect(call[0]).toMatch(/\/rpc\/my_func$/);
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body).x).toBe(1);
  });

  it('sends apikey and Authorization headers', async () => {
    mockFetch({ body: '{}' });
    const client = createClient('http://api.test', 'rpc-key');
    await client.rpc('func');
    const headers = global.fetch.mock.calls[0][1].headers;
    expect(headers.apikey).toBe('rpc-key');
    expect(headers.Authorization).toBe('Bearer rpc-key');
  });

  it('sends empty object when no params are given', async () => {
    mockFetch({ body: '{}' });
    const client = createClient('http://api.test', 'k');
    await client.rpc('fn_no_params');
    const sentBody = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(sentBody).toEqual({});
  });

  it('returns { data: null, error } on HTTP failure', async () => {
    mockFetch({ ok: false, body: 'permission denied' });
    const { data, error } = await createClient('http://api.test', 'k').rpc('boom');
    expect(data).toBeNull();
    expect(error.message).toMatch(/permission denied/);
  });

  it('returns { data: null, error } on network error', async () => {
    global.fetch = jest.fn(async () => { throw new Error('ECONNREFUSED'); });
    const { data, error } = await createClient('http://api.test', 'k').rpc('fn');
    expect(data).toBeNull();
    expect(error.message).toMatch(/ECONNREFUSED/);
  });
});

// ─── QueryBuilder URL building ────────────────────────────────────────────────

describe('QueryBuilder._buildUrl()', () => {
  it('includes base URL and table name', () => {
    const url = qbFor('leads', 'http://api.test', 'k')._buildUrl();
    expect(url.startsWith('http://api.test/leads')).toBe(true);
  });

  it('select("id,name") sets ?select=id,name', () => {
    const url = decodeURIComponent(qbFor('t').select('id,name')._buildUrl());
    expect(url).toMatch(/select=id,name/);
  });

  it('select() with no args sets ?select=*', () => {
    const url = qbFor('t').select()._buildUrl();
    expect(url).toMatch(/select=%2A|select=\*/);
  });

  it('eq() → ?col=eq.val', () => {
    const url = qbFor('t').eq('status', 'active')._buildUrl();
    expect(url).toMatch(/status=eq\.active/);
  });

  it('neq() → ?col=neq.val', () => {
    const url = qbFor('t').neq('status', 'deleted')._buildUrl();
    expect(url).toMatch(/status=neq\.deleted/);
  });

  it('gt() → ?col=gt.val', () => {
    const url = qbFor('t').gt('age', 18)._buildUrl();
    expect(url).toMatch(/age=gt\.18/);
  });

  it('gte() → ?col=gte.val', () => {
    const url = qbFor('t').gte('score', 100)._buildUrl();
    expect(url).toMatch(/score=gte\.100/);
  });

  it('lt() → ?col=lt.val', () => {
    const url = qbFor('t').lt('price', 50)._buildUrl();
    expect(url).toMatch(/price=lt\.50/);
  });

  it('lte() → ?col=lte.val', () => {
    const url = qbFor('t').lte('count', 10)._buildUrl();
    expect(url).toMatch(/count=lte\.10/);
  });

  it('in() → ?col=in.("a","b")', () => {
    const url = decodeURIComponent(qbFor('t').in('role', ['admin', 'user'])._buildUrl());
    expect(url).toMatch(/role=in\.\(/);
    expect(url).toContain('"admin"');
    expect(url).toContain('"user"');
  });

  it('is(null) → ?col=is.null', () => {
    const url = qbFor('t').is('deleted_at', null)._buildUrl();
    expect(url).toMatch(/deleted_at=is\.null/);
  });

  it('is(true) → ?col=is.true', () => {
    const url = qbFor('t').is('active', true)._buildUrl();
    expect(url).toMatch(/active=is\.true/);
  });

  it('not(key, val) [2 args] → ?col=not.val', () => {
    const url = qbFor('t').not('status', 'deleted')._buildUrl();
    expect(url).toMatch(/status=not\.deleted/);
  });

  it('not(key, "is", null) → ?col=not.is.null', () => {
    const url = qbFor('t').not('deleted_at', 'is', null)._buildUrl();
    expect(url).toMatch(/deleted_at=not\.is\.null/);
  });

  it('not(key, "eq", val) → ?col=not.eq.val', () => {
    const url = qbFor('t').not('role', 'eq', 'guest')._buildUrl();
    expect(url).toMatch(/role=not\.eq\.guest/);
  });

  it('or() → ?or=(filterStr)', () => {
    const url = decodeURIComponent(qbFor('t').or('status.eq.active,role.eq.admin')._buildUrl());
    expect(url).toMatch(/or=/);
    expect(url).toContain('status.eq.active');
  });

  it('order(col, ascending: true) → ?order=col.asc', () => {
    const url = qbFor('t').order('created_at', { ascending: true })._buildUrl();
    expect(url).toMatch(/order=created_at\.asc/);
  });

  it('order(col, ascending: false) → ?order=col.desc', () => {
    const url = qbFor('t').order('created_at', { ascending: false })._buildUrl();
    expect(url).toMatch(/order=created_at\.desc/);
  });

  it('order() defaults to ascending', () => {
    const url = qbFor('t').order('name')._buildUrl();
    expect(url).toMatch(/order=name\.asc/);
  });

  it('limit() → ?limit=N', () => {
    const url = qbFor('t').limit(25)._buildUrl();
    expect(url).toMatch(/limit=25/);
  });

  it('range(0, 9) → ?offset=0&limit=10', () => {
    const url = qbFor('t').range(0, 9)._buildUrl();
    expect(url).toMatch(/offset=0/);
    expect(url).toMatch(/limit=10/);
  });

  it('multiple filters chain correctly', () => {
    const url = qbFor('t').eq('status', 'active').neq('role', 'guest').limit(5)._buildUrl();
    expect(url).toMatch(/status=eq\.active/);
    expect(url).toMatch(/role=neq\.guest/);
    expect(url).toMatch(/limit=5/);
  });

  it('no select() call → no select param in URL', () => {
    const url = qbFor('t').eq('id', 1)._buildUrl();
    expect(url).not.toMatch(/select=/);
  });

  it('multiple order() calls → all columns appear in URL', () => {
    const url = decodeURIComponent(qbFor('t').order('name').order('created_at', { ascending: false })._buildUrl());
    expect(url).toMatch(/name\.asc/);
    expect(url).toMatch(/created_at\.desc/);
  });

  it('range() overrides a prior limit()', () => {
    const url = qbFor('t').limit(5).range(10, 19)._buildUrl();
    expect(url).toMatch(/offset=10/);
    expect(url).toMatch(/limit=10/);
  });
});

// ─── QueryBuilder._buildHeaders() ────────────────────────────────────────────

describe('QueryBuilder._buildHeaders()', () => {
  it('GET includes Content-Type and Accept', () => {
    const headers = qbFor('t')._buildHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  });

  it('includes apikey and Authorization when key is set', () => {
    const headers = qbFor('t', 'http://x', 'my-api-key')._buildHeaders();
    expect(headers.apikey).toBe('my-api-key');
    expect(headers.Authorization).toBe('Bearer my-api-key');
  });

  it('omits apikey and Authorization when key is empty', () => {
    const headers = qbFor('t', 'http://x', '')._buildHeaders();
    expect(headers.apikey).toBeUndefined();
    expect(headers.Authorization).toBeUndefined();
  });

  it('POST (insert) without select → no Prefer header', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' });
    const headers = qb._buildHeaders();
    expect(headers['Prefer']).toBeUndefined();
  });

  it('POST (insert) with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' }).select('*');
    const headers = qb._buildHeaders();
    expect(headers['Prefer']).toContain('return=representation');
    expect(headers['Prefer']).not.toContain('merge-duplicates');
  });

  it('PATCH (update) with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.update({ name: 'new' }).select('id');
    const headers = qb._buildHeaders();
    expect(headers['Prefer']).toContain('return=representation');
  });

  it('upsert with select → Prefer includes merge-duplicates and return=representation', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1, name: 'x' }).select('*');
    const headers = qb._buildHeaders();
    expect(headers['Prefer']).toContain('resolution=merge-duplicates');
    expect(headers['Prefer']).toContain('return=representation');
  });

  it('upsert without select → Prefer: resolution=merge-duplicates only', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1 });
    const headers = qb._buildHeaders();
    expect(headers['Prefer']).toContain('resolution=merge-duplicates');
    expect(headers['Prefer']).not.toContain('return=representation');
  });

  it('count mode appends count=exact to Prefer', () => {
    const qb = qbFor('t');
    qb.select('*', { count: 'exact' });
    const headers = qb._buildHeaders();
    expect(headers['Prefer']).toContain('count=exact');
  });
});

// ─── QueryBuilder builder method chains ───────────────────────────────────────

describe('QueryBuilder builder method chains', () => {
  it('select() returns this', () => {
    const qb = qbFor('t');
    expect(qb.select('*')).toBe(qb);
  });

  it('eq() returns this', () => {
    const qb = qbFor('t');
    expect(qb.eq('id', 1)).toBe(qb);
  });

  it('order() returns this', () => {
    const qb = qbFor('t');
    expect(qb.order('id')).toBe(qb);
  });

  it('limit() returns this', () => {
    const qb = qbFor('t');
    expect(qb.limit(10)).toBe(qb);
  });

  it('single() returns this', () => {
    const qb = qbFor('t');
    expect(qb.single()).toBe(qb);
  });

  it('maybeSingle() returns this', () => {
    const qb = qbFor('t');
    expect(qb.maybeSingle()).toBe(qb);
  });

  it('insert() sets _httpMethod to POST and _bodyData', () => {
    const qb = qbFor('t').insert({ x: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(qb._bodyData).toEqual({ x: 1 });
  });

  it('update() sets _httpMethod to PATCH and _bodyData', () => {
    const qb = qbFor('t').update({ x: 2 });
    expect(qb._httpMethod).toBe('PATCH');
    expect(qb._bodyData).toEqual({ x: 2 });
  });

  it('delete() sets _httpMethod to DELETE', () => {
    const qb = qbFor('t').delete();
    expect(qb._httpMethod).toBe('DELETE');
  });

  it('upsert() wraps an object in an array and sets _isUpsert', () => {
    const qb = qbFor('t').upsert({ id: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(Array.isArray(qb._bodyData)).toBe(true);
    expect(qb._bodyData[0].id).toBe(1);
    expect(qb._isUpsert).toBe(true);
  });

  it('upsert() accepts an array directly', () => {
    const qb = qbFor('t').upsert([{ id: 1 }, { id: 2 }]);
    expect(Array.isArray(qb._bodyData)).toBe(true);
    expect(qb._bodyData.length).toBe(2);
  });

  it('upsert() sets _upsertConflictColumn from opts.onConflict', () => {
    const qb = qbFor('t').upsert({ id: 1 }, { onConflict: 'id' });
    expect(qb._upsertConflictColumn).toBe('id');
  });
});

// ─── QueryBuilder._execute() ─────────────────────────────────────────────────

describe('QueryBuilder._execute()', () => {
  it('successful GET returns { data, error: null, count: null }', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1, name: 'Alice' }]) });
    const result = await qbFor('leads').select('*');
    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0].id).toBe(1);
    expect(result.count).toBeNull();
  });

  it('HTTP error returns { data: null, error }', async () => {
    mockFetch({ ok: false, status: 403, body: JSON.stringify({ message: 'Forbidden', code: '42501' }) });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error.message).toMatch(/Forbidden/);
    expect(result.error.code).toBe('42501');
    expect(result.error.status).toBe(403);
  });

  it('HTTP error with non-JSON body returns error with raw text', async () => {
    mockFetch({ ok: false, status: 500, body: 'Internal Server Error' });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/Internal Server Error/);
  });

  it('network error returns { data: null, error }', async () => {
    global.fetch = jest.fn(async () => { throw new Error('Network unreachable'); });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/Network unreachable/);
    expect(result.count).toBeNull();
  });

  it('non-Error thrown from fetch → error.message contains the string', async () => {
    global.fetch = jest.fn(async () => { throw 'connection reset'; });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toMatch(/connection reset/);
  });

  it('single() with array response returns first element', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1 }, { id: 2 }]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.error).toBeNull();
    expect(result.data.id).toBe(1);
  });

  it('single() with empty array returns PGRST116 error', async () => {
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.data).toBeNull();
    expect(result.error).toBeDefined();
    expect(result.error.code).toBe('PGRST116');
  });

  it('maybeSingle() with array returns first element', async () => {
    mockFetch({ body: JSON.stringify([{ id: 5 }]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data.id).toBe(5);
    expect(result.error).toBeNull();
  });

  it('maybeSingle() with empty array returns { data: null, error: null }', async () => {
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('DELETE without select → data is null', async () => {
    mockFetch({ body: '' });
    const result = await qbFor('leads').delete().eq('id', 1);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('DELETE with select → data returned from response body', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1 }]) });
    const result = await qbFor('leads').delete().select('id').eq('id', 1);
    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('GET with empty response body → data is null', async () => {
    mockFetch({ body: '' });
    const result = await qbFor('leads').select('*').eq('id', 999);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  it('count mode reads count from content-range header', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: (name) => (name === 'content-range' ? '0-9/42' : null) },
      text: async () => JSON.stringify([]),
    }));
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBe(42);
  });

  it('count stays null when content-range has wildcard total', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: (name) => (name === 'content-range' ? '0-9/*' : null) },
      text: async () => JSON.stringify([]),
    }));
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBeNull();
  });

  it('then() caches the promise (fetch called exactly once)', async () => {
    let callCount = 0;
    global.fetch = jest.fn(async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify([{ id: 1 }]),
      };
    });
    const qb = qbFor('leads').select('*');
    await qb;
    await qb;
    expect(callCount).toBe(1);
  });
});

// ─── getPool() ────────────────────────────────────────────────────────────────

describe('getPool()', () => {
  // pg is required at lib/db module load time, so we use jest.resetModules()
  // + jest.doMock() to inject a fresh mock Pool before each require.
  beforeEach(() => jest.resetModules());
  afterEach(() => jest.resetModules());

  it('throws when LOCAL_PG_URL is not set', () => {
    const saved = process.env.LOCAL_PG_URL;
    delete process.env.LOCAL_PG_URL;
    const { getPool } = require('../lib/db');
    expect(() => getPool()).toThrow(/LOCAL_PG_URL/);
    if (saved !== undefined) process.env.LOCAL_PG_URL = saved;
  });

  it('creates a Pool with the connection string and max: 10', () => {
    const MockPool = jest.fn(function PoolCtor(config) { this.config = config; });
    jest.doMock('pg', () => ({ Pool: MockPool }));

    process.env.LOCAL_PG_URL = 'postgresql://user:pass@localhost/testdb';
    const { getPool } = require('../lib/db');
    const pool = getPool();
    delete process.env.LOCAL_PG_URL;

    expect(MockPool).toHaveBeenCalledTimes(1);
    expect(MockPool).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:pass@localhost/testdb',
      max: 10,
    });
    expect(pool).toBeInstanceOf(MockPool);
  });

  it('returns the same pool on repeated calls (singleton)', () => {
    const MockPool = jest.fn(function PoolCtor() {});
    jest.doMock('pg', () => ({ Pool: MockPool }));

    process.env.LOCAL_PG_URL = 'postgresql://localhost/test';
    const { getPool } = require('../lib/db');
    const pool1 = getPool();
    const pool2 = getPool();
    delete process.env.LOCAL_PG_URL;

    expect(pool1).toBe(pool2);
    expect(MockPool).toHaveBeenCalledTimes(1);
  });
});
