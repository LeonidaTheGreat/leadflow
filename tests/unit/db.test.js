'use strict';

/**
 * Unit tests for lib/db.js — Jest format
 *
 * Spec:
 *   What:   lib/db.js — createClient(), getPool(), and the internal QueryBuilder class
 *           Tests cover URL construction, header building, HTTP response handling,
 *           the rpc() method, auth stubs, and the pg Pool singleton.
 *   Verify: npx jest tests/unit/db.test.js → all tests pass, exit 0
 *   Boundaries: Only tests lib/db.js public API. Does not touch routes, services,
 *               or any other file. Does not make real HTTP calls or DB connections.
 */

jest.mock('pg', () => ({ Pool: jest.fn() }));

const path = require('path');

const DB_PATH = path.resolve(__dirname, '../../lib/db');

// ─── Mock helpers ─────────────────────────────────────────────────────────────

function mockFetch(overrides = {}) {
  const cfg = {
    ok: true,
    status: 200,
    body: JSON.stringify([{ id: 1 }]),
    headers: {},
    ...overrides,
  };

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

function qbFor(table, url = 'http://api.test', key = 'sk') {
  return require(DB_PATH).createClient(url, key).from(table);
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

let savedFetch;

beforeEach(() => {
  savedFetch = global.fetch;
});

afterEach(() => {
  global.fetch = savedFetch;
  jest.resetModules();
});

// ─── createClient() ───────────────────────────────────────────────────────────

describe('createClient()', () => {
  test('returns object with from, rpc, auth', () => {
    const client = require(DB_PATH).createClient('http://api.test', 'key');
    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
    expect(client.auth).toBeTruthy();
    expect(typeof client.auth.getUser).toBe('function');
    expect(typeof client.auth.getSession).toBe('function');
  });

  test('from(table) returns thenable QueryBuilder', () => {
    const qb = qbFor('leads');
    expect(typeof qb.then).toBe('function');
    expect(typeof qb.select).toBe('function');
    expect(typeof qb.eq).toBe('function');
  });

  test('uses NEXT_PUBLIC_API_URL env var when url omitted', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://envtest.test';
    jest.resetModules();
    const { createClient } = require(DB_PATH);
    const url = createClient(undefined, 'k').from('t')._buildUrl();
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(url.startsWith('http://envtest.test/')).toBe(true);
  });

  test('uses API_SECRET_KEY env var when key omitted', () => {
    process.env.API_SECRET_KEY = 'env-secret';
    jest.resetModules();
    const { createClient } = require(DB_PATH);
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.API_SECRET_KEY;
    expect(headers.apikey).toBe('env-secret');
  });

  test('uses LEADFLOW_API_KEY when API_SECRET_KEY absent', () => {
    delete process.env.API_SECRET_KEY;
    process.env.LEADFLOW_API_KEY = 'lf-key';
    jest.resetModules();
    const { createClient } = require(DB_PATH);
    const headers = createClient('http://x', undefined).from('t')._buildHeaders();
    delete process.env.LEADFLOW_API_KEY;
    expect(headers.apikey).toBe('lf-key');
  });

  test('auth.getUser() returns stub', async () => {
    const client = require(DB_PATH).createClient('http://api.test', 'key');
    const result = await client.auth.getUser();
    expect(result).toEqual({ data: { user: null }, error: null });
  });

  test('auth.getSession() returns stub', async () => {
    const client = require(DB_PATH).createClient('http://api.test', 'key');
    const result = await client.auth.getSession();
    expect(result).toEqual({ data: { session: null }, error: null });
  });
});

// ─── createClient().rpc() ─────────────────────────────────────────────────────

describe('createClient().rpc()', () => {
  test('posts to /rpc/<name> with params', async () => {
    mockFetch({ body: JSON.stringify({ result: 42 }) });
    const client = require(DB_PATH).createClient('http://api.test', 'mykey');
    const { data, error } = await client.rpc('my_func', { x: 1 });
    expect(data.result).toBe(42);
    expect(error).toBeNull();
    expect(global.fetch._lastUrl.endsWith('/rpc/my_func')).toBe(true);
    expect(global.fetch._lastOpts.method).toBe('POST');
    expect(JSON.parse(global.fetch._lastOpts.body).x).toBe(1);
  });

  test('sends apikey + Authorization headers', async () => {
    mockFetch({ body: '{}' });
    const client = require(DB_PATH).createClient('http://api.test', 'rpc-key');
    await client.rpc('func');
    const { headers } = global.fetch._lastOpts;
    expect(headers.apikey).toBe('rpc-key');
    expect(headers.Authorization).toBe('Bearer rpc-key');
  });

  test('returns error on HTTP failure', async () => {
    mockFetch({ ok: false, body: 'permission denied' });
    const client = require(DB_PATH).createClient('http://api.test', 'k');
    const { data, error } = await client.rpc('boom');
    expect(data).toBeNull();
    expect(error.message).toContain('permission denied');
  });

  test('returns error on network failure', async () => {
    global.fetch = async () => { throw new Error('ECONNREFUSED'); };
    const client = require(DB_PATH).createClient('http://api.test', 'k');
    const { data, error } = await client.rpc('fn');
    expect(data).toBeNull();
    expect(error.message).toContain('ECONNREFUSED');
  });
});

// ─── QueryBuilder URL building ────────────────────────────────────────────────

describe('QueryBuilder URL building', () => {
  test('_buildUrl() includes base URL and table name', () => {
    const url = qbFor('leads', 'http://api.test', 'k')._buildUrl();
    expect(url.startsWith('http://api.test/leads')).toBe(true);
  });

  test('select() sets ?select= param', () => {
    const url = decodeURIComponent(qbFor('t').select('id,name')._buildUrl());
    expect(url).toContain('select=id,name');
  });

  test('select(*) sets ?select=* param', () => {
    expect(qbFor('t').select()._buildUrl()).toContain('select=*');
  });

  test('eq() → ?col=eq.val', () => {
    expect(qbFor('t').eq('status', 'active')._buildUrl()).toContain('status=eq.active');
  });

  test('neq() → ?col=neq.val', () => {
    expect(qbFor('t').neq('status', 'deleted')._buildUrl()).toContain('status=neq.deleted');
  });

  test('gt() → ?col=gt.val', () => {
    expect(qbFor('t').gt('age', 18)._buildUrl()).toContain('age=gt.18');
  });

  test('gte() → ?col=gte.val', () => {
    expect(qbFor('t').gte('score', 100)._buildUrl()).toContain('score=gte.100');
  });

  test('lt() → ?col=lt.val', () => {
    expect(qbFor('t').lt('price', 50)._buildUrl()).toContain('price=lt.50');
  });

  test('lte() → ?col=lte.val', () => {
    expect(qbFor('t').lte('count', 10)._buildUrl()).toContain('count=lte.10');
  });

  test('in() → ?col=in.("a","b")', () => {
    const url = decodeURIComponent(qbFor('t').in('role', ['admin', 'user'])._buildUrl());
    expect(url).toContain('role=in.(');
    expect(url).toContain('"admin"');
    expect(url).toContain('"user"');
  });

  test('is(null) → ?col=is.null', () => {
    expect(qbFor('t').is('deleted_at', null)._buildUrl()).toContain('deleted_at=is.null');
  });

  test('is(value) → ?col=is.true', () => {
    expect(qbFor('t').is('active', true)._buildUrl()).toContain('active=is.true');
  });

  test('not(key, val) [2 args] → ?col=not.val', () => {
    expect(qbFor('t').not('status', 'deleted')._buildUrl()).toContain('status=not.deleted');
  });

  test('not(key, "is", null) → ?col=not.is.null', () => {
    expect(qbFor('t').not('deleted_at', 'is', null)._buildUrl()).toContain('deleted_at=not.is.null');
  });

  test('not(key, "eq", val) → ?col=not.eq.val', () => {
    expect(qbFor('t').not('role', 'eq', 'guest')._buildUrl()).toContain('role=not.eq.guest');
  });

  test('or() → ?or=(filterStr)', () => {
    const url = decodeURIComponent(qbFor('t').or('status.eq.active,role.eq.admin')._buildUrl());
    expect(url).toContain('or=');
    expect(url).toContain('status.eq.active');
  });

  test('order(col, ascending:true) → ?order=col.asc', () => {
    expect(qbFor('t').order('created_at', { ascending: true })._buildUrl()).toContain('order=created_at.asc');
  });

  test('order(col, ascending:false) → ?order=col.desc', () => {
    expect(qbFor('t').order('created_at', { ascending: false })._buildUrl()).toContain('order=created_at.desc');
  });

  test('order() default is ascending', () => {
    expect(qbFor('t').order('name')._buildUrl()).toContain('order=name.asc');
  });

  test('limit() → ?limit=N', () => {
    expect(qbFor('t').limit(25)._buildUrl()).toContain('limit=25');
  });

  test('range(0, 9) → ?offset=0&limit=10', () => {
    const url = qbFor('t').range(0, 9)._buildUrl();
    expect(url).toContain('offset=0');
    expect(url).toContain('limit=10');
  });

  test('multiple filters chain correctly', () => {
    const url = qbFor('t').eq('status', 'active').neq('role', 'guest').limit(5)._buildUrl();
    expect(url).toContain('status=eq.active');
    expect(url).toContain('role=neq.guest');
    expect(url).toContain('limit=5');
  });
});

// ─── QueryBuilder header building ─────────────────────────────────────────────

describe('QueryBuilder header building', () => {
  test('GET includes Content-Type and Accept', () => {
    const headers = qbFor('t')._buildHeaders();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  });

  test('GET includes apikey and Authorization when key set', () => {
    const headers = qbFor('t', 'http://x', 'my-api-key')._buildHeaders();
    expect(headers.apikey).toBe('my-api-key');
    expect(headers.Authorization).toBe('Bearer my-api-key');
  });

  test('GET does not include apikey when no key', () => {
    const headers = qbFor('t', 'http://x', '')._buildHeaders();
    expect(headers.apikey).toBeFalsy();
    expect(headers.Authorization).toBeFalsy();
  });

  test('POST (insert) without select — no Prefer header', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' });
    expect(qb._buildHeaders()['Prefer']).toBeFalsy();
  });

  test('POST (insert) with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.insert({ name: 'test' }).select('*');
    const prefer = qb._buildHeaders()['Prefer'];
    expect(prefer).toContain('return=representation');
    expect(prefer).not.toContain('merge-duplicates');
  });

  test('PATCH (update) with select → Prefer: return=representation', () => {
    const qb = qbFor('t');
    qb.update({ name: 'new' }).select('id');
    expect(qb._buildHeaders()['Prefer']).toContain('return=representation');
  });

  test('upsert with select → Prefer includes merge-duplicates and return=representation', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1, name: 'x' }).select('*');
    const prefer = qb._buildHeaders()['Prefer'];
    expect(prefer).toContain('resolution=merge-duplicates');
    expect(prefer).toContain('return=representation');
  });

  test('upsert without select → Prefer: resolution=merge-duplicates only', () => {
    const qb = qbFor('t');
    qb.upsert({ id: 1 });
    const prefer = qb._buildHeaders()['Prefer'];
    expect(prefer).toContain('resolution=merge-duplicates');
    expect(prefer).not.toContain('return=representation');
  });

  test('count mode appends count=exact to Prefer', () => {
    const qb = qbFor('t');
    qb.select('*', { count: 'exact' });
    expect(qb._buildHeaders()['Prefer']).toContain('count=exact');
  });
});

// ─── QueryBuilder builder method chains ───────────────────────────────────────

describe('QueryBuilder builder method chains', () => {
  test('select() returns this', () => {
    const qb = qbFor('t');
    expect(qb.select('*')).toBe(qb);
  });

  test('eq() returns this', () => {
    const qb = qbFor('t');
    expect(qb.eq('id', 1)).toBe(qb);
  });

  test('order() returns this', () => {
    const qb = qbFor('t');
    expect(qb.order('id')).toBe(qb);
  });

  test('limit() returns this', () => {
    const qb = qbFor('t');
    expect(qb.limit(10)).toBe(qb);
  });

  test('single() returns this', () => {
    const qb = qbFor('t');
    expect(qb.single()).toBe(qb);
  });

  test('maybeSingle() returns this', () => {
    const qb = qbFor('t');
    expect(qb.maybeSingle()).toBe(qb);
  });

  test('insert() sets method to POST', () => {
    const qb = qbFor('t').insert({ x: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(qb._bodyData).toEqual({ x: 1 });
  });

  test('update() sets method to PATCH', () => {
    const qb = qbFor('t').update({ x: 2 });
    expect(qb._httpMethod).toBe('PATCH');
    expect(qb._bodyData).toEqual({ x: 2 });
  });

  test('delete() sets method to DELETE', () => {
    expect(qbFor('t').delete()._httpMethod).toBe('DELETE');
  });

  test('upsert() sets method to POST and wraps object in array', () => {
    const qb = qbFor('t').upsert({ id: 1 });
    expect(qb._httpMethod).toBe('POST');
    expect(Array.isArray(qb._bodyData)).toBe(true);
    expect(qb._bodyData[0].id).toBe(1);
    expect(qb._isUpsert).toBe(true);
  });

  test('upsert() accepts array directly', () => {
    const qb = qbFor('t').upsert([{ id: 1 }, { id: 2 }]);
    expect(Array.isArray(qb._bodyData)).toBe(true);
    expect(qb._bodyData.length).toBe(2);
  });

  test('upsert() sets onConflict from opts', () => {
    expect(qbFor('t').upsert({ id: 1 }, { onConflict: 'id' })._upsertConflictColumn).toBe('id');
  });
});

// ─── QueryBuilder._execute() — HTTP behaviour ────────────────────────────────

describe('QueryBuilder._execute()', () => {
  test('successful GET returns { data, error: null, count: null }', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1, name: 'Alice' }]) });
    const result = await qbFor('leads').select('*');
    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data[0].id).toBe(1);
    expect(result.count).toBeNull();
  });

  test('HTTP error response returns { data: null, error }', async () => {
    mockFetch({ ok: false, status: 403, body: JSON.stringify({ message: 'Forbidden', code: '42501' }) });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('Forbidden');
    expect(result.error.code).toBe('42501');
    expect(result.error.status).toBe(403);
  });

  test('HTTP error with non-JSON body returns error with raw text', async () => {
    mockFetch({ ok: false, status: 500, body: 'Internal Server Error' });
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toContain('Internal Server Error');
  });

  test('network error returns { data: null, error }', async () => {
    global.fetch = async () => { throw new Error('Network unreachable'); };
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toContain('Network unreachable');
    expect(result.count).toBeNull();
  });

  test('single() with array response returns first element', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1 }, { id: 2 }]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.error).toBeNull();
    expect(result.data.id).toBe(1);
  });

  test('single() with empty array returns PGRST116 error', async () => {
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').single();
    expect(result.data).toBeNull();
    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe('PGRST116');
  });

  test('maybeSingle() with array returns first element', async () => {
    mockFetch({ body: JSON.stringify([{ id: 5 }]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data.id).toBe(5);
    expect(result.error).toBeNull();
  });

  test('maybeSingle() with empty array returns null data, no error', async () => {
    mockFetch({ body: JSON.stringify([]) });
    const result = await qbFor('leads').select('*').maybeSingle();
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  test('DELETE without select → data is null', async () => {
    mockFetch({ body: '' });
    const result = await qbFor('leads').delete().eq('id', 1);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  test('count mode reads count from content-range header', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: (n) => (n === 'content-range' ? '0-9/42' : null) },
      text: async () => JSON.stringify([]),
    });
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBe(42);
  });

  test('count stays null when content-range has wildcard total', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: (n) => (n === 'content-range' ? '0-9/*' : null) },
      text: async () => JSON.stringify([]),
    });
    const result = await qbFor('leads').select('*', { count: 'exact' });
    expect(result.count).toBeNull();
  });

  test('then() caches the promise (executes only once)', async () => {
    let callCount = 0;
    global.fetch = async () => {
      callCount++;
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify([{ id: 1 }]),
      };
    };
    const qb = qbFor('leads').select('*');
    await qb;
    await qb;
    expect(callCount).toBe(1);
  });
});

// ─── getPool() ────────────────────────────────────────────────────────────────

describe('getPool()', () => {
  // Unmock pg after each test so the factory doesn't leak into later tests.
  // Global afterEach resets the module registry; this clears the factory registration.
  afterEach(() => {
    jest.unmock('pg');
  });

  test('throws when LOCAL_PG_URL is not set', () => {
    const savedUrl = process.env.LOCAL_PG_URL;
    delete process.env.LOCAL_PG_URL;
    try {
      expect(() => require(DB_PATH).getPool()).toThrow('LOCAL_PG_URL');
    } finally {
      if (savedUrl !== undefined) process.env.LOCAL_PG_URL = savedUrl;
    }
  });

  test('creates a Pool with the connection string', () => {
    const createdConfigs = [];
    function MockPool(config) { createdConfigs.push(config); }

    // Register mock factory before requiring db.js so db.js picks it up.
    // Global afterEach has already called jest.resetModules(), so the module
    // registry is empty and this require will load a fresh copy of db.js.
    jest.doMock('pg', () => ({ Pool: MockPool }));
    process.env.LOCAL_PG_URL = 'postgresql://user:pass@localhost/testdb';

    let pool;
    try {
      pool = require(DB_PATH).getPool();
    } finally {
      delete process.env.LOCAL_PG_URL;
    }

    expect(pool instanceof MockPool).toBe(true);
    expect(createdConfigs[0].connectionString).toBe('postgresql://user:pass@localhost/testdb');
    expect(createdConfigs[0].max).toBe(10);
  });

  test('returns same pool on repeated calls (singleton)', () => {
    let callCount = 0;
    function MockPool() { callCount++; }

    jest.doMock('pg', () => ({ Pool: MockPool }));
    process.env.LOCAL_PG_URL = 'postgresql://localhost/test';

    let pool1, pool2;
    try {
      const db = require(DB_PATH);
      pool1 = db.getPool();
      pool2 = db.getPool();
    } finally {
      delete process.env.LOCAL_PG_URL;
    }

    expect(pool1).toBe(pool2);
    expect(callCount).toBe(1);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('no select() call → no select param in URL', () => {
    expect(qbFor('t').eq('id', 1)._buildUrl()).not.toContain('select=');
  });

  test('limit() then range() → range takes precedence', () => {
    const url = qbFor('t').limit(5).range(10, 19)._buildUrl();
    expect(url).toContain('offset=10');
    expect(url).toContain('limit=10');
  });

  test('multiple order() calls → all columns in URL', () => {
    const url = decodeURIComponent(
      qbFor('t').order('name').order('created_at', { ascending: false })._buildUrl()
    );
    expect(url).toContain('name.asc');
    expect(url).toContain('created_at.desc');
  });

  test('DELETE with select set → data returned from response body', async () => {
    mockFetch({ body: JSON.stringify([{ id: 1 }]) });
    const result = await qbFor('leads').delete().select('id').eq('id', 1);
    expect(result.error).toBeNull();
    expect(Array.isArray(result.data)).toBe(true);
  });

  test('GET with empty response body → data is null', async () => {
    mockFetch({ body: '' });
    const result = await qbFor('leads').select('*').eq('id', 999);
    expect(result.data).toBeNull();
    expect(result.error).toBeNull();
  });

  test('rpc() with no params sends empty object body', async () => {
    mockFetch({ body: '{}' });
    const client = require(DB_PATH).createClient('http://api.test', 'k');
    await client.rpc('fn_no_params');
    expect(JSON.parse(global.fetch._lastOpts.body)).toEqual({});
  });

  test('non-Error thrown from fetch → stringified in error message', async () => {
    global.fetch = async () => { throw 'connection reset'; };
    const result = await qbFor('leads').select('*');
    expect(result.data).toBeNull();
    expect(result.error.message).toContain('connection reset');
  });
});
