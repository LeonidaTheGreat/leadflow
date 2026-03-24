require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Insert PRD
  const { data: prd, error: prdErr } = await sb.from('prds').upsert({
    id: 'prd-smoke-loop-fix-001',
    title: 'Fix Smoke Test Task Loop — Vercel Dashboard Health',
    description: 'Two-part fix: (1) Add lastTaskCreated cooldown tracking in genome heartbeat-executor to prevent duplicate QC tasks when a smoke test keeps failing. (2) Update Vercel dashboard /api/health endpoint to remove stale Supabase connectivity check — Supabase was removed from LeadFlow, causing the smoke test to always fail.',
    status: 'approved',
    version: '1.0',
    file_path: 'docs/prd/PRD-SMOKE-LOOP-FIX.md',
    project_id: 'leadflow',
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' }).select().single();
  
  if (prdErr) { console.error('PRD error:', prdErr); return; }
  console.log('PRD inserted:', prd.id);

  // Insert use case
  const ucData = {
    id: 'uc-smoke-loop-fix-001',
    name: 'Smoke Test Loop Prevention and Health Endpoint Accuracy',
    description: 'Prevent infinite task creation loops when smoke tests fail persistently. Fix the vercel-dashboard smoke test by updating the health endpoint to reflect the current architecture (local PostgreSQL, no Supabase).',
    prd_id: 'prd-smoke-loop-fix-001',
    phase: 'Phase 1',
    priority: 1,
    implementation_status: 'not_started',
    e2e_tests_defined: true,
    e2e_tests_passing: false,
    acceptance_criteria: [
      'heartbeat-executor writes lastTaskCreated to smoke state when spawning a QC task',
      'Cooldown of 2h prevents re-spawn after task creation even if task completes quickly',
      'GET /api/health on Vercel dashboard returns {status:ok} with HTTP 200',
      'Supabase connectivity check removed from health endpoint',
      'vercel-dashboard smoke test passes after health endpoint fix',
      'No duplicate Smoke tasks created within a 2h window',
      'Loop detector does not fire for vercel-dashboard smoke test after fixes applied'
    ],
    workflow: ['PM', 'Dev', 'QC'],
    revenue_impact: 'none',
    project_id: 'leadflow',
    updated_at: new Date().toISOString()
  };

  const { data: uc, error: ucErr } = await sb.from('use_cases').upsert(ucData, { onConflict: 'id' }).select().single();
  
  if (ucErr) { console.error('UC error:', ucErr); return; }
  console.log('Use case inserted:', uc.id);

  // Insert E2E test specs
  const spec1 = {
    id: 'e2e-smoke-loop-cooldown-001',
    use_case_id: 'uc-smoke-loop-fix-001',
    name: 'Smoke task dedup: no duplicate created within 2h cooldown',
    description: 'Verify heartbeat does not create a second QC task for the same failing smoke test within 2 hours of the first task creation.',
    steps: [
      'Trigger heartbeat when vercel-dashboard smoke test fails',
      'Confirm QC task created and lastTaskCreated written to state file',
      'Mark QC task as done without fixing the underlying issue',
      'Trigger heartbeat again immediately',
      'Verify: NO new QC task created (cooldown log message appears)'
    ],
    expected_result: 'Only one QC task exists. Second heartbeat skips task creation and logs cooldown message.',
    project_id: 'leadflow',
    status: 'pending'
  };

  const spec2 = {
    id: 'e2e-health-endpoint-ok-001',
    use_case_id: 'uc-smoke-loop-fix-001',
    name: 'Health endpoint returns status:ok after Supabase check removal',
    description: 'Verify GET /api/health returns 200 with status:ok once Supabase connectivity check is removed.',
    steps: [
      'Deploy updated health endpoint to Vercel',
      'GET https://leadflow-ai-five.vercel.app/api/health',
      'Verify response: HTTP 200, body contains status:ok',
      'Run smoke tests: vercel-dashboard test should pass'
    ],
    expected_result: 'status:ok returned. Smoke test auto-resolves on next heartbeat.',
    project_id: 'leadflow',
    status: 'pending'
  };

  for (const spec of [spec1, spec2]) {
    const { error: specErr } = await sb.from('e2e_test_specs').upsert(spec, { onConflict: 'id' });
    if (specErr) console.error('Spec error:', specErr.message);
    else console.log('E2E spec inserted:', spec.id);
  }
  
  console.log('Done.');
}

run().catch(console.error);
