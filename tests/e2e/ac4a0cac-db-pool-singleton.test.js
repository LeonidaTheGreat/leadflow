/**
 * E2E Test: ac4a0cac — DB pool singleton enforcement
 * Verifies:
 * 1. lib/pg-pool.js exports getPool()
 * 2. Multiple requires return the SAME instance (singleton)
 * 3. getPool() connects and executes a basic query
 * 4. LOCAL_PG_URL environment variable is required
 */
'use strict';

require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });

const assert = require('assert');
const path = require('path');

const PROJECT_DIR = '/Users/clawdbot/projects/leadflow';
const poolModulePath = path.join(PROJECT_DIR, 'lib', 'pg-pool.js');

let passed = 0;
let failed = 0;

function pass(name) {
  console.log(`PASS: ${name}`);
  passed++;
}

function fail(name, reason) {
  console.error(`FAIL: ${name} — ${reason}`);
  failed++;
}

async function run() {
  // Test 1: module exports getPool
  try {
    const mod = require(poolModulePath);
    assert.ok(typeof mod.getPool === 'function', 'getPool is not a function');
    pass('lib/pg-pool.js exports getPool()');
  } catch (e) {
    fail('lib/pg-pool.js exports getPool()', e.message);
    // Fatal — remaining tests won't work
    console.log(`\nResult: ${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }

  // Test 2: singleton — two requires return the same pool instance
  try {
    // Clear require cache to simulate two independent modules requiring it
    delete require.cache[require.resolve(poolModulePath)];
    const mod1 = require(poolModulePath);
    const pool1 = mod1.getPool();

    // Re-require without clearing cache — should return same module/pool
    const mod2 = require(poolModulePath);
    const pool2 = mod2.getPool();

    assert.strictEqual(pool1, pool2, 'getPool() returned two different pool instances');
    pass('Multiple requires of lib/pg-pool.js return the same pool instance (singleton)');
  } catch (e) {
    fail('singleton check', e.message);
  }

  // Test 3: LOCAL_PG_URL must be set and pool must connect
  try {
    const { getPool } = require(poolModulePath);
    assert.ok(process.env.LOCAL_PG_URL, 'LOCAL_PG_URL env var is not set');

    const pool = getPool();
    const result = await pool.query('SELECT 1 AS ok');
    assert.strictEqual(result.rows[0].ok, 1, 'Basic query did not return expected value');
    pass('Shared pool connects to database and executes a query');
  } catch (e) {
    fail('database query through shared pool', e.message);
  }

  // Test 4: No other JS files in routes/ or lib/ (excluding lib/services/ and lib/pg-pool.js) create their own Pool
  try {
    const fs = require('fs');
    const violations = [];

    function scanDir(dir, label) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath, label);
        } else if (entry.name.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Skip the shared pool module itself
          if (fullPath === poolModulePath) continue;
          if (/new Pool\s*\(|const\s*\{\s*Pool\s*\}\s*=\s*require\s*\(/.test(content)) {
            violations.push(`${label}/${entry.name}`);
          }
        }
      }
    }

    scanDir(path.join(PROJECT_DIR, 'routes'), 'routes');
    // Check lib/ but not lib/services/ (services may have their own abstractions)
    const libEntries = fs.readdirSync(path.join(PROJECT_DIR, 'lib'), { withFileTypes: true });
    for (const entry of libEntries) {
      if (entry.isDirectory() && entry.name !== 'services') {
        scanDir(path.join(PROJECT_DIR, 'lib', entry.name), `lib/${entry.name}`);
      } else if (!entry.isDirectory() && entry.name.endsWith('.js')) {
        const fullPath = path.join(PROJECT_DIR, 'lib', entry.name);
        if (fullPath === poolModulePath) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/new Pool\s*\(|const\s*\{\s*Pool\s*\}\s*=\s*require\s*\(/.test(content)) {
          violations.push(`lib/${entry.name}`);
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(`Files with own pg Pool (should use lib/pg-pool.js): ${violations.join(', ')}`);
    }
    pass('No routes/ or lib/ files create their own pg Pool instance');
  } catch (e) {
    fail('no stray Pool instances in routes/ and lib/', e.message);
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error('Unhandled error:', e.message);
  process.exit(1);
});
