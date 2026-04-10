'use strict';

/**
 * QC E2E Test — DB Refactor Phase 4A (task b11455bc)
 *
 * Verifies that lib/db.js is the sole DB entry point:
 *   1. lib/db.js exports createClient and getPool
 *   2. Deleted files (db-client, db-pool, pg-pool, postgrest-client) are gone
 *   3. createClient() builds a working QueryBuilder
 *   4. getPool() connects and executes a real SQL query
 *   5. No stale imports in production code (lib/, routes/, server.js)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LIB = path.join(ROOT, 'lib');

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
    failures.push(label);
  }
}

async function runTests() {
  console.log('\n=== QC E2E: DB Refactor Phase 4A ===\n');

  // 1. Old files must not exist
  console.log('1. Deleted files check');
  const deletedFiles = [
    'lib/postgrest-client.js',
    'lib/db-client.js',
    'lib/pg-pool.js',
    'lib/db-pool.js',
  ];
  for (const f of deletedFiles) {
    assert(!fs.existsSync(path.join(ROOT, f)), `${f} is deleted`);
  }

  // 2. lib/db.js must exist
  console.log('\n2. New module existence');
  assert(fs.existsSync(path.join(LIB, 'db.js')), 'lib/db.js exists');

  // 3. lib/db.js exports the right API
  console.log('\n3. Module exports');
  let dbModule;
  try {
    dbModule = require(path.join(LIB, 'db'));
    assert(typeof dbModule.createClient === 'function', 'exports createClient function');
    assert(typeof dbModule.getPool === 'function', 'exports getPool function');
  } catch (e) {
    assert(false, `lib/db.js loads without error: ${e.message}`);
    console.error('Cannot continue — lib/db.js failed to load');
    report();
    return;
  }

  // 4. createClient returns the right interface
  console.log('\n4. createClient() interface');
  const client = dbModule.createClient('http://localhost:9999', 'test-key');
  assert(typeof client.from === 'function', 'client.from() is a function');
  assert(typeof client.rpc === 'function', 'client.rpc() is a function');
  assert(typeof client.auth === 'object', 'client.auth is an object');
  const qb = client.from('agents');
  assert(typeof qb.select === 'function', 'QueryBuilder.select() exists');
  assert(typeof qb.eq === 'function', 'QueryBuilder.eq() exists');
  assert(typeof qb.insert === 'function', 'QueryBuilder.insert() exists');
  assert(typeof qb.update === 'function', 'QueryBuilder.update() exists');
  assert(typeof qb.upsert === 'function', 'QueryBuilder.upsert() exists');
  assert(typeof qb.delete === 'function', 'QueryBuilder.delete() exists');
  assert(typeof qb.then === 'function', 'QueryBuilder is thenable (awaitable)');

  // 5. getPool() connects and runs a real query
  console.log('\n5. getPool() real DB query');
  let pool;
  try {
    pool = dbModule.getPool();
    assert(pool !== null && typeof pool.query === 'function', 'getPool() returns a pg Pool');
    const result = await pool.query('SELECT 1 AS alive');
    assert(result.rows[0].alive === 1, 'pool.query() returns correct result');
    // Run a real schema query to prove connectivity
    const tables = await pool.query(
      "SELECT COUNT(*) AS cnt FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const cnt = parseInt(tables.rows[0].cnt, 10);
    assert(cnt >= 0, `information_schema.tables queryable (count=${cnt})`);
  } catch (e) {
    assert(false, `getPool() DB query failed: ${e.message}`);
  } finally {
    if (pool) {
      try { await pool.end(); } catch (_) {}
    }
  }

  // 6. No stale imports in production code
  console.log('\n6. No stale imports in production code');
  const stalePatterns = ['db-client', 'pg-pool', 'db-pool', 'postgrest-client'];
  const scanDirs = ['lib', 'routes', 'server.js'];
  const staleFiles = [];

  function scanForStale(filePath) {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(filePath)) {
        if (entry === 'node_modules') continue;
        scanForStale(path.join(filePath, entry));
      }
    } else if (filePath.endsWith('.js') && !filePath.endsWith('.test.js')) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pat of stalePatterns) {
        // Only match actual require() calls, not comments or documentation
        const requirePattern = new RegExp(`require\\(['"](.*${pat}.*)['"]\\)`);
        if (requirePattern.test(content)) {
          staleFiles.push(`${path.relative(ROOT, filePath)}: stale '${pat}'`);
        }
      }
    }
  }

  for (const dir of scanDirs) {
    scanForStale(path.join(ROOT, dir));
  }

  assert(staleFiles.length === 0,
    staleFiles.length === 0
      ? 'No stale DB module imports in production code'
      : `Stale imports found: ${staleFiles.join(', ')}`
  );

  report();
}

function report() {
  const total = passed + failed;
  console.log(`\n=== RESULTS: ${passed}/${total} passed ===`);
  if (failures.length > 0) {
    console.error('\nFailed assertions:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('All checks passed.');
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Unexpected error:', e);
  process.exit(1);
});
