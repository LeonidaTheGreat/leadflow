'use strict';

/**
 * UC-8 Fix: Backfill lead_sequences for all existing leads.
 *
 * Run: node scripts/db/backfill-lead-sequences.js
 * Dry run: node scripts/db/backfill-lead-sequences.js --dry-run
 *
 * Inserts a no_response sequence for every lead that:
 *  - Has no existing sequence row
 *  - Is not DNC / spam / closed
 * Safe to re-run: idempotent via NOT EXISTS guard in SQL.
 */

require('dotenv').config();

const path = require('path');
const { getPool } = require(path.join(__dirname, '../../lib/db'));

const DRY_RUN = process.argv.includes('--dry-run');

const COUNT_SQL = `
  SELECT COUNT(*) AS total
  FROM leads l
  WHERE
    l.status NOT IN ('dnc', 'spam', 'closed')
    AND NOT EXISTS (
      SELECT 1 FROM lead_sequences ls WHERE ls.lead_id = l.id
    )
`;

const BACKFILL_SQL = `
  INSERT INTO lead_sequences (
    lead_id,
    sequence_type,
    trigger_reason,
    next_send_at,
    status,
    step,
    total_messages_sent,
    max_messages,
    metadata
  )
  SELECT
    l.id,
    'no_response',
    'backfill_uc8_fix',
    NOW() + INTERVAL '24 hours',
    'active',
    1,
    0,
    3,
    '{"triggered_by": "backfill_uc8_fix"}'::jsonb
  FROM leads l
  WHERE
    l.status NOT IN ('dnc', 'spam', 'closed')
    AND NOT EXISTS (
      SELECT 1 FROM lead_sequences ls WHERE ls.lead_id = l.id
    )
  RETURNING id
`;

async function run() {
  const pool = getPool();

  try {
    // Count leads without sequences
    const countResult = await pool.query(COUNT_SQL);
    const eligibleCount = parseInt(countResult.rows[0].total, 10);
    console.log(`Leads without sequences (eligible for backfill): ${eligibleCount}`);

    if (eligibleCount === 0) {
      console.log('Nothing to backfill. All leads already have sequence rows.');
      return { inserted: 0 };
    }

    if (DRY_RUN) {
      console.log(`[DRY-RUN] Would insert ${eligibleCount} rows into lead_sequences.`);
      return { inserted: 0, dryRun: true };
    }

    const result = await pool.query(BACKFILL_SQL);
    const inserted = result.rowCount || 0;
    console.log(`Backfill complete: inserted ${inserted} lead_sequences rows.`);
    return { inserted };
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  run()
    .then(({ inserted, dryRun }) => {
      if (dryRun) {
        console.log('Dry run finished — no rows inserted.');
      } else {
        console.log(`Done. ${inserted} rows inserted.`);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backfill failed:', err.message);
      process.exit(1);
    });
}

module.exports = { run };
