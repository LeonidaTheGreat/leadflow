const assert = require('assert');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BASE_URL = 'https://leadflow-ai-five.vercel.app';

async function run() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  assert(supabaseUrl, 'Missing NEXT_PUBLIC_SUPABASE_URL');
  assert(serviceRoleKey, 'Missing SUPABASE_SERVICE_ROLE_KEY');

  const sb = createClient(supabaseUrl, serviceRoleKey);
  const email = `qc.pilot.${Date.now()}@example.com`;
  const password = 'PilotPass123!';

  // 1) Auth: protected pilot status route must reject without auth
  {
    const res = await fetch(`${BASE_URL}/api/auth/pilot-status`);
    assert.strictEqual(res.status, 401, 'Expected 401 without auth for /api/auth/pilot-status');
  }

  // 2) Edge case: invalid signup payload should return 400
  {
    const res = await fetch(`${BASE_URL}/api/auth/pilot-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bad-email', password: '123' })
    });
    assert.strictEqual(res.status, 400, 'Expected 400 for invalid pilot signup payload');
  }

  // 3) Happy path signup (no credit card) must succeed
  let signupBody;
  {
    const res = await fetch(`${BASE_URL}/api/auth/pilot-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'QC Pilot',
        brokerage_name: 'QC Realty',
        fub_api_key: 'fub_test_qc_key'
      })
    });

    assert.strictEqual(res.status, 200, 'Expected 200 for valid pilot signup');
    signupBody = await res.json();
    assert.strictEqual(signupBody.success, true, 'Expected success=true');
    assert.strictEqual(signupBody.redirectTo, '/setup', 'Expected redirectTo=/setup');
  }

  // 4) DB verification: agent created with pilot fields and no Stripe customer id
  {
    const { data: agent, error } = await sb
      .from('real_estate_agents')
      .select('id,email,plan_tier,pilot_started_at,pilot_expires_at,stripe_customer_id')
      .eq('email', email)
      .single();

    assert.ifError(error);
    assert(agent, 'Agent row not found in DB');
    assert.strictEqual(agent.plan_tier, 'pilot', 'Expected plan_tier=pilot');
    assert(agent.pilot_started_at, 'Expected pilot_started_at to be set');
    assert(agent.pilot_expires_at, 'Expected pilot_expires_at to be set');
    assert.strictEqual(agent.stripe_customer_id, null, 'Expected stripe_customer_id=null for pilot signup');

    const started = new Date(agent.pilot_started_at).getTime();
    const expires = new Date(agent.pilot_expires_at).getTime();
    const days = (expires - started) / (1000 * 60 * 60 * 24);
    assert(days >= 59.9 && days <= 60.1, `Expected ~60-day pilot window, got ${days}`);
  }

  // 5) Edge case: duplicate signup should return 409
  {
    const res = await fetch(`${BASE_URL}/api/auth/pilot-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    assert.strictEqual(res.status, 409, 'Expected 409 on duplicate pilot signup');
  }

  console.log('PASS: free-pilot-no-credit-card-required E2E');
}

run().catch((err) => {
  console.error('FAIL: free-pilot-no-credit-card-required E2E');
  console.error(err);
  process.exit(1);
});
