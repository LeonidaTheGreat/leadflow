#!/usr/bin/env node
// E2E test: follow-redirects vulnerability fix (task cff10a61)
// Verifies: npm overrides pin follow-redirects >= 1.15.6 (CVE-2024-28849 fixed in 1.15.6)
// and no high/critical npm audit findings remain.

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

// 1. follow-redirects is pinned to safe version via overrides
test('package.json overrides pin follow-redirects to 1.16.0', () => {
  const pkg = require(path.join(ROOT, 'package.json'));
  assert.ok(pkg.overrides, 'Missing overrides section in package.json');
  assert.strictEqual(pkg.overrides['follow-redirects'], '1.16.0',
    `Expected overrides["follow-redirects"] = "1.16.0", got ${pkg.overrides['follow-redirects']}`);
});

// 2. Installed follow-redirects version is 1.16.0
test('Installed follow-redirects is version 1.16.0', () => {
  const installed = require(path.join(ROOT, 'node_modules/follow-redirects/package.json'));
  assert.strictEqual(installed.version, '1.16.0',
    `Expected 1.16.0, got ${installed.version}`);
});

// 3. npm audit reports zero high/critical vulnerabilities
test('npm audit: zero high and critical vulnerabilities', () => {
  const output = execSync('npm audit --json', { cwd: ROOT, timeout: 30000 }).toString();
  const report = JSON.parse(output);
  const v = report.metadata?.vulnerabilities || {};
  assert.strictEqual(v.high || 0, 0, `Found ${v.high} high-severity vulnerabilities`);
  assert.strictEqual(v.critical || 0, 0, `Found ${v.critical} critical-severity vulnerabilities`);
});

console.log('\n--- follow-redirects vulnerability fix E2E test ---');
console.log(`Passed: ${passed} | Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
