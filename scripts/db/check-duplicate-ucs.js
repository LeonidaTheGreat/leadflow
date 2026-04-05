#!/usr/bin/env node
/**
 * check-duplicate-ucs.js
 * Finds use cases that likely target the same issue based on name similarity.
 * Useful for identifying UC duplication before it accumulates into technical debt.
 *
 * Usage: node scripts/db/check-duplicate-ucs.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const pool = new Pool({ connectionString: process.env.LOCAL_PG_URL });

async function checkDuplicateUCs() {
  const client = await pool.connect();
  try {
    // Find UCs with similar keywords grouped by keyword
    const keywords = ['distribution', 'loop', 'dedup', 'cooldown', 'migration'];

    console.log('=== Duplicate UC Check ===\n');

    for (const keyword of keywords) {
      const { rows } = await client.query(`
        SELECT id, name, implementation_status, updated_at
        FROM use_cases
        WHERE LOWER(id) LIKE $1 OR LOWER(name) LIKE $1
        ORDER BY implementation_status, updated_at DESC
      `, [`%${keyword}%`]);

      if (rows.length > 2) {
        console.log(`Keyword "${keyword}" — ${rows.length} UCs:`);
        for (const row of rows) {
          const status = row.implementation_status.padEnd(12);
          console.log(`  [${status}] ${row.id}`);
          console.log(`           ${row.name}`);
        }
        console.log();
      }
    }

    // Check for any non-complete UCs with status needs_merge or stuck
    const { rows: blockedUCs } = await client.query(`
      SELECT id, name, implementation_status
      FROM use_cases
      WHERE implementation_status IN ('needs_merge', 'stuck', 'partial')
      ORDER BY implementation_status, updated_at DESC
      LIMIT 20
    `);

    if (blockedUCs.length > 0) {
      console.log(`=== Blocked/Stuck UCs (${blockedUCs.length}) ===`);
      for (const uc of blockedUCs) {
        console.log(`  [${uc.implementation_status}] ${uc.id}: ${uc.name}`);
      }
    } else {
      console.log('✅ No blocked/stuck UCs found');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkDuplicateUCs().catch(console.error);
