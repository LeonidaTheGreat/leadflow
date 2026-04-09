/**
 * E2E Test: Single DB Pool Enforcement — PR #1067
 * Task: ac4a0cac-bbc0-4913-bab6-8461cea50acd
 */

'use strict';

require('dotenv').config();

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function pass(name) { console.log(`✅ PASS: ${name}`); passed++; }
function fail(name, reason) { console.error(`❌ FAIL: ${name} — ${reason}`); failed++; }

async function runTests() {
  console.log('\n🧪 E2E: Single DB Pool Enforcement (PR #1067)\n');

  // Test 1: lib/pg-pool.js exists and exports getPool
  try {
    const pgPool = require('../../lib/pg-pool');
    assert.strictEqual(typeof pgPool.getPool, 'function', 'getPool must be a function');
    pass('lib/pg-pool.js exports getPool()');
  } catch (err) {
    fail('lib/pg-pool.js exports getPool()', err.message);
    return summarize();
  }

  // Test 2: getPool() returns a Pool instance
  try {
    const { getPool } = require('../../lib/pg-pool');
    const pool = getPool();
    assert(pool, 'getPool() must return a pool instance');
    assert.strictEqual(typeof pool.query, 'function', 'Pool must have .query method');
    pass('getPool() returns Pool instance with .query method');
  } catch (err) {
    fail('getPool() returns Pool instance', err.message);
  }

  // Test 3: Real DB query through the pool
  try {
    const { getPool } = require('../../lib/pg-pool');
    const pool = getPool();
    const result = await pool.query('SELECT 1 AS ok');
    assert.strictEqual(result.rows[0].ok, 1, 'DB query must return expected result');
    pass('Real DB query through shared pool succeeds');
  } catch (err) {
    fail('Real DB query through shared pool', err.message);
  }

  // Test 4: Singleton — two imports return the same instance
  try {
    const pgPool1 = require('../../lib/pg-pool');
    const pgPool2 = require('../../lib/pg-pool');
    const pool1 = pgPool1.getPool();
    const pool2 = pgPool2.getPool();
    assert.strictEqual(pool1, pool2, 'Multiple getPool() calls must return the same instance');
    pass('getPool() is a singleton — same instance returned on repeated calls');
  } catch (err) {
    fail('getPool() singleton check', err.message);
  }

  // Test 5: No raw new Pool() in lib/ or routes/ outside lib/pg-pool.js
  try {
    const projectRoot = path.resolve(__dirname, '../..');
    const dirsToScan = [
      path.join(projectRoot, 'lib'),
      path.join(projectRoot, 'routes'),
    ];
    const violations = [];

    function scanDir(dir) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
          if (fullPath === path.join(projectRoot, 'lib', 'pg-pool.js')) continue;
          const content = fs.readFileSync(fullPath, 'utf8');
          if (/new Pool\s*\(/.test(content)) {
            violations.push(path.relative(projectRoot, fullPath));
          }
        }
      }
    }

    for (const dir of dirsToScan) scanDir(dir);

    if (violations.length > 0) {
      fail('No raw new Pool() outside lib/pg-pool.js', `Violations: ${violations.join(', ')}`);
    } else {
      pass('No raw new Pool() in lib/ or routes/ (excluding lib/pg-pool.js)');
    }
  } catch (err) {
    fail('Scan for raw Pool instantiations', err.message);
  }

  // Test 6: Refactored files use shared pg-pool
  try {
    const stuckPilots = fs.readFileSync(
      path.join(__dirname, '../../lib/stuck-pilots-service.js'), 'utf8'
    );
    assert(
      /require\(['"]\.\/pg-pool['"]\)/.test(stuckPilots),
      'stuck-pilots-service.js must import from ./pg-pool'
    );
    assert(!/new Pool\s*\(/.test(stuckPilots), 'must not have raw new Pool()');
    pass('lib/stuck-pilots-service.js uses shared pg-pool');
  } catch (err) {
    fail('lib/stuck-pilots-service.js uses shared pg-pool', err.message);
  }

  // Test 7: funnel-diagnostics uses shared pg-pool
  try {
    const funnelDiag = fs.readFileSync(
      path.join(__dirname, '../../routes/admin/funnel-diagnostics.js'), 'utf8'
    );
    assert(
      /require\(['"].*lib\/pg-pool['"]\)/.test(funnelDiag),
      'funnel-diagnostics.js must import from lib/pg-pool'
    );
    assert(!/new Pool\s*\(/.test(funnelDiag), 'must not have raw new Pool()');
    pass('routes/admin/funnel-diagnostics.js uses shared pg-pool');
  } catch (err) {
    fail('routes/admin/funnel-diagnostics.js uses shared pg-pool', err.message);
  }

  summarize();
}

function summarize() {
  const total = passed + failed;
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed}/${total} passed`);
  if (failed > 0) { console.log('FAIL'); process.exit(1); }
  else console.log('PASS');
}

runTests().catch((err) => { console.error('Unhandled error:', err); process.exit(1); });
