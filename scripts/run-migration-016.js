const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://fptrokacdwzlmflyczdz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running migration: Add Aha Moment fields to real_estate_agents...');
  
  try {
    // Add aha_moment_completed column
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS aha_moment_completed BOOLEAN DEFAULT FALSE;`
    });
    
    if (error1) {
      console.log('Note: aha_moment_completed column may already exist or RPC not available:', error1.message);
      // Try direct SQL via REST
      const { error: directError1 } = await supabase.from('real_estate_agents').select('aha_moment_completed').limit(1);
      if (directError1 && directError1.message.includes('column')) {
        console.log('Column aha_moment_completed does not exist, attempting to create via REST...');
      } else {
        console.log('Column aha_moment_completed already exists or is accessible');
      }
    } else {
      console.log('✓ Added aha_moment_completed column');
    }
    
    // Add aha_response_time_ms column
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE real_estate_agents ADD COLUMN IF NOT EXISTS aha_response_time_ms INTEGER;`
    });
    
    if (error2) {
      console.log('Note: aha_response_time_ms column may already exist or RPC not available:', error2.message);
      const { error: directError2 } = await supabase.from('real_estate_agents').select('aha_response_time_ms').limit(1);
      if (directError2 && directError2.message.includes('column')) {
        console.log('Column aha_response_time_ms does not exist, will be handled by API');
      } else {
        console.log('Column aha_response_time_ms already exists or is accessible');
      }
    } else {
      console.log('✓ Added aha_response_time_ms column');
    }
    
    console.log('\nMigration attempt complete.');
    console.log('Note: If columns could not be added via RPC, they may need to be added manually via Supabase Dashboard SQL Editor.');
    
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1)
  }
}

runMigration();
