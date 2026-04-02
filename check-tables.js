require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    // Check if prds table exists
    const { data: prds, error: prdsError } = await sb.from('prds').select('*').limit(1);
    if (prdsError) {
      console.log('❌ PRDs table error:', prdsError.message);
    } else {
      console.log('✅ PRDs table exists, sample records:', prds?.length);
    }

    // Check if use_cases table exists
    const { data: ucs, error: ucsError } = await sb.from('use_cases').select('*').limit(1);
    if (ucsError) {
      console.log('❌ Use Cases table error:', ucsError.message);
    } else {
      console.log('✅ Use Cases table exists, sample records:', ucs?.length);
    }

    // Check table list
    const { data: tables, error: tableError } = await sb.from('information_schema.tables').select('table_name').eq('table_schema', 'public');
    if (tableError) {
      console.log('Table list error:', tableError.message);
    } else {
      const tableNames = tables?.map(t => t.table_name).filter(n => n.includes('use') || n.includes('prd')) || [];
      console.log('✅ Relevant tables:', tableNames);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

check();
