/**
 * E2E Test: Production domain routing verification
 * Task: fix-production-domain-leadflow-ai-five-vercel-app-serv
 * Verifies leadflow-ai-five.vercel.app serves Next.js dashboard, NOT FUB webhook
 */

const https = require('https');
const assert = require('assert');

const PROD_URL = 'https://leadflow-ai-five.vercel.app';

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers, finalUrl: res.headers.location || url }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

async function run() {
  let passed = 0;
  let failed = 0;
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
      results.push({ name, pass: true });
    } catch (e) {
      console.log(`  ❌ ${name}: ${e.message}`);
      failed++;
      results.push({ name, pass: false, error: e.message });
    }
  }

  console.log('\n🔍 Production Domain Routing Tests\n');

  // Core: root must serve Next.js, not FUB webhook JSON
  await check('Root / returns Next.js HTML (not FUB webhook JSON)', async () => {
    const r = await get(`${PROD_URL}/`);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}`);
    assert.ok(r.body.includes('<!DOCTYPE html') || r.body.includes('<html'), 'Not an HTML response — likely serving JSON/raw text');
    assert.ok(!r.body.startsWith('{"status":"ok"'), 'Still serving FUB webhook JSON at root!');
    assert.ok(r.body.includes('LeadFlow') || r.body.includes('_next'), 'Does not look like the LeadFlow Next.js dashboard');
  });

  // Signup must exist
  await check('/signup returns 200', async () => {
    const r = await get(`${PROD_URL}/signup`);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}`);
    assert.ok(r.body.includes('<html') || r.body.includes('<!DOCTYPE'), 'Not an HTML page');
  });

  // Login must exist
  await check('/login returns 200', async () => {
    const r = await get(`${PROD_URL}/login`);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}`);
    assert.ok(r.body.includes('<html') || r.body.includes('<!DOCTYPE'), 'Not an HTML page');
  });

  // Dashboard redirects unauthenticated users
  await check('/dashboard redirects unauthenticated (307/302/301)', async () => {
    const r = await get(`${PROD_URL}/dashboard`);
    assert.ok([301, 302, 307, 308].includes(r.status), `Expected redirect, got ${r.status}`);
  });

  // Settings redirects unauthenticated users
  await check('/settings redirects unauthenticated (307/302/301)', async () => {
    const r = await get(`${PROD_URL}/settings`);
    assert.ok([301, 302, 307, 308].includes(r.status), `Expected redirect, got ${r.status}`);
  });

  // Admin simulator accessible
  await check('/admin/simulator returns 200', async () => {
    const r = await get(`${PROD_URL}/admin/simulator`);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}`);
  });

  // Health API confirms ok
  await check('/api/health returns ok JSON', async () => {
    const r = await get(`${PROD_URL}/api/health`);
    assert.strictEqual(r.status, 200, `Expected 200, got ${r.status}`);
    let parsed;
    try { parsed = JSON.parse(r.body); } catch (e) { throw new Error('Response is not valid JSON'); }
    assert.strictEqual(parsed.status, 'ok', `Health status is not ok: ${JSON.stringify(parsed)}`);
  });

  // Root must NOT serve FUB webhook API style response
  await check('Root / is NOT the FUB Express server.js', async () => {
    const r = await get(`${PROD_URL}/`);
    assert.ok(!r.body.includes('"followUpBoss"'), 'Root is serving FUB webhook response');
    assert.ok(!r.body.includes('webhook'), 'Root appears to serve webhook content');
  });

  console.log(`\n📋 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.log('FAIL');
    process.exit(1);
  } else {
    console.log('PASS');
    process.exit(0);
  }
}

run().catch(e => {
  console.error('Test runner error:', e.message);
  process.exit(1);
});
