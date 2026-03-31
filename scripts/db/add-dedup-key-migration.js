#!/usr/bin/env node
/**
 * Add dedup_key column to tasks table
 * 
 * Fixes schema mismatch preventing revenue alert deduplication.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function addDedupKeyColumn() {
  const connectionString = process.env.LOCAL_PG_URL;
  
  if (!connectionString) {
    console.error('❌ LOCAL_PG_URL not found in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log('🔍 Checking if dedup_key column exists...');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'dedup_key'
      );
    `);

    const columnExists = checkResult.rows[0].exists;

    if (columnExists) {
      console.log('✅ dedup_key column already exists');
      return;
    }

    console.log('📝 Adding dedup_key column to tasks table...');

    // Add the column
    await client.query(`
      ALTER TABLE tasks
      ADD COLUMN dedup_key VARCHAR(255) DEFAULT NULL;
    `);

    console.log('✅ Column added successfully');

    // Create index
    console.log('📈 Creating index on (project_id, dedup_key)...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_dedup
      ON tasks (project_id, dedup_key)
      WHERE dedup_key IS NOT NULL;
    `);

    console.log('✅ Index created successfully');

    // Verify
    const verifyResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'tasks' 
      AND column_name = 'dedup_key';
    `);

    if (verifyResult.rows.length > 0) {
      const col = verifyResult.rows[0];
      console.log(`✅ Verification: dedup_key exists as ${col.data_type}`);
    }

    console.log('\n✅ Migration completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  addDedupKeyColumn().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { addDedupKeyColumn };
