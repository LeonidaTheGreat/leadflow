#!/usr/bin/env node

require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function insertPRDAndUCs() {
  try {
    console.log('📝 Inserting PRD and Use Cases...');

    // Insert main PRD
    const prdResult = await sb.from('prds').insert({
      id: 'prd-revenue-recovery-critical-day47',
      project_id: 'leadflow',
      title: 'Revenue Recovery — Critical Path to First MRR (Day 47)',
      file_path: 'docs/prd/PRD-REVENUE-RECOVERY-CRITICAL-DAY47.md',
      description: 'Root cause analysis of $0 MRR on Day 47. Three critical blockers identified: email verification, onboarding wizard, trial-to-paid checkout. 5-day execution plan to reach $4K+ MRR by Day 52.',
      status: 'ready',
      version: 1,
      created_by: 'product-manager',
      priority: 1,
      created_at: new Date().toISOString()
    }).select();

    console.log('✅ PRD inserted:', prdResult.data?.[0]?.id);

    // Insert UC-1: Fix Email Verification
    const uc1Result = await sb.from('use_cases').insert({
      id: 'uc-fix-email-verification-day47',
      project_id: 'leadflow',
      name: 'Fix Email Verification Pipeline',
      description: 'Unlock 124 agents stuck at email verification. Create email_verification_tokens table, configure RESEND API, send batch verification emails.',
      phase: 'Critical Path',
      status: 'ready',
      priority: 1,
      prd_id: 'prd-revenue-recovery-critical-day47',
      revenue_impact: 370,
      user_story: 'As a trial agent who signed up but didn\'t verify email, I need to receive a verification link via email, So that I can access my trial dashboard.',
      acceptance_criteria: [
        'email_verification_tokens table exists with proper schema',
        'RESEND_API_KEY configured in Vercel and local env',
        'Batch job sends verification email to 124 unverified agents',
        'Agents can verify email and access /dashboard/onboarding',
        'Test: 5 test accounts successfully verify and access dashboard',
        'All 124 agents can now access trial'
      ],
      e2e_test_spec: 'See E2E_MAPPINGS.md',
      workflow: 'Dev > QC',
      effort_days: 2,
      created_at: new Date().toISOString()
    }).select();

    console.log('✅ UC-1 inserted:', uc1Result.data?.[0]?.id);

    // Insert UC-2: Auto-Trigger Onboarding
    const uc2Result = await sb.from('use_cases').insert({
      id: 'uc-auto-trigger-onboarding-day47',
      project_id: 'leadflow',
      name: 'Auto-Trigger Onboarding Wizard',
      description: '95% of verified agents never see onboarding. Auto-trigger wizard on first login, populate 5 sample leads, demonstrate AI aha moment (<30 second response).',
      phase: 'Critical Path',
      status: 'ready',
      priority: 1,
      prd_id: 'prd-revenue-recovery-critical-day47',
      revenue_impact: 1309,
      user_story: 'As a trial agent who just verified my email, I need to see an onboarding wizard on first login, So that I immediately understand how LeadFlow works.',
      acceptance_criteria: [
        'Wizard auto-triggers on first login if onboarding_completed = false',
        'Sample leads auto-populated (5 leads per agent)',
        'Wizard displays AI response time (<30 seconds) - aha moment',
        'Wizard has 3-4 steps: Welcome, Lead Simulator, Dashboard Tour, Setup Cal.com',
        'Completion sets onboarding_completed = true',
        'Test: 10 new accounts complete wizard without friction'
      ],
      e2e_test_spec: 'See E2E_MAPPINGS.md',
      workflow: 'Dev > QC',
      effort_days: 2,
      created_at: new Date().toISOString()
    }).select();

    console.log('✅ UC-2 inserted:', uc2Result.data?.[0]?.id);

    // Insert UC-3: Enable Trial-to-Paid Checkout
    const uc3Result = await sb.from('use_cases').insert({
      id: 'uc-enable-trial-to-paid-checkout-day47',
      project_id: 'leadflow',
      name: 'Enable Trial-to-Paid Conversion (Checkout + Email)',
      description: 'Zero revenue because no conversion mechanism. Add trial countdown timer, upgrade CTA, self-serve Stripe checkout, and trial-ending email sequence.',
      phase: 'Critical Path',
      status: 'ready',
      priority: 1,
      prd_id: 'prd-revenue-recovery-critical-day47',
      revenue_impact: 1500,
      user_story: 'As a trial agent near the end of my trial period, I need to upgrade to a paid plan with self-serve checkout, So that I can continue using LeadFlow.',
      acceptance_criteria: [
        'Dashboard displays trial countdown: "Your trial ends in X days"',
        'Upgrade CTA button prominently displayed',
        'Click Upgrade → Stripe checkout modal opens',
        'Checkout allows card entry and plan selection',
        'Successful payment creates subscription and updates DB',
        'subscription_status = "active", plan_tier = "pro", mrr = 149',
        'Confirmation email sent',
        'Trial-ending email sent 5 days before expiration',
        'Test: Full journey signup → onboard → upgrade → paid'
      ],
      e2e_test_spec: 'See E2E_MAPPINGS.md',
      workflow: 'Dev > QC',
      effort_days: 1,
      created_at: new Date().toISOString()
    }).select();

    console.log('✅ UC-3 inserted:', uc3Result.data?.[0]?.id);

    console.log('\n✅ All PRDs and Use Cases inserted successfully!');
    console.log('\n📊 Summary:');
    console.log('- PRD: prd-revenue-recovery-critical-day47');
    console.log('- UC-1: uc-fix-email-verification-day47 (P1, +$370 MRR)');
    console.log('- UC-2: uc-auto-trigger-onboarding-day47 (P1, +$1309 MRR)');
    console.log('- UC-3: uc-enable-trial-to-paid-checkout-day47 (P1, +$1500 MRR)');
    console.log('- Total revenue impact: +$3,179 MRR if all three executed');

  } catch (error) {
    console.error('❌ Error inserting PRD/UCs:', error.message);
    if (error.details) console.error('Details:', error.details);
    process.exit(1);
  }
}

insertPRDAndUCs();
