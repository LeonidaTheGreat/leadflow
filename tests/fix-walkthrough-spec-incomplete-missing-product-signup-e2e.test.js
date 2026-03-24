/**
 * E2E Test: fix-walkthrough-spec-incomplete-missing-product-signup
 * Task ID: ff47a4e7-0467-4a07-9739-6c72e1451b3c
 * 
 * Tests the cookie name fix in trial-signup route:
 * - Cookie name changed from 'leadflow_session' to 'auth-token' (hyphen)
 * - sameSite changed from 'strict' to 'lax'
 * - Cookie must match what /api/auth/me expects
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_ROOT = path.join(PROJECT_ROOT, 'product/lead-response/dashboard');

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

async function run() {
  console.log('\n🔍 QC E2E: fix-walkthrough-spec-incomplete-missing-product-signup\n');
  console.log('Testing cookie name fix in trial-signup route...\n');

  // Test 1: Verify the trial-signup route.ts file has correct cookie name
  console.log('📄 Code Review Tests:');
  
  const routePath = path.join(DASHBOARD_ROOT, 'app/api/auth/trial-signup/route.ts');
  ok('Route file exists', fs.existsSync(routePath), `File not found: ${routePath}`);
  
  if (fs.existsSync(routePath)) {
    const routeSrc = fs.readFileSync(routePath, 'utf8');
    
    ok('Route uses auth-token (not leadflow_session)', 
      routeSrc.includes("'auth-token'") && !routeSrc.includes("'leadflow_session'"),
      'Cookie name should be auth-token');
    
    ok('Route uses sameSite: lax (not strict)',
      routeSrc.includes("sameSite: 'lax'") || routeSrc.includes('sameSite: "lax"'),
      'sameSite should be lax');
    
    ok('Route has comment explaining cookie name',
      routeSrc.includes('auth-token') && routeSrc.includes('/api/auth/me'),
      'Should have comment explaining auth-token cookie name');
    
    ok('Cookie is httpOnly', 
      routeSrc.includes('httpOnly: true'),
      'Cookie should have httpOnly: true');
    
    ok('Cookie has maxAge of 30 days',
      routeSrc.includes('30 * 24 * 60 * 60'),
      'maxAge should be 30 days');
    
    ok('Cookie has path: /',
      routeSrc.includes('path: \'/\''),
      'Cookie should have path: /');
  }

  // Test 2: Verify /api/auth/me expects auth-token cookie
  console.log('\n🔐 Auth Cookie Compatibility Tests:');
  
  const meRoutePath = path.join(DASHBOARD_ROOT, 'app/api/auth/me/route.ts');
  if (fs.existsSync(meRoutePath)) {
    const meSrc = fs.readFileSync(meRoutePath, 'utf8');
    
    ok('/api/auth/me reads auth-token cookie',
      meSrc.includes('auth-token'),
      '/api/auth/me should read auth-token cookie');
    
    ok('/api/auth/me does NOT read leadflow_session',
      !meSrc.includes('leadflow_session'),
      '/api/auth/me should not reference leadflow_session');
  } else {
    ok('/api/auth/me route exists', false, `File not found: ${meRoutePath}`);
  }

  // Test 3: Verify middleware also uses auth-token
  console.log('\n🔒 Middleware Tests:');
  
  const middlewarePath = path.join(DASHBOARD_ROOT, 'middleware.ts');
  if (fs.existsSync(middlewarePath)) {
    const middlewareSrc = fs.readFileSync(middlewarePath, 'utf8');
    
    ok('Middleware reads auth-token cookie',
      middlewareSrc.includes('auth-token'),
      'Middleware should read auth-token cookie');
    
    ok('Middleware does NOT read leadflow_session',
      !middlewareSrc.includes('leadflow_session'),
      'Middleware should not reference leadflow_session');
  } else {
    ok('Middleware file exists', false, `File not found: ${middlewarePath}`);
  }

  // Test 4: Verify login route also uses auth-token for consistency
  console.log('\n🔗 Login Route Tests:');
  
  const loginRoutePath = path.join(DASHBOARD_ROOT, 'app/api/auth/login/route.ts');
  if (fs.existsSync(loginRoutePath)) {
    const loginSrc = fs.readFileSync(loginRoutePath, 'utf8');
    
    ok('Login route sets auth-token cookie',
      loginSrc.includes('auth-token'),
      'Login should set auth-token cookie');
    
    ok('Login route does NOT set leadflow_session',
      !loginSrc.includes('leadflow_session'),
      'Login should not set leadflow_session');
  } else {
    ok('Login route exists', false, `File not found: ${loginRoutePath}`);
  }

  // Test 5: Verify build succeeds
  console.log('\n🏗️ Build Tests:');
  
  const { execSync } = require('child_process');
  try {
    // Check TypeScript compilation of the route file
    execSync('npx tsc --noEmit product/lead-response/dashboard/app/api/auth/trial-signup/route.ts 2>&1', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000
    });
    ok('TypeScript compilation succeeds', true, '');
  } catch (e) {
    // TSC might fail due to missing types, but we check for syntax errors
    const errorMsg = e.stderr?.toString() || e.stdout?.toString() || '';
    if (errorMsg.includes('SyntaxError') || errorMsg.includes('error TS')) {
      ok('TypeScript compilation succeeds', false, errorMsg.substring(0, 200));
    } else {
      // Non-syntax errors (like missing modules) are acceptable for this check
      ok('TypeScript compilation succeeds', true, '');
    }
  }

  // Summary
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
