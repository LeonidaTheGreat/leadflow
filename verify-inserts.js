require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  try {
    // Check PRD
    const { data: prds } = await sb.from('prds').select('*').eq('id', 'prd-revenue-recovery-critical-day47');
    console.log('✅ PRD found:', prds?.length, 'record(s)');
    if (prds?.[0]) console.log('   Title:', prds[0].title);

    // Check UCs
    const { data: ucs } = await sb.from('use_cases').select('*').eq('prd_id', 'prd-revenue-recovery-critical-day47');
    console.log('✅ Use Cases found:', ucs?.length, 'record(s)');
    ucs?.forEach(uc => console.log(`   - ${uc.id}: ${uc.name} (Priority: ${uc.priority})`));

    console.log('\n✅ All inserts verified!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verify();
