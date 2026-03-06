#!/usr/bin/env node
/**
 * Database Migration Runner
 * Executes SQL migrations for the LeadFlow database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client with service role for DDL operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Migration tracking table
const MIGRATION_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  execution_time_ms INTEGER
);
`;

/**
 * Execute raw SQL using Supabase's exec_sql RPC function
 */
async function executeSql(sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const results = [];

  for (const statement of statements) {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Check if error is "already exists" which is ok
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key')) {
          console.log(`  ⚠️  Skipping (already exists): ${error.message.substring(0, 60)}`);
        } else {
          throw error;
        }
      } else {
        results.push(data);
      }
    } catch (err) {
      // Some statements may fail if objects already exist
      if (err.message.includes('already exists') ||
          err.message.includes('duplicate key') ||
          err.message.includes('Multiple constraints')) {
        console.log(`  ⚠️  Skipping (already exists)`);
      } else {
        throw err;
      }
    }
  }

  return results;
}

/**
 * Alternative: Use direct Postgres connection for migrations
 * This is more reliable for DDL operations
 */
async function executeSqlViaPostgres(sql) {
  const { Client } = require('pg');

  const client = new Client({
    host: process.env.SUPABASE_URL?.replace('https://', 'db.').replace('.supabase.co', '.supabase.co'),
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('  🔌 Connected to Postgres');

    // Execute the full SQL
    await client.query(sql);
    console.log('  ✅ SQL executed successfully');

  } catch (err) {
    // Check for common "already exists" errors
    if (err.message.includes('already exists') ||
        err.message.includes('duplicate key')) {
      console.log(`  ⚠️  Some objects already exist (ok)`);
    } else {
      throw err;
    }
  } finally {
    await client.end();
  }
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations() {
  try {
    const { data, error } = await supabase
      .from('schema_migrations')
      .select('migration_name')
      .order('executed_at', { ascending: true });

    if (error) {
      // Table might not exist yet
      if (error.message.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return data.map(m => m.migration_name);
  } catch (err) {
    console.log('  ⚠️  Could not fetch migration history (table may not exist yet)');
    return [];
  }
}

/**
 * Record migration as executed
 */
async function recordMigration(migrationName, executionTimeMs) {
  const { error } = await supabase
    .from('schema_migrations')
    .upsert({
      migration_name: migrationName,
      execution_time_ms: executionTimeMs,
    }, { onConflict: 'migration_name' });

  if (error) {
    console.error(`  ❌ Failed to record migration: ${error.message}`);
  }
}

/**
 * Run a single migration file
 */
async function runMigration(filePath, usePostgres = false) {
  const migrationName = path.basename(filePath);
  console.log(`\n📝 Running migration: ${migrationName}`);

  const startTime = Date.now();
  const sql = fs.readFileSync(filePath, 'utf-8');

  try {
    if (usePostgres) {
      await executeSqlViaPostgres(sql);
    } else {
      await executeSql(sql);
    }

    const executionTime = Date.now() - startTime;
    await recordMigration(migrationName, executionTime);

    console.log(`  ✅ Completed in ${executionTime}ms`);
    return true;

  } catch (err) {
    console.error(`  ❌ Migration failed: ${err.message}`);
    return false;
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🔄 LeadFlow Database Migration Runner\n');

  // Check environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 Creating migrations directory...');
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Ensure migration tracking table exists
  console.log('🔧 Ensuring migration tracking table exists...');
  try {
    await executeSqlViaPostgres(MIGRATION_TABLE_SQL);
  } catch (err) {
    console.log('  ⚠️  Could not create migration table via Postgres, trying RPC...');
    try {
      await executeSql(MIGRATION_TABLE_SQL);
    } catch (err2) {
      console.log('  ⚠️  Migration table may already exist');
    }
  }

  // Get list of executed migrations
  const executedMigrations = await getExecutedMigrations();
  console.log(`📋 Found ${executedMigrations.length} previously executed migrations`);

  // Get list of migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📁 Found ${migrationFiles.length} migration files`);

  // Determine which migrations to run
  const pendingMigrations = migrationFiles.filter(f => !executedMigrations.includes(f));

  if (pendingMigrations.length === 0) {
    console.log('\n✅ All migrations are up to date!');
    return;
  }

  console.log(`\n🚀 Running ${pendingMigrations.length} pending migrations...`);

  // Run pending migrations
  let successCount = 0;
  let failCount = 0;

  // Use Postgres for DDL operations (more reliable)
  const usePostgres = !!process.env.SUPABASE_DB_PASSWORD;

  for (const migrationFile of pendingMigrations) {
    const filePath = path.join(migrationsDir, migrationFile);
    const success = await runMigration(filePath, usePostgres);

    if (success) {
      successCount++;
    } else {
      failCount++;
      // Stop on first failure
      console.error('\n⛔ Stopping due to migration failure');
      break;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📁 Total: ${pendingMigrations.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All migrations completed successfully!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some migrations failed. Please review the errors above.');
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
