#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const findings = [
  {
    type: 'missing_implementation',
    severity: 'critical',
    summary: 'simulator.tsx step component does not exist',
    details: 'The primary deliverable — steps/simulator.tsx — was never created. The steps directory only contains: agent-info.tsx, calendar.tsx, confirmation.tsx, fub-integration.tsx, sms-config.tsx, welcome.tsx. The Aha Moment UI step is entirely absent from the codebase.',
    affected_uc_ids: ['feat-aha-moment-lead-simulator'],
    suggested_fix: 'Create product/lead-response/dashboard/app/onboarding/steps/simulator.tsx implementing all FR-1 through FR-8 as specified in the PRD.'
  },
  {
    type: 'missing_implementation',
    severity: 'critical',
    summary: 'page.tsx not updated — simulator step not wired into wizard',
    details: 'The onboarding page.tsx still has OnboardingStep type = welcome|agent-info|calendar|sms|confirmation (5 steps, no simulator). The import, type definition, steps array entry, and renderer block for OnboardingSimulator are all missing. Agents completing onboarding skip the Aha Moment entirely.',
    affected_uc_ids: ['feat-aha-moment-lead-simulator', 'feat-post-login-onboarding-wizard'],
    suggested_fix: 'Update page.tsx: add simulator to OnboardingStep type, add to steps array between sms and confirmation, add import, add renderer block, add ahaCompleted/ahaResponseTimeMs to agentData, include aha_moment_completed in completeOnboarding() submit payload.'
  },
  {
    type: 'api_contract_mismatch',
    severity: 'high',
    summary: 'API response format does not match PRD contract',
    details: 'The PRD spec defines the start response as {success, sessionId, status, turns[]}. The actual API returns {success, state: {id, session_id, agent_id, status, conversation[], ...}}. Key mismatches: field name turns[] vs conversation[]; responseTimeMs vs state.response_time_ms; status values — PRD uses "complete" but API uses "success"; PRD has 3 statuses while API has 7.',
    affected_uc_ids: ['feat-aha-moment-lead-simulator'],
    suggested_fix: 'When building simulator.tsx, use the actual API response format (state.conversation, state.response_time_ms, status=success for completion). Do NOT rely on the PRD contract — read the actual route.ts.'
  },
  {
    type: 'api_bug',
    severity: 'high',
    summary: 'API start action requires sessionId before sessionId exists — chicken-and-egg',
    details: 'The API validates that action, agentId, AND sessionId are all required for ALL actions including start. But per the PRD, the client calls start with only agentId and receives the sessionId in the response. The UI cannot call start without a sessionId, but it cannot have a sessionId until after start responds.',
    affected_uc_ids: ['feat-aha-moment-lead-simulator'],
    suggested_fix: 'Remove sessionId from the start validation. Only require agentId for start, and only require sessionId for status/skip. Server generates and returns sessionId in the start response.'
  },
  {
    type: 'missing_implementation',
    severity: 'high',
    summary: 'ahaCompleted not included in onboarding submit payload — FR-8 not implemented',
    details: 'FR-8 requires aha_moment_completed to be included in the completeOnboarding() POST to /api/agents/onboard. The current agentData has no ahaCompleted or ahaResponseTimeMs fields, and the submit payload does not include these values.',
    affected_uc_ids: ['feat-aha-moment-lead-simulator'],
    suggested_fix: 'Add ahaCompleted: false and ahaResponseTimeMs: null to agentData initial state in page.tsx, and confirm these fields are serialized in the JSON.stringify body sent to /api/agents/onboard.'
  },
  {
    type: 'spec_inconsistency',
    severity: 'medium',
    summary: 'PRD says progress bar shows 5 steps, but adding simulator makes it 6',
    details: 'FR-1 states the progress indicator must show 5 steps after adding simulator. The current wizard already has 5 steps. Adding simulator creates 6 steps total. The PRD step count is wrong.',
    affected_uc_ids: ['feat-aha-moment-lead-simulator'],
    suggested_fix: 'Correct the PRD to say 6 steps. Update OnboardingProgress to show 6 total steps when simulator step is inserted.'
  },
  {
    type: 'missing_implementation',
    severity: 'medium',
    summary: 'Confirmation step has no awareness of ahaCompleted status',
    details: 'The confirmation.tsx component has no awareness of ahaCompleted. FR-8 says confirmation should receive ahaCompleted: boolean via agentData. Currently there is no visual indicator of whether the Aha Moment was completed or skipped.',
    affected_uc_ids: ['feat-aha-moment-lead-simulator'],
    suggested_fix: 'Add an Aha Moment row to the Connected Integrations section in confirmation.tsx showing whether the simulation was completed or skipped.'
  }
];

const decisions = [
  {
    summary: 'API contract: align response format with PRD or update UI to match actual API',
    category: 'api_design',
    options: [
      'Update API to match PRD contract: turns[], responseTimeMs, status=complete',
      'Build UI to consume actual API format: state.conversation, state.response_time_ms, status=success',
      'Create a thin adapter layer in the UI component'
    ],
    recommended: 'Build UI to consume actual API format: state.conversation, state.response_time_ms, status=success',
    reason: 'Changing the API would risk introducing new bugs and break DB schema. The UI can adapt to the actual format. PRD was aspirational — the actual implementation is the truth.',
    blocking: false
  },
  {
    summary: 'SessionId sourcing for start action: client-generated vs server-generated',
    category: 'api_design',
    options: [
      'Client generates UUID and passes to start — current code path would work but is undocumented',
      'Remove sessionId validation from start action — server generates and returns it'
    ],
    recommended: 'Remove sessionId validation from start action — server generates and returns it',
    reason: 'Server-generated IDs match the PRD intent and are cleaner. Client-generated sessionIds are an undocumented pattern with no validation. A one-line API fix unlocks the PRD-correct behavior.',
    blocking: false
  }
];

const walkthroughSpec = [
  {
    step: 'Orchestration dashboard check + onboarding simulator step code review',
    url: 'http://127.0.0.1:8787/dashboard.html',
    expected_behavior: 'Internal Dashboard loads. Onboarding simulator step exists and is wired into the wizard between sms and confirmation.',
    actual_behavior: 'Dashboard server accessible. Code review of onboarding steps directory confirmed simulator.tsx does not exist. page.tsx has not been updated: OnboardingStep type still ends at confirmation, steps array has 5 entries with no simulator, no import or renderer block for OnboardingSimulator. The Aha Moment step is completely absent.',
    status: 'fail'
  }
];

const summary = 'The Aha Moment Simulator UI (PRD-AHA-MOMENT-SIMULATOR-UI) has not been implemented. The backend API at /api/onboarding/simulator exists and the onboarding_simulations DB table is present, but the frontend deliverables are entirely missing: simulator.tsx does not exist, page.tsx was not updated, and the submit payload does not include aha_moment_completed. Two additional API issues will block UI development: the start action incorrectly requires sessionId (chicken-and-egg problem), and the actual API response format diverges from the PRD contract in field names, response structure, and status values. New agents still skip the Aha Moment entirely and land on an empty dashboard. VERDICT: FAIL — nothing shipped.';

async function main() {
  const { data, error } = await sb
    .from('product_reviews')
    .update({
      walkthrough_spec: walkthroughSpec,
      findings: findings,
      decisions_needed: decisions,
      verdict: 'fail',
      readiness_score: 15,
      summary: summary,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('task_id', '6eee0baf-b5ee-4a45-8530-e9d84c6d3c71');

  if (error) {
    console.error('Update failed:', JSON.stringify(error, null, 2));
    process.exit(1);
  } else {
    console.log('product_reviews updated successfully');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
