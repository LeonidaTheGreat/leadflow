/**
 * E2E test: trial-signup/route.ts writes UTM fields to agent record
 * Verifies utm_source, utm_medium, utm_campaign are persisted in the DB INSERT,
 * not just in analytics event logs.
 * Use case: fix-trial-signup-route-does-not-write-utm-to-agent-rec
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROUTE_FILE = path.join(
  __dirname,
  '../../product/lead-response/dashboard/app/api/auth/trial-signup/route.ts'
);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

const content = fs.readFileSync(ROUTE_FILE, 'utf8');

// Extract the first .insert({ block (for real_estate_agents, not leads/messages)
const insertMatch = content.match(/\.insert\(\{([\s\S]*?)\}\)\s*\n\s*\.select/);
const insertBlock = insertMatch ? insertMatch[1] : '';

// Test 1: UTM fields destructured from request body
test('utm_source, utm_medium, utm_campaign destructured from request body', () => {
  const destructureMatch = content.match(/const\s*\{[^}]+\}\s*=\s*await\s+request\.json\(\)/);
  assert.ok(destructureMatch, 'request.json() destructuring must exist');
  const destructureBlock = destructureMatch[0];
  assert.ok(destructureBlock.includes('utm_source'), 'utm_source must be destructured from request body');
  assert.ok(destructureBlock.includes('utm_medium'), 'utm_medium must be destructured from request body');
  assert.ok(destructureBlock.includes('utm_campaign'), 'utm_campaign must be destructured from request body');
});

// Test 2: UTM fields in the agents INSERT (first insert block, before .select())
test('utm_source included in agents INSERT statement', () => {
  assert.ok(insertBlock.length > 0, 'Could not find INSERT block before .select()');
  assert.ok(insertBlock.includes('utm_source'), 'utm_source must be in the agents INSERT block');
});

test('utm_medium included in agents INSERT statement', () => {
  assert.ok(insertBlock.length > 0, 'Could not find INSERT block before .select()');
  assert.ok(insertBlock.includes('utm_medium'), 'utm_medium must be in the agents INSERT block');
});

test('utm_campaign included in agents INSERT statement', () => {
  assert.ok(insertBlock.length > 0, 'Could not find INSERT block before .select()');
  assert.ok(insertBlock.includes('utm_campaign'), 'utm_campaign must be in the agents INSERT block');
});

// Test 3: UTM fields use null-safe pattern in INSERT
test('utm_source uses null fallback in INSERT (utm_source || null)', () => {
  assert.ok(
    /utm_source:\s*utm_source\s*\|\|\s*null/.test(insertBlock),
    'utm_source in INSERT should use `utm_source || null` null-safe pattern'
  );
});

async function runAsyncTests() {
  // Test 4: Verify DB columns exist
  const asyncTestName = 'real_estate_agents table has utm_source, utm_medium, utm_campaign columns';
  try {
    const { Client } = require('pg');
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
    const client = new Client({ connectionString: process.env.LOCAL_PG_URL });
    try {
      await client.connect();
      const result = await client.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'real_estate_agents'
           AND column_name IN ('utm_source', 'utm_medium', 'utm_campaign')
         ORDER BY column_name`
      );
      const cols = result.rows.map(r => r.column_name);
      assert.ok(cols.includes('utm_source'), 'utm_source column must exist in real_estate_agents');
      assert.ok(cols.includes('utm_medium'), 'utm_medium column must exist in real_estate_agents');
      assert.ok(cols.includes('utm_campaign'), 'utm_campaign column must exist in real_estate_agents');
      console.log(`✅ ${asyncTestName}`);
      passed++;
    } finally {
      await client.end();
    }
  } catch (err) {
    console.log(`❌ ${asyncTestName}: ${err.message}`);
    failed++;
  }
}

runAsyncTests().then(() => {
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}).catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
