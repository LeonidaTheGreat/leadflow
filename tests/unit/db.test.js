'use strict';

/**
 * Unit tests for lib/db.js
 *
 * Spec:
 *   WHAT: lib/db.js — createClient(), getPool(), and the internal QueryBuilder class
 *         Tests cover URL construction, header building, HTTP response handling,
 *         the rpc() method, auth stubs, and the pg Pool singleton.
 *   VERIFY: npx jest tests/unit/db.test.js --no-coverage → all pass, exit 0
 *   BOUNDARIES: Only tests lib/db.js public API. Does not touch routes, services,
 *               or any other file. Does not make real HTTP calls or DB connections.
 */

const path = require('path');

const DB_PATH = path.resolve(__dirname, '../../lib/db');

// ─── Fetch mock helpers ──────────────────────────────────────────────────────

function mockFetch(overrides = {}) {
  const cfg = {
    ok: true,
    status: 200,
    body: JSON.stringify([{ id: 1 }]),
    headers: {},
    ...overrides,
  };

  global.fetch = jest.fn(async (url, opts) => {
    global.fetch._lastUrl = url;
    global.fetch._lastOpts = opts;
    return {
      ok: cfg.ok,
      status: cfg.status,
      headers: { get: (name) => cfg.headers[name] || null },
      text: async () => cfg.body,
      json: async () => JSON.parse(cfg.body),
    };
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshDb() {
  delete require.cache[require.resolve(DB_PATH)];
  return require(DB_PATH);
}

function qbFor(table, url = 'http://api.test', key = 'sk') {
  return freshDb().createClient(url, key).from(table);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

afterEach(() => {
  jest.restoreAllMocks();
});

describe('createClient()', () => {
  it('returns object with from, rpc, auth', () => {
    const client = freshDb().createClient('http://api.test', 'key');
    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
    expect(client.auth).toBeTruthy();
    expect(typeof client.auth.getUser).toBe('function');
    expect(typeof client.auth.getSession).toBe('function');
  });

  it('from(table) returns thenable QueryBuilder', () => {
    const qb = qbFor('leads');
    expect(typeof qb.then).toBe('function');
    expect(typeof qb.select).toBe('function');
    expect(typeof qb.eq).toBe('function');
  });

  it('uses NEXT_PUBLIC_API_URL env var when url omitted', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://envtest.test';
    const { createClient } = freshDb();
    const url = createClient(undefined, 'k').from('t')._buildUrl();
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(url.startsWith('http://envtest.test/')).toBe(true);
  });

  it('uses API_SECRET_KEY env var when key omitted', () => {
    process.env.API_SECRET_KEY = 'env-secret';
    const { createClient } = freshDb();
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.API_SECRET_KEY;
    expect(headers.apikey).toBe('env-secret');
  });

  it('uses LEADFLOW_API_KEY when API_SECRET_KEY absent', () => {
    delete process.env.API_SECRET_KEY;
    process.env.LEADFLOW_API_KEY = 'lf-key';
    const { createClient } = freshDb();
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.LEADFLOW_API_KEY;
    expect(headers.apikey).toBe('lf-key');
  });

  it('auth.getUser() returns stub', async () => {
    const client = freshDb().createClient('http://api.test', 'key');
    const result = await client.auth.getUser();
    expect(result).toEqual({ data: { user: null }, error: null });
  });

  it('auth.getSession() returns stub', async () => {
    const client = freshDb().createClient('http://api.test', 'key');
    const result = await client.auth.getSession();
    expect(result).toEqual({ data: { session: null }, error: null });
  });
});

describe('createClient().rpc()', () => {
  it('posts to /rpc/<name> with params', async () => {
    mockFetch({ body: JSON.stringify({ result: 42 }) });
    const client = freshDb().createClient('http://api.test', 'mykey');
    const { data, error } = await client.rpc('my_func', { x: 1 });
    expect(data.result).toBe(42);
    expect(error).toBe(null);
    expect(global.fetch._lastUrl.endsWith('/rpc/my_func')).toBe(true);
    expect(global.fetch._lastOpts.method).toBe('POST');
    expect(JSON.parse(global.fetch._lastOpts.body).x).toBe(1);
  });

  it('sends apikey + Authorization headers', async () => {
    mockFetch({ body: '{}' });
    const client = freshDb().createClient('http://api.test', 'rpc-key');
    await client.rpc('func');
    const headers = global.fetch._lastOpts.headers;
    expect(headers.apikey).toBe('rpc-key');
    expect(headers.Authorization).toBe('Bearer rpc-key');
  });

  it('returns error on HTTP failure', async () => {
    mockFetch({ ok: false, body: 'permission denied' });
    const client = freshDb().createClient('http://api.test', 'k');
    const { data, error } = await client.rpc('boom');
    expect(data).toBe(null);
    expect(error.message).toContain('permission denied');
  });

  it('returns error on network failure', async () => {
    global.fetch = jest.fn(async () => { throw new Error('ECONNREFUSED'); });
    const client = freshDb().createClient('http://api.test', 'k');
    const { data, error } = await client.rpc('fn');
    expect(data).toBe(null);
    expect(error.message).toContain('ECONNREFUSED');
  });

  it('sends empty object body when params omitted', async () => {
    mockFetch({ body: '{}' });
    const client = freshDb().createClient('http://api.test', 'k');
    await client.rpc('fn_no_params');
    expect(JSON.parse(global.fetch._lastOpts.body)).toEqual({});
  });
});

describe('QueryBuilder URL building', () => {
  it('_buildUrl() includes base URL and table name', () => {
    const url = qbFor('leads', 'http://api.test', 'k')._buildUrl();
    expect(url.startsWith('http://api.test/leads')).toBe(true);
  });

  it('select() sets ?select= param', () => {
    const url = decodeURIComponent(qbFor('t').select('id,name')._buildUrl());
    expect(url).toMatch(/select=id,name/);
  });

  it('select() with no args defaults to *', () => {
    const url = qbFor('t').select()._buildUrl();
    expect(url).toContain('select=*');
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

  it('order(col, ascending:true) → ?order=col.asc', () => {
    expect(qbFor('t').order('created_at', { ascending: true })._buildUrl()).toContain('order=created_at.asc');
  });

  it('order(col, ascending:false) → ?order=col.desc', () => {
    expect(qbFor('t').order('created_at', { ascending: false })._buildUrl()).toContain('order=created_at.desc');
  });

  it('order() defaults to ascending', () => {
    expect(qbFor('t').order('name')._buildUrl()).toContain('order=name.asc');
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

  it('no select() call omits select param', () => {
    const url = qbFor('t').eq('id', 1)._buildUrl();
    expect(url).not.toContain('select=');
  });

  it('multiple order() calls include all columns', () => {
    const url = decodeURIComponent(qbFor('t').order('name').order('created_at', { ascending: false })._buildUrl());
    expect(url).toContain('name.asc');
    expect(url).toContain('created_at.desc');
  });
});

describe('QueryBuilder header building', () => {
  it('GET includes Content-Type and Accept', () => {
    const headers = qbFor('t')._buildHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  });

  it('GET includes apikey and Authorization when key set', () => {
    const headers = qbFor('t', 'http://x', 'my-api-key')._buildHeaders();
    expect(headers.apikey).toBe('my-api-key');
    expect(headers.Authorization).toBe('Bearer my-api-key');
  });

  it('GET omits apikey when key is empty', () => {
    const headers = qbFor('t', 'http://x', '')._buildHeaders();
    expect(headers.apikey).toBeFalsy();
    expect(headers.Authorization).toBeFalsy();
  });

  it('POST insert without select — no Prefer header', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' });
    expect(qb._buildHeaders()['Prefer']).toBeFalsy();
  });

  it('POST insert with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' }).select('*');
    const prefer = qb._buildHeaders()['Prefer'];
    expect(prefer).toContain('return=representation');
    expect(prefer).not.toContain('merge-duplicates');
  });

  it('PATCH update with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.update({ name: 'new' }).select('id');
    expect(qb._buildHeaders()['Prefer']).toContain('return=representation');
  });

  it('upsert with select → Prefer includes merge-duplicates and return=representation', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1, name: 'x' }).select('*');
    const prefer = qb._buildHeaders()['Prefer'];
    expect(prefer).toContain('resolution=merge-duplicates');
    expect(prefer).toContain('return=representation');
  });

  it('upsert without select → Prefer: resolution=merge-duplicates only', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1 });
    const prefer = qb._buildHeaders()['Prefer'];
    expect(prefer).toContain('resolution=merge-duplicates');
    expect(prefer).not.toContain('return=representation');
  });

  it('count mode appends count=exact to Prefer', () => {
    const qb = qbFor('t');
    qb.select('*', { count: 'exact' });
    expect(qb._buildHeaders()['Prefer']).toContain('count=exact');
  });
});

describe('QueryBuilder builder method chains', () => {
  it('select() returns this', () => { const qb = qbFor('t'); expect(qb.select('*')).toBe(qb); });
  it('eq() returns this', () => { const qb = qbFor('t'); expect(qb.eq('id', 1)).toBe(qb); });
  it('order() returns this', () => { const qb = qbFor('t'); expect(qb.order('id')).toBe(qb); });
  it('limit() returns this', () => { const qb = qbFor('t'); expect(qb.limit(10)).toBe(qb); });
  it('single() returns this', () => { const qb = qbFor('t'); expect(qb.single()).toBe(qb); });
  it('maybeSingle() returns this', () => { const qb = qbFor('t'); expect(qb.maybeSingle()).toBe(qb); });

  it('insert() sets method to POST and stores body', () => {
    const qb = qbFor('t').insert({ x: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(qb._bodyData).toEqual({ x: 1 });
  });

  it('update() sets method to PATCH and stores body', () => {
    const qb = qbFor('t').update({ x: 2 });
    expect(qb._httpMethod).toBe('PATCH');
    expect(qb._bodyData).toEqual({ x: 2 });
  });

  it('delete() sets method to DELETE', () => {
    expect(qbFor('t').delete()._httpMethod).toBe('DELETE');
  });

  it('upsert() sets POST, wraps object in array, marks isUpsert', () => {
    const qb = qbFor('t').upsert({ id: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(Array.isArray(qb._bodyData)).toBe(true);
    expect(qb._bodyData[0].id).toBe(1);
    expect(qb._isUpsert).toBe(true);
  });

  it('upsert() accepts array without wrapping', () => {
    const qb = qbFor('t').upsert([{ id: 1 }, { id: 2 }]);
    expect(qb._bodyData.length).toBe(2);
  });

  it('upsert() stores onConflict column', () => {
    expect(qbFor('t').upsert({ id: 1 }, { onConflict: 'id' })._upsertConflictColumn).toBe('id');
  });
});

describe('QueryBuilder._execute() HTTP behavior', () => {
  it('successful GET returns { data, error: null, count: null }', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1, name: 'Alice' }]) });
    const result = await qbFor('leads').select('*');
    expect(result.error).toBe(null);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0].id).toBe(1);
    expect(result.count).toBe(null);
  });

  it('HTTP 403 returns { data: null, error with code and status }', async () => {
    mockFetch({ ok: false, status: 403, body: JSON.stringify({ message: 'Forbidden', code: '42501' }) });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBe(null);
    expect(result.error.message).toContain('Forbidden');
    expect(result.error.code).toBe('42501');
    expect(result.error.status).toBe(403);
  });

  it('HTTP error with non-JSON body returns raw text in error message', async () => {
    mockFetch({ ok: false, status: 500, body: 'Internal Server Error' });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBe(null);
    expect(result.error.message).toContain('Internal Server Error');
  });

  it('network error returns { data: null, error, count: null }', async () => {
    global.fetch = jest.fn(async () => { throw new Error('Network unreachable'); });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBe(null);
    expect(result.error.message).toContain('Network unreachable');
    expect(result.count).toBe(null);
  });

  it('single() with multi-row response returns first element', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1 }, { id: 2 }]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.error).toBe(null);
    expect(result.data.id).toBe(1);
  });

  it('single() with empty response returns PGRST116 error', async () => {
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.data).toBe(null);
    expect(result.error.code).toBe('PGRST116');
  });

  it('maybeSingle() with rows returns first element, no error', async () => {
    mockFetch({ body: JSON.stringify([{ id: 5 }]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data.id).toBe(5);
    expect(result.error).toBe(null);
  });

  it('maybeSingle() with empty response returns null data, no error', async () => {
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data).toBe(null);
    expect(result.error).toBe(null);
  });

  it('DELETE without select returns data: null, error: null', async () => {
    mockFetch({ body: '' });
    const result = await qbFor('leads').delete().eq('id', 1);
    expect(result.data).toBe(null);
    expect(result.error).toBe(null);
  });

  it('DELETE with select returns response body as data', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1 }]) });
    const result = await qbFor('leads').delete().select('id').eq('id', 1);
    expect(result.error).toBe(null);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it('GET with empty response body returns data: null', async () => {
    mockFetch({ body: '' });
    const result = await qbFor('leads').select('*').eq('id', 999);
    expect(result.data).toBe(null);
    expect(result.error).toBe(null);
  });

  it('count mode reads total from content-range header', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (n) => n === 'content-range' ? '0-9/42' : null },
      text: async () => JSON.stringify([]),
    }));
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBe(42);
  });

  it('count stays null when content-range total is wildcard', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true, status: 200,
      headers: { get: (n) => n === 'content-range' ? '0-9/*' : null },
      text: async () => JSON.stringify([]),
    }));
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBe(null);
  });

  it('then() caches the promise so fetch is called only once', async () => {
    let callCount = 0;
    global.fetch = jest.fn(async () => {
      callCount++;
      return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify([{ id: 1 }]) };
    });
    const qb = qbFor('leads').select('*');
    await qb;
    await qb;
    expect(callCount).toBe(1);
  });

  it('non-Error thrown from fetch is stringified in error message', async () => {
    global.fetch = jest.fn(async () => { throw 'connection reset'; });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBe(null);
    expect(result.error.message).toContain('connection reset');
  });
});

describe('getPool()', () => {
  it('throws when LOCAL_PG_URL is not set', () => {
    const savedUrl = process.env.LOCAL_PG_URL;
    delete process.env.LOCAL_PG_URL;
    jest.isolateModules(() => {
      const db = require('../../lib/db');
      expect(() => db.getPool()).toThrow('LOCAL_PG_URL');
    });
    if (savedUrl !== undefined) process.env.LOCAL_PG_URL = savedUrl;
  });

  it('creates a Pool with the LOCAL_PG_URL connection string', () => {
    const createdConfigs = [];
    function MockPool(config) { createdConfigs.push(config); }

    process.env.LOCAL_PG_URL = 'postgresql://user:pass@localhost/testdb';
    jest.isolateModules(() => {
      jest.doMock('pg', () => ({ Pool: MockPool }));
      const db = require('../../lib/db');
      const pool = db.getPool();
      expect(pool instanceof MockPool).toBe(true);
      expect(createdConfigs[0].connectionString).toBe('postgresql://user:pass@localhost/testdb');
      expect(createdConfigs[0].max).toBe(10);
    });
    delete process.env.LOCAL_PG_URL;
  });

  it('returns the same Pool instance on repeated calls (singleton)', () => {
    let callCount = 0;
    function MockPool() { callCount++; }

    process.env.LOCAL_PG_URL = 'postgresql://localhost/test';
    jest.isolateModules(() => {
      jest.doMock('pg', () => ({ Pool: MockPool }));
      const db = require('../../lib/db');
      const pool1 = db.getPool();
      const pool2 = db.getPool();
      expect(pool1).toBe(pool2);
      expect(callCount).toBe(1);
    });
    delete process.env.LOCAL_PG_URL;
  });
});
