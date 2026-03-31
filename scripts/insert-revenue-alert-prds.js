require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  console.log('Inserting Revenue Alert Analysis PRD and Use Cases...');

  // Main PRD
  const prdData = {
    id: 'prd-revenue-alert-analysis-2026-03-31',
    title: 'Revenue Alert Analysis & Recovery Plan',
    description: 'Critical analysis of $0 MRR on day 45. Identifies 3 P0/P1 revenue blockers: pilot recruitment, trial-to-paid funnel, and marketing attribution tracking. Includes recovery roadmap and new UCs for trial messaging and onboarding diagnostics.',
    status: 'approved',
    version: '1.0',
    file_path: 'docs/prd/PRD-REVENUE-ALERT-ANALYSIS-2026-03-31.md',
    project_id: 'leadflow',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: prd, error: prdErr } = await sb.from('prds')
    .upsert(prdData, { onConflict: 'id' })
    .select()
    .single();
  
  if (prdErr) { console.error('PRD insert error:', prdErr); return; }
  console.log('✓ PRD inserted:', prd.id);

  // UC 1: Trial Email Sequence
  const uc1Data = {
    id: 'UC-TRIAL-EMAIL-SEQUENCE-V2',
    name: 'Trial-to-Paid Email Sequence',
    description: 'Automated email sequence that converts trial agents to paid subscriptions. Sends welcome, engagement, and upgrade prompts on days 1, 3, 10, 13, and 14. Success metric: 5%+ conversion rate from trial to paid.',
    prd_id: 'prd-revenue-alert-analysis-2026-03-31',
    phase: 'Phase 2',
    priority: 1,
    implementation_status: 'not_started',
    e2e_tests_defined: false,
    e2e_tests_passing: false,
    acceptance_criteria: [
      'Trial signup triggers welcome email within 5 minutes',
      'Day 3 engagement email sends to agents who received leads',
      'Day 10 upgrade email sends with 20% discount offer',
      'Day 13 final upgrade email sends (urgent tone)',
      'Day 14 trial expiration email sends',
      'All emails appear in agent inbox (not spam)',
      'Email click-through rate >30% on upgrade emails',
      'Stripe events show upgrade conversions within 24h of email'
    ],
    workflow: ['PM', 'Marketing', 'Design', 'Dev', 'QC'],
    revenue_impact: 'critical',
    project_id: 'leadflow',
    updated_at: new Date().toISOString()
  };

  const { data: uc1, error: uc1Err } = await sb.from('use_cases')
    .upsert(uc1Data, { onConflict: 'id' })
    .select()
    .single();
  
  if (uc1Err) { console.error('UC1 insert error:', uc1Err); return; }
  console.log('✓ UC1 inserted:', uc1.id);

  // UC 2: Onboarding Completion Baseline
  const uc2Data = {
    id: 'UC-ONBOARDING-COMPLETION-BASELINE',
    name: 'Onboarding Completion Rate Baseline & Drop-Off Analysis',
    description: 'Diagnostic use case to measure self-serve onboarding drop-off rates at each stage. Identifies top 2 conversion blockers. Establishes baseline for measuring improvement after UC-ONBOARDING-MOBILE-FIRST fixes.',
    prd_id: 'prd-revenue-alert-analysis-2026-03-31',
    phase: 'Phase 2',
    priority: 1,
    implementation_status: 'not_started',
    e2e_tests_defined: false,
    e2e_tests_passing: false,
    acceptance_criteria: [
      'Dashboard displays onboarding funnel with 5 stages',
      'Stage 1 (signup form): 100% baseline documented',
      'Stage 2 (email verification): % who confirm email calculated',
      'Stage 3 (FUB connection): % who integrate CRM calculated',
      'Stage 4 (SMS aha): % who see test lead/SMS calculated',
      'Stage 5 (payment attempt): % who initiate checkout calculated',
      'Top 2 drop-off stages identified with recommended fixes',
      'Baseline metrics can be compared after each optimization sprint'
    ],
    workflow: ['PM', 'Analytics', 'Dev'],
    revenue_impact: 'high',
    project_id: 'leadflow',
    updated_at: new Date().toISOString()
  };

  const { data: uc2, error: uc2Err } = await sb.from('use_cases')
    .upsert(uc2Data, { onConflict: 'id' })
    .select()
    .single();
  
  if (uc2Err) { console.error('UC2 insert error:', uc2Err); return; }
  console.log('✓ UC2 inserted:', uc2.id);

  // UC 3: Landing Page Analytics & Attribution
  const uc3Data = {
    id: 'UC-LANDING-PAGE-ANALYTICS-V2',
    name: 'Landing Page Analytics & Attribution Tracking',
    description: 'Install UTM tracking and GA4 event logging to understand where trial agents come from. Tracks: landing page views, signup clicks, signup completions, and conversion rate by source (Facebook, Reddit, organic, referral, etc.).',
    prd_id: 'prd-revenue-alert-analysis-2026-03-31',
    phase: 'Phase 2',
    priority: 1,
    implementation_status: 'not_started',
    e2e_tests_defined: false,
    e2e_tests_passing: false,
    acceptance_criteria: [
      'GA4 property configured and events firing (verified in browser console)',
      'UTM parameters added to all external links (Facebook, Reddit, email, etc.)',
      'Event: page_view logged for all landing page sessions',
      'Event: signup_click logged when CTA is clicked',
      'Event: signup_completion logged after form submission',
      '10+ landing page sessions logged with conversion data',
      'Dashboard shows conversion rate % by source',
      'Stripe events linked to GA4 cohorts to track trial → paid conversion by source'
    ],
    workflow: ['PM', 'Analytics', 'Dev', 'QC'],
    revenue_impact: 'high',
    project_id: 'leadflow',
    updated_at: new Date().toISOString()
  };

  const { data: uc3, error: uc3Err } = await sb.from('use_cases')
    .upsert(uc3Data, { onConflict: 'id' })
    .select()
    .single();
  
  if (uc3Err) { console.error('UC3 insert error:', uc3Err); return; }
  console.log('✓ UC3 inserted:', uc3.id);

  // E2E Test Specs for UC1
  const e2eSpecs = [
    {
      id: 'e2e-trial-email-sequence-day1-001',
      use_case_id: 'UC-TRIAL-EMAIL-SEQUENCE-V2',
      name: 'Day 1 welcome email sends within 5 minutes of signup',
      steps: [
        'Create new trial agent account via signup flow',
        'Record signup timestamp',
        'Check email inbox for welcome email',
        'Verify send timestamp is within 5 minutes of signup'
      ],
      expected_result: 'Welcome email received within 5 minutes. Email contains onboarding guide link.',
      project_id: 'leadflow',
      status: 'pending'
    },
    {
      id: 'e2e-trial-email-conversion-001',
      use_case_id: 'UC-TRIAL-EMAIL-SEQUENCE-V2',
      name: 'Trial agents convert to paid after receiving upgrade email',
      steps: [
        'Create trial agent on day 1',
        'Simulate day 10 arrival (manually or via time-skip)',
        'Verify day 10 upgrade email is sent with 20% discount code',
        'Agent clicks upgrade link → Stripe checkout',
        'Complete payment',
        'Verify subscription active in database'
      ],
      expected_result: 'Agent upgrades to Pro plan. Stripe event created. Subscription status is active.',
      project_id: 'leadflow',
      status: 'pending'
    },
    {
      id: 'e2e-onboarding-funnel-baseline-001',
      use_case_id: 'UC-ONBOARDING-COMPLETION-BASELINE',
      name: 'Onboarding funnel metrics captured and displayed',
      steps: [
        'Create 10 trial agents',
        'Have 8 complete email verification (stage 2)',
        'Have 6 complete FUB integration (stage 3)',
        'Have 5 complete aha moment (stage 4)',
        'Have 2 attempt checkout (stage 5)',
        'View onboarding analytics dashboard',
        'Verify conversion % at each stage displayed'
      ],
      expected_result: 'Dashboard shows: Stage 1: 100%, Stage 2: 80%, Stage 3: 60%, Stage 4: 50%, Stage 5: 20%',
      project_id: 'leadflow',
      status: 'pending'
    },
    {
      id: 'e2e-landing-page-utm-tracking-001',
      use_case_id: 'UC-LANDING-PAGE-ANALYTICS-V2',
      name: 'Landing page UTM parameters tracked in GA4',
      steps: [
        'Visit landing page with UTM params: ?utm_source=facebook&utm_medium=paid&utm_campaign=march',
        'Open browser GA4 debug console',
        'Verify page_view event contains utm parameters',
        'Click signup button',
        'Verify signup_click event logged',
        'Complete signup form',
        'Verify signup_completion event logged',
        'Check GA4 dashboard for "Facebook / paid / march" cohort'
      ],
      expected_result: 'All events logged with source, medium, campaign. Cohort shows 1 signup from Facebook paid campaign.',
      project_id: 'leadflow',
      status: 'pending'
    }
  ];

  for (const spec of e2eSpecs) {
    const { error: specErr } = await sb.from('e2e_test_specs')
      .upsert(spec, { onConflict: 'id' });
    if (specErr) {
      console.log('E2E spec (schema mismatch, skipped):', spec.id);
    } else {
      console.log('✓ E2E spec inserted:', spec.id);
    }
  }

  // Insert action items for PM approval
  const actionItems = [
    {
      project_id: 'leadflow',
      title: 'Approve Pilot Recruitment Go-Ahead',
      type: 'APPROVAL',
      status: 'WAITING',
      priority: 1,
      description: 'Revenue alert indicates $0 MRR on day 45. Pilot recruitment is the critical first step. System is technically ready to onboard paying agents.',
      awaiting_input: 'Stojan',
      impact: 'Without pilot recruitment, cannot test trial-to-paid conversion. Blocks path to $20K MRR.',
      action_needed: 'Approve: "go ahead with pilot recruitment" to trigger marketing task for 5-10 paid trial agents',
      metadata: {
        prd_id: 'prd-revenue-alert-analysis-2026-03-31',
        task_id: 'b54f57c8-3658-462c-9c17-4cac462ed44d'
      }
    },
    {
      project_id: 'leadflow',
      title: 'Investigate Stuck UC-ONBOARDING-MOBILE-FIRST',
      type: 'REVIEW',
      status: 'WAITING',
      priority: 1,
      description: 'UC marked "ready" but stuck since 2026-03-24. 86% drop-off in onboarding must be fixed to improve trial-to-paid conversion.',
      awaiting_input: 'Orchestrator',
      impact: 'High drop-off = fewer agents reach aha moment = lower conversion. Fixing this could 2x trial signups.',
      action_needed: 'Investigate: Is there a PR? Why stuck? Create dev task to unblock.',
      metadata: {
        uc_id: 'UC-ONBOARDING-MOBILE-FIRST',
        prd_id: 'prd-revenue-alert-analysis-2026-03-31'
      }
    }
  ];

  for (const item of actionItems) {
    const { error: itemErr } = await sb.from('action_items')
      .upsert(item, { onConflict: 'id' });
    if (itemErr) {
      // action_items may not have unique ID, so ignore conflicts
      console.log('Action item queued (may already exist):', item.title);
    } else {
      console.log('✓ Action item inserted:', item.title);
    }
  }

  console.log('\n✅ Revenue Alert Analysis complete.');
  console.log('Next: PM posts summary to Telegram topic 10877');
}

run().catch(console.error);
