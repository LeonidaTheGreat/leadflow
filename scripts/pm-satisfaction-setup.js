require('dotenv').config({ path: '/Users/clawdbot/projects/leadflow/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. Insert the PRD
  const { data: prd, error: prdErr } = await sb.from('prds').upsert({
    id: 'PRD-LEAD-SATISFACTION-FEEDBACK',
    title: 'Lead Satisfaction Feedback Collection',
    file_path: 'docs/PRD-LEAD-SATISFACTION-FEEDBACK.md',
    description: 'Collect lightweight satisfaction signals from leads after AI SMS interactions to measure if leads feel helped or annoyed. Includes satisfaction ping SMS, reply classification, agent dashboard widget, and agent toggle to disable.',
    status: 'draft',
    project_id: 'leadflow',
    version: '1.0'
  }, { onConflict: 'id' }).select();

  if (prdErr) { console.error('PRD error:', JSON.stringify(prdErr)); }
  else { console.log('PRD inserted:', prd && prd[0] && prd[0].id); }

  // 2. Insert the use case
  const { data: uc, error: ucErr } = await sb.from('use_cases').upsert({
    id: 'feat-lead-satisfaction-feedback',
    project_id: 'leadflow',
    name: 'Lead Satisfaction Feedback Collection',
    description: 'Measure if leads feel helped or annoyed by AI SMS responses. Send a brief satisfaction check-in SMS after AI conversation exchanges, classify replies, surface satisfaction metrics in the agent dashboard, and allow agents to disable pings via a settings toggle.',
    implementation_status: 'not_started',
    priority: 2,
    workflow: ['product','marketing','design','dev','qc'],
    prd_id: 'PRD-LEAD-SATISFACTION-FEEDBACK',
    acceptance_criteria: JSON.stringify([
      'lead_satisfaction_events table created with lead_id, agent_id, conversation_id, rating, raw_reply, created_at',
      'satisfaction_ping_enabled column added to agents table (default: true)',
      'Satisfaction ping SMS sent after 2+ AI exchanges, max once per conversation, 10-min cooldown',
      'Inbound replies classified as positive/negative/neutral/unclassified',
      'STOP replies also trigger existing opt-out flow',
      'Dashboard shows LeadSatisfactionCard with % positive/negative/neutral (shown when 5+ events)',
      'Agent settings toggle to disable satisfaction pings',
      'All E2E tests pass'
    ])
  }, { onConflict: 'id' }).select();

  if (ucErr) { console.error('UC error:', JSON.stringify(ucErr)); }
  else { console.log('UC inserted:', uc && uc[0] && uc[0].id); }

  // 3. Insert E2E test specs
  const specs = [
    {
      id: 'e2e-satisfaction-ping-sent',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      name: 'Satisfaction ping SMS sent after AI exchange',
      description: 'After at least 2 AI messages in a conversation, the system sends a satisfaction check-in SMS to the lead',
      steps: JSON.stringify([
        'Simulate a new lead receiving 2+ AI SMS responses',
        'Wait 10 minutes (or mock cooldown in test environment)',
        'Verify a satisfaction ping SMS was sent via Twilio to the lead number',
        'Verify lead_satisfaction_events row created with rating=null'
      ]),
      expected_result: 'Satisfaction ping SMS sent; event row created in Supabase',
      category: 'sms'
    },
    {
      id: 'e2e-satisfaction-reply-classified',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      name: 'Lead reply classified and stored',
      description: 'When a lead replies YES or NO to satisfaction ping, the reply is classified and stored',
      steps: JSON.stringify([
        'Simulate a lead replying YES to satisfaction ping',
        'Check lead_satisfaction_events row updated: rating=positive, raw_reply=YES',
        'Simulate a lead replying NO',
        'Check row updated: rating=negative, raw_reply=NO',
        'Simulate a lead replying STOP',
        'Check STOP triggers opt-out flow (existing UC-5) AND stores rating=negative'
      ]),
      expected_result: 'Replies classified correctly; events stored; STOP triggers opt-out',
      category: 'sms'
    },
    {
      id: 'e2e-satisfaction-dashboard-widget',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      name: 'Lead Satisfaction card visible in agent dashboard',
      description: 'Agent dashboard shows satisfaction metrics once 5+ events exist',
      steps: JSON.stringify([
        'Log in to agent dashboard',
        'If fewer than 5 satisfaction events: confirm LeadSatisfactionCard is NOT rendered',
        'Insert 5+ test events via Supabase for this agent',
        'Reload dashboard',
        'Confirm LeadSatisfactionCard renders with % positive / % negative / % neutral',
        'Confirm trend indicator (improving/stable/declining) is shown'
      ]),
      expected_result: 'Card hidden below 5 events; visible and accurate above 5 events',
      category: 'ui'
    },
    {
      id: 'e2e-satisfaction-agent-toggle',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      name: 'Agent can disable satisfaction pings',
      description: 'Agent settings toggle disables satisfaction ping SMS when turned off',
      steps: JSON.stringify([
        'Log in to agent dashboard and navigate to Settings',
        'Locate "Send satisfaction check-in after AI conversations" toggle',
        'Toggle OFF and save settings',
        'Verify agents.satisfaction_ping_enabled = false in Supabase',
        'Simulate AI conversation exchange for this agent',
        'Confirm NO satisfaction ping SMS is sent',
        'Toggle back ON; verify ping is sent again on next exchange'
      ]),
      expected_result: 'Toggle persists; no pings when disabled; pings resume when re-enabled',
      category: 'settings'
    },
    {
      id: 'e2e-satisfaction-no-double-ping',
      use_case_id: 'feat-lead-satisfaction-feedback',
      project_id: 'leadflow',
      name: 'Satisfaction ping sent only once per conversation',
      description: 'Even if multiple AI exchanges occur, only one satisfaction ping is sent per conversation thread',
      steps: JSON.stringify([
        'Simulate lead having 5+ AI exchanges in same conversation',
        'Confirm only 1 satisfaction ping SMS was sent (not 5)',
        'Confirm only 1 lead_satisfaction_events row exists for this conversation_id'
      ]),
      expected_result: 'Exactly 1 satisfaction ping per conversation; no duplicates',
      category: 'sms'
    }
  ];

  for (const spec of specs) {
    const { error } = await sb.from('e2e_test_specs').upsert(spec, { onConflict: 'id' });
    if (error) { console.error('E2E spec error:', spec.id, JSON.stringify(error)); }
    else { console.log('E2E spec inserted:', spec.id); }
  }

  console.log('All done.');
})();
