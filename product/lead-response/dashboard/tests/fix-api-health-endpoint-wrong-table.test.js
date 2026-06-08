/**
 * E2E Test: fix-api-health-endpoint-wrong-table
 * Verifies that /api/health queries real_estate_agents (not agents)
 * and uses the correct PostgREST client (postgrestAdmin) with proper URL construction.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROUTE_FILE = path.join(
  __dirname,
  '../app/api/health/route.ts'
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n=== E2E: fix-api-health-endpoint-wrong-table ===\n');

const source = fs.readFileSync(ROUTE_FILE, 'utf8');

// 1. Must query real_estate_agents via postgrestAdmin
test('queries real_estate_agents table via postgrestAdmin', () => {
  assert.ok(
    source.includes("postgrestAdmin") && source.includes("real_estate_agents"),
    "route.ts must use postgrestAdmin and query 'real_estate_agents'"
  );
});

// 2. Must NOT query agents table
test('does NOT query agents table', () => {
  assert.ok(
    !source.includes(".from('agents')"),
    "route.ts must NOT query 'agents' table"
  );
});

// 3. Still selects id with limit 1 (minimal query)
test('uses select id and limit 1', () => {
  assert.ok(
    source.includes(".select('id')") && source.includes(".limit(1)"),
    "query should select id and use limit 1"
  );
});

// 4. api_connectivity check key is present (replaced supabase_connectivity)
test('api_connectivity check key is present', () => {
  assert.ok(
    source.includes("api_connectivity"),
    "api_connectivity check must exist in health route"
  );
});

// 5. Does NOT use new URL('/table', base) pattern — absolute path drops base path segments
test('no broken new URL with absolute path (would drop /rest/v1)', () => {
  // new URL('/something', baseUrl) loses the path from baseUrl (e.g. /rest/v1).
  // The correct approach is string interpolation: `${baseUrl}/${table}`.
  const brokenPattern = /new URL\s*\(\s*['"`]\/[^/]/;
  assert.ok(
    !brokenPattern.test(source),
    "route.ts must not use new URL('/table', base) — it drops path segments from base URL"
  );
});

// 6. No hardcoded secrets
test('no hardcoded secrets', () => {
  const secretPatterns = [/sk-[a-zA-Z0-9]{20,}/, /eyJ[a-zA-Z0-9]{30,}/];
  for (const pattern of secretPatterns) {
    assert.ok(!pattern.test(source), `hardcoded secret pattern found: ${pattern}`);
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}
