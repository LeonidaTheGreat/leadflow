require('dotenv').config({ path: '.env' });
const { createClient } = require('../lib/db');

const sb = createClient(
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_SECRET_KEY
);

async function insertRevenuePRD() {
  try {
    // 1. Insert PRD
    const prdId = 'prd-revenue-alert-critical-2026-04-04';
    const prdFilePath = 'docs/prd/PRD-REVENUE-ALERT-CRITICAL-2026-04-04.md';
    
    const { data: prdData, error: prdErr } = await sb
      .from('prds')
      .insert({
        id: prdId,
        project_id: 'leadflow',
        title: 'Revenue Alert — Critical MRR Recovery Action Plan',
        description: 'Analysis of $0 MRR status, root cause (98% drop-off at onboarding), and 4-action plan to reach $20K target',
        file_path: prdFilePath,
        status: 'draft'
      })
      .select();
    
    if (prdErr) {
      if (prdErr.message.includes('duplicate')) {
        console.log(`⚠️  PRD already exists: ${prdId}`);
      } else {
        throw prdErr;
      }
    } else {
      console.log(`✅ PRD inserted: ${prdId}`);
    }
    
    // 2. Create use cases linked to this PRD
    const ucs = [
      {
        id: 'uc-auto-trigger-onboarding-post-verify',
        name: 'Auto-Trigger Onboarding Wizard After Email Verification',
        phase: 'stabilization',
        priority: 1,
        description: 'When agent verifies email, auto-trigger onboarding wizard. Currently 255 verified agents stuck at verification. Redirect to /dashboard/onboarding immediately.',
        revenue_impact: 'high',
        acceptance_criteria: 'Verified agents (email_verified=true) automatically enter onboarding wizard. Acceptance check: SELECT COUNT(*) FROM real_estate_agents WHERE email_verified=true AND onboarding_step > 0 >= 50'
      },
      {
        id: 'uc-fix-onboarding-aha-moment',
        name: 'Fix Onboarding Wizard Aha Moment — Live Lead Simulator',
        phase: 'stabilization',
        priority: 1,
        description: 'Embed lead simulator in onboarding. 5 agents completed onboarding but 0 have aha moment. Make FUB optional, instant demo of AI response.',
        revenue_impact: 'high',
        acceptance_criteria: 'Agents see live lead simulator with AI response in <30 seconds. FUB connection is optional. Acceptance check: SELECT COUNT(*) FROM real_estate_agents WHERE onboarding_completed=true AND (fub_connected=true OR phone_configured=true) >= 4'
      },
      {
        id: 'uc-trial-to-paid-conversion-flow',
        name: 'Trial-to-Paid Email Sequence & Stripe Checkout Integration',
        phase: 'stabilization',
        priority: 1,
        description: 'Implement trial countdown (14 days), pre-expiry email sequence (days 3,7,14), and Stripe checkout flow. Currently 0 paid agents.',
        revenue_impact: 'critical',
        acceptance_criteria: 'First paid conversion succeeds end-to-end. Acceptance check: SELECT COUNT(*) FROM real_estate_agents WHERE subscription_status=\'active\' AND mrr > 0 >= 1'
      },
      {
        id: 'uc-manual-pilot-recruitment',
        name: 'Manual Pilot Recruitment — 5 Real Agents, White-Glove Onboarding',
        phase: 'recruitment',
        priority: 1,
        description: 'Stojan recruits 5 real estate agents via admin invite. White-glove onboarding. Convert 2-3 to paid to validate Stripe + PMF.',
        revenue_impact: 'medium',
        acceptance_criteria: 'Acceptance check: SELECT COUNT(*) FROM real_estate_agents WHERE source=\'pilot\' AND subscription_status=\'active\' AND mrr > 0 >= 2'
      }
    ];
    
    for (const uc of ucs) {
      const { data: existingUc, error: checkErr } = await sb
        .from('use_cases')
        .select('id')
        .eq('id', uc.id)
        .limit(1);
      
      if (existingUc && existingUc.length > 0) {
        console.log(`⚠️  UC already exists: ${uc.id}`);
        continue;
      }
      
      const { error: ucErr } = await sb
        .from('use_cases')
        .insert({
          id: uc.id,
          project_id: 'leadflow',
          name: uc.name,
          phase: uc.phase,
          priority: uc.priority,
          prd_id: prdId,
          description: uc.description,
          revenue_impact: uc.revenue_impact,
          acceptance_criteria: uc.acceptance_criteria
        })
        .select();
      
      if (ucErr) {
        throw ucErr;
      }
      console.log(`✅ UC created: ${uc.id}`);
    }
    
    console.log(`\n✅ Revenue PRD and UCs inserted successfully`);
    console.log(`\nPRD file: docs/prd/PRD-REVENUE-ALERT-CRITICAL-2026-04-04.md`);
    console.log(`\nNext steps:`);
    console.log(`1. Orchestrator spawns dev tasks for UC-1, UC-2, UC-3`);
    console.log(`2. Stojan recruits 5 pilots for UC-4`);
    console.log(`3. Dev delivers each UC with acceptance checks passing`);
    console.log(`4. QC validates; PM signs off`);
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

insertRevenuePRD();
