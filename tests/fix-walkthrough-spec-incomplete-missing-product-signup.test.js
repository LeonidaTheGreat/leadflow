/**
 * QC E2E Test: fix-walkthrough-spec-incomplete-missing-product-signup
 * Task ID: 5413aac1-74ae-4a45-ac3b-96559dd40e01
 *
 * Tests runtime behavior for:
 * 1. Walkthrough spec completeness (docs + test file exist)
 * 2. Forgot password flow (key missing from original issue)
 * 3. Signup API endpoint works
 * 4. Dashboard/onboarding route exists
 * 5. Forgot password API returns 200 (anti-enumeration)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_ROOT = path.join(PROJECT_ROOT, 'product/lead-response/dashboard');
const BASE_URL = process.env.TEST_BASE_URL || 'https://leadflow-ai-five.vercel.app';

let passed = 0;
let failed = 0;
const results = [];

function ok(name, cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
    results.push({ name, status: 'pass' });
  } else {
    console.error(`  ❌ FAIL: ${name} — ${msg}`);
    failed++;
    results.push({ name, status: 'fail', msg });
  }
}

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const opts = { ...options };
    const body = opts.body;
    delete opts.body;

    const req = lib.request(url, opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: data, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  console.log('\n🔍 QC E2E: fix-walkthrough-spec-incomplete-missing-product-signup\n');

  // --- STATIC CHECKS ---
  console.log('📁 Static File Checks:');

  const walkthroughDoc = path.join(PROJECT_ROOT, 'docs/guides/WALKTHROUGH-PRODUCT-SIGNUP.md');
  ok('Walkthrough spec doc exists', fs.existsSync(walkthroughDoc),
    'WALKTHROUGH-PRODUCT-SIGNUP.md not found');

  const walkthroughTest = path.join(PROJECT_ROOT, 'tests/walkthrough-product-signup.test.js');
  ok('Walkthrough test file exists', fs.existsSync(walkthroughTest),
    'tests/walkthrough-product-signup.test.js not found');

  const forgotPwPage = path.join(DASHBOARD_ROOT, 'app/forgot-password/page.tsx');
  ok('Forgot password page exists', fs.existsSync(forgotPwPage),
    'app/forgot-password/page.tsx not found');

  const forgotPwRoute = path.join(DASHBOARD_ROOT, 'app/api/auth/forgot-password/route.ts');
  ok('Forgot password API route exists', fs.existsSync(forgotPwRoute),
    'app/api/auth/forgot-password/route.ts not found');

  const onboardingPage = path.join(DASHBOARD_ROOT, 'app/dashboard/onboarding/page.tsx');
  ok('/dashboard/onboarding page exists', fs.existsSync(onboardingPage),
    'app/dashboard/onboarding/page.tsx not found');

  const trialSignupRoute = path.join(DASHBOARD_ROOT, 'app/api/auth/trial-signup/route.ts');
  ok('Trial signup API route exists', fs.existsSync(trialSignupRoute),
    'app/api/auth/trial-signup/route.ts not found');

  // --- SECURITY CHECKS on forgot-password route ---
  console.log('\n🔐 Security Checks (Forgot Password):');

  const forgotSrc = fs.readFileSync(forgotPwRoute, 'utf8');

  ok('Uses crypto.randomBytes (not Math.random)',
    forgotSrc.includes('crypto.randomBytes') && !forgotSrc.includes('Math.random()'),
    'Should use crypto.randomBytes for token generation');

  ok('SHA-256 hashes token before storing',
    forgotSrc.includes("createHash('sha256')") || forgotSrc.includes('createHash("sha256")'),
    'Token should be hashed with SHA-256 before DB storage');

  ok('Anti-enumeration: always returns 200',
    (forgotSrc.match(/return NextResponse\.json.*success.*true/s) || []).length >= 1 ||
    forgotSrc.includes('{ success: true }'),
    'Should always return 200 to prevent email enumeration');

  // --- CHECK login page links to forgot-password ---
  console.log('\n🔗 Login Page Integration:');
  const loginPage = path.join(DASHBOARD_ROOT, 'app/login/page.tsx');
  if (fs.existsSync(loginPage)) {
    const loginSrc = fs.readFileSync(loginPage, 'utf8');
    ok('Login page links to /forgot-password',
      loginSrc.includes('/forgot-password'),
      'Login page should have a link to forgot password flow');
  } else {
    ok('Login page exists', false, 'app/login/page.tsx not found');
  }

  // --- RUNTIME HTTP CHECKS ---
  console.log('\n🌐 Runtime HTTP Checks:');

  try {
    // Test: landing page returns 200
    const landingRes = await fetchUrl(BASE_URL, { method: 'GET' });
    ok('Landing page returns 200', landingRes.status === 200,
      `Got ${landingRes.status}`);
  } catch (e) {
    ok('Landing page reachable', false, e.message);
  }

  try {
    // Test: signup page returns 200
    const signupRes = await fetchUrl(`${BASE_URL}/signup`, { method: 'GET' });
    ok('Signup page returns 200', signupRes.status === 200,
      `Got ${signupRes.status}`);
  } catch (e) {
    ok('Signup page reachable', false, e.message);
  }

  try {
    // Test: forgot-password page returns 200
    const fpRes = await fetchUrl(`${BASE_URL}/forgot-password`, { method: 'GET' });
    ok('Forgot password page returns 200', fpRes.status === 200,
      `Got ${fpRes.status}`);
  } catch (e) {
    ok('Forgot password page reachable', false, e.message);
  }

  try {
    // Test: POST /api/auth/forgot-password returns 200 (anti-enumeration)
    const fpApiRes = await fetchUrl(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com' })
    });
    ok('Forgot password API returns 200 for non-existent email (anti-enumeration)',
      fpApiRes.status === 200,
      `Got ${fpApiRes.status} — should always return 200`);
  } catch (e) {
    ok('Forgot password API reachable', false, e.message);
  }

  try {
    // Test: dashboard/onboarding page (unauthenticated should redirect, not 500)
    const onboardRes = await fetchUrl(`${BASE_URL}/dashboard/onboarding`, { method: 'GET' });
    ok('Dashboard/onboarding does not 500',
      onboardRes.status !== 500,
      `Got 500 — server error on onboarding route`);
  } catch (e) {
    ok('Dashboard/onboarding reachable', false, e.message);
  }

  try {
    // Test: protected API route returns 401 or 404 (not 200/500) without auth
    // Note: 404 is acceptable if the route isn't deployed; key check is no open access (200)
    const meRes = await fetchUrl(`${BASE_URL}/api/auth/me`, { method: 'GET' });
    ok('Auth /me endpoint does not return 200 without auth',
      meRes.status !== 200 && meRes.status !== 500,
      `Got ${meRes.status} — unauthenticated request should not succeed`);
  } catch (e) {
    ok('/api/auth/me reachable', false, e.message);
  }

  // --- WALKTHROUGH DOC COMPLETENESS ---
  console.log('\n📋 Walkthrough Spec Completeness:');
  const walkthroughSrc = fs.readFileSync(walkthroughDoc, 'utf8');

  const requiredSteps = [
    'Step 1: Landing Page Access',
    'Step 2: Trial Signup Flow',
    'Step 3: Dashboard Access',
    'Step 4: Sample Leads',
    'Step 5: Wizard',
  ];
  for (const step of requiredSteps) {
    ok(`Walkthrough doc covers "${step}"`,
      walkthroughSrc.includes(step),
      `Missing section: ${step}`);
  }

  // Forgot password is a separate UC (fix-no-forgot-password-flow-on-login-page)
  // The walkthrough spec covers product signup/onboarding — check login step exists
  ok('Walkthrough doc includes login/auth step',
    walkthroughSrc.toLowerCase().includes('login') || walkthroughSrc.toLowerCase().includes('auth'),
    'Walkthrough spec should reference the login/auth flow');

  // --- SUMMARY ---
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} total`);

  if (failed > 0) {
    console.error('\n❌ QC: FAILED\n');
    process.exitCode = 1;
  } else {
    console.log('\n✅ QC: PASSED\n');
  }

  return { passed, failed, total: passed + failed };
}

run().then(r => {
  global._qcResults = r;
}).catch(err => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});
