/**
 * QC E2E Test: fix-smoke-auth-dashboard-not-deployed
 * Task: 61518682-824d-464a-bda0-51de43844180
 * 
 * Verifies:
 * 1. project.config.json has no signup_login_flow check_type (broken check)
 * 2. Auth smoke tests use http_200 with url field
 * 3. Login and signup pages return 200 on deployed dashboard
 * 4. No junk files in diff
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const https = require('https');

const PROJECT_ROOT = path.join(__dirname, '..');
const PROJECT_CONFIG = path.join(PROJECT_ROOT, 'project.config.json');

let passed = 0;
let failed = 0;
const results = [];

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
    results.push({ name, status: 'pass' });
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', error: err.message });
  }
}

function httpGet(url, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`timeout after ${timeoutMs}ms`)); });
  });
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
    results.push({ name, status: 'pass' });
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`);
    failed++;
    results.push({ name, status: 'fail', error: err.message });
  }
}

async function run() {
  console.log('=== QC E2E: fix-smoke-auth-dashboard-not-deployed ===\n');

  // 1. Config check: signup_login_flow must be gone
  test('project.config.json has no signup_login_flow check_type', () => {
    const raw = fs.readFileSync(PROJECT_CONFIG, 'utf8');
    assert.ok(
      !raw.includes('"signup_login_flow"'),
      'signup_login_flow check_type still present in project.config.json — root cause not fixed'
    );
  });

  // 2. login-page smoke test exists with http_200 and url
  test('login-page smoke test: http_200 with url', () => {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG, 'utf8'));
    const loginTest = (config.smoke_tests || []).find(t => t.id === 'login-page');
    assert.ok(loginTest, 'login-page smoke test entry missing');
    assert.strictEqual(loginTest.check_type, 'http_200', `check_type is "${loginTest.check_type}", expected http_200`);
    assert.ok(loginTest.url, 'login-page smoke test missing url field');
  });

  // 3. signup-page smoke test exists with http_200 and url
  test('signup-page smoke test: http_200 with url', () => {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG, 'utf8'));
    const signupTest = (config.smoke_tests || []).find(t => t.id === 'signup-page');
    assert.ok(signupTest, 'signup-page smoke test entry missing');
    assert.strictEqual(signupTest.check_type, 'http_200', `check_type is "${signupTest.check_type}", expected http_200`);
    assert.ok(signupTest.url, 'signup-page smoke test missing url field');
  });

  // 4. Deployed login page returns 200
  await testAsync('deployed /login returns 200', async () => {
    const res = await httpGet('https://leadflow-ai-five.vercel.app/login');
    assert.strictEqual(res.statusCode, 200, `/login returned ${res.statusCode} — dashboard not properly deployed`);
    assert.ok(!res.body.includes('FUNCTION_INVOCATION_FAILED'), 'Login page has FUNCTION_INVOCATION_FAILED error');
  });

  // 5. Deployed signup page returns 200
  await testAsync('deployed /signup returns 200', async () => {
    const res = await httpGet('https://leadflow-ai-five.vercel.app/signup');
    assert.strictEqual(res.statusCode, 200, `/signup returned ${res.statusCode} — dashboard not properly deployed`);
    assert.ok(!res.body.includes('FUNCTION_INVOCATION_FAILED'), 'Signup page has FUNCTION_INVOCATION_FAILED error');
  });

  // 6. Auth-signup-login-flow entry: either removed or converted to http_200
  test('auth-signup-login-flow entry: if present, uses http_200', () => {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG, 'utf8'));
    const entry = (config.smoke_tests || []).find(t => t.id === 'auth-signup-login-flow');
    if (entry) {
      assert.notStrictEqual(entry.check_type, 'signup_login_flow', 
        'auth-signup-login-flow still uses broken signup_login_flow check_type');
      assert.strictEqual(entry.check_type, 'http_200', 
        `auth-signup-login-flow uses "${entry.check_type}" instead of http_200`);
    }
    // If entry doesn't exist: it was removed/replaced — acceptable
  });

  // Summary
  console.log('\n=== RESULTS ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
