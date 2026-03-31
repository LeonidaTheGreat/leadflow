require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    // Get a sample use case to see the structure
    const { data, error } = await sb
      .from('use_cases')
      .select('*')
      .eq('project_id', 'leadflow')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
    } else if (data && data.length > 0) {
      console.log('Sample use case columns:');
      console.log(JSON.stringify(data[0], null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
