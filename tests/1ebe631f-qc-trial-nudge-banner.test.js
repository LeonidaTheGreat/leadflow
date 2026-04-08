/**
 * QC E2E Test: Trial Nudge Banner — PR #1037
 * Task: 1ebe631f-9ad7-427d-b915-e4016db651ce
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

function httpRequest(url, method) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method || 'GET',
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

  test('TrialNudgeBanner component file exists', () => {
    assert.ok(fs.existsSync(path.join(DASHBOARD, 'components/trial-nudge-banner.tsx')));
  });

  test('/api/trial/nudge route.ts exists', () => {
    assert.ok(fs.existsSync(path.join(DASHBOARD, 'app/api/trial/nudge/route.ts')));
  });

  test('/api/trial/dismiss-nudge route.ts exists', () => {
    assert.ok(fs.existsSync(path.join(DASHBOARD, 'app/api/trial/dismiss-nudge/route.ts')));
  });

  test('TrialNudgeBanner wired into dashboard layout', () => {
    const layout = fs.readFileSync(path.join(DASHBOARD, 'app/dashboard/layout.tsx'), 'utf8');
    assert.ok(layout.includes('TrialNudgeBanner'), 'TrialNudgeBanner not in layout.tsx');
  });

  test('TrialStatusBanner duplicate exists — spaghetti flag', () => {
    const f = path.join(DASHBOARD, 'components/dashboard/TrialStatusBanner.tsx');
    assert.ok(fs.existsSync(f), 'TrialStatusBanner was removed');
  });

  await testAsync('/api/trial/nudge returns 401 without auth', async () => {
    const res = await httpRequest('https://leadflow-ai-five.vercel.app/api/trial/nudge', 'GET');
    assert.strictEqual(res.status, 401, `expected 401, got ${res.status}`);
  });

  await testAsync('/api/trial/dismiss-nudge returns 401 without auth', async () => {
    const res = await httpRequest('https://leadflow-ai-five.vercel.app/api/trial/dismiss-nudge', 'POST');
    assert.strictEqual(res.status, 401, `expected 401, got ${res.status}`);
  });

  console.log(`\n=== RESULTS ===\nPassed: ${passed}\nFailed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error(err); process.exit(1); });
