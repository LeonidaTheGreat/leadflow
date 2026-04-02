require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    const { data, error } = await sb.from('use_cases').select('*').limit(1);
    if (error) {
      console.error('Error:', error.message);
    } else if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      console.log('✅ Use Cases columns:', keys);
    } else {
      console.log('ℹ️ Use Cases table exists but is empty');
      // Try to infer from another method
      const { data: columns, error: colError } = await sb.from('use_cases').select('*');
      console.log('Column inference result:', columns ? Object.keys(columns[0] || {}) : 'empty');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

check();
