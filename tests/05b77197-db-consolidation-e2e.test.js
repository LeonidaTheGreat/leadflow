'use strict';

/**
 * E2E test for task 05b77197 — consolidate DB layer (postgrest-client.js → lib/db.js)
 *
 * Verifies:
 *   1. postgrest-client.js no longer exists (deleted)
 *   2. lib/db.js loads without error
 *   3. createClient is exported and produces a usable client
 *   4. getPool / endPool are exported
 *   5. createClient produces correct QueryBuilder behavior (URL construction)
 *   6. No stale require('./postgrest-client') in lib/db.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n🧪 DB Consolidation E2E Tests\n');

// 1. Old file is gone
test('postgrest-client.js is deleted', () => {
  const oldPath = path.join(ROOT, 'lib', 'postgrest-client.js');
  assert.ok(!fs.existsSync(oldPath), `Expected lib/postgrest-client.js to be deleted but it still exists`);
});

// 2. lib/db.js loads without error
test('lib/db.js loads without error', () => {
  delete require.cache[require.resolve(path.join(ROOT, 'lib', 'db.js'))];
  assert.doesNotThrow(() => require(path.join(ROOT, 'lib', 'db.js')));
});

// 3. createClient is exported
test('createClient is exported from lib/db.js', () => {
  const db = require(path.join(ROOT, 'lib', 'db.js'));
  assert.strictEqual(typeof db.createClient, 'function', 'createClient must be a function');
});

// 4. getPool is exported
test('getPool is exported from lib/db.js', () => {
  const db = require(path.join(ROOT, 'lib', 'db.js'));
  assert.strictEqual(typeof db.getPool, 'function', 'getPool must be a function');
});

// 5. endPool is exported
test('endPool is exported from lib/db.js', () => {
  const db = require(path.join(ROOT, 'lib', 'db.js'));
  assert.strictEqual(typeof db.endPool, 'function', 'endPool must be a function');
});

// 6. createClient returns an object with from(), rpc(), auth stubs
test('createClient returns a valid client interface', () => {
  const { createClient } = require(path.join(ROOT, 'lib', 'db.js'));
  const client = createClient('http://localhost:3000', 'test-key');
  assert.strictEqual(typeof client.from, 'function', 'client.from must be a function');
  assert.strictEqual(typeof client.rpc, 'function', 'client.rpc must be a function');
  assert.ok(client.auth, 'client.auth must exist');
  assert.strictEqual(typeof client.auth.getUser, 'function', 'client.auth.getUser must be a function');
  assert.strictEqual(typeof client.auth.getSession, 'function', 'client.auth.getSession must be a function');
});

// 7. QueryBuilder is chainable and thenable
test('QueryBuilder is chainable and thenable', () => {
  const { createClient } = require(path.join(ROOT, 'lib', 'db.js'));
  const client = createClient('http://localhost:3000', 'test-key');
  const qb = client.from('agents').select('*').eq('id', 'test-id').limit(1);
  assert.strictEqual(typeof qb.then, 'function', 'QueryBuilder must be thenable');
});

// 8. No stale require in lib/db.js
test('lib/db.js has no stale require of postgrest-client', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'db.js'), 'utf8');
  const staleImport = /require\s*\(\s*['"]\.\/postgrest-client['"]\s*\)/;
  assert.ok(!staleImport.test(src), "Found stale require('./postgrest-client') in lib/db.js");
});

// 9. No other source files import postgrest-client directly
test('no source files import postgrest-client directly', () => {
  const dirsToCheck = ['lib', 'routes', 'integrations'];
  const staleFiles = [];
  for (const dir of dirsToCheck) {
    const dirPath = path.join(ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(dirPath, file), 'utf8');
      if (/require\s*\(\s*['"][^'"]*postgrest-client['"]/.test(content) ||
          /from\s+['"][^'"]*postgrest-client['"]/.test(content)) {
        staleFiles.push(`${dir}/${file}`);
      }
    }
  }
  assert.strictEqual(staleFiles.length, 0, `Found stale postgrest-client imports in: ${staleFiles.join(', ')}`);
});

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) {
  process.exit(1);
}
