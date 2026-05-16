/**
 * TASK SPEC
 * What:
 * - Update product/lead-response/dashboard/tests/fix-api-health-endpoint-wrong-table.test.js
 *   to assert the current /api/health implementation queries real_estate_agents using
 *   postgrestAdmin and does not reference agents.
 * Verify:
 * - Run: node product/lead-response/dashboard/tests/fix-api-health-endpoint-wrong-table.test.js
 *   Expected: all checks pass, exit code 0.
 * - Run: npm test
 *   Expected: repository test suite passes.
 * - Run: npm run build
 *   Expected: build succeeds.
 * - Run: rg -n "from\\('agents'\\)" product/lead-response/dashboard/app/api/health/route.ts
 *   Expected: no matches.
 * Boundaries:
 * - Do not modify route logic in app/api/health/route.ts unless verification proves bug exists.
 * - Do not touch unrelated routes/services/schema/migrations.
 */
/**
 * E2E Test: fix-api-health-endpoint-wrong-table
 * Verifies that /api/health queries real_estate_agents (not agents)
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

// 1. Must query real_estate_agents
test('queries real_estate_agents table', () => {
  assert.ok(
    source.includes("postgrestAdmin\n        .from('real_estate_agents')"),
    "route.ts must query 'real_estate_agents'"
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
test('uses select id with limit 1', () => {
  assert.ok(
    source.includes(".select('id')") && source.includes(".limit(1)"),
    "query should select id with limit 1"
  );
});

// 4. Supabase connectivity check still exists
test('database and api_connectivity checks are present', () => {
  assert.ok(
    source.includes("checks['database']") && source.includes("checks['api_connectivity']"),
    "database and api_connectivity checks must exist"
  );
});

// 5. Comment documents intent
test('comment documents real_estate_agents intent', () => {
  assert.ok(
    source.includes('real_estate_agents'),
    'table name real_estate_agents present in source'
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
