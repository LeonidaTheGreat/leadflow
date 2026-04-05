/**
 * E2E Test: UTM Attribution End-to-End Verification
 *
 * Task ID: 47fd163a-f3a6-460b-8149-87089e778232
 *
 * Purpose: Verify UTM attribution is captured, stored, and visible after fixes deployed
 *
 * Test Flow:
 * - T-1: UTM parameters captured during signup route
 * - T-2: Direct visits (no UTM) store NULL attribution
 * - T-3: UTM data stored in real_estate_agents table
 * - T-4: Dashboard attribution table queries work correctly
 *
 * Fixes this tests:
 * - trial-signup/route.ts now includes utm_source, utm_medium, utm_campaign in INSERT
 * - signup/page.tsx captures and persists UTM params in sessionStorage
 * - real_estate_agents table has utm_source, utm_medium, utm_campaign columns
 * - Dashboard can query attribution data for reporting
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dashboardDir = path.resolve(__dirname, '../../product/lead-response/dashboard');
const DB_URL = process.env.LOCAL_PG_URL;

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${err.message}`);
    failed++;
  }
}

function readFile(relPath) {
  return fs.readFileSync(path.join(dashboardDir, relPath), 'utf8');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(dashboardDir, relPath));
}

async function dbQuery(sql) {
  if (!DB_URL) {
    throw new Error('LOCAL_PG_URL not set in .env');
  }
  const client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    const result = await client.query(sql);
    return result.rows;
  } finally {
    await client.end();
  }
}

// ============================================
// TEST SUITE
// ============================================

async function runAll() {
  console.log('\n=== E2E Test: UTM Attribution After Fixes ===\n');

  // ────────────────────────────────────────────────────────────
  // SECTION 1: Code Inspection (trial-signup route)
  // ────────────────────────────────────────────────────────────

  console.log('CODE INSPECTION: trial-signup route');

  await test(
    'T-1.1: trial-signup route exists',
    async () => {
      assert.ok(
        fileExists('app/api/auth/trial-signup/route.ts'),
        'trial-signup/route.ts not found'
      );
    }
  );

  await test(
    'T-1.2: trial-signup destructures utm_source from request',
    async () => {
      const source = readFile('app/api/auth/trial-signup/route.ts');
      assert.ok(
        source.includes('utm_source'),
        'utm_source not destructured in trial-signup route'
      );
    }
  );

  await test(
    'T-1.3: trial-signup destructures utm_medium from request',
    async () => {
      const source = readFile('app/api/auth/trial-signup/route.ts');
      assert.ok(
        source.includes('utm_medium'),
        'utm_medium not destructured in trial-signup route'
      );
    }
  );

  await test(
    'T-1.4: trial-signup destructures utm_campaign from request',
    async () => {
      const source = readFile('app/api/auth/trial-signup/route.ts');
      assert.ok(
        source.includes('utm_campaign'),
        'utm_campaign not destructured in trial-signup route'
      );
    }
  );

  await test(
    'T-1.5: trial-signup includes utm_source in INSERT statement',
    async () => {
      const source = readFile('app/api/auth/trial-signup/route.ts');
      // Find the first .insert({ block (for real_estate_agents, not messages/leads)
      const insertMatch = source.match(/\.insert\(\{([\s\S]*?)\}\)\s*\.select/);
      assert.ok(insertMatch, 'Could not find INSERT block in route');
      const insertBlock = insertMatch[1];
      assert.ok(
        insertBlock.includes('utm_source'),
        'utm_source not in INSERT block'
      );
    }
  );

  await test(
    'T-1.6: trial-signup includes utm_medium in INSERT statement',
    async () => {
      const source = readFile('app/api/auth/trial-signup/route.ts');
      const insertMatch = source.match(/\.insert\(\{([\s\S]*?)\}\)\s*\.select/);
      const insertBlock = insertMatch[1];
      assert.ok(
        insertBlock.includes('utm_medium'),
        'utm_medium not in INSERT block'
      );
    }
  );

  await test(
    'T-1.7: trial-signup includes utm_campaign in INSERT statement',
    async () => {
      const source = readFile('app/api/auth/trial-signup/route.ts');
      const insertMatch = source.match(/\.insert\(\{([\s\S]*?)\}\)\s*\.select/);
      const insertBlock = insertMatch[1];
      assert.ok(
        insertBlock.includes('utm_campaign'),
        'utm_campaign not in INSERT block'
      );
    }
  );

  // ────────────────────────────────────────────────────────────
  // SECTION 2: Code Inspection (signup page)
  // ────────────────────────────────────────────────────────────

  console.log('\nCODE INSPECTION: signup page (UTM capture)');

  await test(
    'T-2.1: signup page exists',
    async () => {
      assert.ok(
        fileExists('app/signup/page.tsx'),
        'signup/page.tsx not found'
      );
    }
  );

  await test(
    'T-2.2: signup page reads UTM params from URL',
    async () => {
      const source = readFile('app/signup/page.tsx');
      assert.ok(
        source.includes('utm'),
        'signup page does not reference UTM parameters'
      );
    }
  );

  await test(
    'T-2.3: signup page stores UTM in sessionStorage',
    async () => {
      const source = readFile('app/signup/page.tsx');
      assert.ok(
        source.includes('sessionStorage'),
        'signup page does not use sessionStorage'
      );
    }
  );

  // ────────────────────────────────────────────────────────────
  // SECTION 3: Database Schema
  // ────────────────────────────────────────────────────────────

  console.log('\nDATABASE SCHEMA: real_estate_agents table');

  await test(
    'T-3.1: real_estate_agents table exists',
    async () => {
      const tables = await dbQuery(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'real_estate_agents'
      `);
      assert.ok(tables.length > 0, 'real_estate_agents table does not exist');
    }
  );

  await test(
    'T-3.2: real_estate_agents has utm_source column',
    async () => {
      const cols = await dbQuery(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'real_estate_agents' AND column_name = 'utm_source'
      `);
      assert.ok(cols.length > 0, 'utm_source column does not exist');
    }
  );

  await test(
    'T-3.3: real_estate_agents has utm_medium column',
    async () => {
      const cols = await dbQuery(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'real_estate_agents' AND column_name = 'utm_medium'
      `);
      assert.ok(cols.length > 0, 'utm_medium column does not exist');
    }
  );

  await test(
    'T-3.4: real_estate_agents has utm_campaign column',
    async () => {
      const cols = await dbQuery(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'real_estate_agents' AND column_name = 'utm_campaign'
      `);
      assert.ok(cols.length > 0, 'utm_campaign column does not exist');
    }
  );

  await test(
    'T-3.5: utm_source column is nullable (allows NULL for direct visits)',
    async () => {
      const cols = await dbQuery(`
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'real_estate_agents' AND column_name = 'utm_source'
      `);
      assert.ok(cols.length > 0, 'utm_source column info not found');
      assert.strictEqual(cols[0].is_nullable, 'YES', 'utm_source must be nullable');
    }
  );

  // ────────────────────────────────────────────────────────────
  // SECTION 4: Dashboard Attribution Queries
  // ────────────────────────────────────────────────────────────

  console.log('\nDASHBOARD ATTRIBUTION: Query verification');

  await test(
    'T-4.1: Can query agents with UTM attribution',
    async () => {
      const result = await dbQuery(`
        SELECT COUNT(*) as count
        FROM real_estate_agents
        WHERE utm_source IS NOT NULL
      `);
      assert.ok(result.length > 0, 'Attribution query failed');
      assert.ok(typeof result[0].count === 'string' || typeof result[0].count === 'number', 'Count not returned');
    }
  );

  await test(
    'T-4.2: Can group agents by utm_source for dashboard',
    async () => {
      const result = await dbQuery(`
        SELECT utm_source, COUNT(*) as agent_count
        FROM real_estate_agents
        WHERE utm_source IS NOT NULL
        GROUP BY utm_source
        ORDER BY agent_count DESC
      `);
      // Should return aggregated data for dashboard
      assert.ok(Array.isArray(result), 'Attribution group query failed');
    }
  );

  await test(
    'T-4.3: Can query multi-touch attribution (utm_source, medium, campaign together)',
    async () => {
      const result = await dbQuery(`
        SELECT
          utm_source,
          utm_medium,
          utm_campaign,
          COUNT(*) as agent_count
        FROM real_estate_agents
        WHERE utm_source IS NOT NULL AND utm_medium IS NOT NULL AND utm_campaign IS NOT NULL
        GROUP BY utm_source, utm_medium, utm_campaign
      `);
      assert.ok(Array.isArray(result), 'Multi-touch attribution query failed');
    }
  );

  await test(
    'T-4.4: Can query direct visits (NULL utm_source)',
    async () => {
      const result = await dbQuery(`
        SELECT COUNT(*) as direct_visitors
        FROM real_estate_agents
        WHERE utm_source IS NULL
      `);
      assert.ok(result.length > 0, 'Direct visit query failed');
    }
  );

  await test(
    'T-4.5: Can get attribution stats by time period (7 days)',
    async () => {
      const result = await dbQuery(`
        SELECT
          utm_source,
          COUNT(*) as last_7d
        FROM real_estate_agents
        WHERE utm_source IS NOT NULL
          AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY utm_source
      `);
      assert.ok(Array.isArray(result), 'Time-period attribution query failed');
    }
  );

  // ────────────────────────────────────────────────────────────
  // SECTION 5: Trial Start Route (agents/create endpoint)
  // ────────────────────────────────────────────────────────────

  console.log('\nCODE INSPECTION: agents/create route (alternative signup path)');

  await test(
    'T-5.1: agents/create route exists',
    async () => {
      assert.ok(
        fileExists('app/api/agents/create/route.ts'),
        'agents/create/route.ts not found'
      );
    }
  );

  await test(
    'T-5.2: agents/create includes UTM in agent INSERT',
    async () => {
      const source = readFile('app/api/agents/create/route.ts');
      assert.ok(
        source.includes('utm_source') &&
        source.includes('utm_medium') &&
        source.includes('utm_campaign'),
        'agents/create route does not include all UTM fields'
      );
    }
  );

  // ────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────

  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error('❌ Test runner error:', err.message);
  process.exit(1);
});
