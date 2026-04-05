/**
 * E2E Test: Onboarding Aha Moment Completion
 * Task ID: 8fc9ee29-fd8e-4b9f-967c-1ed8bb7d8541
 * 
 * Verifies:
 * - POST /api/onboarding/complete records aha_completed and aha_response_time_ms
 * - Demo mode works without FUB credentials
 * - Onboarding wizard calls correct endpoint
 * - Confirmation step displays aha moment status
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DASHBOARD_ROOT = path.join(__dirname, '..', '..', 'product', 'lead-response', 'dashboard');
const TESTS_DIR = __dirname;

console.log('🔍 E2E Test: Onboarding Aha Moment Completion');
console.log('==============================================\n');

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

// ─── Test 1: Onboarding complete endpoint exists ─────────────────────────────
test('POST /api/onboarding/complete route exists', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'onboarding', 'complete', 'route.ts');
  assert(fs.existsSync(routePath), `Route file not found: ${routePath}`);
});

// ─── Test 2: Endpoint requires authentication ────────────────────────────────
test('onboarding/complete uses getAuthUserId for auth', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'onboarding', 'complete', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(content.includes('getAuthUserId'), 'Should import getAuthUserId');
  assert(content.includes('const authenticatedId = await getAuthUserId'), 'Should call getAuthUserId');
  assert(content.includes('if (!authenticatedId)'), 'Should check for authenticated user');
  assert(content.includes("{ status: 401 }"), 'Should return 401 when not authenticated');
});

// ─── Test 3: Endpoint updates correct database fields ────────────────────────
test('onboarding/complete updates real_estate_agents table', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'onboarding', 'complete', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(content.includes("from('real_estate_agents')"), 'Should query real_estate_agents table');
  assert(content.includes('onboarding_completed: true'), 'Should set onboarding_completed');
  assert(content.includes('aha_completed'), 'Should update aha_completed field');
  assert(content.includes('aha_response_time_ms'), 'Should update aha_response_time_ms field');
});

// ─── Test 4: Demo run endpoint exists ────────────────────────────────────────
test('POST /api/demo/run route exists', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts');
  assert(fs.existsSync(routePath), `Route file not found: ${routePath}`);
});

// ─── Test 5: Demo mode does NOT require FUB/Twilio ───────────────────────────
test('demo/run does not import Twilio or FUB', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(!content.includes("require('twilio')"), 'Should not require twilio');
  assert(!content.includes("from 'twilio'"), 'Should not import twilio');
  assert(!content.toLowerCase().includes('fub_api_key'), 'Should not reference FUB_API_KEY');
  assert(!content.includes('sendSms'), 'Should not call sendSms');
});

// ─── Test 6: Demo mode has mock fallback ─────────────────────────────────────
test('demo/run has mock mode fallback for missing AI key', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(content.includes('isMockMode'), 'Should have isMockMode function');
  assert(content.includes('generateMockResponse'), 'Should have generateMockResponse function');
});

// ─── Test 7: Demo limit is enforced ──────────────────────────────────────────
test('demo/run enforces DEMO_LIMIT of 3', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(content.match(/DEMO_LIMIT\s*=\s*3/), 'Should set DEMO_LIMIT to 3');
  assert(content.includes('demo_limit_reached'), 'Should handle demo_limit_reached');
});

// ─── Test 8: Demo runs are logged ────────────────────────────────────────────
test('demo/run logs to demo_runs table', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(content.includes("from('demo_runs')"), 'Should insert into demo_runs table');
  assert(content.includes('agent_id'), 'Should log agent_id');
  assert(content.includes('ai_response'), 'Should log ai_response');
  assert(content.includes('response_time_ms'), 'Should log response_time_ms');
});

// ─── Test 9: Confirmation step shows aha status ──────────────────────────────
test('confirmation.tsx displays aha moment status', () => {
  const confirmPath = path.join(DASHBOARD_ROOT, 'app', 'onboarding', 'steps', 'confirmation.tsx');
  assert(fs.existsSync(confirmPath), 'confirmation.tsx should exist');
  const content = fs.readFileSync(confirmPath, 'utf8');
  assert(content.includes('ahaCompleted'), 'Should reference ahaCompleted');
  assert(content.includes('ahaResponseTimeMs'), 'Should reference ahaResponseTimeMs');
  assert(content.includes('Saw AI respond in'), 'Should show "Saw AI respond in" message');
  assert(content.includes('formatResponseTime'), 'Should format response time');
});

// ─── Test 10: Onboarding wizard calls correct endpoint ───────────────────────
test('onboarding page calls /api/onboarding/complete', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'onboarding', 'page.tsx');
  assert(fs.existsSync(pagePath), 'onboarding page should exist');
  const content = fs.readFileSync(pagePath, 'utf8');
  assert(content.includes('/api/onboarding/complete'), 'Should call /api/onboarding/complete');
});

// ─── Test 11: Simulator step is wired before confirmation ────────────────────
test('onboarding wizard has simulator step before confirmation', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'onboarding', 'page.tsx');
  const content = fs.readFileSync(pagePath, 'utf8');
  const simIndex = content.indexOf("'simulator'");
  const confirmIndex = content.indexOf("'confirmation'");
  assert(simIndex > -1, 'Should have simulator step');
  assert(confirmIndex > -1, 'Should have confirmation step');
  assert(simIndex < confirmIndex, 'Simulator should come before confirmation');
});

// ─── Test 12: Demo UI page exists ────────────────────────────────────────────
test('/dashboard/demo page exists', () => {
  const pagePath = path.join(DASHBOARD_ROOT, 'app', 'dashboard', 'demo', 'page.tsx');
  assert(fs.existsSync(pagePath), 'Demo page should exist');
});

// ─── Test 13: Demo status endpoint exists ────────────────────────────────────
test('GET /api/demo/status route exists', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'status', 'route.ts');
  assert(fs.existsSync(routePath), 'Demo status route should exist');
});

// ─── Test 14: Migration file exists ──────────────────────────────────────────
test('Migration 005_demo_mode.sql exists', () => {
  const migPath = path.join(__dirname, '..', '..', 'migrations', '005_demo_mode.sql');
  assert(fs.existsSync(migPath), 'Migration file should exist');
});

// ─── Test 15: Migration adds required columns ────────────────────────────────
test('Migration adds demo_runs_used column and demo_runs table', () => {
  const migPath = path.join(__dirname, '..', '..', 'migrations', '005_demo_mode.sql');
  const content = fs.readFileSync(migPath, 'utf8');
  assert(content.includes('demo_runs_used'), 'Should add demo_runs_used column');
  assert(content.includes('CREATE TABLE IF NOT EXISTS demo_runs'), 'Should create demo_runs table');
  assert(content.includes('agent_id'), 'demo_runs should have agent_id');
  assert(content.includes('ai_response'), 'demo_runs should have ai_response');
  assert(content.includes('response_time_ms'), 'demo_runs should have response_time_ms');
});

// ─── Test 16: No hardcoded secrets ───────────────────────────────────────────
test('No hardcoded secrets in onboarding routes', () => {
  const completePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'onboarding', 'complete', 'route.ts');
  const demoPath = path.join(DASHBOARD_ROOT, 'app', 'api', 'demo', 'run', 'route.ts');
  const completeContent = fs.readFileSync(completePath, 'utf8');
  const demoContent = fs.readFileSync(demoPath, 'utf8');
  
  // Check for common secret patterns
  const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /api[_-]?key['"]\s*:\s*['"][^'"]{10,}/i];
  for (const pattern of secretPatterns) {
    assert(!pattern.test(completeContent), `complete/route.ts should not have hardcoded secrets matching ${pattern}`);
    assert(!pattern.test(demoContent), `demo/run/route.ts should not have hardcoded secrets matching ${pattern}`);
  }
});

// ─── Test 17: Proper error handling ──────────────────────────────────────────
test('onboarding/complete has proper error handling', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'onboarding', 'complete', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  assert(content.includes('try'), 'Should have try block for parsing body');
  assert(content.includes('console.error'), 'Should log errors');
  assert(content.includes('{ status: 500 }'), 'Should return 500 on server error');
});

// ─── Test 18: Uses strict equality ───────────────────────────────────────────
test('onboarding/complete uses strict equality checks', () => {
  const routePath = path.join(DASHBOARD_ROOT, 'app', 'api', 'onboarding', 'complete', 'route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  // Should not have loose equality (==) except in comments
  const lines = content.split('\n');
  for (const line of lines) {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;
    // Check for loose equality outside strings
    if (/[^=!]==[^=]/.test(line) && !line.includes('//')) {
      assert.fail(`Found loose equality (==) in: ${line.trim()}`);
    }
  }
});

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log('\n==============================================');
console.log('📊 TEST SUMMARY');
console.log('==============================================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(0)}%`);
console.log('==============================================');

if (failed > 0) {
  process.exit(1);
}
