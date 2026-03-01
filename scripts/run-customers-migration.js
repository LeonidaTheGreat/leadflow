#!/usr/bin/env node
/**
 * Run Customers Table Migration
 * Creates customers table and updates related billing tables
 * Priority: P0 - PILOT BLOCKER
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Validate environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runMigration() {
  console.log('🚀 Starting customers table migration...\n');

  try {
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../sql/customers-table-migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log('📝 SQL length:', migrationSQL.length, 'characters\n');

    // Execute migration
    console.log('⚙️  Executing migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // Try alternative method: split by statement and execute individually
      console.log('\n🔄 Trying alternative method: execute statements individually...\n');
      
      // Split by semicolons (basic splitting, may need refinement)
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        if (stmt.length === 0) continue;

        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', {
            sql: stmt + ';'
          });

          if (stmtError) {
            console.error(`❌ Statement ${i + 1} failed:`, stmtError.message);
            console.error('   SQL:', stmt.substring(0, 100) + '...');
            failCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Statement ${i + 1} error:`, err.message);
          failCount++;
        }
      }

      console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);
      
      if (failCount > 0) {
        console.log('\n⚠️  Some statements failed. Manual intervention may be required.');
        process.exit(1);
      }
    } else {
      console.log('✅ Migration executed successfully!\n');
    }

    // Verify customers table was created
    console.log('🔍 Verifying customers table...');
    const { data: tableInfo, error: verifyError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);

    if (verifyError && verifyError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (table exists but is empty)
      console.error('❌ Verification failed:', verifyError);
      console.log('\n⚠️  Table may not have been created properly');
      process.exit(1);
    }

    console.log('✅ Customers table verified!\n');

    // Show table structure
    console.log('📋 Table structure:');
    const { data: columns } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'customers'
        ORDER BY ordinal_position;
      `
    });

    if (columns) {
      console.table(columns);
    }

    console.log('\n✅ Migration completed successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Test customer creation via API');
    console.log('   2. Update webhook handlers to use customers table');
    console.log('   3. Test portal session creation');
    console.log('   4. Run E2E tests');
    console.log('   5. Deploy to production\n');

  } catch (error) {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
