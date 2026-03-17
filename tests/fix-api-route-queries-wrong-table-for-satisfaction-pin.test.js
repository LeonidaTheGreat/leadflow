/**
 * E2E test: API route uses agents table (not real_estate_agents) for satisfaction_ping_enabled
 * Task: deae3788-9cf1-4906-9c0f-2a01b8965c65
 *
 * Tests runtime behavior via Supabase client:
 * - `agents` table has satisfaction_ping_enabled column and supports read/write
 * - `real_estate_agents` table does NOT have satisfaction_ping_enabled column
 * - Round-trip toggle works correctly on the agents table
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  let passed = 0;
  let failed = 0;
  const results = [];

  function ok(name, result, detail = '') {
    if (result) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
      results.push({ name, status: 'pass' });
    } else {
      console.log(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`);
      failed++;
      results.push({ name, status: 'fail', detail });
    }
  }

  console.log('\n🧪 E2E: satisfaction_ping_enabled table fix\n');

  // ── Test 1: agents table has satisfaction_ping_enabled column ──────────────
  {
    const { data, error } = await sb
      .from('agents')
      .select('id, satisfaction_ping_enabled')
      .limit(1);
    ok(
      'agents table has satisfaction_ping_enabled column',
      !error && data !== null,
      error?.message
    );
  }

  // ── Test 2: real_estate_agents table does NOT have satisfaction_ping_enabled ─
  {
    const { data, error } = await sb
      .from('real_estate_agents')
      .select('satisfaction_ping_enabled')
      .limit(1);
    // Expect an error (column doesn't exist) or empty (table doesn't exist)
    const columnMissing =
      error != null &&
      (error.message.includes('does not exist') ||
        error.message.includes('column') ||
        error.code === '42703' || // undefined_column
        error.code === '42P01'); // undefined_table
    ok(
      'real_estate_agents does NOT have satisfaction_ping_enabled column',
      columnMissing,
      error ? `Got error (expected): ${error.message}` : 'No error — column unexpectedly present'
    );
  }

  // ── Test 3: round-trip toggle on a real agent row ──────────────────────────
  {
    // Fetch first agent
    const { data: agents, error: fetchErr } = await sb
      .from('agents')
      .select('id, satisfaction_ping_enabled')
      .limit(1);

    if (fetchErr || !agents || agents.length === 0) {
      ok('round-trip toggle on agents row', false, 'No agents found to test with');
    } else {
      const agent = agents[0];
      const original = agent.satisfaction_ping_enabled ?? true;
      const toggled = !original;

      // Toggle
      const { data: updated, error: updateErr } = await sb
        .from('agents')
        .update({ satisfaction_ping_enabled: toggled })
        .eq('id', agent.id)
        .select('id, satisfaction_ping_enabled')
        .single();

      const toggleOk = !updateErr && updated?.satisfaction_ping_enabled === toggled;
      ok('toggle satisfaction_ping_enabled on agents row', toggleOk, updateErr?.message);

      // Restore original value
      await sb
        .from('agents')
        .update({ satisfaction_ping_enabled: original })
        .eq('id', agent.id);

      // Verify restore
      const { data: restored, error: restoreErr } = await sb
        .from('agents')
        .select('id, satisfaction_ping_enabled')
        .eq('id', agent.id)
        .single();
      ok(
        'original value restored after toggle',
        !restoreErr && restored?.satisfaction_ping_enabled === original,
        restoreErr?.message
      );
    }
  }

  // ── Test 4: PATCH handler must NOT include updated_at (column doesn't exist) ─
  // The agents table has no updated_at column; including it in updates causes PGRST204
  {
    const { data: agents2 } = await sb.from('agents').select('id').limit(1);
    if (agents2 && agents2.length > 0) {
      const { error: patchErr } = await sb
        .from('agents')
        .update({ satisfaction_ping_enabled: true, updated_at: new Date().toISOString() })
        .eq('id', agents2[0].id)
        .select('id, satisfaction_ping_enabled')
        .single();
      // This SHOULD fail — if it doesn't, that's fine (column was added); if it does, the route is broken
      const routeFails = patchErr?.code === 'PGRST204';
      ok(
        'PATCH with updated_at succeeds (agents table must have updated_at column)',
        !routeFails,
        routeFails
          ? `BUG: agents table has no updated_at — PATCH handler will always return 500 (${patchErr.message})`
          : 'OK'
      );
    }
  }

  // ── Test 5: route source uses agents table (no real_estate_agents reference) ─
  {
    const fs = require('fs');
    const routePath = require('path').join(
      __dirname,
      '../product/lead-response/dashboard/app/api/agents/satisfaction-ping/route.ts'
    );
    const src = fs.readFileSync(routePath, 'utf8');
    const patchUsesAgents =
      src.includes(".from('agents')") && !src.includes(".from('real_estate_agents')");
    ok(
      'route source uses agents table (no real_estate_agents reference)',
      patchUsesAgents
    );
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed > 0) {
    process.exit(1);
  }
  return { passed, failed, total: passed + failed };
}

run().catch((err) => {
  console.error('❌ Test runner crashed:', err);
  process.exit(1);
});
