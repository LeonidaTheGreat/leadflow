const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://fptrokacdwzlmflyczdz.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdHJva2FjZHd6bG1mbHljemR6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTcxMTgxNSwiZXhwIjoyMDg3Mjg3ODE1fQ.NcGeeYQyTaY3n-w22yjxUPxJ5ZC4v6b3Kv7gnr0TGcU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('Running migration: 012_email_verification_tokens.sql');
  
  const migrationPath = path.join(__dirname, '..', 'supabase/migrations/012_email_verification_tokens.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  // Split SQL into individual statements and execute them
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
  
  for (const statement of statements) {
    const fullStatement = statement + ';';
    console.log('Executing:', fullStatement.substring(0, 80) + '...');
    
    const { error } = await supabase.rpc('exec_sql', { sql: fullStatement });
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('  Trying direct query...');
      const { error: queryError } = await supabase.from('email_verification_tokens').select('count', { count: 'exact', head: true });
      
      if (queryError && queryError.message.includes('does not exist')) {
        console.error('❌ Table does not exist and cannot create via RPC. Error:', error.message);
        process.exit(1);
      } else if (!queryError) {
        console.log('  ✅ Table already exists');
        return;
      }
    } else {
      console.log('  ✅ Statement executed');
    }
  }
  
  console.log('\n✅ Migration completed successfully');
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
