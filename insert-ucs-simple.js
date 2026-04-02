require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insert() {
  try {
    console.log('📝 Inserting Use Cases...');

    // Insert UC-1
    const { data: uc1, error: err1 } = await sb.from('use_cases').insert({
      id: 'uc-fix-email-verification-day47',
      project_id: 'leadflow',
      name: 'Fix Email Verification Pipeline',
      description: 'Unlock 124 agents stuck at email verification. Create email_verification_tokens table, configure RESEND API, send batch verification emails.',
      phase: 'Critical Path',
      status: 'ready',
      priority: 1,
      prd_id: 'prd-revenue-recovery-critical-day47',
      revenue_impact: 370,
      workflow: 'Dev > QC'
    });

    if (err1) {
      console.log('❌ UC-1 error:', err1.message);
      if (err1.details) console.log('Details:', err1.details);
    } else {
      console.log('✅ UC-1 inserted');
    }

    // Insert UC-2
    const { data: uc2, error: err2 } = await sb.from('use_cases').insert({
      id: 'uc-auto-trigger-onboarding-day47',
      project_id: 'leadflow',
      name: 'Auto-Trigger Onboarding Wizard',
      description: '95% of verified agents never see onboarding wizard. Auto-trigger on first login, populate 5 sample leads, demonstrate AI aha moment (<30 second response).',
      phase: 'Critical Path',
      status: 'ready',
      priority: 1,
      prd_id: 'prd-revenue-recovery-critical-day47',
      revenue_impact: 1309,
      workflow: 'Dev > QC'
    });

    if (err2) {
      console.log('❌ UC-2 error:', err2.message);
      if (err2.details) console.log('Details:', err2.details);
    } else {
      console.log('✅ UC-2 inserted');
    }

    // Insert UC-3
    const { data: uc3, error: err3 } = await sb.from('use_cases').insert({
      id: 'uc-enable-trial-to-paid-checkout-day47',
      project_id: 'leadflow',
      name: 'Enable Trial-to-Paid Conversion (Checkout + Email)',
      description: 'Zero revenue because no conversion mechanism. Add trial countdown timer, upgrade CTA, self-serve Stripe checkout, and trial-ending email sequence.',
      phase: 'Critical Path',
      status: 'ready',
      priority: 1,
      prd_id: 'prd-revenue-recovery-critical-day47',
      revenue_impact: 1500,
      workflow: 'Dev > QC'
    });

    if (err3) {
      console.log('❌ UC-3 error:', err3.message);
      if (err3.details) console.log('Details:', err3.details);
    } else {
      console.log('✅ UC-3 inserted');
    }

    // Now check that they exist
    const { data: check } = await sb.from('use_cases').select('*').eq('prd_id', 'prd-revenue-recovery-critical-day47');
    console.log('\n✅ Verification: Found', check?.length, 'use cases for this PRD');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

insert();
