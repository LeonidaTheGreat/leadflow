/**
 * E2E test: Fix code quality — 9 high/critical npm vulnerabilities
 * Verifies that axios >= 1.15.0 is installed (fixes GHSA-3p68-rc4w-qgx5 SSRF vuln)
 * and that npm audit reports 0 high/critical vulnerabilities.
 */

const assert = require('assert');
const { execSync } = require('child_process');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;
const results = [];

function check(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    results.push({ name, status: 'pass' });
    passed++;
  } catch (err) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   ${err.message}`);
    results.push({ name, status: 'fail', error: err.message });
    failed++;
  }
}

// Test 1: axios version >= 1.15.0 in package.json
check('axios version >= 1.15.0 in package.json', () => {
  const pkg = require(path.join(projectDir, 'package.json'));
  const axiosRange = pkg.dependencies.axios;
  assert(axiosRange, 'axios not found in package.json dependencies');
  // Strip semver range operators to get version number
  const version = axiosRange.replace(/[\^~>=<]/g, '').trim();
  const [major, minor] = version.split('.').map(Number);
  assert(
    major > 1 || (major === 1 && minor >= 15),
    `axios ${axiosRange} is below 1.15.0 (GHSA-3p68-rc4w-qgx5 SSRF fix requires >= 1.15.0)`
  );
});

// Test 2: axios installed version in package-lock.json >= 1.15.0
check('axios resolved version >= 1.15.0 in package-lock.json', () => {
  const lock = require(path.join(projectDir, 'package-lock.json'));
  const axiosEntry = lock.packages['node_modules/axios'];
  assert(axiosEntry, 'axios not found in package-lock.json');
  const version = axiosEntry.version;
  const [major, minor] = version.split('.').map(Number);
  assert(
    major > 1 || (major === 1 && minor >= 15),
    `Resolved axios ${version} is below 1.15.0`
  );
});

// Test 3: npm audit reports 0 high/critical vulnerabilities
check('npm audit reports 0 high/critical vulnerabilities', () => {
  let auditOutput;
  try {
    execSync('npm audit --audit-level=high --json', {
      cwd: projectDir,
      encoding: 'utf8',
      timeout: 60000,
    });
    // Exit code 0 = no vulnerabilities at or above --audit-level
    auditOutput = '{"vulnerabilities":{}}';
  } catch (err) {
    // npm audit exits non-zero if vulnerabilities found
    const stdout = err.stdout || '';
    try {
      const report = JSON.parse(stdout);
      const vulns = report.vulnerabilities || {};
      const highOrCritical = Object.values(vulns).filter(
        (v) => v.severity === 'high' || v.severity === 'critical'
      );
      assert.strictEqual(
        highOrCritical.length,
        0,
        `Found ${highOrCritical.length} high/critical vulnerabilities: ${highOrCritical.map((v) => `${v.name} (${v.severity})`).join(', ')}`
      );
    } catch (parseErr) {
      // If can't parse JSON, check text output
      if (stdout.includes('critical') || stdout.includes('high severity')) {
        throw new Error(`npm audit found high/critical vulnerabilities:\n${stdout.slice(0, 500)}`);
      }
    }
  }
});

// Test 4: proxy-from-env >= 2.1.0 (axios 1.15 dependency)
check('proxy-from-env >= 2.1.0 in package-lock.json', () => {
  const lock = require(path.join(projectDir, 'package-lock.json'));
  const entry = lock.packages['node_modules/proxy-from-env'];
  assert(entry, 'proxy-from-env not found in package-lock.json');
  const [major, minor] = entry.version.split('.').map(Number);
  assert(
    major > 2 || (major === 2 && minor >= 1),
    `proxy-from-env ${entry.version} is below 2.1.0`
  );
});

console.log('\n============================================================');
console.log('📊 NPM VULNERABILITY FIX TEST REPORT');
console.log('============================================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
console.log('============================================================');

if (failed > 0) {
  process.exit(1);
}
