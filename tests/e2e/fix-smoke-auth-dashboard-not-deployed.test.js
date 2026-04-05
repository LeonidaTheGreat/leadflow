/**
 * E2E test: Auth smoke test config + dashboard deployment verification
 * Verifies:
 *  1. project.config.json has no broken signup_login_flow check type
 *  2. Auth smoke test entry uses http_200 with a proper url field
 *  3. Login and signup pages exist in the Next.js app
 *  4. The deployed dashboard health endpoint responds with ok status
 * Use case: fix-smoke-auth-dashboard-not-deployed
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const https = require('https');

const PROJECT_CONFIG = path.join(__dirname, '../../project.config.json');
const DASHBOARD_DIR = path.join(__dirname, '../../product/lead-response/dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function run() {
  // --- Config checks ---
  test('project.config.json is valid JSON', () => {
    const raw = fs.readFileSync(PROJECT_CONFIG, 'utf8');
    JSON.parse(raw); // throws if invalid
  });

  test('project.config.json has NO signup_login_flow check_type', () => {
    const raw = fs.readFileSync(PROJECT_CONFIG, 'utf8');
    assert.ok(
      !raw.includes('"signup_login_flow"'),
      'signup_login_flow check_type must be removed — it does not exist in CHECK_FUNCTIONS'
    );
  });

  test('auth smoke test uses http_200 with url field', () => {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG, 'utf8'));
    const smokeTests = config.smoke_tests || [];
    const authEntry = smokeTests.find(t => t.id === 'auth-signup-login-flow');
    if (authEntry) {
      assert.strictEqual(authEntry.check_type, 'http_200', 'auth-signup-login-flow must use http_200');
      assert.ok(authEntry.url, 'auth-signup-login-flow must have a url field (not base_url)');
      assert.ok(!authEntry.base_url, 'auth-signup-login-flow must NOT have base_url');
    }
    // If the entry doesn't exist, the old broken entry has been removed — that's also acceptable
  });

  test('login-page smoke test exists with http_200', () => {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG, 'utf8'));
    const smokeTests = config.smoke_tests || [];
    const loginTest = smokeTests.find(t => t.id === 'login-page');
    assert.ok(loginTest, 'login-page smoke test must exist');
    assert.strictEqual(loginTest.check_type, 'http_200', 'login-page must use http_200');
    assert.ok(loginTest.url, 'login-page must have a url field');
  });

  test('signup-page smoke test exists with http_200', () => {
    const config = JSON.parse(fs.readFileSync(PROJECT_CONFIG, 'utf8'));
    const smokeTests = config.smoke_tests || [];
    const signupTest = smokeTests.find(t => t.id === 'signup-page');
    assert.ok(signupTest, 'signup-page smoke test must exist');
    assert.strictEqual(signupTest.check_type, 'http_200', 'signup-page must use http_200');
    assert.ok(signupTest.url, 'signup-page must have a url field');
  });

  // --- Next.js dashboard file checks ---
  test('Next.js login page exists in app directory', () => {
    const loginPage = path.join(DASHBOARD_DIR, 'app/login/page.tsx');
    assert.ok(fs.existsSync(loginPage), 'app/login/page.tsx must exist in the dashboard');
  });

  test('Next.js signup page exists in app directory', () => {
    const signupPage = path.join(DASHBOARD_DIR, 'app/signup/page.tsx');
    assert.ok(fs.existsSync(signupPage), 'app/signup/page.tsx must exist in the dashboard');
  });

  test('dashboard .vercel/project.json is linked to leadflow-ai', () => {
    const projectJson = path.join(DASHBOARD_DIR, '.vercel/project.json');
    assert.ok(fs.existsSync(projectJson), '.vercel/project.json must exist');
    const link = JSON.parse(fs.readFileSync(projectJson, 'utf8'));
    assert.strictEqual(link.projectName, 'leadflow-ai', 'dashboard must be linked to leadflow-ai Vercel project');
  });

  // --- Live deployment checks ---
  await testAsync('deployed login page returns 200', async () => {
    const res = await httpGet('https://leadflow-ai-five.vercel.app/login');
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
  });

  await testAsync('deployed signup page returns 200', async () => {
    const res = await httpGet('https://leadflow-ai-five.vercel.app/signup');
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
  });

  await testAsync('deployed health endpoint returns ok status', async () => {
    const res = await httpGet('https://leadflow-ai-five.vercel.app/api/health');
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    const json = JSON.parse(res.body);
    assert.strictEqual(json.status, 'ok', `Health status must be ok, got: ${json.status}`);
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
