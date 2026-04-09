#!/usr/bin/env node

/**
 * Update Supabase with the Day 44 Revenue Recovery PRD and Use Cases
 * This inserts the PRD reference and creates/updates critical use cases
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('../../lib/db');

const sb = createClient(
  process.env.NEXT_PUBLIC_API_URL,
  process.env.API_SECRET_KEY
);

const PROJECT_ID = 'leadflow';

async function main() {
  console.log('[revenue-recovery] Starting PRD and UC update...\n');

  try {
    // 1. Insert/Update the PRD record
    console.log('[1/3] Inserting PRD-REVENUE-RECOVERY-002...');
    const prdId = 'PRD-REVENUE-RECOVERY-002-DAY44';
    const prdPath = 'docs/prd/PRD-REVENUE-RECOVERY-002-DAY44.md';

    const { data: existingPrd, error: selectErr } = await sb
      .from('prds')
      .select('id')
      .eq('id', prdId)
      .single();

    const prdData = {
      id: prdId,
      project_id: PROJECT_ID,
      title: 'Revenue Recovery Alert — Day 44 Critical Status',
      file_path: prdPath,
      description: 'Analysis of Day 44 revenue gap ($0 MRR vs $9,670 target). Root cause: go-to-market execution blocked, not technical. Recommends 5 actions: validate funnel, unlock pilot recruitment, fix conversion path, prove first paid customer, scale to 20+ agents.',
      status: 'active',
      version: 1,
      created_at: new Date().toISOString(),
    };

    if (selectErr?.code === 'PGRST116') {
      // Not found, insert
      const { data, error } = await sb.from('prds').insert([prdData]);
      if (error) throw error;
      console.log('  ✓ PRD inserted');
    } else {
      // Exists, update
      const { error } = await sb
        .from('prds')
        .update({ ...prdData, updated_at: new Date().toISOString() })
        .eq('id', prdId);
      if (error) throw error;
      console.log('  ✓ PRD updated');
    }

    // 2. Create/Update critical use cases
    console.log('\n[2/3] Creating/updating critical UCs...');

    const criticalUCs = [
      {
        id: 'UC-TRIAL-CONVERSION-V2',
        project_id: PROJECT_ID,
        name: 'Trial-to-Paid Conversion Path (Day 44 Recovery)',
        phase: 'Phase 3',
        status: 'not_started',
        priority: 1,
        prd_id: prdId,
        description: 'Execute Actions 1-4 from revenue recovery PRD: validate funnel state, unlock pilot recruitment, fix root conversion blocker, prove first paid customer by Day 55. This is the critical path to $20K MRR.',
        revenue_impact: 'CRITICAL',
        acceptance_criteria: JSON.stringify([
          'Funnel state validated by Day 46 (traffic, signups, conversion rates)',
          'Pilot agent recruitment approved and first agent onboarded by Day 50',
          'Root cause of missing revenue identified and fixed (A/B test, paid ads, or instrumentation)',
          'First paying customer converts by Day 55 (≥$149 MRR)',
          'GA4 events firing correctly for signup→onboarding→trial→paid journey',
          'Stripe webhooks executing on checkout.session.completed and updating plan_tier',
          'Email sequences activating for pilot-to-paid conversion',
        ]),
      },
      {
        id: 'uc-first-paid-customer-proof-v2',
        project_id: PROJECT_ID,
        name: 'First Paid Customer Proof of Concept (Day 44 Target)',
        phase: 'Phase 3',
        status: 'not_started',
        priority: 1,
        prd_id: prdId,
        description: 'Get one pilot agent to upgrade from free pilot to paid Pro plan ($149/mo) by Day 55. Manually recruit 1 agent, offer $50 discount, verify Stripe integration works end-to-end, collect testimonial.',
        revenue_impact: 'CRITICAL',
        acceptance_criteria: JSON.stringify([
          '1 pilot agent recruited and onboarded by Day 50',
          'Agent completes onboarding wizard (FUB + Twilio + SMS verified)',
          'Agent receives sample leads via FUB webhook',
          'Agent sees upgrade CTA in dashboard with $50 discount offer',
          'Agent initiates Stripe Checkout via dashboard',
          'Stripe checkout.session.completed webhook fires',
          'real_estate_agents.plan_tier updates to "pro"',
          'real_estate_agents.stripe_customer_id is set',
          'subscriptions table has new row',
          'MRR increases from $0 to $149',
          'Confirmation email sent',
          'Testimonial collected for marketing',
        ]),
      },
      {
        id: 'uc-validate-funnel-instrumentation',
        project_id: PROJECT_ID,
        name: 'Funnel Validation & Instrumentation Check',
        phase: 'Phase 3',
        status: 'not_started',
        priority: 1,
        prd_id: prdId,
        description: 'Immediate validation of why MRR is $0. Hypothesis: either landing page has zero traffic, or funnel data is not being tracked. Execute Actions 1-level diagnostics.',
        revenue_impact: 'CRITICAL',
        acceptance_criteria: JSON.stringify([
          'GA4 Measurement ID confirmed set in Vercel env',
          'GA4 events verified firing on signup, onboarding_start, plan_selection, checkout_start, checkout_complete',
          'Vercel analytics: landing page unique visits (7-day) reported',
          'Supabase real_estate_agents: count of non-smoke/non-test signups created in past 7 days',
          'agent_sessions table: count of sessions created in past 7 days',
          'Stripe API: list Stripe customers created in past 7 days',
          'Funnel conversion rates calculated: visits → signups → completions → paid',
          'Bottleneck identified (no traffic, poor conversion rate, or data gap)',
          'Root cause documented in product_feedback',
        ]),
      },
    ];

    for (const uc of criticalUCs) {
      const { data: existing, error: checkErr } = await sb
        .from('use_cases')
        .select('id')
        .eq('id', uc.id)
        .single();

      if (checkErr?.code === 'PGRST116') {
        // Insert
        const { error: insertErr } = await sb.from('use_cases').insert([uc]);
        if (insertErr) throw insertErr;
        console.log(`  ✓ ${uc.id} inserted`);
      } else {
        // Update
        const { error: updateErr } = await sb
          .from('use_cases')
          .update(uc)
          .eq('id', uc.id);
        if (updateErr) throw updateErr;
        console.log(`  ✓ ${uc.id} updated`);
      }
    }

    // 3. Create E2E test specs
    console.log('\n[3/3] Creating E2E test specs...');

    const e2eSpecs = [
      {
        id: 'e2e-rev-002-funnel-instrumentation',
        project_id: PROJECT_ID,
        use_case_id: 'uc-validate-funnel-instrumentation',
        name: 'Funnel Instrumentation Validation',
        description: 'Test that all analytics events fire correctly during signup→onboarding→trial→paid journey',
        test_steps: JSON.stringify([
          '1. Load landing page, verify GA4 gtag.js loaded',
          '2. Enter email in signup form, click submit',
          '3. Verify GA4 signup event fires with utm_source, email',
          '4. Complete email verification, redirect to dashboard/onboarding',
          '5. Verify GA4 onboarding_start event',
          '6. Connect FUB API key, verify GA4 fub_connected event',
          '7. Configure Twilio, verify GA4 phone_configured event',
          '8. Complete aha moment simulator, verify GA4 aha_completed event',
          '9. Click Upgrade button, verify GA4 upgrade_initiated event',
          '10. Complete Stripe checkout, verify GA4 checkout_complete event',
          '11. Query Supabase: real_estate_agents row created with correct data',
          '12. Query Supabase: agent_sessions row created with session_start',
          '13. Query Stripe API: customer created with correct email',
        ]),
        acceptance_criteria: JSON.stringify([
          'All 13 steps execute without error',
          'GA4 events appear in real-time debugger within 2 seconds',
          'Supabase records reflect changes within 5 seconds',
          'Stripe webhook processes within 30 seconds',
        ]),
      },
      {
        id: 'e2e-rev-002-first-paid-customer',
        project_id: PROJECT_ID,
        use_case_id: 'uc-first-paid-customer-proof-v2',
        name: 'First Paid Customer End-to-End',
        description: 'Full journey: recruit pilot agent → onboard → send sample lead → upgrade to paid → verify MRR',
        test_steps: JSON.stringify([
          '1. Stojan recruits 1 real real estate agent (manual outreach)',
          '2. Agent receives invite email with magic link',
          '3. Agent clicks link, signs up, completes onboarding',
          '4. FUB + Twilio are connected successfully',
          '5. Test lead arrives via FUB webhook',
          '6. AI SMS is sent within 30 seconds',
          '7. Agent sees SMS in dashboard with delivery status',
          '8. Stojan sends upgrade offer: "Pro plan for $99/month (normally $149) for first month"',
          '9. Agent clicks "Upgrade to Pro" button in dashboard',
          '10. Stripe Checkout page opens with correct price ($99)',
          '11. Agent enters test card 4242 4242 4242 4242',
          '12. Payment succeeds, redirect to /dashboard with success banner',
          '13. Stripe webhook fires, updates real_estate_agents.plan_tier to "pro"',
          '14. MRR increases from $0 to $99',
          '15. Confirmation email sent',
          '16. Agent continues using product, receives lead responses',
        ]),
        acceptance_criteria: JSON.stringify([
          'All 16 steps complete successfully',
          'No errors or 500 responses at any step',
          'Stripe charge appears in live dashboard within 1 minute',
          'real_estate_agents.plan_tier = "pro" by 1 minute post-payment',
          'subscriptions table has new row',
          'MRR calculation includes $99 for this agent',
          'Agent confirms they are receiving real SMS to leads',
        ]),
      },
    ];

    for (const spec of e2eSpecs) {
      const { data: existing, error: checkErr } = await sb
        .from('e2e_test_specs')
        .select('id')
        .eq('id', spec.id)
        .single();

      if (checkErr?.code === 'PGRST116') {
        const { error: insertErr } = await sb.from('e2e_test_specs').insert([spec]);
        if (insertErr) throw insertErr;
        console.log(`  ✓ ${spec.id} inserted`);
      } else {
        const { error: updateErr } = await sb
          .from('e2e_test_specs')
          .update(spec)
          .eq('id', spec.id);
        if (updateErr) throw updateErr;
        console.log(`  ✓ ${spec.id} updated`);
      }
    }

    console.log('\n✅ All updates complete. PRD and UCs ready for dev/marketing execution.\n');
    console.log('Next steps:');
    console.log('  1. Review PRD-REVENUE-RECOVERY-002-DAY44.md');
    console.log('  2. Validate funnel state (Actions 1 from PRD)');
    console.log('  3. Unlock pilot recruitment (Stojan approval needed)');
    console.log('  4. Execute root cause fix (A/B test, paid ads, or instrumentation)');
    console.log('  5. Convert first paid customer by Day 55\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
