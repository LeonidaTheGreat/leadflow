require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    // 1. Upsert PRD record with status = approved
    const prdId = 'PRD-REVENUE-RECOVERY-007';
    const prdFilePath = 'docs/prd/PRD-REVENUE-RECOVERY-007-CRITICAL-ACTIONS.md';
    
    const { data: prdData, error: prdError } = await sb
      .from('prds')
      .upsert({
        id: prdId,
        project_id: 'leadflow',
        title: 'Revenue Recovery — 7-Day Critical Action Plan',
        file_path: prdFilePath,
        description: 'Three executable actions to unlock revenue: (1) Pilot recruitment approval, (2) Email delivery fix via Vercel env vars, (3) Stripe payment processing fix. Conservative path to $9.2K MRR by Day 47; aggressive path to $19.5K MRR.',
        status: 'approved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
    
    if (prdError) {
      console.error('❌ PRD upsert error:', prdError);
      process.exit(1);
    }
    console.log('✅ PRD record upserted:', prdId);

    // 2. Find and link the revenue alert use case
    const { data: useCases, error: ucError } = await sb
      .from('use_cases')
      .select('id')
      .eq('project_id', 'leadflow')
      .ilike('title', '%revenue%critical%')
      .limit(1);
    
    if (ucError) {
      console.error('❌ Use case lookup error:', ucError);
      process.exit(1);
    }
    
    if (useCases && useCases.length > 0) {
      const ucId = useCases[0].id;
      const { error: linkError } = await sb
        .from('use_cases')
        .update({ prd_id: prdId, updated_at: new Date().toISOString() })
        .eq('id', ucId);
      
      if (linkError) {
        console.error('❌ UC update error:', linkError);
        process.exit(1);
      }
      console.log('✅ Use case linked to PRD:', ucId);
    }

    // 3. Insert E2E test specs
    const testSpecs = [
      {
        id: 'e2e-revenue-action-1-pilot-recruitment',
        project_id: 'leadflow',
        prd_id: prdId,
        title: 'Pilot Recruitment Approval & Execution',
        description: 'Verify pilot recruitment approval, invite emails, and agent onboarding work',
        test_steps: JSON.stringify(['Stojan approves pilot recruitment','Marketing sends 3 invite emails','Agents click link and auto-login','Verify real_estate_agents with email_verified=true and plan_tier=pilot']),
        expected_outcome: '3+ pilot agents onboarded with email_verified=true, plan_tier=pilot',
        status: 'pending'
      },
      {
        id: 'e2e-revenue-action-2-email-delivery',
        project_id: 'leadflow',
        prd_id: prdId,
        title: 'Email Delivery Fix (Vercel RESEND_API_KEY)',
        description: 'Verify RESEND_API_KEY is set in Vercel and signup emails deliver',
        test_steps: JSON.stringify(['Verify RESEND_API_KEY set in Vercel production','Sign up with real email','Receive verification email within 30 seconds','Confirm email_verified=true']),
        expected_outcome: 'Verification email arrives within 30 seconds, email_verified=true',
        status: 'pending'
      },
      {
        id: 'e2e-revenue-action-3-stripe-payment',
        project_id: 'leadflow',
        prd_id: prdId,
        title: 'Stripe Payment Processing Fix (Vercel Env Vars)',
        description: 'Verify STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET set in Vercel and payment processing works',
        test_steps: JSON.stringify(['Verify STRIPE_SECRET_KEY in Vercel production','Verify STRIPE_WEBHOOK_SECRET in Vercel production','POST to /api/billing/create-checkout returns HTTP 200','Complete Stripe checkout with test card']),
        expected_outcome: '/api/billing/create-checkout returns HTTP 200, test checkout succeeds',
        status: 'pending'
      }
    ];

    for (const spec of testSpecs) {
      const { error: specError } = await sb
        .from('e2e_test_specs')
        .upsert(spec, { onConflict: 'id' });
      
      if (specError) {
        console.error(`❌ E2E spec error (${spec.id}):`, specError);
      } else {
        console.log(`✅ E2E test spec created: ${spec.id}`);
      }
    }

    console.log('\n✅ All Supabase records updated');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
