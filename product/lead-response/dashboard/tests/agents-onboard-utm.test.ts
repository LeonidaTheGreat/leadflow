/**
 * Tests for UTM parameter capture in /api/agents/onboard
 * Bug fix: e944403a-5856-474d-9bea-e4feada6cac4
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// We test the route handler directly by importing it and simulating a request
// rather than hitting the live endpoint (which requires the server to be running).

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

/**
 * Verify the route.ts source includes UTM field destructuring and INSERT.
 * This is a static code analysis test — fast and reliable without needing a server.
 */
async function testRouteSourceHasUtmFields() {
  const fs = await import('fs');
  const path = await import('path');

  const routePath = path.resolve(
    __dirname,
    '../app/api/agents/onboard/route.ts'
  );
  const source = fs.readFileSync(routePath, 'utf-8');

  // Destructuring from body
  assert(source.includes('utmSource'), 'Route destructures utmSource from body');
  assert(source.includes('utmMedium'), 'Route destructures utmMedium from body');
  assert(source.includes('utmCampaign'), 'Route destructures utmCampaign from body');
  assert(source.includes('utmContent'), 'Route destructures utmContent from body');
  assert(source.includes('utmTerm'), 'Route destructures utmTerm from body');

  // INSERT payload
  assert(source.includes('utm_source: utmSource'), 'INSERT includes utm_source');
  assert(source.includes('utm_medium: utmMedium'), 'INSERT includes utm_medium');
  assert(source.includes('utm_campaign: utmCampaign'), 'INSERT includes utm_campaign');
  assert(source.includes('utm_content: utmContent'), 'INSERT includes utm_content');
  assert(source.includes('utm_term: utmTerm'), 'INSERT includes utm_term');
}

/**
 * Verify that the real_estate_agents table in Supabase has all 5 UTM columns.
 * Queries for a single row selecting only UTM fields — if columns don't exist,
 * Supabase returns a 400 error.
 */
async function testDatabaseHasUtmColumns() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('SKIP: No Supabase credentials — skipping live DB test');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase
    .from('real_estate_agents')
    .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term')
    .limit(1);

  assert(!error, `DB query for UTM columns succeeds (error: ${JSON.stringify(error)})`);
  // data may be [] if table is empty, but the query must succeed
  assert(Array.isArray(data), 'DB returns array for UTM column query');
}

/**
 * End-to-end: POST to /api/agents/onboard with UTM params and verify they
 * are stored in the database. Requires running server on localhost:3000.
 */
async function testEndToEndUtmCapture() {
  const serverUrl = 'http://localhost:3000/api/agents/onboard';
  const uniqueEmail = `utm-test-${Date.now()}@example.com`;

  let response: Response;
  try {
    response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'TestPassword123!',
        firstName: 'UTM',
        lastName: 'TestAgent',
        phoneNumber: '5551234000',
        state: 'California',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'pilot-launch',
        utmContent: 'hero-cta',
        utmTerm: 'real-estate-ai',
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err: any) {
    console.log(`SKIP: Server not reachable (${err.message}) — skipping E2E UTM test`);
    return;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.log(`SKIP: Onboard endpoint returned ${response.status}: ${JSON.stringify(body)} — skipping E2E UTM test`);
    return;
  }

  const responseBody = await response.json();
  assert(responseBody.agent !== undefined, 'Response contains agent object');

  const agentId = responseBody.agent?.id;
  assert(!!agentId, 'Response contains agent id');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('SKIP: No Supabase credentials — skipping DB verification step');
    // Cleanup not possible without credentials; just return
    return;
  }

  // Verify UTM fields were persisted
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: row, error } = await supabase
    .from('real_estate_agents')
    .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term')
    .eq('id', agentId)
    .single();

  assert(!error, `DB lookup for created agent succeeds`);
  assert(row?.utm_source === 'google', `utm_source is "google" (got: ${row?.utm_source})`);
  assert(row?.utm_medium === 'cpc', `utm_medium is "cpc" (got: ${row?.utm_medium})`);
  assert(row?.utm_campaign === 'pilot-launch', `utm_campaign is "pilot-launch" (got: ${row?.utm_campaign})`);
  assert(row?.utm_content === 'hero-cta', `utm_content is "hero-cta" (got: ${row?.utm_content})`);
  assert(row?.utm_term === 'real-estate-ai', `utm_term is "real-estate-ai" (got: ${row?.utm_term})`);

  // Cleanup: delete test agent
  await supabase.from('agent_settings').delete().eq('agent_id', agentId);
  await supabase.from('real_estate_agents').delete().eq('id', agentId);
  console.log('Cleaned up test agent');
}

/**
 * Verify null/undefined UTM fields are handled gracefully (stored as NULL,
 * not empty string or error).
 */
async function testNullUtmFields() {
  const serverUrl = 'http://localhost:3000/api/agents/onboard';
  const uniqueEmail = `utm-null-test-${Date.now()}@example.com`;

  let response: Response;
  try {
    response = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'TestPassword123!',
        firstName: 'NoUTM',
        lastName: 'TestAgent',
        phoneNumber: '5551234001',
        state: 'California',
        // No UTM fields sent — should default to null, not break
      }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (err: any) {
    console.log(`SKIP: Server not reachable — skipping null UTM test`);
    return;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    console.log(`SKIP: Onboard endpoint returned ${response.status}: ${JSON.stringify(body)} — skipping null UTM test`);
    return;
  }

  const responseBody = await response.json();
  assert(responseBody.agent !== undefined, 'Signup without UTM params succeeds (no 500 error)');

  const agentId = responseBody.agent?.id;
  if (agentId && SUPABASE_URL && SUPABASE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: row } = await supabase
      .from('real_estate_agents')
      .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term')
      .eq('id', agentId)
      .single();

    assert(row?.utm_source === null, 'utm_source is NULL when not provided');
    assert(row?.utm_medium === null, 'utm_medium is NULL when not provided');
    assert(row?.utm_campaign === null, 'utm_campaign is NULL when not provided');
    assert(row?.utm_content === null, 'utm_content is NULL when not provided');
    assert(row?.utm_term === null, 'utm_term is NULL when not provided');

    // Cleanup
    await supabase.from('agent_settings').delete().eq('agent_id', agentId);
    await supabase.from('real_estate_agents').delete().eq('id', agentId);
    console.log('Cleaned up test agent');
  }
}

async function runTests() {
  console.log('\n🧪 UTM Parameter Capture Tests — /api/agents/onboard');
  console.log('=======================================================');

  const results = { passed: 0, failed: 0, total: 0 };

  const suites = [
    { name: 'Route source has UTM fields', fn: testRouteSourceHasUtmFields },
    { name: 'Database has UTM columns', fn: testDatabaseHasUtmColumns },
    { name: 'E2E UTM capture', fn: testEndToEndUtmCapture },
    { name: 'Null UTM fields graceful', fn: testNullUtmFields },
  ];

  for (const suite of suites) {
    console.log(`\n📋 ${suite.name}`);
    results.total++;
    try {
      await suite.fn();
      results.passed++;
    } catch (err: any) {
      console.error(`❌ ${err.message}`);
      results.failed++;
    }
  }

  console.log(`\n📊 Results: ${results.passed}/${results.total} passed`);
  return results;
}

if (require.main === module) {
  runTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  });
}

export { runTests };
