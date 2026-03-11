#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Insert product_feedback so orchestrator picks up the build task
  const { error } = await sb.from('product_feedback').insert({
    project_id: 'leadflow',
    feedback_type: 'feature_request',
    source: 'pm_review',
    data: {
      summary: 'Build missing Aha Moment simulator UI step (simulator.tsx)',
      severity: 'critical',
      prd: 'PRD-AHA-MOMENT-SIMULATOR-UI',
      details: [
        '1. Create product/lead-response/dashboard/app/onboarding/steps/simulator.tsx implementing FR-1 through FR-8.',
        '2. Update page.tsx: add simulator to OnboardingStep type, steps array, import, renderer, agentData fields (ahaCompleted, ahaResponseTimeMs), and completeOnboarding() payload.',
        '3. Fix API: remove sessionId from start action validation — only agentId needed for start; sessionId returned from start response.',
        '4. Build UI against actual API format: state.conversation[], state.response_time_ms, status="success" for completion (not the PRD contract which differs).',
        '5. Update confirmation.tsx to display Aha Moment completion status in Connected Integrations section.',
        '6. Progress bar should show 6 total steps after simulator is inserted.'
      ].join(' ')
    },
    processed: false
  });

  if (error) {
    console.error('product_feedback insert failed:', error.message);
  } else {
    console.log('product_feedback inserted successfully');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
