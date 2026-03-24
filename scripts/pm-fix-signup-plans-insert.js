require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const now = new Date().toISOString();

  // 1. Insert PRD
  const { data: prd, error: prdErr } = await sb.from('prds').upsert({
    id: 'PRD-FIX-SIGNUP-PLAN-OPTIONS-001',
    project_id: 'leadflow',
    title: 'Fix Signup Page — Plan Options Not Displayed',
    description: 'The signup page shows "Choose Your Plan" heading but renders no plan cards. Users cannot select a tier, blocking self-serve conversion entirely. Fix root cause (env var, build issue, or stale deploy) and ensure all 3 plan cards render on the deployed site.',
    file_path: 'docs/PRD-FIX-SIGNUP-PLAN-OPTIONS-001.md',
    status: 'approved',
    version: '1.0',
    updated_at: now
  }, { onConflict: 'id' }).select().single();

  if (prdErr) { console.error('PRD insert error:', prdErr); process.exit(1); }
  console.log('PRD inserted:', prd.id);

  // 2. Create new fix UC
  const { data: uc, error: ucErr } = await sb.from('use_cases').upsert({
    id: 'fix-signup-plan-options-not-displayed',
    project_id: 'leadflow',
    name: 'Signup page shows Choose Your Plan but no plan options are listed',
    description: 'Bug: The /signup page renders the "Choose Your Plan" heading but shows no plan cards (Starter, Pro, Team). Users cannot select a plan tier and the sign-up flow is entirely broken. Root cause TBD — likely a Vercel env var missing or stale deployment.',
    implementation_status: 'not_started',
    priority: 1,
    revenue_impact: 'high',
    workflow: ['dev', 'qc'],
    prd_id: 'PRD-FIX-SIGNUP-PLAN-OPTIONS-001',
    acceptance_criteria: [
      'Navigate to https://leadflow-ai-five.vercel.app/signup — 3 plan cards (Starter/Pro/Team) are visible with prices and features',
      'Clicking Get Started on any plan advances to the account details form with the selected plan shown',
      'Back button on the details form returns to the plan selection grid',
      'No JS console errors on the signup page',
      'npm run build succeeds without undefined env var warnings'
    ],
    e2e_tests_defined: false,
    e2e_tests_passing: false,
    updated_at: now
  }, { onConflict: 'id' }).select().single();

  if (ucErr) { console.error('UC insert error:', ucErr); process.exit(1); }
  console.log('UC inserted:', uc.id);

  // 3. Create dev task
  const devDescription = [
    '## Fix: Signup Page Shows No Plan Options',
    '',
    'The deployed signup page at https://leadflow-ai-five.vercel.app/signup shows "Choose Your Plan" heading but no plan cards.',
    '',
    '## Source File',
    'product/lead-response/dashboard/app/signup/page.tsx',
    '',
    'The PLANS array is defined at module level with process.env.NEXT_PUBLIC_STRIPE_PRICE_* || fallback.',
    'The page renders {PLANS.map(...)} for the plan grid.',
    '',
    '## Investigation Steps',
    '1. Check Vercel env vars: `vercel env ls --scope stojans-projects-7db98187` (run from dashboard dir)',
    '2. Check if NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY, NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY, NEXT_PUBLIC_STRIPE_PRICE_TEAM_MONTHLY are set in Vercel',
    '3. Try local build: `cd product/lead-response/dashboard && npm run build` — check for errors',
    '4. Inspect browser console on deployed page for JS errors',
    '5. Check if latest commit is actually deployed (vercel ls)',
    '',
    '## Fix',
    'Root cause will determine fix:',
    '- If env vars missing in Vercel: add them + redeploy',
    '- If build error: fix the build + redeploy',
    '- If stale deploy: ensure latest commit is deployed with `cd product/lead-response/dashboard && vercel --prod`',
    '- If PLANS array crashes at module level: make env var access unconditional with hardcoded fallbacks',
    '',
    '## PRD Reference',
    'PRD-FIX-SIGNUP-PLAN-OPTIONS-001 at docs/PRD-FIX-SIGNUP-PLAN-OPTIONS-001.md',
    '',
    '## Acceptance Criteria',
    '- 3 plan cards (Starter/Pro/Team) visible at https://leadflow-ai-five.vercel.app/signup',
    '- Plan selection advances to details form',
    '- No JS console errors',
    '- Build succeeds cleanly'
  ].join('\n');

  const { data: task, error: taskErr } = await sb.from('tasks').insert({
    title: 'Dev: fix-signup-plan-options-not-displayed - Fix plan cards not rendering on signup page',
    description: devDescription,
    project_id: 'leadflow',
    use_case_id: 'fix-signup-plan-options-not-displayed',
    prd_id: 'PRD-FIX-SIGNUP-PLAN-OPTIONS-001',
    agent_id: 'dev',
    status: 'ready',
    priority: 1,
    estimated_hours: 1,
    estimated_cost_usd: 0.2,
    tags: ['bug', 'fix', 'signup'],
    metadata: {
      workflow_step: 1,
      workflow_total: 2,
      created_by: 'product-manager',
      triage_task_id: '06e86d47-d430-42d0-b472-edc9e4fa63f7'
    },
    acceptance_criteria: [
      '3 plan cards (Starter/Pro/Team) visible at https://leadflow-ai-five.vercel.app/signup',
      'Plan selection advances to account details form',
      'Back button returns to plan grid',
      'No JS console errors on signup page',
      'Build succeeds without errors'
    ],
    max_retries: 3,
    created_at: now,
    updated_at: now
  }).select().single();

  if (taskErr) { console.error('Task insert error:', taskErr); process.exit(1); }
  console.log('Dev task created:', task.id, '| status:', task.status);

  // 4. E2E test specs
  const { data: e2eTests, error: e2eErr } = await sb.from('e2e_test_specs').upsert([
    {
      id: 'e2e-signup-plan-grid-renders',
      project_id: 'leadflow',
      use_case_id: 'fix-signup-plan-options-not-displayed',
      prd_id: 'PRD-FIX-SIGNUP-PLAN-OPTIONS-001',
      name: 'Signup plan grid renders on deployed site',
      description: 'Verify that all 3 plan cards are visible on the deployed signup page',
      steps: [
        'Open https://leadflow-ai-five.vercel.app/signup in incognito browser',
        'Verify page loads without JS errors in console',
        'Verify heading "Choose Your Plan" is visible',
        'Verify 3 plan cards are visible: Starter ($49/mo), Pro ($149/mo), Team ($399/mo)',
        'Verify Pro card has "MOST POPULAR" badge',
        'Verify each card shows a feature list'
      ],
      expected_result: 'All 3 plan cards render with correct pricing, features, and CTA buttons',
      status: 'pending',
      created_at: now
    },
    {
      id: 'e2e-signup-plan-selection-flow',
      project_id: 'leadflow',
      use_case_id: 'fix-signup-plan-options-not-displayed',
      prd_id: 'PRD-FIX-SIGNUP-PLAN-OPTIONS-001',
      name: 'Signup plan selection advances to details form',
      description: 'Verify clicking Get Started on a plan card navigates to the account details step',
      steps: [
        'Open https://leadflow-ai-five.vercel.app/signup',
        'Click "Get Started" on the Pro plan card',
        'Verify page advances to Step 2 (Your Details)',
        'Verify selected plan label shows "Pro — $149/month"',
        'Click Back button',
        'Verify return to plan selection grid with all 3 cards visible'
      ],
      expected_result: 'Plan selection and back navigation work correctly',
      status: 'pending',
      created_at: now
    }
  ], { onConflict: 'id' }).select();

  if (e2eErr) { console.error('E2E tests error:', e2eErr); process.exit(1); }
  console.log('E2E tests created:', e2eTests.map(t => t.id));

  // 5. Update UC with e2e_tests_defined = true
  await sb.from('use_cases')
    .update({ e2e_tests_defined: true, updated_at: now })
    .eq('id', 'fix-signup-plan-options-not-displayed');

  console.log('\nAll done!');
  console.log('UC: fix-signup-plan-options-not-displayed');
  console.log('PRD: PRD-FIX-SIGNUP-PLAN-OPTIONS-001');
  console.log('Dev Task:', task.id);
  
  return task.id;
}
run().catch(console.error);
