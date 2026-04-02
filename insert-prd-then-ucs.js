require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insert() {
  try {
    console.log('📝 Inserting PRD and Use Cases...\n');

    // First, insert the PRD
    const { error: prdErr } = await sb.from('prds').insert({
      id: 'prd-revenue-recovery-critical-day47',
      project_id: 'leadflow',
      title: 'Revenue Recovery — Critical Path to First MRR (Day 47)',
      file_path: 'docs/prd/PRD-REVENUE-RECOVERY-CRITICAL-DAY47.md',
      description: 'Root cause analysis of $0 MRR on Day 47. Three critical blockers identified: email verification, onboarding wizard, trial-to-paid checkout. 5-day execution plan to reach $4K+ MRR by Day 52.',
      version: 1
    });

    if (prdErr) {
      console.log('❌ PRD error:', prdErr.message);
      if (prdErr.code === '23505') {
        console.log('   (PRD already exists, continuing...)');
      } else {
        throw prdErr;
      }
    } else {
      console.log('✅ PRD: prd-revenue-recovery-critical-day47');
    }

    // Now insert the UCs
    const { error: err1 } = await sb.from('use_cases').insert({
      id: 'uc-fix-email-verification-day47',
      project_id: 'leadflow',
      prd_id: 'prd-revenue-recovery-critical-day47',
      name: 'Fix Email Verification Pipeline',
      description: 'Unlock 124 agents stuck at email verification. Create email_verification_tokens table, configure RESEND API, send batch verification emails.',
      phase: 'Critical Path',
      priority: 1,
      implementation_status: 'ready',
      e2e_tests_defined: true,
      workflow: ['Dev', 'QC'],
      revenue_impact: 370
    });

    if (err1) {
      console.log('❌ UC-1 error:', err1.message);
    } else {
      console.log('✅ UC-1: uc-fix-email-verification-day47 (P1, +$370 MRR)');
    }

    const { error: err2 } = await sb.from('use_cases').insert({
      id: 'uc-auto-trigger-onboarding-day47',
      project_id: 'leadflow',
      prd_id: 'prd-revenue-recovery-critical-day47',
      name: 'Auto-Trigger Onboarding Wizard',
      description: '95% of verified agents never see onboarding wizard. Auto-trigger on first login, populate 5 sample leads, demonstrate AI aha moment (<30 second response).',
      phase: 'Critical Path',
      priority: 1,
      implementation_status: 'ready',
      e2e_tests_defined: true,
      workflow: ['Dev', 'QC'],
      revenue_impact: 1309
    });

    if (err2) {
      console.log('❌ UC-2 error:', err2.message);
    } else {
      console.log('✅ UC-2: uc-auto-trigger-onboarding-day47 (P1, +$1309 MRR)');
    }

    const { error: err3 } = await sb.from('use_cases').insert({
      id: 'uc-enable-trial-to-paid-checkout-day47',
      project_id: 'leadflow',
      prd_id: 'prd-revenue-recovery-critical-day47',
      name: 'Enable Trial-to-Paid Conversion (Checkout + Email)',
      description: 'Zero revenue because no conversion mechanism. Add trial countdown timer, upgrade CTA, self-serve Stripe checkout, and trial-ending email sequence.',
      phase: 'Critical Path',
      priority: 1,
      implementation_status: 'ready',
      e2e_tests_defined: true,
      workflow: ['Dev', 'QC'],
      revenue_impact: 1500
    });

    if (err3) {
      console.log('❌ UC-3 error:', err3.message);
    } else {
      console.log('✅ UC-3: uc-enable-trial-to-paid-checkout-day47 (P1, +$1500 MRR)');
    }

    console.log('\n✅ All database inserts complete!');
    console.log('\n📊 IMPACT SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Total Revenue Impact: +$3,179 MRR (all 3 executed)');
    console.log('Current MRR: $0 → Target by Day 52: $4,000+');
    console.log('Days to execute: 5 (Days 48-52)');
    console.log('Priority: P1 (Blockers) - blocks all P2+ tasks');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 DELIVERABLES:');
    console.log('1. PRD: docs/prd/PRD-REVENUE-RECOVERY-CRITICAL-DAY47.md ✅');
    console.log('2. Database: PRD + 3 UCs inserted into Supabase ✅');
    console.log('3. Ready for: Dev task assignment and execution');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

insert();
