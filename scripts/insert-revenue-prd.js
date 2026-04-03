const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
dotenv.config({ path: '~/.env' });

// Use the task store to get Supabase client
const { createClient } = require('../lib/db-client');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY not set');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function insertPRD() {
  try {
    console.log('Inserting PRD...');

    // Insert the main PRD
    const { data, error } = await sb
      .from('prds')
      .insert({
        id: 'prd-revenue-recovery-v2',
        project_id: 'leadflow',
        title: 'Revenue Recovery — Critical MRR Gap Analysis & Recovery Plan',
        file_path: 'docs/prd/PRD-REVENUE-RECOVERY-V2.md',
        description: 'Comprehensive analysis of $0 MRR critical gap at day 43 of 90. Identifies aha moment blocker, pilot agent revenue gap, and onboarding conversion issues. Proposes 3-action recovery plan: fix aha simulator, onboard pilot agents with real FUB data, add upgrade CTAs. Targets $4-5K MRR by day 90.',
        status: 'active',
        version: '2.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    console.log('✅ PRD inserted:', data[0].id);

    // Link use cases to this PRD
    const useCaseIds = [
      'fix-onboarding-aha-simulator',
      'feat-pilot-real-fub-integration',
      'feat-dashboard-upgrade-cta',
      'feat-analytics-google-ga4'
    ];

    for (const ucId of useCaseIds) {
      const { error: ucError } = await sb
        .from('use_cases')
        .update({ prd_id: 'prd-revenue-recovery-v2' })
        .eq('id', ucId)
        .eq('project_id', 'leadflow');

      if (ucError) {
        console.warn(`⚠️  Could not link UC ${ucId}:`, ucError.message);
      } else {
        console.log(`✅ Linked UC: ${ucId}`);
      }
    }

    console.log('\n✅ PRD and use case linking complete');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

insertPRD();
