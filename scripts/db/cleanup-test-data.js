#!/usr/bin/env node
/**
 * Cleanup E2E/QC test data from the database.
 *
 * Test records are identified by well-known email patterns that all test
 * suites use. Related child rows (leads, messages, pilot_progress, etc.)
 * are deleted first to satisfy foreign-key constraints.
 *
 * Usage:
 *   node scripts/db/cleanup-test-data.js          # dry-run (default)
 *   node scripts/db/cleanup-test-data.js --apply   # actually delete
 */

require('dotenv').config();
const { Pool } = require('pg');

const PG_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;
if (!PG_URL) {
  console.error('FATAL: LOCAL_PG_URL or DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({ connectionString: PG_URL });

// Email patterns that identify test-created records
const TEST_EMAIL_PATTERNS = [
  '%@leadflow-test.com',
  '%@example.com',
  '%@qc.test',
  '%@test.local',
  '%@test.com',
  '%@leadflow-qc.invalid',
  '%@example-never-real.com',
];

function buildEmailFilter(alias = '') {
  const col = alias ? `${alias}.email` : 'email';
  return TEST_EMAIL_PATTERNS.map((_, i) => `${col} LIKE $${i + 1}`).join(' OR ');
}

async function run() {
  const dryRun = !process.argv.includes('--apply');

  if (dryRun) {
    console.log('DRY RUN — pass --apply to actually delete\n');
  }

  const client = await pool.connect();
  try {
    // Find test agent IDs
    const filter = buildEmailFilter();
    const { rows: testAgents } = await client.query(
      `SELECT id, email FROM real_estate_agents WHERE ${filter}`,
      TEST_EMAIL_PATTERNS
    );
    console.log(`Found ${testAgents.length} test agent records`);

    if (testAgents.length === 0) {
      console.log('Nothing to clean up.');
      return;
    }

    const ids = testAgents.map(a => a.id);

    // Child tables that reference real_estate_agents.id
    const childTables = [
      { table: 'messages', via: 'leads', fk: 'lead_id', parentFk: 'agent_id' },
      { table: 'sms_messages', via: 'leads', fk: 'lead_id', parentFk: 'agent_id' },
      { table: 'leads', fk: 'agent_id' },
      { table: 'conversations', fk: 'agent_id' },
      { table: 'bookings', fk: 'agent_id' },
      { table: 'pilot_progress', fk: 'agent_id' },
      { table: 'trial_email_logs', fk: 'agent_id' },
      { table: 'demo_runs', fk: 'agent_id' },
      { table: 'referral_links', fk: 'agent_id' },
      { table: 'referrals', fk: 'referrer_agent_id' },
      { table: 'referrals', fk: 'referred_agent_id' },
      { table: 'weekly_performance_reports', fk: 'agent_id' },
      { table: 'weekly_performance_email_logs', fk: 'agent_id' },
    ];

    await client.query('BEGIN');

    // Delete child rows via indirect FK (messages/sms_messages → leads → agent)
    for (const child of childTables) {
      let sql, result;
      if (child.via) {
        // Indirect: delete from child where FK in (select id from via where parentFK = ANY($1))
        sql = `DELETE FROM ${child.table} WHERE ${child.fk} IN (SELECT id FROM ${child.via} WHERE ${child.parentFk} = ANY($1))`;
      } else {
        sql = `DELETE FROM ${child.table} WHERE ${child.fk} = ANY($1)`;
      }

      if (dryRun) {
        // Count instead of delete
        const countSql = sql.replace(/^DELETE FROM/, 'SELECT count(*) FROM');
        result = await client.query(countSql, [ids]);
        const count = parseInt(result.rows[0].count, 10);
        if (count > 0) console.log(`  Would delete ${count} rows from ${child.table} (via ${child.fk})`);
      } else {
        result = await client.query(sql, [ids]);
        if (result.rowCount > 0) console.log(`  Deleted ${result.rowCount} rows from ${child.table} (via ${child.fk})`);
      }
    }

    // Delete the test agents themselves
    if (dryRun) {
      console.log(`\n  Would delete ${ids.length} rows from real_estate_agents`);
      await client.query('ROLLBACK');
    } else {
      const result = await client.query('DELETE FROM real_estate_agents WHERE id = ANY($1)', [ids]);
      console.log(`\n  Deleted ${result.rowCount} rows from real_estate_agents`);
      await client.query('COMMIT');
    }

    console.log(dryRun ? '\nDry run complete. Use --apply to execute.' : '\nCleanup complete.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error during cleanup:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
