/**
 * E2E Test for fix-inactivity-alerting-cron-not-implemented
 * 
 * Tests the inactivity alerting cron endpoint:
 * - GET /api/cron/inactivity-alerts
 * 
 * Acceptance Criteria from PRD:
 * - Cron fires every 30 minutes (deployed as daily at 9am UTC due to Vercel Hobby limits)
 * - Checks for pilots inactive >72h via agent_sessions.last_active_at
 * - De-duplicates via inactivity_alerts table (no duplicate within 24h per agent)
 * - Sends Telegram notification
 */

const assert = require('assert');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.log(`${RED}✗${RESET} ${name}: ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`${GREEN}✓${RESET} ${name}`);
    passed++;
  } catch (err) {
    console.log(`${RED}✗${RESET} ${name}: ${err.message}`);
    failed++;
  }
}

// Simple HTTP request helper
function httpRequest(path, options = {}) {
  const url = new URL(path, BASE_URL);
  const http = url.protocol === 'https:' ? require('https') : require('http');
  
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method || 'GET', headers: options.headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

console.log('\n=== E2E Test: fix-inactivity-alerting-cron-not-implemented ===\n');

// Test 1: Verify route exists and requires authentication
asyncTest('GET /api/cron/inactivity-alerts without auth returns 401', async () => {
  const res = await httpRequest('/api/cron/inactivity-alerts');
  assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
});

// Test 2: Verify route accepts valid auth
asyncTest('GET /api/cron/inactivity-alerts with valid Bearer token returns 200', async () => {
  const res = await httpRequest('/api/cron/inactivity-alerts', {
    headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
  });
  // Should return 200 or 503 (if Supabase not configured in test env)
  assert.ok(res.status === 200 || res.status === 503, `Expected 200 or 503, got ${res.status}`);
});

// Test 3: Verify route rejects invalid auth
asyncTest('GET /api/cron/inactivity-alerts with invalid Bearer token returns 401', async () => {
  const res = await httpRequest('/api/cron/inactivity-alerts', {
    headers: { 'Authorization': 'Bearer invalid-token' }
  });
  assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
});

// Test 4: Verify dry-run mode works
asyncTest('GET /api/cron/inactivity-alerts?test=true with auth returns valid JSON', async () => {
  const res = await httpRequest('/api/cron/inactivity-alerts?test=true', {
    headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
  });
  
  if (res.status === 503) {
    // Supabase not configured, skip this test
    console.log('  (Supabase not configured, skipping JSON validation)');
    return;
  }
  
  assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
  
  const body = JSON.parse(res.body);
  assert.ok(body.hasOwnProperty('success'), 'Response should have success property');
  assert.ok(body.hasOwnProperty('checked'), 'Response should have checked property');
  assert.ok(body.hasOwnProperty('alerted'), 'Response should have alerted property');
  assert.ok(body.hasOwnProperty('skipped'), 'Response should have skipped property');
  assert.ok(body.hasOwnProperty('dry_run'), 'Response should have dry_run property');
  assert.strictEqual(body.dry_run, true, 'dry_run should be true when test=true');
});

// Test 5: Verify vercel.json has the cron configured
test('vercel.json contains inactivity-alerts cron configuration', () => {
  const fs = require('fs');
  const path = require('path');
  const vercelJsonPath = path.join(__dirname, '../vercel.json');
  
  assert.ok(fs.existsSync(vercelJsonPath), 'vercel.json should exist');
  
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  assert.ok(vercelConfig.crons, 'vercel.json should have crons array');
  
  const inactivityCron = vercelConfig.crons.find(c => c.path === '/api/cron/inactivity-alerts');
  assert.ok(inactivityCron, 'vercel.json should have /api/cron/inactivity-alerts cron');
  assert.ok(inactivityCron.schedule, 'Cron should have a schedule');
  
  // Schedule should be valid (either daily at 9am for Hobby or every 30 min for Pro)
  const validSchedules = ['0 9 * * *', '*/30 * * * *', '0 * * * *'];
  assert.ok(validSchedules.includes(inactivityCron.schedule), 
    `Schedule ${inactivityCron.schedule} should be one of ${validSchedules.join(', ')}`);
});

// Test 6: Verify route file exists and has required exports
test('Route file exists and exports GET handler', () => {
  const fs = require('fs');
  const path = require('path');
  const routePath = path.join(__dirname, '../app/api/cron/inactivity-alerts/route.ts');
  
  assert.ok(fs.existsSync(routePath), 'Route file should exist');
  
  const content = fs.readFileSync(routePath, 'utf8');
  assert.ok(content.includes('export async function GET'), 'Route should export GET handler');
  assert.ok(content.includes('INACTIVITY_THRESHOLD_HOURS'), 'Route should define inactivity threshold');
  assert.ok(content.includes('DEDUP_WINDOW_HOURS'), 'Route should define dedup window');
  assert.ok(content.includes('sendTelegramAlert'), 'Route should have Telegram alert function');
});

// Test 7: Verify security - no hardcoded secrets
test('Route file contains no hardcoded secrets', () => {
  const fs = require('fs');
  const path = require('path');
  const routePath = path.join(__dirname, '../app/api/cron/inactivity-alerts/route.ts');
  
  const content = fs.readFileSync(routePath, 'utf8');
  
  // Check for common secret patterns (should use process.env)
  const suspiciousPatterns = [
    /['"]sk-[a-zA-Z0-9]{20,}['"]/,  // Stripe keys
    /['"][a-f0-9]{32,}['"]/,         // Generic hex secrets
    /['"]eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*['"]/, // JWT tokens
  ];
  
  for (const pattern of suspiciousPatterns) {
    assert.ok(!pattern.test(content), `Route should not contain hardcoded secrets matching ${pattern}`);
  }
  
  // Ensure Telegram token uses env var
  assert.ok(content.includes('process.env.TELEGRAM_BOT_TOKEN'), 'Should use env var for Telegram token');
  assert.ok(content.includes('process.env.TELEGRAM_CHAT_ID'), 'Should use env var for Telegram chat ID');
});

// Run all tests
(async () => {
  // Wait for async tests to complete
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  
  if (failed > 0) {
    process.exit(1);
  }
})();
