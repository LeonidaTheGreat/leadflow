/**
 * E2E Test: fix-email-delivery-non-functional-resend-api-key-not-s
 * Verifies that RESEND_API_KEY is set in Vercel and surfaced by the health endpoint.
 */

const assert = require('assert');
const https = require('https');

const HEALTH_URL = 'https://leadflow-ai-five.vercel.app/api/health';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('🧪 fix-email-delivery: RESEND_API_KEY health check\n');

  // Test 1: Health endpoint returns 200
  const { status, body } = await get(HEALTH_URL);
  assert.strictEqual(status, 200, `Expected HTTP 200, got ${status}`);
  console.log('✅ PASS: Health endpoint returns HTTP 200');

  // Test 2: Overall status is "ok"
  assert.strictEqual(body.status, 'ok', `Expected status "ok", got "${body.status}". Errors: ${JSON.stringify(body.errors)}`);
  console.log('✅ PASS: Overall health status is "ok"');

  // Test 3: RESEND_API_KEY check exists in response
  assert.ok(body.checks['RESEND_API_KEY'], 'RESEND_API_KEY check missing from health response');
  console.log('✅ PASS: RESEND_API_KEY check present in health response');

  // Test 4: RESEND_API_KEY is set (not missing/placeholder)
  const resendCheck = body.checks['RESEND_API_KEY'];
  assert.strictEqual(resendCheck.ok, true, `RESEND_API_KEY not set in Vercel. Detail: "${resendCheck.detail}"`);
  assert.strictEqual(resendCheck.detail, 'set', `Expected detail "set", got "${resendCheck.detail}"`);
  console.log('✅ PASS: RESEND_API_KEY is set in Vercel (not missing/placeholder)');

  // Test 5: All required env vars are set
  const envVars = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'];
  for (const key of envVars) {
    assert.ok(body.checks[key]?.ok, `Env var ${key} is not set. Detail: "${body.checks[key]?.detail}"`);
  }
  console.log('✅ PASS: All required env vars are set in Vercel');

  // Test 6: Supabase connectivity
  assert.ok(body.checks['supabase_connectivity']?.ok, 'Supabase connectivity check failed');
  console.log('✅ PASS: Supabase connectivity verified');

  console.log('\n============================================================');
  console.log('📊 TEST REPORT');
  console.log('============================================================');
  console.log('✅ Passed: 6');
  console.log('❌ Failed: 0');
  console.log('📈 Success Rate: 100%');
  console.log('\n🎉 RESEND_API_KEY confirmed set in Vercel — email delivery should be functional.');
}

run().catch((err) => {
  console.error('❌ FAIL:', err.message);
  process.exit(1);
});
