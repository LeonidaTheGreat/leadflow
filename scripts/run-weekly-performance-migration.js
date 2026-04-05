/**
 * Migration: Create Weekly Performance Email Schema
 * 
 * Applies the SQL schema for weekly performance email tracking.
 * Run with: node scripts/run-weekly-performance-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Get database URL from environment
  const dbUrl = process.env.LOCAL_PG_URL || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('Error: LOCAL_PG_URL or DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to database...');
  
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
  });

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'sql', 'weekly-performance-email-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Applying weekly performance email schema...');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Created/Updated:');
    console.log('  - Table: weekly_performance_email_logs');
    console.log('  - View: weekly_performance_email_status');
    console.log('  - Function: get_agents_for_weekly_report(DATE)');
    console.log('  - Indexes and triggers');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
