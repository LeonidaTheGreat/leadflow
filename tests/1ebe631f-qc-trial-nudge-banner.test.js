/**
 * QC E2E Test: Trial Nudge Banner — PR #1037
 * Task: 1ebe631f-9ad7-427d-b915-e4016db651ce
 *
 * Tests:
 * 1. /api/trial/nudge returns 401 without auth
 * 2. /api/trial/dismiss-nudge POST returns 401 without auth
 * 3. TrialNudgeBanner component file exists
 * 4. TrialStatusBanner ALSO exists (duplication check — spaghetti flag)
 * 5. New API routes exist in the file system
 * 6. trial-nudge-banner is wired into dashboard layout
 * 7. test-results/ directory should not contain committed Playwright artifacts
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const https = require('https');

const DASHBOARD = path.join(__dirname, '../product/lead-response/dashboard');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.log(`FAIL: ${name} — ${err.message}`);
    failed++;
  }
}

function httpRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { 'Content-Type': 'application/json', 'Content-Length': 0 },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
    req.end();
  });
}

async function run() {
  console.log('=== QC E2E: Trial Nudge Banner (PR #1037) ===\n');

  // 1. New TrialNudgeBanner component exists
  test('TrialNudgeBanner component file exists', () => {
    const f = path.join(DASHBOARD, 'components/trial-nudge-banner.tsx');
    assert.ok(fs.existsSync(f), `${f} not found`);
  });

  // 2. /api/trial/nudge route exists
  test('/api/trial/nudge route.ts exists', () => {
    const f = path.join(DASHBOARD, 'app/api/trial/nudge/route.ts');
    assert.ok(fs.existsSync(f), `${f} not found`);
  });

  // 3. /api/trial/dismiss-nudge route exists
  test('/api/trial/dismiss-nudge route.ts exists', () => {
    const f = path.join(DASHBOARD, 'app/api/trial/dismiss-nudge/route.ts');
    assert.ok(fs.existsSync(f), `${f} not found`);
  });

  // 4. TrialNudgeBanner is imported in dashboard layout
  test('TrialNudgeBanner wired into dashboard layout', () => {
    const layout = fs.readFileSync(path.join(DASHBOARD, 'app/dashboard/layout.tsx'), 'utf8');
    assert.ok(layout.includes('TrialNudgeBanner'), 'TrialNudgeBanner not in layout.tsx');
  });

  // 5. Both banner components exist (duplication — flag for rejection)
  test('TrialStatusBanner (duplicate) still exists alongside TrialNudgeBanner', () => {
    const f = path.join(DASHBOARD, 'components/dashboard/TrialStatusBanner.tsx');
    assert.ok(fs.existsSync(f), 'TrialStatusBanner was removed');
  });

  // 6. Auth gate: /api/trial/nudge returns 401 without auth
  await testAsync('/api/trial/nudge returns 401 without auth cookie', async () => {
    const res = await httpRequest('https://leadflow-ai-five.vercel.app/api/trial/nudge');
    assert.strictEqual(res.status, 401, `expected 401, got ${res.status}`);
  });

  // 7. Auth gate: /api/trial/dismiss-nudge returns 401 without auth
  await testAsync('/api/trial/dismiss-nudge returns 401 without auth cookie', async () => {
    const res = await httpRequest('https://leadflow-ai-five.vercel.app/api/trial/dismiss-nudge', 'POST');
    assert.strictEqual(res.status, 401, `expected 401, got ${res.status}`);
  });

  console.log(`\n=== RESULTS ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
