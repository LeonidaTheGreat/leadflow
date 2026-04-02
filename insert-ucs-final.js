require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insert() {
  try {
    console.log('📝 Inserting Use Cases (Final)...\n');

    // Insert UC-1
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
      revenue_impact: 370,
      acceptance_criteria: [
        'email_verification_tokens table created',
        'RESEND_API_KEY configured in Vercel',
        '124 unverified agents receive verification emails',
        '5 test accounts verify and access dashboard',
        'All 124 agents now have email_verified = true'
      ]
    });

    if (err1) {
      console.log('❌ UC-1 error:', err1.message);
    } else {
      console.log('✅ UC-1: uc-fix-email-verification-day47 (P1, +$370 MRR)');
    }

    // Insert UC-2
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
      revenue_impact: 1309,
      acceptance_criteria: [
        'Wizard auto-triggers on first login if onboarding_completed = false',
        '5 sample leads auto-populated with AI responses',
        'Aha moment: AI responded in <30 seconds displayed',
        '10 test accounts complete wizard without friction',
        'onboarding_completed = true after wizard completion'
      ]
    });

    if (err2) {
      console.log('❌ UC-2 error:', err2.message);
    } else {
      console.log('✅ UC-2: uc-auto-trigger-onboarding-day47 (P1, +$1309 MRR)');
    }

    // Insert UC-3
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
      revenue_impact: 1500,
      acceptance_criteria: [
        'Dashboard displays trial countdown in days',
        'Upgrade CTA button prominently displayed',
        'Click Upgrade → Stripe checkout modal opens',
        'Successful payment creates subscription',
        'subscription_status = active, plan_tier set correctly',
        'Confirmation email sent',
        'Full journey works: signup → onboard → upgrade → paid'
      ]
    });

    if (err3) {
      console.log('❌ UC-3 error:', err3.message);
    } else {
      console.log('✅ UC-3: uc-enable-trial-to-paid-checkout-day47 (P1, +$1500 MRR)');
    }

    console.log('\n📊 IMPACT SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Total Revenue Impact: +$3,179 MRR (all 3 executed)');
    console.log('Current MRR: $0 → Target by Day 52: $4,000+');
    console.log('Days to execute: 5 (Days 48-52)');
    console.log('Priority: P1 (Blockers) - blocks all P2+ tasks');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

insert();
