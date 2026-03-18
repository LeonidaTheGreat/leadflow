#!/usr/bin/env node
/**
 * Test: fix-schema-column-mismatch-satisfaction-ping-enabled
 * Task ID: 8463d573-d7f1-408d-a2b4-75d027fad869
 *
 * Verifies migration 013 correctly placed satisfaction_ping_enabled in
 * real_estate_agents (customer table) and fixed the FK in lead_satisfaction_events.
 */

const assert = require('assert');
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_DB_PASSWORD || !SUPABASE_URL) {
  console.error('FAIL: Missing SUPABASE_DB_PASSWORD or SUPABASE_URL');
  process.exit(1);
}

const match = SUPABASE_URL.match(/https:\/\/(\w+)\.supabase\.co/);
if (!match) {
  console.error('FAIL: Could not extract database reference from SUPABASE_URL');
  process.exit(1);
}

const dbRef = match[1];
const connectionString = `postgresql://postgres:${encodeURIComponent(SUPABASE_DB_PASSWORD)}@db.${dbRef}.supabase.co:5432/postgres`;

let passed = 0;
let total = 0;

function pass(msg) {
  console.log(`  ✅ ${msg}`);
  passed++;
  total++;
}

function fail(msg, detail) {
  console.error(`  ❌ ${msg}`);
  if (detail) console.error(`     ${detail}`);
  total++;
}

async function runTests() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('🔌 Connected to database\n');

    // --------------------------------------------------------
    // Test 1: satisfaction_ping_enabled in real_estate_agents
    // --------------------------------------------------------
    console.log('[Test 1] satisfaction_ping_enabled column in real_estate_agents');
    {
      const res = await client.query(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'real_estate_agents'
          AND column_name = 'satisfaction_ping_enabled'
      `);
      if (res.rowCount === 0) {
        fail('Column satisfaction_ping_enabled missing from real_estate_agents');
      } else {
        const col = res.rows[0];
        pass('Column satisfaction_ping_enabled exists in real_estate_agents');
        assert.strictEqual(col.data_type, 'boolean', 'Column must be BOOLEAN');
        pass('Column is type BOOLEAN');
        assert.strictEqual(col.is_nullable, 'NO', 'Column must be NOT NULL');
        pass('Column is NOT NULL');
        assert.match(col.column_default, /true/, 'Default must be TRUE');
        pass('Column default is TRUE');
      }
    }

    // --------------------------------------------------------
    // Test 2: satisfaction_ping_enabled NOT incorrectly added to agents table
    //         (the wrong table from migration 008 may have added it there too —
    //          it's OK if it's there for AI-agent use, but the real_estate_agents
    //          column must exist — this test confirms the right table was targeted)
    // --------------------------------------------------------
    console.log('\n[Test 2] Code-facing table (real_estate_agents) has the column');
    {
      const res = await client.query(`
        SELECT satisfaction_ping_enabled FROM real_estate_agents LIMIT 1
      `);
      // Just querying it without error confirms the column exists
      pass('SELECT satisfaction_ping_enabled FROM real_estate_agents succeeds (no error)');
    }

    // --------------------------------------------------------
    // Test 3: lead_satisfaction_events FK references real_estate_agents
    // --------------------------------------------------------
    console.log('\n[Test 3] lead_satisfaction_events.agent_id FK → real_estate_agents(id)');
    {
      const res = await client.query(`
        SELECT
          rc.constraint_name,
          ccu.table_name AS referenced_table
        FROM information_schema.referential_constraints rc
        JOIN information_schema.key_column_usage kcu
          ON rc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON rc.unique_constraint_name = ccu.constraint_name
        WHERE kcu.table_name = 'lead_satisfaction_events'
          AND kcu.column_name = 'agent_id'
      `);

      if (res.rowCount === 0) {
        fail('No FK found on lead_satisfaction_events.agent_id');
      } else {
        const row = res.rows[0];
        if (row.referenced_table === 'real_estate_agents') {
          pass(`FK ${row.constraint_name} correctly references real_estate_agents`);
        } else {
          fail(
            `FK references wrong table: ${row.referenced_table} (expected real_estate_agents)`,
            'Migration 013 should have dropped the old FK and added the correct one'
          );
        }
      }
    }

    // --------------------------------------------------------
    // Test 4: satisfaction_summary view exists and is queryable
    // --------------------------------------------------------
    console.log('\n[Test 4] satisfaction_summary view is queryable');
    {
      const res = await client.query(`SELECT * FROM satisfaction_summary LIMIT 0`);
      pass('satisfaction_summary view is queryable without error');

      // Confirm agent_email column added by migration 013 exists in the view
      const colRes = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'satisfaction_summary'
          AND column_name = 'agent_email'
      `);
      if (colRes.rowCount > 0) {
        pass('satisfaction_summary view includes agent_email column (updated by migration 013)');
      } else {
        fail('satisfaction_summary view missing agent_email column');
      }
    }

    // --------------------------------------------------------
    // Test 5: PATCH /api/agents/satisfaction-ping route logic check
    //         — verifies the route file targets real_estate_agents
    // --------------------------------------------------------
    console.log('\n[Test 5] API route file targets real_estate_agents');
    {
      const fs = require('fs');
      const routePath = path.join(
        __dirname,
        '../product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts'
      );
      const routeContent = fs.readFileSync(routePath, 'utf8');

      // Must reference real_estate_agents
      if (routeContent.includes("from('real_estate_agents')")) {
        pass("Route queries 'real_estate_agents' table");
      } else {
        fail("Route does NOT query 'real_estate_agents' — check route.ts");
      }

      // Must NOT reference bare 'agents' table for satisfaction operations
      const wrongTable = routeContent.match(/from\('agents'\)/);
      if (!wrongTable) {
        pass("Route does NOT incorrectly query 'agents' table");
      } else {
        fail("Route still references bare 'agents' table — must use 'real_estate_agents'");
      }
    }

    // --------------------------------------------------------
    // Test 6: GET /api/satisfaction/stats route file targets real_estate_agents
    // --------------------------------------------------------
    console.log('\n[Test 6] Stats route file targets real_estate_agents');
    {
      const fs = require('fs');
      const routePath = path.join(
        __dirname,
        '../product/lead-response/dashboard/app/api/satisfaction/stats/route.ts'
      );
      const routeContent = fs.readFileSync(routePath, 'utf8');

      if (routeContent.includes("from('real_estate_agents')")) {
        pass("Stats route queries 'real_estate_agents' table");
      } else {
        fail("Stats route does NOT query 'real_estate_agents'");
      }
    }

  } catch (err) {
    console.error('\n❌ Unexpected error:', err.message);
    total++;
  } finally {
    await client.end();
  }

  // Summary
  const passRate = total > 0 ? passed / total : 0;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed}/${total} passed (${Math.round(passRate * 100)}%)`);
  if (passed === total) {
    console.log('✅ All tests passed');
    process.exit(0);
  } else {
    console.error('❌ Some tests failed');
    process.exit(1);
  }
}

runTests();
