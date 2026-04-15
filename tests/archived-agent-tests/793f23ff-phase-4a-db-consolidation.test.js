/**
 * E2E test for Phase 4A: DB consolidation into lib/db.js
 * Verifies: old files gone, new module loads correctly, no stale imports in production code.
 * Run: node tests/793f23ff-phase-4a-db-consolidation.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n🧪 Phase 4A: DB consolidation tests\n');

// ── Old files are gone ────────────────────────────────────────────────────────
test('lib/postgrest-client.js is deleted', () => {
  assert(!fs.existsSync(path.join(root, 'lib/postgrest-client.js')), 'File still exists');
});

test('lib/db-client.js is deleted', () => {
  assert(!fs.existsSync(path.join(root, 'lib/db-client.js')), 'File still exists');
});

test('lib/pg-pool.js is deleted', () => {
  assert(!fs.existsSync(path.join(root, 'lib/pg-pool.js')), 'File still exists');
});

test('lib/db-pool.js is deleted', () => {
  assert(!fs.existsSync(path.join(root, 'lib/db-pool.js')), 'File still exists');
});

// ── New module loads and exports correct API ─────────────────────────────────
test('lib/db.js exists', () => {
  assert(fs.existsSync(path.join(root, 'lib/db.js')), 'lib/db.js not found');
});

const db = require(path.join(root, 'lib/db'));

test('lib/db.js exports createClient', () => {
  assert.strictEqual(typeof db.createClient, 'function');
});

test('lib/db.js exports getPool', () => {
  assert.strictEqual(typeof db.getPool, 'function');
});

test('createClient returns an object with from() and rpc() and auth', () => {
  const client = db.createClient('http://localhost:8787', 'testkey');
  assert.strictEqual(typeof client.from, 'function');
  assert.strictEqual(typeof client.rpc, 'function');
  assert.ok(client.auth, 'missing auth stub');
});

test('from() returns a QueryBuilder with chainable methods', () => {
  const client = db.createClient('http://localhost:8787', 'testkey');
  const qb = client.from('tasks');
  ['select', 'eq', 'neq', 'in', 'is', 'not', 'or', 'order', 'limit', 'range', 'single', 'maybeSingle',
    'insert', 'update', 'delete', 'upsert', 'then'].forEach(method => {
    assert.strictEqual(typeof qb[method], 'function', `QueryBuilder missing method: ${method}`);
  });
});

// ── Production code has no stale imports ─────────────────────────────────────
const productionDirs = ['lib', 'routes', 'server.js', 'integrations', 'agents', 'product'];
const stalePatterns = ['postgrest-client', 'db-client', 'pg-pool', 'db-pool'];

test('No stale DB imports in production code (lib/, routes/, integrations/, server.js)', () => {
  const staleRefs = [];

  function scanDir(dir) {
    if (!fs.existsSync(dir)) return;
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
      if (!dir.endsWith('.js')) return;
      const content = fs.readFileSync(dir, 'utf8');
      for (const pat of stalePatterns) {
        if (content.includes(pat)) {
          // exclude comments in db.js itself
          staleRefs.push(`${dir}: contains '${pat}'`);
        }
      }
      return;
    }
    for (const entry of fs.readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.git') continue;
      scanDir(path.join(dir, entry));
    }
  }

  for (const d of productionDirs) {
    scanDir(path.join(root, d));
  }

  // lib/db.js itself may mention old names in a comment — that's ok
  const filtered = staleRefs.filter(r => !r.startsWith(path.join(root, 'lib/db.js')));
  assert.strictEqual(filtered.length, 0, `Stale references found:\n  ${filtered.join('\n  ')}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
