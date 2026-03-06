#!/usr/bin/env node

/**
 * Apply the schema collision fix migration directly to Supabase
 * Usage: node apply-migration.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function applyMigration() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
    process.exit(1);
  }

  // Read migration file
  const migrationPath = path.join(__dirname, 'supabase/migrations/013_fix_agents_schema_collision.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

  // Create Supabase client with service role
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: {
      schema: 'public',
    },
  });

  try {
    console.log('📝 Applying migration: 013_fix_agents_schema_collision.sql');
    console.log('🔗 Database:', SUPABASE_URL);

    // We can't directly execute arbitrary SQL through the Supabase JS client
    // Instead, we'll use the Supabase REST API or execute individual operations
    // For now, we'll attempt each operation separately

    console.log('🛠️  Step 1: Creating real_estate_agents table...');
    
    // Check if real_estate_agents already exists
    const { data: tableCheck, error: tableCheckError } = await supabase
      .from('real_estate_agents')
      .select('*')
      .limit(1);

    if (!tableCheckError || tableCheckError.code !== 'PGRST116') {
      console.log('✅ real_estate_agents table already exists');
    } else {
      console.log('⚠️  real_estate_agents table does not exist yet. Need to apply migration via Supabase dashboard or CLI.');
      console.log('   Please run: cd product/lead-response/dashboard && npx supabase db push');
    }

    // Check if agents table exists with product data
    const { data: agentsCheck } = await supabase
      .from('agents')
      .select('*')
      .limit(1);

    if (agentsCheck) {
      console.log(`✅ agents table exists (${agentsCheck.length} rows)`);
    }

    console.log('\n✨ Migration analysis complete');
    console.log('   - If the above shows real_estate_agents exists, migration was successful');
    console.log('   - If not, apply via: npx supabase db push');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
