/**
 * E2E Test: fix-bcrypt-password-verify-fails-after-signup
 * QC verification: bcrypt password stored by onboarding/submit can be verified by login route
 *
 * Root cause: onboarding/submit used PBKDF2 (salt:hash format) while login uses bcrypt.compare
 * Fix: Replace PBKDF2 with bcrypt.hash(password, 10) in onboarding/submit route
 */

const assert = require('assert');
const bcrypt = require('/Users/clawdbot/projects/leadflow/product/lead-response/dashboard/node_modules/bcryptjs');
const crypto = require('crypto');

let passed = 0;
let failed = 0;

function test(name, fn) {
  return fn().then(() => {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  }).catch(err => {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  });
}

async function runAll() {
  console.log('\n=== QC E2E: bcrypt password verify fix ===\n');

  // --- AC-1: Verify the old PBKDF2 approach is broken ---
  console.log('AC-1: Old PBKDF2 format is incompatible with bcrypt.compare');

  await test('PBKDF2 hash fails bcrypt.compare (root cause reproduced)', async () => {
    const password = 'testpassword123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const pbkdf2Hash = `${salt}:${hash}`;

    // This is the bug: login uses bcrypt.compare against a PBKDF2 hash
    const result = await bcrypt.compare(password, pbkdf2Hash);
    assert.strictEqual(result, false, 'PBKDF2 hash must NOT verify with bcrypt.compare');
  });

  await test('PBKDF2 hash has colon separator (wrong format)', async () => {
    const password = 'anypassword';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const pbkdf2Hash = `${salt}:${hash}`;
    assert.ok(pbkdf2Hash.includes(':'), 'PBKDF2 hash should contain colon');
    assert.notStrictEqual(pbkdf2Hash.length, 60, 'PBKDF2 hash should NOT be 60 chars');
  });

  // --- AC-2: Verify the fix (bcrypt) works correctly ---
  console.log('\nAC-2: bcrypt.hash stores verifiable password');

  await test('bcrypt.hash produces valid 60-char hash', async () => {
    const password = 'testpassword123';
    const hash = await bcrypt.hash(password, 10);
    assert.strictEqual(hash.length, 60, `Expected 60 chars, got ${hash.length}`);
    assert.match(hash, /^\$2[aby]\$\d+\$/, 'Expected bcrypt format $2a/b/y$...');
  });

  await test('bcrypt.compare succeeds with correct password (fix verified)', async () => {
    const password = 'testpassword123';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare(password, hash);
    assert.strictEqual(isValid, true, 'bcrypt.compare must return true for matching password');
  });

  await test('bcrypt.compare fails with wrong password', async () => {
    const password = 'correctpassword';
    const hash = await bcrypt.hash(password, 10);
    const isValid = await bcrypt.compare('wrongpassword', hash);
    assert.strictEqual(isValid, false, 'bcrypt.compare must return false for wrong password');
  });

  await test('bcrypt hash does NOT contain colon (no PBKDF2 format)', async () => {
    const hash = await bcrypt.hash('somepassword', 10);
    assert.ok(!hash.includes(':'), 'bcrypt hash must not contain colon separator');
  });

  // --- AC-3: Verify route.ts uses bcrypt (code inspection) ---
  console.log('\nAC-3: onboarding/submit route uses bcrypt (code inspection)');

  await test('route.ts imports bcrypt (not crypto)', async () => {
    const fs = require('fs');
    const routePath = `${__dirname}/../product/lead-response/dashboard/app/api/onboarding/submit/route.ts`;
    const source = fs.readFileSync(routePath, 'utf8');
    assert.ok(source.includes("import bcrypt from 'bcryptjs'"), 'Must import bcrypt');
    assert.ok(!source.includes("import * as crypto from 'crypto'"), 'Must NOT import crypto for hashing');
  });

  await test('route.ts uses bcrypt.hash (not pbkdf2Sync)', async () => {
    const fs = require('fs');
    const routePath = `${__dirname}/../product/lead-response/dashboard/app/api/onboarding/submit/route.ts`;
    const source = fs.readFileSync(routePath, 'utf8');
    assert.ok(source.includes('bcrypt.hash('), 'Must call bcrypt.hash()');
    assert.ok(!source.includes('pbkdf2Sync'), 'Must NOT use pbkdf2Sync');
    assert.ok(!source.includes('salt:hash'), 'Must NOT use salt:hash format');
  });

  await test('route.ts awaits hashPassword (async fix applied)', async () => {
    const fs = require('fs');
    const routePath = `${__dirname}/../product/lead-response/dashboard/app/api/onboarding/submit/route.ts`;
    const source = fs.readFileSync(routePath, 'utf8');
    assert.ok(source.includes('await hashPassword('), 'hashPassword must be awaited');
    assert.ok(source.includes('async function hashPassword'), 'hashPassword must be async');
  });

  // --- AC-4: Login route also uses bcrypt (consistency check) ---
  console.log('\nAC-4: Login route uses bcrypt.compare (consistent with fix)');

  await test('login route uses bcrypt.compare', async () => {
    const fs = require('fs');
    const loginPath = `${__dirname}/../product/lead-response/dashboard/app/api/auth/login/route.ts`;
    const source = fs.readFileSync(loginPath, 'utf8');
    assert.ok(source.includes('bcrypt.compare('), 'Login must use bcrypt.compare');
  });

  // --- AC-5: Round-trip simulation (signup hash → login verify) ---
  console.log('\nAC-5: Signup → login round-trip simulation');

  await test('round-trip: hash during signup, verify during login', async () => {
    const signupPassword = 'UserPassword!99';

    // Simulate what onboarding/submit route does now (after fix)
    const storedHash = await bcrypt.hash(signupPassword, 10);

    // Simulate what login route does
    const loginPassword = 'UserPassword!99';
    const isValid = await bcrypt.compare(loginPassword, storedHash);
    assert.strictEqual(isValid, true, 'Round-trip signup→login must succeed');
  });

  await test('round-trip: wrong password at login is rejected', async () => {
    const signupPassword = 'UserPassword!99';
    const storedHash = await bcrypt.hash(signupPassword, 10);

    const isValid = await bcrypt.compare('WrongPassword!00', storedHash);
    assert.strictEqual(isValid, false, 'Wrong password must be rejected at login');
  });

  // --- Summary ---
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
