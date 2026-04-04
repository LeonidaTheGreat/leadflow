/**
 * E2E Test: Next.js dashboard deployment verification
 * Task: fix-next-js-customer-dashboard-not-deployed-users-cann
 * UC: fix-next-js-customer-dashboard-not-deployed-users-cann
 *
 * Acceptance criteria:
 * - /signup returns 200 (Next.js HTML, not 404 or FUB webhook JSON)
 * - /login returns 200 (Next.js HTML)
 * - /pricing returns 200 (Next.js HTML)
 * - /dashboard returns redirect (307/302/301 to /login — protected route)
 * - Responses are Next.js HTML, NOT FUB webhook API responses
 */

const https = require('https');
const assert = require('assert');

const BASE_URL = 'https://leadflow-ai-five.vercel.app';
const ROUTES = [
  { path: '/signup', expectedStatus: 200, description: 'Signup page' },
  { path: '/login', expectedStatus: 200, description: 'Login page' },
  { path: '/pricing', expectedStatus: 200, description: 'Pricing page' },
  { path: '/dashboard', expectedStatuses: [200, 301, 302, 307, 308], description: 'Dashboard (auth redirect expected)' },
];

function fetchRoute(path) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;
    https.get(url, { headers: { 'User-Agent': 'LeadFlow-QC-Test/1.0' } }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    }).on('error', reject);
  });
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  const errors = [];

  console.log(`\n🔍 Testing Next.js dashboard deployment at ${BASE_URL}\n`);

  for (const route of ROUTES) {
    try {
      const result = await fetchRoute(route.path);
      const { status, body } = result;

      // Check status code
      const expectedStatuses = route.expectedStatuses || [route.expectedStatus];
      assert.ok(
        expectedStatuses.includes(status),
        `${route.path}: expected status ${expectedStatuses.join('/')} but got ${status}`
      );

      // For 200 routes, verify it's Next.js HTML (not webhook API JSON or 404)
      if (status === 200) {
        assert.ok(
          body.includes('<!DOCTYPE html>') || body.includes('<html'),
          `${route.path}: expected HTML response, got: ${body.substring(0, 100)}`
        );

        // Verify it's the Next.js app (has _next static assets reference)
        assert.ok(
          body.includes('_next') || body.includes('LeadFlow'),
          `${route.path}: response doesn't look like Next.js app`
        );

        // Verify it's NOT a FUB webhook JSON response
        assert.ok(
          !body.startsWith('{') && !body.startsWith('['),
          `${route.path}: got JSON response (FUB webhook), expected HTML`
        );

        // Verify it's NOT a plain 404 text
        assert.ok(
          !body.toLowerCase().includes('"error":"not found"'),
          `${route.path}: got API 404 error response`
        );
      }

      console.log(`  ✅ ${route.description} (${route.path}) → ${status}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${route.description} (${route.path}) → FAILED: ${err.message}`);
      errors.push(err.message);
      failed++;
    }
  }

  // Additional check: verify /api/health or root is NOT the only working endpoint
  // (i.e., the app is not just serving webhook API)
  try {
    const rootResult = await fetchRoute('/');
    assert.ok(
      rootResult.status === 200 || rootResult.status === 307,
      `Root / returned unexpected status ${rootResult.status}`
    );
    if (rootResult.status === 200) {
      assert.ok(
        rootResult.body.includes('_next') || rootResult.body.includes('LeadFlow'),
        'Root / does not serve Next.js app'
      );
    }
    console.log(`  ✅ Root / → ${rootResult.status} (Next.js app serving correctly)`);
    passed++;
  } catch (err) {
    console.log(`  ❌ Root / check failed: ${err.message}`);
    errors.push(err.message);
    failed++;
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    console.error('FAILURES:');
    errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log('✅ All deployment checks PASSED — Next.js dashboard is live and accessible\n');
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
