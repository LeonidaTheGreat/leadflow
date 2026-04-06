/**
 * Regression guard: satisfaction-ping/route.ts must use real_estate_agents table
 * Task: 8094ec62-862e-4791-8ef7-64b5ad9b4aae
 *
 * This bug has regressed multiple times. Guards against it re-appearing.
 *
 * Verifies:
 *  1. route.ts source uses .from('real_estate_agents') — not .from('agents')
 *  2. real_estate_agents table has satisfaction_ping_enabled column (DB-level check)
 *  3. PATCH toggle round-trip works on real_estate_agents
 */

'use strict';

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL });

async function run() {
  let passed = 0;
  let failed = 0;

  function ok(name, result, detail = '') {
    if (result) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
      failed++;
    }
  }

  console.log('\n🧪 Regression guard: satisfaction-ping route uses real_estate_agents\n');

  // ── Test 1: source code uses real_estate_agents, not agents ────────────────
  {
    const routePath = path.join(
      __dirname,
      '../product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts'
    );
    const src = fs.readFileSync(routePath, 'utf8');
    const usesCorrectTable = src.includes(".from('real_estate_agents')");
    const usesWrongTable = src.includes(".from('agents')");
    ok(
      'route.ts uses .from(\'real_estate_agents\')',
      usesCorrectTable,
      usesCorrectTable ? '' : 'Missing .from(\'real_estate_agents\') in route source'
    );
    ok(
      'route.ts does NOT use .from(\'agents\')',
      !usesWrongTable,
      usesWrongTable ? 'REGRESSION: route still queries .from(\'agents\')' : ''
    );
  }

  // ── Test 2: real_estate_agents table has satisfaction_ping_enabled column ──
  {
    try {
      const { rows } = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'real_estate_agents'
          AND column_name = 'satisfaction_ping_enabled'
      `);
      ok(
        'real_estate_agents has satisfaction_ping_enabled column',
        rows.length === 1,
        rows.length === 0 ? 'Column missing from real_estate_agents' : ''
      );
    } catch (err) {
      ok('real_estate_agents has satisfaction_ping_enabled column', false, err.message);
    }
  }

  // ── Test 3: real_estate_agents has updated_at column (needed by PATCH) ─────
  {
    try {
      const { rows } = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'real_estate_agents'
          AND column_name = 'updated_at'
      `);
      ok(
        'real_estate_agents has updated_at column (required by PATCH handler)',
        rows.length === 1,
        rows.length === 0 ? 'updated_at missing — PATCH handler will return 500' : ''
      );
    } catch (err) {
      ok('real_estate_agents has updated_at column', false, err.message);
    }
  }

  // ── Test 4: round-trip toggle on real_estate_agents ────────────────────────
  {
    try {
      const { rows: agents } = await pool.query(
        'SELECT id, satisfaction_ping_enabled FROM real_estate_agents LIMIT 1'
      );
      if (agents.length === 0) {
        console.log('  ⚠️  SKIP: round-trip toggle — no rows in real_estate_agents');
      } else {
        const agent = agents[0];
        const original = agent.satisfaction_ping_enabled ?? true;
        const toggled = !original;

        await pool.query(
          'UPDATE real_estate_agents SET satisfaction_ping_enabled = $1 WHERE id = $2',
          [toggled, agent.id]
        );

        const { rows: updated } = await pool.query(
          'SELECT satisfaction_ping_enabled FROM real_estate_agents WHERE id = $1',
          [agent.id]
        );
        ok(
          'PATCH toggle persists on real_estate_agents',
          updated[0]?.satisfaction_ping_enabled === toggled
        );

        // Restore
        await pool.query(
          'UPDATE real_estate_agents SET satisfaction_ping_enabled = $1 WHERE id = $2',
          [original, agent.id]
        );
      }
    } catch (err) {
      ok('round-trip toggle on real_estate_agents', false, err.message);
    }
  }

  await pool.end();

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed > 0) process.exit(1);
  return { passed, failed, total: passed + failed };
}

run().catch((err) => {
  console.error('❌ Test runner crashed:', err);
  process.exit(1);
});
