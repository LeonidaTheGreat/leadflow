'use strict';

/**
 * E2E verification for PR #1405 / task 0b492286
 * Confirms lib/db.js public API contract without real DB connections.
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// ── lib/db.js loads ──────────────────────────────────────────────────────────

let db;
try {
  db = require('../lib/db');
  console.log('✅ lib/db.js loads without error');
  passed++;
} catch (err) {
  console.error(`❌ lib/db.js failed to load: ${err.message}`);
  failed++;
  process.exit(1);
}

// ── createClient() contract ──────────────────────────────────────────────────

test('createClient() returns { from, rpc, auth }', () => {
  const client = db.createClient('http://test.local', 'test-key');
  assert.strictEqual(typeof client.from, 'function', 'missing from()');
  assert.strictEqual(typeof client.rpc, 'function', 'missing rpc()');
  assert.ok(client.auth, 'missing auth');
  assert.strictEqual(typeof client.auth.getUser, 'function', 'missing auth.getUser()');
  assert.strictEqual(typeof client.auth.getSession, 'function', 'missing auth.getSession()');
});

test('createClient().from() returns a thenable QueryBuilder', () => {
  const qb = db.createClient('http://test.local', 'k').from('leads');
  assert.strictEqual(typeof qb.then, 'function', 'missing then()');
  assert.strictEqual(typeof qb.select, 'function', 'missing select()');
  assert.strictEqual(typeof qb.eq, 'function', 'missing eq()');
});

test('QueryBuilder builds correct URL with filters', () => {
  const qb = db.createClient('http://api.test', 'k').from('agents');
  const url = decodeURIComponent(qb.select('id,name').eq('status', 'active').limit(10)._buildUrl());
  assert.ok(url.includes('agents'), `URL missing table: ${url}`);
  assert.ok(url.includes('select=id,name'), `URL missing select: ${url}`);
  assert.ok(url.includes('status=eq.active'), `URL missing filter: ${url}`);
  assert.ok(url.includes('limit=10'), `URL missing limit: ${url}`);
});

// ── getPool() contract ────────────────────────────────────────────────────────

test('getPool() throws when LOCAL_PG_URL is absent', () => {
  const saved = process.env.LOCAL_PG_URL;
  delete process.env.LOCAL_PG_URL;
  // Use a fresh require to bypass singleton — clear from cache first
  const dbPath = require.resolve('../lib/db');
  delete require.cache[dbPath];
  const freshDb = require('../lib/db');
  try {
    assert.throws(
      () => freshDb.getPool(),
      /LOCAL_PG_URL/,
      'getPool() should throw mentioning LOCAL_PG_URL'
    );
  } finally {
    if (saved !== undefined) process.env.LOCAL_PG_URL = saved;
    delete require.cache[dbPath];
  }
});

// ── auth stubs ────────────────────────────────────────────────────────────────

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

(async () => {
  await asyncTest('auth.getUser() returns stub { data: { user: null } }', async () => {
    const client = db.createClient('http://test.local', 'k');
    const result = await client.auth.getUser();
    assert.deepStrictEqual(result, { data: { user: null }, error: null });
  });

  await asyncTest('auth.getSession() returns stub { data: { session: null } }', async () => {
    const client = db.createClient('http://test.local', 'k');
    const result = await client.auth.getSession();
    assert.deepStrictEqual(result, { data: { session: null }, error: null });
  });

  console.log(`\n${passed + failed} checks — ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
})();
