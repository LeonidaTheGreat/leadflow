/**
 * E2E test: npm audit security — verifies high/critical CVEs are resolved
 * PR #1891: bumped form-data, express, body-parser, qs, express-rate-limit, ip-address
 */
const { execSync } = require('child_process');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    failed++;
  }
}

console.log('\n🔐 NPM Audit Security Test\n');

// Test 1: No high/critical vulnerabilities
test('npm audit --audit-level=high exits 0 (no high/critical CVEs)', () => {
  try {
    execSync('npm audit --audit-level=high', { cwd: ROOT, stdio: 'pipe' });
  } catch (err) {
    const output = (err.stdout || '').toString() + (err.stderr || '').toString();
    throw new Error(`npm audit found high/critical vulnerabilities:\n${output.slice(0, 500)}`);
  }
});

// Test 2: express is at patched version (>= 4.22.2)
test('express >= 4.22.2 (fixes qs injection CVE)', () => {
  const lock = require(path.join(ROOT, 'package-lock.json'));
  const version = lock.packages['node_modules/express'].version;
  const [major, minor, patch] = version.split('.').map(Number);
  assert.ok(
    major > 4 || (major === 4 && minor > 22) || (major === 4 && minor === 22 && patch >= 2),
    `Expected express >= 4.22.2, got ${version}`
  );
});

// Test 3: qs is at patched version (>= 6.15.0)
test('qs >= 6.15.0 (fixes prototype pollution CVE)', () => {
  const lock = require(path.join(ROOT, 'package-lock.json'));
  const version = lock.packages['node_modules/qs'].version;
  const [major, minor] = version.split('.').map(Number);
  assert.ok(
    major > 6 || (major === 6 && minor >= 15),
    `Expected qs >= 6.15.0, got ${version}`
  );
});

// Test 4: ip-address is at patched version (>= 10.2.0 fixes XSS)
test('ip-address >= 10.2.0 (fixes XSS in Address6 HTML methods)', () => {
  const lock = require(path.join(ROOT, 'package-lock.json'));
  const version = lock.packages['node_modules/ip-address'].version;
  const [major, minor] = version.split('.').map(Number);
  assert.ok(
    major > 10 || (major === 10 && minor >= 2),
    `Expected ip-address >= 10.2.0, got ${version}`
  );
});

// Test 5: express-rate-limit is at patched version (>= 8.6.0)
test('express-rate-limit >= 8.6.0', () => {
  const lock = require(path.join(ROOT, 'package-lock.json'));
  const version = lock.packages['node_modules/express-rate-limit'].version;
  const [major, minor] = version.split('.').map(Number);
  assert.ok(
    major > 8 || (major === 8 && minor >= 6),
    `Expected express-rate-limit >= 8.6.0, got ${version}`
  );
});

// Summary
console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
