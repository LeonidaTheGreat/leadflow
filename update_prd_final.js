require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    const prdId = 'PRD-REVENUE-RECOVERY-007';

    // Find the revenue alert use case by name
    const { data: useCases, error: ucError } = await sb
      .from('use_cases')
      .select('id, name')
      .eq('project_id', 'leadflow')
      .or('name.ilike.%revenue%critical%,name.ilike.%revenue%alert%');
    
    if (ucError) {
      console.error('❌ Use case lookup error:', ucError);
      process.exit(1);
    }
    
    console.log(`Found ${useCases.length} revenue-related use cases:`);
    useCases.forEach(uc => console.log(`  - ${uc.id}: ${uc.name}`));

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
      console.log(`✅ Use case linked to PRD: ${ucId}`);
    }

    // 3. Insert E2E test specs
    const testSpecs = [
      {
        id: 'e2e-revenue-action-1-pilot-recruitment',
        project_id: 'leadflow',
        prd_id: prdId,
        title: 'Pilot Recruitment Approval & Execution',
        description: 'Verify pilot recruitment approval, invite emails, and agent onboarding work',
        test_steps: JSON.stringify(['Stojan approves pilot recruitment','Marketing sends 3 invite emails','Agents click link and auto-login','Verify real_estate_agents with email_verified=true']),
        expected_outcome: '3+ pilot agents onboarded with email_verified=true',
        status: 'pending'
      },
      {
        id: 'e2e-revenue-action-2-email-delivery',
        project_id: 'leadflow',
        prd_id: prdId,
        title: 'Email Delivery Fix (Vercel RESEND_API_KEY)',
        description: 'Verify RESEND_API_KEY is set in Vercel and signup emails deliver',
        test_steps: JSON.stringify(['Verify RESEND_API_KEY in Vercel production','Sign up with real email','Receive verification email within 30 seconds','Confirm email_verified=true']),
        expected_outcome: 'Verification email arrives within 30 seconds, email_verified=true',
        status: 'pending'
      },
      {
        id: 'e2e-revenue-action-3-stripe-payment',
        project_id: 'leadflow',
        prd_id: prdId,
        title: 'Stripe Payment Processing Fix (Vercel Env Vars)',
        description: 'Verify STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET set in Vercel',
        test_steps: JSON.stringify(['Verify STRIPE_SECRET_KEY in Vercel production','Verify STRIPE_WEBHOOK_SECRET in Vercel production','POST to /api/billing/create-checkout returns HTTP 200','Test checkout with test card']),
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

    console.log('\n✅ All Subabase records updated');
    process.exit(0);
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

main();
