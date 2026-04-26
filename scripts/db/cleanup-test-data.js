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

const PROJECT_ID = 'leadflow';

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

const CHILD_TABLES = [
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

const ORPHAN_AGENT_TABLES = [
  { table: 'agent_survey_schedule', fk: 'agent_id' },
];

// Subscription IDs that are test-only (inserted by integration tests, not real Stripe objects).
// These pollute MRR metrics if left behind after a failed test run.
const TEST_SUBSCRIPTION_ID_PATTERNS = [
  'sub_test%',
  'sub_mock%',
];

const TEST_SUBSCRIPTION_CUSTOMER_PATTERNS = [
  'cus_test%',
  'cus_mock%',
];

function buildEmailFilter(alias = '') {
  const col = alias ? `${alias}.email` : 'email';
  return TEST_EMAIL_PATTERNS.map((_, i) => `${col} LIKE $${i + 1}`).join(' OR ');
}

async function cleanupTestData({ client, dryRun, log = console.log }) {
  try {
    // Find test agent IDs
    const filter = buildEmailFilter();
    const { rows: testAgents } = await client.query(
      `SELECT id, email FROM real_estate_agents WHERE ${filter}`,
      TEST_EMAIL_PATTERNS
    );
    log(`Found ${testAgents.length} test agent records`);

    const ids = testAgents.map(a => a.id);

    await client.query('BEGIN');

    if (ids.length > 0) {
      // Delete child rows via indirect FK (messages/sms_messages → leads → agent)
      for (const child of CHILD_TABLES) {
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
          if (count > 0) log(`  Would delete ${count} rows from ${child.table} (via ${child.fk})`);
        } else {
          result = await client.query(sql, [ids]);
          if (result.rowCount > 0) log(`  Deleted ${result.rowCount} rows from ${child.table} (via ${child.fk})`);
        }
      }

      // Delete the test agents themselves
      if (dryRun) {
        log(`\n  Would delete ${ids.length} rows from real_estate_agents`);
      } else {
        const result = await client.query('DELETE FROM real_estate_agents WHERE id = ANY($1)', [ids]);
        log(`\n  Deleted ${result.rowCount} rows from real_estate_agents`);
      }
    }

    // Clean up orphan rows that still reference deleted agents and pollute metrics.
    for (const orphan of ORPHAN_AGENT_TABLES) {
      const orphanDeleteSql = `
        DELETE FROM ${orphan.table} t
        WHERE t.${orphan.fk} IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM real_estate_agents a WHERE a.id = t.${orphan.fk}
          )
      `;

      if (dryRun) {
        const orphanCountSql = orphanDeleteSql.replace(/^(\s*)DELETE FROM/, '$1SELECT count(*) FROM');
        const { rows } = await client.query(orphanCountSql);
        const count = parseInt(rows[0].count, 10);
        if (count > 0) log(`  Would delete ${count} orphan rows from ${orphan.table} (via ${orphan.fk})`);
      } else {
        const result = await client.query(orphanDeleteSql);
        if (result.rowCount > 0) log(`  Deleted ${result.rowCount} orphan rows from ${orphan.table} (via ${orphan.fk})`);
      }
    }

    // Clean up test subscription rows by ID/customer patterns.
    // These rows don't belong to a real agent email — they're inserted by integration tests
    // and left behind when a test crashes before its finally-block cleanup runs.
    // Leaving them active pollutes MRR metrics.
    const subIdFilter = TEST_SUBSCRIPTION_ID_PATTERNS.map((_, i) => `stripe_subscription_id LIKE $${i + 1}`).join(' OR ')
    const subCustFilter = TEST_SUBSCRIPTION_CUSTOMER_PATTERNS.map((_, i) => `stripe_customer_id LIKE $${TEST_SUBSCRIPTION_ID_PATTERNS.length + i + 1}`).join(' OR ')
    const subParams = [...TEST_SUBSCRIPTION_ID_PATTERNS, ...TEST_SUBSCRIPTION_CUSTOMER_PATTERNS]

    const subCountResult = await client.query(
      `SELECT count(*) FROM subscriptions WHERE (${subIdFilter}) OR (${subCustFilter})`,
      subParams
    )
    const subCount = parseInt(subCountResult.rows[0].count, 10)

    if (dryRun) {
      if (subCount > 0) log(`  Would delete ${subCount} test subscription rows from subscriptions`)
    } else {
      if (subCount > 0) {
        const delResult = await client.query(
          `DELETE FROM subscriptions WHERE (${subIdFilter}) OR (${subCustFilter})`,
          subParams
        )
        log(`  Deleted ${delResult.rowCount} test subscription rows from subscriptions`)

        // Reset revenue_metrics rows whose mrr_cents came from these test subscriptions.
        // The phantom $597 (59700 cents) from 3 test subs (starter+pro+team) should be zeroed.
        // We identify stale rows as those with active_subscribers=0 but non-zero mrr_cents.
        const resetResult = await client.query(
          `UPDATE revenue_metrics SET mrr_cents = 0 WHERE project_id = $1 AND active_subscribers = 0 AND mrr_cents > 0`,
          [PROJECT_ID]
        )
        if (resetResult.rowCount > 0) log(`  Reset ${resetResult.rowCount} stale revenue_metrics rows to mrr_cents=0`)
      }
    }

    if (dryRun) {
      await client.query('ROLLBACK');
      log('\nDry run complete. Use --apply to execute.');
    } else {
      await client.query('COMMIT');
      log('\nCleanup complete.');
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  }
}

async function run() {
  const dryRun = !process.argv.includes('--apply');

  if (dryRun) {
    console.log('DRY RUN — pass --apply to actually delete\n');
  }

  const PG_URL = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;
  if (!PG_URL) {
    console.error('FATAL: LOCAL_PG_URL or DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: PG_URL });
  const client = await pool.connect();
  try {
    await cleanupTestData({ client, dryRun, log: console.log });
  } catch (err) {
    console.error('Error during cleanup:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  run();
}

module.exports = {
  TEST_EMAIL_PATTERNS,
  CHILD_TABLES,
  ORPHAN_AGENT_TABLES,
  buildEmailFilter,
  cleanupTestData,
};
