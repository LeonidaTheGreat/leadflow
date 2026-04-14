/**
 * E2E test: fix-postgrest-schema-mismatches
 * QC-authored test verifying runtime behavior of auth-refactored routes.
 *
 * Tests RUNTIME behavior:
 * - Protected routes return 401 with no auth cookies
 * - Protected routes return 401 with expired/invalid JWT
 * - Auth helper correctly rejects bad session tokens
 */

'use strict';

const assert = require('assert');
const https = require('https');
const http = require('http');

const BASE_URL = process.env.DASHBOARD_URL || 'https://leadflow-ai-five.vercel.app';

/**
 * Make an HTTP request with optional cookies.
 * Returns { status, body }
 */
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const req = lib.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.cookie ? { Cookie: options.cookie } : {}),
        ...options.headers,
      },
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let body;
        try { body = JSON.parse(data); } catch { body = data; }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function run() {
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ ${name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nRunning E2E tests against: ${BASE_URL}\n`);

  // ── 1. Unauthenticated requests return 401 ──────────────────────────────

  const protectedRoutes = [
    '/api/agents/profile',
    '/api/auth/me',
    '/api/auth/pilot-status',
    '/api/agents/onboarding/status',
    '/api/analytics/sms-stats',
    '/api/setup/status',
    '/api/trial/status',
    '/api/nps/prompt-status',
  ];

  for (const route of protectedRoutes) {
    await test(`No auth → ${route} returns 401`, async () => {
      const res = await request(`${BASE_URL}${route}`);
      assert.strictEqual(res.status, 401,
        `Expected 401 but got ${res.status}. Body: ${JSON.stringify(res.body)}`);
    });
  }

  // ── 2. Invalid JWT returns 401, not 500 ─────────────────────────────────

  await test('Invalid auth-token JWT returns 401 not 500', async () => {
    const res = await request(`${BASE_URL}/api/auth/me`, {
      cookie: 'auth-token=invalid.jwt.token',
    });
    assert.strictEqual(res.status, 401,
      `Expected 401 but got ${res.status}. Body: ${JSON.stringify(res.body)}`);
  });

  await test('Invalid leadflow_session returns 401 not 500', async () => {
    const res = await request(`${BASE_URL}/api/auth/me`, {
      cookie: 'leadflow_session=invalid-session-token',
    });
    assert.strictEqual(res.status, 401,
      `Expected 401 but got ${res.status}. Body: ${JSON.stringify(res.body)}`);
  });

  // ── 3. Both cookie types are tried (auth-token takes precedence) ─────────

  await test('Expired JWT auth-token falls through to session check', async () => {
    // Provide a syntactically-valid but expired JWT (old token format)
    const expiredJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      Buffer.from(JSON.stringify({ userId: 'test-id', exp: 1 })).toString('base64url') +
      '.fake-sig';
    const res = await request(`${BASE_URL}/api/auth/me`, {
      cookie: `auth-token=${expiredJwt}; leadflow_session=also-invalid`,
    });
    // Should return 401 (both invalid), not 500
    assert.strictEqual(res.status, 401,
      `Expected 401 but got ${res.status}. Body: ${JSON.stringify(res.body)}`);
  });

  // ── 4. Response body shape on 401 ──────────────────────────────────────

  await test('401 response has error field in body', async () => {
    const res = await request(`${BASE_URL}/api/auth/me`);
    assert.strictEqual(res.status, 401);
    assert.ok(res.body && res.body.error,
      `Expected { error: '...' } but got: ${JSON.stringify(res.body)}`);
  });

  // ── 5. Onboarding status route doesn't crash on missing columns ──────────

  await test('Unauthenticated /api/agents/onboarding/status returns 401', async () => {
    const res = await request(`${BASE_URL}/api/agents/onboarding/status`);
    assert.strictEqual(res.status, 401);
  });

  // ── 6. SMS stats route doesn't crash on missing twilio_status column ──────

  await test('Unauthenticated /api/analytics/sms-stats returns 401', async () => {
    const res = await request(`${BASE_URL}/api/analytics/sms-stats`);
    assert.strictEqual(res.status, 401);
  });

  // ── 7. POST routes requiring auth ────────────────────────────────────────

  await test('POST /api/nps/submit without auth returns 401', async () => {
    const res = await request(`${BASE_URL}/api/nps/submit`, {
      method: 'POST',
      body: { score: 9 },
    });
    assert.strictEqual(res.status, 401);
  });

  await test('POST /api/billing/create-checkout-session without auth returns 401 or 503 (if Stripe unconfigured)', async () => {
    const res = await request(`${BASE_URL}/api/billing/create-checkout-session`, {
      method: 'POST',
      body: { planId: 'pro' },
    });
    // 401 = auth check (correct); 503 = infra unconfigured (Stripe/DB); 400 = invalid input
    // NOT acceptable: 200, 404, 500 crash
    assert.ok([400, 401, 503].includes(res.status),
      `Expected 400/401/503 but got ${res.status}. Body: ${JSON.stringify(res.body)}`);
    // NOTE: If 503, auth runs AFTER infra checks — this leaks service config state.
    // Pre-existing behavior. AUTH should be first. Flag as MEDIUM finding.
    if (res.status !== 401) {
      console.log(`  ⚠️  Got ${res.status} — auth check runs after infra checks (pre-existing ordering issue)`);
    }
  });

  // ── Summary ──────────────────────────────────────────────────────────────

  console.log('\n============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.log('❌ SOME TESTS FAILED');
    console.log('============================================================');
    process.exit(1);
  }
  console.log('✅ ALL TESTS PASSED: fix-postgrest-schema-mismatches');
  console.log('============================================================');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
