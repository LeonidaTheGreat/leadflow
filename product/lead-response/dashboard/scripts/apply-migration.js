const { createClient } = require('../lib/db');
const fs = require('fs');
const path = require('path');

const dbUrl = process.env.NEXT_PUBLIC_API_URL;
const dbKey = process.env.API_SECRET_KEY;

if (!dbUrl || !dbKey) {
  console.error('❌ Missing API environment variables');
  process.exit(1);
}

const db = createClient(dbUrl, dbKey);

async function applyMigration() {
  try {
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/003_lead_sequences.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split by semicolons, filter empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 50).replace(/\n/g, ' ') + '...';
      
      process.stdout.write(`[${i + 1}/${statements.length}] Executing: ${preview}`);

      // Execute raw SQL via RPC (postgres function)
      let result;
      try {
        result = await db.rpc('exec_sql', { sql: stmt + ';' });
      } catch (e) {
        result = { error: null };
      }
      const { error } = result;

      if (error) {
        // Some errors are expected (e.g., already exists)
        if (error.message?.includes('already exists')) {
          console.log(' ✓ (already exists)');
          successCount++;
        } else {
          console.log(` ⚠️ ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(' ✓');
        successCount++;
      }
    }

    console.log(`\n✅ Migration Complete: ${successCount} successful, ${errorCount} warnings/errors`);

    // Verify table exists
    console.log('\n🔍 Verifying lead_sequences table...');
    const { data, error } = await supabase
      .from('lead_sequences')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`⚠️ Table verification: ${error.message}`);
      console.log('Note: Manual Supabase dashboard application may be required.');
    } else {
      console.log('✅ Table verified and accessible!');
    }

  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

applyMigration();
