/**
 * E2E test: npm vulnerability fix — uuid v13→v14 upgrade
 * Task: bc407561-55fc-4083-8139-dbae5be486eb
 *
 * Verifies:
 * 1. uuid@14 is installed and v4 API is backward-compatible
 * 2. follow-redirects override remains at 1.16.0
 * 3. npm audit reports 0 high/critical vulnerabilities
 */

'use strict';

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   ${err.message}`);
    failed++;
  }
}

// Test 1: uuid v14 is the installed version
test('uuid@14 is installed', () => {
  const output = execSync('npm ls uuid --json', { cwd: PROJECT_DIR }).toString();
  const tree = JSON.parse(output);
  const uuidVersion = tree.dependencies?.uuid?.version;
  assert.ok(uuidVersion, 'uuid dependency not found in npm ls output');
  assert.match(uuidVersion, /^14\./, `Expected uuid@14.x, got uuid@${uuidVersion}`);
});

// Test 2: uuid v4 API is backward-compatible (v4 generates valid RFC 4122 UUIDs)
test('uuid v4 API generates valid UUIDs', () => {
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  assert.match(
    id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    `Generated value is not a valid v4 UUID: ${id}`
  );
});

// Test 3: uuid v4 generates unique values (not broken PRNG)
test('uuid v4 generates unique values', () => {
  const { v4: uuidv4 } = require('uuid');
  const ids = new Set(Array.from({ length: 10 }, () => uuidv4()));
  assert.strictEqual(ids.size, 10, 'uuid v4 generated duplicate values — PRNG may be broken');
});

// Test 4: follow-redirects override still at 1.16.0
test('follow-redirects override remains at 1.16.0', () => {
  const output = execSync('npm ls follow-redirects --json', { cwd: PROJECT_DIR }).toString();
  const tree = JSON.parse(output);
  // follow-redirects is a transitive dep under axios
  const axiosDeps = tree.dependencies?.axios?.dependencies;
  const frVersion = axiosDeps?.['follow-redirects']?.version;
  assert.ok(frVersion, 'follow-redirects not found under axios');
  assert.strictEqual(frVersion, '1.16.0', `Expected follow-redirects@1.16.0, got ${frVersion}`);
});

// Test 5: npm audit shows 0 high/critical vulnerabilities
test('npm audit reports 0 high/critical vulnerabilities', () => {
  let auditJson;
  try {
    execSync('npm audit --json', { cwd: PROJECT_DIR });
    // exit 0 = no vulnerabilities
    auditJson = { metadata: { vulnerabilities: { high: 0, critical: 0 } } };
  } catch (err) {
    // npm audit exits non-zero when vulnerabilities found; stdout has the JSON
    auditJson = JSON.parse(err.stdout?.toString() || '{}');
  }
  const vuln = auditJson?.metadata?.vulnerabilities || {};
  assert.strictEqual(vuln.high ?? 0, 0, `npm audit: ${vuln.high} high vulnerability(s) found`);
  assert.strictEqual(vuln.critical ?? 0, 0, `npm audit: ${vuln.critical} critical vulnerability(s) found`);
});

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
