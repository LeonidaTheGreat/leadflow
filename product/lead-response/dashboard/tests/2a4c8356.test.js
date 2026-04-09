/**
 * QC E2E Test — Task 2a4c8356
 * Tests: DB layer consolidation (lib/db.js), service class extraction (SatisfactionService, AuthService),
 *        and architecture integrity of the deployment drift fix.
 * 
 * Run: node product/lead-response/dashboard/tests/2a4c8356.test.js
 */

'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

console.log('\n=== QC E2E Test: Task 2a4c8356 (Deployment Drift Fix) ===\n');

// ============================================
// 1. lib/db.js consolidation
// ============================================
console.log('1. DB layer consolidation');

test('lib/db.js exists and exports createClient, getPool, endPool', () => {
  const dbPath = path.join(__dirname, '../../../../lib/db.js');
  assert.ok(fs.existsSync(dbPath), 'lib/db.js must exist');
  const db = require(dbPath);
  assert.ok(typeof db.createClient === 'function', 'must export createClient');
  assert.ok(typeof db.getPool === 'function', 'must export getPool');
  assert.ok(typeof db.endPool === 'function', 'must export endPool');
});

test('lib/db-pool.js is removed (replaced by lib/db.js)', () => {
  const dbPoolPath = path.join(__dirname, '../../../../lib/db-pool.js');
  assert.ok(!fs.existsSync(dbPoolPath), 'lib/db-pool.js must be removed');
});

test('lib/pg-pool.js is removed (replaced by lib/db.js)', () => {
  const pgPoolPath = path.join(__dirname, '../../../../lib/pg-pool.js');
  assert.ok(!fs.existsSync(pgPoolPath), 'lib/pg-pool.js must be removed');
});

test('lib/db.js getPool requires LOCAL_PG_URL', () => {
  const dbPath = path.join(__dirname, '../../../../lib/db.js');
  const db = require(dbPath);
  const orig = process.env.LOCAL_PG_URL;
  delete process.env.LOCAL_PG_URL;
  // Reset module cache to force re-evaluation
  delete require.cache[require.resolve(dbPath)];
  const freshDb = require(dbPath);
  try {
    assert.throws(() => freshDb.getPool(), /LOCAL_PG_URL/, 'must throw if LOCAL_PG_URL not set');
  } finally {
    if (orig) process.env.LOCAL_PG_URL = orig;
    delete require.cache[require.resolve(dbPath)];
  }
});

// ============================================
// 2. SatisfactionService class extraction
// ============================================
console.log('\n2. SatisfactionService class extraction');

test('lib/services/SatisfactionService.js exists', () => {
  const svcPath = path.join(__dirname, '../../../../lib/services/SatisfactionService.js');
  assert.ok(fs.existsSync(svcPath), 'SatisfactionService.js must exist');
});

test('lib/satisfaction-service.js is a shim (short, not full implementation)', () => {
  const shimPath = path.join(__dirname, '../../../../lib/satisfaction-service.js');
  assert.ok(fs.existsSync(shimPath), 'shim must exist');
  const content = fs.readFileSync(shimPath, 'utf8');
  // Should be under 100 lines — it's a backward compat shim, not the full impl
  const lineCount = content.split('\n').length;
  assert.ok(lineCount < 100, `shim must be < 100 lines, got ${lineCount}`);
  // Must require the class
  assert.ok(content.includes('SatisfactionService'), 'shim must reference SatisfactionService');
});

// ============================================
// 3. AuthService security check — tokens must be hashed before DB storage
// ============================================
console.log('\n3. AuthService security');

test('AuthService stores hashed tokens, not raw tokens (CRITICAL SECURITY CHECK)', () => {
  const authSvcPath = path.join(__dirname, '../lib/services/AuthService.js');
  assert.ok(fs.existsSync(authSvcPath), 'AuthService.js must exist');
  const content = fs.readFileSync(authSvcPath, 'utf8');
  
  // The createSession method should use hashToken before inserting
  // Check that the token is hashed before insert
  const createSessionMatch = content.match(/createSession[\s\S]*?(?=async\s+\w|\}\s*$)/);
  
  // Look for hash usage in create session
  const hasHashBeforeInsert = content.includes('hashToken') && 
    content.indexOf('hashToken') < content.indexOf("from('sessions')\n") + 1000;
  
  assert.ok(hasHashBeforeInsert, 
    'SECURITY: createSession must hash the token before storing in DB. ' +
    'Raw token storage exposes all sessions if DB is compromised.');
});

test('AuthService getUserIdFromSession is not defined twice (duplicate method bug)', () => {
  const authSvcPath = path.join(__dirname, '../lib/services/AuthService.js');
  const content = fs.readFileSync(authSvcPath, 'utf8');
  const matches = (content.match(/getUserIdFromSession/g) || []).length;
  // Should appear at most twice (definition + usage) but not 3+ times (which would mean duplicate definition)
  const defCount = (content.match(/async getUserIdFromSession/g) || []).length;
  assert.strictEqual(defCount, 1, `getUserIdFromSession must be defined exactly once, found ${defCount} definitions`);
});

// ============================================
// 4. trial-signup route architecture check
// ============================================
console.log('\n4. trial-signup route architecture');

test('trial-signup route does NOT have direct DB inserts to leads table (must use LeadService)', () => {
  const routePath = path.join(__dirname, '../app/api/auth/trial-signup/route.ts');
  assert.ok(fs.existsSync(routePath), 'trial-signup route must exist');
  const content = fs.readFileSync(routePath, 'utf8');
  // Direct supabase.from('leads').insert in a route is an architecture violation
  const hasDirectLeadsInsert = content.includes("from('leads')") || content.includes('from("leads")');
  assert.ok(!hasDirectLeadsInsert, 
    'ARCHITECTURE: trial-signup route must not query leads table directly. Use LeadService from lib/services/.');
});

// ============================================
// 5. Dashboard build artifacts exist
// ============================================
console.log('\n5. Build artifacts');

test('lib/analytics-queries.ts exists (analytics moved out of route)', () => {
  const aqPath = path.join(__dirname, '../lib/analytics-queries.ts');
  assert.ok(fs.existsSync(aqPath), 'analytics-queries.ts must exist');
});

test('lib/config/auth.js defines session constants (no magic numbers in routes)', () => {
  const configPath = path.join(__dirname, '../lib/config/auth.js');
  assert.ok(fs.existsSync(configPath), 'auth config must exist');
  const content = fs.readFileSync(configPath, 'utf8');
  assert.ok(content.includes('SESSION_DURATION_MS'), 'must export SESSION_DURATION_MS');
  assert.ok(content.includes('REMEMBER_ME_DURATION_MS'), 'must export REMEMBER_ME_DURATION_MS');
  assert.ok(content.includes('SESSION_TOKEN_BYTES'), 'must export SESSION_TOKEN_BYTES');
});

// ============================================
// Summary
// ============================================
console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
